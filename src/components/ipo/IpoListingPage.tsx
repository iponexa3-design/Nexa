import { IpoCollection } from "@/components/ipo/IpoCollection";
import { PageSearchBox, PageSearchProvider } from "@/components/search/PageSearch";
import { getHomepageIpoGroups } from "@/services/ipo-query-service";

type IpoListingCategory = "upcoming" | "open" | "recentlyListed";

const categoryDetails = {
  upcoming: {
    title: "Upcoming IPOs",
    description: "Explore announced and upcoming IPO issues, dates, pricing and application details.",
    emptyMessage: "There are no upcoming IPOs in the current feed.",
    accent: "blue",
  },
  open: {
    title: "Open IPOs",
    description: "Review IPOs currently accepting applications, including price band, lot size and subscription data.",
    emptyMessage: "There are no IPOs open for subscription in the current feed.",
    accent: "emerald",
  },
  recentlyListed: {
    title: "Recently Listed IPOs",
    description: "Compare issue prices with listing outcomes and review recently listed companies.",
    emptyMessage: "There are no recently listed IPOs in the current feed.",
    accent: "amber",
  },
} as const;

export async function IpoListingPage({
  category,
}: {
  category: IpoListingCategory;
}) {
  const groups = await getHomepageIpoGroups();
  const details = categoryDetails[category];
  const items = groups[category];

  return (
    <div className="min-h-full bg-[linear-gradient(180deg,#eaf3f2_0%,#f3f7f6_380px,#f3f7f6_100%)]">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
        <header className="mb-8 rounded-[24px] border border-[#174a52] bg-[linear-gradient(125deg,#123a41_0%,#174a52_62%,#28727b_100%)] px-6 py-7 text-white shadow-[0_20px_50px_rgba(23,74,82,0.16)] sm:px-8">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#c6e0df]">
            IPO market board
          </p>
          <div className="mt-3 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <h1 className="text-3xl font-black leading-tight sm:text-4xl">
                {details.title}
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-[#d7e8e7]">
                {details.description}
              </p>
            </div>
            <p className="shrink-0 rounded-xl border border-white/15 bg-white/10 px-4 py-2 text-sm font-semibold text-white">
              {items.length} {items.length === 1 ? "IPO" : "IPOs"}
            </p>
          </div>
        </header>

        {groups.liveFeedUnavailable ? (
          <div role="status" className="mb-6 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950">
            {groups.liveFeedQuotaExceeded
              ? "The live IPO feed is unavailable because its API usage limit has been reached. Showing saved data where available."
              : "The live IPO feed is temporarily unavailable. Showing saved data where available."}
          </div>
        ) : null}

        <PageSearchProvider>
          <PageSearchBox className="mb-5 max-w-md" />
          <IpoCollection
            items={items}
            pageSize={12}
            listed={category === "recentlyListed"}
            accent={details.accent}
            emptyMessage={groups.liveFeedUnavailable
              ? "No saved IPO records are available for this section right now."
              : details.emptyMessage}
            />
        </PageSearchProvider>
      </div>
    </div>
  );
}