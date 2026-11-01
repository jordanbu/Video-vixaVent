// Unconfigured transcription is Spanish (shared/transcription-language.ts). It used to
// fall back to Chinese in seven places, so Spanish audio came back as Chinese text
// until someone found Settings → Transcription.
// npx tsx src/transcript/transcription-default.verify.ts
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { DEFAULT_TRANSCRIPTION_LANGUAGE } from '../../shared/transcription-language';

assert.equal(DEFAULT_TRANSCRIPTION_LANGUAGE, 'es');

// Browser preference: nothing saved → Spanish; a saved choice still wins.
let saved: string | null = null;
Object.defineProperty(globalThis, 'localStorage', {
  configurable: true,
  value: { getItem: () => saved, setItem: (_key: string, value: string) => { saved = value; } },
});
const { preferredTranscriptionLanguage } = await import('./provider');
assert.equal(preferredTranscriptionLanguage(), 'es', 'no saved language → Spanish');
saved = '  ';
assert.equal(preferredTranscriptionLanguage(), 'es', 'a blank saved value → Spanish');
saved = 'zh';
assert.equal(preferredTranscriptionLanguage(), 'zh', 'an explicit choice is kept');

// Settings select: the "unset" label and the first option are Spanish.
const { TRANSCRIPTION_SETTINGS_GROUP } = await import('../components/settings/settingsMediaProviders');
for (const page of TRANSCRIPTION_SETTINGS_GROUP.vendors) {
  const field = page.fields.find((candidate) => candidate.name === 'TRANSCRIPTION_LANGUAGE');
  if (!field) continue;
  assert.equal(field.options?.[0]?.value, 'es', `${page.key}: Spanish is the first option`);
  assert.equal(field.defaultLabel, field.options?.[0]?.label, `${page.key}: the unset label names the default`);
}

// No provider or setting falls back to a hard-coded language again.
const root = fileURLToPath(new URL('../..', import.meta.url));
const sources = execFileSync('git', ['ls-files', 'src', 'server', 'desktop', 'shared'], { cwd: root, encoding: 'utf8' })
  .split('\n')
  .filter((file) => /\.(?:ts|tsx|mts)$/.test(file) && !/\.verify\.|\/i18n\/dict\//.test(file));
// `?? 'zh'` / `|| 'zh'` fallbacks. Normalizing a code (whisperLanguage: zh-CN → zh) is fine.
const HARDCODED = /(?:\?\?|\|\|)\s*'zh'/;
const offenders = sources.filter((file) => HARDCODED.test(readFileSync(`${root}/${file}`, 'utf8')));
assert.deepEqual(offenders, [], 'transcription defaults must use DEFAULT_TRANSCRIPTION_LANGUAGE');
assert.ok(sources.length > 500, `the scan must see the source tree (${sources.length} files)`);

console.log(`transcription-default.verify: unconfigured transcription is Spanish; ${sources.length} sources scanned`);
