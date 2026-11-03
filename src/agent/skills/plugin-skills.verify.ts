// Runnable check: `npx tsx src/agent/skills/plugin-skills.check.ts` (wired into verify:skills once promoted to .verify.ts).
// Verifies the bundled skills are present + verbatim + parse cleanly. Reads the
// SKILL.md files from disk (not via plugin-skills.ts, which uses Vite `?raw` and can't
// load under tsx) and exercises the pure frontmatter parser on all three source shapes.
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { parseSkillFrontmatter } from './skill-frontmatter';

const SKILLS_DIR = dirname(fileURLToPath(import.meta.url));  // the check lives next to the skill content
const EXPECTED = [
  'ai-cinematic-short-film', 'asset-import', 'batch-montage-variants', 'beat-sync-montage',
  'create-motion-graphics', 'ecommerce-product-montage', 'explainer-video',
  'export', 'image-gen', 'known-errors', 'livestream-to-clips', 'long-video-to-shorts',
  'motion-graphic-placement',
  'multi-clips-to-reels', 'music', 'music-intelligence', 'news-rough-cut',
  'vixaventora-plugin-basics', 'product-ad-video-script',
  'product-help', 'shader-gen', 'skill-creator', 'storyboard-shot-breakdown', 'talking-head-guide',
  'transcription', 'verification', 'video-gen', 'video-thumbnail-generator', 'voice',
  'widget-forms',
];

// Every expected skill dir is present, and no extras.
const slugs = readdirSync(SKILLS_DIR).filter((d) => statSync(join(SKILLS_DIR, d)).isDirectory()).sort();
assert.deepStrictEqual(slugs, [...EXPECTED].sort(), 'every built-in skill is listed, no more and no less');

// Each SKILL.md parses to name(=slug) + non-empty description + substantive verbatim body.
for (const slug of slugs) {
  const raw = readFileSync(join(SKILLS_DIR, slug, 'SKILL.md'), 'utf8');
  const { name, description, body } = parseSkillFrontmatter(raw);
  assert.strictEqual(name, slug, `${slug}: frontmatter name should equal the slug`);
  assert.ok(description.length > 20, `${slug}: description parses non-empty`);
  assert.ok(body.trim().length > 100, `${slug}: SKILL.md body has real content`);
  // Verbatim: the parsed body is a suffix of the original bytes (nothing rewritten).
  assert.ok(raw.endsWith(body), `${slug}: the body is a verbatim suffix of the file (not rewritten)`);
}

// Parser handles all three source description shapes.
const plain = parseSkillFrontmatter('---\nname: a\ndescription: Use when X.\n---\nBODY');
assert.strictEqual(plain.description, 'Use when X.', 'bare-line description');
const quoted = parseSkillFrontmatter('---\nname: b\ndescription: "Use for Y, Z."\n---\nBODY');
assert.strictEqual(quoted.description, 'Use for Y, Z.', 'a double-quoted description loses its quotes');
const block = parseSkillFrontmatter('---\nname: c\ndescription: |\n  Line one\n  line two.\nuser-invocable: true\n---\nBODY');
assert.strictEqual(block.description, 'Line one line two.', 'a `|` block description joins lines and stops at the next key');
assert.strictEqual(block.body, 'BODY', 'a block description does not swallow the body');

// A known skill loads a real support file (voice/references/voices.md exists on disk).
const voiceRef = readFileSync(join(SKILLS_DIR, 'voice', 'references', 'voices.md'), 'utf8');
assert.ok(voiceRef.length > 0, 'reference files ship with the skill');

console.log(`plugin-skills.check: ok (${slugs.length} skills / three frontmatter forms / references present)`);
