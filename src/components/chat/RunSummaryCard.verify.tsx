// The end-of-run card renders what changed and the review in Spanish, with a "Fix" per issue (specs/10).
// npx tsx --tsconfig tsconfig.app.json src/components/chat/RunSummaryCard.verify.tsx
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

Object.defineProperty(globalThis, 'localStorage', {
  configurable: true,
  value: { getItem: () => 'es', setItem: () => undefined },
});

const { ensureLocaleDict } = await import('../../i18n/locale');
const { RunSummaryCard } = await import('./RunSummaryCard');
const { issueFixPrompt, issueText } = await import('./runSummaryText');
const { ChatMessage } = await import('./ChatMessage');
type Card = Parameters<typeof RunSummaryCard>[0]['summary'];
await ensureLocaleDict('es');

const summary: Card = {
  timelineId: 'main',
  exports: ['Vixaventora-comercial.mp4'],
  changes: {
    clipsAdded: [
      { id: 'a', kind: 'motion-graphic', name: 'Escena 1 — Intro' },
      { id: 'b', kind: 'motion-graphic', name: 'Servicio IA' },
      { id: 'c', kind: 'motion-graphic', name: 'Servicio Energía' },
      { id: 'd', kind: 'motion-graphic', name: 'Cierre' },
    ],
    clipsRemoved: [],
    clipsChanged: [],
    clipsRecoded: [{ id: 'b', kind: 'motion-graphic', name: 'Servicio IA' }],
    transitionsAdded: 6,
    transitionsRemoved: 0,
    tracksAdded: 1,
    assetsAdded: [{ id: 'n', kind: 'audio', name: 'Narración' }],
    volumeChanges: [{ from: 100, to: 35, count: 4 }],
    durationFrom: 600,
    durationTo: 2250,
    fps: 30,
  },
  issues: [
    { code: 'black_gap', level: 'alert', itemIds: [], names: [], fromFrame: 990, toFrame: 1050 },
    { code: 'audio_past_picture', level: 'warning', itemIds: ['m'], names: ['Música'], seconds: 3 },
    { code: 'music_without_fade', level: 'suggestion', itemIds: ['m'], names: ['Música'], edge: 'both' },
  ],
};

const html = renderToStaticMarkup(createElement(RunSummaryCard, { summary, onSelectClips: () => undefined, onFixIssue: () => undefined }));
const text = html.replace(/<[^>]+>/g, '|');
for (const expected of [
  'Lo que hice', 'Revisión',
  'Clips agregados: 4', 'Gráficos con diseño nuevo: 1', 'Transiciones agregadas: 6', 'Pistas nuevas: 1',
  'Recursos nuevos: Narración', 'Volumen 100 % → 35 % (4)', 'Duración 0:20 → 1:15', 'Exportado: Vixaventora-comercial.mp4',
  'Alerta', 'Pantalla en negro de 00:33.0 a 00:35.0',
  'Aviso', 'El audio sigue 3 s después de que termina la imagen',
  'Sugerencia', '«Música» entra y sale de golpe',
]) assert.ok(text.includes(expected), `card shows "${expected}"`);
assert.equal((html.match(/>Arreglar</g) ?? []).length, 3, 'one Fix per issue');
assert.ok(html.includes('>+1<'), 'four added clips show three chips and +1');
assert.equal((html.match(/title="Seleccionar en la línea de tiempo"/g) ?? []).length, 4 + 1, 'chips for added (3 + rest) and redesigned (1) clips');
assert.ok(!html.includes('Clips quitados'), 'empty groups are not listed');

// While a run is in flight, Fix is disabled.
const running = renderToStaticMarkup(createElement(RunSummaryCard, { summary, running: true, onFixIssue: () => undefined }));
assert.equal((running.match(/disabled=""/g) ?? []).length, 3, 'every Fix is disabled while running');
// Without a selection handler there are no chips; without a fix handler, no buttons.
const readOnly = renderToStaticMarkup(createElement(RunSummaryCard, { summary }));
assert.ok(!readOnly.includes('<button'), 'a read-only card has no buttons');

// No issues: says so.
const clean = renderToStaticMarkup(createElement(RunSummaryCard, { summary: { ...summary, issues: [] } }));
assert.ok(clean.includes('Sin avisos de calidad'));
// Export-only run: no change lines but the export.
const exportOnly = renderToStaticMarkup(createElement(RunSummaryCard, { summary: { changes: null, issues: [], exports: ['a.mp4'] } }));
assert.ok(exportOnly.includes('Exportado: a.mp4') && !exportOnly.includes('Clips agregados'));

// Fix requests are full sentences in the UI language.
const t = (key: string, params?: Record<string, string | number>) => `${key}${params ? JSON.stringify(params) : ''}`;
assert.match(issueFixPrompt(t as never, summary.issues[0]!, 30), /00:33\.0.*00:35\.0/, 'the gap prompt carries the times');
assert.match(issueText(t as never, summary.issues[2]!, 30), /Música/);

// The chat renders a summary message as this card and nothing for a malformed one.
const message = renderToStaticMarkup(createElement(ChatMessage, { msg: { role: 'summary', text: '', summary } }));
assert.ok(message.includes('Lo que hice'));
assert.equal(renderToStaticMarkup(createElement(ChatMessage, { msg: { role: 'summary', text: '' } })), '');

console.log('RunSummaryCard.verify: ok (10 líneas de cambios, 3 avisos con "Arreglar", deshabilitados mientras corre)');
