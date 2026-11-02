// System voice (macOS `say`, no key): fixed arguments, validation, and a real synthesis on
// macOS (specs/10, part C).
// npx tsx server/plugins/voice-system.verify.ts
import assert from 'node:assert/strict';
import { existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { parseSystemVoices, systemVoice, systemVoiceArgs, systemVoiceAvailable, systemVoiceName } from './voice-system.ts';
import { validateVoiceRequest } from './voice-validation.ts';
import { buildSubmitVoiceArgs } from '../../src/agent/tools/generate-tool-input.ts';

// ── voice choice ──
assert.equal(systemVoiceName({ languageCode: 'es' }), 'Paulina');
assert.equal(systemVoiceName({ languageCode: 'es-MX' }), 'Paulina');
assert.equal(systemVoiceName({ languageCode: 'en-US' }), 'Samantha');
assert.equal(systemVoiceName({}), 'Paulina', 'Spanish when nothing is said: the app is Spanish first');
assert.equal(systemVoiceName({ voiceId: 'Mónica' }), 'Mónica', 'an installed voice name with accents');
assert.equal(systemVoiceName({ voiceId: 'Eddy (Español (México))' }), 'Eddy (Español (México))');
for (const bad of ['-o /etc/passwd', '--interactive', 'Paulina; rm -rf ~', '$(whoami)', 'a'.repeat(80)]) {
  assert.throws(() => systemVoiceName({ voiceId: bad }), /invalid system voice name/, `rejects ${bad.slice(0, 20)}`);
}

// ── fixed arguments: the text is never one of them ──
assert.deepEqual(systemVoiceArgs('Paulina', undefined, '/tmp/v.aiff'), ['-v', 'Paulina', '-r', '175', '-o', '/tmp/v.aiff', '-f', '-']);
assert.deepEqual(systemVoiceArgs('Paulina', 1.2, '/tmp/v.aiff').slice(2, 4), ['-r', '210']);
assert.throws(() => systemVoiceArgs('Paulina', 3, '/tmp/v.aiff'), /between 0.5 and 2/);

// ── server validation ──
const valid = validateVoiceRequest({ provider: 'system', text: '  Hola  ', languageCode: 'es', speed: 1.1 });
assert.equal(valid.provider, 'system');
assert.equal(valid.text, 'Hola');
assert.equal(valid.voiceId, '', 'voiceId is optional');
assert.equal(valid.audioFormat, 'wav');
assert.throws(() => validateVoiceRequest({ provider: 'system', text: 'Hola', modelId: 'x' }), /only accepts text, voiceId, speed, and languageCode/);
assert.throws(() => validateVoiceRequest({ provider: 'system', text: 'Hola', speed: 3 }), /speed/);
assert.throws(() => validateVoiceRequest({ provider: 'system', text: '   ' }), /text is required/);

// ── the agent's tool input ──
assert.deepEqual(
  buildSubmitVoiceArgs({ provider: 'system', text: 'Hola', speed: 1.1, languageCode: 'es', name: 'Narración' }),
  { provider: 'system', text: 'Hola', voiceId: '', name: 'Narración', speed: 1.1, languageCode: 'es' },
);

// ── the installed-voice list ──
assert.deepEqual(parseSystemVoices([
  'Eddy (Español (México)) es_MX    # ¡Hola! Me llamo Eddy.',
  'Paulina             es_MX    # ¡Hola! Me llamo Paulina.',
  'Samantha            en_US    # Hello! My name is Samantha.',
  'garbage line',
].join('\n')), [
  { name: 'Eddy (Español (México))', locale: 'es_MX' },
  { name: 'Paulina', locale: 'es_MX' },
  { name: 'Samantha', locale: 'en_US' },
]);

// ── a real synthesis (macOS only) ──
assert.equal(systemVoiceAvailable('darwin'), true);
assert.equal(systemVoiceAvailable('linux'), false);
if (systemVoiceAvailable()) {
  const marker = join(tmpdir(), `vixaventora-say-marker-${process.pid}`);
  rmSync(marker, { force: true });
  const text = `El futuro no se espera. Se construye. $(touch ${marker}) \`touch ${marker}\``;
  const audio = await systemVoice({ text, languageCode: 'es' });
  assert.equal(audio.codec, 'wav');
  assert.equal(audio.bytes.subarray(0, 4).toString('ascii'), 'RIFF', 'a WAV file');
  const seconds = (audio.bytes.length - 44) / (audio.sampleRate * 2);
  assert.ok(seconds > 1.5 && seconds < 120, `plausible length: ${seconds.toFixed(1)} s (the marker path is read out letter by letter)`);
  assert.equal(existsSync(marker), false, 'the text is spoken, never run');
  await assert.rejects(systemVoice({ text: 'Hola', voiceId: 'VozQueNoExiste' }), /«VozQueNoExiste» no está instalada.*Paulina/, 'a missing voice is a clear error, not a silent fallback');
  console.log(`voice-system.verify: ok (Paulina, ${seconds.toFixed(1)} s de WAV a ${audio.sampleRate} Hz; el texto con $(…) no se ejecutó)`);
} else {
  await assert.rejects(systemVoice({ text: 'Hola' }), /solo está disponible en macOS/);
  console.log('voice-system.verify: ok (fuera de macOS: error claro, sin síntesis)');
}
