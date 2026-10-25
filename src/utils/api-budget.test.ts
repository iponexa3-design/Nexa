import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { ApiBudgetExceededError, MonthlyApiBudget } from "@/utils/api-budget";

const file = () => join(mkdtempSync(join(tmpdir(), "budget-")), "usage.json");

describe("MonthlyApiBudget", () => {
  it("counts requests and refuses them once the monthly limit is reached", () => {
    const budget = new MonthlyApiBudget(file(), 3);
    const now = new Date("2026-10-25T10:00:00Z");
    budget.consume(now);
    budget.consume(now);
    budget.consume(now);
    expect(() => budget.consume(now)).toThrow(ApiBudgetExceededError);
    expect(budget.usage(now)).toEqual({ month: "2026-10", count: 3, limit: 3 });
  });

  it("keeps the count across restarts and resets it in a new month", () => {
    const path = file();
    new MonthlyApiBudget(path, 10).consume(new Date("2026-10-31T10:00:00Z"));
    const restarted = new MonthlyApiBudget(path, 10);
    expect(restarted.usage(new Date("2026-10-31T12:00:00Z")).count).toBe(1);
    // 1 Nov 00:30 IST is already the next month in India.
    expect(restarted.usage(new Date("2026-10-31T19:00:00Z"))).toMatchObject({ month: "2026-11", count: 0 });
    expect(JSON.parse(readFileSync(path, "utf8")).count).toBe(1);
  });

  it("never blocks with a limit of 0, but still counts", () => {
    const budget = new MonthlyApiBudget(file(), 0);
    for (let i = 0; i < 5; i++) budget.consume();
    expect(budget.usage().count).toBe(5);
  });
});
