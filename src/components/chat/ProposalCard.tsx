import { useState } from 'react';
import type { Proposal } from '../../agent/proposal';
import { useT } from '../../i18n/locale';
import { Icon } from '../icons';

export function ProposalCard({ proposal, onApply, onReject, onPreview, stale, onForceApply, onRePropose }: {
  proposal: Proposal;
  onApply: (selected: Set<number>) => void;
  onReject: () => void;
  onPreview: (on: boolean) => void;
  /** Proposal expiration (staleness): Real time footer change, still apply/re-propose/cancel three choices */
  stale?: boolean;
  onForceApply?: (selected: Set<number>) => void;
  onRePropose?: () => void;
}) {
  const t = useT();
  const ops = proposal.options[0].operations;
  const [selected, setSelected] = useState<Set<number>>(() => new Set(ops.map((_, i) => i)));
  const [preview, setPreview] = useState(false);

  const toggle = (i: number) =>
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(i)) n.delete(i);
      else n.add(i);
      return n;
    });
  const selectAll = () => setSelected(new Set(ops.map((_, i) => i)));
  const selectNone = () => setSelected(new Set());
  const togglePreview = () => {
    const on = !preview;
    setPreview(on);
    onPreview(on);
  };
  const apply = () => { onPreview(false); onApply(selected); };
  const reject = () => { onPreview(false); onReject(); };

  const allOn = selected.size === ops.length;
  const noneOn = selected.size === 0;

  return (
    <div className="vx-proposal">
      <header className="vx-proposal-head">
        <div className="vx-proposal-head-left">
          <span className="vx-proposal-icon" aria-hidden>
            <Icon name="sparkles" size={14} />
          </span>
          <div className="vx-proposal-titles">
            <div className="vx-proposal-title-row">
              <h3 className="vx-proposal-title">{proposal.title || t('编辑提案')}</h3>
              <span className="vx-proposal-badge">{t('待确认')}</span>
            </div>
            {proposal.summary ? (
              <p className="vx-proposal-summary">{proposal.summary}</p>
            ) : null}
          </div>
        </div>
        {proposal.totalImpact ? (
          <span className="vx-proposal-impact" title={t('影响范围')}>{proposal.totalImpact}</span>
        ) : null}
      </header>

      <div className="vx-proposal-ops-bar">
        <span className="vx-proposal-ops-label">
          {t('将执行')} <strong>{selected.size}</strong> {t('/ {total} 项', { total: ops.length })}
        </span>
        <div className="vx-proposal-ops-actions">
          <button type="button" className="vx-proposal-link" onClick={selectAll} disabled={allOn}>{t('全选')}</button>
          <button type="button" className="vx-proposal-link" onClick={selectNone} disabled={noneOn}>{t('清空')}</button>
        </div>
      </div>

      <ul className="vx-proposal-list">
        {ops.map((op, i) => {
          const on = selected.has(i);
          return (
            <li key={i} className={`vx-proposal-op${on ? '' : ' off'}`}>
              <label className="vx-proposal-op-label">
                <input
                  type="checkbox"
                  className="vx-proposal-check"
                  checked={on}
                  onChange={() => toggle(i)}
                />
                <span className="vx-proposal-check-ui" aria-hidden />
                <span className="vx-proposal-op-body">
                  <span className="vx-proposal-op-main">
                    <span className="vx-proposal-op-action">
                      {op.action}{(op.callCount ?? 1) > 1 ? ` ×${op.callCount}` : ''}
                    </span>
                    <span className="vx-proposal-op-target" title={op.target}>{op.target}</span>
                  </span>
                  <span className="vx-proposal-op-meta">
                    <span className="vx-proposal-tool">{op.tool}</span>
                    {op.impact ? <span className="vx-proposal-op-impact">{op.impact}</span> : null}
                  </span>
                </span>
              </label>
            </li>
          );
        })}
      </ul>

      {stale && (
        <div className="vx-proposal-warning" role="alert">
          {t('工程已在提案生成后发生变化：直接应用可能落错位置。')}
        </div>
      )}
      <footer className="vx-proposal-foot">
        <button
          type="button"
          className={`vx-proposal-preview${preview ? ' on' : ''}`}
          onClick={togglePreview}
          title={t('在预览窗查看提案结果（不改正式时间线）')}
        >
          <span className="vx-proposal-preview-dot" />
          {preview ? t('预览中') : t('预览结果')}
        </button>
        <div className="vx-proposal-foot-right">
          <button type="button" className="vx-proposal-reject" onClick={reject}>{stale ? t('取消') : t('拒绝')}</button>
          {stale ? (
            <>
              {onRePropose && (
                <button type="button" className="vx-proposal-reject" onClick={() => { onPreview(false); onRePropose(); }}>{t('重新提案')}</button>
              )}
              <button type="button" className="vx-proposal-apply" disabled={noneOn}
                onClick={() => { onPreview(false); onForceApply?.(selected); }}>
                {t('仍然应用')}
              </button>
            </>
          ) : (
            <button
              type="button"
              className="vx-proposal-apply"
              disabled={noneOn}
              onClick={apply}
            >
              {t('应用')}{noneOn ? '' : ` ${selected.size}`}
            </button>
          )}
        </div>
      </footer>
    </div>
  );
}
