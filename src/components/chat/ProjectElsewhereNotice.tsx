import type { ExternalProposalController } from '../../agent/useExternalAgentBridge';
import { useT } from '../../i18n/locale';
import { theme, themeAlpha } from '../../theme';
import { Icon } from '../icons';

const noticeStyle = {
  position: 'fixed',
  top: 49,
  left: '50%',
  transform: 'translateX(-50%)',
  zIndex: 180,
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  width: 'max-content',
  maxWidth: 'min(560px, calc(100vw - 36px))',
  padding: '9px 10px 9px 12px',
  border: `0.5px solid ${theme.border}`,
  borderRadius: 5,
  background: theme.panel,
  color: theme.text,
  boxShadow: `0 10px 28px ${themeAlpha.shadow(0.3)}`,
  fontSize: 12.5,
  lineHeight: 1.45,
} as const;

const actionStyle = {
  flex: '0 0 auto',
  padding: '5px 10px',
  border: `0.5px solid ${theme.accent}`,
  borderRadius: 4,
  background: 'none',
  color: theme.text,
  font: 'inherit',
  fontSize: 12,
  cursor: 'pointer',
} as const;

/** Non-blocking notice for a tab whose project is being edited in another tab or
 * browser (spec 07). Shown whether the chat panel is open or collapsed. */
export function ProjectElsewhereNotice({ external }: { external: ExternalProposalController }) {
  const t = useT();
  const notice = external.ownershipNotice;
  if (!notice) return null;
  const reload = notice === 'reload-required';
  return (
    <div role="status" aria-live="polite" style={noticeStyle} data-vx-project-elsewhere={notice}>
      <span style={{ color: theme.textDim, lineHeight: 0 }}><Icon name="info" size={14} /></span>
      <span style={{ flex: 1, minWidth: 0 }}>
        {reload
          ? t('The project changed in another tab. Reload this page to continue here.')
          : t('This project is open in another tab. Agent changes are applied there.')}
      </span>
      <button
        type="button"
        style={actionStyle}
        onClick={reload ? () => window.location.reload() : external.takeOwnership}
      >
        {reload ? t('Reload') : t('Use in this tab')}
      </button>
    </div>
  );
}
