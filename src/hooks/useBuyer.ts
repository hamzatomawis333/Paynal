import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchBuyerOrders,
  fetchWishlist,
  addToWishlist,
  removeFromWishlist,
  fetchBuyerProfile,
  updateBuyerProfile,
  changeBuyerPassword,
  fetchBuyerPayments,
} from "@/lib/buyer-api";

/**
 * Every order the buyer placed, newest first.
 *
 * Deliberately unfiltered: the same list backs both the real-order list and the
 * "finish your payment" reminder, so filtering here would hide the very orders
 * the buyer still has to pay for. Use `isRealOrder` / `isOrderAwaitingPayment`
 * from buyer-api to split at the call site.
 */
export function useBuyerOrders() {
  return useQuery({
    queryKey: ["buyer-orders"],
    queryFn: async () => {
      const data = await fetchBuyerOrders();
      return data.orders;
    },
    // Payments are confirmed manually by sellers, so the order list can advance
    // in the background. Polling keeps "finish your payment" / status changes
    // in near-real time without a reload.
    refetchInterval: 10_000,
  });
}

export function useWishlist() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["wishlist"],
    queryFn: async () => {
      const data = await fetchWishlist();
      return data.wishlist;
    },
  });

  const addMutation = useMutation({
    mutationFn: addToWishlist,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["wishlist"] }),
  });

  const removeMutation = useMutation({
    mutationFn: removeFromWishlist,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["wishlist"] }),
  });

  return { ...query, addToWishlist: addMutation, removeFromWishlist: removeMutation };
}

export function useBuyerProfile() {
  return useQuery({
    queryKey: ["buyer-profile"],
    queryFn: async () => {
      const data = await fetchBuyerProfile();
      return data.user;
    },
  });
}

export function useUpdateBuyerProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateBuyerProfile,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["buyer-profile"] });
      if (data.user) {
        localStorage.setItem("auth_user", JSON.stringify(data.user));
      }
    },
  });
}

export function useChangeBuyerPassword() {
  return useMutation({
    mutationFn: ({ currentPassword, newPassword }: { currentPassword: string; newPassword: string }) =>
      changeBuyerPassword(currentPassword, newPassword),
  });
}

export function useBuyerPayments() {
  return useQuery({
    queryKey: ["buyer-payments"],
    queryFn: async () => {
      const data = await fetchBuyerPayments();
      return data.payments;
    },
    // Sellers confirm payments manually; poll so the buyer's payment status
    // flips to "paid / confirmed" while they watch instead of after a reload.
    refetchInterval: 10_000,
  });
}
