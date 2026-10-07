import { apiFetch } from "./api";

export interface SellerSubscription {
  id: number;
  seller_id: number;
  start_date: string | null;
  end_date: string | null;
  status: "Pending" | "Active" | "Expired" | "Rejected";
  approved_by: number | null;
  approved_at: string | null;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
  approved_by_name?: string;
  seller_name?: string;
  seller_email?: string;
}

// Seller: Get own subscription status
export async function fetchSellerSubscription() {
  return apiFetch<{
    subscription: SellerSubscription | null;
    has_active_subscription: boolean;
  }>("/seller/subscription.php");
}

// Seller: Request new subscription
export async function requestSubscription() {
  return apiFetch<{ success: boolean; subscription_id: number }>(
    "/seller/subscription.php",
    { method: "POST" }
  );
}

// Seller: Start chat with admin
export async function startAdminConversation() {
  return apiFetch<{ conversation_id: number; existing: boolean }>(
    "/seller/start-admin-chat.php",
    { method: "POST" }
  );
}

// Admin: Fetch all subscriptions
export async function fetchAdminSubscriptions(status?: string) {
  const query = status ? `?status=${status}` : "";
  return apiFetch<{ subscriptions: SellerSubscription[] }>(
    `/admin/subscriptions.php${query}`
  );
}

// Admin: Approve / Reject / Expire subscription
export async function manageSubscription(data: {
  id: number;
  action: "approve" | "reject" | "expire";
  reason?: string;
}) {
  return apiFetch<{ success: boolean; message: string; start_date?: string; end_date?: string }>(
    "/admin/subscriptions.php",
    { method: "PUT", body: JSON.stringify(data) }
  );
}
