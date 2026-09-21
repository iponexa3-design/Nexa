import { IpoSection, EmptyState } from "@/components/ipo/IpoSection";

export default function Home() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <div className="mb-10">
        <h1 className="text-2xl font-bold text-zinc-900 sm:text-3xl">
          Indian IPO GMP, Subscription &amp; Estimated Listing Analysis
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-zinc-500">
          Track upcoming, open and recently listed IPOs with unofficial GMP,
          subscription status and data-based estimated listing gains.
        </p>
      </div>

      <IpoSection
        title="Upcoming IPOs"
        description="IPOs that have not opened for subscription yet."
      >
        <EmptyState message="No upcoming IPO data yet. This section will populate once IPO data is connected." />
      </IpoSection>

      <IpoSection
        title="Open IPOs"
        description="IPOs where subscription is currently open."
      >
        <EmptyState message="No open IPO data yet. This section will populate once IPO data is connected." />
      </IpoSection>

      <IpoSection
        title="Recently Listed IPOs"
        description="IPOs that have recently been listed on the exchange."
      >
        <EmptyState message="No recently listed IPO data yet. This section will populate once IPO data is connected." />
      </IpoSection>
    </div>
  );
}
