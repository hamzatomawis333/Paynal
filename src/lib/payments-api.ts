import { apiFetch } from "./api";

// ==================== MANUAL GCASH PAYMENTS ====================
//
// GCash here is a manual, human-verified transfer: the buyer sends real money
// to each seller's registered number, then marks it sent, then the seller
// checks their own GCash and confirms or rejects. Nothing in this file ever
// marks a payment paid on the buyer's behalf.

export type PaymentStatus =
  | "pending"
  | "awaiting_confirmation"
  | "completed"
  | "rejected"
  | "failed"
  | "refunded";

export type OrderPaymentStatus =
  | "pending"
  | "unpaid"
  | "awaiting_confirmation"
  | "paid"
  | "rejected"
  | "refunded";

export interface PaymentItem {
  name: string;
  image_url: string | null;
  quantity: number;
  unit_price: number;
  subtotal: number;
}

export interface PaymentGroup {
  payment_id: number;
  seller_id: number | null;
  seller_name: string;
  /** Digits only, or "" when the seller has no valid GCash number on file. */
  gcash_number: string;
  amount: number;
  subtotal: number;
  shipping_share: number;
  status: PaymentStatus;
  conversation_id: number | null;
  transaction_reference: string | null;
  rejection_reason: string | null;
  paid_at: string | null;
  items: PaymentItem[];
}

export interface PaymentOrderSummary {
  id: number;
  order_number: string;
  total_amount: number;
  shipping_fee: number;
  status: string;
  payment_method: string;
  payment_status: OrderPaymentStatus;
}

export interface PaymentSnapshot {
  order: PaymentOrderSummary;
  buyer_name: string | null;
  payment_groups: PaymentGroup[];
}

export function fetchOrderPayments(orderId: number) {
  return apiFetch<PaymentSnapshot>(`/payments/index.php?order_id=${orderId}`);
}

/**
 * Buyer-only. Moves pending -> awaiting_confirmation and notifies the seller.
 *
 * The GCash reference number is mandatory: it is the only shared evidence that
 * money moved, and without it the seller has nothing to match against their own
 * GCash history.
 */
export function markPaymentSent(paymentId: number, transactionReference: string) {
  return apiFetch<{
    success: boolean;
    already_marked?: boolean;
    status: PaymentStatus;
    payment_id: number;
    /** True when this reopened a payment the seller had rejected. */
    resubmitted?: boolean;
    order_payment_status?: OrderPaymentStatus;
  }>("/payments/mark-sent.php", {
    method: "POST",
    body: JSON.stringify({
      payment_id: paymentId,
      transaction_reference: transactionReference.trim(),
    }),
  });
}

/** Same rule the server enforces, so the UI can disable the button up front. */
export function normaliseGcashReference(raw: string) {
  return raw.replace(/[\s-]+/g, "");
}

export function validateGcashReference(raw: string): string | null {
  const value = normaliseGcashReference(raw);
  if (value === "") return "Enter the reference number from your GCash receipt";
  if (!/^[A-Za-z0-9]+$/.test(value)) return "Letters and numbers only";
  if (value.length < 6) return "At least 6 characters";
  if (value.length > 32) return "At most 32 characters";
  return null;
}

/**
 * Formats a reference for reading, grouping digits 4-3-4 and leaving letters
 * ungrouped (some references are alphanumeric).
 *
 * Display only. The stored value is always the normalised string from
 * `normaliseGcashReference`, so grouping never leaks into the API call.
 */
export function formatGcashReference(raw: string): string {
  const value = normaliseGcashReference(raw).toUpperCase();
  if (value === "") return "";
  if (!/^\d+$/.test(value)) return value;
  return [
    value.slice(0, 4),
    value.slice(4, 7),
    value.slice(7, 11),
  ]
    .filter((part, i) => part !== "" && (i === 0 || part.length > 0))
    .join(" ");
}

export type RejectReasonCode =
  | "not_received"
  | "wrong_amount"
  | "wrong_number"
  | "unverifiable"
  | "other";

export const REJECT_REASONS: { value: RejectReasonCode; label: string }[] = [
  { value: "not_received", label: "Payment not received" },
  { value: "wrong_amount", label: "Incorrect amount received" },
  { value: "wrong_number", label: "Sent to the wrong GCash number" },
  { value: "unverifiable", label: "Cannot verify the transaction" },
  { value: "other", label: "Other (add a note)" },
];

/**
 * Seller-only, and only for the seller's own payment.
 *
 * `note` is only required when rescuing a rejected payment (the API rejects it
 * with 400 otherwise). Pass a short explanation of how the money arrived; it is
 * stored in the payment_events audit trail and echoed to the buyer in chat, so
 * it should read as something the buyer can understand.
 */
export function confirmPayment(paymentId: number, note?: string) {
  return apiFetch<{
    success: boolean;
    already_confirmed?: boolean;
    status: PaymentStatus;
    payment_id: number;
    /** True when this confirmed a payment the seller had previously rejected. */
    recovered_from_rejection?: boolean;
    order_payment_status: OrderPaymentStatus;
    order_fully_paid: boolean;
  }>("/payments/confirm.php", {
    method: "POST",
    body: JSON.stringify({ payment_id: paymentId, note: note?.trim() || undefined }),
  });
}

/** Seller-only. Only valid while the payment is awaiting confirmation. */
export function rejectPayment(paymentId: number, reasonCode: RejectReasonCode, reason: string) {
  return apiFetch<{
    success: boolean;
    already_rejected?: boolean;
    status: PaymentStatus;
    payment_id: number;
    rejection_reason: string;
    order_payment_status: OrderPaymentStatus;
    order_fully_paid: boolean;
  }>("/payments/reject.php", {
    method: "POST",
    body: JSON.stringify({ payment_id: paymentId, reason_code: reasonCode, reason }),
  });
}

// ==================== PRESENTATION ====================

export const paymentStatusLabel: Record<PaymentStatus, string> = {
  pending: "Waiting for you to send",
  awaiting_confirmation: "Sent - waiting for seller",
  completed: "Confirmed by seller",
  rejected: "Could not be verified",
  failed: "Failed",
  refunded: "Refunded",
};

export const paymentStatusClass: Record<PaymentStatus, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  awaiting_confirmation: "bg-blue-100 text-blue-800",
  completed: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
  failed: "bg-red-100 text-red-800",
  refunded: "bg-gray-100 text-gray-800",
};

export function formatGcashNumber(digits: string) {
  if (!digits) return "";
  const groups = digits.length === 11
    ? [digits.slice(0, 3), digits.slice(3), digits.slice(10)]
    : [digits.slice(0, 3), digits.slice(3, 6), digits.slice(6)];
  return groups.filter(Boolean).join(" ");
}

/**
 * A fresh key per checkout attempt. The server rejects a replay of a key it has
 * already seen, so this is what stops a double-click from creating two orders.
 */
export function newIdempotencyKey() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `k_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 12)}`;
}