/**
 * scripts/tutorials/build-episode.mjs
 *
 * Assembles a narrated, EBU R128 loudness-normalized YouTube MP4 + WebVTT captions
 * from `artifacts/tutorials/<ep-id>/footage.json` and `scripts/tutorials/narrations/<ep-id>.md`.
 *
 * Usage:
 *   pnpm tutorial:build ep-01-welcome-and-objective [--voice "Zoe (Premium)"]
 */

import { execFile } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs, promisify } from 'node:util';

const exec = promisify(execFile);
const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, '../..');

function formatVttTime(seconds) {
  const ms = Math.max(0, Math.round(seconds * 1000));
  const hrs = Math.floor(ms / 3_600_000);
  const mins = Math.floor((ms % 3_600_000) / 60_000);
  const secs = Math.floor((ms % 60_000) / 1000);
  const rem = ms % 1000;
  return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${String(rem).padStart(3, '0')}`;
}

function parseNarrationMd(markdown) {
  const pronunciation = {};
  let body = markdown;
  const fmMatch = markdown.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (fmMatch) {
    body = fmMatch[2];
    const pronMatch = fmMatch[1].match(/pronunciation:\n((?:[ \t]+.+\n?)*)/);
    if (pronMatch) {
      for (const line of pronMatch[1].split('\n')) {
        const kv = line.match(/^\s+([^:]+):\s*(.+?)\s*$/);
        if (kv) pronunciation[kv[1].trim()] = kv[2].trim();
      }
    }
  }

  const cues = new Map();
  const parts = body.split(/<!--\s*cue:([a-z0-9-]+)\s*-->/i);
  for (let i = 1; i < parts.length; i += 2) {
    const id = parts[i].trim();
    const text = (parts[i + 1] ?? '').replace(/\s+/g, ' ').trim();
    if (id && text) cues.set(id, text);
  }
  return { pronunciation, cues };
}

function applyPronunciation(text, map) {
  let out = text;
  for (const [term, spoken] of Object.entries(map)) {
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    out = out.replace(new RegExp(`\\b${escaped}\\b`, 'g'), spoken);
  }
  return out;
}

async function probeDuration(filePath) {
  const { stdout } = await exec('ffprobe', [
    '-v',
    'error',
    '-show_entries',
    'format=duration',
    '-of',
    'default=noprint_wrappers=1:nokey=1',
    filePath,
  ]);
  const parsed = Number.parseFloat(stdout.trim());
  return Number.isFinite(parsed) ? parsed : 0;
}

async function synthesizeSpeech(text, voice, outWavPath) {
  const aiffPath = `${outWavPath}.aiff`;
  try {
    await exec('say', ['-v', voice, '-o', aiffPath, text]);
  } catch {
    await exec('say', ['-o', aiffPath, text]);
  }
  await exec('ffmpeg', ['-y', '-i', aiffPath, '-ar', '48000', '-ac', '2', outWavPath]);
  await rm(aiffPath, { force: true });
}

async function main() {
  const argv = process.argv.slice(2).filter((a) => a !== '--');
  const { values, positionals } = parseArgs({
    args: argv,
    allowPositionals: true,
    options: {
      voice: { type: 'string', default: process.env.PHALANX_TUTORIAL_VOICE ?? 'Zoe (Premium)' },
      help: { type: 'boolean', default: false },
    },
  });

  const episodeId = positionals[0];
  if (values.help || !episodeId) {
    console.log('Usage: pnpm tutorial:build <episode-id> [--voice "Zoe (Premium)"]');
    process.exit(episodeId ? 0 : 1);
  }

  const artifactDir = resolve(repoRoot, 'artifacts/tutorials', episodeId);
  const footagePath = join(artifactDir, 'footage.json');
  const narrationPath = resolve(here, 'narrations', `${episodeId}.md`);
  if (!existsSync(footagePath)) {
    throw new Error(`Missing ${footagePath} — run: pnpm tutorial:record ${episodeId}`);
  }
  if (!existsSync(narrationPath)) {
    throw new Error(`Missing narration file: ${narrationPath}`);
  }

  const footage = JSON.parse(await readFile(footagePath, 'utf8'));
  const { pronunciation, cues } = parseNarrationMd(await readFile(narrationPath, 'utf8'));
  const workDir = join(artifactDir, 'build');
  const outDir = resolve(repoRoot, 'output/video');
  await rm(workDir, { recursive: true, force: true });
  await mkdir(workDir, { recursive: true });
  await mkdir(outDir, { recursive: true });

  const W = footage.outputResolution?.width ?? 1920;
  const H = footage.outputResolution?.height ?? 1080;
  const FPS = footage.fps ?? 30;
  const LEAD_SEC = 0.25;
  const TAIL_SEC = 0.45;

  const segPaths = [];
  const vttLines = ['WEBVTT', ''];
  let timeline = 0;

  for (let i = 0; i < footage.phases.length; i++) {
    const phase = footage.phases[i];
    const tag = String(i).padStart(2, '0');
    const rawText = cues.get(phase.phase) ?? phase.label ?? phase.phase;
    const spoken = applyPronunciation(rawText, pronunciation);

    const wavPath = join(workDir, `speech-${tag}.wav`);
    await synthesizeSpeech(spoken, values.voice, wavPath);
    const speechSec = await probeDuration(wavPath);

    const clipStart = Math.max(0, (phase.startMs ?? 0) / 1000);
    const clipDur = Math.max(0.5, ((phase.endMs ?? phase.startMs + 2500) - phase.startMs) / 1000);
    const targetDur = Math.max(clipDur, LEAD_SEC + speechSec + TAIL_SEC);
    const padTail = Math.max(0, targetDur - clipDur + 0.1);

    const segPath = join(workDir, `seg-${tag}.mp4`);
    const vf = [
      `scale=${W}:${H}:force_original_aspect_ratio=decrease`,
      `pad=${W}:${H}:(ow-iw)/2:(oh-ih)/2:color=#0b1020`,
      `fps=${FPS}`,
      `tpad=stop_mode=clone:stop_duration=${padTail.toFixed(2)}`,
      'format=yuv420p',
    ].join(',');
    const af = `adelay=${Math.round(LEAD_SEC * 1000)}|${Math.round(LEAD_SEC * 1000)},apad=whole_dur=${targetDur.toFixed(3)}`;

    await exec('ffmpeg', [
      '-y',
      '-ss',
      clipStart.toFixed(3),
      '-t',
      clipDur.toFixed(3),
      '-i',
      footage.file,
      '-i',
      wavPath,
      '-vf',
      vf,
      '-af',
      af,
      '-t',
      targetDur.toFixed(3),
      '-c:v',
      'libx264',
      '-preset',
      'veryfast',
      '-crf',
      '20',
      '-c:a',
      'aac',
      '-b:a',
      '192k',
      '-ar',
      '48000',
      '-ac',
      '2',
      segPath,
    ]);

    segPaths.push(segPath);
    vttLines.push(
      String(i + 1),
      `${formatVttTime(timeline + LEAD_SEC)} --> ${formatVttTime(timeline + LEAD_SEC + speechSec)}`,
      rawText,
      '',
    );
    timeline += targetDur;
  }

  const concatList = join(workDir, 'concat.txt');
  await writeFile(
    concatList,
    segPaths.map((p) => `file '${p.replace(/'/g, "'\\''")}'`).join('\n') + '\n',
  );

  const rawConcat = join(workDir, 'concat.mp4');
  await exec('ffmpeg', [
    '-y',
    '-f',
    'concat',
    '-safe',
    '0',
    '-i',
    concatList,
    '-c',
    'copy',
    rawConcat,
  ]);

  const finalMp4 = join(outDir, `${episodeId}.mp4`);
  const finalVtt = join(outDir, `${episodeId}.vtt`);
  await exec('ffmpeg', [
    '-y',
    '-i',
    rawConcat,
    '-c:v',
    'copy',
    '-af',
    'loudnorm=I=-16:TP=-1.5:LRA=11',
    '-c:a',
    'aac',
    '-b:a',
    '192k',
    '-movflags',
    '+faststart',
    finalMp4,
  ]);
  await writeFile(finalVtt, vttLines.join('\n'));

  const finalDur = await probeDuration(finalMp4);
  console.log(
    `✅ Built ${episodeId}: ${finalMp4} (${W}x${H}, ${finalDur.toFixed(1)}s, ${footage.phases.length} captions -> ${finalVtt})`,
  );
}

await main();
