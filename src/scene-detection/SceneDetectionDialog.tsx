import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import type { EditorCommands } from '../editor/store';
import type { TimelineItem, TimelineState } from '../editor/types';
import { Icon } from '../components/icons';
import { useT } from '../i18n/locale';
import { mapScenesToItem, sceneMarkerActions, sceneSplitActions } from './apply';
import {
  cancelSceneDetectionJob,
  getSceneDetectionJob,
  startSceneDetectionJob,
  type SceneDetectionJobSnapshot,
} from './jobs';
import './scene-detection.css';

interface SceneDetectionDialogProps {
  state: TimelineState;
  commands: EditorCommands;
  item: TimelineItem;
  onClose: () => void;
}

const ACTIVE = new Set(['queued', 'probing', 'detecting', 'finalizing']);

function formatTime(timeMs: number): string {
  const seconds = Math.max(0, timeMs) / 1000;
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${(seconds % 60).toFixed(2).padStart(5, '0')}`;
}

export function SceneDetectionDialog({ state, commands, item, onClose }: SceneDetectionDialogProps) {
  const t = useT();
  const [threshold, setThreshold] = useState(0.3);
  const [minSceneSeconds, setMinSceneSeconds] = useState(0.75);
  const [maxScenes, setMaxScenes] = useState(200);
  const [job, setJob] = useState<SceneDetectionJobSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [applied, setApplied] = useState<'markers' | 'split' | null>(null);
  const running = !!job && ACTIVE.has(job.status);
  const locked = !!state.tracks?.[item.track]?.locked;
  const jobId = job?.id;
  const jobStatus = job?.status;

  useEffect(() => {
    if (!jobId || !jobStatus || !ACTIVE.has(jobStatus)) return;
    let disposed = false;
    const timer = window.setInterval(() => {
      void getSceneDetectionJob(jobId).then((next) => {
        if (!disposed) setJob(next);
      }).catch((cause) => {
        if (!disposed) setError(cause instanceof Error ? cause.message : String(cause));
      });
    }, 300);
    return () => {
      disposed = true;
      window.clearInterval(timer);
    };
  }, [jobId, jobStatus]);

  const evidence = useMemo(() => job?.result?.scenes ?? [], [job?.result?.scenes]);
  const mapped = useMemo(
    () => mapScenesToItem(evidence, item, state.fps),
    [evidence, item, state.fps],
  );
  const mappedTimes = useMemo(() => new Set(mapped.map((scene) => scene.timeMs)), [mapped]);

  const start = async () => {
    if (!item.src?.startsWith('/media/uploads/')) {
      setError(t('Scene detection requires a video saved in the local media library'));
      return;
    }
    setError(null);
    setApplied(null);
    try {
      setJob(await startSceneDetectionJob({
        src: item.src,
        threshold,
        minSceneMs: Math.round(minSceneSeconds * 1000),
        maxScenes,
      }));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    }
  };

  const cancel = async () => {
    if (!job || !running) return;
    try {
      setJob(await cancelSceneDetectionJob(job.id));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    }
  };

  const close = () => {
    if (job && running) void cancelSceneDetectionJob(job.id).catch(() => undefined);
    onClose();
  };

  const apply = (mode: 'markers' | 'split') => {
    if (locked) {
      setError(t('The current track is locked, so scene detection results cannot be applied'));
      return;
    }
    if (!mapped.length || applied) return;
    const actions = mode === 'markers'
      ? sceneMarkerActions(item, mapped)
      : sceneSplitActions(item, mapped);
    commands.batch(actions, mode === 'markers' ? 'Add scene markers' : 'Split clip at scene changes');
    setApplied(mode);
  };

  const phase = job ? ({
    queued: t('Waiting'),
    probing: t('Inspecting media'),
    detecting: t('Detecting scene changes'),
    finalizing: t('Preparing results'),
    completed: t('Detection complete'),
    failed: t('Detection failed'),
    cancelled: t('Cancelled'),
  } as const)[job.status] : t('Not started');

  return createPortal(
    <div className="vx-scene-overlay" role="dialog" aria-modal="true" aria-labelledby="vx-scene-title" onClick={running ? undefined : close}>
      <section className="vx-scene-dialog" onClick={(event) => event.stopPropagation()}>
        <header className="vx-scene-header">
          <div>
            <h2 id="vx-scene-title">{t('Scene detection')}</h2>
            <p>{item.name} · {t('Analyzed locally — media is not uploaded')}</p>
          </div>
          <button type="button" autoFocus className="vx-scene-icon-button" onClick={close} aria-label={t('Close')}>
            <Icon name="x" size={17} />
          </button>
        </header>

        <div className="vx-scene-body">
          <aside className="vx-scene-options">
            <label>
              <span>{t('Detection sensitivity')}</span>
              <strong>{threshold.toFixed(2)}</strong>
              <input type="range" min={0.05} max={0.95} step={0.01} value={threshold} disabled={running}
                onChange={(event) => setThreshold(Number(event.target.value))} />
              <small>{t('Lower values detect more scene changes')}</small>
            </label>
            <label>
              <span>{t('Minimum scene interval')}</span>
              <strong>{minSceneSeconds.toFixed(2)}s</strong>
              <input type="range" min={0.1} max={10} step={0.05} value={minSceneSeconds} disabled={running}
                onChange={(event) => setMinSceneSeconds(Number(event.target.value))} />
            </label>
            <label>
              <span>{t('Maximum cuts')}</span>
              <input className="vx-scene-number" type="number" min={1} max={500} value={maxScenes} disabled={running}
                onChange={(event) => setMaxScenes(Math.max(1, Math.min(500, Number(event.target.value) || 1)))} />
            </label>

            <div className="vx-scene-progress-card">
              <div><span>{phase}</span><strong>{Math.round((job?.progress ?? 0) * 100)}%</strong></div>
              <div className="vx-scene-progress-track"><i style={{ transform: `scaleX(${job?.progress ?? 0})` }} /></div>
              {job?.status === 'detecting' && job.result === null && (
                <small>{t('Analyzed through {time}', { time: formatTime(job.processedMs) })}</small>
              )}
            </div>

            {running ? (
              <button type="button" className="vx-scene-button secondary" onClick={() => void cancel()}>{t('Cancel detection')}</button>
            ) : (
              <button type="button" className="vx-scene-button primary" onClick={() => void start()}>{job ? t('Run again') : t('Start detection')}</button>
            )}
            {error && <p className="vx-scene-error">{error}</p>}
          </aside>

          <main className="vx-scene-results">
            <div className="vx-scene-results-header">
              <div>
                <h3>{t('Cut evidence')}</h3>
                <p>{job?.status === 'completed'
                  ? t('{all} cuts detected; {mapped} can be applied to the current clip', { all: evidence.length, mapped: mapped.length })
                  : t('Before-and-after frame evidence will appear when detection completes')}</p>
              </div>
              {job?.result && <span>{job.result.sampleFps.toFixed(1)} fps</span>}
            </div>

            <div className="vx-scene-list">
              {job?.status !== 'completed' && (
                <div className="vx-scene-empty"><Icon name="film" size={28} /><span>{running ? t('Analyzing visual changes…') : t('Adjust the settings, then start detection')}</span></div>
              )}
              {job?.status === 'completed' && evidence.length === 0 && (
                <div className="vx-scene-empty"><Icon name="check" size={28} /><span>{t('No scene changes matched these settings')}</span></div>
              )}
              {evidence.map((scene, index) => {
                const applicable = mappedTimes.has(scene.timeMs);
                return (
                  <article className={`vx-scene-row${applicable ? '' : ' outside'}`} key={`${scene.timeMs}-${index}`}>
                    <div className="vx-scene-row-meta">
                      <strong>#{index + 1}</strong>
                      <span>{formatTime(scene.timeMs)}</span>
                      <em>{scene.kind === 'cut' ? t('Cut·2') : t('Transition')}</em>
                      <small>{scene.score.toFixed(3)}</small>
                    </div>
                    <div className="vx-scene-evidence">
                      <figure><img src={scene.beforeThumbnailUrl} alt={t('Frame before the cut')} loading="lazy" /><figcaption>{t('Before')}</figcaption></figure>
                      <i><Icon name="next" size={16} /></i>
                      <figure><img src={scene.afterThumbnailUrl} alt={t('Frame after the cut')} loading="lazy" /><figcaption>{t('After')}</figcaption></figure>
                    </div>
                    {!applicable && <span className="vx-scene-outside">{t('Outside the current trim range')}</span>}
                  </article>
                );
              })}
            </div>
          </main>
        </div>

        <footer className="vx-scene-footer">
          <span>{applied === 'markers' ? t('Scene markers added') : applied === 'split' ? t('Clip split at scene changes') : locked ? t('Track locked') : ''}</span>
          <div>
            <button type="button" className="vx-scene-button secondary" disabled={!mapped.length || !!applied || locked} onClick={() => apply('markers')}>{t('Add scene markers')}</button>
            <button type="button" className="vx-scene-button primary" disabled={!mapped.length || !!applied || locked} onClick={() => apply('split')}>{t('Split at scene changes')}</button>
          </div>
        </footer>
      </section>
    </div>,
    document.body,
  );
}
