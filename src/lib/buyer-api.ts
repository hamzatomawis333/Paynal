import { apiFetch } from "./api";

// ==================== BUYER ORDERS ====================

export interface BuyerOrder {
  id: number;
  order_number: string;
  user_id: number;
  total_amount: string;
  shipping_fee: string;
  status: string;
  /**
   * Aggregate payment state across every seller on the order. Surfaced by the
   * orders query and used for display copy.
   */
  payment_status: string;
  /**
   * Server-computed: at least one payment group on this order is still
   * `pending`, i.e. the buyer has not claimed to have paid that seller.
   *
   * Preferred over `payment_status` for deciding whether the order still needs
   * the buyer's attention. The aggregate turns to 'awaiting_confirmation' after
   * the first seller is marked sent, which for a multi-seller order would hide
   * the order while other sellers are still unpaid.
   */
  needs_payment: number | boolean;
  payment_method: string;
  shipping_address: string;
  notes: string;
  created_at: string;
  updated_at: string;
  items: BuyerOrderItem[];
}

/**
 * True while any seller on the order is still waiting for the buyer to send
 * their part.
 *
 * A checkout writes the order row immediately (it has to, so stock can be
 * reserved and the payment groups can exist), which means an order can sit here
 * with nobody ever paying. Those are deliberately kept out of the order list and
 * out of the dashboard totals so they can't look like real purchases.
 *
 * `needs_payment` is authoritative. The `payment_status` fallback only matters
 * for orders created before the flag existed, and for a brand-new order whose
 * payment rows have not been observed yet.
 */
export function isOrderAwaitingPayment(order: BuyerOrder) {
  if (order.needs_payment === true || order.needs_payment === 1) return true;
  if (order.needs_payment === false || order.needs_payment === 0) return false;
  return order.payment_status === "pending" || order.payment_status === "unpaid";
}

/**
 * Orders that reflect a real purchase attempt. `awaiting_confirmation` counts:
 * the buyer submitted a GCash reference and the seller is verifying it.
 */
export function isRealOrder(order: BuyerOrder) {
  return !isOrderAwaitingPayment(order);
}

export interface BuyerOrderItem {
  id: number;
  product_id: number;
  quantity: number;
  unit_price: string;
  subtotal: string;
  name: string;
  image_url: string;
}

export async function fetchBuyerOrders() {
  return apiFetch<{ orders: BuyerOrder[] }>("/orders/index.php");
}

export async function fetchBuyerOrder(id: number) {
  return apiFetch<{ order: BuyerOrder }>(`/orders/show.php?id=${id}`);
}

// ==================== WISHLIST ====================

export interface WishlistItem {
  id: number;
  product_id: number;
  created_at: string;
  name: string;
  price: string;
  image_url: string;
  stock_quantity: number;
  category_name: string;
  category_slug: string;
}

export async function fetchWishlist() {
  return apiFetch<{ wishlist: WishlistItem[] }>("/buyer/wishlist.php");
}

export async function addToWishlist(productId: number) {
  return apiFetch<{ success: boolean }>("/buyer/wishlist.php", {
    method: "POST",
    body: JSON.stringify({ product_id: productId }),
  });
}

export async function removeFromWishlist(productId: number) {
  return apiFetch<{ success: boolean }>("/buyer/wishlist.php", {
    method: "DELETE",
    body: JSON.stringify({ product_id: productId }),
  });
}

// ==================== PROFILE ====================

export interface BuyerProfile {
  id: number;
  full_name: string;
  email: string;
  role: string;
  phone: string | null;
  address: string | null;
  avatar_url: string | null;
  created_at: string;
}

export async function fetchBuyerProfile() {
  return apiFetch<{ user: BuyerProfile }>("/buyer/profile.php");
}

export async function updateBuyerProfile(body: {
  full_name: string;
  phone: string;
  address: string;
}) {
  return apiFetch<{ success: boolean; message: string; user: BuyerProfile }>("/buyer/profile.php", {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

export async function changeBuyerPassword(currentPassword: string, newPassword: string) {
  return apiFetch<{ success: boolean; message: string }>("/buyer/profile.php", {
    method: "PUT",
    body: JSON.stringify({
      action: "change_password",
      current_password: currentPassword,
      new_password: newPassword,
    }),
  });
}

// ==================== PAYMENTS ====================

export interface BuyerPayment {
  id: number;
  order_id: number;
  order_number: string;
  order_status: string;
  /** Per-seller payment row status (payments.status). */
  status: string;
  amount: string;
  total_amount: string;
  shipping_fee: string;
  payment_method: string;
  created_at: string;
}

export async function fetchBuyerPayments() {
  return apiFetch<{ payments: BuyerPayment[] }>("/buyer/payments.php");
}
