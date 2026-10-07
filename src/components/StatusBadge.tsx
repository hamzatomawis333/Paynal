import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { humanizeStatus } from "@/lib/format";

/**
 * One badge for every status in the system.
 *
 * Rules:
 * - Colors are token-safe in light AND dark mode (opacity tints + dark: text).
 * - Based on the `outline` variant so the default hover background never
 *   bleeds through a custom status color.
 * - Every status has a human label; raw values never reach the screen.
 */

type Tone =
  | "amber"
  | "blue"
  | "green"
  | "red"
  | "violet"
  | "teal"
  | "slate"
  | "primary";

const toneClass: Record<Tone, string> = {
  amber: "border-transparent bg-amber-500/15 text-amber-700 dark:text-amber-400",
  blue: "border-transparent bg-sky-500/15 text-sky-700 dark:text-sky-400",
  green: "border-transparent bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  red: "border-transparent bg-red-500/15 text-red-700 dark:text-red-400",
  violet: "border-transparent bg-violet-500/15 text-violet-700 dark:text-violet-400",
  teal: "border-transparent bg-teal-500/15 text-teal-700 dark:text-teal-400",
  slate: "border-transparent bg-slate-500/15 text-slate-700 dark:text-slate-400",
  primary: "border-transparent bg-primary/15 text-primary",
};

interface StatusEntry {
  label: string;
  tone: Tone;
}

const orderStatus: Record<string, StatusEntry> = {
  pending: { label: "Pending", tone: "amber" },
  confirmed: { label: "Confirmed", tone: "teal" },
  processing: { label: "Processing", tone: "blue" },
  shipped: { label: "Shipped", tone: "violet" },
  delivered: { label: "Delivered", tone: "green" },
  cancelled: { label: "Cancelled", tone: "red" },
  /** Synthetic: the order's cancel_requested flag, while status is still live. */
  cancel_requested: { label: "Cancellation requested", tone: "amber" },
};

/** Payment-group status as the BUYER reads it. */
const paymentStatusBuyer: Record<string, StatusEntry> = {
  pending: { label: "Awaiting your payment", tone: "amber" },
  unpaid: { label: "Not paid yet", tone: "amber" },
  awaiting_confirmation: { label: "Sent — awaiting seller", tone: "blue" },
  paid: { label: "Paid", tone: "green" },
  completed: { label: "Confirmed by seller", tone: "green" },
  rejected: { label: "Payment rejected", tone: "red" },
  failed: { label: "Failed", tone: "red" },
  refunded: { label: "Refunded", tone: "slate" },
};

/** Payment-group status as the SELLER reads it (their action is pending). */
const paymentStatusSeller: Record<string, StatusEntry> = {
  pending: { label: "Not sent by buyer", tone: "amber" },
  unpaid: { label: "Not paid yet", tone: "amber" },
  awaiting_confirmation: { label: "Awaiting your confirmation", tone: "blue" },
  paid: { label: "Paid", tone: "green" },
  completed: { label: "Confirmed", tone: "green" },
  rejected: { label: "Rejected", tone: "red" },
  failed: { label: "Failed", tone: "red" },
  refunded: { label: "Refunded", tone: "slate" },
};

/** Title-case statuses coming from the subscriptions API. */
const subscriptionStatus: Record<string, StatusEntry> = {
  Pending: { label: "Pending", tone: "amber" },
  Active: { label: "Active", tone: "green" },
  Expired: { label: "Expired", tone: "slate" },
  Rejected: { label: "Rejected", tone: "red" },
};

/**
 * Subscription payment as the ADMIN reads it (their verification is pending).
 * Kept separate from the buyer/seller order-payment maps because neither of
 * those wordings fits: the payer here is a seller and the verifier is admin.
 */
const subscriptionPaymentStatus: Record<string, StatusEntry> = {
  pending: { label: "Not sent yet", tone: "amber" },
  awaiting_confirmation: { label: "Awaiting verification", tone: "blue" },
  completed: { label: "Paid", tone: "green" },
  rejected: { label: "Payment rejected", tone: "red" },
};

const activeStatus: Record<string, StatusEntry> = {
  active: { label: "Active", tone: "green" },
  inactive: { label: "Inactive", tone: "slate" },
};

export type StatusKind =
  | "order"
  | "payment"
  | "subscription"
  | "subscription-payment"
  | "active";

interface StatusBadgeProps {
  status: string;
  kind: StatusKind;
  /** Which side of the payment conversation is reading the badge. */
  audience?: "buyer" | "seller";
  className?: string;
  /** Optional leading icon (already sized by the Badge's svg rules). */
  children?: React.ReactNode;
}

export function StatusBadge({
  status,
  kind,
  audience = "buyer",
  className,
  children,
}: StatusBadgeProps) {
  const table: Record<string, StatusEntry> =
    kind === "order"
      ? orderStatus
      : kind === "payment"
        ? audience === "seller"
          ? paymentStatusSeller
          : paymentStatusBuyer
        : kind === "subscription"
          ? subscriptionStatus
          : kind === "subscription-payment"
            ? subscriptionPaymentStatus
            : activeStatus;

  const entry = table[status];

  // Unknown value: show a readable version rather than an empty badge.
  if (!entry) {
    return (
      <Badge variant="secondary" className={cn("font-medium", className)}>
        {children}
        {humanizeStatus(status || "unknown")}
      </Badge>
    );
  }

  return (
    <Badge
      variant="outline"
      className={cn("gap-1 font-medium", toneClass[entry.tone], className)}
    >
      {children}
      {entry.label}
    </Badge>
  );
}

/** Convenience for places that just need the classes (inline rows, selects). */
export function statusTone(status: string, kind: StatusKind): string {
  const table =
    kind === "order"
      ? orderStatus
      : kind === "payment"
        ? paymentStatusBuyer
        : kind === "subscription"
          ? subscriptionStatus
          : kind === "subscription-payment"
            ? subscriptionPaymentStatus
            : activeStatus;
  const entry = table[status];
  return entry ? toneClass[entry.tone] : "";
}
