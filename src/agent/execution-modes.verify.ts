// Parallel-vs-exclusive classification and the generation timeout budget.
// A tool classified parallel runs concurrently with the exclusive chain while
// sharing one draft, so a MUTATING tool must never be parallel — its recorded
// actions would be drained by whichever request settles first.
// npx tsx src/agent/execution-modes.verify.ts
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PARALLEL_TOOL_NAMES, toolExecutionMode } from './tools/execution-modes';
import { generationTimeoutMs } from './client';

// ── detect_beats: classified by its arguments ──────────────────────────────────────────────
{
  assert.equal(toolExecutionMode('detect_beats'), 'parallel',
    'analysis-only detect_beats stays parallel');
  assert.equal(toolExecutionMode('detect_beats', {}), 'parallel', 'no markers arg = read only');
  assert.equal(toolExecutionMode('detect_beats', { markers: 'beats' }), 'exclusive',
    'writing beat markers must serialize against the exclusive chain');
  assert.equal(toolExecutionMode('detect_beats', { markers: 'downbeats' }), 'exclusive',
    'downbeat markers are a mutation too');
  assert.equal(toolExecutionMode('edit_item', {}), 'exclusive', 'ordinary edits stay exclusive');
  assert.equal(toolExecutionMode('read_timeline', {}), 'parallel', 'pure reads stay parallel');
}

// ── regression gate: tools that write state never join the unconditional parallel set ────────────────────────
{
  assert.equal(PARALLEL_TOOL_NAMES.has('detect_beats'), false,
    'detect_beats mutates when markers are requested — it must be classified per-invocation, '
    + 'not listed as unconditionally parallel');
  // Tools whose name implies a write never join the parallel set (a cheap naming-convention filter that stops most mistakes).
  const writeLike = [...PARALLEL_TOOL_NAMES].filter((name) => (
    /^(edit_|set_|add_|delete_|remove_|apply_|create_|submit_|clear_|move_|split_|update_|import_)/.test(name)
  ));
  assert.deepEqual(writeLike, [],
    `write-shaped tool names must not be parallel: ${writeLike.join(', ')}`);
  // detect_beats really does write through ctx.commands — that is exactly why it left the set.
  const beatSource = readFileSync('src/agent/tools/beat-tools.ts', 'utf8');
  assert.ok(/ctx\.commands/.test(beatSource),
    'beat-tools still mutates via ctx.commands; if that ever changes, revisit the '
    + 'CONDITIONALLY_PARALLEL entry instead of silently leaving it');
}

// ── generation timeout scales with the output budget ───────────────────────────────────────────────
{
  assert.equal(generationTimeoutMs(1000), 60_000, 'small asks keep the 60s floor');
  assert.equal(generationTimeoutMs(0), 60_000, 'zero budget falls back to the floor');
  assert.equal(generationTimeoutMs(Number.NaN), 60_000, 'non-finite budget falls back to the floor');
  assert.ok(generationTimeoutMs(64_000) > 60_000,
    'a 64k-token MG generation gets more than the old fixed 60s');
  // 64k tokens at the assumed streaming rate exceeds the ceiling → clamped.
  assert.equal(generationTimeoutMs(64_000), 600_000, '64k tokens is clamped by the 10 minute ceiling');
  assert.equal(generationTimeoutMs(10_000_000), 600_000, 'the ceiling is enforced');
  assert.equal(generationTimeoutMs(8_000), 200_000, 'mid-size budgets scale linearly');
}

console.log('execution-modes.verify: ok');
