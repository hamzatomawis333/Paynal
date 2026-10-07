// API base resolution.
//
// In development the app is served by Vite (port 8080) and every request is
// same-origin: a relative base such as "/api" is proxied by Vite to Apache, so
// there is no CORS preflight and no cross-origin credential handling.
//
// Vite proxies (see vite.config.ts):
//   /api     -> http://127.0.0.1/api                  (C:\xampp\htdocs\api)
//   /php-api -> http://127.0.0.1/Paynal-main/php-api  (php-api\ in this repo)
//
// Override with VITE_API_BASE in a .env file if an absolute URL is required.
const REQUEST_TIMEOUT_MS = 15_000;
const API_BASE_STORAGE_KEY = "maranao_api_base";
const DEFAULT_API_BASES = ["/api", "/php-api"];

import { getErrorMessage } from "./errors";
import type {
  ApiCartResponse,
  ApiOrder,
  ApiOrderDetail,
} from "@/types/api";

function normalizeApiBase(base: string): string {
  return base.trim().replace(/\/+$/, "");
}

function isLocalDevelopmentHost(hostname: string): boolean {
  return (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "0.0.0.0" ||
    /^10\.\d+\.\d+\.\d+$/.test(hostname) ||
    /^192\.168\.\d+\.\d+$/.test(hostname) ||
    /^172\.(1[6-9]|2\d|3[01])\.\d+\.\d+$/.test(hostname)
  );
}

// A cached base is only trusted when it still points at this dev server
// (relative path), at localhost, or at this exact origin. Anything else is a
// stale value left over from an earlier session: it used to be tried *before*
// the defaults, so a single bad value could shadow the working base forever.
function getSafeStoredBase(stored: string | null | undefined): string | null {
  if (!stored) return null;
  const normalized = normalizeApiBase(String(stored));
  if (!normalized) return null;
  if (normalized.startsWith("/")) return normalized;

  try {
    const url = new URL(normalized);
    const pointsAtThisDevServer =
      typeof window !== "undefined" && url.origin === window.location.origin;
    return isLocalDevelopmentHost(url.hostname) || pointsAtThisDevServer ? normalized : null;
  } catch {
    return null;
  }
}

export function getApiBaseCandidates(): string[] {
  const bases: string[] = [];
  const add = (base: string | null | undefined) => {
    const normalized = base ? normalizeApiBase(String(base)) : "";
    if (normalized && !bases.includes(normalized)) bases.push(normalized);
  };

  add(import.meta.env?.VITE_API_BASE);

  if (typeof window !== "undefined") {
    add(getSafeStoredBase(localStorage.getItem(API_BASE_STORAGE_KEY)));
  }

  for (const base of DEFAULT_API_BASES) add(base);

  return bases.length ? bases : [...DEFAULT_API_BASES];
}

export function rememberWorkingApiBase(base: string) {
  if (typeof window === "undefined") return;
  const safeBase = getSafeStoredBase(base);
  if (safeBase) {
    localStorage.setItem(API_BASE_STORAGE_KEY, safeBase);
  } else {
    localStorage.removeItem(API_BASE_STORAGE_KEY);
  }
}

export const API_BASE = getApiBaseCandidates()[0];

export function getCurrentApiBase(): string {
  return getApiBaseCandidates()[0] ?? DEFAULT_API_BASES[0];
}

export function resolveApiImageUrl(imageUrl?: string | null): string {
  const raw = (imageUrl || "").trim();
  if (!raw) return "/placeholder.svg";
  if (/^(https?:|data:|blob:)/i.test(raw)) return raw;
  if (raw.startsWith("/")) return raw;
  const cleanPath = raw.replace(/^\/+/, "");
  if (cleanPath.startsWith("api/") || cleanPath.startsWith("php-api/")) {
    return `/${cleanPath}`;
  }
  return `${getCurrentApiBase()}/${cleanPath}`;
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

  const failures: string[] = [];

  for (const base of getApiBaseCandidates()) {
    const requestUrl = `${base}${endpoint}`;

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
        failures.push(
          `${requestUrl} -> HTTP ${response.status}, content-type "${contentType || "none"}"` +
            (parsed ? "" : ", body is not valid JSON")
        );
        continue;
      }

      rememberWorkingApiBase(base);

      if (!response.ok) {
        throw new Error(getErrorMessage(data, "Something went wrong"));
      }

      return data as T;
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        failures.push(`${requestUrl} -> timed out after ${REQUEST_TIMEOUT_MS / 1000}s`);
        continue;
      }
      if (error instanceof TypeError) {
        failures.push(`${requestUrl} -> ${error.message}`);
        continue;
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }

  throw new Error(
    `Cannot reach the PHP API (${endpoint}).\n\n` +
      `Tried:\n${failures.map((line) => `  - ${line}`).join("\n")}\n\n` +
      `The dev server proxies to Apache, so this usually means Apache or MySQL is ` +
      `stopped, or the backend folder is missing.\n` +
      `Confirm one of these returns JSON in the browser:\n` +
      `  http://localhost:8080/api/products/index.php\n` +
      `  http://localhost:8080/php-api/products/index.php\n\n` +
      `Backend folder (one of these must exist):\n` +
      `  C:\\xampp\\htdocs\\api\n` +
      `  C:\\xampp\\htdocs\\Paynal-main\\php-api\n\n` +
      `If the base URL was cached from an earlier session, clear it in the browser ` +
      `console and reload:\n  localStorage.removeItem("maranao_api_base"); location.reload();`
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
