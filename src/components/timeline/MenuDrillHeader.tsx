import { t } from '../../i18n/locale';

export function MenuDrillHeader({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <button type="button" className="vx-menu-drill-header" aria-label={t('Back to {title}', { title })} onClick={onBack}>
      <span aria-hidden>‹</span>
      <span>{title}</span>
    </button>
  );
}
