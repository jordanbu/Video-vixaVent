import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { SOUND_EFFECTS, SOUND_GROUPS } from '../audio/soundLibrary';
import { ES } from '../i18n/dict/es';
import { ES_DATA } from '../i18n/dict/es/data';

const missingNames = SOUND_EFFECTS
  .map((sound) => sound.name)
  .filter((name) => !ES_DATA[name]);

assert.deepEqual(
  missingNames,
  [],
  'every built-in sound effect must have a Spanish display name',
);

// Group names are translation keys: the English name itself, translated to Spanish (specs/11).
const mismatchedGroupNames = SOUND_GROUPS
  .filter((group) => group.name !== group.nameEn || !ES[group.name])
  .map((group) => group.name);

assert.deepEqual(
  mismatchedGroupNames,
  [],
  'every sound group is keyed by its English name and has a Spanish one',
);

const browserSource = readFileSync(new URL('./SoundBrowser.tsx', import.meta.url), 'utf8');

assert.match(browserSource, /\{t\(g\.name\)\}/, 'sound group chips must render through the active locale');
assert.doesNotMatch(browserSource, /\{g\.name\}/, 'sound group chips must not render the raw data name directly');
assert.match(browserSource, /tData\(s\.name\)/, 'Chinese sound names must participate in search');
assert.match(browserSource, /const displayName = tData\(sound\.name\)/, 'sound rows must derive a localized display name');
assert.match(browserSource, /vx-sound-name[^>]*>\{displayName\}/, 'sound rows must render the localized display name');
assert.match(browserSource, /\{ n: list\.length \}/, 'the footer must report the active search/category result count');
assert.doesNotMatch(
  browserSource,
  /\{ n: SOUND_EFFECTS\.length \}/,
  'the filtered result footer must not keep reporting the full library size',
);

assert.match(
  browserSource,
  /function toAsset[\s\S]*?name: s\.name/,
  'adding a sound must preserve its canonical data name',
);
assert.match(
  browserSource,
  /setLibraryDrag\([\s\S]*?name: sound\.name/,
  'dragging a sound must preserve its canonical data name',
);

console.log(`sound-localization.verify: ${SOUND_EFFECTS.length} built-in sound names localized without mutating data`);
