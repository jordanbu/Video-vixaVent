import { memo } from 'react';
import { tData, useT } from '../i18n/locale';
import { ratioLabel } from '../editor/types';
import type { Tpl } from '../types';
import { Icon } from '../components/icons';
import { setLibraryDrag } from './drag';

interface TemplateCardProps {
  template: Tpl;
  favorite: boolean;
  menuOpen: boolean;
  onAdd: (template: Tpl) => void;
  onRemember: (template: Tpl) => void;
  onToggleFavorite: (id: string) => void;
  onOpenMenu: (id: string, anchor: HTMLElement) => void;
  onOpenMenuAtPoint: (id: string, clientX: number, clientY: number) => void;
  onFocusChange: (id: string | null) => void;
  onDragChange: (id: string | null) => void;
}

export const TemplateCard = memo(function TemplateCard({
  template,
  favorite,
  menuOpen,
  onAdd,
  onRemember,
  onToggleFavorite,
  onOpenMenu,
  onOpenMenuAtPoint,
  onFocusChange,
  onDragChange,
}: TemplateCardProps) {
  const t = useT();
  const portrait = (template.height ?? 0) > (template.width ?? 1);
  return (
    <div
      className={`vx-template-card${favorite ? ' favorite' : ''}${menuOpen ? ' menu-open' : ''}`}
      draggable
      onDragStart={(event) => {
        onDragChange(template.id);
        onRemember(template);
        setLibraryDrag(event, {
          kind: 'template',
          id: template.id,
          name: template.name,
          ...(template.id.startsWith('plugin:') ? { data: template } : {}),
        });
      }}
      onDragEnd={() => onDragChange(null)}
      onContextMenu={(event) => {
        event.preventDefault();
        onOpenMenuAtPoint(template.id, event.clientX, event.clientY);
      }}
      onFocusCapture={() => onFocusChange(template.id)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) onFocusChange(null);
      }}
    >
      <div
        className="vx-template-add"
        title={t('Drag to the timeline, or use the add button: {name}', { name: template.name })}
      >
        <div className="vx-template-thumb">
          {template.thumb ? (
            <>
              {portrait && (
                <img
                  className="vx-template-thumb-backdrop"
                  src={template.thumb}
                  alt=""
                  aria-hidden
                  loading="lazy"
                  draggable={false}
                />
              )}
              <img
                className={`vx-template-thumb-image${portrait ? ' portrait' : ''}`}
                src={template.thumb}
                alt={tData(template.name)}
                loading="lazy"
                draggable={false}
              />
            </>
          ) : (
            <span className="vx-template-thumb-missing">+</span>
          )}
        </div>
        <div className="vx-template-meta">
          <span className="vx-template-name">{tData(template.name)}</span>
          <span className="vx-template-ratio">{ratioLabel(template.width, template.height)}</span>
        </div>
      </div>
      <button
        type="button"
        className="vx-template-favorite"
        onClick={(event) => {
          event.stopPropagation();
          onToggleFavorite(template.id);
        }}
        title={favorite ? t('Unfavorite') : t('Favorite')}
      >
        <Icon name="star" size={12} filled={favorite} />
      </button>
      <button
        type="button"
        className="vx-template-more"
        onClick={(event) => {
          event.stopPropagation();
          onAdd(template);
        }}
        title={t('Add to timeline: {name}', { name: template.name })}
        aria-label={t('Add to timeline: {name}', { name: template.name })}
      >
        <Icon name="plus" size={14} />
      </button>
      <button
        type="button"
        className="vx-template-more"
        style={{ top: 32 }}
        onClick={(event) => {
          event.stopPropagation();
          onOpenMenu(template.id, event.currentTarget);
        }}
        title={t('More actions')}
        aria-expanded={menuOpen}
      >
        ⋮
      </button>
    </div>
  );
});
