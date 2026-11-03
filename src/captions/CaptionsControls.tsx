import { useMemo, useState } from 'react';
import type { CaptionsData, CaptionPacing, CaptionTemplate } from './types';
import type { TimelineItem, TrackId } from '../editor/types';
import type { TranscriptVariant } from '../transcript/types';
import { CaptionCueEditor } from './CaptionCueEditor';
import { CAPTION_STYLES, captionStyleFor } from './styles';
import { isTranslationStale } from './translate';
import { theme } from '../theme';
import { useT } from '../i18n/locale';
import { ManualCaptionEditor } from './ManualCaptionEditor';
import { beginCaptionStylePointerDrag } from './captionStyleDrag';
import { captionTemplatePatch } from './captionTemplatePatch';
import { CaptionMotionControls } from './CaptionMotionControls';
import { normalizeCaptionLang } from './captionCueMenu';

interface CaptionsControlsProps {
  captionTrackId?: TrackId;
  captions: CaptionsData | null;
  /** translation / correction variants of the caption's source transcript (main-line language picker) */
  sourceVariants?: TranscriptVariant[];
  /** The sentence-by-sentence editing list needs to recalculate the same paging as the rendering layer, which requires timeline items + fps */
  items: TimelineItem[];
  fps: number;
  /** Sentence-by-sentence editing: click-to-sentence preview (timeline ms) */
  onSeekMs?: (ms: number) => void;
  onCreateManual: () => void;
  getPlayheadMs?: () => number;
  onUpdate: (patch: Partial<CaptionsData>) => void;
  /** Completely remove captions (hide and clear overlay status) */
  onRemove?: () => void;
  onTranslate: (lang: string) => void;
  translating: boolean;
  translateError: string | null;
}

const PACINGS: { v: CaptionPacing; label: string; hint: string }[] = [
  { v: 'phrase', label: 'By sentence/phrase', hint: 'One sentence at a time — suits documentary voiceover' },
  { v: 'word', label: 'Word-by-word highlight', hint: 'The word being spoken lights up, karaoke-style' },
];

/** Translation target = second line language. When the spoken broadcast is in Chinese, it will be translated into English by default. Do not select "Chinese" again. */
const TRANSLATE_TO: { id: string; label: string }[] = [
  { id: 'English', label: 'English' },
  { id: 'Japanese', label: 'Japanese' },
  { id: 'Español', label: 'Spanish' },
  { id: 'Français', label: 'French' },
  { id: 'Korean', label: 'Korean' },
];


