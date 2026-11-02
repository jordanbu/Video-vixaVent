import { useRef } from 'react';
import type { TrackKind } from '../../editor/types';
import type { EditorCommands } from '../../editor/store';
import { useT } from '../../i18n/locale';
import { useDismissableDetails } from '../../hooks/useDismissableDetails';
import { Icon, type IconName } from '../icons';

const OPTIONS: Array<{ kind: TrackKind; label: string; icon: IconName }> = [
  { kind: 'video', label: 'Video track', icon: 'film' },
  { kind: 'audio', label: 'Audio / music track', icon: 'volume' },
  { kind: 'caption', label: 'Caption track', icon: 'captions' },
];

export function TrackCreateControl({ commands }: { commands: EditorCommands }) {
  const t = useT();
  const ref = useRef<HTMLDetailsElement>(null);
  useDismissableDetails(ref);
  const create = (kind: TrackKind) => {
    commands.createTrack(kind);
    if (ref.current) ref.current.open = false;
  };
  const createTimeline = () => {
    commands.createTimeline();
    if (ref.current) ref.current.open = false;
  };
  return (
    <details ref={ref} className="vx-track-create" onBlur={(event) => {
      if (!event.currentTarget.contains(event.relatedTarget as Node | null)) event.currentTarget.open = false;
    }}>
      <summary className="vx-tip" data-tip={t('New track')} aria-label={t('New track')}>
        <Icon name="plus" size={16} />
      </summary>
      <div className="vx-track-create-menu">
        <div className="vx-track-create-title">{t('New track')}</div>
        {OPTIONS.map((option) => (
            <button key={option.kind} onClick={() => create(option.kind)}>
              <Icon name={option.icon} size={14} />
              <span>{t(option.label)}</span>
            </button>
        ))}
        <div className="vx-track-create-separator" />
        <button onClick={createTimeline}>
          <Icon name="plus" size={14} />
          <span>{t('New sequence')}</span>
        </button>
      </div>
    </details>
  );
}
