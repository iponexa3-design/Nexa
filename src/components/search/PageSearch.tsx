"use client";

import Link from "next/link";
import { createContext, useContext, useId, useState, type ReactNode } from "react";

interface PageSearchState {
  query: string;
  setQuery: (query: string) => void;
}

const PageSearchContext = createContext<PageSearchState | null>(null);

/** True when `name` contains every word of the query (case-insensitive). */
export function nameMatches(name: string, query: string): boolean {
  const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const haystack = name.toLowerCase();
  return words.every((word) => haystack.includes(word));
}

/**
 * Search that filters the IPOs shown on the current page only. Wrap the page
 * content; lists inside read the query through `usePageSearch`.
 */
export function PageSearchProvider({ children }: { children: ReactNode }) {
  const [query, setQuery] = useState("");
  return <PageSearchContext.Provider value={{ query, setQuery }}>{children}</PageSearchContext.Provider>;
}

/** The current query and a matcher; matches everything outside a provider. */
export function usePageSearch(): { query: string; matches: (name: string) => boolean } {
  const state = useContext(PageSearchContext);
  const query = state?.query.trim() ?? "";
  return { query, matches: (name) => query === "" || nameMatches(name, query) };
}

export function PageSearchBox({
  placeholder = "Search IPOs on this page",
  allIposHint = true,
  className = "",
}: {
  placeholder?: string;
  /** Show a link to search every IPO in the GMP Tracker while typing. */
  allIposHint?: boolean;
  className?: string;
}) {
  const state = useContext(PageSearchContext);
  const id = useId();
  if (!state) return null;
  const trimmed = state.query.trim();

  return (
    <div className={className}>
      <div className="relative">
        <label htmlFor={id} className="sr-only">
          {placeholder}
        </label>
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          fill="none"
          className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400"
        >
          <path d="m20 20-4.2-4.2M17 10.5a6.5 6.5 0 1 1-13 0 6.5 6.5 0 0 1 13 0Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
        <input
          id={id}
          type="search"
          value={state.query}
          onChange={(event) => state.setQuery(event.target.value)}
          placeholder={placeholder}
          autoComplete="off"
          enterKeyHint="search"
          maxLength={80}
          className="w-full rounded-xl border border-[#dce7e5] bg-white py-2.5 pl-10 pr-3 text-sm text-zinc-800 shadow-[0_4px_14px_rgba(23,74,82,0.04)] outline-none placeholder:text-zinc-400 focus:border-[#4f8f93] focus:ring-2 focus:ring-[#cfe4e3]"
        />
      </div>
      {allIposHint && trimmed ? (
        <p className="mt-2 text-xs text-zinc-500">
          Showing matches on this page.{" "}
          <Link href={`/gmp-tracker?q=${encodeURIComponent(trimmed)}`} className="font-semibold text-[#174a52] underline underline-offset-2">
            Search all IPOs in the GMP Tracker
          </Link>
        </p>
      ) : null}
    </div>
  );
}

/** Renders its children only when `name` matches the page search. */
export function SearchItem({ name, children }: { name: string; children: ReactNode }) {
  const { matches } = usePageSearch();
  return matches(name) ? <>{children}</> : null;
}

/** A "nothing matches" note for a list, shown only when none of `names` match. */
export function SearchNoMatches({ names }: { names: string[] }) {
  const { query, matches } = usePageSearch();
  if (query === "" || names.length === 0 || names.some(matches)) return null;
  return (
    <p className="rounded-2xl border border-dashed border-[#dce7e5] bg-white/70 px-5 py-4 text-sm text-zinc-600">
      No IPOs here match &ldquo;{query}&rdquo;.
    </p>
  );
}
