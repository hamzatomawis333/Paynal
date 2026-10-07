import { apiFetch } from "./api";

export type SubscriptionPaymentStatus =
  | "pending"
  | "awaiting_confirmation"
  | "completed"
  | "rejected";

export interface SellerSubscription {
  id: number;
  seller_id: number;
  start_date: string | null;
  end_date: string | null;
  status: "Pending" | "Active" | "Expired" | "Rejected";
  payment_status: SubscriptionPaymentStatus;
  payment_amount: string | number;
  transaction_reference: string | null;
  payment_rejection_reason: string | null;
  paid_at: string | null;
  approved_by: number | null;
  approved_at: string | null;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
  approved_by_name?: string;
  seller_name?: string;
  seller_email?: string;
  conversation_id?: number | null;
}

// Seller: Get own subscription status + payment snapshot
export async function fetchSellerSubscription() {
  return apiFetch<{
    subscription: SellerSubscription | null;
    has_active_subscription: boolean;
    /** Destination number for the platform's GCash, only while status is Pending. */
    gcash_number: string;
    subscription_price: number;
  }>("/seller/subscription.php");
}

// Seller: Start a subscription (creates the Pending row + pending payment)
export async function requestSubscription() {
  return apiFetch<{
    success: boolean;
    subscription_id: number;
    payment_status: SubscriptionPaymentStatus;
    payment_amount: number;
    gcash_number: string;
    conversation_id: number | null;
  }>("/seller/subscription.php", { method: "POST" });
}

// Seller: submit (or resubmit after rejection) the GCash reference.
// NEVER activates the subscription - the admin confirms it.
export async function markSubscriptionPaymentSent(
  subscriptionId: number,
  transactionReference: string
) {
  return apiFetch<{
    success: boolean;
    status: SubscriptionPaymentStatus;
    subscription_id: number;
    resubmitted?: boolean;
    already_marked?: boolean;
  }>("/payments/subscription-mark-sent.php", {
    method: "POST",
    body: JSON.stringify({
      subscription_id: subscriptionId,
      transaction_reference: transactionReference,
    }),
  });
}

// Seller: Start chat with admin
export async function startAdminConversation() {
  return apiFetch<{ conversation_id: number; existing: boolean }>(
    "/seller/start-admin-chat.php",
    { method: "POST" }
  );
}
