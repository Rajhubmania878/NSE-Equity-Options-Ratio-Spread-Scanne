import { OiReferenceMode } from '../types/market';

interface OiSnapshot {
  timestamp: number;
  oi: number;
}

/**
 * Tracks historical Open Interest snapshots for tokens to calculate true application-level OI change.
 * Completely circumvents Angel One's documented dummy WebSocket OI-change-% field bug.
 */
class OiTracker {
  private history: Map<string, OiSnapshot[]> = new Map();
  private prevCloseOi: Map<string, number> = new Map();

  /**
   * Record an observed OI tick for a token
   */
  public recordOi(token: string, oi: number, prevClose?: number): void {
    if (!oi || oi <= 0) return;

    if (prevClose && !this.prevCloseOi.has(token)) {
      this.prevCloseOi.set(token, prevClose);
    }

    const now = Date.now();
    let records = this.history.get(token);
    if (!records) {
      records = [];
      this.history.set(token, records);
    }

    records.push({ timestamp: now, oi });

    // Keep up to 15 minutes of snapshots
    const cutoff = now - 15 * 60 * 1000;
    while (records.length > 0 && records[0].timestamp < cutoff) {
      records.shift();
    }
  }

  /**
   * Calculate absolute OI change and percentage change for a token against reference mode
   */
  public getOiChange(
    token: string,
    currentOi: number | null,
    mode: OiReferenceMode = 'PREV_CLOSE'
  ): { change: number; changePct: number } {
    if (!currentOi || currentOi <= 0) {
      return { change: 0, changePct: 0 };
    }

    const records = this.history.get(token);
    let baselineOi: number | null = null;
    const now = Date.now();

    if (mode === 'PREV_CLOSE') {
      baselineOi = this.prevCloseOi.get(token) || null;
      if (!baselineOi && records && records.length > 0) {
        baselineOi = records[0].oi; // fallback to earliest record today
      }
    } else if (mode === 'PREV_TICK') {
      if (records && records.length >= 2) {
        baselineOi = records[records.length - 2].oi;
      }
    } else if (mode === 'ONE_MIN') {
      if (records && records.length > 0) {
        const targetTime = now - 60 * 1000;
        // find snapshot closest to 1 min ago
        const snap = records.reduce((prev, curr) =>
          Math.abs(curr.timestamp - targetTime) < Math.abs(prev.timestamp - targetTime) ? curr : prev
        );
        baselineOi = snap.oi;
      }
    } else if (mode === 'FIVE_MIN') {
      if (records && records.length > 0) {
        const targetTime = now - 5 * 60 * 1000;
        const snap = records.reduce((prev, curr) =>
          Math.abs(curr.timestamp - targetTime) < Math.abs(prev.timestamp - targetTime) ? curr : prev
        );
        baselineOi = snap.oi;
      }
    } else if (mode === 'MARKET_OPEN') {
      if (records && records.length > 0) {
        baselineOi = records[0].oi;
      }
    }

    if (!baselineOi || baselineOi <= 0) {
      return { change: 0, changePct: 0 };
    }

    const change = currentOi - baselineOi;
    const changePct = Math.round((change / baselineOi) * 1000) / 10;

    return { change, changePct };
  }

  public clear(): void {
    this.history.clear();
    this.prevCloseOi.clear();
  }
}

export const oiTracker = new OiTracker();
