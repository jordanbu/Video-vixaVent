// Content-aware segmentation engine assertions: (1) Chinese punctuation breaks first, (2) modal particles
// never start a line, (3) the particle "de" is not split off, (4) orphan-word penalty, (5) English
// sentence ends break first, (6) without opts paginate matches the old version byte for byte (regression).
// Expected values are worked out by hand from the segmenter.ts rules; run: npx tsx src/captions/segmenter.verify.ts
// The Chinese sample words are written as \u escapes (specs/11); the English gloss is in the comments.
import assert from 'node:assert/strict';
import { scoreLatinBreaks, segmentWords } from './segmenter';
import type { CaptionPage } from './types';
import { paginate } from './types';
import type { TranscriptWord } from '../transcript/types';

const S = (texts: string[]) => texts.map((text) => ({ text }));
const W = (texts: string[], gapMs = 10, durMs = 90): TranscriptWord[] =>
  texts.map((text, i) => ({ text, start: i * (durMs + gapMs), end: i * (durMs + gapMs) + durMs }));
const pageTexts = (pages: CaptionPage[]) => pages.map((p) => p.words.map((w) => w.text).join(''));

// Particles: le (aspect), ma (question), ne (modal), a (modal), de (structural).
const LE = '\u4e86', MA = '\u5417', NE = '\u5462', A = '\u554a', DE = '\u7684';
const MODAL_LINE_STARTS = [LE, MA, NE, A];
// "today | weather | is nice. | we | together | go | park"
const PARK = ['\u4eca\u5929', '\u5929\u6c14', '\u771f\u597d\u3002', '\u6211\u4eec', '\u4e00\u8d77', '\u53bb', '\u516c\u56ed'];

// ── (1) Chinese full stop / comma break first (full stop → 100 / comma → 80 beat the budget-limit position) ──
{
  const words = S(PARK);
  // The character budget runs out at "together"; fall back to the full-stop break → break after "is nice."
  assert.deepEqual(segmentWords(words, { wordsPerPage: 50, maxCharsPerLine: 20 }), [0, 3]);

  // "I said, | everyone | all | should | come | my home | eat"
  const comma = S(['\u6211\u8bf4\uff0c', '\u5927\u5bb6', '\u90fd', '\u8981', '\u6765', '\u6211\u5bb6', '\u5403\u996d']);
  assert.deepEqual(segmentWords(comma, { wordsPerPage: 50, maxCharsPerLine: 20 }), [0, 1]);
}

// ── (2) Modal particles ne/ma/a never start a line ─────────────────────────────────
{
  // ne: the modal-particle break (60) ends the page after "ne", not at the budget limit.
  // "you | at | think | what | ne | tomorrow | we | set off"
  const ne = S(['\u4f60', '\u5728', '\u60f3', '\u4ec0\u4e48', NE, '\u660e\u5929', '\u6211\u4eec', '\u51fa\u53d1']);
  const starts = segmentWords(ne, { wordsPerPage: 50, maxCharsPerLine: 20 });
  assert.deepEqual(starts, [0, 5]); // page 2 starts at "tomorrow"; "ne" closes page 1
  // ma: the orphan demotion (ma/le are particles) rules out every neighbouring break.
  // "you | eat | le | ma | we | go"
  const ma = S(['\u4f60', '\u5403', LE, MA, '\u6211\u4eec', '\u8d70']);
  const maStarts = segmentWords(ma, { wordsPerPage: 50, maxCharsPerLine: 8 });
  assert.ok(!maStarts.includes(2) && !maStarts.includes(3), 'the particles le/ma must not start a page');
  for (const st of maStarts) assert.ok(!MODAL_LINE_STARTS.includes(Array.from(ma[st].text)[0]), 'a page starts with a modal particle');
  for (const st of starts) assert.ok(!MODAL_LINE_STARTS.includes(Array.from(ne[st].text)[0]), 'a page starts with a modal particle');
  // Line-start particle pull-back: page 2's first word "understand" starts with the no-line-start
  // character "le" → the previous page's last word "fine" is pulled into this page.
  // "OK | fine | understand | a bit | ba"
  const pull = S(['OK', 'fine', '\u4e86\u89e3', '\u4e00\u4e0b', '\u5427']);
  assert.deepEqual(segmentWords(pull, { wordsPerPage: 50, maxCharsPerLine: 15 }), [0, 1]);
}

// ── (3) The structural particle "de" stays with the previous word (both adjacent breaks demoted by 30) ──
{
  // "I | buy | de | apples | very | tasty | very | fresh"
  const words = S(['\u6211', '\u4e70', DE, '\u82f9\u679c', '\u5f88', '\u597d\u5403', '\u975e\u5e38', '\u65b0\u9c9c']);
  const starts = segmentWords(words, { wordsPerPage: 50, maxCharsPerLine: 10 });
  assert.deepEqual(starts, [0, 4, 7]);
  assert.ok(!starts.includes(2), '"de" must not start a page (buy|de stays together)');
  assert.ok(!starts.includes(3), '"de" must not dangle at a page end (de|apples stays together)');
}

