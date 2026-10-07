// API base resolution.
//
// The PHP API ships inside this project: <project>/php-api
//   (C:\xampp\htdocs\Paynal-main\php-api)
//
// In development the app is served by Vite (port 8080) and every request is
// same-origin: the relative base "/php-api" is proxied by Vite to Apache, so
// there is no CORS preflight and no cross-origin credential handling.
//
// Vite proxy (see vite.config.ts):
//   /php-api -> http://127.0.0.1/<project-folder>/php-api
//            -> C:\xampp\htdocs\Paynal-main\php-api
//
// Note: the Vite `base` ("/Paynal/") only affects static frontend assets
// (JS/CSS/images). It is never used as an API base URL.
const REQUEST_TIMEOUT_MS = 15_000;

// Legacy key: older builds cached an API base here ("/api", absolute URLs).
// It is deleted on load so a stale value from a previous session can never win.
const LEGACY_API_BASE_STORAGE_KEY = "maranao_api_base";

const API_BASE = "/php-api";

function clearLegacyApiBase() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(LEGACY_API_BASE_STORAGE_KEY);
  } catch {
    // Storage can be unavailable (private mode); a stale value is harmless
    // because it is never read.
  }
}

clearLegacyApiBase();

import { getErrorMessage } from "./errors";
import type {
  ApiCartResponse,
  ApiOrder,
  ApiOrderDetail,
} from "@/types/api";

// The app talks to exactly one backend: the main API behind the Vite proxy.
export function getApiBaseCandidates(): string[] {
  return [API_BASE];
}

// Kept for callers that used to record which base worked; there is nothing to
// record anymore, but the legacy key is cleared defensively.
export function rememberWorkingApiBase(_base: string) {
  clearLegacyApiBase();
}

export { API_BASE };

export function getCurrentApiBase(): string {
  return API_BASE;
}

export function resolveApiImageUrl(imageUrl?: string | null): string {
  const raw = (imageUrl || "").trim();
  if (!raw) return "/placeholder.svg";
  if (/^(https?:|data:|blob:)/i.test(raw)) return raw;
  if (raw.startsWith("/")) return raw;
  return `${API_BASE}/${raw.replace(/^\/+/, "")}`;
}

// Helper: get auth token from localStorage
function getToken(): string | null {
  return localStorage.getItem("auth_token");
}

// Helper: make API requests
export async function apiFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const requestUrl = `${API_BASE}${endpoint}`;
  let failure = "";

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(requestUrl, {
      ...options,
      headers,
      signal: options.signal ?? controller.signal,
    });

    const text = await response.text();
    const contentType = response.headers.get("content-type") || "";

    let data: unknown = null;
    let parsed = true;
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      parsed = false;
    }

    if (!parsed || !contentType.includes("json")) {
      failure =
        `${requestUrl} -> HTTP ${response.status}, content-type "${contentType || "none"}"` +
        (parsed ? "" : ", body is not valid JSON");
    } else if (!response.ok) {
      throw new Error(getErrorMessage(data, "Something went wrong"));
    } else {
      return data as T;
    }
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      failure = `${requestUrl} -> timed out after ${REQUEST_TIMEOUT_MS / 1000}s`;
    } else if (error instanceof TypeError) {
      failure = `${requestUrl} -> ${error.message}`;
    } else {
      throw error;
    }
  } finally {
    clearTimeout(timeout);
  }

  throw new Error(
    `Cannot reach the PHP API (${endpoint}).\n\n` +
      `Tried:\n  - ${failure}\n\n` +
      `The dev server proxies /php-api to Apache, so this usually means Apache or ` +
      `MySQL is stopped, or the php-api folder is missing.\n` +
      `Confirm this returns JSON in the browser:\n` +
      `  http://localhost:8080/php-api/products/index.php\n\n` +
      `Backend folder: C:\\xampp\\htdocs\\Paynal-main\\php-api\n\n` +
      `Vite proxy: /php-api -> http://127.0.0.1/Paynal-main/php-api (see vite.config.ts)`
  );
}

// ==================== AUTH ====================

export interface ApiUser {
  id: number;
  full_name: string;
  email: string;
  role: string;
  phone: string | null;
  address: string | null;
  avatar_url: string | null;
}

