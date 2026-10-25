"use client";

import { useSyncExternalStore } from "react";

export type ViewMode = "grid" | "list";

const listeners = new Set<() => void>();

function read(key: string, fallback: ViewMode): ViewMode {
  try {
    const stored = window.localStorage.getItem(key);
    return stored === "list" || stored === "grid" ? stored : fallback;
  } catch {
    return fallback;
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (event: StorageEvent) => {
    if (event.key?.startsWith("iponexa:")) listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

/**
 * A remembered grid/list preference (shared across tabs). IPO collections
 * share one key; the GMP tracker keeps its own, defaulting to its table.
 * The server renders the fallback, then the stored choice applies.
 */
export function useViewMode(
  key = "iponexa:view-mode",
  fallback: ViewMode = "grid",
): [ViewMode, (mode: ViewMode) => void] {
  const mode = useSyncExternalStore(subscribe, () => read(key, fallback), () => fallback);
  const setMode = (next: ViewMode) => {
    try {
      window.localStorage.setItem(key, next);
    } catch {
      // Storage unavailable (private mode): the choice lasts for this page only.
    }
    listeners.forEach((listener) => listener());
  };
  return [mode, setMode];
}

export function ViewModeToggle({
  mode,
  onChange,
  gridLabel = "Grid",
  listLabel = "List",
}: {
  mode: ViewMode;
  onChange: (mode: ViewMode) => void;
  gridLabel?: string;
  listLabel?: string;
}) {
  const options: Array<{ key: ViewMode; label: string; icon: React.ReactNode }> = [
    {
      key: "grid",
      label: gridLabel,
      icon: (
        <path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      ),
    },
    {
      key: "list",
      label: listLabel,
      icon: <path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />,
    },
  ];

  return (
    <div role="group" aria-label="Layout" className="inline-flex shrink-0 rounded-xl border border-[#dce7e5] bg-white p-1">
      {options.map((option) => {
        const active = mode === option.key;
        return (
          <button
            key={option.key}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(option.key)}
            className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-bold transition-colors ${
              active ? "bg-[#e6f0ef] text-[#174a52]" : "text-zinc-500 hover:text-[#174a52]"
            }`}
          >
            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5">
              {option.icon}
            </svg>
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
