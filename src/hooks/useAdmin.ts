import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchAdminUsers, updateAdminUser, deleteAdminUser,
  fetchAdminCategories, createAdminCategory, updateAdminCategory, deleteAdminCategory,
  fetchAdminPaymentMethods, createAdminPaymentMethod, updateAdminPaymentMethod, deleteAdminPaymentMethod,
  fetchAdminSubscriptions, manageAdminSubscription,
  fetchAdminReports,
  fetchAdminOrders, fetchAdminOrderDetail,
  fetchAdminSellers, fetchAdminSellerDetail,
  fetchAdminProfile, updateAdminProfile, changeAdminPassword,
} from "@/lib/admin-api";

export function useAdminUsers() {
  const qc = useQueryClient();
  const query = useQuery({ queryKey: ["admin-users"], queryFn: async () => (await fetchAdminUsers()).users });

  const updateMutation = useMutation({
    mutationFn: ({ userId, data }: { userId: number; data: { role?: string; is_active?: number } }) => updateAdminUser(userId, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-users"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (userId: number) => deleteAdminUser(userId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-users"] }),
  });

  return { ...query, updateUser: updateMutation, deleteUser: deleteMutation };
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

export function useAdminOrders(filters?: { status?: string; search?: string }) {
  return useQuery({
    queryKey: ["admin-orders", filters?.status ?? "all", filters?.search ?? ""],
    queryFn: async () => (await fetchAdminOrders(filters)).orders,
  });
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
  const query = useQuery({
    queryKey: ["admin-subscriptions", status],
    queryFn: async () => (await fetchAdminSubscriptions(status)).subscriptions,
  });

  const manageMutation = useMutation({
    mutationFn: manageAdminSubscription,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-subscriptions"] });
    },
  });

  return { ...query, manageSubscription: manageMutation };
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
