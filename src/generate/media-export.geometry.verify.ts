// Runnable: `npx tsx src/generate/media-export.geometry.check.ts`
import assert from 'node:assert';
import { applyExportGeometry } from './media-export';
import type { TimelineState } from '../editor/types';

const base: TimelineState = {
  fps: 30, width: 1920, height: 1080, items: [], selectedId: null,
};

const r720 = applyExportGeometry(base, { resolution: '720p' });
assert.strictEqual(r720.height, 720);
assert.strictEqual(r720.width, 1280);

const r480 = applyExportGeometry(base, { resolution: '480p' });
assert.strictEqual(r480.height, 480);
assert.ok(Math.abs(r480.width / r480.height - 16 / 9) < 0.02);

const fps60 = applyExportGeometry(base, { fps: 60 });
assert.strictEqual(fps60.fps, 60);
assert.strictEqual(fps60.width, 1920);

// Portrait 9:16 scales by the short side, like the export dialog: 720p is 720×1280,
// not 406×720 (that came out smaller than a 480×864 phone source).
const both = applyExportGeometry({ ...base, width: 1080, height: 1920 }, { resolution: '720p', fps: 24 });
assert.strictEqual(both.width, 720);
assert.strictEqual(both.height, 1280);
assert.strictEqual(both.fps, 24);

const portrait1080 = applyExportGeometry({ ...base, width: 1080, height: 1920 }, { resolution: '1080p' });
assert.strictEqual(portrait1080.width, 1080);
assert.strictEqual(portrait1080.height, 1920);

console.log('media-export.geometry.check: ok');
