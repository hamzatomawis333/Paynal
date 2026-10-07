import { apiFetch, getApiBaseCandidates, rememberWorkingApiBase } from "./api";

// ==================== SELLER DASHBOARD ====================

export interface SellerDashboardStats {
  total_products: number;
  total_orders: number;
  total_sales: number;
  recent_orders: SellerOrder[];
}

export interface SellerProduct {
  id: number;
  seller_id: number;
  category_id: number;
  name: string;
  description: string;
  cultural_background: string;
  price: string;
  stock_quantity: number;
  image_url: string;
  is_active: number;
  rating: string;
  total_reviews: number;
  created_at: string;
  updated_at: string;
  category_name: string;
  category_slug: string;
}

export interface SellerOrder {
  id: number;
  user_id: number;
  order_number: string;
  total_amount: string;
  shipping_fee: string;
  status: string;
  payment_status: string;
  shipping_address: string;
  shipping_city: string;
  shipping_phone: string;
  payment_method: string;
  created_at: string;
  updated_at: string;
  customer_name: string;
  customer_email?: string;
  items?: SellerOrderItem[];
  /** This seller's slice of the order, summed from order_items. */
  seller_subtotal: number;
  /** Only this seller's payment row; null for non-GCash orders. */
  payment: SellerOrderPayment | null;
}

export interface SellerOrderPayment {
  id: number;
  amount: number;
  status: string;
  payment_method: string;
  transaction_reference: string | null;
  conversation_id: number | null;
  rejection_reason: string | null;
  paid_at: string | null;
  created_at: string;
}

export interface SellerOrderItem {
  id: number;
  product_id: number;
  quantity: number;
  price: string;
  name: string;
  image_url: string;
}

export interface SellerProfile {
  id: number;
  full_name: string;
  email: string;
  role: string;
  phone: string | null;
  address: string | null;
  shop_name: string | null;
  shop_address: string | null;
  gcash_number: string | null;
  avatar_url: string | null;
  artisan_profile: {
    specialty: string;
    story: string;
    location: string;
  } | null;
}

// Dashboard stats
export async function fetchSellerDashboard() {
  return apiFetch<SellerDashboardStats>("/seller/dashboard.php");
}

// Products
export async function fetchSellerProducts() {
  return apiFetch<{ products: SellerProduct[] }>("/seller/products.php");
}

export async function createSellerProduct(body: {
  name: string;
  description: string;
  cultural_background: string;
  price: number;
  stock_quantity: number;
  category_id: number;
  image_url: string;
}) {
  return apiFetch<{ success: boolean; product_id: number }>("/seller/products.php", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function updateSellerProduct(body: {
  id: number;
  name: string;
  description: string;
  cultural_background: string;
  price: number;
  stock_quantity: number;
  category_id: number;
  image_url: string;
  is_active: number;
}) {
  return apiFetch<{ success: boolean }>("/seller/products.php", {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

export async function deleteSellerProduct(id: number) {
  return apiFetch<{ success: boolean }>("/seller/products.php", {
    method: "DELETE",
    body: JSON.stringify({ id }),
  });
}

// Orders
export async function fetchSellerOrders() {
  return apiFetch<{ orders: SellerOrder[] }>("/seller/orders.php");
}

export async function updateSellerOrderStatus(orderId: number, status: string) {
  return apiFetch<{ success: boolean }>("/seller/orders.php", {
    method: "PUT",
    body: JSON.stringify({ order_id: orderId, status }),
  });
}

// Profile
export async function fetchSellerProfile() {
  return apiFetch<{ user: SellerProfile }>("/seller/profile.php");
}

export async function updateSellerProfile(body: {
  full_name: string;
  phone: string;
  address: string;
  shop_name?: string;
  shop_address?: string;
  gcash_number?: string;
  specialty?: string;
  story?: string;
  location?: string;
}) {
  return apiFetch<{ success: boolean; message: string }>("/seller/profile.php", {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

export async function changeSellerPassword(currentPassword: string, newPassword: string) {
  return apiFetch<{ success: boolean; message: string }>("/seller/profile.php", {
    method: "PUT",
    body: JSON.stringify({
      action: "change_password",
      current_password: currentPassword,
      new_password: newPassword,
    }),
  });
}

// Image upload
export async function uploadProductImage(file: File): Promise<{ success: boolean; image_url: string }> {
  const token = localStorage.getItem("auth_token");
  const formData = new FormData();
  formData.append("image", file);

  let lastNetworkError = false;
  let lastRetryableError = "";

  for (const base of getApiBaseCandidates()) {
    const requestUrl = `${base}/seller/upload.php`;

    try {
      const response = await fetch(requestUrl, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
        signal: AbortSignal.timeout(30_000),
      });

      const text = await response.text();
      const contentType = response.headers.get("content-type") || "";
      const looksLikeJson = contentType.includes("application/json") || /^\s*[{[]/.test(text);

      if (!looksLikeJson) {
        lastRetryableError = `${requestUrl} returned a non-JSON response (status ${response.status}).`;
        continue;
      }

      let data: { success?: boolean; image_url?: string; error?: string } = {};
      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        lastRetryableError = `${base} returned invalid JSON.`;
        continue;
      }
      rememberWorkingApiBase(base);

      if (!response.ok) {
        if ([404, 500, 502, 503, 504].includes(response.status)) {
          lastRetryableError = `${requestUrl}: ${data.error || response.statusText}`;
          continue;
        }
        throw new Error(data.error || "Upload failed");
      }

      if (!data.image_url) throw new Error("Upload failed. XAMPP did not return an image URL.");
      return data as { success: boolean; image_url: string };
    } catch (error) {
      if (error instanceof TypeError) {
        lastNetworkError = true;
        continue;
      }
      throw error;
    }
  }

  if (lastNetworkError) {
    throw new Error(
      "Cannot connect to the API. Start Apache/MySQL, restart npm run dev, then check http://localhost:8080/php-api/auth/login.php"
    );
  }

  if (lastRetryableError) {
    throw new Error(
      `API upload endpoint is not reachable (${lastRetryableError}). The backend must be at C:\\xampp\\htdocs\\Paynal-main\\php-api, then restart npm run dev.`
    );
  }

  throw new Error("Upload failed");
}
