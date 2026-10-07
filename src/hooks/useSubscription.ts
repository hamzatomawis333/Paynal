import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchSellerSubscription,
  requestSubscription,
  startAdminConversation,
  fetchAdminSubscriptions,
  manageSubscription,
} from "@/lib/subscription-api";

// Seller hooks
export function useSellerSubscription() {
  return useQuery({
    queryKey: ["seller-subscription"],
    queryFn: fetchSellerSubscription,
  });
}

export function useRequestSubscription() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: requestSubscription,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["seller-subscription"] });
    },
  });
}

export function useStartAdminConversation() {
  return useMutation({
    mutationFn: startAdminConversation,
  });
}

// Admin hooks
export function useAdminSubscriptions(status?: string) {
  return useQuery({
    queryKey: ["admin-subscriptions", status],
    queryFn: async () => (await fetchAdminSubscriptions(status)).subscriptions,
  });
}

export function useManageSubscription() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: manageSubscription,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-subscriptions"] });
      qc.invalidateQueries({ queryKey: ["seller-subscription"] });
    },
  });
}
