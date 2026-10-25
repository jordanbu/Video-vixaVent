import { useT } from '../i18n/locale';

type DesktopWindowAction = 'close' | 'minimize' | 'toggle-maximize';

interface DesktopWindowControlButtonsProps {
  translate: (text: string) => string;
  onAction: (action: DesktopWindowAction) => void;
}

export function DesktopWindowControlButtons({
  translate,
  onAction,
}: DesktopWindowControlButtonsProps) {
  return (
    <div className="vx-window-controls" aria-label={translate('窗口控制')}>
      <button
        type="button"
        className="vx-window-control vx-window-control--close vx-tip"
        aria-label={translate('关闭窗口')}
        data-tip={translate('关闭窗口')}
        onClick={() => onAction('close')}
      >
        <span className="vx-window-control-glyph" aria-hidden="true">×</span>
      </button>
      <button
        type="button"
        className="vx-window-control vx-window-control--minimize vx-tip"
        aria-label={translate('最小化窗口')}
        data-tip={translate('最小化窗口')}
        onClick={() => onAction('minimize')}
      >
        <span className="vx-window-control-glyph" aria-hidden="true">−</span>
      </button>
      <button
        type="button"
        className="vx-window-control vx-window-control--maximize vx-tip"
        aria-label={translate('缩放窗口')}
        data-tip={translate('缩放窗口')}
        onClick={() => onAction('toggle-maximize')}
      >
        <span className="vx-window-control-glyph" aria-hidden="true">+</span>
      </button>
    </div>
  );
}

export function DesktopWindowControls() {
  const t = useT();
  const desktop = window.vixaventoraDesktop;
  if (desktop?.platform !== 'darwin') return null;

  return (
    <DesktopWindowControlButtons
      translate={t}
      onAction={(action) => { void desktop.windowAction(action); }}
    />
  );
}
