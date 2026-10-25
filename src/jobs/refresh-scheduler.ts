import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { refreshIpoData } from "@/services/ipo-refresh-service";
import { logger } from "@/utils/logger";

const CHECK_EVERY_MS = 10 * 60_000;
/** Failed runs are retried at most this many times a day, to protect the API quota. */
const MAX_ATTEMPTS_PER_DAY = 3;
const DEFAULT_DAILY_AT = "20:00";
const STATE_FILE = process.env.IPO_REFRESH_STATE_FILE || ".data/refresh-state.json";

// Survives dev hot reloads, so a reload never starts a second timer.
const state = globalThis as typeof globalThis & {
  __iponexaRefreshScheduler?: { running: boolean; timer: NodeJS.Timeout };
};

/** "YYYY-MM-DD HH:MM" in IST. */
function istNow(date: Date): { day: string; time: string } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)?.value ?? "";
  return { day: `${get("year")}-${get("month")}-${get("day")}`, time: `${get("hour")}:${get("minute")}` };
}

interface SchedulerState {
  lastRunDay: string | null;
  attemptDay: string | null;
  attempts: number;
}

function readState(): SchedulerState {
  try {
    const stored = JSON.parse(readFileSync(STATE_FILE, "utf8")) as Partial<SchedulerState>;
    return { lastRunDay: stored.lastRunDay ?? null, attemptDay: stored.attemptDay ?? null, attempts: stored.attempts ?? 0 };
  } catch {
    return { lastRunDay: null, attemptDay: null, attempts: 0 };
  }
}

function writeState(next: SchedulerState): void {
  mkdirSync(dirname(STATE_FILE), { recursive: true });
  writeFileSync(STATE_FILE, JSON.stringify(next));
}

/**
 * True once a day: when the IST clock has passed `dailyAt` and today's run
 * has not happened yet. Pure, so it can be tested.
 */
export function isDailyRunDue(now: Date, dailyAt: string, lastRunDay: string | null): boolean {
  const { day, time } = istNow(now);
  return lastRunDay !== day && time >= dailyAt;
}

/**
 * Keeps IPO data fresh on a long-running server (`next start`) with ONE full
 * refresh per day at IPO_REFRESH_DAILY_AT (IST, default 20:00: after the
 * exchanges publish listing prices and the day's GMP is in). The paid IPO
 * feed allows a limited number of calls per month, so restarts never trigger
 * extra runs: the last run day is kept in a small file. Runs never overlap,
 * and a failed run is retried at the next 10-minute check.
 * Run it on a single instance only.
 */
export function startRefreshScheduler(): void {
  if (state.__iponexaRefreshScheduler) return;

  const configured = (process.env.IPO_REFRESH_DAILY_AT ?? DEFAULT_DAILY_AT).trim();
  const dailyAt = /^([01]\d|2[0-3]):[0-5]\d$/.test(configured) ? configured : DEFAULT_DAILY_AT;

  const tick = async () => {
    const scheduler = state.__iponexaRefreshScheduler;
    const now = new Date();
    const today = istNow(now).day;
    const saved = readState();
    const attemptsToday = saved.attemptDay === today ? saved.attempts : 0;
    if (!scheduler || scheduler.running || !isDailyRunDue(now, dailyAt, saved.lastRunDay)) return;
    if (attemptsToday >= MAX_ATTEMPTS_PER_DAY) return;
    scheduler.running = true;
    writeState({ ...saved, attemptDay: today, attempts: attemptsToday + 1 });
    try {
      const summary = await refreshIpoData();
      writeState({ lastRunDay: today, attemptDay: today, attempts: attemptsToday + 1 });
      logger.info("Daily IPO refresh finished", { ...summary });
    } catch (error) {
      logger.error("Daily IPO refresh failed", {
        attempt: attemptsToday + 1,
        maxAttempts: MAX_ATTEMPTS_PER_DAY,
        error: error instanceof Error ? error.message : String(error),
      });
    } finally {
      scheduler.running = false;
    }
  };

  const timer = setInterval(tick, CHECK_EVERY_MS);
  timer.unref();
  state.__iponexaRefreshScheduler = { running: false, timer };
  setTimeout(tick, 60_000).unref();
  logger.info("IPO refresh scheduler started", { dailyAtIst: dailyAt, lastRunDay: readState().lastRunDay });
}
