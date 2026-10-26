"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import type { TrackerCategory } from "@/services/gmp-tracker";

interface SearchMatch {
  slug: string;
  companyName: string;
  ipoType: string;
  category: TrackerCategory;
}

const categoryBadge: Record<TrackerCategory, { label: string; className: string }> = {
  open: { label: "Open", className: "bg-emerald-100 text-emerald-800" },
  upcoming: { label: "Upcoming", className: "bg-sky-100 text-sky-800" },
  closed: { label: "Awaiting listing", className: "bg-violet-100 text-violet-800" },
  listed: { label: "Listed", className: "bg-amber-100 text-amber-800" },
};

const MIN_CHARS = 2;

/**
 * Site-wide IPO search: suggestions while typing (link to the IPO page),
 * Enter shows every match in the GMP Tracker.
 */
export function HeaderSearch({ className = "" }: { className?: string }) {
  const router = useRouter();
  const listId = useId();
  const [query, setQuery] = useState("");
  const [matches, setMatches] = useState<SearchMatch[]>([]);
  const [searchedFor, setSearchedFor] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const boxRef = useRef<HTMLDivElement>(null);

  const trimmed = query.trim();
  const ready = trimmed.length >= MIN_CHARS;

  useEffect(() => {
    if (!ready) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const response = await fetch(`/api/ipos/search?q=${encodeURIComponent(trimmed)}`, { signal: controller.signal });
        if (!response.ok) return;
        const body = (await response.json()) as { matches: SearchMatch[] };
        setMatches(body.matches);
        setSearchedFor(trimmed);
        setActive(-1);
      } catch {
        // Aborted or offline: keep the previous suggestions.
      }
    }, 180);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [trimmed, ready]);

  useEffect(() => {
    function onPointerDown(event: PointerEvent) {
      if (!boxRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);

  const visible = ready && searchedFor !== "" ? matches : [];
  const showPanel = open && ready && searchedFor !== "";

  function finish() {
    setOpen(false);
    setQuery("");
    setMatches([]);
    setSearchedFor("");
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    if (active >= 0 && visible[active]) {
      router.push(`/ipo/${visible[active].slug}`);
    } else if (trimmed) {
      router.push(`/gmp-tracker?q=${encodeURIComponent(trimmed)}`);
    } else {
      return;
    }
    finish();
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown" && visible.length > 0) {
      event.preventDefault();
      setOpen(true);
      setActive((index) => (index + 1) % visible.length);
    } else if (event.key === "ArrowUp" && visible.length > 0) {
      event.preventDefault();
      setActive((index) => (index <= 0 ? visible.length - 1 : index - 1));
    } else if (event.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div ref={boxRef} className={`relative ${className}`}>
      <form role="search" onSubmit={submit}>
        <label htmlFor={`${listId}-input`} className="sr-only">
          Search IPOs
        </label>
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          fill="none"
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400"
        >
          <path d="m20 20-4.2-4.2M17 10.5a6.5 6.5 0 1 1-13 0 6.5 6.5 0 0 1 13 0Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
        <input
          id={`${listId}-input`}
          type="search"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder="Search IPOs"
          autoComplete="off"
          enterKeyHint="search"
          maxLength={80}
          role="combobox"
          aria-expanded={showPanel}
          aria-controls={`${listId}-list`}
          aria-autocomplete="list"
          aria-activedescendant={active >= 0 ? `${listId}-option-${active}` : undefined}
          className="w-full rounded-xl border border-[#dce7e5] bg-white py-2 pl-9 pr-3 text-sm text-zinc-800 outline-none placeholder:text-zinc-400 focus:border-[#4f8f93] focus:ring-2 focus:ring-[#cfe4e3]"
        />
      </form>

      {showPanel ? (
        <div className="absolute right-0 z-50 mt-2 w-full min-w-[18rem] overflow-hidden rounded-2xl border border-[#dce7e5] bg-white shadow-[0_18px_40px_rgba(18,58,65,0.18)]">
          {visible.length > 0 ? (
            <ul id={`${listId}-list`} role="listbox" aria-label="Matching IPOs" className="max-h-80 overflow-y-auto py-1">
              {visible.map((match, index) => {
                const badge = categoryBadge[match.category];
                return (
                  <li key={match.slug} id={`${listId}-option-${index}`} role="option" aria-selected={index === active}>
                    <Link
                      href={`/ipo/${match.slug}`}
                      onClick={finish}
                      onMouseEnter={() => setActive(index)}
                      className={`flex items-center justify-between gap-3 px-4 py-2.5 text-sm ${index === active ? "bg-[#eef6f5]" : ""}`}
                    >
                      <span className="min-w-0">
                        <span className="block truncate font-semibold text-zinc-900">{match.companyName}</span>
                        <span className="text-xs text-zinc-500">{match.ipoType === "SME" ? "SME" : "Mainboard"}</span>
                      </span>
                      <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold ${badge.className}`}>
                        {badge.label}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p id={`${listId}-list`} className="px-4 py-3 text-sm text-zinc-600">
              No IPOs match &ldquo;{searchedFor}&rdquo;.
            </p>
          )}
          <Link
            href={`/gmp-tracker?q=${encodeURIComponent(trimmed)}`}
            onClick={finish}
            className="block border-t border-[#eef3f2] bg-[#f7faf9] px-4 py-2.5 text-sm font-bold text-[#174a52] hover:bg-[#eef6f5]"
          >
            See all results in GMP Tracker →
          </Link>
        </div>
      ) : null}
    </div>
  );
}
