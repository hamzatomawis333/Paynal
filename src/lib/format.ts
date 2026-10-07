/**
 * Single source of truth for currency and date presentation.
 *
 * Every place that shows money must go through formatPrice so the same amount
 * never renders as "₱1,500" in one view and "₱1,500.00" in another.
 */

const phpCurrency = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
});

export function formatPrice(value: number): string {
  return phpCurrency.format(Number.isFinite(value) ? value : 0);
}

/** Parses API money strings ("1500.00") safely before formatting. */
export function formatMoney(value: string | number | null | undefined): string {
  const n = Number(value ?? 0);
  return formatPrice(Number.isFinite(n) ? n : 0);
}

const dayOnly: Intl.DateTimeFormatOptions = {
  year: "numeric",
  month: "short",
  day: "numeric",
};

const dayLong: Intl.DateTimeFormatOptions = {
  year: "numeric",
  month: "long",
  day: "numeric",
};

export function formatDate(value: string | Date, long = false): string {
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-PH", long ? dayLong : dayOnly);
}

export function formatDateTime(value: string | Date): string {
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("en-PH", { ...dayOnly, hour: "numeric", minute: "2-digit" });
}

/** "awaiting_confirmation" -> "Awaiting Confirmation" */
export function humanizeStatus(status: string): string {
  return status
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/**
 * Compact relative age for notification feeds ("just now", "5m ago").
 *
 * MySQL timestamps arrive as "YYYY-MM-DD HH:MM:SS" (no zone); normalising to
 * a T makes browsers treat them as local time, matching how formatDateTime
 * already renders the same strings.
 */
export function timeAgo(value: string | Date): string {
  const date =
    typeof value === "string" ? new Date(value.replace(" ", "T")) : value;
  if (Number.isNaN(date.getTime())) return "—";

  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return formatDate(date);
}
