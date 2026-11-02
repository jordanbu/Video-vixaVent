import { Component, type CSSProperties, type ErrorInfo, type ReactNode } from 'react';
import { theme } from '../theme';

type Translate = (zh: string, params?: Record<string, string | number>) => string;

const BODY_TEXT: CSSProperties = { color: theme.textDim, fontSize: 12.5, lineHeight: 1.6 };

const buttonStyle = (primary: boolean): CSSProperties => ({
  padding: '6px 14px', borderRadius: 6, border: `0.5px solid ${theme.border}`,
  background: primary ? theme.accent : 'transparent', color: primary ? theme.bg : theme.text,
  fontSize: 12.5, cursor: 'pointer',
});

// Same full-page layout as the "project data is unreadable" screen in AppViews.
function GuardScreen({ title, children, actions }: { title: string; children: ReactNode; actions: ReactNode }) {
  return (
    <div style={{
      height: '100vh', display: 'grid', placeItems: 'center', background: theme.bg,
      fontFamily: 'Instrument Sans, Geist, system-ui, sans-serif',
    }}>
      <div style={{
        display: 'grid', gap: 10, justifyItems: 'center', maxWidth: 460, padding: '0 16px', textAlign: 'center',
      }}>
        <b style={{ color: theme.text, fontSize: 14 }}>{title}</b>
        {children}
        <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>{actions}</div>
      </div>
    </div>
  );
}

interface SecureContextRequiredViewProps {
  origin: string;
  translate: Translate;
  onHome: () => void;
}

/** Stands in for the editor when the page is not a secure context (see editorAccess). */
export function SecureContextRequiredView({ origin, translate, onHome }: SecureContextRequiredViewProps) {
  return (
    <GuardScreen
      title={translate('The editor requires localhost or HTTPS')}
      actions={(
        <button type="button" onClick={onHome} style={buttonStyle(true)}>
          {translate('Back to projects')}
        </button>
      )}
    >
      <span style={BODY_TEXT}>
        {translate('This address is not a secure context, so the browser disables Web Crypto, WebCodecs video decoding, the clipboard, and other capabilities the editor relies on. Open http://localhost or http://127.0.0.1 on the computer running Vixaventora, or serve it over HTTPS.')}
      </span>
      <span style={{ ...BODY_TEXT, color: theme.textMuted, wordBreak: 'break-all' }}>
        {translate('Current address: {origin}', { origin })}
      </span>
    </GuardScreen>
  );
}

interface EditorErrorBoundaryProps {
  translate: Translate;
  onHome: () => void;
  children: ReactNode;
}

interface EditorErrorBoundaryState {
  error: Error | null;
}

/**
 * Keeps an editor chunk that fails to fetch or evaluate, or a render crash inside the
 * editor, from unmounting the whole app into a blank page.
 */
export class EditorErrorBoundary extends Component<EditorErrorBoundaryProps, EditorErrorBoundaryState> {
  state: EditorErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: unknown): EditorErrorBoundaryState {
    return { error: error instanceof Error ? error : new Error(String(error)) };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('[editor] failed to load or render:', error, info.componentStack);
  }

  render(): ReactNode {
    const { error } = this.state;
    if (!error) return this.props.children;
    const { translate, onHome } = this.props;
    return (
      <GuardScreen
        title={translate('The editor ran into an error')}
        actions={(
          <>
            <button type="button" onClick={() => window.location.reload()} style={buttonStyle(true)}>
              {translate('Reload')}
            </button>
            <button type="button" onClick={onHome} style={buttonStyle(false)}>
              {translate('Back to projects')}
            </button>
          </>
        )}
      >
        <span style={{ ...BODY_TEXT, wordBreak: 'break-word' }}>{error.message}</span>
      </GuardScreen>
    );
  }
}
