import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const css = await readFile(new URL('../index.css', import.meta.url), 'utf8');

assert.match(css, /\.vx-resource-tertiary-tabs,\.vx-sound-chips \{ position:sticky; top:-10px; z-index:3; background:var\(--vx-panel\); \}/);
assert.match(css, /\.vx-template-category-tabs \{ margin-top:-10px; padding-top:10px; \}/);
assert.match(css, /\.vx-sound-chips \{[\s\S]*?margin-top:-10px; padding-top:10px;/);

console.log('template and sound category navigation stays visible while scrolling');
