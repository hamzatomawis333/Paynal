import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchAdminUsers, updateAdminUser, deleteAdminUser,
  fetchAdminCategories, createAdminCategory, updateAdminCategory, deleteAdminCategory,
  fetchAdminPaymentMethods, createAdminPaymentMethod, updateAdminPaymentMethod, deleteAdminPaymentMethod,
  fetchAdminSubscriptions, manageAdminSubscription, deleteAdminSubscription,
  confirmAdminSubscriptionPayment, rejectAdminSubscriptionPayment,
  fetchPlatformSettings, updatePlatformSettings,
  fetchAdminReports,
  fetchAdminOrders, fetchAdminOrderDetail,
  fetchAdminSellers, fetchAdminSellerDetail,
  fetchAdminProfile, updateAdminProfile, changeAdminPassword,
  fetchAdminAuditLog,
} from "@/lib/admin-api";

export function useAdminAuditLog(limit = 100, action?: string) {
  return useQuery({
    queryKey: ["admin-audit", limit, action ?? "all"],
    queryFn: async () => (await fetchAdminAuditLog(limit, action ?? undefined)).entries,
  });
}

// Rows fetched per round on the admin list pages; "Load more" grows the
// window (the endpoints default to unlimited when no limit is passed, so
// every other caller is unaffected).
const ADMIN_PAGE_SIZE = 25;

export function useAdminUsers() {
  const qc = useQueryClient();
  const [limit, setLimit] = useState(ADMIN_PAGE_SIZE);
  const query = useQuery({
    queryKey: ["admin-users", limit],
    queryFn: async () => (await fetchAdminUsers(limit)),
  });

  const users = query.data?.users;
  const total = query.data?.total ?? users?.length ?? 0;

  const updateMutation = useMutation({
    mutationFn: ({ userId, data }: { userId: number; data: { role?: string; is_active?: number } }) => updateAdminUser(userId, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-users"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (userId: number) => deleteAdminUser(userId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-users"] }),
  });

  return {
    ...query,
    data: users,
    total,
    hasMore: (users?.length ?? 0) < total,
    loadMore: () => setLimit((l) => l + ADMIN_PAGE_SIZE),
    updateUser: updateMutation,
    deleteUser: deleteMutation,
  };
}

export function useAdminCategories() {
  const qc = useQueryClient();
  const query = useQuery({ queryKey: ["admin-categories"], queryFn: async () => (await fetchAdminCategories()).categories });

  const createMutation = useMutation({
    mutationFn: createAdminCategory,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-categories"] }),
  });

  const updateMutation = useMutation({
    mutationFn: updateAdminCategory,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-categories"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteAdminCategory(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-categories"] }),
  });

  return { ...query, createCategory: createMutation, updateCategory: updateMutation, deleteCategory: deleteMutation };
}

export function useAdminPaymentMethods() {
  const qc = useQueryClient();
  const query = useQuery({ queryKey: ["admin-payment-methods"], queryFn: async () => (await fetchAdminPaymentMethods()).payment_methods });

  const createMutation = useMutation({
    mutationFn: createAdminPaymentMethod,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-payment-methods"] }),
  });

  const updateMutation = useMutation({
    mutationFn: updateAdminPaymentMethod,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-payment-methods"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteAdminPaymentMethod(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-payment-methods"] }),
  });

  return { ...query, createMethod: createMutation, updateMethod: updateMutation, deleteMethod: deleteMutation };
}

export function useAdminReports() {
  return useQuery({ queryKey: ["admin-reports"], queryFn: fetchAdminReports });
}

