// Phase C-2 verify: FTS5 full-text search with jieba segmentation.
// Real SQLite + FTS5: chat/caption/transcript indexing, Chinese 2-char words,
// deletion sync, post-migration rebuild, bm25 ranking.
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { isolateVerifyHome } from '../../shared/verify-home.ts';

// The data is Chinese on purpose: this verify covers jieba segmentation of CJK text.
// Written as \u escapes (specs/11); each constant carries its English gloss.
const CAPTIONS = '\u5b57\u5e55'; // "captions" (a 2-char word)
const BGM = '\u80cc\u666f\u97f3\u4e50'; // "background music"
const BGM_VOLUME = '\u80cc\u666f\u97f3\u4e50\u97f3\u91cf'; // "background music volume"
const CAPTION_STYLE = '\u5b57\u5e55\u6837\u5f0f'; // "caption style"
const TRANSITION = '\u8f6c\u573a'; // "transition"
const DUSK = '\u9ec4\u660f'; // "dusk"
const REBUILD_INDEX = '\u91cd\u5efa\u7d22\u5f15'; // "rebuild index"
// "lower the background music volume a bit"
const LOWER_BGM = '\u628a\u80cc\u666f\u97f3\u4e50\u7684\u97f3\u91cf\u964d\u4f4e\u4e00\u70b9';
// "background music volume a bit lower"
const BGM_LOWER = '\u80cc\u666f\u97f3\u4e50\u97f3\u91cf\u518d\u4f4e\u4e00\u70b9';

