// Camera-log → Rec.709 LUT catalog, split out of effects.ts (which re-exports
// it, so no import site changes).

import lutFrag from './lut.frag.ts';
import lookTealOrangeFrag from './look-teal-orange.frag.ts';
import lookMonoFrag from './look-mono.frag.ts';
import lookWarmFrag from './look-warm.frag.ts';
import lookCoolFrag from './look-cool.frag.ts';
import lookSunsetFrag from './look-sunset.frag.ts';
import lookCyberFrag from './look-cyber.frag.ts';
import lookBleachFrag from './look-bleach.frag.ts';
import lookFujiChromeFrag from './look-fuji-chrome.frag.ts';
import lookFujiPortraFrag from './look-fuji-portra.frag.ts';
import lookFujiVelviaFrag from './look-fuji-velvia.frag.ts';
import lookRicohGrFrag from './look-ricoh-gr.frag.ts';
import lookKodakGoldFrag from './look-kodak-gold.frag.ts';
import lookDisposableFrag from './look-disposable.frag.ts';
import lookCinestillFrag from './look-cinestill.frag.ts';
import type { FxDef } from './uniforms';

// LUTs: camera-log → Rec.709 color transforms. Kept
// separate from FX so the library shows them under their own LUT tab, but they
// render through the same per-clip GL pipeline. intensity mixes original↔graded
// through propertyOverrides.intensity.
export const LUT_EFFECTS: Record<string, FxDef> = {
  'builtin:slog3-s709': {
    id: 'builtin:slog3-s709',
    name: 'Sony S-Log3 → s709',
    desc: 'Sony S-Log3 / S-Gamut3.Cine → Rec.709. Real .cube 3D LUT (Sony_Slog3_s709.cube, 33³) + shared lut.frag (sampler3D, wrapped in BT.709 encode/decode)',
    frag: lutFrag,
    cube: '/luts/Sony_Slog3_s709.cube',
    props: [{ key: 'intensity', label: 'Intensity', default: 1, min: 0, max: 1, step: 0.01 }],
  },
  'builtin:canon-log3-709': {
    id: 'builtin:canon-log3-709',
    name: 'Canon Log 3 → BT.709',
    desc: 'Canon Cinema Gamut / Canon Log 3 → Canon 709. Real .cube 3D LUT (CinemaGamut_CanonLog3-to-Canon709_33_Ver.1.0.cube, 33³) + shared lut.frag',
    frag: lutFrag,
    cube: '/luts/CinemaGamut_CanonLog3-to-Canon709_33_Ver.1.0.cube',
    props: [{ key: 'intensity', label: 'Intensity', default: 1, min: 0, max: 1, step: 0.01 }],
  },
  // creative looks (formula grades — not camera-log cubes)
  'builtin:look-teal-orange': {
    id: 'builtin:look-teal-orange',
    name: 'Teal & Orange',
    desc: 'Hollywood grade: teal shadows, orange highlights.',
    frag: lookTealOrangeFrag,
    props: [
      { key: 'intensity', label: 'Intensity', default: 0.85, min: 0, max: 1, step: 0.01 },
      { key: 'contrast', label: 'Contrast', default: 1.1, min: 0.6, max: 1.8, step: 0.02 },
    ],
  },
  'builtin:look-mono': {
    id: 'builtin:look-mono',
    name: 'B&W Film',
    desc: 'High-contrast black & white + subtle animated grain.',
    frag: lookMonoFrag,
    props: [
      { key: 'intensity', label: 'Intensity', default: 1, min: 0, max: 1, step: 0.01 },
      { key: 'contrast', label: 'Contrast', default: 1.25, min: 0.6, max: 2.2, step: 0.02 },
      { key: 'grain', label: 'Grain', default: 0.08, min: 0, max: 0.4, step: 0.01 },
    ],
  },
  'builtin:look-warm': {
    id: 'builtin:look-warm',
    name: 'Warm Vintage',
    desc: 'Warm color temperature with a light fade — vintage feel.',
    frag: lookWarmFrag,
    props: [
      { key: 'intensity', label: 'Intensity', default: 0.9, min: 0, max: 1, step: 0.01 },
      { key: 'temperature', label: 'Temperature', default: 0.7, min: 0, max: 1.5, step: 0.02 },
      { key: 'fade', label: 'Fade·2', default: 0.35, min: 0, max: 1, step: 0.01 },
    ],
  },
  'builtin:look-cool': {
    id: 'builtin:look-cool',
    name: 'Cool Blue',
    desc: 'Cool color temperature with blue pushed into the shadows.',
    frag: lookCoolFrag,
    props: [
      { key: 'intensity', label: 'Intensity', default: 0.85, min: 0, max: 1, step: 0.01 },
      { key: 'temperature', label: 'Coolness', default: 0.75, min: 0, max: 1.5, step: 0.02 },
      { key: 'shadows', label: 'Shadow Blue', default: 0.55, min: 0, max: 1, step: 0.01 },
    ],
  },
  'builtin:look-sunset': {
    id: 'builtin:look-sunset',
    name: 'Golden Sunset',
    desc: 'Golden highlights and warm shadows — dusk feel.',
    frag: lookSunsetFrag,
    props: [
      { key: 'intensity', label: 'Intensity', default: 0.9, min: 0, max: 1, step: 0.01 },
      { key: 'warmth', label: 'Warmth', default: 1, min: 0, max: 1.5, step: 0.02 },
    ],
  },
  'builtin:look-cyber': {
    id: 'builtin:look-cyber',
    name: 'Cyber Neon',
    desc: 'Neon sci-fi grade: teal-blue shadows, magenta highlights.',
    frag: lookCyberFrag,
    props: [
      { key: 'intensity', label: 'Intensity', default: 0.85, min: 0, max: 1, step: 0.01 },
      { key: 'contrast', label: 'Contrast', default: 1.2, min: 0.6, max: 2, step: 0.02 },
    ],
  },
  'builtin:look-bleach': {
    id: 'builtin:look-bleach',
    name: 'Bleach Bypass',
    desc: 'Desaturated + lifted blacks — bleach-bypass cinematic look.',
    frag: lookBleachFrag,
    props: [
      { key: 'intensity', label: 'Intensity', default: 0.9, min: 0, max: 1, step: 0.01 },
      { key: 'fade', label: 'Fade·2', default: 0.45, min: 0, max: 1, step: 0.01 },
    ],
  },
  // ── film / camera aesthetics (formula looks, not licensed cubes) ─────────
  'builtin:look-fuji-chrome': {
    id: 'builtin:look-fuji-chrome',
    name: 'Fuji Classic Chrome',
    desc: 'Low saturation, soft contrast, cool mid-grays — travel/street documentary feel (inspired by Fujifilm film simulations, not an official LUT).',
    frag: lookFujiChromeFrag,
    props: [
      { key: 'intensity', label: 'Intensity', default: 0.92, min: 0, max: 1, step: 0.01 },
      { key: 'fade', label: 'Fade·2', default: 0.4, min: 0, max: 1, step: 0.01 },
      { key: 'grain', label: 'Grain', default: 0.06, min: 0, max: 0.35, step: 0.01 },
    ],
  },
  'builtin:look-fuji-portra': {
    id: 'builtin:look-fuji-portra',
    name: 'Fuji Portrait Pro Neg',
    desc: 'Creamy skin tones, soft pink highlights, lifted shadows — portrait/lifestyle feel (inspired by Portra / Pro Neg).',
    frag: lookFujiPortraFrag,
    props: [
      { key: 'intensity', label: 'Intensity', default: 0.9, min: 0, max: 1, step: 0.01 },
      { key: 'warmth', label: 'Warmth', default: 0.85, min: 0, max: 1.5, step: 0.02 },
      { key: 'softness', label: 'Softness', default: 0.7, min: 0, max: 1, step: 0.02 },
      { key: 'grain', label: 'Grain', default: 0.05, min: 0, max: 0.3, step: 0.01 },
    ],
  },
  'builtin:look-fuji-velvia': {
    id: 'builtin:look-fuji-velvia',
    name: 'Fuji Velvia Landscape',
    desc: 'Saturated greens/blues with crisp contrast — scenic/nature landscapes (inspired by Velvia slide film).',
    frag: lookFujiVelviaFrag,
    props: [
      { key: 'intensity', label: 'Intensity', default: 0.88, min: 0, max: 1, step: 0.01 },
      { key: 'saturation', label: 'Saturation', default: 1.1, min: 0.4, max: 1.8, step: 0.02 },
      { key: 'contrast', label: 'Contrast', default: 1.15, min: 0.7, max: 1.8, step: 0.02 },
      { key: 'grain', label: 'Grain', default: 0.04, min: 0, max: 0.25, step: 0.01 },
    ],
  },
  'builtin:look-ricoh-gr': {
    id: 'builtin:look-ricoh-gr',
    name: 'Ricoh GR Street',
    desc: 'Slightly harder contrast, cool neutral grays, urban documentary — GR snapshot feel (inspired by Ricoh street aesthetics).',
    frag: lookRicohGrFrag,
    props: [
      { key: 'intensity', label: 'Intensity', default: 0.9, min: 0, max: 1, step: 0.01 },
      { key: 'contrast', label: 'Contrast', default: 1.22, min: 0.8, max: 1.8, step: 0.02 },
      { key: 'cool', label: 'Cool Tone', default: 0.75, min: 0, max: 1.5, step: 0.02 },
      { key: 'grain', label: 'Grain', default: 0.07, min: 0, max: 0.35, step: 0.01 },
    ],
  },
  'builtin:look-kodak-gold': {
    id: 'builtin:look-kodak-gold',
    name: 'Kodak Gold',
    desc: 'Nostalgic warm yellow-greens, soft contrast — Y2K snapshot / family-album feel (inspired by Kodak Gold).',
    frag: lookKodakGoldFrag,
    props: [
      { key: 'intensity', label: 'Intensity', default: 0.9, min: 0, max: 1, step: 0.01 },
      { key: 'yellow', label: 'Golden', default: 1, min: 0, max: 1.5, step: 0.02 },
      { key: 'fade', label: 'Fade·2', default: 0.4, min: 0, max: 1, step: 0.01 },
      { key: 'grain', label: 'Grain', default: 0.08, min: 0, max: 0.4, step: 0.01 },
    ],
  },
  'builtin:look-disposable': {
    id: 'builtin:look-disposable',
    name: 'Instant / Disposable',
    desc: 'Soft blur, green cast, coarse grain, vignette — that instant / disposable-camera vibe.',
    frag: lookDisposableFrag,
    props: [
      { key: 'intensity', label: 'Intensity', default: 0.92, min: 0, max: 1, step: 0.01 },
      { key: 'cast', label: 'Color Cast', default: 0.9, min: 0, max: 1.5, step: 0.02 },
      { key: 'grain', label: 'Grain', default: 0.16, min: 0, max: 0.5, step: 0.01 },
      { key: 'vignette', label: 'Vignette', default: 0.45, min: 0, max: 1, step: 0.01 },
    ],
  },
  'builtin:look-cinestill': {
    id: 'builtin:look-cinestill',
    name: 'CineStill Night',
    desc: 'Tungsten cool cyan with slight highlight halation — night streets/neon (inspired by CineStill 800T).',
    frag: lookCinestillFrag,
    props: [
      { key: 'intensity', label: 'Intensity', default: 0.88, min: 0, max: 1, step: 0.01 },
      { key: 'cyan', label: 'Cyan', default: 0.95, min: 0, max: 1.5, step: 0.02 },
      { key: 'contrast', label: 'Contrast', default: 1.18, min: 0.7, max: 1.8, step: 0.02 },
      { key: 'grain', label: 'Grain', default: 0.09, min: 0, max: 0.4, step: 0.01 },
    ],
  },
};
export const LUT_ORDER = [
  'builtin:slog3-s709',
  'builtin:canon-log3-709',
  // film / camera aesthetics first for the library tab
  'builtin:look-fuji-chrome',
  'builtin:look-fuji-portra',
  'builtin:look-fuji-velvia',
  'builtin:look-ricoh-gr',
  'builtin:look-kodak-gold',
  'builtin:look-disposable',
  'builtin:look-cinestill',
  'builtin:look-teal-orange',
  'builtin:look-mono',
  'builtin:look-warm',
  'builtin:look-cool',
  'builtin:look-sunset',
  'builtin:look-cyber',
  'builtin:look-bleach',
] as const;
export const LUT_IDS = [
  ...LUT_ORDER.filter((id) => id in LUT_EFFECTS),
  ...Object.keys(LUT_EFFECTS).filter((id) => !(LUT_ORDER as readonly string[]).includes(id)),
];
