// Per-clip WebGL effect catalog (builtin:fx-*): single-input renderPass,
// u_input + named uniforms (name, default, min, max), premultiplied-alpha out.
// `props` carry each uniform's defaults/ranges and drive both the uniform
// values and the inspector sliders. u_width/u_height/u_resolution are supplied
// by the runtime (canvas size), not user properties.
//
// Split out of effects.ts, which stays the public entry point and re-exports
// everything here — no import site changes.

import lumaKeyFrag from './luma-key.frag.ts';
import localMosaicFrag from './local-mosaic.frag.ts';
import magnifyFrag from './magnify.frag.ts';
import rectMaskFrag from './rect-mask.frag.ts';
import circleMaskFrag from './circle-mask.frag.ts';
import crtFrag from './crt.frag.ts';
import cameraShakeFrag from './camera-shake.frag.ts';
import tiltShiftPass1Frag from './tilt-shift-pass1.frag.ts';
import tiltShiftPass2Frag from './tilt-shift-pass2.frag.ts';
import asciiRainFrag from './ascii-rain.frag.ts';
import asciiRainBlurFrag from './ascii-rain-blur.frag.ts';
import asciiRainCompositeFrag from './ascii-rain-composite.frag.ts';
import chromaKeyFrag from './chroma-key.frag.ts';
import colorWheelsFrag from './color-wheels.frag.ts';
import levelsFrag from './levels.frag.ts';
import highlightsShadowsFrag from './highlights-shadows.frag.ts';
import clarityFrag from './clarity.frag.ts';
import hslQualifyFrag from './hsl-qualify.frag.ts';
import vignetteFrag from './vignette.frag.ts';
import filmGrainFrag from './film-grain.frag.ts';
import rgbSplitFrag from './rgb-split.frag.ts';
import glitchFrag from './glitch.frag.ts';
import bloomFrag from './bloom.frag.ts';
import pixelateFrag from './pixelate.frag.ts';
import posterizeFrag from './posterize.frag.ts';
import duotoneFrag from './duotone.frag.ts';
import mirrorFrag from './mirror.frag.ts';
import fisheyeFrag from './fisheye.frag.ts';
import kaleidoscopeFrag from './kaleidoscope.frag.ts';
import edgeGlowFrag from './edge-glow.frag.ts';
import softBlurFrag from './soft-blur.frag.ts';
import lightLeakFrag from './light-leak.frag.ts';
import sepiaFrag from './sepia.frag.ts';
import invertFrag from './invert.frag.ts';
import halftoneFrag from './halftone.frag.ts';
import motionBlurFrag from './motion-blur.frag.ts';
import type { FxDef } from './uniforms';
import type { FxPass } from '../runtime';

const INVERT = { key: 'invert', label: 'Invert', default: 0, min: 0, max: 1, step: 1 };

