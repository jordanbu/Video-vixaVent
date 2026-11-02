import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { EN } from '../i18n/dict/en';

const component = await readFile(new URL('./GenerationActivity.tsx', import.meta.url), 'utf8');
const topBarButton = await readFile(new URL('./TopBarIconButton.tsx', import.meta.url), 'utf8');

assert.match(
  component,
  /<TopBarIconButton[\s\S]*?icon="sparkles"[\s\S]*?label=\{t\('Generation Tasks'\)\}/,
  'Generation Tasks按钮应复用顶部栏图标按钮',
);
assert.doesNotMatch(
  component,
  /title=\{t\('Generation Tasks'\)\}/,
  'Generation Tasks按钮不应使用Styles不可控的原生 title',
);
assert.match(topBarButton, /className="vx-tip vx-tip-r"/, '共享按钮应使用即时 tooltip');
assert.match(topBarButton, /data-tip=\{label\}/, '共享按钮应将本地化标签用于 tooltip');
assert.match(topBarButton, /onMouseEnter=/, '共享按钮应提供统一的 hover 反馈');
assert.match(topBarButton, /onMouseLeave=/, '共享按钮应在离开 hover 后RestoreStyles');
assert.equal(component.match(/retryClassLabel\(job\.retryClass, t\)/g)?.length, 1, '每个任务应只计算一次Retry标签');

const generationActivityKeys = [
  'Generation Tasks',
  'Legacy parameter summary (cannot be safely rerun)',
  'Parameter snapshot unavailable',
  'Keep checking, downloading, or rerunning tasks after a refresh',
  'Resuming…',
  'Resume Tasks',
  'Loading tasks…',
  'No generation tasks',
  'Provider task',
  'Open Result',
  'Retry Recoverable Tasks',
  'Check Progress',
  'Pending',
  'Running',
  'Completed',
  'Failed',
  'Not Found',
  'Download Retry Available',
  'Generation Retry Available',
  'Recoverable After Restart',
  'Not Retryable',
  'Legacy Task Status Unknown',
] as const;

for (const key of generationActivityKeys) {
  assert.notEqual(EN[key], undefined, `Englishwords典应包含“${key}”`);
}

assert.match(component, /t\('\{n\} min ago'/, '相对分钟数应通过 i18n Format化');
assert.match(component, /t\('\{n\} hr ago'/, '相对小时数应通过 i18n Format化');
assert.match(component, /t\('\{n\} d ago'/, '相对天数应通过 i18n Format化');

console.log('generation activity hover and localization verified');
