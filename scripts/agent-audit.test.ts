import { describe, expect, it } from 'vitest';

import {
  agentSkillAlignmentFindings,
  backlogFindings,
  rootQaScriptFindings,
  type TaskSummary,
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
