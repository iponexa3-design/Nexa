import { refreshIpoData } from "@/services/ipo-refresh-service";
import { logger } from "@/utils/logger";

const DEFAULT_INTERVAL_MINUTES = 180;
const FIRST_RUN_DELAY_MS = 60_000;

// Survives dev hot reloads, so a reload never starts a second timer.
const state = globalThis as typeof globalThis & {
  __iponexaRefreshScheduler?: { running: boolean; timer: NodeJS.Timeout };
};

/**
 * Keeps IPO data fresh on a long-running server (`next start`): one refresh
 * shortly after boot, then every IPO_REFRESH_INTERVAL_MINUTES. Runs never
 * overlap, and a failed run is logged and retried at the next interval.
 * Run it on a single instance only; with several instances use the
 * /api/cron/refresh-ipos endpoint from one external scheduler instead.
 */
export function startRefreshScheduler(): void {
  if (state.__iponexaRefreshScheduler) return;

  const minutes = Number(process.env.IPO_REFRESH_INTERVAL_MINUTES ?? DEFAULT_INTERVAL_MINUTES);
  const intervalMs = (Number.isFinite(minutes) && minutes >= 15 ? minutes : DEFAULT_INTERVAL_MINUTES) * 60_000;

  const run = async () => {
    const scheduler = state.__iponexaRefreshScheduler;
    if (!scheduler || scheduler.running) return;
    scheduler.running = true;
    try {
      const summary = await refreshIpoData();
      logger.info("Scheduled IPO refresh finished", { ...summary });
    } catch (error) {
      logger.error("Scheduled IPO refresh failed", {
        error: error instanceof Error ? error.message : String(error),
      });
    } finally {
      scheduler.running = false;
    }
  };

  const timer = setInterval(run, intervalMs);
  timer.unref();
  state.__iponexaRefreshScheduler = { running: false, timer };
  setTimeout(run, FIRST_RUN_DELAY_MS).unref();
  logger.info("IPO refresh scheduler started", { intervalMinutes: intervalMs / 60_000 });
}
