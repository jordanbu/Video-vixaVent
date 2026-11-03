// Runnable: `npx tsx src/media/media-folder-menu.verify.ts`
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const card = readFileSync(new URL('./MediaPoolCard.tsx', import.meta.url), 'utf8');
const overlays = readFileSync(new URL('./MediaPoolOverlays.tsx', import.meta.url), 'utf8');
const panel = readFileSync(new URL('./MediaPoolPanel.tsx', import.meta.url), 'utf8');
const menus = readFileSync(new URL('./MediaPoolMenus.tsx', import.meta.url), 'utf8');
const grid = readFileSync(new URL('./MediaPoolGrid.tsx', import.meta.url), 'utf8');

assert.match(card, /onContextMenu/, 'folder cards must respond to right-click');
assert.match(card, /onOpenMenu/, 'folder cards must expose a menu entry');
assert.match(card, /vx-folder-more/, 'folder cards should have a ⋯ button');
assert.match(overlays, /export function FolderMenuPortal/, 'there must be a folder menu portal');
assert.match(overlays, /Only empty folders can be deleted/, 'Delete must be disabled with a hint for a non-empty folder');
assert.match(menus, /FolderMenuPortal/, 'domain-local media menus must mount the folder portal');
assert.match(panel, /MediaPoolMenus/, 'the media pool panel must mount the extracted folder menu');
assert.match(panel, /onOpenFolderMenu/, 'the grid must receive the folder menu callbacks');
assert.match(grid, /onOpenFolderMenu/, 'the grid must pass the folder menu to the cards');
assert.match(panel, /currentFolderId === state\.id/, 'deleting a folder other than the current one must not navigate');

console.log('media-folder-menu.verify: ok (right-click/⋯/portal/empty folder delete/navigation)');