// Independent caption workspace: style, rhythm, manual captions and translation are all edited here.
export function CaptionsControls({
  captionTrackId, captions, sourceVariants = [], items, fps, onSeekMs, onCreateManual, getPlayheadMs, onUpdate, onRemove, onTranslate, translating, translateError,
}: CaptionsControlsProps) {
  const t = useT();
  const [bilingualOpen, setBilingualOpen] = useState(!!captions?.bilingual || !!captions?.translation);
  const style = captions ? captionStyleFor(captions.template) : null;
  const pacingMeta = PACINGS.find((p) => p.v === (captions?.pacing ?? 'phrase')) ?? PACINGS[0]!;
  // Translation cues carry absolute timeline ms; re-timing the source leaves
  // them pinned to the old positions, so say so rather than showing drift.
  const translationStale = useMemo(
    () => (captions ? isTranslationStale(captions, items, fps) : false),
    [captions, items, fps],
  );

  const translateLang = useMemo(() => {
    const saved = captions?.translationLang;
    const cur = saved ? normalizeCaptionLang(saved) : saved;
    if (cur && TRANSLATE_TO.some((l) => l.id === cur || l.label === cur)) return cur;
    // never default to Chinese — source VO is already Chinese
    return 'English';
  }, [captions?.translationLang]);

  return (
    <div className="vx-cap-panel open standalone">
      {!captions && (
        <div className="vx-cap-empty">
          <div className="vx-cap-empty-actions">
            <button type="button" className="vx-cap-btn primary" onClick={onCreateManual}>{t('Add captions manually')}</button>
          </div>
          <p className="vx-cap-hint">{t('Open "Caption styles" from Transcript, or add independent captions manually here.')}</p>
        </div>
      )}

      {captions && (
        <div className="vx-cap-body">
          {/* Show / Hide - most visible */}
          <div className="vx-cap-row main">
            <label className="vx-cap-toggle">
              <input
                type="checkbox"
                checked={captions.enabled}
                onChange={(e) => onUpdate({ enabled: e.target.checked })}
              />
              <span>{captions.enabled ? t('Captions showing in preview') : t('Captions hidden')}</span>
            </label>
            <div className="vx-cap-row-actions">
              {!captions.enabled && (
                <button type="button" className="vx-cap-btn sm" onClick={() => onUpdate({ enabled: true })}>
                  {t('Show')}
                </button>
              )}
              {captions.enabled && (
                <button type="button" className="vx-cap-btn sm" onClick={() => onUpdate({ enabled: false })}>
                  {t('Hide')}
                </button>
              )}
              {onRemove && (
                <button
                  type="button"
                  className="vx-cap-btn sm ghost"
                  title={t('Remove captions from the project')}
                  onClick={onRemove}
                >
                  {t('Remove')}
                </button>
              )}
            </div>
          </div>
          {!captions.enabled && (
            <p className="vx-cap-hint warn">{t('Captions are off — neither preview nor export will burn them in. Click "Show" or tick the box to bring them back.')}</p>
          )}

          {/* Style: color block + Chinese name */}
          <div className="vx-cap-field">
            <div className="vx-cap-label">{t('Style')}</div>
            <div className="vx-cap-styles" role="listbox" aria-label={t('Caption styles')}>
              {CAPTION_STYLES.map((s) => {
                const active = captions.template === s.id;
                return (
                  <button
                    key={s.id}
                    type="button"
                    role="option"
                    aria-selected={active}
                    className={`vx-cap-style${active ? ' selected' : ''}`}
                    title={`${t(s.labelZh)} — ${t(s.hint)} · ${t('Drag onto the preview to create a caption anywhere')}`}
                    onClick={() => onUpdate(captionTemplatePatch(captions, s.id as CaptionTemplate))}
                    onPointerDown={(event) => {
                      if (!captionTrackId) return;
                      beginCaptionStylePointerDrag(event.nativeEvent, { trackId: captionTrackId, template: s.id });
                    }}
                  >
                    <span
                      className="vx-cap-swatch"
                      style={{
                        color: s.color,
                        background: s.highlightBackground ?? '#1a1a1a',
                        borderColor: s.strokeWidth > 0 ? s.strokeColor : theme.border,
                      }}
                    >
                      {t('C')}
                    </span>
                    <span className="vx-cap-style-name">{t(s.labelZh)}</span>
                  </button>
                );
              })}
            </div>
            {style && <p className="vx-cap-hint">{t(style.labelZh)}: {t(style.hint)} · {t('Drag onto the preview to create and edit a caption anywhere')}</p>}
          </div>

          {/* Rhythm*/}
          <div className="vx-cap-field">
            <div className="vx-cap-label">{t('Pacing')}</div>
            <div className="vx-cap-pills">
              {PACINGS.map((p) => (
                <button
                  key={p.v}
                  type="button"
                  className={`vx-cap-pill${captions.pacing === p.v ? ' selected' : ''}`}
                  onClick={() => onUpdate({ pacing: p.v })}
                >
                  {t(p.label)}
                </button>
              ))}
            </div>
            <p className="vx-cap-hint">{t(pacingMeta.hint)}</p>
          </div>

          <CaptionMotionControls
            value={captions.motionPreset}
            onChange={(motionPreset) => onUpdate({ motionPreset })}
          />

          <ManualCaptionEditor captions={captions} items={items} onUpdate={onUpdate} getPlayheadMs={getPlayheadMs} onSeekMs={onSeekMs} />

          {/* caption language (text variant): Change the main caption line to a translation/correction variant, leaving the timeline unchanged.
Variants are generated by Agent's manage_transcript translate. Here you only select which one to display.*/}
          {sourceVariants.length > 0 && (
            <div className="vx-cap-field">
              <div className="vx-cap-label">{t('Caption language (text variant)')}</div>
              <select
                value={captions.captionVariantId ?? ''}
                onChange={(e) => onUpdate({ captionVariantId: e.target.value || undefined })}
                className="vx-cap-select"
              >
                <option value="">{t('Original (source)')}</option>
                {sourceVariants.map((v) => (
                  <option key={v.id} value={v.id}>{v.label}</option>
                ))}
              </select>
              <p className="vx-cap-hint">{t('Switch the language of the main caption line. Translations swap text only — word timing/frames still come from the source.')}</p>
            </div>
          )}

          {/* Bilingual: folded, translated into English by default*/}
          <div className="vx-cap-bilingual">
            <button
              type="button"
              className="vx-cap-bilingual-toggle"
              onClick={() => setBilingualOpen((v) => !v)}
              aria-expanded={bilingualOpen}
            >
              <span>{t('Bilingual second line (optional)')}</span>
              <span className="vx-cap-hint">{bilingualOpen ? t('Collapse') : t('Expand')}</span>
            </button>
            {bilingualOpen && (
              <div className="vx-cap-bilingual-body">
                <p className="vx-cap-hint">
                  {t('The first line stays the original (Chinese voiceover). The second line is a')}<strong>{t('translation')}</strong>{t('— pick a target language (not Chinese).')}
                </p>
                <div className="vx-cap-translate-row">
                  <select
                    value={translateLang}
                    disabled={translating}
                    onChange={(e) => onTranslate(e.target.value)}
                    className="vx-cap-select"
                  >
                    {TRANSLATE_TO.map((l) => (
                      <option key={l.id} value={l.id}>{t(l.label)} ({l.id})</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className="vx-cap-btn primary sm"
                    disabled={translating}
                    onClick={() => onTranslate(translateLang)}
                  >
                    {translating ? t('Translating…') : captions.translation ? t('Re-translate') : t('Generate translation')}
                  </button>
                </div>
                {captions.translation && (
                  <label className="vx-cap-toggle">
                    <input
                      type="checkbox"
                      checked={!!captions.bilingual}
                      onChange={(e) => onUpdate({ bilingual: e.target.checked })}
                    />
                    <span>{t('Show translated second line ({lang})', { lang: captions.translationLang ?? translateLang })}</span>
                  </label>
                )}
                {translationStale && (
                  <div className="vx-cap-hint warn">
                    {t('The source timing changed; the translated line still sits at the old positions — re-translate to realign.')}
                  </div>
                )}
                {translateError && <div className="vx-cap-error">{translateError}</div>}
              </div>
            )}
          </div>

          {/* Manually change the caption text sentence by sentence (same channel as agent display_text)*/}
          <CaptionCueEditor captions={captions} items={items} fps={fps} onUpdate={onUpdate} onSeekMs={onSeekMs} />
        </div>
      )}
    </div>
  );
}
