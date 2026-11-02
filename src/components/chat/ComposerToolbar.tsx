import type { MouseEvent as ReactMouseEvent } from 'react';
import { useT } from '../../i18n/locale';
import { theme } from '../../theme';
import { Icon, type IconName } from '../icons';
import type { ChatMode } from './ChatComposer';
import codexPng from '../../../assets/vendor-icons/codex-color.png';
import copilotSvg from '../../../assets/vendor-icons/copilot.svg?raw';
import claudeSvg from '../../../assets/vendor-icons/claude-color.svg';

export type ComposerPopover =
  | 'mode' | 'model' | 'skill' | 'settings' | 'assets' | 'templates' | 'more' | null;

interface ToolbarProps {
  mode: ChatMode;
  activeModel?: { providerLabel: string; model: string; backend: 'api' | 'codex' | 'copilot' | 'claude-code' };
  contextLabel: string;
  contextTitle: string;
  contextNearLimit: boolean;
  activeSkillName?: string;
  pop: ComposerPopover;
  selecting: boolean;
  enhancing: boolean;
  running: boolean;
  canEnhance: boolean;
  canSend: boolean;
  sendTitle: string;
  onTogglePop: (pop: ComposerPopover, anchor: HTMLElement) => void;
  onToggleSelecting: () => void;
  onEnhance: () => void;
  onSubmit: () => void;
  onStop: () => void;
}

function BarBtn({ icon, title, onClick, active, disabled, className, expanded, hasPopup }: {
  icon: IconName;
  title: string;
  onClick?: (event: ReactMouseEvent<HTMLButtonElement>) => void;
  active?: boolean;
  disabled?: boolean;
  className?: string;
  expanded?: boolean;
  hasPopup?: boolean;
}) {
  return (
    <button type="button" title={title} aria-label={title} onClick={onClick} disabled={disabled}
      aria-expanded={hasPopup ? expanded : undefined} aria-haspopup={hasPopup ? 'menu' : undefined}
      className={className}
      style={{ background: active ? theme.panelAlt : 'none', border: 'none', cursor: disabled ? 'default' : 'pointer', padding: '4px 5px', borderRadius: 4, display: 'flex', alignItems: 'center', gap: 2, lineHeight: 0, color: disabled ? theme.textDim : active ? theme.text : theme.textDim, opacity: disabled ? 0.45 : 1, flexShrink: 0 }}
      onMouseEnter={(event) => { if (!disabled) event.currentTarget.style.color = theme.text; }}
      onMouseLeave={(event) => { event.currentTarget.style.color = disabled ? theme.textDim : active ? theme.text : theme.textDim; }}>
      <Icon name={icon} size={16} />
    </button>
  );
}