export const FX_EFFECTS: Record<string, FxDef> = {
  'builtin:fx-luma-key': {
    id: 'builtin:fx-luma-key',
    name: 'Luma Key',
    desc: 'Turns black backgrounds transparent while keeping highlights, like a Screen blend — for overlaying fire/smoke/light-leak/particle footage shot on black.',
    frag: lumaKeyFrag,
    props: [
      { key: 'intensity', label: 'Intensity', default: 1, min: 0, max: 3, step: 0.05 },
      { key: 'threshold', label: 'Threshold', default: 0.03, min: 0, max: 0.2, step: 0.005 },
      { key: 'softness', label: 'Softness', default: 0.3, min: 0.05, max: 0.8, step: 0.01 },
      { key: 'gamma', label: 'Gamma', default: 0.7, min: 0.3, max: 2, step: 0.05 },
    ],
  },
  'builtin:fx-local-mosaic': {
    id: 'builtin:fx-local-mosaic',
    name: 'Local Mosaic',
    desc: 'Pixelates a rectangular region; adjustable position/size/block size/feather.',
    frag: localMosaicFrag,
    props: [
      { key: 'center_x', label: 'Center X', default: 0.5, min: 0, max: 1, step: 0.01 },
      { key: 'center_y', label: 'Center Y', default: 0.3, min: 0, max: 1, step: 0.01 },
      { key: 'width_ratio', label: 'Width', default: 0.2, min: 0, max: 1, step: 0.01 },
      { key: 'height_ratio', label: 'Height', default: 0.2, min: 0, max: 1, step: 0.01 },
      { key: 'block_size', label: 'Block Size', default: 20, min: 1, max: 200, step: 1 },
      { key: 'feather', label: 'Feather', default: 4, min: 0, max: 100, step: 1 },
    ],
  },
  'builtin:fx-magnify': {
    id: 'builtin:fx-magnify',
    name: 'Magnifier',
    desc: 'Adds a magnifying lens at a given center; adjustable radius/magnification/border.',
    frag: magnifyFrag,
    props: [
      { key: 'center_x', label: 'Center X', default: 0.5, min: 0, max: 1, step: 0.01 },
      { key: 'center_y', label: 'Center Y', default: 0.5, min: 0, max: 1, step: 0.01 },
      { key: 'radius', label: 'Radius', default: 0.15, min: 0.01, max: 1, step: 0.01 },
      { key: 'magnification', label: 'Magnification', default: 2, min: 1, max: 8, step: 0.1 },
      { key: 'border_width', label: 'Border', default: 4, min: 0, max: 20, step: 1 },
    ],
  },
  'builtin:fx-rect-mask': {
    id: 'builtin:fx-rect-mask',
    name: 'Rectangle Mask',
    desc: 'Crops the frame to a rounded rectangle; adjustable position/size/corner radius/feather/invert.',
    frag: rectMaskFrag,
    props: [
      { key: 'center_x', label: 'Center X', default: 0.5, min: 0, max: 1, step: 0.01 },
      { key: 'center_y', label: 'Center Y', default: 0.5, min: 0, max: 1, step: 0.01 },
      { key: 'width', label: 'Width', default: 0.5, min: 0, max: 1, step: 0.01, uniform: 'u_rect_width' },
      { key: 'height', label: 'Height', default: 0.5, min: 0, max: 1, step: 0.01, uniform: 'u_rect_height' },
      { key: 'corner_radius', label: 'Corner Radius', default: 0, min: 0, max: 1000, step: 1 },
      { key: 'feather', label: 'Feather', default: 2, min: 0, max: 200, step: 1 },
      INVERT,
    ],
  },
  'builtin:fx-circle-mask': {
    id: 'builtin:fx-circle-mask',
    name: 'Circle Mask',
    desc: 'Crops the frame to a soft-edged circle; adjustable center/radius/feather/invert.',
    frag: circleMaskFrag,
    props: [
      { key: 'center_x', label: 'Center X', default: 0.5, min: 0, max: 1, step: 0.01 },
      { key: 'center_y', label: 'Center Y', default: 0.5, min: 0, max: 1, step: 0.01 },
      { key: 'radius', label: 'Radius', default: 0.3, min: 0, max: 1, step: 0.01 },
      { key: 'feather', label: 'Feather', default: 2, min: 0, max: 200, step: 1 },
      INVERT,
    ],
  },
  'builtin:fx-crt': {
    id: 'builtin:fx-crt',
    name: 'Retro CRT',
    desc: 'Simulates a CRT tube: scanlines/screen curvature/RGB shift/noise/vignette. Animated.',
    frag: crtFrag,
    props: [
      { key: 'scanlineIntensity', label: 'Scanlines', default: 0.4, min: 0, max: 1, step: 0.01 },
      { key: 'curvature', label: 'Curvature', default: 0.15, min: 0, max: 1, step: 0.01 },
      { key: 'noiseAmount', label: 'Noise', default: 0.05, min: 0, max: 1, step: 0.01 },
      { key: 'rgbShift', label: 'RGB Shift', default: 0.002, min: 0, max: 0.05, step: 0.001 },
      { key: 'brightness', label: 'Brightness', default: 1.1, min: 0, max: 3, step: 0.05 },
    ],
  },
  'builtin:fx-ascii-rain': {
    id: 'builtin:fx-ascii-rain',
    name: 'ASCII Rain',
    desc: 'Generates glowing blue ASCII rain over the bright parts of the video.',
    frag: asciiRainFrag,
    pipeline: (uniforms) => {
      const blurRadius = typeof uniforms.u_blurRadius === 'number' ? uniforms.u_blurRadius : 2;
      const passes: FxPass[] = [
        { frag: asciiRainFrag, uniforms },
        { frag: asciiRainBlurFrag, uniforms: { u_direction: [blurRadius, 0] } },
        { frag: asciiRainBlurFrag, uniforms: { u_direction: [0, blurRadius] } },
        { frag: asciiRainCompositeFrag, inputFrom: 0, samplers: { u_bloom: 2 }, uniforms },
      ];
      return passes;
    },
    props: [
      { key: 'gridSize', label: 'Glyph Size', default: 8, min: 4, max: 32, step: 1 },
      { key: 'glow', label: 'Glow', default: 1.5, min: 0, max: 4, step: 0.1 },
      { key: 'blurRadius', label: 'Bloom Radius', default: 2, min: 0, max: 8, step: 0.5 },
      { key: 'color', label: 'Glyph Color', kind: 'color', default: [0, 0.7490196078431373, 1], uniform: 'u_color' },
    ],
  },
  'builtin:fx-shake': {
    id: 'builtin:fx-shake',
    name: 'Handheld Camera',
    desc: 'fbm noise jitter + rotation/zoom/breathing to simulate handheld camera motion. Animated.',
    frag: cameraShakeFrag,
    props: [
      { key: 'strength', label: 'Intensity', default: 1.2, min: 0, max: 5, step: 0.1 },
      { key: 'speed', label: 'Speed', default: 1.8, min: 0, max: 10, step: 0.1 },
      { key: 'zoom', label: 'Zoom', default: 1.15, min: 1, max: 2, step: 0.01 },
      { key: 'rotation', label: 'Rotation', default: 0.9, min: 0, max: 5, step: 0.1 },
      { key: 'breathe', label: 'Breathe', default: 0.7, min: 0, max: 3, step: 0.1 },
    ],
  },
  'builtin:fx-tilt-shift': {
    id: 'builtin:fx-tilt-shift',
    name: 'Tilt-Shift',
    desc: 'Simulates a tilt-shift lens: a sharp focus band blurring above and below + saturation/vignette. Two-pass separable Gaussian blur.',
    frag: tiltShiftPass1Frag,
    passes: [tiltShiftPass1Frag, tiltShiftPass2Frag],
    props: [
      { key: 'focusY', label: 'Focus Position', default: 0.5, min: 0, max: 1, step: 0.01 },
      { key: 'focusWidth', label: 'Focus Width', default: 0.2, min: 0, max: 1, step: 0.01 },
      { key: 'tiltAngle', label: 'Tilt Angle', default: 0, min: -3.14159, max: 3.14159, step: 0.01 },
      { key: 'blurStrength', label: 'Blur Strength', default: 12, min: 0, max: 40, step: 0.5 },
      { key: 'blurSide', label: 'Blur Side (0 both / 1 top / 2 bottom)', default: 0, min: 0, max: 2, step: 1 },
      { key: 'saturation', label: 'Saturation', default: 1.3, min: 0, max: 3, step: 0.05 },
      { key: 'vignette', label: 'Vignette', default: 0.2, min: 0, max: 1, step: 0.01 },
    ],
  },
  'builtin:fx-chroma-key': {
    id: 'builtin:fx-chroma-key',
    name: 'Chroma Key / Green Screen',
    desc: 'Keys out the background by key color (green screen by default); adjustable similarity/feather/spill suppression.',
    frag: chromaKeyFrag,
    props: [
      { key: 'keyColor', label: 'Key Color', kind: 'color', default: [0, 1, 0], uniform: 'u_keyColor' },
      { key: 'similarity', label: 'Similarity', default: 0.18, min: 0, max: 0.6, step: 0.01 },
      { key: 'smoothness', label: 'Feather', default: 0.08, min: 0.001, max: 0.4, step: 0.005 },
      { key: 'spill', label: 'Spill Suppression', default: 0.5, min: 0, max: 1, step: 0.01 },
    ],
  },

  // ── Professional colorist toolkit ─────────────────────────────────────────
  'builtin:fx-color-wheels': {
    id: 'builtin:fx-color-wheels',
    name: '三路色轮',
    desc: '调色台三路色轮：lift 暗部偏移、gamma 中间调、gain 亮部增益，均以 0.5 灰为中性，逐通道作用。',
    frag: colorWheelsFrag,
    props: [
      { key: 'liftColor', label: '暗部 Lift', kind: 'color', default: [0.5, 0.5, 0.5], uniform: 'u_liftColor' },
      { key: 'gammaColor', label: '中间调 Gamma', kind: 'color', default: [0.5, 0.5, 0.5], uniform: 'u_gammaColor' },
      { key: 'gainColor', label: '亮部 Gain', kind: 'color', default: [0.5, 0.5, 0.5], uniform: 'u_gainColor' },
      { key: 'intensity', label: 'Intensity', default: 1, min: 0, max: 1, step: 0.01 },
    ],
  },
  'builtin:fx-levels': {
    id: 'builtin:fx-levels',
    name: 'Levels',
    desc: '输入黑/白场重映射 + 中间调 Gamma + 输出黑/白场（逐通道），配合 inspect_color 的黑白点读数使用。',
    frag: levelsFrag,
    props: [
      { key: 'inBlack', label: '输入黑场', default: 0, min: 0, max: 0.5, step: 0.005 },
      { key: 'inWhite', label: '输入白场', default: 1, min: 0.5, max: 1, step: 0.005 },
      { key: 'gamma', label: 'Gamma', default: 1, min: 0.2, max: 3, step: 0.02 },
      { key: 'outBlack', label: '输出黑场', default: 0, min: 0, max: 0.5, step: 0.005 },
      { key: 'outWhite', label: '输出白场', default: 1, min: 0.5, max: 1, step: 0.005 },
    ],
  },
  'builtin:fx-highlights-shadows': {
    id: 'builtin:fx-highlights-shadows',
    name: '高光/阴影',
    desc: '按亮度软掩膜分别调整：提亮暗部（保护高光）、回收或增强高光。',
    frag: highlightsShadowsFrag,
    props: [
      { key: 'shadows', label: '阴影', default: 0, min: -1, max: 1, step: 0.02 },
      { key: 'highlights', label: '高光', default: 0, min: -1, max: 1, step: 0.02 },
      { key: 'shadowRange', label: '阴影范围', default: 0.35, min: 0.1, max: 0.7, step: 0.01 },
      { key: 'highlightRange', label: '高光范围', default: 0.35, min: 0.1, max: 0.7, step: 0.01 },
    ],
  },
  'builtin:fx-clarity': {
    id: 'builtin:fx-clarity',
    name: '清晰度',
    desc: '中间调局部对比（亮度 unsharp）：正值增质感，负值柔化肤质。',
    frag: clarityFrag,
    props: [
      { key: 'amount', label: 'Intensity', default: 0.35, min: -1, max: 1, step: 0.02 },
      { key: 'radius', label: '半径(px)', default: 24, min: 4, max: 64, step: 1 },
    ],
  },
  'builtin:fx-hsl-qualify': {
    id: 'builtin:fx-hsl-qualify',
    name: 'HSL 定向调整',
    desc: '二级校色：只对选中的色相区间（中心±宽度+羽化）做色相偏移/饱和度/明度调整；肤色、天空、品牌色定向修。',
    frag: hslQualifyFrag,
    props: [
      { key: 'hueCenter', label: '色相中心(°)', default: 25, min: 0, max: 360, step: 1 },
      { key: 'hueWidth', label: '选区宽(°)', default: 25, min: 5, max: 90, step: 1 },
      { key: 'softness', label: '羽化(°)', default: 20, min: 1, max: 60, step: 1 },
      { key: 'hueShift', label: '色相偏移(°)', default: 0, min: -60, max: 60, step: 1 },
      { key: 'satMul', label: '饱和度×', default: 1, min: 0, max: 2, step: 0.02 },
      { key: 'lumaMul', label: '明度×', default: 1, min: 0.5, max: 1.5, step: 0.01 },
    ],
  },

  // ── Extended generated library ──────────────────────────────────────────
  'builtin:fx-vignette': {
    id: 'builtin:fx-vignette',
    name: 'Vignette',
    desc: 'Darkens the edges to emphasize the center subject. Adjustable amount/softness/roundness.',
    frag: vignetteFrag,
    props: [
      { key: 'amount', label: 'Intensity', default: 0.55, min: 0, max: 1, step: 0.01 },
      { key: 'softness', label: 'Softness', default: 0.45, min: 0.05, max: 1, step: 0.01 },
      { key: 'roundness', label: 'Roundness', default: 1, min: 0.5, max: 2, step: 0.01 },
    ],
  },
  'builtin:fx-film-grain': {
    id: 'builtin:fx-film-grain',
    name: 'Film Grain',
    desc: 'Dynamic film-grain texture. Animated.',
    frag: filmGrainFrag,
    props: [
      { key: 'amount', label: 'Intensity', default: 0.18, min: 0, max: 0.6, step: 0.01 },
      { key: 'size', label: 'Grain Size', default: 1.2, min: 0.5, max: 4, step: 0.1 },
    ],
  },
  'builtin:fx-rgb-split': {
    id: 'builtin:fx-rgb-split',
    name: 'RGB Split',
    desc: 'Channel-offset chromatic aberration — cyber/glitch feel.',
    frag: rgbSplitFrag,
    props: [
      { key: 'amount', label: 'Offset', default: 0.008, min: 0, max: 0.05, step: 0.001 },
      { key: 'angle', label: 'Direction', default: 0, min: 0, max: 6.2832, step: 0.05 },
    ],
  },
  'builtin:fx-glitch': {
    id: 'builtin:fx-glitch',
    name: 'Glitch',
    desc: 'Horizontal slice displacement + occasional inversion/color fringing. Animated.',
    frag: glitchFrag,
    props: [
      { key: 'intensity', label: 'Intensity', default: 0.7, min: 0, max: 2, step: 0.05 },
      { key: 'blockSize', label: 'Slice Density', default: 28, min: 4, max: 80, step: 1 },
    ],
  },
  'builtin:fx-bloom': {
    id: 'builtin:fx-bloom',
    name: 'Bloom',
    desc: 'Highlight bloom for a cinematic glow.',
    frag: bloomFrag,
    props: [
      { key: 'threshold', label: 'Threshold', default: 0.55, min: 0, max: 1, step: 0.01 },
      { key: 'intensity', label: 'Intensity', default: 0.85, min: 0, max: 3, step: 0.05 },
      { key: 'radius', label: 'Radius', default: 2.5, min: 0.5, max: 8, step: 0.1 },
    ],
  },
  'builtin:fx-pixelate': {
    id: 'builtin:fx-pixelate',
    name: 'Pixelate',
    desc: 'Full-frame pixel-block stylization.',
    frag: pixelateFrag,
    props: [
      { key: 'blockSize', label: 'Block Size', default: 12, min: 2, max: 80, step: 1 },
    ],
  },
  'builtin:fx-posterize': {
    id: 'builtin:fx-posterize',
    name: 'Posterize',
    desc: 'Reduces color levels for an illustration/poster look.',
    frag: posterizeFrag,
    props: [
      { key: 'levels', label: 'Levels', default: 5, min: 2, max: 16, step: 1 },
      { key: 'contrast', label: 'Contrast', default: 1.15, min: 0.5, max: 2.5, step: 0.05 },
    ],
  },
  'builtin:fx-duotone': {
    id: 'builtin:fx-duotone',
    name: 'Duotone',
    desc: 'Maps shadows and highlights to two colors by luminance.',
    frag: duotoneFrag,
    props: [
      { key: 'shadowColor', label: 'Shadow Color', kind: 'color', default: [0.08, 0.12, 0.35], uniform: 'u_shadowColor' },
      { key: 'highlightColor', label: 'Highlight Color', kind: 'color', default: [1.0, 0.72, 0.35], uniform: 'u_highlightColor' },
      { key: 'contrast', label: 'Contrast', default: 1.2, min: 0.5, max: 2.5, step: 0.05 },
      { key: 'intensity', label: 'Intensity', default: 1, min: 0, max: 1, step: 0.01 },
    ],
  },
  'builtin:fx-mirror': {
    id: 'builtin:fx-mirror',
    name: 'Mirror',
    desc: 'Horizontal/vertical mirror tiling. mode: 0 left→right, 1 right→left, 2 top→bottom, 3 bottom→top.',
    frag: mirrorFrag,
    props: [
      { key: 'mode', label: 'Mode', default: 0, min: 0, max: 3, step: 1 },
      { key: 'axis', label: 'Axis', default: 0.5, min: 0.1, max: 0.9, step: 0.01 },
    ],
  },
  'builtin:fx-fisheye': {
    id: 'builtin:fx-fisheye',
    name: 'Fisheye',
    desc: 'Barrel-distortion wide-angle effect.',
    frag: fisheyeFrag,
    props: [
      { key: 'strength', label: 'Intensity', default: 0.55, min: 0, max: 1.5, step: 0.01 },
      { key: 'zoom', label: 'Zoom', default: 1.05, min: 0.5, max: 2, step: 0.01 },
    ],
  },
  'builtin:fx-kaleidoscope': {
    id: 'builtin:fx-kaleidoscope',
    name: 'Kaleidoscope',
    desc: 'Radial segment mirroring — kaleidoscope pattern.',
    frag: kaleidoscopeFrag,
    props: [
      { key: 'segments', label: 'Segments', default: 6, min: 2, max: 16, step: 1 },
      { key: 'angle', label: 'Rotation', default: 0, min: 0, max: 6.2832, step: 0.05 },
      { key: 'zoom', label: 'Zoom', default: 1, min: 0.4, max: 2, step: 0.01 },
    ],
  },
  'builtin:fx-edge-glow': {
    id: 'builtin:fx-edge-glow',
    name: 'Edge Glow',
    desc: 'Sobel edge detection with a colored glow outline.',
    frag: edgeGlowFrag,
    props: [
      { key: 'strength', label: 'Intensity', default: 1.4, min: 0, max: 4, step: 0.05 },
      { key: 'threshold', label: 'Threshold', default: 0.08, min: 0, max: 0.5, step: 0.01 },
      { key: 'color', label: 'Color', kind: 'color', default: [0.4, 0.9, 1.0], uniform: 'u_color' },
    ],
  },
  'builtin:fx-soft-blur': {
    id: 'builtin:fx-soft-blur',
    name: 'Soft Blur',
    desc: 'Lightweight full-frame soft focus.',
    frag: softBlurFrag,
    props: [
      { key: 'amount', label: 'Blur Amount', default: 2.5, min: 0, max: 12, step: 0.1 },
    ],
  },
  'builtin:fx-light-leak': {
    id: 'builtin:fx-light-leak',
    name: 'Light Leak',
    desc: 'Film light-leak color band with a subtle breathing animation.',
    frag: lightLeakFrag,
    props: [
      { key: 'intensity', label: 'Intensity', default: 0.55, min: 0, max: 1.5, step: 0.01 },
      { key: 'angle', label: 'Angle', default: 0.7, min: 0, max: 6.2832, step: 0.05 },
      { key: 'spread', label: 'Width', default: 0.35, min: 0.05, max: 1, step: 0.01 },
      { key: 'tint', label: 'Tint', kind: 'color', default: [1.0, 0.45, 0.2], uniform: 'u_tint' },
    ],
  },
  'builtin:fx-sepia': {
    id: 'builtin:fx-sepia',
    name: 'Sepia',
    desc: 'Classic sepia vintage tint.',
    frag: sepiaFrag,
    props: [
      { key: 'intensity', label: 'Intensity', default: 1, min: 0, max: 1, step: 0.01 },
      { key: 'contrast', label: 'Contrast', default: 1.1, min: 0.5, max: 2, step: 0.05 },
    ],
  },
  'builtin:fx-invert': {
    id: 'builtin:fx-invert',
    name: 'Invert',
    desc: 'RGB inversion — negative/glitch style.',
    frag: invertFrag,
    props: [
      { key: 'intensity', label: 'Intensity', default: 1, min: 0, max: 1, step: 0.01 },
    ],
  },
  'builtin:fx-halftone': {
    id: 'builtin:fx-halftone',
    name: 'Halftone',
    desc: 'Print halftone / comic-dot style.',
    frag: halftoneFrag,
    props: [
      { key: 'dotSize', label: 'Dot Size', default: 8, min: 2, max: 32, step: 1 },
      { key: 'contrast', label: 'Contrast', default: 1.3, min: 0.5, max: 2.5, step: 0.05 },
      { key: 'intensity', label: 'Intensity', default: 1, min: 0, max: 1, step: 0.01 },
    ],
  },
  'builtin:fx-motion-blur': {
    id: 'builtin:fx-motion-blur',
    name: 'Motion Blur',
    desc: 'Directional smearing to convey speed.',
    frag: motionBlurFrag,
    props: [
      { key: 'amount', label: 'Blur Amount', default: 2.5, min: 0, max: 12, step: 0.1 },
      { key: 'angle', label: 'Direction', default: 0, min: 0, max: 6.2832, step: 0.05 },
    ],
  },
};

