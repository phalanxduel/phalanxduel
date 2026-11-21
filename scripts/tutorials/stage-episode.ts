/**
 * scripts/tutorials/stage-episode.ts
 *
 * Lists/validates the 22-episode tutorial catalog and stages rendered episodes
 * as atomic, SHA-256-verified media-pipeline cue bundles into Google Drive staged/.
 *
 * Usage:
 *   pnpm tutorial:list
 *   pnpm tutorial:validate
 *   pnpm tutorial:stage ep-01-welcome-and-objective [--dry-run] [--stage] [--staged-dir <path>]
 */

import { createHash, randomBytes } from 'node:crypto';
import { existsSync } from 'node:fs';
import { copyFile, mkdir, readFile, rename, unlink, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { TutorialEpisodeScenarioSchema, TutorialManifestSchema } from './schema.js';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, '../..');

async function sha256File(filePath: string): Promise<string> {
  // eslint-disable-next-line security/detect-non-literal-fs-filename
  const data = await readFile(filePath);
  return createHash('sha256').update(data).digest('hex');
}

function sha256Text(text: string): string {
  return createHash('sha256').update(text, 'utf8').digest('hex');
}

function formatChapterTimestamp(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const mins = Math.floor(totalSec / 60);
  const secs = totalSec % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function toYamlSidecar(sidecar: {
  title: string;
  description: string;
  privacy: string;
  tags: string[];
  episode_release: Record<string, string>;
}): string {
  const esc = (s: string) => JSON.stringify(s);
  const lines = [
    `title: ${esc(sidecar.title)}`,
    `privacy: ${esc(sidecar.privacy)}`,
    'tags:',
    ...sidecar.tags.map((t) => `  - ${esc(t)}`),
    `description: ${esc(sidecar.description)}`,
    'episode_release:',
    ...Object.entries(sidecar.episode_release).map(([k, v]) => `  ${k}: ${esc(v)}`),
  ];
  return lines.join('\n') + '\n';
}

async function atomicWrite(destPath: string, content: string | null, sourcePath?: string) {
  const tmpPath = join(dirname(destPath), `.${randomBytes(6).toString('hex')}.tmp`);
  try {
    if (sourcePath) {
      // eslint-disable-next-line security/detect-non-literal-fs-filename
      await copyFile(sourcePath, tmpPath);
    } else if (content !== null) {
      // eslint-disable-next-line security/detect-non-literal-fs-filename
      await writeFile(tmpPath, content, 'utf8');
    }
    // eslint-disable-next-line security/detect-non-literal-fs-filename
    await rename(tmpPath, destPath);
  } catch (err) {
    // eslint-disable-next-line security/detect-non-literal-fs-filename
    await unlink(tmpPath).catch(() => {});
    throw err;
  }
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2).filter((a) => a !== '--');
  const { values, positionals } = parseArgs({
    args: argv,
    allowPositionals: true,
    options: {
      list: { type: 'boolean', default: false },
      validate: { type: 'boolean', default: false },
      stage: { type: 'boolean', default: false },
      'dry-run': { type: 'boolean', default: false },
      'staged-dir': { type: 'string' },
      help: { type: 'boolean', default: false },
    },
  });

  if (values.help) {
    console.log(
      'Usage: pnpm tutorial:stage <episode-id> [--dry-run] [--stage] [--staged-dir <path>] | --list | --validate',
    );
    process.exit(0);
  }

  const manifestPath = join(here, 'manifest.json');
  const manifest = TutorialManifestSchema.parse(
    // eslint-disable-next-line security/detect-non-literal-fs-filename
    JSON.parse(await readFile(manifestPath, 'utf8')) as unknown,
  );

  if (values.list) {
    const shorts = manifest.episodes.filter((e) => e.format === '9:16').length;
    const longform = manifest.episodes.filter((e) => e.format === '16:9').length;
    console.log(
      `${manifest.seriesTitle} — ${manifest.episodes.length} episodes (${shorts} Shorts 9:16, ${longform} Long-Form 16:9)\n`,
    );
    for (const ep of manifest.episodes) {
      console.log(
        `  S${ep.season} · ${ep.id.padEnd(40)} [${ep.format}] (${ep.targetDurationSec}s) [${ep.status}] — ${ep.title}`,
      );
    }
    return;
  }

  if (values.validate) {
    let scenarioCount = 0;
    for (const ep of manifest.episodes) {
      if (ep.scenarioPath) {
        const fullPath = resolve(repoRoot, ep.scenarioPath);
        // eslint-disable-next-line security/detect-non-literal-fs-filename
        const raw = JSON.parse(await readFile(fullPath, 'utf8')) as unknown;
        const parsed = TutorialEpisodeScenarioSchema.parse(raw);
        if (parsed.id !== ep.id || parsed.format !== ep.format) {
          throw new Error(`Manifest/scenario mismatch for ${ep.id}`);
        }
        scenarioCount++;
      }
      if (ep.narrationPath) {
        const fullNarration = resolve(repoRoot, ep.narrationPath);
        // eslint-disable-next-line security/detect-non-literal-fs-filename
        if (!existsSync(fullNarration)) {
          throw new Error(`Missing narration script: ${ep.narrationPath}`);
        }
      }
    }
    console.log(
      `✅ Validated tutorial manifest: ${manifest.episodes.length} episodes, ${scenarioCount} authored scenario(s).`,
    );
    return;
  }

  const episodeId = positionals[0];
  if (!episodeId) {
    console.error('Provide an <episode-id>, --list, or --validate.');
    process.exit(1);
  }

  const scenarioPath = resolve(here, 'scenarios', `${episodeId}.json`);
  const spec = TutorialEpisodeScenarioSchema.parse(
    // eslint-disable-next-line security/detect-non-literal-fs-filename
    JSON.parse(await readFile(scenarioPath, 'utf8')) as unknown,
  );

  const artifactDir = resolve(repoRoot, 'artifacts/tutorials', spec.id);
  const footagePath = join(artifactDir, 'footage.json');
  const videoPath = join(repoRoot, 'output/video', `${spec.id}.mp4`);
  const vttPath = join(repoRoot, 'output/video', `${spec.id}.vtt`);
  const thumbPath = join(artifactDir, 'keyframes', `${spec.cues[0]?.id ?? 'cover'}.png`);

  let chapters: string[] = [];
  // eslint-disable-next-line security/detect-non-literal-fs-filename
  if (existsSync(footagePath)) {
    // eslint-disable-next-line security/detect-non-literal-fs-filename
    const footage = JSON.parse(await readFile(footagePath, 'utf8')) as {
      phases?: { label?: string; phase: string; startMs: number }[];
    };
    chapters = (footage.phases ?? []).map(
      (p) => `${formatChapterTimestamp(p.startMs)} ${p.label ?? p.phase}`,
    );
  }

  const tags = [...new Set([...spec.tags, ...(spec.format === '9:16' ? ['Shorts'] : [])])];
  const description = [
    spec.summary,
    ...(spec.companionUrl ? ['', `Companion guide: ${spec.companionUrl}`] : []),
    ...(chapters.length > 0 ? ['', 'Chapters:', ...chapters] : []),
    '',
    `Series: ${manifest.seriesTitle} (Season ${spec.season}, Episode ${spec.episodeNumber})`,
    `Format: ${spec.format === '9:16' ? 'Short (9:16)' : 'Long-Form (16:9)'} | Mode: ${spec.mode} | Seed: ${spec.seed}`,
  ].join('\n');

  const metadata = {
    title: spec.title,
    description,
    tags,
    privacy: 'private',
    episode_id: spec.id,
    format: spec.format,
    render_format: spec.format === '9:16' ? 'short' : 'longform',
  };

  const stagedDir =
    values['staged-dir'] ??
    process.env.PHALANX_MEDIA_PIPELINE_STAGED_DIR ??
    manifest.defaultStagedDir;

  const missing: string[] = [];
  for (const [label, p] of [
    ['video (.mp4)', videoPath],
    ['captions (.vtt)', vttPath],
    ['thumbnail (.png)', thumbPath],
  ] as const) {
    // eslint-disable-next-line security/detect-non-literal-fs-filename
    if (!existsSync(p)) missing.push(`${label}: ${p}`);
  }

  if (values['dry-run'] || !values.stage) {
    console.log(`[tutorial:stage] Dry-run cue bundle preview for ${spec.id}`);
    console.log(`  Target staged dir: ${stagedDir}`);
    console.log(`  Format:            ${spec.format} (${metadata.render_format})`);
    console.log(
      `  Missing renders:   ${missing.length === 0 ? 'none (ready to --stage)' : missing.join(', ')}`,
    );
    console.log(JSON.stringify(metadata, null, 2));
    return;
  }

  if (missing.length > 0) {
    throw new Error(
      `Cannot stage ${spec.id}; missing rendered artifacts:\n  - ${missing.join('\n  - ')}`,
    );
  }

  // eslint-disable-next-line security/detect-non-literal-fs-filename
  await mkdir(stagedDir, { recursive: true });

  const videoSha = await sha256File(videoPath);
  const vttSha = await sha256File(vttPath);
  const thumbSha = await sha256File(thumbPath);

  const sidecarYaml = toYamlSidecar({
    title: spec.title,
    description,
    privacy: 'private',
    tags,
    episode_release: {
      episode_id: spec.id,
      format: metadata.render_format,
      video_sha256: videoSha,
      captions_sha256: vttSha,
    },
  });

  const manifestBundle = {
    schema_version: '1.0',
    episode_id: spec.id,
    render_format: metadata.render_format,
    seed: spec.seed,
    mode: spec.mode,
    outputs: {
      [`${spec.id}.mp4`]: videoSha,
      [`${spec.id}.vtt`]: vttSha,
      [`${spec.id}.png`]: thumbSha,
      [`${spec.id}.yml`]: sha256Text(sidecarYaml),
    },
  };

  await atomicWrite(join(stagedDir, `${spec.id}.mp4`), null, videoPath);
  await atomicWrite(join(stagedDir, `${spec.id}.vtt`), null, vttPath);
  await atomicWrite(join(stagedDir, `${spec.id}.png`), null, thumbPath);
  await atomicWrite(
    join(stagedDir, `${spec.id}.metadata.json`),
    JSON.stringify(metadata, null, 2) + '\n',
  );
  await atomicWrite(join(stagedDir, `${spec.id}.yml`), sidecarYaml);
  await atomicWrite(
    join(stagedDir, `${spec.id}.manifest.json`),
    JSON.stringify(manifestBundle, null, 2) + '\n',
  );

  console.log(`✅ Staged ${spec.id} cue bundle into ${stagedDir}`);
}

await main();
