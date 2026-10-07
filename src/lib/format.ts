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
