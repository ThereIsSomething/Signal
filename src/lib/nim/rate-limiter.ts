// ═══════════════════════════════════════════════════════════════════════════════
// Rate Limiter — Sequential Queue for Nvidia NIM (40 RPM)
// Ensures all LLM calls execute one at a time with enforced delays.
// ═══════════════════════════════════════════════════════════════════════════════

import { NIM_RPM_LIMIT } from "./client";

type QueuedTask<T> = {
  execute: () => Promise<T>;
  resolve: (value: T) => void;
  reject: (reason: unknown) => void;
};

class RateLimiter {
  private queue: QueuedTask<unknown>[] = [];
  private isProcessing = false;
  private requestTimestamps: number[] = [];
  private readonly maxRPM: number;
  private readonly windowMs = 60_000; // 1 minute window

  constructor(maxRPM: number) {
    this.maxRPM = maxRPM;
  }

  /**
   * Enqueue a task for rate-limited sequential execution.
   * Returns a promise that resolves when the task completes.
   */
  async enqueue<T>(execute: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      this.queue.push({
        execute: execute as () => Promise<unknown>,
        resolve: resolve as (value: unknown) => void,
        reject,
      });
      this.processQueue();
    });
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessing) return;
    this.isProcessing = true;

    while (this.queue.length > 0) {
      const task = this.queue.shift()!;
      await this.waitForSlot();

      try {
        const result = await task.execute();
        this.recordRequest();
        task.resolve(result);
      } catch (error) {
        task.reject(error);
      }
    }

    this.isProcessing = false;
  }

  /**
   * Wait until we have capacity within the RPM window.
   */
  private async waitForSlot(): Promise<void> {
    this.pruneOldTimestamps();

    if (this.requestTimestamps.length >= this.maxRPM) {
      const oldestTimestamp = this.requestTimestamps[0];
      const waitTime = oldestTimestamp + this.windowMs - Date.now() + 100; // +100ms safety buffer

      if (waitTime > 0) {
        console.log(
          `[RateLimiter] RPM limit reached (${this.maxRPM}). Waiting ${waitTime}ms...`
        );
        await this.sleep(waitTime);
        this.pruneOldTimestamps();
      }
    }

    // Minimum 1.5s between requests to stay well within 40 RPM
    const lastTimestamp = this.requestTimestamps[this.requestTimestamps.length - 1];
    if (lastTimestamp) {
      const elapsed = Date.now() - lastTimestamp;
      const minGap = Math.ceil(this.windowMs / this.maxRPM);
      if (elapsed < minGap) {
        await this.sleep(minGap - elapsed);
      }
    }
  }

  private recordRequest(): void {
    this.requestTimestamps.push(Date.now());
  }

  private pruneOldTimestamps(): void {
    const cutoff = Date.now() - this.windowMs;
    this.requestTimestamps = this.requestTimestamps.filter((ts) => ts > cutoff);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /** Current queue depth (for status reporting) */
  get pending(): number {
    return this.queue.length;
  }

  /** Requests made in the current window */
  get currentWindowCount(): number {
    this.pruneOldTimestamps();
    return this.requestTimestamps.length;
  }
}

// Singleton instance — 40 RPM limit
export const rateLimiter = new RateLimiter(NIM_RPM_LIMIT);
