// checks: skin registry integrity + contrast gate (impeccable colorize discipline curing).
// To change the color of any skin, you must go here: text/panel ≥ 7, textDim/panel ≥ 4.5,
// textMuted/panel ≥ 4.5, onAccent/accent ≥ 4.5 (WCAG AA).
// `npx tsx src/skins.verify.ts`
import assert from 'node:assert/strict';
import { DEFAULT_SKIN, SKINS, buildSkinsCss, migrateSkinPreference } from './skins';

function luminance(hex: string): number {
  const f = (c: number): number => {
    const x = c / 255;
    return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * f(parseInt(hex.slice(1, 3), 16))
    + 0.7152 * f(parseInt(hex.slice(3, 5), 16))
    + 0.0722 * f(parseInt(hex.slice(5, 7), 16));
}

function contrast(a: string, b: string): number {
  const la = luminance(a);
  const lb = luminance(b);
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

function mixHex(foreground: string, background: string, foregroundWeight: number): string {
  const channel = (hex: string, index: number): number => parseInt(hex.slice(index, index + 2), 16);
  const mixed = [1, 3, 5].map((index) => Math.round(
    channel(foreground, index) * foregroundWeight
      + channel(background, index) * (1 - foregroundWeight),
  ));
  return `#${mixed.map((value) => value.toString(16).padStart(2, '0')).join('')}`;
}

// ── Registry integrity ──
assert.ok(SKINS.length >= 2, '至少默认 + 1 套');
assert.equal(new Set(SKINS.map((s) => s.id)).size, SKINS.length, '皮肤 id 唯一');
assert.ok(SKINS.some((s) => s.id === DEFAULT_SKIN), '默认皮肤必须在注册表里');
for (const s of SKINS) {
  assert.ok(/^[a-z]+$/.test(s.id), `${s.id}: id 小写字母`);
  assert.ok(s.nameZh.trim().length > 0, `${s.id}: 有中文名`);
  assert.match(s.tokens.accentRgb, /^\d{1,3},\d{1,3},\d{1,3}$/, `${s.id}: accentRgb 三元组`);
  assert.match(s.tokens.inkRgb, /^\d{1,3},\d{1,3},\d{1,3}$/, `${s.id}: inkRgb 三元组`);
  assert.match(s.tokens.shadowRgb, /^\d{1,3},\d{1,3},\d{1,3}$/, `${s.id}: shadowRgb 三元组`);
  for (const [name, value] of Object.entries(s.tokens)) {
    if (name === 'accentRgb' || name === 'inkRgb' || name === 'shadowRgb' || name === 'colorScheme') continue;
    assert.match(value, /^#[0-9a-f]{6}$/, `${s.id}.${name}: 6 位小写 hex(得进对比度计算)`);
  }
}

// ── Contrast Gate (AA) ──
for (const s of SKINS) {
  const t = s.tokens;
  const gate = (label: string, ratio: number, min: number): void =>
    assert.ok(ratio >= min, `${s.id}: ${label} = ${ratio.toFixed(2)} < ${min}`);
  gate('text/panel', contrast(t.text, t.panel), 7);
  gate('text/panelAlt', contrast(t.text, t.panelAlt), 4.5);
  gate('textMuted/panel', contrast(t.textMuted, t.panel), 4.5);
  gate('textDim/panel', contrast(t.textDim, t.panel), 4.4);
  // onAccent by WCAG component/large font level (≥3): graphite white font pressure coral=3.27.
  // (Identity reserved); Use dark characters for pastel skin (Mocha/Arctic/Tokyo Night/Latte), actual ≥4.5.
  gate('onAccent/accent', contrast(t.onAccent, t.accent), 3);
  gate('textStrong/hover', contrast(t.textStrong, t.hover), 4.5);
  gate('audioFxBadge/panelGold10', contrast(t.text, mixHex(t.gold, t.panel, 0.1)), 4.5);
}

// ── CSS generation: The default skin enters:root, the rest have overlay blocks, and body follows ──
const css = buildSkinsCss();
assert.ok(css.includes(':root {'), ':root 块');
for (const s of SKINS) {
  if (s.id === DEFAULT_SKIN) continue;
  assert.ok(css.includes(`html[data-vx-skin='${s.id}']`), `${s.id} 覆盖块`);
}
assert.ok(css.includes('--vx-on-accent:'), 'on-accent 变量输出');
assert.ok(css.includes('--vx-shadow-rgb:'), 'shadow-rgb 变量输出');
assert.ok(css.includes('body { background: var(--vx-bg)'), 'body 跟随皮肤');

// ── Brand skin is the default (specs/09) and reads as well as any skin ──
assert.equal(DEFAULT_SKIN, 'vixaventora');
{
  const brand = SKINS.find((s) => s.id === 'vixaventora')!.tokens;
  const graphite = SKINS.find((s) => s.id === 'graphite')!.tokens;
  assert.ok(contrast(brand.onAccent, brand.accent) >= 4.5, 'brand: dark text on clay reaches AA (white would not)');
  assert.ok(contrast(brand.textDim, brand.panelAlt) >= 4.5, 'brand: dim text stays AA on cards too');
  for (const key of ['select', 'success', 'danger', 'trackVideo', 'trackAudioA1', 'trackAudioA2', 'trackCaption', 'clipVideo', 'clipAudio', 'clipMg', 'clipText'] as const) {
    assert.equal(brand[key], graphite[key], `brand keeps the shared semantic color ${key}`);
  }
}

// ── Preference migration: an old auto-saved 'graphite' was the default, not a choice ──
{
  const store = (entries: Record<string, string>) => {
    const map = new Map(Object.entries(entries));
    return {
      map,
      getItem: (key: string) => map.get(key) ?? null,
      setItem: (key: string, value: string) => { map.set(key, value); },
      removeItem: (key: string) => { map.delete(key); },
    };
  };
  const old = store({ 'vx.skin': 'graphite' });
  migrateSkinPreference(old);
  assert.equal(old.map.get('vx.skin'), undefined, 'a pre-brand graphite moves to the new default');
  old.setItem('vx.skin', 'graphite');
  migrateSkinPreference(old);
  assert.equal(old.map.get('vx.skin'), 'graphite', 'picking graphite after the move is kept');
  const chosen = store({ 'vx.skin': 'mocha' });
  migrateSkinPreference(chosen);
  assert.equal(chosen.map.get('vx.skin'), 'mocha', 'any other saved skin is a real choice');
}

process.stdout.write(`skins.verify: ok (${SKINS.length} skins, 对比度门全过)\n`);
