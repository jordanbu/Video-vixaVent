// Theme tokens. Since the skinning system (see skins.ts), all here are var(--cc-*)
// Indirect reference - the true value is in the SKINS registry of skins.ts (default skin "Graphite",
// Consistent with old hex value-wise). Inline styles are still written as theme.x, with zero modification and zero re-rendering when changing skins.
// ⚠ These values can only be used in DOM style/CSS:canvas fillStyle, SVG attribute bits, and hex string concatenation
// Can't parse var() (all positions have been audited to zero, new code sets a precedent).
export const theme = {
  bg: 'var(--vx-bg)', // editor void / timeline background
  inset: 'var(--vx-inset)', // Inner groove (input well)
  panel: 'var(--vx-panel)', // Base editor surface.
  panelAlt: 'var(--vx-panel-alt)', // --surface-raised (cards, chat bubbles, popovers, hover)
  hover: 'var(--vx-hover)', // Row hover / activate fill
  border: 'var(--vx-border)', // Panel separator.
  borderLight: 'var(--vx-border-light)',
  text: 'var(--vx-text)', // --foreground
  textMuted: 'var(--vx-text-muted)', // secondary text
  textDim: 'var(--vx-text-dim)', // Inactive text.
  textStrong: 'var(--vx-text-strong)', // Highlight text on hover
  accent: 'var(--vx-accent)', // measured export coral
  accentDeep: 'var(--vx-accent-deep)', // accent press / bottom of main button
  onAccent: 'var(--vx-on-accent)', // accent text on fill (pastel skin = dark text)
  gold: 'var(--vx-gold)', // --primary (amber highlight)
  select: 'var(--vx-select)',
  success: 'var(--vx-success)', // Tool success/completion status (same value and different synonyms as A2 rail chip, independent token)
  danger: 'var(--vx-danger)', // Errors, deletions and destructive operations
  // Timeline surfaces use subtly blue-tinted dark colors.
  tlTrack: 'var(--vx-tl-track)', // --tl-track-bg (lane behind clips)
  tlSidePanel: 'var(--vx-tl-side-panel)', // --tl-side-panel-bg (track-header column)
  // track-header chips
  trackVideo: 'var(--vx-track-video)', // V-track chip
  trackAudioA1: 'var(--vx-track-audio-a1)',
  trackAudioA2: 'var(--vx-track-audio-a2)',
  trackCaption: 'var(--vx-track-caption)',
  // Clip fills by kind: video=blue, audio=green, MG=pink, text=amber.
  clipVideo: 'var(--vx-clip-video)', // --tl-item-video
  clipAudio: 'var(--vx-clip-audio)', // --tl-item-audio
  clipMg: 'var(--vx-clip-mg)', // --tl-item-motion-graph
  clipText: 'var(--vx-clip-text)', // --tl-item-text
} as const;

const alpha = (channel: string, opacity: number): string =>
  `rgba(var(--vx-${channel}-rgb), ${opacity})`;

/** UI translucent color. The ink is inverted with the darker skin, and the shadow always expresses suspended levels.*/
export const themeAlpha = {
  ink: (opacity: number): string => alpha('ink', opacity),
  accent: (opacity: number): string => alpha('accent', opacity),
  shadow: (opacity: number): string => alpha('shadow', opacity),
} as const;
