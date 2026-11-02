// System voice: the text-to-speech built into macOS (`say`), with no API key and no network
// (specs/10-chat-resumen-y-revision.md, part C). Draft quality — good for timing a narration
// against the edit; a configured provider is still the voice for a final cut.
import { spawn } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { ffmpegBin } from '../media-binaries.ts';

/** Voice per UI language when the request names none: Latin American Spanish and US English. */
export const SYSTEM_VOICE_DEFAULTS: Readonly<Record<string, string>> = { es: 'Paulina', en: 'Samantha' };
/** `say` speaks about 175 words per minute; `speed` scales it. */
export const SYSTEM_VOICE_BASE_RATE = 175;
export const SYSTEM_VOICE_MAX_TEXT = 5_000;
const SAMPLE_RATE = 48_000;
const TIMEOUT_MS = 120_000;
// A voice name as `say -v '?'` lists it: letters, digits, spaces, parentheses, dots and dashes —
// never starting with a dash, so it can not be read as an option.
const VOICE_NAME = /^[\p{L}\p{N}][\p{L}\p{N} ().'_-]{0,63}$/u;

export interface SystemVoiceInput {
  text: string;
  voiceId?: string;
  speed?: number;
  languageCode?: string;
}

export function systemVoiceAvailable(platform: NodeJS.Platform = process.platform): boolean {
  return platform === 'darwin';
}

/** The voice to use: the requested one, or the default for the language (Spanish when unknown). */
export function systemVoiceName(input: Pick<SystemVoiceInput, 'voiceId' | 'languageCode'>): string {
  const requested = input.voiceId?.trim();
  if (requested) {
    if (!VOICE_NAME.test(requested)) throw new Error(`invalid system voice name: ${requested.slice(0, 40)}`);
    return requested;
  }
  const language = (input.languageCode ?? '').toLowerCase().split(/[-_]/)[0] ?? '';
  return SYSTEM_VOICE_DEFAULTS[language] ?? SYSTEM_VOICE_DEFAULTS.es!;
}

/** Arguments for `say`: fixed flags only; the text arrives on stdin, never as an argument. */
export function systemVoiceArgs(voice: string, speed: number | undefined, output: string): string[] {
  const factor = speed == null ? 1 : speed;
  if (!Number.isFinite(factor) || factor < 0.5 || factor > 2) throw new Error('system voice speed must be between 0.5 and 2');
  return ['-v', voice, '-r', String(Math.round(SYSTEM_VOICE_BASE_RATE * factor)), '-o', output, '-f', '-'];
}

function run(command: string, args: readonly string[], stdin?: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: ['pipe', 'ignore', 'pipe'] });
    let stderr = '';
    const timer = setTimeout(() => child.kill('SIGKILL'), TIMEOUT_MS);
    child.stderr.on('data', (chunk: Buffer) => { stderr += chunk.toString('utf8'); });
    child.on('error', (error) => { clearTimeout(timer); reject(error); });
    child.on('close', (code) => {
      clearTimeout(timer);
      if (code === 0) resolve();
      else reject(new Error(stderr.trim().slice(0, 300) || `${command} exited with ${code}`));
    });
    child.stdin.end(stdin ?? '');
  });
}

export interface SystemVoiceEntry { name: string; locale: string }

/** Parse `say -v '?'`: "Eddy (Español (México)) es_MX    # ¡Hola! Me llamo Eddy." per line. */
export function parseSystemVoices(listing: string): SystemVoiceEntry[] {
  return listing.split('\n').flatMap((line) => {
    const match = /^(.+?)\s+([a-z]{2,3}_[A-Za-z0-9]{2,4})\s+#/.exec(line.trim());
    return match ? [{ name: match[1]!.trim(), locale: match[2]! }] : [];
  });
}

function listSystemVoices(): Promise<SystemVoiceEntry[]> {
  return new Promise((resolve, reject) => {
    const child = spawn('/usr/bin/say', ['-v', '?'], { stdio: ['ignore', 'pipe', 'pipe'] });
    let out = '';
    child.stdout.on('data', (chunk: Buffer) => { out += chunk.toString('utf8'); });
    child.on('error', reject);
    child.on('close', () => resolve(parseSystemVoices(out)));
  });
}

let voicesCache: Promise<SystemVoiceEntry[]> | null = null;

/**
 * `say` quietly falls back to another voice when the named one is missing, so the agent
 * would get a different voice than it asked for: check the installed list first.
 */
async function requireInstalledVoice(voice: string): Promise<void> {
  voicesCache ??= listSystemVoices().catch((error: unknown) => { voicesCache = null; throw error; });
  const voices = await voicesCache;
  if (voices.some((entry) => entry.name.toLowerCase() === voice.toLowerCase())) return;
  // Named voices (Paulina, Mónica, their Premium versions) first; the novelty ones ("Grandpa (Español…)") last.
  const spanish = voices
    .filter((entry) => entry.locale.startsWith('es_'))
    .map((entry) => entry.name)
    .sort((a, b) => Number(/\(Español/.test(a)) - Number(/\(Español/.test(b)) || a.localeCompare(b))
    .slice(0, 8);
  throw new Error(`La voz «${voice}» no está instalada en esta Mac. Voces en español: ${spanish.join(', ') || 'ninguna'}.`);
}

/** Speak `text` with the macOS voice and return a 48 kHz mono WAV. */
export async function systemVoice(input: SystemVoiceInput): Promise<{ bytes: Buffer; codec: 'wav'; sampleRate: number }> {
  if (!systemVoiceAvailable()) throw new Error('La voz del sistema solo está disponible en macOS. Configura un proveedor de voz en Ajustes.');
  const text = input.text.trim();
  if (!text) throw new Error('text is required');
  if (text.length > SYSTEM_VOICE_MAX_TEXT) throw new Error(`system voice text must be at most ${SYSTEM_VOICE_MAX_TEXT} characters`);
  const voice = systemVoiceName(input);
  await requireInstalledVoice(voice);
  const dir = await mkdtemp(join(tmpdir(), 'vixaventora-voice-'));
  try {
    const aiff = join(dir, 'voice.aiff');
    const wav = join(dir, 'voice.wav');
    await run('/usr/bin/say', systemVoiceArgs(voice, input.speed, aiff), text);
    await run(ffmpegBin(), ['-v', 'error', '-y', '-i', aiff, '-ac', '1', '-ar', String(SAMPLE_RATE), '-c:a', 'pcm_s16le', wav]);
    return { bytes: await readFile(wav), codec: 'wav', sampleRate: SAMPLE_RATE };
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}
