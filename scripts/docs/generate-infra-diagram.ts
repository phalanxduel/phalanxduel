/**
 * scripts/docs/generate-infra-diagram.ts
 *
 * Generates Infrastructure and Deployment Topology Diagrams for Phalanx Duel,
 * visualizing Cloud Production (Fly.io + Neon), Local Host-Native & Docker Cluster,
 * and the OpenTelemetry / OpenObserve / Jaeger telemetry pipelines.
 *
 * Outputs:
 *  - docs/system/infrastructure-topology.mmd  (Mermaid flowchart)
 *  - docs/system/infrastructure-topology.svg  (Rendered SVG via Graphviz / @viz-js/viz)
 *  - docs/system/INFRASTRUCTURE.md            (Infrastructure topology documentation)
 *
 * Usage:
 *  pnpm tsx scripts/docs/generate-infra-diagram.ts [--check] [--write]
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { instance } from '@viz-js/viz';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(SCRIPT_DIR, '../..');
const OUT_DIR = path.join(ROOT_DIR, 'docs/system');

function buildMermaidDiagram(): string {
  const lanIp = process.env.PHALANX_LAN_IP || '<HOST_LAN_IP>';
  return `flowchart TB
    %% =========================================================================
    %% External Consumers & Touchpoints
    %% =========================================================================
    subgraph Consumers["1. External Consumers & Presentation"]
        WebClient["Web Client UI\\nPreact 10.29 + Vite\\n(Browser / RUM)"]
        AdminUI["Admin Cockpit\\nPreact + Vite\\n(:5174)"]
        GoCLI["Go Duel CLI\\nGo 1.24 + gorilla/ws\\n(Terminal)"]
        SwiftUI["SwiftUI Client\\nmacOS / iOS\\n(Native)"]
        AIAgent["AI Agents & MCP Clients\\nClaude · Codex · Gemini\\n(stdio / SSE)"]
    end

    %% =========================================================================
    %% Edge & Network Perimeter
    %% =========================================================================
    subgraph Edge["2. Edge & Routing Perimeter"]
        DNS["Edge DNS\\nDNSimple + AdGuard\\n(${lanIp})"]
        Nginx["LAN Reverse Proxy\\n*.lan.phalanxduel.com\\n(Nginx TLS)"]
        FlyEdge["Fly.io Anycast Edge\\nplay.phalanxduel.com\\n(TLS Termination)"]
    end

    %% =========================================================================
    %% Production Environment (Fly.io)
    %% =========================================================================
    subgraph FlyProduction["3. Production Cloud Infrastructure (Fly.io ord)"]
        direction TB
        subgraph FlyMesh["Fly.io Private 6PN WireGuard Mesh"]
            FlyServer["phalanxduel-server\\nFastify 5.8 (Node 24)\\n:3001 REST + /ws\\n(Auth, Match, Ladder)"]
            FlyMCP["phalanxduel-mcp-public\\nMCP HTTP / SSE Service\\n(Engine & Analysis API)"]
            FlyOTel["otel-collector sidecar\\nOTLP gRPC / HTTP\\n(:4317 / :4318)"]
        end
        NeonDB[("Neon Serverless PostgreSQL\\n(Drizzle ORM 0.45)\\npgvector + SSL")]
    end

    %% =========================================================================
    %% Local Development & Cluster (Host + Docker)
    %% =========================================================================
    subgraph LocalInfra["4. Local Hybrid Dev Infrastructure (Host + Docker)"]
        direction TB
        subgraph HostNative["Host-Native Runtime (Primary)"]
            HostServer["Fastify Server\\n(:3001)"]
            HostPostgres[("PostgreSQL 17.4\\nphalanx_dev / test\\n(:5432)")]
        end
        subgraph DockerCluster["Docker Compose Automation & Cluster"]
            ClusterA["Server Node A\\n(:3011)"]
            ClusterB["Server Node B\\n(:3012)"]
            EventBus["Postgres Event Bus\\n(Distributed PubSub)"]
            PlaywrightQA["Playwright Headless\\nAutomation Service"]
        end
    end

    %% =========================================================================
    %% Observability Sinks (OpenObserve + Jaeger)
    %% =========================================================================
    subgraph Observability["5. Longitudinal Observability Pipeline"]
        OTelHost["Host OTel Collector\\n(:4318 HTTP / :4317 gRPC)"]
        OpenObserve["OpenObserve (o2)\\nLongitudinal Analytics & RUM\\n(https://o2.localhost)"]
        Jaeger["Jaeger Tracing\\nDistributed Spans & DAG\\n(https://jaeger.localhost)"]
    end

    %% Routing connections
    WebClient -->|"HTTPS / WSS"| Nginx
    WebClient -->|"HTTPS / WSS"| FlyEdge
    AdminUI -->|"HTTP :5174"| Nginx
    GoCLI -->|"TCP / WSS"| Nginx
    GoCLI -->|"TCP / WSS"| FlyEdge
    SwiftUI -->|"HTTPS / WSS"| Nginx
    AIAgent -->|"SSE / HTTP"| FlyEdge
    AIAgent -->|"stdio"| HostServer

    Nginx --> HostServer
    FlyEdge --> FlyServer
    FlyEdge --> FlyMCP

    FlyServer -->|"pgwire (SSL)"| NeonDB
    FlyServer -->|"OTLP :4318"| FlyOTel
    FlyMCP -->|"GAME_SERVER_URL"| FlyServer
    FlyMCP -.->|"DATABASE_URL"| NeonDB

    HostServer -->|"with-dev-postgres.sh"| HostPostgres
    HostServer -->|"OTLP :4318"| OTelHost
    ClusterA -->|"Event Sync"| EventBus
    ClusterB -->|"Event Sync"| EventBus
    PlaywrightQA -->|"E2E QA"| HostServer

    FlyOTel -->|"Traces / Logs"| OpenObserve
    OTelHost -->|"Traces"| Jaeger
    OTelHost -->|"Logs / RUM / Metrics"| OpenObserve
    WebClient -.->|"RUM Traces"| OTelHost

    classDef edgeClass fill:#e3f2fd,stroke:#1565c0,stroke-width:2px;
    classDef prodClass fill:#f3e5f5,stroke:#7b1fa2,stroke-width:2px;
    classDef localClass fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px;
    classDef obsClass fill:#fff3e0,stroke:#e65100,stroke-width:2px;
    classDef clientClass fill:#fbe9e7,stroke:#c62828,stroke-width:2px;

    class Consumers clientClass;
    class Edge edgeClass;
    class FlyProduction prodClass;
    class LocalInfra localClass;
    class Observability obsClass;
`;
}

function buildGraphvizDot(): string {
  return `digraph InfraTopology {
  graph [rankdir=TB, splines=spline, bgcolor="#0d1117", pad="0.5", nodesep="0.6", ranksep="0.9"];
  node [fontname="Helvetica,Arial,sans-serif", fontsize=10, shape=plaintext];
  edge [fontname="Helvetica,Arial,sans-serif", fontsize=9, color="#58a6ff", fontcolor="#8b949e", penwidth=1.2];

  subgraph cluster_clients {
    label=<<font color="#f85149"><b>1. Clients &amp; External Consumers</b></font>>;
    color="#f85149";
    style=dashed;
    WebClient [label=<<table border="1" cellborder="0" cellspacing="0" cellpadding="6" bgcolor="#161b22" color="#f85149">
      <tr><td><font color="#ffffff"><b>Web Client UI</b></font><br/><font color="#8b949e">Preact + Vite (RUM)</font></td></tr>
    </table>>];
    AdminUI [label=<<table border="1" cellborder="0" cellspacing="0" cellpadding="6" bgcolor="#161b22" color="#f85149">
      <tr><td><font color="#ffffff"><b>Admin Cockpit</b></font><br/><font color="#8b949e">Preact (:5174)</font></td></tr>
    </table>>];
    GoCLI [label=<<table border="1" cellborder="0" cellspacing="0" cellpadding="6" bgcolor="#161b22" color="#f85149">
      <tr><td><font color="#ffffff"><b>Go Duel CLI</b></font><br/><font color="#8b949e">gorilla/websocket</font></td></tr>
    </table>>];
    AIAgents [label=<<table border="1" cellborder="0" cellspacing="0" cellpadding="6" bgcolor="#161b22" color="#f85149">
      <tr><td><font color="#ffffff"><b>AI Agents &amp; MCP</b></font><br/><font color="#8b949e">Claude · Codex · Gemini</font></td></tr>
    </table>>];
  }

  subgraph cluster_edge {
    label=<<font color="#58a6ff"><b>2. Edge &amp; Ingress Perimeter</b></font>>;
    color="#58a6ff";
    style=dashed;
    EdgeDNS [label=<<table border="1" cellborder="0" cellspacing="0" cellpadding="6" bgcolor="#161b22" color="#58a6ff">
      <tr><td><font color="#ffffff"><b>DNS &amp; Routing</b></font><br/><font color="#8b949e">DNSimple + AdGuard LAN</font></td></tr>
    </table>>];
    NginxLAN [label=<<table border="1" cellborder="0" cellspacing="0" cellpadding="6" bgcolor="#161b22" color="#58a6ff">
      <tr><td><font color="#ffffff"><b>Nginx Reverse Proxy</b></font><br/><font color="#8b949e">*.lan.phalanxduel.com</font></td></tr>
    </table>>];
    FlyEdge [label=<<table border="1" cellborder="0" cellspacing="0" cellpadding="6" bgcolor="#161b22" color="#58a6ff">
      <tr><td><font color="#ffffff"><b>Fly.io Anycast Edge</b></font><br/><font color="#8b949e">play.phalanxduel.com (TLS)</font></td></tr>
    </table>>];
  }

  subgraph cluster_prod {
    label=<<font color="#bc8cff"><b>3. Production Cloud (Fly.io + Neon)</b></font>>;
    color="#bc8cff";
    style=dashed;
    FlyServer [label=<<table border="1" cellborder="0" cellspacing="0" cellpadding="6" bgcolor="#161b22" color="#bc8cff">
      <tr><td><font color="#ffffff"><b>Fastify Server :3001</b></font><br/><font color="#8b949e">Node 24 · REST + /ws</font></td></tr>
    </table>>];
    FlyMCP [label=<<table border="1" cellborder="0" cellspacing="0" cellpadding="6" bgcolor="#161b22" color="#bc8cff">
      <tr><td><font color="#ffffff"><b>MCP Public Service</b></font><br/><font color="#8b949e">Engine &amp; Analysis API</font></td></tr>
    </table>>];
    NeonDB [label=<<table border="1" cellborder="0" cellspacing="0" cellpadding="6" bgcolor="#161b22" color="#bc8cff">
      <tr><td><font color="#ffffff"><b>Neon Serverless Postgres</b></font><br/><font color="#8b949e">Drizzle ORM · pgvector</font></td></tr>
    </table>>];
  }

  subgraph cluster_local {
    label=<<font color="#3fb950"><b>4. Local Dev &amp; Docker Cluster</b></font>>;
    color="#3fb950";
    style=dashed;
    HostServer [label=<<table border="1" cellborder="0" cellspacing="0" cellpadding="6" bgcolor="#161b22" color="#3fb950">
      <tr><td><font color="#ffffff"><b>Host Fastify Server</b></font><br/><font color="#8b949e">pnpm dev:server (:3001)</font></td></tr>
    </table>>];
    HostDB [label=<<table border="1" cellborder="0" cellspacing="0" cellpadding="6" bgcolor="#161b22" color="#3fb950">
      <tr><td><font color="#ffffff"><b>Host PostgreSQL</b></font><br/><font color="#8b949e">phalanx_dev / test (:5432)</font></td></tr>
    </table>>];
    ClusterNodes [label=<<table border="1" cellborder="0" cellspacing="0" cellpadding="6" bgcolor="#161b22" color="#3fb950">
      <tr><td><font color="#ffffff"><b>Docker Cluster A/B</b></font><br/><font color="#8b949e">Node A (:3011) + B (:3012)</font></td></tr>
    </table>>];
  }

  subgraph cluster_obs {
    label=<<font color="#f0883e"><b>5. Longitudinal Observability</b></font>>;
    color="#f0883e";
    style=dashed;
    OTelCol [label=<<table border="1" cellborder="0" cellspacing="0" cellpadding="6" bgcolor="#161b22" color="#f0883e">
      <tr><td><font color="#ffffff"><b>OpenTelemetry Collector</b></font><br/><font color="#8b949e">:4317 gRPC / :4318 HTTP</font></td></tr>
    </table>>];
    OpenObserve [label=<<table border="1" cellborder="0" cellspacing="0" cellpadding="6" bgcolor="#161b22" color="#f0883e">
      <tr><td><font color="#ffffff"><b>OpenObserve (o2)</b></font><br/><font color="#8b949e">Logs, Metrics, RUM</font></td></tr>
    </table>>];
    Jaeger [label=<<table border="1" cellborder="0" cellspacing="0" cellpadding="6" bgcolor="#161b22" color="#f0883e">
      <tr><td><font color="#ffffff"><b>Jaeger UI</b></font><br/><font color="#8b949e">Distributed Tracing</font></td></tr>
    </table>>];
  }

  WebClient -> NginxLAN [label="HTTPS"];
  WebClient -> FlyEdge [label="WSS /ws"];
  GoCLI -> FlyEdge [label="WSS"];
  AIAgents -> FlyMCP [label="SSE"];

  FlyEdge -> FlyServer;
  FlyServer -> NeonDB [label="pgwire SSL"];
  FlyMCP -> FlyServer;

  NginxLAN -> HostServer;
  HostServer -> HostDB [label="isolated creds"];
  HostServer -> OTelCol [label="OTLP :4318"];
  FlyServer -> OTelCol [label="OTLP"];

  OTelCol -> OpenObserve [label="logs & metrics"];
  OTelCol -> Jaeger [label="traces"];
}
`;
}

function buildMarkdownDoc(mermaid: string): string {
  return `# Phalanx Duel Infrastructure & Deployment Topology

> **Generated**: Automatically generated by \`pnpm infra:diagram\`  
> **Visual Reference**: [infrastructure-topology.svg](./infrastructure-topology.svg) | [infrastructure-topology.mmd](./infrastructure-topology.mmd)

## Overview

Phalanx Duel operates a **Hybrid Host-Native & Cloud Architecture**:
1. **Host-Native Inner Loop**: Local server and browser UI run natively on macOS/Linux for rapid iteration and zero container overhead.
2. **Cloud Production on Fly.io**: Fastify backend and public MCP server run in isolated Fly machines connected to Neon Serverless PostgreSQL with pgvector.
3. **Observability Pipeline**: All telemetry (RUM, traces, structured logs, metrics) passes via OpenTelemetry Collector into OpenObserve (\`o2\`) and Jaeger.
4. **Isolated Database Tiers**: Dev, test, and tooling databases are separated by PostgreSQL roles and enforced via wrapper scripts (\`with-dev-postgres.sh\`, \`with-test-postgres.sh\`).

## Topology Diagram

\`\`\`mermaid
${mermaid.trim()}
\`\`\`

## Subsystems & Ports Reference

| Subsystem | Environment | Host / Port | Transport | Purpose |
|---|---|---|---|---|
| **Fastify Server** | Prod / Staging | \`play.phalanxduel.com\` | HTTPS + WSS | Game API, Matchmaking, Replays |
| **Fastify Server** | Local Dev | \`127.0.0.1:3001\` | HTTP + WS | Host-native development |
| **MCP Public Service** | Prod | \`phalanxduel-mcp-public.fly.dev\` | HTTP / SSE | LLM & Agentic Game Interface |
| **Web Client UI** | Local Dev | \`127.0.0.1:5173\` | HTTP | Reference Browser UI (Vite) |
| **Admin Cockpit** | Local Dev | \`127.0.0.1:5174\` | HTTP | Operational match intervention |
| **Cluster Node A** | Local Docker | \`127.0.0.1:3011\` | HTTP + WS | Horizontal scaling testing |
| **Cluster Node B** | Local Docker | \`127.0.0.1:3012\` | HTTP + WS | Horizontal scaling testing |
| **PostgreSQL** | Local Dev | \`127.0.0.1:5432\` | pgwire | Local development & test DB |
| **Neon PostgreSQL** | Cloud Prod | Neon Cloud (SSL) | pgwire | Production database with pgvector |
| **OTel Collector** | Host / Cloud | \`127.0.0.1:4318\` / \`:4317\` | HTTP / gRPC | Telemetry ingestion & routing |
| **OpenObserve (o2)** | Observability | \`https://o2.localhost\` | HTTPS | Structured logs, metrics, RUM |
| **Jaeger** | Observability | \`https://jaeger.localhost\` | HTTPS | Distributed trace analysis |
`;
}

async function main(): Promise<void> {
  const isCheck = process.argv.includes('--check');

  const mermaid = buildMermaidDiagram();
  const dot = buildGraphvizDot();
  const md = buildMarkdownDoc(mermaid);

  // Render SVG using existing @viz-js/viz dependency
  const viz = await instance();
  const svg = viz.renderString(dot, { format: 'svg', engine: 'dot' });

  const mmdPath = path.join(OUT_DIR, 'infrastructure-topology.mmd');
  const svgPath = path.join(OUT_DIR, 'infrastructure-topology.svg');
  const mdPath = path.join(OUT_DIR, 'INFRASTRUCTURE.md');

  if (isCheck) {
    let hasDiff = false;
    const checkFile = (filePath: string, expected: string): void => {
      if (!existsSync(filePath)) {
        console.error(`Missing infrastructure artifact: ${filePath}`);
        hasDiff = true;
      } else {
        const current = readFileSync(filePath, 'utf8');
        if (current !== expected) {
          console.error(`Out of date infrastructure artifact: ${filePath}`);
          hasDiff = true;
        }
      }
    };

    checkFile(mmdPath, mermaid);
    checkFile(svgPath, svg);
    checkFile(mdPath, md);

    if (hasDiff) {
      console.error(
        '\nInfrastructure diagrams are out of date. Run "pnpm infra:diagram" to regenerate.',
      );
      process.exit(1);
    }
    console.log('✅ Infrastructure diagrams are up to date.');
    return;
  }

  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(mmdPath, mermaid, 'utf8');
  writeFileSync(svgPath, svg, 'utf8');
  writeFileSync(mdPath, md, 'utf8');

  console.log(`✅ Generated infrastructure artifacts in ${OUT_DIR}:`);
  console.log(`   - ${path.relative(ROOT_DIR, mmdPath)}`);
  console.log(`   - ${path.relative(ROOT_DIR, svgPath)}`);
  console.log(`   - ${path.relative(ROOT_DIR, mdPath)}`);
}

main().catch((err) => {
  console.error('Fatal error generating infrastructure diagram:', err);
  process.exit(1);
});
