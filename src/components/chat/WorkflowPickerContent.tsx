import { localizedCatalogText, useT } from '../../i18n/locale';
import { CREATIVE_SKILLS, allCreativeSkills } from '../../agent/skills/skills-catalog';
import { Icon } from '../icons';

interface WorkflowPickerContentProps {
  creativeMode: string | null;
  onCreativeModeChange: (id: string | null) => void;
  onRequestFocus: () => void;
  onClose: () => void;
}

export function WorkflowPickerContent({
  creativeMode,
  onCreativeModeChange,
  onRequestFocus,
  onClose,
}: WorkflowPickerContentProps) {
  const t = useT();
  const builtinIds = new Set(CREATIVE_SKILLS.map((skill) => skill.id));
  const skillName = (skill: { name: string; nameZh: string }) => (
    localizedCatalogText(skill.name, skill.nameZh)
  );

  return (
    <>
      <div className="vx-creative-picker-head">
        <span><Icon name="wand" size={15} /></span>
        <div>
          <strong>{t('Choose a creative workflow')}</strong>
          <small>{t('The workflow guides the Agent\'s planning and tool use.')}</small>
        </div>
      </div>
      <button
        type="button"
        onClick={() => { onCreativeModeChange(null); onClose(); }}
        className="vx-creative-mode-row"
        data-active={!creativeMode}
        aria-pressed={!creativeMode}
      >
        <span className="vx-creative-mode-icon"><Icon name="sparkles" size={15} /></span>
        <span className="vx-creative-mode-copy">
          <strong>{t('Freeform')}</strong>
          <small>{t('Work flexibly from the current goal without a fixed workflow.')}</small>
        </span>
        {!creativeMode && <span className="vx-creative-mode-check"><Icon name="check" size={13} strokeWidth={2.4} /></span>}
      </button>
      <div className="vx-creative-picker-section">{t('Specialized workflows')}</div>
      <div className="vx-creative-mode-grid">
        {allCreativeSkills().map((skill) => (
          <button
            type="button"
            key={skill.id}
            onClick={() => {
              // Selecting a workflow activates it without touching the
              // composer text — the user writes their own task.
              onCreativeModeChange(skill.id);
              onRequestFocus();
              onClose();
            }}
            className="vx-creative-mode-row vx-creative-mode-card"
            data-active={creativeMode === skill.id}
            aria-pressed={creativeMode === skill.id}
            title={t(skill.summary)}
          >
            <span className="vx-creative-mode-icon"><Icon name="wand" size={15} /></span>
            <span className="vx-creative-mode-copy">
              <span className="vx-creative-mode-title">
                <strong>{skillName(skill)}</strong>
                {!builtinIds.has(skill.id) && <em>{t('Custom')}</em>}
              </span>
              <small>{t(skill.summary)}</small>
            </span>
            {creativeMode === skill.id && <span className="vx-creative-mode-check"><Icon name="check" size={13} strokeWidth={2.4} /></span>}
          </button>
        ))}
      </div>
    </>
  );
}
