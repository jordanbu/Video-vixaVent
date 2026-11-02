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
    'Right键已选素材必须保留整个多选集',
  );
  assert.equal(duplicateAssetName('项目素材.mp4', 'copy'), '项目素材 copy.mp4');
  assert.equal(duplicateAssetName('NoneExtension名', 'copy'), 'NoneExtension名 copy');
  assert.deepEqual(
    assetMenuSelectionIds('asset-c', new Set(['asset-a', 'asset-b']), ['asset-a', 'asset-b', 'asset-c']),
    ['asset-c'],
    'Right键未选素材必须只Action当前素材',
  );
  assert.equal(
    assetMenuFavoriteValue([{ favorite: true }, { favorite: false }]),
    true,
    '批量Favorite只要其Center一个未Favorite，就应统一Favorite',
  );
  assert.equal(
    assetMenuFavoriteValue([{ favorite: true }, { favorite: true }]),
    false,
    '批量Unfavorite只在All已Favorite时发生',
  );
  assert.deepEqual(
    batchAssetRename([
      { id: 'asset-a', name: '原片.mp4' },
      { id: 'asset-b', name: '封面.png' },
    ], '项目素材'),
    [
      { id: 'asset-a', name: '项目素材.mp4' },
      { id: 'asset-b', name: '项目素材 2.png' },
    ],
    'Batch rename必须保留各素材Extension名，并给后续素材添加稳定序号',
  );

  const markup = renderToStaticMarkup(createElement(AssetMenuDestinations, {
    assetName: '7月7日.mp4',
    onAddTimeline: () => undefined,
    onAddChat: () => undefined,
  }));

  assert.match(markup, /Add to:/);
  assert.match(markup, />Timeline</);
  assert.match(markup, />AI chat</);
  assert.ok(markup.indexOf('>AI chat<') < markup.indexOf('>Timeline<'), 'AI chat应位于Left侧，Timeline应位于Right侧');
  assert.match(markup, /aria-label="添加 7月7日.mp4 到Timeline"/);
  assert.match(markup, /aria-label="添加 7月7日.mp4 到 AI chat"/);

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
  assert.doesNotMatch(overlaySource, /className="vx-asset-menu-backdrop"/, '素材菜单不应使用Full screen遮罩阻断直接Right键另一素材');
  assert.match(overlaySource, /document\.addEventListener\('pointerdown', closeOutside, true\)/, '素材菜单应通过外部点击Close');
} finally {
  await vite.close();
}

console.log('asset menu destinations verified');