export async function loginUser(email: string, password: string) {
  const data = await apiFetch<{ success: boolean; token: string; user: ApiUser }>("/auth/login.php", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  localStorage.setItem("auth_token", data.token);
  localStorage.setItem("auth_user", JSON.stringify(data.user));
  return data;
}

export async function registerUser(body: {
  full_name: string;
  email: string;
  password: string;
  role?: string;
  phone?: string;
  address?: string;
  shop_name?: string;
  shop_address?: string;
  gcash_number?: string;
}) {
  const data = await apiFetch<{ success: boolean; token: string; user: ApiUser }>("/auth/register.php", {
    method: "POST",
    body: JSON.stringify(body),
  });
  localStorage.setItem("auth_token", data.token);
  localStorage.setItem("auth_user", JSON.stringify(data.user));
  return data;
}

export async function fetchCurrentUser() {
  return apiFetch<{ user: ApiUser }>("/auth/me.php");
}

export function logoutUser() {
  localStorage.removeItem("auth_token");
  localStorage.removeItem("auth_user");
}

export function getStoredUser(): ApiUser | null {
  const raw = localStorage.getItem("auth_user");
  return raw ? JSON.parse(raw) : null;
}

export function isLoggedIn(): boolean {
  return !!getToken();
}

// ==================== PRODUCTS ====================

export interface ApiProduct {
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
  artisan_name: string;
}

export async function fetchProducts(params?: { category?: string; search?: string }) {
  const searchParams = new URLSearchParams();
  if (params?.category) searchParams.set("category", params.category);
  if (params?.search) searchParams.set("search", params.search);

  const query = searchParams.toString();
  const url = `/products/index.php${query ? `?${query}` : ""}`;

  return apiFetch<{ products: ApiProduct[] }>(url);
}

export async function fetchProduct(id: string | number) {
  return apiFetch<{ product: ApiProduct }>(`/products/show.php?id=${id}`);
}

export async function fetchCategories() {
  return apiFetch<{ categories: Array<{ id: number; name: string; slug: string; description: string }> }>(
    "/products/categories.php"
  );
}

// ==================== ARTISANS ====================

export async function fetchArtisans() {
  return apiFetch<{ artisans: Array<{ id: number; full_name: string; specialty: string; bio: string; location: string; avatar_url: string | null }> }>(
    "/artisans/index.php"
  );
}

// ==================== CART ====================

export async function fetchCart() {
  return apiFetch<ApiCartResponse>("/cart/index.php");
}

export async function addToCartApi(productId: number, quantity: number = 1) {
  return apiFetch("/cart/index.php", {
    method: "POST",
    body: JSON.stringify({ product_id: productId, quantity }),
  });
}

export async function updateCartItem(productId: number, quantity: number) {
  return apiFetch("/cart/index.php", {
    method: "PUT",
    body: JSON.stringify({ product_id: productId, quantity }),
  });
}

export async function removeCartItem(productId: number) {
  return apiFetch("/cart/index.php", {
    method: "DELETE",
    body: JSON.stringify({ product_id: productId }),
  });
}

// ==================== ORDERS ====================

export async function createOrder(body: {
  shipping_address: string;
  shipping_city: string;
  shipping_phone: string;
  payment_method: string;
}) {
  return apiFetch<{ success: boolean; order_id: number }>("/orders/index.php", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function fetchOrders() {
  return apiFetch<{ orders: ApiOrder[] }>("/orders/index.php");
}

export async function fetchOrder(id: number) {
  return apiFetch<{ order: ApiOrderDetail }>(`/orders/show.php?id=${id}`);
}

// ==================== HELPERS ====================

// Convert API product to the frontend Product format
export function apiProductToProduct(p: ApiProduct) {
  return {
    id: String(p.id),
    name: p.name,
    description: p.description,
    price: parseFloat(p.price),
    image: resolveApiImageUrl(p.image_url),
    category: p.category_slug,
    artisan: p.artisan_name,
    culturalBackground: p.cultural_background,
    rating: parseFloat(p.rating),
    reviews: p.total_reviews,
    inStock: p.stock_quantity > 0,
    sellerId: p.seller_id,
  };
}
