// Phase C-2 verify: FTS5 full-text search with jieba segmentation.
// Real SQLite + FTS5: chat/caption/transcript indexing, Chinese 2-char words,
// deletion sync, post-migration rebuild, bm25 ranking.
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { isolateVerifyHome } from '../../shared/verify-home.ts';

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

    assert.deepEqual(searchContent('Captions'), [], 'no partial database access before startup');
    await initializeSqliteProjectStore();
    // ── tokenizer: Chinese 2-char words and mixed text ──
    assert.equal(segmentForIndex('Captions'), 'Captions', 'a 2-char word must stay whole');
    assert.ok(segmentForIndex('把BackgroundMusic的Volume降低').includes('BackgroundMusic'), 'domain words must segment');
    assert.ok(segmentForIndex('Export4KVideo').includes('4K'), 'latin runs must stay intact');

    // ── chat indexing: per-message rows ──
    indexStoreKey('chat:project-a', {
      messages: [
        { role: 'user', text: '把BackgroundMusic的Volume降低一点' },
        { role: 'assistant', text: '好的，Caption styles也改成金C', thinking: '调整Styles' },
        { role: 'tool', text: '', tool: { name: 'set_item_volume' } },
      ],
    });
    const chatHits = searchContent('BackgroundMusicVolume');
    assert.ok(chatHits.some((hit) => hit.kind === 'chat' && hit.ref.startsWith('chat:project-a:')),
      'chat text must be searchable by segmented words');
    const assistantHits = searchContent('Caption styles');
    assert.ok(assistantHits.some((hit) => hit.ref.endsWith(':1')), 'assistant message must match');

    // ── project indexing: captions (cue text) + transcript words ──
    indexStoreKey('project:project-a', {
      timelines: [{
        tracks: {
          C1: {
            captions: {
              enabled: true,
              cues: [{ startFrame: 0, text: '黄昏的海边' }],
            },
          },
        },
      }],
      assets: [{
        id: 'asset-1',
        transcript: { words: [{ text: 'Transitions' }, { text: 'Captions' }] },
      }],
    });
    const captionHits = searchContent('黄昏');
    assert.ok(captionHits.some((hit) => hit.kind === 'caption' && hit.projectId === 'project-a'),
      'caption cue text must be searchable');
    const transcriptHits = searchContent('Transitions');
    assert.ok(transcriptHits.some((hit) => hit.kind === 'transcript'),
      'transcript words must be searchable');

    // ── project scoping ──
    const scoped = searchContent('Captions', { projectId: 'project-b' });
    assert.equal(scoped.length, 0, 'another project must not see the hits');

    // ── bm25 ranking: exact multi-token match ranks above partial ──
    indexStoreKey('chat:project-b', {
      messages: [
        { role: 'user', text: 'BackgroundMusicVolume再低一点' },
        { role: 'user', text: '完全None关的话题讨论' },
      ],
    });
    const ranked = searchContent('BackgroundMusic Volume');
    assert.ok(ranked.length > 0);
    assert.ok(ranked[0]!.score >= ranked[ranked.length - 1]!.score, 'scores must descend');

    // ── hash-gated refresh: same content does not duplicate rows ──
    indexStoreKey('chat:project-b', {
      messages: [{ role: 'user', text: 'BackgroundMusicVolume再低一点' }],
    });
    const afterRefresh = searchContent('BackgroundMusicVolume', { projectId: 'project-b' });
    assert.equal(afterRefresh.length, 1, 'unchanged content must not re-index');

    // ── deletion sync ──
    removeStoreKey('chat:project-b');
    assert.equal(searchContent('BackgroundMusicVolume', { projectId: 'project-b' }).length, 0,
      'deleted key must drop its rows');

    // ── rebuild (post-migration backfill) ──
    // Seed a kv row first: rebuild scans the kv table (created by store writes).
    await sqliteWriteEntry('chat:rebuild-src', {
      messages: [{ role: 'user', text: 'Rebuild索引测试文本' }],
    });
    const rebuilt = rebuildSearchIndex();
    assert.ok(rebuilt.indexed >= 1, 'rebuild must scan chat/project keys');
    assert.ok(searchContent('Rebuild索引').some((hit) => hit.ref.startsWith('chat:rebuild-src:')),
      'rebuild must restore hits');

    // Persisted search is available after restart without any backend switch.
    process.env.VIXAVENTORA_SQLITE_STORE = '0';
    resetSqliteStoreForTests();
    assert.deepEqual(searchContent('Rebuild索引'), [], 'cached search connections respect readiness');
    resetSearchForTests();
    await initializeSqliteProjectStore();
    assert.ok(searchContent('Rebuild索引').some((hit) => hit.ref.startsWith('chat:rebuild-src:')),
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