/** Core library order first, followed by extended effects. */
export const FX_ORDER = [
  'builtin:fx-rect-mask',
  'builtin:fx-circle-mask',
  'builtin:fx-local-mosaic',
  'builtin:fx-magnify',
  'builtin:fx-tilt-shift',
  'builtin:fx-crt',
  'builtin:fx-ascii-rain',
  'builtin:fx-shake',
  'builtin:fx-luma-key',
  'builtin:fx-chroma-key',
  'builtin:fx-color-wheels',
  'builtin:fx-levels',
  'builtin:fx-highlights-shadows',
  'builtin:fx-clarity',
  'builtin:fx-hsl-qualify',
  'builtin:fx-vignette',
  'builtin:fx-film-grain',
  'builtin:fx-rgb-split',
  'builtin:fx-glitch',
  'builtin:fx-bloom',
  'builtin:fx-pixelate',
  'builtin:fx-posterize',
  'builtin:fx-duotone',
  'builtin:fx-mirror',
  'builtin:fx-fisheye',
  'builtin:fx-kaleidoscope',
  'builtin:fx-edge-glow',
  'builtin:fx-soft-blur',
  'builtin:fx-light-leak',
  'builtin:fx-sepia',
  'builtin:fx-invert',
  'builtin:fx-halftone',
  'builtin:fx-motion-blur',
] as const;

export const FX_IDS = [
  ...FX_ORDER.filter((id) => id in FX_EFFECTS),
  ...Object.keys(FX_EFFECTS).filter((id) => !(FX_ORDER as readonly string[]).includes(id)),
];
