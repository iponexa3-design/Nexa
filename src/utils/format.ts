// Whole rupees without decimals (₹4,035); amounts with paise always with two
// (₹855.90, never ₹855.9), as GMP is often quoted in paise.
const wholeRupeeFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});
const paiseFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const currencyFormatter = {
  format: (value: number) =>
    (Math.abs(Math.round(value * 100) % 100) === 0 ? wholeRupeeFormatter : paiseFormatter).format(value),
};

// Pinned to IST so server-rendered and client-rendered text always match,
// and IPO dates read the same for every visitor.
const dateFormatter = new Intl.DateTimeFormat("en-IN", {
  timeZone: "Asia/Kolkata",
  day: "numeric",
  month: "short",
  year: "numeric",
});

const dateTimeFormatter = new Intl.DateTimeFormat("en-IN", {
  timeZone: "Asia/Kolkata",
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

export function formatCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return "Not available";
  }
  return currencyFormatter.format(value);
}

const shortDateFormatter = new Intl.DateTimeFormat("en-IN", {
  timeZone: "Asia/Kolkata",
  day: "numeric",
  month: "short",
});

/** Currency with an explicit +/- sign, for gains and losses. */
export function formatSignedCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return "Not available";
  }
  const sign = value > 0 ? "+" : value < 0 ? "-" : "";
  return `${sign}${currencyFormatter.format(Math.abs(value))}`;
}

export function formatSignedPercent(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return "Not available";
  }
  const sign = value > 0 ? "+" : value < 0 ? "-" : "";
  return `${sign}${Math.abs(value).toFixed(2)}%`;
}

export function formatShortDate(value: Date | string | null | undefined): string {
  if (!value) return "Not available";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "Not available";
  return shortDateFormatter.format(date);
}

export function formatSubscriptionTimes(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return "Not available";
  }
  return `${value.toFixed(2)}x`;
}

export function formatPercent(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return "Not available";
  }
  return `${value.toFixed(2)}%`;
}

export function formatDate(value: Date | string | null | undefined): string {
  if (!value) return "Not available";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "Not available";
  return dateFormatter.format(date);
}

export function formatDateTime(value: Date | string | null | undefined): string {
  if (!value) return "Not available";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "Not available";
  return dateTimeFormatter.format(date);
}

export function formatPriceBand(
  low: number | null | undefined,
  high: number | null | undefined,
): string {
  if (!Number.isFinite(low) && !Number.isFinite(high)) return "Not available";
  if (Number.isFinite(low) && Number.isFinite(high)) {
    if (low === high) return formatCurrency(low);
    return `${formatCurrency(low)} - ${formatCurrency(high)}`;
  }
  return formatCurrency(high ?? low);
}
