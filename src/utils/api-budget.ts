import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

interface UsageFile {
  /** Calendar month the count belongs to, "YYYY-MM" (IST). */
  month: string;
  count: number;
}

export class ApiBudgetExceededError extends Error {
  readonly retryable = false;
  constructor(limit: number) {
    super(`Monthly API budget of ${limit} requests reached; skipping further requests until next month.`);
  }
}

/**
 * Counts paid API requests per calendar month in a small JSON file, so the
 * count survives restarts, and refuses requests once the monthly limit is
 * reached. A limit of 0 means unlimited (counting only).
 */
export class MonthlyApiBudget {
  constructor(
    private readonly file: string,
    private readonly limit: number,
  ) {}

  /** Records one request, or throws ApiBudgetExceededError when the limit is reached. */
  consume(now: Date = new Date()): void {
    const usage = this.read(now);
    if (this.limit > 0 && usage.count >= this.limit) throw new ApiBudgetExceededError(this.limit);
    this.write({ month: usage.month, count: usage.count + 1 });
  }

  usage(now: Date = new Date()): { month: string; count: number; limit: number } {
    return { ...this.read(now), limit: this.limit };
  }

  private read(now: Date): UsageFile {
    const month = monthKey(now);
    try {
      const stored = JSON.parse(readFileSync(this.file, "utf8")) as UsageFile;
      if (stored.month === month && Number.isFinite(stored.count)) return stored;
    } catch {
      // No file yet, or unreadable: start counting from zero.
    }
    return { month, count: 0 };
  }

  private write(usage: UsageFile): void {
    mkdirSync(dirname(this.file), { recursive: true });
    writeFileSync(this.file, JSON.stringify(usage));
  }
}

function monthKey(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit" })
    .format(date)
    .slice(0, 7);
}
