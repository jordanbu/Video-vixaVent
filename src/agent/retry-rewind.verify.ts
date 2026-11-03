import assert from 'node:assert/strict';
import type { DisplayMessage } from './agent-session';
import type { LLMMessage } from './runtime';
import { planRetryRewind } from './retry-rewind';

const user = (text: string): DisplayMessage => ({ role: 'user', text, retry: { text } });
const assistant = (text: string): DisplayMessage => ({ role: 'assistant', text });
const tool = (name: string): DisplayMessage => ({ role: 'tool', text: '', tool: { name, args: {}, result: { ok: true } } });
const modelUser = (content: string): LLMMessage => ({ role: 'user', content });
const modelAssistant = (content: string): LLMMessage => ({ role: 'assistant', content });

// The failed last turn, with tool and error rows that exist only in the display history.
{
  const messages = [
    user('Agrega una intro'), assistant('Listo'),
    user('Descarga un fondo'), assistant(''), tool('download_media'), { role: 'error', text: 'Chunk timeout of 120000ms exceeded' } as DisplayMessage,
  ];
  const llm = [modelUser('Agrega una intro'), modelAssistant('Listo'), modelUser('Descarga un fondo'), modelAssistant('')];
  assert.deepEqual(planRetryRewind(messages, llm, 2), { messages: 2, llm: 2 });
  // Rewinding an earlier turn drops everything after it in both histories.
  assert.deepEqual(planRetryRewind(messages, llm, 0), { messages: 0, llm: 0 });
}

// Attached context is appended to the model copy of the turn; the display copy is the bare text.
{
  const messages = [user('Descarga un fondo')];
  const llm = [modelUser('Descarga un fondo\n\n{"type":"chat_context_entry","entries":[]}')];
  assert.deepEqual(planRetryRewind(messages, llm, 0), { messages: 0, llm: 0 });
  // A different suffix on the same line is a different turn.
  assert.equal(planRetryRewind(messages, [modelUser('Descarga un video de fondo completo')], 0), null);
}

// Multi-part model content (text plus an image) still identifies the turn by its text.
{
  const messages = [user('Mira esta imagen'), assistant('La veo')];
  const llm: LLMMessage[] = [
    { role: 'user', content: [{ type: 'text', text: 'Mira esta imagen' }, { type: 'image', image: 'data:image/png;base64,AA==' }] },
    modelAssistant('La veo'),
  ];
  assert.deepEqual(planRetryRewind(messages, llm, 0), { messages: 0, llm: 0 });
}

// Display-only rows never count as user turns: the continue card and widgets do not shift the ordinal.
{
  const messages = [user('Primer paso'), { role: 'continue', text: '' } as DisplayMessage, user('Continue')];
  const llm = [modelUser('Primer paso'), modelAssistant('...'), modelUser('Continue')];
  assert.deepEqual(planRetryRewind(messages, llm, 2), { messages: 2, llm: 2 });
  assert.deepEqual(planRetryRewind(messages, llm, 0), { messages: 0, llm: 0 });
}

// When the histories cannot be matched the plan is null and the caller falls back to re-sending.
{
  const messages = [user('Primer paso'), assistant('...'), user('Segundo paso')];
  // A model-only user message (a proposal rejection) sits after the target turn.
  const withRejection = [modelUser('Primer paso'), modelAssistant('...'), modelUser('Segundo paso'), modelUser('User clicked Deny')];
  assert.equal(planRetryRewind(messages, withRejection, 2), null);
  // A compacted history no longer contains the turn.
  assert.equal(planRetryRewind(messages, [modelUser('[summary]'), modelAssistant('...')], 0), null);
  // Not a user turn, out of range, or an empty prompt.
  assert.equal(planRetryRewind(messages, [modelUser('Primer paso'), modelAssistant('...'), modelUser('Segundo paso')], 1), null);
  assert.equal(planRetryRewind(messages, [], 5), null);
  assert.equal(planRetryRewind([user('   ')], [modelUser('   ')], 0), null);
}

console.log('retry-rewind.verify: ok');
