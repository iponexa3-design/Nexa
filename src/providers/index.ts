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

    case "http": {
      const baseUrl = process.env.IPO_API_BASE_URL;
      const apiKey = process.env.IPO_API_KEY;
      if (!baseUrl || !apiKey) {
        throw new Error(
          "IPO_DATA_PROVIDER=http requires IPO_API_BASE_URL and IPO_API_KEY to be set.",
        );
      }
      return new HttpApiProvider({ name: "http-api", baseUrl, apiKey });
    }

    default:
      throw new Error(`Unknown IPO_DATA_PROVIDER: "${provider}"`);
  }
}
