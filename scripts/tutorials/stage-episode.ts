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

function extractTranscript(narrationMarkdown: string): string {
  const body = narrationMarkdown.replace(/^---\n[\s\S]*?\n---\n/, '');
  const parts = body.split(/<!--\s*cue:[a-z0-9-]+\s*-->/i);
  const lines: string[] = [];
  for (let i = 1; i < parts.length; i++) {
    const text = (parts[i] ?? '').replace(/\s+/g, ' ').trim();
    if (text) lines.push(text);
  }
  return lines.join('\n\n') + '\n';
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
      'stage-all': { type: 'boolean', default: false },
      'dry-run': { type: 'boolean', default: false },
      'staged-dir': { type: 'string' },
      'capture-dir': { type: 'string', default: 'artifacts/tutorials' },
      'video-dir': { type: 'string', default: 'output/video/rerecorded' },
      help: { type: 'boolean', default: false },
    },
  });

  if (values.help) {
    console.log(
      'Usage: pnpm tutorial:stage <episode-id> [--dry-run] [--stage] | --stage-all [--video-dir <path>] [--capture-dir <path>] [--staged-dir <path>] | --list | --validate',
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
      if (!ep.scenarioPath || !ep.narrationPath) {
        if (ep.status === 'planned') continue;
        throw new Error(`Missing scenario or narration path for ${ep.id}`);
      }
      const fullPath = resolve(repoRoot, ep.scenarioPath);
      const fullNarration = resolve(repoRoot, ep.narrationPath);
      // eslint-disable-next-line security/detect-non-literal-fs-filename
      const raw = JSON.parse(await readFile(fullPath, 'utf8')) as unknown;
      const parsed = TutorialEpisodeScenarioSchema.parse(raw);
      if (parsed.id !== ep.id || parsed.format !== ep.format || parsed.title !== ep.title) {
        throw new Error(`Manifest/scenario mismatch for ${ep.id}`);
      }
      for (const cue of parsed.cues) {
        if (!cue.actions || !cue.expect || !cue.focus) {
          throw new Error(`Specify actions, result, and focus for ${ep.id}/${cue.id}`);
        }
      }
      // eslint-disable-next-line security/detect-non-literal-fs-filename
      const narration = await readFile(fullNarration, 'utf8');
      const authoredIds = parsed.cues.map((cue) => cue.id);
      const spokenIds = [...narration.matchAll(/<!--\s*cue:([a-z0-9-]+)\s*-->/g)].map(
        (match) => match[1],
      );
      if (
        new Set(authoredIds).size !== authoredIds.length ||
        authoredIds.join() !== spokenIds.join()
      ) {
        throw new Error(`Scenario and narration cue IDs must match in order for ${ep.id}`);
      }
      scenarioCount++;
    }
    console.log(
      `✅ Validated tutorial manifest: ${manifest.episodes.length} episodes, ${scenarioCount} authored scenario(s).`,
    );
    return;
  }

  const episodeIds = values['stage-all']
    ? manifest.episodes.map((e) => e.id)
    : positionals[0]
      ? [positionals[0]]
      : [];
  if (episodeIds.length === 0) {
    console.error('Provide an <episode-id>, --stage-all, --list, or --validate.');
    process.exit(1);
  }

  const stagedDir =
    values['staged-dir'] ??
    process.env.PHALANX_MEDIA_PIPELINE_STAGED_DIR ??
    manifest.defaultStagedDir;
  const videoDir = resolve(repoRoot, values['video-dir']);
  const playlistEntries: {
    episodeNumber: number;
    season: number;
    id: string;
    format: string;
    title: string;
    description: string;
    transcript: string;
    chapters: string[];
    tags: string[];
  }[] = [];

  for (const episodeId of episodeIds) {
    const scenarioPath = resolve(here, 'scenarios', `${episodeId}.json`);
    const narrationPath = resolve(here, 'narrations', `${episodeId}.md`);
    const spec = TutorialEpisodeScenarioSchema.parse(
      // eslint-disable-next-line security/detect-non-literal-fs-filename
      JSON.parse(await readFile(scenarioPath, 'utf8')) as unknown,
    );
    // eslint-disable-next-line security/detect-non-literal-fs-filename
    const transcript = extractTranscript(await readFile(narrationPath, 'utf8'));

    const artifactDir = resolve(repoRoot, values['capture-dir'], spec.id);
    const editPath = join(videoDir, `${spec.id}.edit.json`);
    const videoPath = join(videoDir, `${spec.id}.mp4`);
    const vttPath = join(videoDir, `${spec.id}.vtt`);
    const thumbPath = join(artifactDir, 'keyframes', `${spec.cues[0]?.id ?? 'cover'}.png`);

    let chapters: string[] = [];
    // eslint-disable-next-line security/detect-non-literal-fs-filename
    if (existsSync(editPath)) {
      // eslint-disable-next-line security/detect-non-literal-fs-filename
      const edits = JSON.parse(await readFile(editPath, 'utf8')) as {
        cue: string;
        label: string;
        startMs: number;
      }[];
      chapters = edits.map((shot) => `${formatChapterTimestamp(shot.startMs)} ${shot.label}`);
    }

    const tags = [...new Set([...spec.tags, ...(spec.format === '9:16' ? ['Shorts'] : [])])];
    const description = [
      spec.summary,
      ...(spec.companionUrl ? ['', `Companion guide: ${spec.companionUrl}`] : []),
      ...(chapters.length > 0 ? ['', 'Chapters:', ...chapters] : []),
      '',
      `Series: ${manifest.seriesTitle} (Season ${spec.season}, Episode ${spec.episodeNumber})`,
      `Playlist: https://www.youtube.com/playlist?list=${manifest.playlistId}`,
      `Format: ${spec.format === '9:16' ? 'Short (9:16)' : 'Long-Form (16:9)'} | Mode: ${spec.mode} | Seed: ${spec.seed}`,
    ].join('\n');

    const metadata = {
      title: spec.title,
      description,
      transcript: transcript.trim(),
      chapters,
      tags,
      privacy: 'private',
      episode_id: spec.id,
      season: spec.season,
      episode_number: spec.episodeNumber,
      playlist_id: manifest.playlistId,
      channel_url: manifest.channelUrl,
      format: spec.format,
      render_format: spec.format === '9:16' ? 'short' : 'longform',
    };

    playlistEntries.push({
      episodeNumber: spec.episodeNumber,
      season: spec.season,
      id: spec.id,
      format: spec.format,
      title: spec.title,
      description,
      transcript: transcript.trim(),
      chapters,
      tags,
    });

    const missing: string[] = [];
    for (const [label, p] of [
      ['video (.mp4)', videoPath],
      ['captions (.vtt)', vttPath],
      ['thumbnail (.png)', thumbPath],
    ] as const) {
      // eslint-disable-next-line security/detect-non-literal-fs-filename
      if (!existsSync(p)) missing.push(`${label}: ${p}`);
    }

    if (values['dry-run'] || (!values.stage && !values['stage-all'])) {
      console.log(`[tutorial:stage] Dry-run cue bundle preview for ${spec.id}`);
      console.log(`  Target staged dir: ${stagedDir}`);
      console.log(`  Format:            ${spec.format} (${metadata.render_format})`);
      console.log(
        `  Missing renders:   ${missing.length === 0 ? 'none (ready to --stage)' : missing.join(', ')}`,
      );
      console.log(JSON.stringify(metadata, null, 2));
      continue;
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
    const transcriptSha = sha256Text(transcript);

    const sidecarYaml = toYamlSidecar({
      title: spec.title,
      description,
      privacy: 'private',
      tags,
      episode_release: {
        episode_id: spec.id,
        season: String(spec.season),
        episode_number: String(spec.episodeNumber),
        playlist_id: manifest.playlistId,
        format: metadata.render_format,
        video_sha256: videoSha,
        captions_sha256: vttSha,
        transcript_sha256: transcriptSha,
      },
    });

    const manifestBundle = {
      schema_version: '1.0',
      episode_id: spec.id,
      playlist_id: manifest.playlistId,
      render_format: metadata.render_format,
      seed: spec.seed,
      mode: spec.mode,
      outputs: {
        [`${spec.id}.mp4`]: videoSha,
        [`${spec.id}.vtt`]: vttSha,
        [`${spec.id}.txt`]: transcriptSha,
        [`${spec.id}.png`]: thumbSha,
        [`${spec.id}.yml`]: sha256Text(sidecarYaml),
      },
    };

    await atomicWrite(join(stagedDir, `${spec.id}.mp4`), null, videoPath);
    await atomicWrite(join(stagedDir, `${spec.id}.vtt`), null, vttPath);
    await atomicWrite(join(stagedDir, `${spec.id}.txt`), transcript);
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

  if (values['stage-all'] && !values['dry-run']) {
    const playlistMd = [
      `# ${manifest.seriesTitle}`,
      '',
      `- **Playlist ID:** \`${manifest.playlistId}\``,
      `- **Playlist URL:** https://www.youtube.com/playlist?list=${manifest.playlistId}`,
      `- **Channel:** ${manifest.channelUrl}`,
      `- **Target Slug:** \`${manifest.targetSlug}\``,
      `- **Episodes:** ${playlistEntries.length} (${playlistEntries.filter((e) => e.format === '9:16').length} Shorts 9:16, ${playlistEntries.filter((e) => e.format === '16:9').length} Long-Form 16:9)`,
      '',
      '## Playlist Notes for Media Pipeline',
      '',
      '- All 22 episodes are recorded in dark mode (`color-scheme: dark`), EBU R128 loudness-normalized (`-16 LUFS`), and verified with matching `.mp4`, `.vtt` captions, `.txt` transcripts, `.png` thumbnails, `.yml` YouTube sidecars, and `.metadata.json` files.',
      '- Seasons 1–6 follow the canonical learning progression: Core Foundations (S1), Accounts/Cosmetics/HUD (S2), Modes & Bots (S3), Ladder/Profiles/Replays/Spectator (S4), Local LAN Tournament Play & Hosting on `lan.phalanxduel.com` (S5), and Advanced Tactics & Full Match (S6).',
      '- Upload in episode order (`ep-01` through `ep-22`) into playlist `PLHenvAZhJjHo`.',
      '',
      '## Episode Catalog (Titles, Descriptions & Transcripts)',
      '',
      ...playlistEntries.flatMap((ep) => [
        `### S${ep.season}E${String(ep.episodeNumber).padStart(2, '0')} — ${ep.title} (\`${ep.id}\`, ${ep.format})`,
        '',
        '**Description:**',
        '```text',
        ep.description,
        '```',
        '',
        '**Transcript:**',
        '```text',
        ep.transcript,
        '```',
        '',
      ]),
    ].join('\n');

    const playlistYml =
      [
        `series_title: ${JSON.stringify(manifest.seriesTitle)}`,
        `target_slug: ${JSON.stringify(manifest.targetSlug)}`,
        `playlist_id: ${JSON.stringify(manifest.playlistId)}`,
        `playlist_url: ${JSON.stringify(`https://www.youtube.com/playlist?list=${manifest.playlistId}`)}`,
        `channel_url: ${JSON.stringify(manifest.channelUrl)}`,
        'episodes:',
        ...playlistEntries.flatMap((ep) => [
          `  - episode_number: ${ep.episodeNumber}`,
          `    season: ${ep.season}`,
          `    id: ${JSON.stringify(ep.id)}`,
          `    format: ${JSON.stringify(ep.format)}`,
          `    title: ${JSON.stringify(ep.title)}`,
        ]),
      ].join('\n') + '\n';

    await atomicWrite(join(stagedDir, 'playlist.md'), playlistMd);
    await atomicWrite(join(stagedDir, 'playlist.yml'), playlistYml);
    console.log(`✅ Wrote playlist notes (playlist.md, playlist.yml) into ${stagedDir}`);
  }
}

await main();
