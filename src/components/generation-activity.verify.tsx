import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { ES } from '../i18n/dict/es';

const component = await readFile(new URL('./GenerationActivity.tsx', import.meta.url), 'utf8');
const topBarButton = await readFile(new URL('./TopBarIconButton.tsx', import.meta.url), 'utf8');

assert.match(
  component,
  /<TopBarIconButton[\s\S]*?icon="sparkles"[\s\S]*?label=\{t\('Generation Tasks'\)\}/,
  'the Generation Tasks button should reuse the top bar icon button',
);
assert.doesNotMatch(
  component,
  /title=\{t\('Generation Tasks'\)\}/,
  'the Generation Tasks button must not use the unstyleable native title',
);
assert.match(topBarButton, /className="vx-tip vx-tip-r"/, 'the shared button should use the instant tooltip');
assert.match(topBarButton, /data-tip=\{label\}/, 'the shared button should use the localized label for the tooltip');
assert.match(topBarButton, /onMouseEnter=/, 'the shared button should give consistent hover feedback');
assert.match(topBarButton, /onMouseLeave=/, 'the shared button should restore its styles after hover ends');
assert.equal(component.match(/retryClassLabel\(job\.retryClass, t\)/g)?.length, 1, 'each task should compute its retry label only once');

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
  // Keys are the English text (specs/11): English needs no entry, Spanish must have one.
  assert.notEqual(ES[key], undefined, `the Spanish dictionary should include "${key}"`);
}

assert.match(component, /t\('\{n\} min ago'/, 'relative minutes should be formatted through i18n');
assert.match(component, /t\('\{n\} hr ago'/, 'relative hours should be formatted through i18n');
assert.match(component, /t\('\{n\} d ago'/, 'relative days should be formatted through i18n');

console.log('generation activity hover and localization verified');
