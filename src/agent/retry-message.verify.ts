import assert from 'node:assert/strict';
import { createAgentRetry, ensureAgentRetryMetadata } from './agent-session';
import type { AgentReference } from './context';

const reference: AgentReference = { id: 'asset-1', name: 'Material', kind: 'video' };
const options = { askOnly: true, references: [reference] };
const retry = createAgentRetry('  Generate captions  ', options);
assert.deepEqual(retry, {
  text: 'Generate captions',
  askOnly: true,
  references: [reference],
}, 'retry payload preserves the original prompt, mode, and references');
assert.notEqual(retry?.references, options.references, 'retry payload owns its reference array');
assert.equal(createAgentRetry('   '), undefined, 'empty prompts cannot be retried');

const existing = createAgentRetry('Ya trae metadatos', { askOnly: true });
const hydrated = ensureAgentRetryMetadata([
  { role: 'user', text: 'Mensaje anterior del usuario' },
  { role: 'assistant', text: 'Respuesta anterior' },
  { role: 'user', text: 'Ya trae metadatos', retry: existing },
]);
assert.deepEqual(hydrated[0], {
  role: 'user',
  text: 'Mensaje anterior del usuario',
  retry: { text: 'Mensaje anterior del usuario' },
}, 'legacy user messages receive retry metadata during hydration');
assert.deepEqual(hydrated[1], { role: 'assistant', text: 'Respuesta anterior' }, 'assistant messages are unchanged');
assert.equal(hydrated[2].retry, existing, 'existing retry metadata is preserved');

console.log('retry-message.verify: ok');
