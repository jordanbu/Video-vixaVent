// No Chinese or Korean text in the repository (specs/11-sin-chino-ni-coreano.md).
// Every tracked or new text file is scanned; data that needs these characters writes them
// as \u escapes. node scripts/no-cjk.verify.mjs
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { extname } from 'node:path';

const ROOT = new URL('..', import.meta.url);
// CJK ideographs, CJK punctuation, full-width forms and Hangul.
const FORBIDDEN = /[\u3400-\u9fff\uf900-\ufaff\u3000-\u303f\uff00-\uffef\uac00-\ud7af\u1100-\u11ff\u3130-\u318f]/;
const BINARY = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif', '.ico', '.icns', '.woff', '.woff2', '.ttf', '.otf',
  '.mp3', '.mp4', '.wav', '.m4a', '.webm', '.wasm', '.tflite', '.onnx', '.bin', '.zip', '.gz', '.pdf']);

const files = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard'], { cwd: ROOT, encoding: 'utf8' })
  .split('\n').filter((file) => file && !BINARY.has(extname(file).toLowerCase()));
const hits = [];
for (const file of files) {
  let text;
  try { text = readFileSync(new URL(file, ROOT), 'utf8'); } catch { continue; }
  if (!FORBIDDEN.test(text)) continue;
  text.split('\n').forEach((line, index) => {
    if (FORBIDDEN.test(line)) hits.push(`${file}:${index + 1}`);
  });
}
if (hits.length) {
  console.error(`no-cjk.verify: ${hits.length} line(s) with Chinese or Korean text (write data as \\u escapes):`);
  console.error(hits.slice(0, 60).join('\n'));
  process.exit(1);
}
console.log(`no-cjk.verify: ${files.length} text files, no Chinese or Korean characters`);
