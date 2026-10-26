// Ownership of a project shared by several tabs (or browsers) of the editor.
// The most recently opened or reloaded tab owns the project; a tab it replaced
// stops reclaiming, shows a notice and only takes the project back on a click
// (or by itself once the other editor is gone). The server decides; this class
// only remembers what the bridge loop must send and show.
// See specs/07-proyecto-en-varias-pestanas.md.

/** Why this tab does not edit the project (null while it owns it or is connecting). */
export type BridgeOwnershipNotice = 'displaced' | 'reload-required' | null;

/** Why the server refused a registration (HTTP 409 body). */
export interface BridgeRegistrationRefusal {
  /** Another browser editor took the project over and is still present. */
  readonly displaced: boolean;
  /** This tab's document is older than the stored project. */
  readonly reloadRequired: boolean;
}

export interface BridgeOwnershipIntent {
  /** Last epoch this editor id held; absent until it registers once. */
  heldEpoch?: number;
  /** The user clicked "use in this tab". */
  takeover?: boolean;
}

export interface BridgeOwnershipTiming {
  /** Delay before reconnecting a tab that owns (or may own) the project. */
  retryMs: number;
  /** Delay between checks of a displaced tab; it never takes the project from a live owner. */
  displacedRecheckMs: number;
}

const DEFAULT_TIMING: BridgeOwnershipTiming = { retryMs: 1_000, displacedRecheckMs: 3_000 };

export class BridgeOwnershipState {
  private heldEpoch: number | undefined;
  private takeoverRequested = false;
  private takeoverInFlight = false;
  private notice: BridgeOwnershipNotice = null;
  private wake: (() => void) | null = null;
  private readonly onNotice: (notice: BridgeOwnershipNotice) => void;
  private readonly timing: BridgeOwnershipTiming;

  constructor(
    onNotice: (notice: BridgeOwnershipNotice) => void = () => undefined,
    timing: BridgeOwnershipTiming = DEFAULT_TIMING,
  ) {
    this.onNotice = onNotice;
    this.timing = timing;
  }

  current(): BridgeOwnershipNotice {
    return this.notice;
  }

  /** What the next registration attempt sends. */
  intent(): BridgeOwnershipIntent {
    this.takeoverInFlight = this.takeoverRequested;
    return {
      ...(this.heldEpoch === undefined ? {} : { heldEpoch: this.heldEpoch }),
      ...(this.takeoverRequested ? { takeover: true } : {}),
    };
  }

  registered(epoch: number): void {
    this.heldEpoch = epoch;
    this.takeoverRequested = false;
    this.takeoverInFlight = false;
    this.setNotice(null);
  }

  refused(refusal: BridgeRegistrationRefusal): void {
    const tookOver = this.takeoverInFlight;
    this.takeoverInFlight = false;
    // A click that arrived while a plain attempt was in flight still counts.
    if (tookOver) this.takeoverRequested = false;
    if (refusal.displaced) {
      // An outdated tab cannot take the project back without reloading; once it
      // knows that, a later plain "displaced" answer must not offer the button again.
      this.setNotice(refusal.reloadRequired || this.notice === 'reload-required'
        ? 'reload-required'
        : 'displaced');
      return;
    }
    // A stale revision is routine while this tab's own autosave is in flight, so it
    // only means "reload" once the tab lost the project or the user asked for it.
    if (refusal.reloadRequired && (this.notice || tookOver)) this.setNotice('reload-required');
  }

  requestTakeover(): void {
    this.takeoverRequested = true;
    this.wake?.();
  }

  /** Wait before the next attempt; a click or an abort ends the wait early. */
  retryDelay(signal: AbortSignal): Promise<void> {
    const { promise, resolve } = Promise.withResolvers<void>();
    const done = () => {
      clearTimeout(timer);
      signal.removeEventListener('abort', done);
      if (this.wake === done) this.wake = null;
      resolve();
    };
    const timer = setTimeout(done, this.notice ? this.timing.displacedRecheckMs : this.timing.retryMs);
    signal.addEventListener('abort', done, { once: true });
    this.wake = done;
    if (this.takeoverRequested || signal.aborted) done();
    return promise;
  }

  private setNotice(notice: BridgeOwnershipNotice): void {
    if (this.notice === notice) return;
    this.notice = notice;
    this.onNotice(notice);
  }
}
