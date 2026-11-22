import { describe, expect, it } from "vitest";
import { findDuplicateGroups, isSameIpo } from "@/services/ipo-dedupe";

const record = (slug: string, companyName: string, updatedAt: string, extra: Partial<{ ipoType: string; openDate: string | null }> = {}) => ({
  id: slug,
  slug,
  companyName,
  ipoType: extra.ipoType ?? "SME",
  openDate: extra.openDate === undefined ? new Date("2026-10-30") : extra.openDate,
  updatedAt: new Date(updatedAt),
});

describe("isSameIpo", () => {
  it("matches a renamed record by name, board and opening date", () => {
    expect(
      isSameIpo(
        { companyName: "Johnsoncab Electricals Limited", ipoType: "SME", openDate: "2026-10-30" },
        { companyName: "Johnsoncab Electricals Ltd.", ipoType: "SME", openDate: new Date("2026-10-30") },
      ),
    ).toBe(true);
  });

  it("does not match a different board, a different opening date or an undated record", () => {
    const base = { companyName: "Acme Limited", ipoType: "SME", openDate: "2026-10-30" };
    expect(isSameIpo(base, { ...base, ipoType: "MAINBOARD" })).toBe(false);
    expect(isSameIpo(base, { ...base, openDate: "2026-11-30" })).toBe(false);
    expect(isSameIpo({ ...base, openDate: null }, { ...base, openDate: null })).toBe(false);
  });
});

describe("findDuplicateGroups", () => {
  it("keeps the most recently updated record and merges the rest", () => {
    const groups = findDuplicateGroups([
      record("johsoncab", "Johnsoncab Electricals Limited", "2026-11-01"),
      record("johnsoncab", "Johnsoncab Electricals Limited", "2026-11-20"),
      record("maxengs", "Maxwell Engineering Solutions Limited", "2026-11-20"),
    ]);
    expect(groups).toHaveLength(1);
    expect(groups[0].keep.slug).toBe("johnsoncab");
    expect(groups[0].merge.map((ipo) => ipo.slug)).toEqual(["johsoncab"]);
  });

  it("ignores undated announcements", () => {
    expect(
      findDuplicateGroups([
        record("a", "Paras Healthcare", "2026-11-01", { openDate: null }),
        record("b", "Paras Healthcare Limited", "2026-11-02", { openDate: null }),
      ]),
    ).toEqual([]);
  });
});
