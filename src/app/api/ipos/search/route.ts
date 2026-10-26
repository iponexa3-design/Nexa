import type { NextRequest } from "next/server";
import { getGmpTrackerData } from "@/services/ipo-query-service";
import { searchTrackerRows } from "@/services/gmp-tracker";

const LIMIT = 8;

/** Name matches for the header search box (reads the database only). */
export async function GET(request: NextRequest) {
  const query = (request.nextUrl.searchParams.get("q") ?? "").slice(0, 80);
  const { rows } = await getGmpTrackerData();
  const matches = searchTrackerRows(rows, query, LIMIT).map((row) => ({
    slug: row.slug,
    companyName: row.companyName,
    ipoType: row.ipoType,
    category: row.category,
  }));
  return Response.json(
    { matches },
    { headers: { "Cache-Control": "public, max-age=60" } },
  );
}
