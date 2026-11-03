import assert from 'node:assert/strict';
import { ASR_MODELS } from '../../../shared/asr-models';
import { ES } from '../../i18n/dict/es';
import { localAsrPage, TRANSCRIPTION_SETTINGS_GROUP } from './settingsMediaProviders';

function transcriptionLanguageOptions(pageFields: readonly { name: string; options?: readonly { value: string; label: string }[] }[]) {
  const field = pageFields.find((candidate) => candidate.name === 'TRANSCRIPTION_LANGUAGE');
  assert.ok(field, 'transcription pages must expose a transcription language selector');
  return field.options ?? [];
}

for (const page of TRANSCRIPTION_SETTINGS_GROUP.vendors) {
  const options = transcriptionLanguageOptions(page.fields);
  for (const language of ['it', 'ru', 'pt']) {
    assert.ok(
      options.some((option) => option.value === language),
      `${page.key} must offer ${language} transcription`,
    );
  }
}

assert.ok(
  transcriptionLanguageOptions(localAsrPage.fields).some((option) => option.value === 'it'),
  'local ASR settings must offer Italian transcription',
);
assert.ok(
  transcriptionLanguageOptions(localAsrPage.fields).some((option) => option.value === 'ru'),
  'local ASR settings must offer Russian transcription',
);
assert.ok(
  transcriptionLanguageOptions(localAsrPage.fields).some((option) => option.value === 'pt'),
  'local ASR settings must offer Portuguese transcription',
);

// Every transcription language name is translated in each interface language.
for (const option of transcriptionLanguageOptions(localAsrPage.fields)) {
  // English shows the key itself (keys are English, specs/11); Spanish needs its entry.
  assert.match(option.label, /^[\x20-\x7e\u00c0-\u024f]+$/, `the key is English text: ${option.label}`);
  assert.ok(ES[option.label], `es dictionary must translate ${option.label}`);
}

for (const model of ASR_MODELS) {
  assert.match(model.language, /Italian|Italiano|it/i, `${model.id} should be advertised as Italian-capable`);
  assert.match(model.language, /Russian|Русский|ru/i, `${model.id} should be advertised as Russian-capable`);
  assert.match(model.language, /Portuguese|Português/i, `${model.id} should be advertised as Portuguese-capable`);
}

console.log('transcription-language.verify: Italian, Russian and Portuguese transcription are exposed and translated for local and AI providers');
