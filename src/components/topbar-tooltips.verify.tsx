import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const exportHistory = await readFile(new URL('./ExportHistory.tsx', import.meta.url), 'utf8');

assert.match(
  exportHistory,
  /<TopBarIconButton[\s\S]*?icon="download"[\s\S]*?label=\{t\('Export History'\)\}/,
  'Export History按钮应复用顶部栏图标按钮',
);
assert.doesNotMatch(
  exportHistory,
  /<button title=\{t\('Export History'\)\}/,
  'Export History按钮不应使用Styles不可控的原生 title',
);

console.log('top bar immediate tooltips verified');
