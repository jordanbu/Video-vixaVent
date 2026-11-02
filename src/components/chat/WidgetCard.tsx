import { useState } from 'react';
import { useT } from '../../i18n/locale';
import { formatWidgetAnswer, safeWidgetMediaUrl, type WidgetField, type WidgetValues } from './widget-parse';

function isAudioUrl(url: string): boolean {
  return /\.(mp3|wav|ogg|m4a|aac)(\?|$)/i.test(url);
}
function isImageUrl(url: string): boolean {
  return /\.(png|jpe?g|webp|gif|svg)(\?|$)/i.test(url);
}

function MediaPreview({ media, aspectRatio, forceAudio = false, label }: { media?: string; aspectRatio?: string; forceAudio?: boolean; label: string }) {
  const [broken, setBroken] = useState(false);
  const safeMedia = safeWidgetMediaUrl(media);
  if (!safeMedia || broken) return null;
  if (forceAudio || isAudioUrl(safeMedia)) {
    return <audio controls src={safeMedia} aria-label={label} onError={() => setBroken(true)} className="vx-widget-media-audio" />;
  }
  if (isImageUrl(safeMedia)) {
    return (
      <img
        src={safeMedia}
        alt=""
        onError={() => setBroken(true)}
        className="vx-widget-media-img"
        style={{ aspectRatio: aspectRatio?.replace(':', ' / ') }}
      />
    );
  }
  return null;
}

interface WidgetCardProps {
  fields: WidgetField[];
  title?: string;
  submitLabel?: string;
  messagePrefix?: string;
  persistedSubmitted?: boolean;
  onSubmit: (answer: string) => void;
}

function isFilled(f: WidgetField, v: string | string[] | undefined): boolean {
  if (f.kind === 'multi' || ((f.kind === 'visual' || f.kind === 'voice' || f.kind === 'scenario') && f.multiple)) {
    return Array.isArray(v) && v.length > 0;
  }
  return typeof v === 'string' && v.trim().length > 0;
}