async function main(): Promise<void> {
  const root = mkdtempSync(join(tmpdir(), 'vixa-fts-verify-'));
  const restoreHome = isolateVerifyHome(root);
  const previousSwitch = process.env.VIXAVENTORA_SQLITE_STORE;
  delete process.env.VIXAVENTORA_SQLITE_STORE;

  try {
    // Runtime profile is cached at module load; install the isolated HOME first.
    const { initializeSqliteProjectStore, resetSqliteStoreForTests, sqliteWriteEntry } = await import('./sqlite-store.ts');
    const {
      indexStoreKey,
      removeStoreKey,
      rebuildSearchIndex,
      resetSearchForTests,
      searchContent,
    } = await import('./fulltext-search.ts');
    const { segmentForIndex } = await import('./search-tokenizer.ts');

    assert.deepEqual(searchContent(CAPTIONS), [], 'no partial database access before startup');
    await initializeSqliteProjectStore();
    // ── tokenizer: Chinese 2-char words and mixed text ──
    assert.equal(segmentForIndex(CAPTIONS), CAPTIONS, 'a 2-char word must stay whole');
    assert.ok(segmentForIndex('\u628a\u80cc\u666f\u97f3\u4e50\u7684\u97f3\u91cf\u964d\u4f4e').includes(BGM), 'domain words must segment');
    assert.ok(segmentForIndex('\u5bfc\u51fa4K\u89c6\u9891' /* "export 4K video" */).includes('4K'), 'latin runs must stay intact');

    // ── chat indexing: per-message rows ──
    indexStoreKey('chat:project-a', {
      messages: [
        { role: 'user', text: LOWER_BGM },
        // "OK, the caption style is gold too" / thinking: "adjust style"
        { role: 'assistant', text: '\u597d\u7684\uff0c\u5b57\u5e55\u6837\u5f0f\u4e5f\u6539\u6210\u91d1\u8272', thinking: '\u8c03\u6574\u6837\u5f0f' },
        { role: 'tool', text: '', tool: { name: 'set_item_volume' } },
      ],
    });
    const chatHits = searchContent(BGM_VOLUME);
    assert.ok(chatHits.some((hit) => hit.kind === 'chat' && hit.ref.startsWith('chat:project-a:')),
      'chat text must be searchable by segmented words');
    const assistantHits = searchContent(CAPTION_STYLE);
    assert.ok(assistantHits.some((hit) => hit.ref.endsWith(':1')), 'assistant message must match');

    // ── project indexing: captions (cue text) + transcript words ──
    indexStoreKey('project:project-a', {
      timelines: [{
        tracks: {
          C1: {
            captions: {
              enabled: true,
              cues: [{ startFrame: 0, text: '\u9ec4\u660f\u7684\u6d77\u8fb9' /* "beach at dusk" */ }],
            },
          },
        },
      }],
      assets: [{
        id: 'asset-1',
        transcript: { words: [{ text: TRANSITION }, { text: CAPTIONS }] },
      }],
    });
    const captionHits = searchContent(DUSK);
    assert.ok(captionHits.some((hit) => hit.kind === 'caption' && hit.projectId === 'project-a'),
      'caption cue text must be searchable');
    const transcriptHits = searchContent(TRANSITION);
    assert.ok(transcriptHits.some((hit) => hit.kind === 'transcript'),
      'transcript words must be searchable');

    // ── project scoping ──
    const scoped = searchContent(CAPTIONS, { projectId: 'project-b' });
    assert.equal(scoped.length, 0, 'another project must not see the hits');

    // ── bm25 ranking: exact multi-token match ranks above partial ──
    indexStoreKey('chat:project-b', {
      messages: [
        { role: 'user', text: BGM_LOWER },
        { role: 'user', text: '\u5b8c\u5168\u65e0\u5173\u7684\u8bdd\u9898\u8ba8\u8bba' /* "a completely unrelated topic" */ },
      ],
    });
    const ranked = searchContent('\u80cc\u666f\u97f3\u4e50 \u97f3\u91cf' /* "background music" "volume" */);
    assert.ok(ranked.length > 0);
    assert.ok(ranked[0]!.score >= ranked[ranked.length - 1]!.score, 'scores must descend');

    // ── hash-gated refresh: same content does not duplicate rows ──
    indexStoreKey('chat:project-b', {
      messages: [{ role: 'user', text: BGM_LOWER }],
    });
    const afterRefresh = searchContent(BGM_VOLUME, { projectId: 'project-b' });
    assert.equal(afterRefresh.length, 1, 'unchanged content must not re-index');

    // ── deletion sync ──
    removeStoreKey('chat:project-b');
    assert.equal(searchContent(BGM_VOLUME, { projectId: 'project-b' }).length, 0,
      'deleted key must drop its rows');

    // ── rebuild (post-migration backfill) ──
    // Seed a kv row first: rebuild scans the kv table (created by store writes).
    await sqliteWriteEntry('chat:rebuild-src', {
      messages: [{ role: 'user', text: '\u91cd\u5efa\u7d22\u5f15\u6d4b\u8bd5\u6587\u672c' /* "rebuild index test text" */ }],
    });
    const rebuilt = rebuildSearchIndex();
    assert.ok(rebuilt.indexed >= 1, 'rebuild must scan chat/project keys');
    assert.ok(searchContent(REBUILD_INDEX).some((hit) => hit.ref.startsWith('chat:rebuild-src:')),
      'rebuild must restore hits');

    // Persisted search is available after restart without any backend switch.
    process.env.VIXAVENTORA_SQLITE_STORE = '0';
    resetSqliteStoreForTests();
    assert.deepEqual(searchContent(REBUILD_INDEX), [], 'cached search connections respect readiness');
    resetSearchForTests();
    await initializeSqliteProjectStore();
    assert.ok(searchContent(REBUILD_INDEX).some((hit) => hit.ref.startsWith('chat:rebuild-src:')),
      'search survives restart and ignores the obsolete opt-out');
    resetSearchForTests();
    resetSqliteStoreForTests();

    console.log('✓ fulltext-search verify: tokenizer/index/search/ranking/scoping/delete-sync/rebuild all passed');
  } finally {
    if (previousSwitch === undefined) delete process.env.VIXAVENTORA_SQLITE_STORE;
    else process.env.VIXAVENTORA_SQLITE_STORE = previousSwitch;
    restoreHome();
    rmSync(root, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
