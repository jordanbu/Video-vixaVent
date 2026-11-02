// Queue between confirmLocalExecution and the card the editor shows for it.
//
// While a card is mounted (attachLocalExecutionUi), every local-execution request waits
// here until the user answers it; the card always shows the oldest one. Stopping the
// run (abort) answers "no" and drops the card. Unmounting the last card answers "no" to
// whatever is still waiting and puts the native confirm back for later requests.
// See specs/08-confirmar-ejecucion-local.md.
import {
  browserLocalExecutionConfirmer,
  setLocalExecutionConfirmer,
  type LocalExecutionConfirmer,
  type LocalExecutionDecision,
  type LocalExecutionRequest,
} from './local-execution-consent';

interface Pending {
  readonly request: LocalExecutionRequest;
  readonly settle: (decision: LocalExecutionDecision) => void;
}

let pending: readonly Pending[] = [];
const listeners = new Set<() => void>();
let attached = 0;
let restore: LocalExecutionConfirmer = browserLocalExecutionConfirmer;

const notify = () => listeners.forEach((listener) => listener());

function remove(id: string): Pending | undefined {
  const found = pending.find((entry) => entry.request.id === id);
  if (found) {
    pending = pending.filter((entry) => entry !== found);
    notify();
  }
  return found;
}

/** Confirmer used while a card is mounted: wait for the user's answer. */
const uiConfirmer: LocalExecutionConfirmer = (request, signal) => new Promise<LocalExecutionDecision>((resolve) => {
  if (signal?.aborted) { resolve('deny'); return; }
  const onAbort = () => { if (remove(request.id)) resolve('deny'); };
  signal?.addEventListener('abort', onAbort, { once: true });
  pending = [...pending, {
    request,
    settle: (decision) => {
      signal?.removeEventListener('abort', onAbort);
      resolve(decision);
    },
  }];
  notify();
});

/** The request the card shows: the oldest one still waiting. */
export function currentLocalExecutionPrompt(): LocalExecutionRequest | null {
  return pending[0]?.request ?? null;
}

export function subscribeLocalExecutionPrompts(listener: () => void): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

/** The user's answer from the card. An unknown id (already answered or aborted) is ignored. */
export function answerLocalExecutionPrompt(id: string, decision: LocalExecutionDecision): void {
  remove(id)?.settle(decision);
}

/** Route requests to the card while it is mounted; returns the detach function. */
export function attachLocalExecutionUi(): () => void {
  attached += 1;
  if (attached === 1) restore = setLocalExecutionConfirmer(uiConfirmer);
  let detached = false;
  return () => {
    if (detached) return;
    detached = true;
    attached -= 1;
    if (attached > 0) return;
    setLocalExecutionConfirmer(restore);
    // Nobody is left to answer: refuse rather than leave the agent waiting forever.
    const waiting = pending;
    pending = [];
    notify();
    for (const entry of waiting) entry.settle('deny');
  };
}
