import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const panel = readFileSync(new URL('./MediaPoolPanel.tsx', import.meta.url), 'utf8');
const grid = readFileSync(new URL('./MediaPoolGrid.tsx', import.meta.url), 'utf8');
const card = readFileSync(new URL('./MediaPoolCard.tsx', import.meta.url), 'utf8');

assert.match(panel, /setFavoritesOnly\(true\)/, 'Favorites入口必须进入FavoriteView');
assert.match(panel, /favoritesOnly \? ` \/ \$\{t\('Favorites'\)\}`/, 'FavoritesView必须Show可返回的面包屑');
assert.match(grid, /kind: 'favorites'/, '虚拟素材网格必须包含Favorites入口Type');
assert.match(grid, /vx-folder-card vx-favorites-folder/, 'Favorites必须复用文件夹卡片V觉');
assert.match(card, /className="vx-asset-favorite"/, '每张素材卡必须提供Favorite按钮');
assert.match(card, /aria-pressed=\{!!asset\.favorite\}/, 'Favorite按钮必须公开当前状态');
assert.match(card, /onSetFavorite\(asset\.id, !asset\.favorite\)/, 'Favorite按钮必须切换素材 favorite C段');
assert.doesNotMatch(card, /vx-asset-check/, 'Favorite星标应替代冗余选择勾选框');

console.log('media-favorites-folder.verify: folder and card favorite controls are wired');
