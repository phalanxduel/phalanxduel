import * as fs from 'fs';
import * as path from 'path';

export interface ToolCapability {
  name: string;
  description: string;
  type: 'gameplay' | 'analysis' | 'admin' | 'engine' | 'data';
}

export function getCapabilities(): ToolCapability[] {
  const capabilities: ToolCapability[] = [];
  const toolsDir = path.join(process.cwd(), 'mcp', 'src', 'tools');

  try {
    const files = fs.readdirSync(toolsDir);
    for (const file of files) {
      if (!file.endsWith('.ts')) continue;

      const content = fs.readFileSync(path.join(toolsDir, file), 'utf8');
      const type = file.replace('.ts', '') as any;

      // Simple heuristic to extract tool names from MCP tool definitions
      const toolMatches = content.matchAll(/registerTool\(\s*['"]([^'"]+)['"]/g);
      for (const match of toolMatches) {
        capabilities.push({
          name: match[1],
          description: `MCP tool from ${file}`,
          type,
        });
      }
    }
  } catch (e) {
    // Handle case where directory doesn't exist or isn't readable
  }

  return capabilities;
}
