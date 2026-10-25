import https from "node:https";
import { inflateRawSync } from "node:zlib";
import { withRetry } from "@/utils/retry";

/**
 * Reads the exchanges' official end-of-day "bhavcopy" files, which NSE and
 * BSE publish publicly every trading day (around 6 pm IST). On an IPO's
 * listing day its opening price in this file is the listing price.
 */

export type Exchange = "NSE" | "BSE";

export interface BhavcopyRow {
  exchange: Exchange;
  symbol: string;
  series: string;
  open: number;
  previousClose: number | null;
}

const URLS: Record<Exchange, (yyyymmdd: string) => string> = {
  NSE: (d) => `https://nsearchives.nseindia.com/content/cm/BhavCopy_NSE_CM_0_0_0_${d}_F_0000.csv.zip`,
  BSE: (d) => `https://www.bseindia.com/download/BhavCopy/Equity/BhavCopy_BSE_CM_0_0_0_${d}_F_0000.CSV`,
};

const TIMEOUT_MS = 20_000;

/**
 * Rows keyed by ticker symbol, or null when the file does not exist (not a
 * trading day, or not published yet), so callers can simply retry later.
 */
export async function fetchBhavcopy(
  exchange: Exchange,
  date: Date,
): Promise<Map<string, BhavcopyRow> | null> {
  // Exchange download servers drop connections now and then; retry those.
  return withRetry(() => downloadBhavcopy(exchange, date), { maxRetries: 2, baseDelayMs: 1_000 });
}

async function downloadBhavcopy(
  exchange: Exchange,
  date: Date,
): Promise<Map<string, BhavcopyRow> | null> {
  const { status, body } = await httpGet(URLS[exchange](toYyyymmdd(date)));
  if (status === 404) return null;
  if (status < 200 || status >= 300) {
    throw new Error(`${exchange} bhavcopy request failed with status ${status}`);
  }
  const csv = exchange === "NSE" ? extractSingleFileZip(body) : body.toString("utf8");
  return parseBhavcopy(exchange, csv);
}

/**
 * Plain HTTPS GET. BSE's server sometimes sends a header with stray
 * whitespace that fetch's strict parser rejects, so these two fixed exchange
 * download URLs are read with the lenient parser instead.
 */
function httpGet(url: string): Promise<{ status: number; body: Buffer }> {
  return new Promise((resolve, reject) => {
    const request = https.get(
      url,
      {
        headers: { "User-Agent": "Mozilla/5.0 (compatible; IPONexa listing-price refresh)" },
        insecureHTTPParser: true,
        timeout: TIMEOUT_MS,
      },
      (response) => {
        const chunks: Buffer[] = [];
        response.on("data", (chunk: Buffer) => chunks.push(chunk));
        response.on("end", () => resolve({ status: response.statusCode ?? 0, body: Buffer.concat(chunks) }));
        response.on("error", reject);
      },
    );
    request.on("timeout", () => request.destroy(new Error(`Request timed out: ${url}`)));
    request.on("error", reject);
  });
}

export function parseBhavcopy(exchange: Exchange, csv: string): Map<string, BhavcopyRow> {
  const lines = csv.split(/\r?\n/).filter((line) => line.trim() !== "");
  const header = parseCsvLine(lines[0] ?? "");
  const column = (name: string) => header.indexOf(name);
  const [symbolAt, seriesAt, openAt, prevAt] = [
    column("TckrSymb"),
    column("SctySrs"),
    column("OpnPric"),
    column("PrvsClsgPric"),
  ];
  if ([symbolAt, seriesAt, openAt, prevAt].includes(-1)) {
    throw new Error(`${exchange} bhavcopy has an unexpected format`);
  }

  const rows = new Map<string, BhavcopyRow>();
  for (const line of lines.slice(1)) {
    const cells = parseCsvLine(line);
    const symbol = cells[symbolAt]?.trim().toUpperCase();
    const open = Number(cells[openAt]);
    if (!symbol || !Number.isFinite(open) || open <= 0) continue;
    const previousClose = Number(cells[prevAt]);
    const row: BhavcopyRow = {
      exchange,
      symbol,
      series: cells[seriesAt]?.trim().toUpperCase() ?? "",
      open,
      previousClose: Number.isFinite(previousClose) ? previousClose : null,
    };
    // NSE lists a symbol once per series; keep the equity/SME series row.
    if (!rows.has(symbol) || isPreferredSeries(exchange, row.series)) rows.set(symbol, row);
  }
  return rows;
}

function isPreferredSeries(exchange: Exchange, series: string): boolean {
  return exchange === "NSE" ? ["EQ", "BE", "BZ", "SM", "ST"].includes(series) : true;
}

function parseCsvLine(line: string): string[] {
  const cells: string[] = [];
  let current = "";
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (quoted) {
      if (char === '"' && line[i + 1] === '"') {
        current += '"';
        i++;
      } else if (char === '"') {
        quoted = false;
      } else {
        current += char;
      }
    } else if (char === '"') {
      quoted = true;
    } else if (char === ",") {
      cells.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  cells.push(current);
  return cells;
}

/** NSE ships the CSV as a one-file zip; read it via the central directory. */
function extractSingleFileZip(zip: Buffer): string {
  const eocd = zip.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
  if (eocd < 0) throw new Error("NSE bhavcopy is not a valid zip file");
  const centralDirectory = zip.readUInt32LE(eocd + 16);
  const method = zip.readUInt16LE(centralDirectory + 10);
  const compressedSize = zip.readUInt32LE(centralDirectory + 20);
  const localHeader = zip.readUInt32LE(centralDirectory + 42);
  const nameLength = zip.readUInt16LE(localHeader + 26);
  const extraLength = zip.readUInt16LE(localHeader + 28);
  const start = localHeader + 30 + nameLength + extraLength;
  const data = zip.subarray(start, start + compressedSize);
  if (method === 0) return data.toString("utf8");
  if (method === 8) return inflateRawSync(data).toString("utf8");
  throw new Error(`NSE bhavcopy uses unsupported zip compression (${method})`);
}

function toYyyymmdd(date: Date): string {
  // Listing dates are stored as UTC midnight of the IST calendar day.
  return date.toISOString().slice(0, 10).replace(/-/g, "");
}
