import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import { AddSolidCanvasCard } from './AddSolidCanvasCard';

const markup = renderToStaticMarkup(
  <AddSolidCanvasCard label="Add solid background/canvas" onAdd={() => undefined} />,
);

assert.match(
  markup,
  /class="vx-add-solid-canvas-card"/,
  'the first cell of the My Media grid should offer the Add solid background/canvas shortcut card',
);
assert.match(markup, />Add solid background\/canvas</, 'the shortcut card should show a clear action name');
assert.match(markup, /aria-label="Add solid background\/canvas"/, 'the whole card should be an accessible add action');

console.log('add-solid-canvas-card.verify: first-grid action card OK');
