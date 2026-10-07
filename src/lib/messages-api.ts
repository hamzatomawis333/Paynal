import { apiFetch, getApiBaseCandidates, rememberWorkingApiBase } from "./api";

export interface Conversation {
  id: number;
  buyer_id: number;
  seller_id: number;
  product_id: number | null;
  type?: string;
  last_message_at: string;
  created_at: string;
  buyer_name: string;
  buyer_avatar: string | null;
  seller_name: string;
  seller_avatar: string | null;
  product_name: string | null;
  product_image: string | null;
  last_message: string | null;
  unread_count: number;
}

export interface Message {
  id: number;
  conversation_id: number;
  sender_id: number;
  body: string;
  image_url: string | null;
  is_read: number;
  created_at: string;
  sender_name: string;
  sender_avatar: string | null;
}

export async function fetchConversations(type?: string) {
  const query = type ? `?type=${type}` : "";
  return apiFetch<{ conversations: Conversation[] }>(
    `/messages/conversations.php${query}`
  );
}

export async function startConversation(sellerId: number, productId?: number | null) {
  return apiFetch<{ conversation_id: number; existing: boolean }>(
    "/messages/conversations.php",
    {
      method: "POST",
      body: JSON.stringify({ seller_id: sellerId, product_id: productId ?? null }),
    }
  );
}

export async function startAdminConversation() {
  return apiFetch<{ conversation_id: number; existing: boolean }>(
    "/messages/conversations.php",
    {
      method: "POST",
      body: JSON.stringify({ type: "seller_admin" }),
    }
  );
}

export async function fetchMessages(conversationId: number) {
  return apiFetch<{ messages: Message[] }>(
    `/messages/index.php?conversation_id=${conversationId}`
  );
}

export async function sendMessage(conversationId: number, body: string, imageUrl?: string) {
  return apiFetch<{ success: boolean; message_id: number }>("/messages/index.php", {
    method: "POST",
    body: JSON.stringify({ conversation_id: conversationId, body, image_url: imageUrl || null }),
  });
}

export async function deleteConversation(conversationId: number) {
  return apiFetch<{ success: boolean }>("/messages/conversations.php", {
    method: "DELETE",
    body: JSON.stringify({ id: conversationId }),
  });
}

export async function uploadMessageImage(file: File): Promise<{ success: boolean; image_url: string }> {
  const token = localStorage.getItem("auth_token");
  const formData = new FormData();
  formData.append("image", file);

  let lastNetworkError = false;
  let lastRetryableError = "";

  for (const base of getApiBaseCandidates()) {
    const requestUrl = `${base}/messages/upload.php`;

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

      if (!data.image_url) throw new Error("Upload failed. No image URL returned.");
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
    throw new Error("Cannot connect to API. Please try again.");
  }

  if (lastRetryableError) {
    throw new Error(`Upload endpoint is not reachable (${lastRetryableError}).`);
  }

  throw new Error("Upload failed");
}
