import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const RAW_COLOR = /(?<![\w-])#[\da-f]{3,8}\b|rgba?\([^)]*\)/gi;
const TOKENIZED_CHANNEL = 'var(--vx-';

const CONTENT_COLOR_SELECTORS = new Set([
  '.vx-export-qa-card img',
  '.vx-audio-waveform path',
  '.vx-clip-wave path',
  '.vx-clip-label',
  '.vx-clip-label.audio',
  '.vx-clip-badge',
  '.vx-clip-badge.fx',
  '.vx-clip-badge.lut',
  '.vx-clip-badge.zoom',
  '.vx-clip-badge.iso',
  '.vx-clip-badge.tr',
  '.vx-transition-marker',
  '.vx-transition-marker:hover',
  '.vx-capedit-colordot',
  // The functional status color must maintain the original semantics and not change color following the skin.
  '.vx-media-error',
  '.vx-asset-menu-portal button.danger',
  '.vx-asset-menu-portal button.danger:hover',
  '.vx-modal button.danger',
  '.vx-export-qa-card.issues,.vx-export-qa-card.error',
  '.vx-export-qa-card li.error',
  '.vx-export-progress.verifying .vx-export-progress-track i',
  '.vx-export-progress.failed .vx-export-progress-track i',
  '.vx-caption-style-error',
  '.vx-tx-error',
  '.vx-tx-section.drag-over',
  '.vx-tx-speech.drag-over',
  '.vx-tx-word.editable:hover',
  '.vx-tx-gap-del:hover',
  '.vx-cap-error',
  '.vx-insp-range',
  '.vx-audiofx-strength input',
  '.vx-audiofx-note.err',
  '.vx-capedit-btn.danger:hover',
]);

const CHROME_FILES = [
  'src/components/ExportHistory.tsx',
  'src/components/PreviewPanel.tsx',
  'src/components/VersionHistory.tsx',
  'src/components/chat/ChatComposer.tsx',
  'src/components/settings/DesignStylePanel.tsx',
  'src/components/settings/SettingsDialog.tsx',
  'src/components/settings/SkinPicker.tsx',
  'src/components/settings/settingsVendorPane.tsx',
  'src/components/timeline/ClipContextMenu.tsx',
  'src/components/timeline/MarkerEditor.tsx',
  'src/components/timeline/Timeline.tsx',
  'src/components/timeline/TimelineRuler.tsx',
  'src/components/timeline/TimelineSpeedControl.tsx',
  'src/components/timeline/TimelineTabs.tsx',
  'src/components/timeline/TrackLane.tsx',
  'src/library/TemplateBrowser.tsx',
  'src/media/MediaCleanupDialog.tsx',
  'src/shortcuts/ShortcutsDialog.tsx',
  'src/ui/AppToastHost.tsx',
] as const;

const CONTENT_COLORS_BY_FILE = new Map<string, ReadonlySet<string>>([
  ['src/components/settings/DesignStylePanel.tsx', new Set(['#000000'])],
  ['src/components/chat/ChatComposer.tsx', new Set(['#e5866a'])],
  ['src/components/settings/settingsVendorPane.tsx', new Set(['#f77'])],
  ['src/components/PreviewPanel.tsx', new Set([
    '#000', 'rgba(255,255,255,${opacity})', 'rgba(255,255,255,0.18)',
  ])],
  ['src/components/timeline/Timeline.tsx', new Set([
    '#4fd1ff', '#0006', 'rgba(88,166,255,0.14)', '#58a6ff',
    'rgba(120,170,255,0.95)', 'rgba(80,140,255,0.16)',
  ])],
  ['src/components/timeline/TimelineRuler.tsx', new Set([
    'rgba(88,166,255,0.18)', '#58a6ff', '#f0883e', 'rgba(0,0,0,0.9)',
  ])],
  ['src/components/timeline/TrackLane.tsx', new Set([
    '#6a9fd8', 'rgba(0,0,0,.4)', '#fff', 'rgba(255,255,255,.08)',
    '#6a9fd855', '#6a9fd844', '#ffd866', 'rgba(0,0,0,0.85)',
  ])],
  ['src/library/TemplateBrowser.tsx', new Set([
    'rgba(0,0,0,0.55)', '#f5c518', '#fff',
  ])],
]);

function normalizedColor(value: string): string {
  return value.toLowerCase().replace(/\s+/g, '');
}

function rawColors(source: string): string[] {
  const withoutComments = source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/.*$/gm, '');
  return [...withoutComments.matchAll(RAW_COLOR)]
    .map(([literal]) => literal)
    .filter((literal) => !literal.includes(TOKENIZED_CHANNEL));
}

function lastSelectorLine(header: string): string {
  return header.trim().split('\n').at(-1)?.trim() ?? '';
}

const css = readFileSync('src/index.css', 'utf8');
for (const match of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
  const colors = rawColors(match[2]);
  if (colors.length === 0) continue;
  const selector = lastSelectorLine(match[1]);
  assert.ok(
    CONTENT_COLOR_SELECTORS.has(selector),
    `${selector}: UI chrome must use --vx-* tokens (${colors.join(', ')})`,
  );
}

for (const file of CHROME_FILES) {
  const colors = rawColors(readFileSync(file, 'utf8'));
  const allowed = CONTENT_COLORS_BY_FILE.get(file) ?? new Set<string>();
  const normalizedAllowed = new Set([...allowed].map(normalizedColor));
  const unexpected = colors.filter((color) => !normalizedAllowed.has(normalizedColor(color)));
  assert.deepEqual(unexpected, [], `${file}: fixed colors found (${unexpected.join(', ')})`);
}

for (const selector of ['.vx-mic-group', '.vx-timeline-timecode', '.vx-ruler-head span', '.vx-track-name']) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const body = css.match(new RegExp(`${escaped}\\s*\\{([^}]*)\\}`))?.[1] ?? '';
  assert.ok(body.includes('var(--vx-'), `${selector}: missing a skin token`);
  assert.deepEqual(rawColors(body), [], `${selector}: fixed color found`);
}

process.stdout.write('theme-tokenization.verify: ok\n');