// ── (4) Orphan-word penalty: no trailing line of 1-2 function words (quantifier-of/trailing demotion) ──
{
  const words = S(['We', 'learned', 'quite', 'a', 'lot', 'of', 'things', 'today']);
  const starts = segmentWords(words, { wordsPerPage: 50, maxCharsPerLine: 30 });
  // The budget runs out at "things"; the breaks around a/lot/of all carry orphan risk → fall back to after "quite"
  assert.deepEqual(starts, [0, 3]);
  const pages = [words.slice(0, 3), words.slice(3)].map((ws) => ws.map((w) => w.text));
  assert.equal(pages[0].join(' '), 'We learned quite');
  assert.equal(pages[1].join(' '), 'a lot of things today');
  for (let i = 0; i < starts.length; i++) {
    const end = (starts[i + 1] ?? words.length) - 1;
    assert.notEqual(words[end].text, 'of', 'a page must not end on a dangling "of"');
  }
}

// ── (5) Pure English: a sentence-ending "." breaks first (100 + sentence end +30 = 130) ──
{
  const words = S(['I', 'like', 'it.', 'Because', 'it', 'works', 'well', 'today']);
  assert.deepEqual(segmentWords(words, { wordsPerPage: 50, maxCharsPerLine: 30 }), [0, 3]);
  // Hitting the word budget also takes the scored fallback (task spec, see deviation 2 in the segmenter.ts header)
  assert.deepEqual(segmentWords(S(['I', 'like', 'it.', 'Because', 'it', 'works']), { wordsPerPage: 4 }), [0, 3]);
  // The scorer itself: a sentence-ending word scores 100+30
  const top = scoreLatinBreaks('We had fun. So it goes')[0];
  assert.equal(top.score, 130);
  assert.equal(top.position, 'We had fun.'.length);
}

// ── Misc semantics: punctuation words never open a page / CJK ignores the word budget / edges ──
{
  const starts = segmentWords(S(['Hello', 'world', '!', 'again', 'now', 'yes', 'more']), { wordsPerPage: 2 });
  assert.deepEqual(starts, [0, 3, 5]); // "!" follows "world" on page 1 instead of opening a page
  // CJK-dominant text with a character budget → wordsPerPage is ignored ("one two | three four | ...")
  assert.deepEqual(segmentWords(S(['\u4e00\u4e8c', '\u4e09\u56db', '\u4e94\u516d', '\u4e03\u516b']), { wordsPerPage: 2, maxCharsPerLine: 100 }), [0]);
  assert.deepEqual(segmentWords(S(['aa', 'bb', 'cc', 'dd']), { wordsPerPage: 2, maxCharsPerLine: 100 }), [0, 2]);
  assert.deepEqual(segmentWords([], { wordsPerPage: 6 }), []);
  assert.deepEqual(segmentWords(S(['hi']), { wordsPerPage: 1, maxCharsPerLine: 1 }), [0]);
}

// ── paginate wiring: maxCharsPerLine goes through the segmenter (budget × visible lines); forceBreak still wins ──
{
  const cn = W(PARK);
  // 20 chars/line × CAPTION_MAX_VISUAL_LINES(2) = 40 chars — the 12-char sentence fits one page.
  assert.deepEqual(pageTexts(paginate(cn, 'phrase', 50, undefined, 20)), [PARK.join('')]);
  const forced = paginate(cn, 'phrase', 50, new Set([5]), 20);
  assert.deepEqual(pageTexts(forced), [PARK.slice(0, 5).join(''), PARK.slice(5).join('')]);
  assert.equal(forced[1].words[0].text, '\u53bb'); // a forced break always opens a new page ("go")
  // word pacing ignores maxCharsPerLine
  assert.equal(paginate(cn, 'word', 6, undefined, 20).length, cn.length);
}

// ── (6) Regression: without maxCharsPerLine paginate behaves like the old version ────
{
  // a full page of 6 words is flushed
  const plain = W(['aa', 'bb', 'cc', 'dd', 'ee', 'ff', 'gg', 'hh']);
  assert.deepEqual(paginate(plain, 'phrase').map((p) => p.words.length), [6, 2]);
  // below a full page, content-aware segmentation no longer hard-splits at sentence ends (one page)
  assert.deepEqual(paginate(W(['Hi', 'there.', 'Big', 'day']), 'phrase').map((p) => p.words.length), [4]);
  // a long pause is a high-priority break, but only used when the budget forces a split (4 words → one page)
  const gap: TranscriptWord[] = [
    { text: 'a', start: 0, end: 100 }, { text: 'b', start: 110, end: 200 },
    { text: 'c', start: 1000, end: 1100 }, { text: 'd', start: 1110, end: 1200 },
  ];
  assert.deepEqual(paginate(gap, 'phrase').map((p) => p.words.length), [4]);
  // forceBreak
  assert.deepEqual(paginate(W(['aa', 'bb', 'cc', 'dd']), 'phrase', 6, new Set([2])).map((p) => p.words.length), [2, 2]);
  // page timestamp fields
  const pages = paginate(plain, 'phrase');
  assert.equal(pages[0].start, plain[0].start);
  assert.equal(pages[0].end, plain[5].end);
  assert.equal(pages[1].start, plain[6].start);
}

console.log('segmenter.check: ok');
