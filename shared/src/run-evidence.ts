import { z } from 'zod';

const SafePathSchema = z
  .string()
  .min(1)
  .refine((value) => !value.includes('..') && !value.startsWith('/'), {
    message: 'artifact paths must be relative and cannot contain parent traversal',
  });

export const RunEvidenceArtifactSchema = z.object({
  kind: z.string().min(1),
  path: SafePathSchema,
  public: z.boolean(),
  sha256: z
    .string()
    .regex(/^[a-f0-9]{64}$/)
    .optional(),
});

export const RunEvidenceAssertionSchema = z.object({
  name: z.string().min(1),
  status: z.enum(['pass', 'fail', 'skipped']),
  detail: z.string().optional(),
});

export const RunEvidenceActionSchema = z.object({
  index: z.number().int().nonnegative(),
  type: z.string().min(1),
  playerIndex: z.number().int().min(0).max(1).optional(),
  at: z.string().datetime({ offset: true }),
  accepted: z.boolean().optional(),
});

export const RunEvidenceEventSchema = z.object({
  index: z.number().int().nonnegative(),
  type: z.string().min(1),
  at: z.string().datetime({ offset: true }),
  phase: z.string().min(1).optional(),
  detail: z.string().optional(),
});

export const RunEvidenceSchema = z
  .object({
    kind: z.literal('phalanx-duel.run-evidence'),
    version: z.literal(1),
    runner: z.object({
      tool: z.string().min(1),
      version: z.string().min(1).optional(),
      release: z.object({
        version: z.string().min(1).optional(),
        commit: z.string().min(1).optional(),
        build: z.string().min(1).optional(),
      }),
    }),
    scenario: z.object({
      id: z.string().min(1),
      seed: z.number().int().nonnegative(),
      damageMode: z.string().min(1).optional(),
      startingLifepoints: z.number().int().positive().optional(),
    }),
    adapters: z.object({
      client: z.enum(['engine', 'api', 'websocket', 'browser', 'swiftui']),
      transport: z.enum(['in-memory', 'http', 'websocket', 'native-ui']),
    }),
    correlation: z.object({
      qaRunId: z.string().min(1).optional(),
      matchId: z.string().min(1).optional(),
    }),
    startedAt: z.string().datetime({ offset: true }),
    endedAt: z.string().datetime({ offset: true }),
    durationMs: z.number().int().nonnegative(),
    actions: z.array(RunEvidenceActionSchema),
    events: z.array(RunEvidenceEventSchema),
    phases: z.array(z.string().min(1)),
    integrity: z.object({
      initialStateHash: z.string().min(1).optional(),
      finalStateHash: z.string().min(1).optional(),
      actionCount: z.number().int().nonnegative(),
      eventCount: z.number().int().nonnegative(),
      replayArtifact: SafePathSchema.optional(),
    }),
    outcome: z.object({
      status: z.enum(['success', 'failure', 'skipped']),
      winnerIndex: z.number().int().min(0).max(1).nullable().optional(),
      victoryType: z.string().min(1).nullable().optional(),
      summary: z.string().nullable().optional(),
    }),
    assertions: z.array(RunEvidenceAssertionSchema),
    artifacts: z.array(RunEvidenceArtifactSchema),
    viewerPolicy: z.object({
      visibility: z.enum(['public', 'owner', 'internal']),
      hiddenStateExcluded: z.literal(true),
      privatePlayerDataExcluded: z.literal(true),
    }),
  })
  .superRefine((evidence, ctx) => {
    if (evidence.integrity.actionCount !== evidence.actions.length) {
      ctx.addIssue({
        code: 'custom',
        path: ['integrity', 'actionCount'],
        message: 'action count mismatch',
      });
    }
    if (evidence.integrity.eventCount !== evidence.events.length) {
      ctx.addIssue({
        code: 'custom',
        path: ['integrity', 'eventCount'],
        message: 'event count mismatch',
      });
    }
    if (
      evidence.outcome.status === 'success' &&
      evidence.assertions.some((a) => a.status !== 'pass')
    ) {
      ctx.addIssue({
        code: 'custom',
        path: ['assertions'],
        message: 'successful runs require all assertions to pass',
      });
    }
  });

export type CanonicalRunEvidence = z.infer<typeof RunEvidenceSchema>;
