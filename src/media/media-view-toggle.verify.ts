import assert from 'node:assert/strict';
import { ES } from '../i18n/dict/es';
import { mediaViewToggleLabel, toggleMediaView } from './mediaView';

assert.equal(mediaViewToggleLabel('list'), 'Switch to grid view');
assert.equal(toggleMediaView('list'), 'grid');
assert.equal(mediaViewToggleLabel('grid'), 'Switch to list view');
assert.equal(toggleMediaView('grid'), 'list');
for (const view of ['grid', 'list'] as const) {
  const label = mediaViewToggleLabel(view);
  assert.ok(ES[label], `The Spanish dictionary must translate the view-toggle label: ${label}`);
}

console.log('media view toggle verification passed');