export function ComposerToolbar({
  mode, activeModel, activeSkillName, contextLabel, contextTitle, contextNearLimit,
  pop, selecting, enhancing, running, canEnhance, canSend, sendTitle, onTogglePop,
  onToggleSelecting, onEnhance, onSubmit, onStop,
}: ToolbarProps) {
  const t = useT();
  const secondaryActive = selecting || !!activeSkillName
    || pop === 'settings' || pop === 'assets' || pop === 'skill' || pop === 'templates';
  return (
    <div className="vx-chat-composer-bar">
      <div className="vx-chat-composer-bar-tools">
        <button title={t('Mode')} onClick={(event) => onTogglePop('mode', event.currentTarget)}
          className="vx-chat-mode-btn"
          style={{ height: 28, display: 'flex', alignItems: 'center', gap: 3, padding: '0 3px', border: 0, borderRadius: 6, background: pop === 'mode' ? theme.panelAlt : 'transparent', color: theme.text, cursor: 'pointer', fontSize: 12, flexShrink: 0 }}>
          <Icon name="sparkles" size={15} /><span className="vx-chat-mode-label">{mode === 'agent' ? t('Agent') : t('Q&A')}</span><Icon name="chevronDown" size={11} />
        </button>
        <button type="button" className="vx-chat-model-btn"
          disabled={running}
          title={activeModel
            ? `${t('Current model: {name}', { name: `${activeModel.providerLabel} · ${activeModel.model}` })} · ${contextTitle}`
            : t('Choose model')}
          onClick={(event) => onTogglePop('model', event.currentTarget)}
          style={{ height: 28, minWidth: 0, maxWidth: 196, display: 'flex', alignItems: 'center', gap: 4, padding: '0 6px', border: 0, borderRadius: 4, background: pop === 'model' ? theme.panel : 'transparent', color: contextNearLimit ? theme.gold : theme.textDim, cursor: running ? 'default' : 'pointer', fontSize: 11, flexShrink: 1 }}>
          {activeModel?.backend === 'codex' || activeModel?.backend === 'claude-code' ? (
            <img
              src={activeModel.backend === 'codex' ? codexPng : claudeSvg}
              alt="" aria-hidden style={{ width: 15, height: 15, borderRadius: 4, objectFit: 'contain', flex: '0 0 auto' }}
            />
          ) : activeModel?.backend === 'copilot' ? (
            // Static codebase asset, non-user input — inlined so it inherits currentColor.
            <span aria-hidden dangerouslySetInnerHTML={{ __html: copilotSvg }}
              style={{ width: 15, height: 15, fontSize: 15, flex: '0 0 auto', display: 'inline-flex' }} />
          ) : (
            <Icon name="cloud" size={13} />
          )}
          <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{activeModel?.model ?? t('Model')}</span>
          {contextLabel && <span style={{ fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap', fontSize: 10 }}>{contextLabel}</span>}
          <Icon name="chevronDown" size={10} />
        </button>
        <span className="vx-composer-secondary">
          <BarBtn icon="sliders" title={t('Settings')} active={pop === 'settings'} onClick={(event) => onTogglePop('settings', event.currentTarget)} />
          <BarBtn icon="cursor" title={t('Selection mode: click clips / drag canvas / select transcript as references')} active={selecting} onClick={onToggleSelecting} />
          <BarBtn icon="plus" title={t('Reference media-pool assets')} active={pop === 'assets'} onClick={(event) => onTogglePop('assets', event.currentTarget)} />
          <BarBtn icon="wand" title={activeSkillName ? t('Creative mode: {name}', { name: activeSkillName }) : t('Creative mode')} active={pop === 'skill' || !!activeSkillName} onClick={(event) => onTogglePop('skill', event.currentTarget)} />
          <BarBtn icon="bookOpen" title={t('Reference template library')} active={pop === 'templates'} onClick={(event) => onTogglePop('templates', event.currentTarget)} />
          <BarBtn icon="sparkles" title={enhancing ? t('Enhancing…') : t('Enhance prompt')} disabled={!canEnhance} onClick={onEnhance} />
        </span>
        <BarBtn icon="more" title={t('More tools')} className="vx-composer-more-btn"
          active={pop === 'more' || secondaryActive}
          expanded={pop === 'more'} hasPopup
          onClick={(event) => onTogglePop('more', event.currentTarget)} />
      </div>
      {running ? (
        <button title={t('Stop')} onClick={onStop} className="vx-chat-send-btn"
          style={{ width: 28, height: 28, borderRadius: '50%', border: 'none', background: theme.accent, cursor: 'pointer', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
          <span style={{ width: 10, height: 10, background: theme.onAccent, borderRadius: 2 }} />
        </button>
      ) : (
        <button title={sendTitle} onClick={onSubmit} disabled={!canSend} className="vx-chat-send-btn"
          style={{ width: 28, height: 28, borderRadius: '50%', border: 'none', background: canSend ? theme.accent : theme.border, color: canSend ? theme.onAccent : theme.textDim, cursor: canSend ? 'pointer' : 'default', display: 'grid', placeItems: 'center', lineHeight: 0, flexShrink: 0 }}>
          <Icon name="arrowUp" size={16} strokeWidth={2.2} />
        </button>
      )}
    </div>
  );
}

interface MoreMenuProps {
  selecting: boolean;
  activeSkillName?: string;
  canEnhance: boolean;
  enhancing: boolean;
  onChoosePopover: (pop: Exclude<ComposerPopover, 'mode' | 'model' | 'more' | null>) => void;
  onToggleSelecting: () => void;
  onEnhance: () => void;
  onClose: () => void;
}

function MoreItem({ icon, label, active, disabled, onClick }: {
  icon: IconName; label: string; active?: boolean; disabled?: boolean; onClick: () => void;
}) {
  return (
    <button type="button" role="menuitem" className="vx-composer-more-item" disabled={disabled} onClick={onClick}>
      <Icon name={icon} size={15} />
      <span>{label}</span>
      {active && <Icon name="check" size={12} />}
    </button>
  );
}

export function ComposerMoreMenu({
  selecting, activeSkillName, canEnhance, enhancing,
  onChoosePopover, onToggleSelecting, onEnhance, onClose,
}: MoreMenuProps) {
  const t = useT();
  const run = (action: () => void) => { onClose(); action(); };
  return (
    <div className="vx-composer-more-menu" role="menu">
      <MoreItem icon="sliders" label={t('Settings')} onClick={() => onChoosePopover('settings')} />
      <MoreItem icon="cursor" label={t('Select reference')} active={selecting} onClick={() => run(onToggleSelecting)} />
      <MoreItem icon="plus" label={t('Reference media-pool assets')} onClick={() => onChoosePopover('assets')} />
      <MoreItem icon="wand" label={activeSkillName ? t('Creative mode: {name}', { name: activeSkillName }) : t('Creative mode')}
        active={!!activeSkillName} onClick={() => onChoosePopover('skill')} />
      <MoreItem icon="bookOpen" label={t('Reference template library')} onClick={() => onChoosePopover('templates')} />
      <MoreItem icon="sparkles" label={enhancing ? t('Enhancing…') : t('Enhance prompt')}
        disabled={!canEnhance} onClick={() => run(onEnhance)} />
    </div>
  );
}
