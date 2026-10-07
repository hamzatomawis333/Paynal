import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchConversations,
  fetchMessages,
  sendMessage,
  startConversation,
  startAdminConversation,
  deleteConversation,
} from "@/lib/messages-api";

// Polls every 5s for "real-time" feel
export function useConversations(type?: string) {
  return useQuery({
    queryKey: ["conversations", type],
    queryFn: async () => (await fetchConversations(type)).conversations,
    refetchInterval: 5000,
  });
}

export function useMessages(conversationId: number | null) {
  return useQuery({
    queryKey: ["messages", conversationId],
    queryFn: async () => {
      if (!conversationId) return [];
      return (await fetchMessages(conversationId)).messages;
    },
    enabled: !!conversationId,
    refetchInterval: 3000,
  });
}

export function useSendMessage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ conversationId, body, imageUrl }: { conversationId: number; body: string; imageUrl?: string }) =>
      sendMessage(conversationId, body, imageUrl),
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["messages", vars.conversationId] });
      qc.invalidateQueries({ queryKey: ["conversations"] });
    },
  });
}

export function useStartConversation() {
  return useMutation({
    mutationFn: ({ sellerId, productId }: { sellerId: number; productId?: number | null }) =>
      startConversation(sellerId, productId),
  });
}

export function useStartAdminChat() {
  return useMutation({
    mutationFn: startAdminConversation,
  });
}

export function useDeleteConversation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (conversationId: number) => deleteConversation(conversationId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["conversations"] });
    },
  });
}
