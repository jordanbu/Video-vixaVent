// Runnable: `npx tsx src/media/media-folder-menu.verify.ts`
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const card = readFileSync(new URL('./MediaPoolCard.tsx', import.meta.url), 'utf8');
const overlays = readFileSync(new URL('./MediaPoolOverlays.tsx', import.meta.url), 'utf8');
const panel = readFileSync(new URL('./MediaPoolPanel.tsx', import.meta.url), 'utf8');
const menus = readFileSync(new URL('./MediaPoolMenus.tsx', import.meta.url), 'utf8');
const grid = readFileSync(new URL('./MediaPoolGrid.tsx', import.meta.url), 'utf8');

assert.match(card, /onContextMenu/, '文件夹卡片必须响应Right键');
assert.match(card, /onOpenMenu/, '文件夹卡片必须暴露菜单入口');
assert.match(card, /vx-folder-more/, '文件夹卡片应有 ⋯ 按钮');
assert.match(overlays, /export function FolderMenuPortal/, '必须有Folder menu portal');
assert.match(overlays, /只能Delete empty folder/, '非空文件夹Delete应Disable并提示');
assert.match(menus, /FolderMenuPortal/, 'domain-local media menus must mount the folder portal');
assert.match(panel, /MediaPoolMenus/, '素材池面板必须挂载提取后的Folder menu');
assert.match(panel, /onOpenFolderMenu/, '网格必须接收Folder menu回调');
assert.match(grid, /onOpenFolderMenu/, '网格必须把Folder menu传给卡片');
assert.match(panel, /currentFolderId === state\.id/, 'Delete非当前文件夹时不得跳转Navigation');

console.log('media-folder-menu.verify: ok (Right键/⋯/portal/空文件夹Delete/Navigation)');
