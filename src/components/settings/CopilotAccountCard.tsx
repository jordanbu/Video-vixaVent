import { useT } from '../../i18n/locale';
import { theme } from '../../theme';
import type { CopilotSettingsController } from './useCopilotSettings';

type AccountState = 'loading' | 'missing' | 'unsupported' | 'signed-out' | 'signed-in' | 'error';

function accountState(controller: CopilotSettingsController): AccountState {
  const { status } = controller;
  if (controller.loading && !status) return 'loading';
  if (!status) return 'error';
  if (!status.installed) return 'missing';
  if (!status.supported) return 'unsupported';
  if (status.authenticated) return 'signed-in';
  if (controller.error) return 'error';
  return 'signed-out';
}

const DOT: Record<AccountState, string> = {
  loading: theme.textDim,
  missing: theme.danger,
  unsupported: theme.danger,
  'signed-out': theme.textDim,
  'signed-in': theme.accent,
  error: theme.danger,
};

/**
 * Copilot credentials live in the CLI, so this card is read-only: it reports
 * install/auth state and points at the terminal command instead of offering an
 * in-app sign-in that Vixaventora cannot own.
 */
export function CopilotAccountCard({ controller }: {
  controller: CopilotSettingsController;
}) {
  const t = useT();
  const state = accountState(controller);
  const status = controller.status;
  const copy: Record<AccountState, readonly [string, string]> = {
    loading: [t('Checking Copilot CLI…'), t('Reading the local Copilot runtime status.')],
    missing: [
      t('Copilot CLI was not found'),
      t('Install it and retry: npm i -g @github/copilot (or brew install copilot).'),
    ],
    unsupported: [t('Copilot CLI is out of date'), t('Run `copilot update` in a terminal, then retry.')],
    'signed-out': [t('Not signed in to Copilot'), t('Run `copilot login` in a terminal, then refresh.')],
    'signed-in': [t('Signed in to GitHub Copilot'), t('Credentials and renewal are managed by the Copilot CLI.')],
    error: [t('Could not reach Copilot'), t('Make sure the development server is running, then retry.')],
  };
  const [title, detail] = copy[state];
  return (
    <section style={card} aria-live="polite">
      <div style={summaryRow}>
        <span style={{ ...statusDot, background: DOT[state] }} />
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={summaryTitle}>{title}</div>
          <div style={summaryDetail}>{detail}</div>
          {state === 'signed-in' && status?.account && (
            <div style={metadata}>
              {status.account.login && <span>{t('Account')}: {status.account.login}</span>}
              {status.account.authType && <span>{t('Sign-in method')}: {status.account.authType}</span>}
              {status.account.host && <span>{t('Host')}: {status.account.host}</span>}
            </div>
          )}
        </div>
        {status?.version && <span style={versionTag}>v{status.version}</span>}
      </div>
      <div style={actions}>
        <button type="button" style={button} disabled={controller.loading}
          onClick={() => { void controller.refresh(); }}>
          {controller.loading ? t('Refreshing…') : t('Refresh status')}
        </button>
        {state === 'signed-in' && (
          <button type="button" style={button} disabled={controller.modelBusy}
            onClick={() => { void controller.discoverModels(); }}>
            {controller.modelBusy ? t('Loading…') : t('Load models')}
          </button>
        )}
      </div>
      {(controller.error ?? status?.error) && (
        <div role="alert" style={errorText}>{controller.error ?? status?.error}</div>
      )}
      {controller.modelError && <div role="alert" style={errorText}>{controller.modelError}</div>}
    </section>
  );
}

const card: React.CSSProperties = {
  display: 'flex', flexDirection: 'column', gap: 10, padding: '11px 13px',
  background: theme.bg, border: `0.5px solid ${theme.border}`, borderRadius: 4,
};
const summaryRow: React.CSSProperties = { display: 'flex', alignItems: 'flex-start', gap: 9 };
const statusDot: React.CSSProperties = {
  width: 8, height: 8, marginTop: 4, borderRadius: '50%', flex: '0 0 auto',
};
const summaryTitle: React.CSSProperties = {
  color: theme.text, fontSize: 12, fontWeight: 600, lineHeight: 1.35,
};
const summaryDetail: React.CSSProperties = {
  marginTop: 2, color: theme.textDim, fontSize: 10.5, lineHeight: 1.45,
};
const versionTag: React.CSSProperties = {
  flex: '0 0 auto', padding: '1px 5px', border: `0.5px solid ${theme.border}`,
  borderRadius: 4, color: theme.textDim, fontSize: 10.5,
};
const metadata: React.CSSProperties = {
  display: 'flex', flexWrap: 'wrap', gap: '2px 9px', marginTop: 5, color: theme.textMuted,
  fontSize: 10.5, lineHeight: 1.35, overflowWrap: 'anywhere',
};
const actions: React.CSSProperties = {
  display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 6,
};
const button: React.CSSProperties = {
  minHeight: 28, padding: '4px 9px', border: `0.5px solid ${theme.border}`, borderRadius: 4,
  font: 'inherit', fontSize: 10.5, fontWeight: 500,
};
const errorText: React.CSSProperties = {
  paddingTop: 7, borderTop: `0.5px solid ${theme.border}`, color: theme.danger,
  fontSize: 10.5, lineHeight: 1.45,
};
