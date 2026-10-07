import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchSellerDashboard,
  fetchSellerProducts,
  createSellerProduct,
  updateSellerProduct,
  deleteSellerProduct,
  fetchSellerOrders,
  updateSellerOrderStatus,
  fetchSellerProfile,
  updateSellerProfile,
  changeSellerPassword,
} from "@/lib/seller-api";

export function useSellerDashboard() {
  return useQuery({
    queryKey: ["seller-dashboard"],
    queryFn: fetchSellerDashboard,
  });
}

export function useSellerProducts() {
  return useQuery({
    queryKey: ["seller-products"],
    queryFn: async () => {
      const data = await fetchSellerProducts();
      return data.products;
    },
  });
}

export function useCreateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createSellerProduct,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["seller-products"] });
      qc.invalidateQueries({ queryKey: ["seller-dashboard"] });
    },
  });
}

export function useUpdateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: updateSellerProduct,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["seller-products"] });
    },
  });
}

export function useDeleteProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteSellerProduct,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["seller-products"] });
      qc.invalidateQueries({ queryKey: ["seller-dashboard"] });
    },
  });
}

export function useSellerOrders() {
  return useQuery({
    queryKey: ["seller-orders"],
    queryFn: async () => {
      const data = await fetchSellerOrders();
      return data.orders;
    },
    // Payment status changes server-side (buyer marks sent, seller confirms),
    // so poll to keep the verification card current without a manual reload.
    refetchInterval: 30_000,
  });
}

export function useUpdateOrderStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ orderId, status }: { orderId: number; status: string }) =>
      updateSellerOrderStatus(orderId, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["seller-orders"] });
      qc.invalidateQueries({ queryKey: ["seller-dashboard"] });
    },
  });
}

export function useSellerProfile() {
  return useQuery({
    queryKey: ["seller-profile"],
    queryFn: async () => {
      const data = await fetchSellerProfile();
      return data.user;
    },
  });
}

export function useUpdateProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: updateSellerProfile,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["seller-profile"] });
    },
  });
}

export function useChangePassword() {
  return useMutation({
    mutationFn: ({ currentPassword, newPassword }: { currentPassword: string; newPassword: string }) =>
      changeSellerPassword(currentPassword, newPassword),
  });
}