export function useAdminOrders(filters?: { status?: string; search?: string; buyerId?: string }, paginated = false) {
  const [limit, setLimit] = useState(ADMIN_PAGE_SIZE);
  const query = useQuery({
    queryKey: [
      "admin-orders",
      filters?.status ?? "all",
      filters?.search ?? "",
      filters?.buyerId ?? "all",
      paginated ? limit : "all",
    ],
    queryFn: async () => await fetchAdminOrders(filters, paginated ? limit : undefined),
  });

  const data = query.data;
  const buyersTotal = data?.buyers_total ?? data?.buyers?.length ?? 0;
  const ordersTotal = data?.orders_total ?? data?.orders?.length ?? 0;
  const shownTotal = filters?.buyerId && filters.buyerId !== "all" ? ordersTotal : buyersTotal;
  const shownCount =
    filters?.buyerId && filters.buyerId !== "all"
      ? (data?.orders?.length ?? 0)
      : (data?.buyers?.length ?? 0);

  return {
    ...query,
    total: shownTotal,
    hasMore: shownCount < shownTotal,
    loadMore: () => setLimit((l) => l + ADMIN_PAGE_SIZE),
  };
}

export function useAdminOrderDetail(orderId: number | null) {
  return useQuery({
    queryKey: ["admin-order", orderId],
    queryFn: () => fetchAdminOrderDetail(orderId as number).then((r) => r.order),
    enabled: orderId !== null,
  });
}

export function useAdminSellers(search?: string) {
  return useQuery({
    queryKey: ["admin-sellers", search ?? ""],
    queryFn: async () => (await fetchAdminSellers(search)).sellers,
  });
}

export function useAdminSellerDetail(sellerId: number | null) {
  return useQuery({
    queryKey: ["admin-seller", sellerId],
    queryFn: () => fetchAdminSellerDetail(sellerId as number).then((r) => r.seller),
    enabled: sellerId !== null,
  });
}

export function useAdminSubscriptions(status?: string) {
  const qc = useQueryClient();
  const [limit, setLimit] = useState(ADMIN_PAGE_SIZE);
  const query = useQuery({
    queryKey: ["admin-subscriptions", status ?? "all", limit],
    queryFn: async () => (await fetchAdminSubscriptions(status, limit)),
  });

  const subscriptions = query.data?.subscriptions;
  const total = query.data?.total ?? subscriptions?.length ?? 0;

  const refresh = () => qc.invalidateQueries({ queryKey: ["admin-subscriptions"] });

  const manageMutation = useMutation({
    mutationFn: manageAdminSubscription,
    onSuccess: refresh,
  });

  const deleteMutation = useMutation({
    mutationFn: deleteAdminSubscription,
    onSuccess: refresh,
  });

  // Confirming the GCash payment also activates the subscription, so both
  // mutations refresh the same list.
  const confirmPaymentMutation = useMutation({
    mutationFn: confirmAdminSubscriptionPayment,
    onSuccess: refresh,
  });

  const rejectPaymentMutation = useMutation({
    mutationFn: rejectAdminSubscriptionPayment,
    onSuccess: refresh,
  });

  return {
    ...query,
    data: subscriptions,
    total,
    hasMore: (subscriptions?.length ?? 0) < total,
    loadMore: () => setLimit((l) => l + ADMIN_PAGE_SIZE),
    manageSubscription: manageMutation,
    deleteSubscription: deleteMutation,
    confirmPayment: confirmPaymentMutation,
    rejectPayment: rejectPaymentMutation,
  };
}

export function usePlatformSettings() {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: ["platform-settings"],
    queryFn: async () => (await fetchPlatformSettings()).settings,
  });

  const updateMutation = useMutation({
    mutationFn: updatePlatformSettings,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["platform-settings"] }),
  });

  return { ...query, updateSettings: updateMutation };
}

export function useAdminProfile() {
  return useQuery({
    queryKey: ["admin-profile"],
    queryFn: async () => (await fetchAdminProfile()).user,
  });
}

export function useUpdateAdminProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: updateAdminProfile,
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["admin-profile"] });
      if (data.user) {
        localStorage.setItem("auth_user", JSON.stringify(data.user));
      }
    },
  });
}

export function useChangeAdminPassword() {
  return useMutation({
    mutationFn: ({ currentPassword, newPassword }: { currentPassword: string; newPassword: string }) =>
      changeAdminPassword(currentPassword, newPassword),
  });
}
