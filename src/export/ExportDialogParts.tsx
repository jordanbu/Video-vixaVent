import type { ReactNode } from 'react';
import { useT } from '../i18n/locale';
import { Icon, type IconName } from '../components/icons';
import { qualityPercent, type QualityIssue } from '../editor/qualityAlerts';
import type { ExportQaIssue } from './quality';
import type { ExportQaUiState } from './useExportWorkflow';

export function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="vx-export-field">
      <span>{label}</span>
      {children}
    </div>
  );
}

export function InfoCard({ icon, title, text }: { icon: IconName; title: string; text: string }) {
  return (
    <div className="vx-export-info">
      <span><Icon name={icon} size={19} /></span>
      <div>
        <strong>{title}</strong>
        <p>{text}</p>
      </div>
    </div>
  );
}

const QA_ISSUE_LABELS: Record<string, string> = {
  missing_video: 'The export is missing a video stream',
  duration_mismatch: 'The export duration does not match the timeline',
  resolution_mismatch: 'The export resolution does not match the settings',
  fps_mismatch: 'The export frame rate does not match the settings',
  missing_audio: 'The export is missing the expected audio stream',
  black_frames: 'Unexpected black frames detected',
  frozen_frames: 'A long frozen span was detected',
  long_silence: 'A long silent span was detected',
  audio_peak: 'Audio peaks are close to clipping',
  caption_safe_area_horizontal: 'Captions cross the horizontal safe area',
  caption_safe_area_vertical: 'Captions cross the vertical safe area',
};

function qaIssueLabel(issue: ExportQaIssue, translate: ReturnType<typeof useT>): string {
  const label = translate(QA_ISSUE_LABELS[issue.code] ?? issue.message);
  if (issue.startSeconds === undefined) return label;
  const end = issue.endSeconds ?? issue.startSeconds;
  return `${label} · ${issue.startSeconds.toFixed(2)}–${end.toFixed(2)}s`;
}

export function ExportQaCard({ qa }: { qa: ExportQaUiState }) {
  const t = useT();
  if (qa.status === 'running') {
    return <div className="vx-export-qa-card running"><strong>{t('Automatically checking the exported video…')}</strong></div>;
  }
  if (qa.status === 'error') {
    return (
      <div className="vx-export-qa-card error">
        <strong>{t('Automatic quality check did not finish')}</strong>
        <p>{t('The video will still download normally; export it again later to recheck it.')} {qa.message}</p>
      </div>
    );
  }
  const report = qa.report!;
  return (
    <div className={`vx-export-qa-card ${qa.status}`}>
      <div className="vx-export-qa-summary">
        <strong>{qa.status === 'passed' ? t('Automatic quality check passed') : t('Automatic quality check found issues')}</strong>
        <span>{t('{errors} errors · {warnings} warnings', {
          errors: report.summary.errors,
          warnings: report.summary.warnings,
        })}</span>
      </div>
      {qa.attempts > 1 && <p>{t('Check completed on attempt {n}', { n: qa.attempts })}</p>}
      {report.issues.length > 0 && (
        <ul>
          {report.issues.map((issue, index) => (
            <li key={`${issue.code}-${issue.startSeconds ?? index}`} className={issue.severity}>
              {qaIssueLabel(issue, t)}
            </li>
          ))}
        </ul>
      )}
      {qa.evidenceUrl && (
        <details>
          <summary>{t('View before/after edit-point evidence')}</summary>
          <img src={qa.evidenceUrl} alt={t('Before/after edit-point frame comparison')} />
        </details>
      )}
    </div>
  );
}

/**
 * Before exporting: how many clips will look enlarged at the chosen resolution,
 * and whether that resolution is above every source. Informs only — the export
 * button never depends on it.
 */
export function ExportSourceQualityCard({ issues, resolution }: { issues: readonly QualityIssue[]; resolution: string }) {
  const t = useT();
  const upscaled = issues.filter((issue) => issue.code === 'upscaled_clip');
  const aboveSources = issues.find((issue) => issue.code === 'export_above_sources');
  if (!upscaled.length && !aboveSources) return null;
  const pct = qualityPercent(Math.max(...upscaled.map((issue) => issue.factor)));
  return (
    <div className="vx-export-qa-card issues" role="status">
      <strong>{t('Source quality')}</strong>
      <ul>
        {upscaled.length > 0 && (
          <li className={upscaled.some((issue) => issue.severity === 'alert') ? 'error' : undefined}>
            {upscaled.length === 1
              ? t('1 clip will look upscaled (up to {pct}%)', { pct })
              : t('{n} clips will look upscaled (up to {pct}%)', { n: upscaled.length, pct })}
          </li>
        )}
        {aboveSources && (
          <li className={aboveSources.severity === 'alert' ? 'error' : undefined}>
            {t('Exporting at {resolution} adds no quality: the largest source is {source}', {
              resolution,
              source: `${aboveSources.sourceShortSide}p`,
            })}
          </li>
        )}
      </ul>
      <p>{t('Just a heads-up; it does not block the export.')}</p>
    </div>
  );
}

export function Segmented<T extends string | number>({ options, value, onChange }: {
  options: ReadonlyArray<{ value: T; label: string }>;
  value: T;
  onChange: (value: T) => void;
}) {
  const t = useT();
  return (
    <div className="vx-export-segmented">
      {options.map((option) => (
        <button
          type="button"
          key={String(option.value)}
          className={`vx-export-seg${option.value === value ? ' active' : ''}`}
          aria-pressed={option.value === value}
          onClick={() => onChange(option.value)}
        >
          {t(option.label)}
        </button>
      ))}
    </div>
  );
}
