// Runnable: `npx tsx src/agent/font-tools.check.ts`
import assert from 'node:assert';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { makeDraft } from '../../editor/store';
import { docFromTimeline } from '../../persist/projectStore';
import type { AgentContext } from '../context';
import {
  execFontTool,
  FONT_TOOL_NAMES,
  FONT_TOOL_SCHEMAS,
  fontFallbackGate,
  collectReferencedFonts,
  findUnsupportedFonts,
} from './font-tools';
import { searchFontCatalog, isLoadableFontFamily } from '../../fonts/googleFonts';
import { LOCAL_CJK_FONTS, ensureLocalFont, findLocalFont } from '../../fonts/localFonts';
import { timelineToFcpxml } from '../../export/fcpxml';
import type { TimelineState } from '../../editor/types';

assert.ok(FONT_TOOL_NAMES.has('search_fonts'));
assert.strictEqual(FONT_TOOL_SCHEMAS[0]!.name, 'search_fonts');

const draft = makeDraft(docFromTimeline({
  fps: 30, width: 1920, height: 1080, items: [], selectedId: null, assets: [],
}));
const ctx: AgentContext = {
  commands: draft.commands,
  getState: draft.getState,
  getDoc: draft.getDoc,
  getCreativeMode: () => null,
  templates: [],
  audio: [],
};

// search_fonts — Google loadable
const inter = await execFontTool('search_fonts', { query: 'inter' }, ctx) as {
  ok: boolean; results: Array<{ family: string; loadable: boolean }>;
};
assert.strictEqual(inter.ok, true);
assert.ok(inter.results.some((r) => r.family === 'Inter' && r.loadable));

// Chinese alias → bundled local font (loadable, source:'bundled')
const deyi = searchFontCatalog('Smiley Sans');
assert.ok(deyi.some((r) => r.family === 'Smiley Sans' && r.loadable && r.source === 'bundled'));

// every bundled family + its Chinese aliases hit the search catalog
for (const font of LOCAL_CJK_FONTS) {
  for (const query of [font.family, ...font.aliasZh]) {
    assert.ok(
      searchFontCatalog(query).some((r) => r.family === font.family && r.source === 'bundled'),
      `search miss: ${query} → ${font.family}`,
    );
  }
}

// search_fonts tool surfaces bundled fonts with source marker
// The bundled CJK fonts are catalogued under their Chinese names; written as escapes (specs/11).
const douyin = await execFontTool('search_fonts', { query: '\u6296\u97f3\u7f8e\u597d\u4f53' }, ctx) as {
  ok: boolean; results: Array<{ family: string; loadable: boolean; source: string }>;
};
assert.ok(douyin.results.some((r) => r.family === 'Douyin Meihao Ti' && r.loadable && r.source === 'bundled'));

// every mapped URL points at a real woff2 under assets/
const assetsDir = join(fileURLToPath(new URL('.', import.meta.url)), '..', '..', '..', 'assets');
for (const font of LOCAL_CJK_FONTS) {
  for (const url of Object.values(font.files ?? {})) {
    assert.ok(url.startsWith('/fonts/'), `bad url shape: ${url}`);
    assert.ok(existsSync(join(assetsDir, url)), `missing woff2: assets${url}`);
  }
}

// alias resolution + ensureLocalFont promise cache (node path: no FontFace, still cached)
// Chinese font names, written as escapes (specs/11).
assert.strictEqual(findLocalFont('\u8f7b\u677e\u624b\u5199\u4f53\u4e00')?.family, 'Qingsong Shouxie Ti Yi');
assert.strictEqual(findLocalFont('\u65b0\u9752\u5e74'), undefined);
assert.strictEqual(findLocalFont('\u601d\u6e90\u9ed1\u4f53')?.family, 'Noto Sans SC');
assert.strictEqual(findLocalFont('\u9e3f\u8499'), undefined);
assert.strictEqual(findLocalFont('Comic Sans MS'), undefined);
assert.strictEqual(ensureLocalFont('Smiley Sans'), ensureLocalFont('Smiley Sans'));
await ensureLocalFont('Smiley Sans');
await ensureLocalFont('not-a-local-font'); // non-local resolves, never throws

// loadable check — bundled CJK now export-safe
assert.strictEqual(isLoadableFontFamily('Inter'), true);
assert.strictEqual(isLoadableFontFamily('Smiley Sans'), true);
assert.strictEqual(isLoadableFontFamily('\u6296\u97f3\u7f8e\u597d\u4f53'), true);
assert.strictEqual(isLoadableFontFamily('Comic Sans MS'), false);
assert.strictEqual(isLoadableFontFamily('system-ui, sans-serif'), true);

// Gate: clean timeline passes
const cleanState = draft.getState();
assert.strictEqual(fontFallbackGate(cleanState, false), null);

// Gate: MG with unsupported font blocks without confirm
const blockedState: TimelineState = {
  ...cleanState,
  items: [{
    id: 'mg1',
    track: 'V1',
    startFrame: 0,
    durationInFrames: 90,
    name: 'Title',
    kind: 'motion-graphic',
    props: { fontFamily: 'Comic Sans MS', title: 'Hola' },
  }],
};
const refs = collectReferencedFonts(blockedState);
assert.ok(refs.includes('Comic Sans MS'));
const bad = findUnsupportedFonts(blockedState);
assert.deepStrictEqual(bad.unsupported, ['Comic Sans MS']);

const gate = fontFallbackGate(blockedState, false);
assert.ok(gate);
assert.strictEqual(gate!.error, 'unsupported_fonts');
assert.ok((gate!.unsupportedFonts as string[]).includes('Comic Sans MS'));

// confirm bypasses
assert.strictEqual(fontFallbackGate(blockedState, true), null);

// loadable MG font does not gate
const okState: TimelineState = {
  ...cleanState,
  items: [{
    id: 'mg2',
    track: 'V1',
    startFrame: 0,
    durationInFrames: 90,
    name: 'Title',
    kind: 'motion-graphic',
    props: { fontFamily: 'Playfair Display' },
    code: `const s = { fontFamily: 'Inter' };`,
  }],
};
assert.strictEqual(fontFallbackGate(okState, false), null);
assert.ok(collectReferencedFonts(okState).includes('Playfair Display'));
assert.ok(collectReferencedFonts(okState).includes('Inter'));

// nleFormat resolve vs premiere
const xmlPrem = timelineToFcpxml(cleanState, { nleFormat: 'fcp_xml' });
const xmlRes = timelineToFcpxml(cleanState, { nleFormat: 'fcp_xml_resolve' });
assert.ok(xmlPrem.includes('Vixaventora Export'));
assert.ok(!xmlPrem.includes('colorSpace='));
assert.ok(xmlRes.includes('Vixaventora Export (Resolve)'));
assert.ok(xmlRes.includes('colorSpace="1-1-1 (Rec. 709)"'));

console.log('font-tools.check: ok');
