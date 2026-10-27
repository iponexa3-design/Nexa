import { describe, expect, it } from "vitest";
import {
  allotmentDateFromSchedule,
  allotmentExchanges,
  allotmentStage,
  findRegistrar,
  selectAllotmentIpos,
} from "@/services/allotment";
import { registrarFromIssueInfo } from "@/providers/nse-issue-info";

// 27 Oct 2026, 09:00 IST.
const NOW = new Date("2026-10-27T03:30:00Z");

describe("findRegistrar", () => {
  it("matches the registrar names NSE uses, whatever the spelling", () => {
    expect(findRegistrar("KFin Technologies Limited")?.key).toBe("kfin");
    expect(findRegistrar("Kfin Technologies Limited ")?.key).toBe("kfin");
    expect(findRegistrar("KFIN Technologies Limited")?.key).toBe("kfin");
    expect(findRegistrar("MUFG Intime India Private Limited")?.key).toBe("mufg");
    expect(findRegistrar("Link Intime India Private Ltd")?.key).toBe("mufg");
    expect(findRegistrar("Bigshare Services Private Limited")?.key).toBe("bigshare");
    expect(findRegistrar("Cameo Corporate Service Limited")?.key).toBe("cameo");
    expect(findRegistrar("MAS Services Limited")?.key).toBe("mas");
    expect(findRegistrar("Maashitla Securities Private Limited")?.key).toBe("maashitla");
  });

  it("returns null for unknown or missing registrars", () => {
    expect(findRegistrar("Mudra RTA Ventures Private Limited")).toBeNull();
    expect(findRegistrar(null)).toBeNull();
    expect(findRegistrar("  ")).toBeNull();
  });
});

describe("allotmentExchanges", () => {
  it("offers both exchanges for mainboard IPOs and the listing exchange for SME", () => {
    expect(allotmentExchanges("NSE", "MAINBOARD").map((site) => site.key)).toEqual(["bse", "nse"]);
    expect(allotmentExchanges("BSE", "SME").map((site) => site.key)).toEqual(["bse"]);
    expect(allotmentExchanges("NSE", "SME").map((site) => site.key)).toEqual(["nse"]);
    expect(allotmentExchanges("", "SME").map((site) => site.key)).toEqual(["bse", "nse"]);
  });
});

describe("allotmentDateFromSchedule", () => {
  it("reads the allotment finalisation date, not the anchor lock-in", () => {
    expect(
      allotmentDateFromSchedule([
        { event: "Issue close date", date: "2026-10-23" },
        { event: "Allotment finalization", date: "2026-10-26" },
        { event: "Lock-in end date for anchor investors (50%)", date: "2026-11-24" },
      ]),
    ).toBe("2026-10-26");
    expect(allotmentDateFromSchedule([])).toBeNull();
    expect(allotmentDateFromSchedule(undefined)).toBeNull();
  });
});

describe("allotmentStage", () => {
  it("follows the IST calendar around the allotment date", () => {
    expect(allotmentStage({ status: "CLOSED", allotmentDate: "2026-10-26", listingDate: "2026-10-28" }, NOW)).toBe("out");
    expect(allotmentStage({ status: "CLOSED", allotmentDate: "2026-10-27", listingDate: "2026-10-29" }, NOW)).toBe("today");
    expect(allotmentStage({ status: "OPEN", allotmentDate: "2026-10-30", listingDate: null }, NOW)).toBe("pending");
    expect(allotmentStage({ status: "CLOSED", allotmentDate: null, listingDate: null }, NOW)).toBe("due");
  });

  it("keeps listed IPOs for 10 days and leaves out upcoming ones", () => {
    expect(allotmentStage({ status: "LISTED", allotmentDate: "2026-10-21", listingDate: "2026-10-23" }, NOW)).toBe("out");
    expect(allotmentStage({ status: "LISTED", allotmentDate: null, listingDate: "2026-10-10" }, NOW)).toBeNull();
    expect(allotmentStage({ status: "UPCOMING", allotmentDate: "2026-11-02", listingDate: null }, NOW)).toBeNull();
  });
});

describe("selectAllotmentIpos", () => {
  it("orders today, then out (newest first), then due, then pending (soonest first)", () => {
    const rows = [
      { slug: "pending-late", status: "OPEN" as const, allotmentDate: "2026-11-02", listingDate: null },
      { slug: "listed", status: "LISTED" as const, allotmentDate: "2026-10-21", listingDate: "2026-10-23" },
      { slug: "today", status: "CLOSED" as const, allotmentDate: "2026-10-27", listingDate: "2026-10-29" },
      { slug: "upcoming", status: "UPCOMING" as const, allotmentDate: "2026-11-05", listingDate: null },
      { slug: "out", status: "CLOSED" as const, allotmentDate: "2026-10-26", listingDate: "2026-10-28" },
      { slug: "pending-soon", status: "OPEN" as const, allotmentDate: "2026-10-30", listingDate: null },
      { slug: "pending-undated", status: "OPEN" as const, allotmentDate: null, listingDate: null },
    ];
    expect(selectAllotmentIpos(rows, NOW).map((row) => row.slug)).toEqual([
      "today",
      "out",
      "listed",
      "pending-soon",
      "pending-late",
      "pending-undated",
    ]);
  });
});

describe("registrarFromIssueInfo", () => {
  it("reads the registrar row from NSE issue information", () => {
    expect(
      registrarFromIssueInfo({
        issueInfo: {
          dataList: [
            { title: "Symbol", value: "JPL" },
            { title: "Name of the Registrar", value: "Kfin Technologies Limited " },
          ],
        },
      }),
    ).toBe("Kfin Technologies Limited");
  });

  it("returns null when NSE has no registrar", () => {
    expect(registrarFromIssueInfo({ issueInfo: { dataList: [{ title: "Name of the Registrar", value: "-" }] } })).toBeNull();
    expect(registrarFromIssueInfo({})).toBeNull();
    expect(registrarFromIssueInfo(null)).toBeNull();
  });
});
