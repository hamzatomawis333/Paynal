import { apiFetch } from "./api";
import type {
  AdminCategory,
  AdminOrder,
  AdminOrderDetail,
  AdminPaymentMethod,
  AdminSeller,
  AdminSellerDetail,
  AdminSubscription,
  AdminUser,
} from "@/types/api";

// ==================== USERS ====================
export async function fetchAdminUsers() {
  return apiFetch<{ users: AdminUser[] }>("/admin/users.php");
}

export async function updateAdminUser(userId: number, data: { role?: string; is_active?: number }) {
  return apiFetch<{ success: boolean }>("/admin/users.php", {
    method: "PUT",
    body: JSON.stringify({ user_id: userId, ...data }),
  });
}

export async function deleteAdminUser(userId: number) {
  return apiFetch<{ success: boolean }>("/admin/users.php", {
    method: "DELETE",
    body: JSON.stringify({ user_id: userId }),
  });
}

// ==================== CATEGORIES ====================
export async function fetchAdminCategories() {
  return apiFetch<{ categories: AdminCategory[] }>("/admin/categories.php");
}

export async function createAdminCategory(data: { name: string; slug: string; description: string }) {
  return apiFetch<{ success: boolean; category_id: number }>("/admin/categories.php", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateAdminCategory(data: { id: number; name: string; slug: string; description: string }) {
  return apiFetch<{ success: boolean }>("/admin/categories.php", {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function deleteAdminCategory(id: number) {
  return apiFetch<{ success: boolean }>("/admin/categories.php", {
    method: "DELETE",
    body: JSON.stringify({ id }),
  });
}

// ==================== PAYMENT METHODS ====================
export async function fetchAdminPaymentMethods() {
  return apiFetch<{ payment_methods: AdminPaymentMethod[] }>("/admin/payment-methods.php");
}

export async function createAdminPaymentMethod(data: { name: string; code: string; description?: string; icon?: string; is_active?: number; sort_order?: number }) {
  return apiFetch<{ success: boolean; id: number }>("/admin/payment-methods.php", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export interface PaymentMethodInput {
  id?: number;
  name: string;
  code: string;
  description?: string;
  icon?: string;
  is_active?: number;
  sort_order?: number;
}

export async function updateAdminPaymentMethod(data: PaymentMethodInput & { id: number }) {
  return apiFetch<{ success: boolean }>("/admin/payment-methods.php", {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function deleteAdminPaymentMethod(id: number) {
  return apiFetch<{ success: boolean }>("/admin/payment-methods.php", {
    method: "DELETE",
    body: JSON.stringify({ id }),
  });
}

// ==================== SUBSCRIPTIONS ====================
export async function fetchAdminSubscriptions(status?: string) {
  const query = status ? `?status=${status}` : "";
  return apiFetch<{ subscriptions: AdminSubscription[] }>(`/admin/subscriptions.php${query}`);
}

export async function manageAdminSubscription(data: {
  id: number;
  action: "approve" | "reject" | "expire";
  reason?: string;
}) {
  return apiFetch<{ success: boolean; message: string }>("/admin/subscriptions.php", {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

// ==================== REPORTS ====================
export async function fetchAdminReports() {
  return apiFetch<{
    user_stats: Array<{ role: string; count: number }>;
    total_products: number;
    active_products: number;
    total_orders: number;
    total_revenue: number;
    orders_by_status: Array<{ status: string; count: number }>;
    recent_orders: Array<{ id: number; total_amount: string; status: string; created_at: string; buyer_name: string }>;
    monthly_revenue: Array<{ month: string; revenue: string; orders: number }>;
    top_products: Array<{ name: string; total_sold: string; total_revenue: string }>;
    total_categories: number;
  }>("/admin/reports.php");
}

// ==================== ORDERS ====================
export async function fetchAdminOrders(filters?: { status?: string; search?: string }) {
  const params = new URLSearchParams();
  if (filters?.status && filters.status !== "all") params.set("status", filters.status);
  if (filters?.search && filters.search.trim() !== "") params.set("search", filters.search.trim());
  const qs = params.toString();
  return apiFetch<{ orders: AdminOrder[] }>(`/admin/orders.php${qs ? `?${qs}` : ""}`);
}

export async function fetchAdminOrderDetail(orderId: number) {
  return apiFetch<{ order: AdminOrderDetail }>(`/admin/orders.php?id=${orderId}`);
}

// ==================== SELLERS ====================
export async function fetchAdminSellers(search?: string) {
  const qs = search && search.trim() !== "" ? `?search=${encodeURIComponent(search.trim())}` : "";
  return apiFetch<{ sellers: AdminSeller[] }>(`/admin/sellers.php${qs}`);
}

export async function fetchAdminSellerDetail(sellerId: number) {
  return apiFetch<{ seller: AdminSellerDetail }>(`/admin/sellers.php?id=${sellerId}`);
}

// ==================== PROFILE ====================
// No admin-specific profile endpoint exists: /buyer/profile.php is role-agnostic
// (it only verifies the token) and serves the current user, so the admin reuse
// it for the same read/update/password operations the buyer and seller use.
export interface AdminProfile {
  id: number;
  full_name: string;
  email: string;
  role: string;
  phone: string | null;
  address: string | null;
  avatar_url: string | null;
  created_at: string;
}

export async function fetchAdminProfile() {
  return apiFetch<{ user: AdminProfile }>("/buyer/profile.php");
}

export async function updateAdminProfile(body: {
  full_name: string;
  phone: string;
  address: string;
}) {
  return apiFetch<{ success: boolean; message: string; user: AdminProfile }>("/buyer/profile.php", {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

export async function changeAdminPassword(currentPassword: string, newPassword: string) {
  return apiFetch<{ success: boolean; message: string }>("/buyer/profile.php", {
    method: "PUT",
    body: JSON.stringify({
      action: "change_password",
      current_password: currentPassword,
      new_password: newPassword,
    }),
  });
}
