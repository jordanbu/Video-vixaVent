import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const panel = readFileSync(new URL('./MediaPoolPanel.tsx', import.meta.url), 'utf8');
const grid = readFileSync(new URL('./MediaPoolGrid.tsx', import.meta.url), 'utf8');
const card = readFileSync(new URL('./MediaPoolCard.tsx', import.meta.url), 'utf8');

assert.match(panel, /setFavoritesOnly\(true\)/, 'the Favorites entry must open the favorites view');
assert.match(panel, /favoritesOnly \? ` \/ \$\{t\('Favorites'\)\}`/, 'the Favorites view must show a breadcrumb to go back');
assert.match(grid, /kind: 'favorites'/, 'the virtual asset grid must include the Favorites entry type');
assert.match(grid, /vx-folder-card vx-favorites-folder/, 'Favorites must reuse the folder card visuals');
assert.match(card, /className="vx-asset-favorite"/, 'every asset card must offer a Favorite button');
assert.match(card, /aria-pressed=\{!!asset\.favorite\}/, 'the Favorite button must expose its current state');
assert.match(card, /onSetFavorite\(asset\.id, !asset\.favorite\)/, 'the Favorite button must toggle the asset favorite field');
assert.doesNotMatch(card, /vx-asset-check/, 'the Favorite star should replace the redundant selection checkbox');

console.log('media-favorites-folder.verify: folder and card favorite controls are wired');
