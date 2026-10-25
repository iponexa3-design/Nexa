"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";

const KEY = "iponexa:analytics-consent";
const listeners = new Set<() => void>();

function readChoice(): string {
  try {
    return window.localStorage.getItem(KEY) ?? "unset";
  } catch {
    return "unset";
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

type Gtag = (...args: unknown[]) => void;

/**
 * One-time notice asking whether analytics cookies may be used. The choice
 * is remembered in this browser; "Accept" turns Google Analytics cookies on
 * through Consent Mode. Hidden during server rendering.
 */
export function CookieNotice({ enabled }: { enabled: boolean }) {
  const choice = useSyncExternalStore(subscribe, readChoice, () => "server");
  if (!enabled || choice !== "unset") return null;

  const decide = (value: "granted" | "denied") => {
    try {
      window.localStorage.setItem(KEY, value);
    } catch {
      // Storage unavailable: the notice may show again next visit.
    }
    const gtag = (window as unknown as { gtag?: Gtag }).gtag;
    gtag?.("consent", "update", { analytics_storage: value });
    listeners.forEach((listener) => listener());
  };

  return (
    <div
      role="dialog"
      aria-label="Cookie notice"
      className="fixed inset-x-3 bottom-3 z-50 mx-auto flex max-w-3xl flex-col gap-3 rounded-2xl border border-[#dce7e5] bg-white p-4 text-sm text-zinc-700 shadow-[0_18px_40px_rgba(18,58,65,0.22)] sm:flex-row sm:items-center sm:justify-between"
    >
      <p className="leading-6">
        We use Google Analytics cookies to understand how many people visit and which pages help them.
        No ads, no selling of data.{" "}
        <Link href="/privacy" className="font-semibold text-[#174a52] underline underline-offset-4">
          Privacy policy
        </Link>
      </p>
      <div className="flex shrink-0 gap-2">
        <button
          type="button"
          onClick={() => decide("denied")}
          className="rounded-xl border border-[#c6dddc] px-4 py-2 font-bold text-[#174a52] hover:bg-[#eef6f5]"
        >
          Decline
        </button>
        <button
          type="button"
          onClick={() => decide("granted")}
          className="rounded-xl bg-[#174a52] px-4 py-2 font-bold text-white hover:bg-[#123a41]"
        >
          Accept
        </button>
      </div>
    </div>
  );
}
