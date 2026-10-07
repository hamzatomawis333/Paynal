import { apiFetch } from "@/lib/api";

export type NotificationType = "message" | "order" | "payment" | "subscription";

export interface AppNotification {
  id: number;
  user_id: number;
  type: NotificationType;
  title: string;
  body: string | null;
  link: string | null;
  related_id: number | null;
  is_read: 0 | 1;
  created_at: string;
}

export async function fetchNotifications(limit = 20) {
  return apiFetch<{ notifications: AppNotification[]; unread_count: number }>(
    `/notifications?limit=${limit}`
  );
}

export async function markNotificationRead(id: number) {
  return apiFetch<{ success: boolean }>("/notifications", {
    method: "POST",
    body: JSON.stringify({ action: "mark_read", id }),
  });
}

export async function markAllNotificationsRead() {
  return apiFetch<{ success: boolean }>("/notifications", {
    method: "POST",
    body: JSON.stringify({ action: "mark_all" }),
  });
}
