/**
 * Runs once when the Next.js server starts. On a long-running server
 * (`next start`), IPO_REFRESH_SCHEDULER=on keeps IPO, GMP, subscription and
 * listing-price data refreshing automatically. Serverless hosts should call
 * /api/cron/refresh-ipos from their cron feature instead.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (process.env.IPO_REFRESH_SCHEDULER?.trim().toLowerCase() !== "on") return;

  const { startRefreshScheduler } = await import("@/jobs/refresh-scheduler");
  startRefreshScheduler();
}
