import { beforeEach, describe, expect, it, vi } from "vitest";
import { HttpApiProvider } from "@/providers/http-api-provider";

describe("HttpApiProvider.fetchIpos", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("requests the IPOAlerts API page-by-page using the supported limit=1 setting", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers(),
        json: async () => ({
          meta: { count: 2, totalPages: 2, page: 1, limit: 1 },
          ipos: [
            {
              slug: "hd-fire-protect",
              name: "HD Fire Protect Limited",
              source: "nse",
              type: "EQ",
              status: "open",
              startDate: "2026-10-13",
              endDate: "2026-10-15",
              listingDate: "2026-10-21",
              priceRange: "258-271",
              issueSize: "712cr",
              minQty: 55,
              minAmount: 14905,
              listingGain: "12.4",
              logo: "https://assets.example.test/ipo.png",
              prospectusUrl: "https://assets.example.test/rhp.pdf",
              about: "A manufacturing company.",
              strengths: ["Export growth"],
              risks: ["Customer concentration"],
              mediaCoverageLinks: ["https://news.example.test/ipo"],
              nseInfoUrl: "https://nse.example.test/ipo",
              schedule: [{ event: "Issue close date", date: "2026-10-15" }],
              subscription: {
                noOfSharesOffered: 1000,
                noOfsharesBid: 2500,
                timesSubscribed: 2.5,
                updatedAt: "2026-10-15T12:00:00Z",
              },
            },
          ],
        }),
      } as unknown as Response)
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers(),
        json: async () => ({
          meta: { count: 2, totalPages: 2, page: 2, limit: 1 },
          ipos: [
            {
              slug: "sample-ipo",
              name: "Sample IPO",
              source: "nse",
              type: "EQ",
              status: "open",
              startDate: "2026-10-16",
              endDate: "2026-10-20",
              listingDate: "2026-10-26",
              priceRange: "120-140",
              issueSize: "100cr",
              lotSize: 50,
            },
          ],
        }),
      } as unknown as Response);

    vi.stubGlobal("fetch", fetchMock);

    const provider = new HttpApiProvider({
      name: "http-api",
      baseUrl: "https://api.ipoalerts.in",
      apiKey: "demo-key",
    });

    const items = await provider.fetchIpos();

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain("limit=1");
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain("page=1");
    expect(items).toHaveLength(2);
    expect(items[0]?.lotSize).toBe(55);
    expect(items[0]?.research).toMatchObject({
      minimumInvestment: 14905,
      about: "A manufacturing company.",
      strengths: ["Export growth"],
      risks: ["Customer concentration"],
      schedule: [{ event: "Issue close date", date: "2026-10-15" }],
      subscription: { sharesOffered: 1000, sharesBid: 2500, timesSubscribed: 2.5 },
    });
  });

  it("reads every page up to the safety cap, warns when capped, and sends the page size", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const page = Number(new URL(String(input)).searchParams.get("page"));
      return {
        ok: true,
        status: 200,
        headers: new Headers(),
        json: async () => ({
          meta: { count: 180, totalPages: 60, page, limit: 3 },
          ipos: [{
            slug: `sample-ipo-${page}`,
            name: `Sample IPO ${page}`, typeOfIssue: "IPO",
            source: "nse",
            type: "EQ",
            status: "open",
            startDate: "2026-10-13",
            endDate: "2026-10-20",
          }],
        }),
      } as Response;
    });
    vi.stubGlobal("fetch", fetchMock);
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    const provider = new HttpApiProvider({
      name: "http-api",
      baseUrl: "https://api.ipoalerts.in",
      apiKey: "demo-key",
      pageLimit: 3,
    });

    const items = await provider.fetchIpos();

    expect(fetchMock).toHaveBeenCalledTimes(50);
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain("limit=3");
    expect(items).toHaveLength(50);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("only the first 50 were read"));
  });

  it("uses the vendor cooldown from the 429 response body before retrying", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 429,
        headers: new Headers(),
        json: async () => ({ detail: "Too many requests", meta: { expiresIn: 0 } }),
      } as unknown as Response)
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers(),
        json: async () => ({
          meta: { count: 1, totalPages: 1, page: 1, limit: 1 },
          ipos: [{
            slug: "sample-ipo",
            name: "Sample IPO",
            source: "nse",
            type: "EQ",
            status: "open",
            startDate: "2026-10-13",
            endDate: "2026-10-20", typeOfIssue: "IPO",
          }],
        }),
      } as unknown as Response);
    vi.stubGlobal("fetch", fetchMock);

    const provider = new HttpApiProvider({
      name: "http-api",
      baseUrl: "https://api.ipoalerts.in",
      apiKey: "demo-key",
    });

    const items = await provider.fetchIpos();

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(items).toHaveLength(1);
  });

  it("does not retry when the API key usage quota is exhausted", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
      headers: new Headers(),
      json: async () => ({
        error: "The usage limit for this API key has been reached. (ERR:QTAEXCEEDED)",
      }),
    } as unknown as Response);
    vi.stubGlobal("fetch", fetchMock);

    const provider = new HttpApiProvider({
      name: "http-api",
      baseUrl: "https://api.ipoalerts.in",
      apiKey: "demo-key",
    });

    await expect(provider.fetchIpos()).rejects.toThrow("ERR:QTAEXCEEDED");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("maps NSE IPO bid categories to QIB, NII, retail, and employee multiples", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        // NSE-only bids: must be ignored in favour of the consolidated table.
        bidDetails: [{ category: "Total", noOfTime: "1.1" }],
        activeCat: {
          dataList: [
            { category: "Category", noOfTotalMeant: "No. of times of total meant for the category" },
            { category: "Qualified Institutional Buyers(QIBs)", noOfTotalMeant: "2.5" },
            { category: "Non Institutional Investors", noOfTotalMeant: "1.25" },
            { category: "Non Institutional Investors(Bid amount of more than Ten Lakh Rupees)", noOfTotalMeant: "0.8" },
            { category: "Retail Individual Investors(RIIs)", noOfTotalMeant: "3.75" },
            { category: "Employees", noOfTotalMeant: "0.4" },
            { category: "Total", noOfTotalMeant: "2.1" },
          ],
          updateTime: "Updated as on 27-Oct-2026 17:00:09",
        },
      }),
    } as unknown as Response);
    vi.stubGlobal("fetch", fetchMock);

    const provider = new HttpApiProvider({
      name: "http-api",
      baseUrl: "https://api.ipoalerts.in",
      apiKey: "demo-key",
    });

    const subscription = await provider.fetchSubscription("example-ipo", "EXAMPLE");

    expect(String(fetchMock.mock.calls[0]?.[0])).toContain(
      "https://www.nseindia.com/api/ipo-detail?symbol=EXAMPLE&series=EQ",
    );
    expect(subscription).toMatchObject({
      ipoSlug: "example-ipo",
      qib: 2.5,
      nii: 1.25,
      retail: 3.75,
      employee: 0.4,
      total: 2.1,
      source: "bse+nse",
      // 17:00:09 IST
      sourceUpdatedAt: "2026-10-27T11:30:09.000Z",
    });
  });

  it("stores NSE's official overall figure for SME issues, queried as series SME", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        demandGraphALL: { noOfTimesIssueSubscribed: "6.68" },
        activeCat: {
          dataList: [{ category: "Qualified Institutional Buyers(QIBs)", noOfTotalMeant: "0.00" }],
          updateTime: "Updated as on 16-Oct-2026 19:00:00",
        },
      }),
    } as unknown as Response);
    vi.stubGlobal("fetch", fetchMock);

    const provider = new HttpApiProvider({ name: "http-api", baseUrl: "https://api.ipoalerts.in" });
    const subscription = await provider.fetchSubscription("ravita", "RAVITA", "SME");

    expect(String(fetchMock.mock.calls[0]?.[0])).toContain("symbol=RAVITA&series=SME");
    expect(subscription).toMatchObject({
      total: 6.68,
      qib: null,
      nii: null,
      retail: null,
      source: "nse-sme-total",
      sourceUpdatedAt: "2026-10-16T13:30:00.000Z",
    });
  });

  it("stores an issue price only for fixed-price issues, never the low end of a band", async () => {
    const listPage = (ipo: Record<string, unknown>) => ({
      ok: true,
      status: 200,
      headers: new Headers(),
      json: async () => ({ meta: { count: 1, totalPages: 1, page: 1, limit: 1 }, ipos: [ipo] }),
    });
    vi.stubGlobal("fetch", vi.fn()
      .mockResolvedValueOnce(listPage({ slug: "band-ipo", name: "Band IPO", priceRange: "275-289" }))
      .mockResolvedValueOnce(listPage({ slug: "fixed-ipo", name: "Fixed IPO", priceRange: "105" })));

    const provider = new HttpApiProvider({ name: "http-api", baseUrl: "https://api.ipoalerts.in" });
    const [band] = await provider.fetchIpos();
    const [fixed] = await provider.fetchIpos();

    expect(band).toMatchObject({ priceBandLow: 275, priceBandHigh: 289, issuePrice: null });
    expect(fixed).toMatchObject({ priceBandLow: 105, priceBandHigh: 105, issuePrice: 105 });
  });

  it("fetches each configured status and keeps results when one status is unsupported", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const status = new URL(String(input)).searchParams.get("status");
      if (status === "listed") {
        return {
          ok: false,
          status: 400,
          headers: new Headers(),
          json: async () => ({ detail: "This parameter is not supported for free plan users." }),
        } as Response;
      }
      return {
        ok: true,
        status: 200,
        headers: new Headers(),
        json: async () => ({
          meta: { count: 1, totalPages: 1, page: 1, limit: 1 },
          ipos: [{ slug: `${status}-ipo`, name: `${status} IPO`, priceRange: "100-110" }],
        }),
      } as Response;
    });
    vi.stubGlobal("fetch", fetchMock);
    vi.spyOn(console, "warn").mockImplementation(() => {});

    const provider = new HttpApiProvider({
      name: "http-api",
      baseUrl: "https://api.ipoalerts.in",
      statuses: ["open", "upcoming", "listed"],
    });
    const items = await provider.fetchIpos();

    expect(items.map((item) => item.slug)).toEqual(["open-ipo", "upcoming-ipo"]);
    // The 400 is not retried, so no quota is wasted on it.
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("walks the oldest-first closed list backwards until records leave the lookback window", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-25T00:00:00Z"));
    // Page 591 and 590 are recent; 589 is entirely older than 21 days.
    const listingDateByPage: Record<number, string> = {
      591: "2026-10-28",
      590: "2026-10-21",
      589: "2026-09-01",
      1: "2024-09-17",
    };
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const page = Number(new URL(String(input)).searchParams.get("page"));
      return {
        ok: true,
        status: 200,
        headers: new Headers(),
        json: async () => ({
          meta: { count: 1773, totalPages: 591, page, limit: 3 },
          ipos: [{
            slug: `closed-${page}`,
            name: `Closed ${page}`,
            type: "EQ",
            priceRange: "100-110",
            listingDate: listingDateByPage[page],
          }],
        }),
      } as Response;
    });
    vi.stubGlobal("fetch", fetchMock);

    const provider = new HttpApiProvider({
      name: "http-api",
      baseUrl: "https://api.ipoalerts.in",
      statuses: ["closed"],
      pageLimit: 3,
      closedLookbackDays: 21,
    });
    const items = await provider.fetchIpos();
    vi.useRealTimers();

    const pages = fetchMock.mock.calls.map((call) => new URL(String(call[0])).searchParams.get("page"));
    // Page 1 only gives the page count; reading stops at the first all-old page.
    expect(pages).toEqual(["1", "591", "590", "589"]);
    expect(items.map((item) => item.slug)).toEqual(["closed-591", "closed-590"]);
  });

  it("skips debt, rights and OFS issues but keeps equity, SME and undated announced IPOs", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers(),
      json: async () => ({
        meta: { count: 4, totalPages: 1, page: 1, limit: 3 },
        ipos: [
          { slug: "bond", name: "Some Foundation - ZCZP", type: "DEBT", priceRange: "10-10" },
          { slug: "eq", name: "Equity Ltd", type: "EQ", priceRange: "100-110" },
          { slug: "sme", name: "Small Ltd", type: "SME", priceRange: "50-50" },
          { slug: "announced", name: "Announced Co" },
          { slug: "rights", name: "Minolta Finance Ltd", type: "EQ", startDate: "2026-08-10", endDate: "2026-08-20" },
          { slug: "ofs", name: "Some OFS", type: "EQ", typeOfIssue: "OFS", startDate: "2026-08-10", endDate: "2026-08-12", listingDate: "2026-08-14" },
        ],
      }),
    } as Response));

    const provider = new HttpApiProvider({ name: "http-api", baseUrl: "https://api.ipoalerts.in" });
    const items = await provider.fetchIpos();

    expect(items.map((item) => item.slug)).toEqual(["eq", "sme", "announced"]);
  });
});
