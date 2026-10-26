import { theme } from '../../theme';
import { qualityPercent, type QualityIssue } from '../../editor/qualityAlerts';
import { useT } from '../../i18n/locale';

/** One line when the selected clip is enlarged past its source pixels: why, and what to do about it. */
export function SourceQualityStatus({ issue }: { issue: QualityIssue | null }) {
  const t = useT();
  if (!issue) return null;
  const alert = issue.severity === 'alert';
  return (
    <div role="status" aria-live="polite" style={{
      display: 'flex', alignItems: 'flex-start', gap: 6, minHeight: 24,
      padding: '4px 6px', border: `0.5px solid ${alert ? theme.danger : theme.gold}`,
      borderRadius: 4, color: theme.text, background: theme.panelAlt, fontSize: 10.5, lineHeight: 1.35,
    }}>
      <span aria-hidden="true" style={{ width: 6, height: 6, marginTop: 4, borderRadius: '50%', flex: '0 0 auto', background: alert ? theme.danger : theme.gold }} />
      <span>{t('放大到 {pct}%，可能会模糊。请降低缩放或比例，或换用更高分辨率的素材。', { pct: qualityPercent(issue.factor) })}</span>
    </div>
  );
}
