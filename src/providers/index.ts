import type { IpoDataProvider } from "@/providers/ipo-data-provider";
import { ManualJsonProvider } from "@/providers/manual-json-provider";
import { HttpApiProvider } from "@/providers/http-api-provider";

/**
 * Selects the active IPO data provider from IPO_DATA_PROVIDER, so the
 * rest of the app never hardcodes a specific vendor.
 */
export function getIpoDataProvider(): IpoDataProvider {
  const provider = process.env.IPO_DATA_PROVIDER?.trim().toLowerCase() || "manual";

  switch (provider) {
    case "manual":
      return new ManualJsonProvider();

    case "http":
    case "public": {
      const baseUrl = process.env.IPO_API_BASE_URL;
      const apiKey = process.env.IPO_API_KEY;
      if (!baseUrl) {
        throw new Error(
          "IPO_DATA_PROVIDER=http/public requires IPO_API_BASE_URL to be set.",
        );
      }
      return new HttpApiProvider({
        name: provider === "public" ? "public-api" : "http-api",
        baseUrl,
        apiKey: apiKey || undefined,
        statuses: (process.env.IPO_API_STATUSES ?? "open")
          .split(",")
          .map((status) => status.trim().toLowerCase())
          .filter(Boolean),
        pageLimit: Number(process.env.IPO_API_PAGE_LIMIT ?? 1),
        closedLookbackDays: Number(process.env.IPO_API_CLOSED_LOOKBACK_DAYS ?? 21),
        closedMaxPages: Number(process.env.IPO_API_CLOSED_MAX_PAGES ?? 40),
      });
    }

    default:
      throw new Error(`Unknown IPO_DATA_PROVIDER: "${provider}"`);
  }
}
