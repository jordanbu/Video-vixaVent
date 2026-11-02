import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import { AddSolidCanvasCard } from './AddSolidCanvasCard';

const markup = renderToStaticMarkup(
  <AddSolidCanvasCard label="Add solid background/canvas" onAdd={() => undefined} />,
);

assert.match(
  markup,
  /class="vx-add-solid-canvas-card"/,
  'My Media网格第一格应提供Add solid background/canvas快捷卡片',
);
assert.match(markup, />Add solid background\/canvas</, '快捷卡片应Show明确ActionName');
assert.match(markup, /aria-label="Add solid background\/canvas"/, '整张卡片应是可访问的添加Action');

console.log('add-solid-canvas-card.verify: first-grid action card OK');
