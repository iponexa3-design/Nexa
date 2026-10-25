import { describe, expect, it, vi } from "vitest";

vi.mock("@/db/prisma", () => ({ prisma: {} }));

import { parseBhavcopy } from "@/providers/exchange-bhavcopy";
import { matchListingPrice } from "@/services/listing-price-service";

// Rows copied from the real NSE and BSE files for 23 Oct 2026.
const HEADER =
  "TradDt,BizDt,Sgmt,Src,FinInstrmTp,FinInstrmId,ISIN,TckrSymb,SctySrs,XpryDt,FininstrmActlXpryDt,StrkPric,OptnTp,FinInstrmNm,OpnPric,HghPric,LwPric,ClsPric,LastPric,PrvsClsgPric";
const NSE = parseBhavcopy("NSE", [
  HEADER,
  "2026-10-23,2026-10-23,CM,NSE,STK,766788,INE0LDG01026,TONBO,EQ,,,,,TONBO IMAGING INDIA LTD,1160.00,1211.00,1013.70,1133.80,1133.80,700.00",
  "2026-10-23,2026-10-23,CM,NSE,STK,766726,INE18AK01028,HDFIRE,EQ,,,,,HD FIRE PROTECT LIMITED,273.70,287.15,263.10,266.60,266.60,276.70",
  '2026-10-23,2026-10-23,CM,NSE,STK,1,INE000000001,SHAHINV,EQ,,,,,"SHAH INVESTOR\'S HOME, LTD",170.00,171.00,160.00,165.00,165.00,167.00',
].join("\n"));
const BSE = parseBhavcopy("BSE", [
  HEADER,
  "2026-10-23,2026-10-23,CM,BSE,STK,544998,INE0Z7301016,SHELLZ,MT,,,,,Shellz India Limited,179.00,179.00,170.05,170.05,170.05,0.00",
  "2026-10-23,2026-10-23,CM,BSE,STK,544999,INE0LDG01026,TONBO,B,,,,,TONBO IMAGING INDIA LIMITED,1162.00,1209.85,1013.95,1133.65,1133.65,0.00",
].join("\n"));

describe("parseBhavcopy", () => {
  it("reads symbol, opening price and previous close, including quoted names", () => {
    expect(NSE.get("TONBO")).toMatchObject({ open: 1160, previousClose: 700, series: "EQ" });
    expect(NSE.get("SHAHINV")).toMatchObject({ open: 170, previousClose: 167 });
  });
});

describe("matchListingPrice", () => {
  it("uses the NSE listing-day open and learns the final issue price", () => {
    expect(
      matchListingPrice(
        { symbol: "TONBO", exchange: "NSE", priceBandLow: 665, priceBandHigh: 700 },
        { NSE, BSE },
      ),
    ).toEqual({ listingPrice: 1160, finalIssuePrice: 700, exchange: "NSE" });
  });

  it("uses BSE for a BSE-only SME issue (previous close is 0 on listing day)", () => {
    expect(
      matchListingPrice(
        { symbol: "SHELLZ", exchange: "BSE", priceBandLow: 170, priceBandHigh: 179 },
        { NSE, BSE },
      ),
    ).toEqual({ listingPrice: 179, finalIssuePrice: null, exchange: "BSE" });
  });

  it("rejects a row that is not the IPO's first trading day", () => {
    // HD Fire listed on 21 Oct; on 23 Oct its previous close is a trading price.
    expect(
      matchListingPrice(
        { symbol: "HDFIRE", exchange: "NSE", priceBandLow: 258, priceBandHigh: 271 },
        { NSE, BSE: null },
      ),
    ).toBeNull();
  });

  it("accepts an NSE SME listing only when the symbol did not trade the day before", () => {
    const listingDay = parseBhavcopy("NSE", [
      HEADER,
      "2026-10-22,2026-10-22,CM,NSE,STK,766763,INE1UEL01023,RAVITA,ST,,,,,RAVITA ENGG SERV L,112.00,112.00,106.40,106.40,106.40,112.00",
    ].join("\n"));
    const dayBefore = parseBhavcopy("NSE", HEADER);
    const ravita = { symbol: "RAVITA", exchange: "NSE", priceBandLow: 105, priceBandHigh: 105 };

    expect(matchListingPrice(ravita, { NSE: listingDay }, dayBefore)).toEqual({
      listingPrice: 112,
      finalIssuePrice: null,
      exchange: "NSE",
    });
    // Already trading the day before: not its listing day.
    expect(matchListingPrice(ravita, { NSE: listingDay }, listingDay)).toBeNull();
    // Previous file unavailable: cannot prove it, so do not guess.
    expect(matchListingPrice(ravita, { NSE: listingDay }, null)).toBeNull();
  });

  it("returns null when the symbol is unknown or the files are not published yet", () => {
    expect(matchListingPrice({ symbol: null, exchange: "NSE", priceBandLow: 1, priceBandHigh: 2 }, { NSE })).toBeNull();
    expect(
      matchListingPrice(
        { symbol: "TONBO", exchange: "NSE", priceBandLow: 665, priceBandHigh: 700 },
        { NSE: null, BSE: null },
      ),
    ).toBeNull();
  });
});
