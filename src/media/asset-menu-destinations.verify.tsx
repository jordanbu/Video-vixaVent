import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';

const testLocaleId = '\0asset-menu-destinations-test-locale';
const vite = await createServer({
  appType: 'custom',
  plugins: [{
    name: 'asset-menu-destinations-test-locale',
    enforce: 'pre',
    resolveId(id) {
      return id.endsWith('/i18n/locale') || id.endsWith('/i18n/locale.ts') ? testLocaleId : null;
    },
    load(id) {
      if (id !== testLocaleId) return null;
      return `
        export const t = (text, params) => params
          ? text.replace(/\\{(\\w+)\\}/g, (match, key) => key in params ? String(params[key]) : match)
          : text;
        export const useT = () => t;
      `;
    },
  }],
  server: { middlewareMode: true },
});

try {
  const { AssetMenuDestinations } = await vite.ssrLoadModule(
    '/src/media/AssetMenuDestinations.tsx',
  ) as typeof import('./AssetMenuDestinations');
  const { BlankMediaMenuActions } = await vite.ssrLoadModule(
    '/src/media/MediaPoolOverlays.tsx',
  ) as typeof import('./MediaPoolOverlays');
  const { runAssetDestinationAction } = await vite.ssrLoadModule(
    '/src/media/assetDestination.ts',
  ) as typeof import('./assetDestination');
  const { assetMenuSelectionIds, assetMenuFavoriteValue, batchAssetRename, duplicateAssetName } = await vite.ssrLoadModule(
    '/src/media/assetMenuSelection.ts',
  ) as typeof import('./assetMenuSelection');

  const calls: string[] = [];
  const actions = {
    timeline: () => calls.push('timeline'),
    chat: () => calls.push('chat'),
  };

  runAssetDestinationAction('timeline', actions);
  runAssetDestinationAction('chat', actions);
  assert.deepEqual(calls, ['timeline', 'chat']);
  assert.deepEqual(
    assetMenuSelectionIds('asset-b', new Set(['asset-a', 'asset-b']), ['asset-a', 'asset-b', 'asset-c']),
    ['asset-a', 'asset-b'],
    'right-clicking a selected asset must keep the whole multi-selection',
  );
  assert.equal(duplicateAssetName('Project clip.mp4', 'copy'), 'Project clip copy.mp4');
  assert.equal(duplicateAssetName('No extension', 'copy'), 'No extension copy');
  assert.deepEqual(
    assetMenuSelectionIds('asset-c', new Set(['asset-a', 'asset-b']), ['asset-a', 'asset-b', 'asset-c']),
    ['asset-c'],
    'right-clicking an unselected asset must act only on that asset',
  );
  assert.equal(
    assetMenuFavoriteValue([{ favorite: true }, { favorite: false }]),
    true,
    'a batch favorite should favorite all when any one is not a favorite',
  );
  assert.equal(
    assetMenuFavoriteValue([{ favorite: true }, { favorite: true }]),
    false,
    'a batch unfavorite only happens when all are favorites',
  );
  assert.deepEqual(
    batchAssetRename([
      { id: 'asset-a', name: 'Original.mp4' },
      { id: 'asset-b', name: 'Cover.png' },
    ], 'Project clip'),
    [
      { id: 'asset-a', name: 'Project clip.mp4' },
      { id: 'asset-b', name: 'Project clip 2.png' },
    ],
    'batch rename must keep each asset extension and add a stable number to the following assets',
  );

  const markup = renderToStaticMarkup(createElement(AssetMenuDestinations, {
    assetName: '7 de julio.mp4',
    onAddTimeline: () => undefined,
    onAddChat: () => undefined,
  }));

  assert.match(markup, /Add to:/);
  assert.match(markup, />Timeline</);
  assert.match(markup, />AI chat</);
  assert.ok(markup.indexOf('>AI chat<') < markup.indexOf('>Timeline<'), 'AI chat should be on the left and Timeline on the right');
  assert.match(markup, /aria-label="Add 7 de julio\.mp4 to timeline"/);
  assert.match(markup, /aria-label="Add 7 de julio\.mp4 to AI chat"/);

  const documentMarkup = renderToStaticMarkup(createElement(AssetMenuDestinations, {
    assetName: 'script.md',
    onAddChat: () => undefined,
  }));
  assert.match(documentMarkup, />AI chat</);
  assert.doesNotMatch(documentMarkup, />Timeline</);

  const blankMenuMarkup = renderToStaticMarkup(createElement(BlankMediaMenuActions, {
    clipboardCount: 2,
    visibleCount: 3,
    allVisibleSelected: false,
    view: 'grid',
    sort: 'newest',
    type: 'all',
    onPaste: () => undefined,
    onSelectAll: () => undefined,
    onUpload: () => undefined,
    onSemanticSearch: () => undefined,
    onMobileUpload: () => undefined,
    onCreateFolder: () => undefined,
    onViewToggle: () => undefined,
    onSort: () => undefined,
    onType: () => undefined,
  }));
  assert.match(blankMenuMarkup, /Paste copies \(2\)/);
  assert.match(blankMenuMarkup, />Select all</);
  assert.match(blankMenuMarkup, />Upload media</);
  assert.match(blankMenuMarkup, />Local semantic search</);
  assert.match(blankMenuMarkup, />Upload from phone</);
  assert.match(blankMenuMarkup, />New folder</);
  assert.match(blankMenuMarkup, /aria-label="Sort media"/);
  assert.match(blankMenuMarkup, /aria-label="Filter media"/);

  const overlaySource = await readFile(new URL('./MediaPoolOverlays.tsx', import.meta.url), 'utf8');
  assert.doesNotMatch(overlaySource, /className="vx-asset-menu-backdrop"/, 'the asset menu must not use a full-screen backdrop that blocks right-clicking another asset');
  assert.match(overlaySource, /document\.addEventListener\('pointerdown', closeOutside, true\)/, 'the asset menu should close on an outside click');
} finally {
  await vite.close();
}

console.log('asset menu destinations verified');