export function WidgetCard({ fields, title, submitLabel, messagePrefix, persistedSubmitted = false, onSubmit }: WidgetCardProps) {
  const t = useT();
  const [values, setValues] = useState<WidgetValues>({});
  const [otherFields, setOtherFields] = useState<Record<string, boolean>>({});
  const [locallySubmitted, setLocallySubmitted] = useState(false);
  const submitted = persistedSubmitted || locallySubmitted;

  const selectSingle = (id: string, value: string) => {
    setValues((v) => ({ ...v, [id]: value }));
    setOtherFields((o) => ({ ...o, [id]: false }));
  };
  const selectOther = (id: string) => {
    setOtherFields((o) => ({ ...o, [id]: true }));
    setValues((v) => ({ ...v, [id]: typeof v[id] === 'string' && otherFields[id] ? v[id] : '' }));
  };
  const setOtherText = (id: string, text: string) => setValues((v) => ({ ...v, [id]: text }));
  const toggleMulti = (id: string, value: string) => {
    setValues((v) => {
      const cur = Array.isArray(v[id]) ? (v[id] as string[]) : [];
      const next = cur.includes(value) ? cur.filter((x) => x !== value) : [...cur, value];
      return { ...v, [id]: next };
    });
  };
  const selectRich = (field: WidgetField, value: string) => {
    if ((field.kind === 'visual' || field.kind === 'voice' || field.kind === 'scenario') && field.multiple) {
      toggleMulti(field.id, value);
      return;
    }
    setOtherFields((current) => ({ ...current, [field.id]: false }));
    setValues((current) => ({ ...current, [field.id]: value }));
  };

  const canSubmit = !submitted && fields.every((f) => !f.required || isFilled(f, values[f.id]));
  const handleSubmit = () => {
    if (!canSubmit) return;
    const answer = formatWidgetAnswer(fields, values, messagePrefix);
    setLocallySubmitted(true);
    onSubmit(answer);
  };

  return (
    <div className={`vx-widget${submitted ? ' submitted' : ''}`}>
      {title ? <h3 className="vx-widget-title">{title}</h3> : null}
      <div className="vx-widget-body">
        {fields.map((f, fi) => (
          <section key={f.id} className={`vx-widget-field${fi === 0 ? ' first' : ''}`}>
            <header className="vx-widget-field-head">
              <h4 className="vx-widget-label">{f.label}</h4>
              {f.required ? <span className="vx-widget-req">{t('Required')}</span> : <span className="vx-widget-opt">{t('Optional')}</span>}
            </header>
            {f.description ? <p className="vx-widget-description">{f.description}</p> : null}

            {f.kind === 'single' && (
              <div className="vx-widget-options" role="radiogroup" aria-label={f.label}>
                {f.options.map((o) => {
                  const on = !otherFields[f.id] && values[f.id] === o.value;
                  return (
                    <label key={o.value} className={`vx-widget-option${on ? ' on' : ''}${submitted ? ' disabled' : ''}`}>
                      <input
                        type="radio"
                        name={f.id}
                        disabled={submitted}
                        checked={on}
                        onChange={() => selectSingle(f.id, o.value)}
                      />
                      <span className="vx-widget-radio" aria-hidden />
                      <span className="vx-widget-option-text">{o.display}</span>
                    </label>
                  );
                })}
                {f.allowOther && (
                  <label className={`vx-widget-option vx-widget-other${otherFields[f.id] ? ' on' : ''}${submitted ? ' disabled' : ''}`}>
                    <input
                      type="radio"
                      name={f.id}
                      disabled={submitted}
                      checked={!!otherFields[f.id]}
                      onChange={() => selectOther(f.id)}
                    />
                    <span className="vx-widget-radio" aria-hidden />
                    <span className="vx-widget-option-text">{t('Other…')}</span>
                    {otherFields[f.id] && (
                      <input
                        type="text"
                        className="vx-widget-other-input"
                        disabled={submitted}
                        autoFocus
                        value={typeof values[f.id] === 'string' ? (values[f.id] as string) : ''}
                        onChange={(e) => setOtherText(f.id, e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        placeholder={f.otherPlaceholder || t('Type here')}
                      />
                    )}
                  </label>
                )}
              </div>
            )}

            {f.kind === 'multi' && (
              <div className="vx-widget-options" role="group" aria-label={f.label}>
                {f.options.map((o) => {
                  const checked = Array.isArray(values[f.id]) && (values[f.id] as string[]).includes(o.value);
                  return (
                    <label key={o.value} className={`vx-widget-option${checked ? ' on' : ''}${submitted ? ' disabled' : ''}`}>
                      <input
                        type="checkbox"
                        disabled={submitted}
                        checked={checked}
                        onChange={() => toggleMulti(f.id, o.value)}
                      />
                      <span className="vx-widget-check" aria-hidden />
                      <span className="vx-widget-option-text">{o.display}</span>
                    </label>
                  );
                })}
              </div>
            )}

            {f.kind === 'text' && (
              <textarea
                className="vx-widget-text-input"
                aria-label={f.label}
                disabled={submitted}
                value={typeof values[f.id] === 'string' ? values[f.id] as string : ''}
                onChange={(event) => setOtherText(f.id, event.target.value)}
                placeholder={f.placeholder || t('Type here')}
                rows={3}
              />
            )}

            {(f.kind === 'visual' || f.kind === 'voice' || f.kind === 'scenario') && (
              <div className="vx-widget-visuals" role={f.multiple ? 'group' : 'radiogroup'} aria-label={f.label}>
                {f.options.map((o) => {
                  const on = f.multiple
                    ? Array.isArray(values[f.id]) && (values[f.id] as string[]).includes(o.value)
                    : values[f.id] === o.value;
                  return (
                    <button
                      key={o.value}
                      type="button"
                      role={f.multiple ? 'checkbox' : 'radio'}
                      aria-checked={on}
                      disabled={submitted}
                      className={`vx-widget-visual vx-widget-${f.kind}${on ? ' on' : ''}`}
                      onClick={() => selectRich(f, o.value)}
                    >
                      <span className="vx-widget-radio" aria-hidden />
                      <span className="vx-widget-visual-body">
                        <span className="vx-widget-visual-name">{o.name}</span>
                        {o.description ? <span className="vx-widget-visual-summary">{o.description}</span> : null}
                        <MediaPreview media={o.media} aspectRatio={o.aspectRatio} forceAudio={f.kind === 'voice'} label={o.name} />
                      </span>
                    </button>
                  );
                })}
                {!f.multiple && f.allowOther && (
                  <div className={`vx-widget-visual vx-widget-other${otherFields[f.id] ? ' on' : ''}`}>
                    <button
                      type="button"
                      role="radio"
                      aria-checked={!!otherFields[f.id]}
                      disabled={submitted}
                      className="vx-widget-other-button"
                      onClick={() => selectOther(f.id)}
                    >
                      <span className="vx-widget-radio" aria-hidden />
                      <span className="vx-widget-visual-name">{t('Other…')}</span>
                    </button>
                    {otherFields[f.id] && (
                      <input
                        type="text"
                        className="vx-widget-other-input"
                        disabled={submitted}
                        autoFocus
                        value={typeof values[f.id] === 'string' ? values[f.id] as string : ''}
                        onChange={(event) => setOtherText(f.id, event.target.value)}
                        placeholder={f.otherPlaceholder || t('Type here')}
                      />
                    )}
                  </div>
                )}
              </div>
            )}
          </section>
        ))}
      </div>

      <footer className="vx-widget-foot" aria-live="polite">
        {submitted ? (
          <span className="vx-widget-done">
            <span className="vx-widget-done-dot" />
            {t('Submitted')}
          </span>
        ) : (
          <span className="vx-widget-hint">{t('Choose and submit — the Agent continues with your picks')}</span>
        )}
        <button
          type="button"
          className="vx-widget-submit"
          onClick={handleSubmit}
          disabled={!canSubmit}
        >
          {submitted ? t('Submitted') : (submitLabel || t('Submit'))}
        </button>
      </footer>
    </div>
  );
}
