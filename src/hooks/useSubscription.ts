import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchSellerSubscription,
  requestSubscription,
  markSubscriptionPaymentSent,
  startAdminConversation,
} from "@/lib/subscription-api";

// Seller hooks
export function useSellerSubscription() {
  return useQuery({
    queryKey: ["seller-subscription"],
    queryFn: fetchSellerSubscription,
    // Poll like the buyer payment page while the admin could still act on the
    // payment (or the seller is waiting to fix a rejection). Stops as soon as
    // the subscription settles (Active / Expired / Rejected) so an idle page
    // costs nothing.
    refetchInterval: (query) => {
      const sub = query.state.data?.subscription;
      if (!sub || sub.status !== "Pending") return false;
      return ["pending", "awaiting_confirmation", "rejected"].includes(sub.payment_status)
        ? 5000
        : false;
    },
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

export function useMarkSubscriptionPaymentSent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ subscriptionId, reference }: { subscriptionId: number; reference: string }) =>
      markSubscriptionPaymentSent(subscriptionId, reference),
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
