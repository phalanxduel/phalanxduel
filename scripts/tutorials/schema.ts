/**
 * Zod contracts for the Phalanx Duel YouTube Tutorial Series & media-pipeline cue bundles.
 */

import { z } from 'zod';

export const TutorialFormatSchema = z.enum(['16:9', '9:16']);
export type TutorialFormat = z.infer<typeof TutorialFormatSchema>;

export const TutorialRenderProfileSchema = z.object({
  viewportWidth: z.number().int().positive(),
  viewportHeight: z.number().int().positive(),
  outputWidth: z.number().int().positive(),
  outputHeight: z.number().int().positive(),
  fps: z.number().int().positive().default(30),
});

export const FORMAT_PROFILES: Record<
  TutorialFormat,
  z.infer<typeof TutorialRenderProfileSchema>
> = {
  '16:9': {
    viewportWidth: 1600,
    viewportHeight: 900,
    outputWidth: 1920,
    outputHeight: 1080,
    fps: 30,
  },
  '9:16': {
    viewportWidth: 1600,
    viewportHeight: 900,
    outputWidth: 1080,
    outputHeight: 1920,
    fps: 30,
  },
};

const TutorialActionSchema = z.object({
  action: z.enum([
    'goto',
    'fill',
    'select',
    'click',
    'waitForSelector',
    'hold',
    'highlight',
    'screenshot',
    'quickStart',
    'deployFirstCard',
    'attack',
    'selectAttack',
    'reinforce',
    'joinOpponent',
    'watchMatch',
    'reconnect',
    'finishMatch',
    'reachPosition',
    'registerDemo',
    'openReplay',
    'terminal',
  ]),
  selector: z.string().optional(),
  value: z.string().optional(),
  urlPath: z.string().optional(),
});

export const TutorialCueStepSchema = TutorialActionSchema.partial({ action: true }).extend({
  id: z.string().min(1),
  label: z.string().min(1),
  setup: z.array(TutorialActionSchema).optional(),
  actions: z.array(TutorialActionSchema).min(1).optional(),
  focus: z.array(z.string().min(1)).min(1).optional(),
  expect: z.string().min(1).optional(),
  holdMs: z.number().int().min(500).default(2500),
});

export type TutorialCueStep = z.infer<typeof TutorialCueStepSchema>;
export type TutorialAction = z.infer<typeof TutorialActionSchema>;

export const TutorialEpisodeScenarioSchema = z.object({
  version: z.literal(1),
  id: z.string().regex(/^ep-\d{2}-[a-z0-9-]+$/),
  season: z.number().int().min(1).max(8),
  episodeNumber: z.number().int().min(1),
  title: z.string().min(1),
  format: TutorialFormatSchema,
  targetDurationSec: z.number().int().min(15).max(900),
  mode: z.enum(['classic', 'cumulative']).default('classic'),
  startingLp: z.number().int().min(1).max(100).default(12),
  seed: z.number().int().nonnegative().default(42001),
  botTier: z
    .enum(['scout', 'grunt', 'soldier', 'veteran', 'destroyer', 'sentinel', 'blitz', 'champion'])
    .optional(),
  cardSkinId: z.enum(['default', 'dual-loop', 'obsidian-heraldry']).default('default'),
  playerName: z.string().min(3).max(30).default('TutorialHost'),
  companionUrl: z.string().url().optional(),
  tags: z.array(z.string().min(1)).min(1),
  summary: z.string().min(10),
  cues: z.array(TutorialCueStepSchema).min(1),
});

export type TutorialEpisodeScenario = z.infer<typeof TutorialEpisodeScenarioSchema>;

export const TutorialManifestEntrySchema = z.object({
  id: z.string().regex(/^ep-\d{2}-[a-z0-9-]+$/),
  season: z.number().int().min(1).max(8),
  episodeNumber: z.number().int().min(1),
  title: z.string().min(1),
  format: TutorialFormatSchema,
  formatRationale: z.string().min(5),
  targetDurationSec: z.number().int().min(15).max(900),
  status: z.enum(['planned', 'scripted', 'recorded', 'staged', 'published']).default('planned'),
  scenarioPath: z.string().optional(),
  narrationPath: z.string().optional(),
});

export const TutorialManifestSchema = z.object({
  schemaVersion: z.literal('1.0'),
  seriesTitle: z.string().min(1),
  targetSlug: z.string().min(1),
  playlistId: z.string().min(1).optional(),
  channelUrl: z.string().url().optional(),
  defaultStagedDir: z.string().min(1),
  episodes: z.array(TutorialManifestEntrySchema).min(1),
});

export type TutorialManifest = z.infer<typeof TutorialManifestSchema>;
