import { describe, expect, it } from 'vitest';

import {
  agentSkillAlignmentFindings,
  backlogFindings,
  canonicalDocReferenceFindings,
  dockerComposeConventionFindings,
  integrationDriftFindings,
  nestedAgentCommandFindings,
  rootQaScriptFindings,
  type TaskSummary,
  workflowStatusDriftFindings,
} from './agent-audit';

const configuredStatuses = [
  'To Do',
  'Backlog',
  'Ready',
  'In Progress',
  'Verification',
  'Done',
  'Icebox',
];

function task(overrides: Partial<TaskSummary>): TaskSummary {
  return {
    id: 'TASK-1',
    title: 'Stabilization follow-up',
    status: 'Done',
    rawStatus: 'Done',
    file: 'backlog/tasks/task-1.md',
    ...overrides,
  };
}

describe('agent audit backlog findings', () => {
  it('fails raw non-canonical statuses even when they normalize to a configured status', () => {
    const findings = backlogFindings(
      [task({ status: 'Done', rawStatus: 'done', file: 'backlog/tasks/task-1.md' })],
      configuredStatuses,
    );

    expect(findings).toContainEqual({
      level: 'fail',
      message:
        'backlog/tasks/task-1.md uses non-canonical status "done"; change it to "Done" through Backlog tooling',
    });
  });

  it('fails active tasks that are not stabilization or hardening work', () => {
    const findings = backlogFindings(
      [
        task({
          id: 'TASK-2',
          title: 'Build new ladder feature',
          status: 'Ready',
          rawStatus: 'Ready',
          file: 'backlog/tasks/task-2.md',
        }),
      ],
      configuredStatuses,
    );

    expect(findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          level: 'fail',
          message: expect.stringContaining('active but not stabilization/hardening'),
        }),
      ]),
    );
  });
});

describe('agent audit v1 alignment findings', () => {
  it('fails root qa scripts that still invoke Godot or V2 commands', () => {
    const findings = rootQaScriptFindings(
      JSON.stringify({
        scripts: {
          'qa:playthrough:verify': 'bash scripts/ci/playthrough-verify.sh',
          'qa:v2-baseline': 'tsx bin/qa/v2-baseline-capture.ts',
          'qa:godot:compare-artifacts': 'tsx bin/qa/compare-parity-artifacts.ts',
        },
      }),
    );

    expect(findings).toHaveLength(2);
    expect(findings.map((finding) => finding.message)).toEqual([
      expect.stringContaining('script "qa:v2-baseline" references Godot/V2'),
      expect.stringContaining('script "qa:godot:compare-artifacts" references Godot/V2'),
    ]);
  });

  it('fails active skill guidance that promotes Godot or V2 workflows', () => {
    const findings = agentSkillAlignmentFindings([
      {
        file: '.agents/skills/phalanx-example/SKILL.md',
        text: '## Godot Parity Use\nWhen working on Godot v2, run this first.\n',
      },
    ]);

    expect(findings).toEqual([
      {
        level: 'fail',
        message:
          '.agents/skills/phalanx-example/SKILL.md:2 promotes Godot/V2 workflow; update the active skill to v1/browser guidance or move it out of .agents/skills',
      },
    ]);
  });
});

describe('agent audit integration drift findings', () => {
  it('fails missing canonical docs referenced by agent guidance', () => {
    const findings = canonicalDocReferenceFindings([
      {
        file: 'AGENTS.md',
        text: 'Use [`docs/system/THIS_DOC_SHOULD_NOT_EXIST.md`](docs/system/THIS_DOC_SHOULD_NOT_EXIST.md).',
      },
    ]);

    expect(findings).toEqual([
      {
        level: 'fail',
        message:
          'AGENTS.md references missing canonical doc docs/system/THIS_DOC_SHOULD_NOT_EXIST.md',
      },
    ]);
  });

  it('fails stale workflow statuses that are not configured', () => {
    const findings = workflowStatusDriftFindings(
      'Move tasks to Human Review. Planned means shaped but not ready.',
      configuredStatuses,
    );

    expect(findings).toEqual([
      {
        level: 'fail',
        message:
          'docs/tutorials/ai-agent-workflow.md mentions stale Backlog status "Planned" not present in backlog/config.yml',
      },
      {
        level: 'fail',
        message:
          'docs/tutorials/ai-agent-workflow.md mentions stale Backlog status "Human Review" not present in backlog/config.yml',
      },
    ]);
  });

  it('fails nested AGENTS command examples that omit rtk or use stale script names', () => {
    const findings = nestedAgentCommandFindings([
      {
        file: 'clients/AGENTS.md',
        text: ['```bash', 'pnpm openapi:gen', 'pnpm check:quick', './bin/check', '```'].join('\n'),
      },
    ]);

    expect(findings).toEqual([
      {
        level: 'fail',
        message:
          'clients/AGENTS.md:2 has raw command example "pnpm openapi:gen"; prefix repo shell examples with rtk',
      },
      {
        level: 'fail',
        message: 'clients/AGENTS.md:3 references stale pnpm check:quick; use rtk pnpm verify:quick',
      },
      {
        level: 'fail',
        message:
          'clients/AGENTS.md:4 has raw command example "./bin/check"; prefix repo shell examples with rtk',
      },
    ]);
  });

  it('fails docker compose spelling in active docs and scripts', () => {
    const findings = dockerComposeConventionFindings([
      {
        file: 'docs/development.md',
        text: 'Run `docker compose up -d pghero` for the dashboard.',
      },
    ]);

    expect(findings).toEqual([
      {
        level: 'fail',
        message: 'docs/development.md:1 uses "docker compose"; use "docker-compose" for this repo',
      },
    ]);
  });

  it('runs the aggregate integration drift scan without throwing', () => {
    expect(() => integrationDriftFindings(configuredStatuses)).not.toThrow();
  });
});
