/**
 * Shapes returned by the PHP API.
 *
 * Important: the backend uses mysqli's default fetch mode, so every column
 * arrives as a JSON string (including ints and decimals) unless it is NULL.
 * Numeric columns are therefore typed as `string` here and must be converted
 * with Number(...) before arithmetic or comparisons.
 *
 * These were derived from the live endpoints, not guessed.
 */

export type ApiId = string;

/** A number computed in PHP and therefore encoded as a real JSON number. */
export type ApiNumber = number;

// ==================== CART ====================

export interface ApiCartItem {
  id: ApiId;
  user_id: ApiId;
  product_id: ApiId;
  quantity: ApiId;
  created_at: string;
  updated_at: string;
  // joined from products
  name: string;
  price: ApiId;
  image_url: string | null;
  stock_quantity: ApiId;
  // joined from users (the artisan)
  artisan_name: string;
  /** price * quantity, computed server-side */
  subtotal: ApiNumber;
}

export interface ApiCartResponse {
  cart: ApiCartItem[];
  total: ApiNumber;
}

// ==================== ORDERS ====================

export type OrderStatus =
  | "pending"
  | "confirmed"
  | "processing"
  | "shipped"
  | "delivered"
  | "cancelled";

export type PaymentStatus = "unpaid" | "paid" | "refunded";

export interface ApiOrderItem {
  id: ApiId;
  order_id: ApiId;
  product_id: ApiId;
  seller_id: ApiId;
  quantity: ApiId;
  unit_price: ApiId;
  subtotal: ApiId;
  created_at: string;
  // joined from products
  name: string;
  image_url: string | null;
}

export interface ApiOrder {
  id: ApiId;
  user_id: ApiId;
  order_number: string;
  total_amount: ApiId;
  shipping_fee: ApiId;
  status: OrderStatus;
  payment_method: string;
  payment_status: PaymentStatus;
  shipping_address: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  /** only present on the list/detail endpoints, not on the create response */
  items?: ApiOrderItem[];
}

export interface ApiOrderDetail extends ApiOrder {
  items: ApiOrderItem[];
  /** present on orders/show.php; null when no payment row exists */
  payment: {
    id: ApiId;
    order_id: ApiId;
    amount: ApiId;
    payment_method: string;
    status: PaymentStatus;
    paid_at: string | null;
  } | null;
}

// ==================== ADMIN ====================

export interface AdminUser {
  id: ApiId;
  full_name: string;
  email: string;
  role: string;
  phone: string | null;
  address: string | null;
  avatar_url: string | null;
  /** "1" | "0" - use Number(x) before comparing */
  is_active: ApiId;
  created_at: string;
}

export interface AdminCategory {
  id: ApiId;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  created_at: string;
  product_count: ApiId;
}

export interface AdminPaymentMethod {
  id: ApiId;
  name: string;
  code: string;
  description: string | null;
  icon: string | null;
  /** "1" | "0" */
  is_active: ApiId;
  sort_order: ApiId;
  created_at: string;
  updated_at: string;
  usage_count: ApiId;
}

export type SubscriptionStatus = "Pending" | "Active" | "Expired" | "Rejected";

export type SubscriptionPaymentStatus =
  | "pending"
  | "awaiting_confirmation"
  | "completed"
  | "rejected";

export interface AdminSubscription {
  id: ApiId;
  seller_id: ApiId;
  start_date: string | null;
  end_date: string | null;
  status: SubscriptionStatus;
  // GCash payment for this subscription (mirrors the buyer checkout flow)
  payment_status: SubscriptionPaymentStatus;
  payment_amount: string;
  transaction_reference: string | null;
  payment_rejection_reason: string | null;
  paid_at: string | null;
  approved_by: ApiId | null;
  approved_at: string | null;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
  // joined from users
  seller_name: string;
  seller_email: string;
  approved_by_name: string | null;
}

export interface AdminOrder {
  id: ApiId;
  order_number: string;
  /** DECIMAL(10,2) columns arrive as strings */
  total_amount: ApiId;
  shipping_fee: ApiId;
  status: OrderStatus;
  payment_method: string;
  /** pending | unpaid | awaiting_confirmation | paid | rejected | refunded */
  payment_status: string;
  created_at: string;
  // joined from users
  buyer_id: ApiId;
  buyer_name: string;
  buyer_email: string;
  /** COUNT(*) subquery -> string; use Number(x) before comparing */
  item_count: ApiId;
}

/** A buyer account with its order stats - the /admin/orders landing list */
export interface AdminOrderBuyer {
  id: ApiId;
  full_name: string;
  email: string;
  avatar_url: string | null;
  /** COUNT(*) via LEFT JOIN -> string; 0 for buyers with no orders */
  order_count: ApiId;
  /** MAX(created_at) -> string | null */
  last_order_at: string | null;
}

export interface AdminOrderPayment {
  id: ApiId;
  order_id: ApiId;
  seller_id: ApiId | null;
  seller_name: string | null;
  amount: ApiId;
  payment_method: string | null;
  transaction_reference: string | null;
  status: string;
  conversation_id: ApiId | null;
  rejection_reason: string | null;
  paid_at: string | null;
  created_at: string;
}

export interface AdminOrderDetail extends AdminOrder {
  user_id: ApiId;
  shipping_address: string | null;
  notes: string | null;
  updated_at: string;
  /** order_item rows joined with product name/image and the seller's name */
  items: Array<ApiOrderItem & { seller_name: string | null }>;
  payments: AdminOrderPayment[];
}

export interface AdminSeller {
  id: ApiId;
  full_name: string;
  email: string;
  phone: string | null;
  shop_name: string | null;
  gcash_number: string | null;
  avatar_url: string | null;
  /** "1" | "0" */
  is_active: ApiId;
  created_at: string;
  /** derived counts/amounts arrive as strings */
  product_count: ApiId;
  sold_items: ApiId;
  total_sales: ApiId;
}

export interface AdminSellerProduct {
  id: ApiId;
  name: string;
  price: ApiId;
  stock_quantity: ApiId;
  image_url: string | null;
  /** "1" | "0" */
  is_active: ApiId;
  created_at: string;
}

export interface AdminSellerSale {
  id: ApiId;
  quantity: ApiId;
  unit_price: ApiId;
  subtotal: ApiId;
  created_at: string;
  order_number: string;
  order_status: string;
  product_name: string;
}

export interface AdminSellerDetail extends AdminSeller {
  address: string | null;
  shop_address: string | null;
  order_count: ApiId;
  products: AdminSellerProduct[];
  sales: AdminSellerSale[];
  /** payment rows joined with the order's number */
  payments: Array<AdminOrderPayment & { order_number: string }>;
}