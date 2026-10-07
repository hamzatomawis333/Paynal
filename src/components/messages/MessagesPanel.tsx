import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useConversations, useMessages, useSendMessage, useDeleteConversation } from "@/hooks/useMessages";
import { uploadMessageImage } from "@/lib/messages-api";
import { getStoredUser, resolveApiImageUrl } from "@/lib/api";
import { formatDateTime } from "@/lib/format";
import { Send, MessageCircle, Loader2, Shield, ImagePlus, X, Trash2, Check, CheckCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export function MessagesPanel() {
  const [params, setParams] = useSearchParams();
  const initialId = params.get("conversation");
  const [activeId, setActiveId] = useState<number | null>(
    initialId ? Number(initialId) : null
  );
  const [text, setText] = useState("");
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [pendingImageUrl, setPendingImageUrl] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const me = getStoredUser();
  const myId = me?.id;
  const myRole = me?.role;

  // Admin only sees seller_admin conversations; seller/buyer see buyer_seller
  const convType = myRole === "admin" ? "seller_admin" : undefined;
  const { data: conversations = [], isLoading } = useConversations(convType);
  const { data: messages = [] } = useMessages(activeId);
  const sendMutation = useSendMessage();
  const deleteMutation = useDeleteConversation();
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-select first conversation
  useEffect(() => {
    if (!activeId && conversations.length > 0) {
      setActiveId(conversations[0].id);
    }
  }, [conversations, activeId]);

  // Follow ?conversation= changes while the component stays mounted. The
  // useState initialiser only runs on mount, so without this a link to a
  // different conversation would silently keep the currently open one.
  useEffect(() => {
    const target = Number(initialId);
    if (initialId && Number.isFinite(target) && target > 0 && target !== activeId) {
      setActiveId(target);
    }
  }, [initialId, activeId]);

  // Auto-scroll on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!activeId) return;
    if (!text.trim() && !pendingImageUrl) return;

    sendMutation.mutate(
      {
        conversationId: activeId,
        body: text.trim(),
        imageUrl: pendingImageUrl || undefined,
      },
      {
        onSuccess: () => {
          setText("");
          setPendingImageUrl(null);
          setPreviewImage(null);
        },
      }
    );
  }

  async function handleImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowed.includes(file.type)) {
      toast.error("Invalid file type. Allowed: JPG, PNG, WebP, GIF");
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("File too large. Max 5MB");
      return;
    }

    // Show local preview immediately
    const localUrl = URL.createObjectURL(file);
    setPreviewImage(localUrl);

    // Upload to server
    setUploadingImage(true);
    try {
      const result = await uploadMessageImage(file);
      setPendingImageUrl(result.image_url);
      toast.success("Image uploaded");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to upload image";
      toast.error(message);
      setPreviewImage(null);
      setPendingImageUrl(null);
    } finally {
      setUploadingImage(false);
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  function handleRemoveImage() {
    setPreviewImage(null);
    setPendingImageUrl(null);
    setUploadingImage(false);
  }

  function handleDeleteConversation(id: number) {
    deleteMutation.mutate(id, {
      onSuccess: () => {
        if (activeId === id) {
          setActiveId(null);
          setParams({});
        }
        setConfirmDelete(null);
        toast.success("Conversation deleted");
      },
      onError: () => {
        toast.error("Failed to delete conversation");
      },
    });
  }

  function handleSelect(id: number) {
    setActiveId(id);
    setParams({ conversation: String(id) });
  }

  const active = conversations.find((c) => c.id === activeId);

  // Determine the other party's name based on role and conversation type
  function getOtherName(c: typeof active) {
    if (!c) return "";
    if (c.type === "seller_admin") {
      // In seller_admin conversations: buyer_id = seller, seller_id = admin
      return myRole === "admin" ? c.buyer_name : c.seller_name;
    }
    // buyer_seller conversations
    return myRole === "seller" ? c.buyer_name : c.seller_name;
  }

  const otherName = getOtherName(active);

  const canSend = (text.trim() || pendingImageUrl) && !sendMutation.isPending && !uploadingImage;

  return (
    <div className="flex h-[calc(100vh-12rem)] gap-4">
      {/* Conversation list */}
      <Card className="w-80 overflow-hidden flex flex-col">
        <div className="border-b border-border p-4">
          <h2 className="font-display text-lg font-semibold">Messages</h2>
        </div>
        <div className="flex-1 overflow-y-auto">
          {isLoading && (
            <div className="flex items-center justify-center p-8" role="status" aria-label="Loading conversations">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" aria-hidden="true" />
            </div>
          )}
          {!isLoading && conversations.length === 0 && (
            <div className="p-8 text-center text-sm text-muted-foreground">
              <MessageCircle className="mx-auto mb-2 h-8 w-8 opacity-50" aria-hidden="true" />
              {myRole === "admin"
                ? "No seller conversations yet."
                : myRole === "seller"
                  ? "No conversations yet. Chat with Admin to subscribe."
                  : "No conversations yet."}
            </div>
          )}
          {conversations.map((c) => {
            const name = getOtherName(c);
            const isActive = c.id === activeId;
            const isAdminConv = c.type === "seller_admin";
            return (
              <div
                key={c.id}
                className={cn(
                  "group relative flex w-full items-start gap-1 border-b border-border pr-1 transition-colors",
                  isActive && "bg-primary/5"
                )}
              >
                <button
                  type="button"
                  onClick={() => handleSelect(c.id)}
                  aria-pressed={isActive}
                  aria-label={`Open conversation with ${name}`}
                  className={cn(
                    "min-w-0 flex-1 p-3 text-left transition-colors hover:bg-muted",
                    isActive && "hover:bg-primary/5"
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2">
                      {isAdminConv && <Shield className="h-3 w-3 shrink-0 text-muted-foreground" aria-hidden="true" />}
                      <p className="truncate font-medium">{name}</p>
                    </div>
                    {c.unread_count > 0 && (
                      <Badge variant="default" className="h-5 shrink-0 px-2 text-xs">
                        {c.unread_count}
                      </Badge>
                    )}
                  </div>
                  {c.product_name && (
                    <p className="truncate text-xs text-primary">re: {c.product_name}</p>
                  )}
                  {isAdminConv && !c.product_name && (
                    <p className="truncate text-xs text-muted-foreground">Subscription & Payments</p>
                  )}
                  <p className="mt-1 truncate text-xs text-muted-foreground">
                    {c.last_message ?? "No messages yet"}
                  </p>
                </button>
                <div className="flex shrink-0 items-center gap-1 self-start pt-3">
                  {confirmDelete === c.id ? (
                    <>
                      <button
                        type="button"
                        onClick={() => handleDeleteConversation(c.id)}
                        className="rounded p-0.5 text-destructive hover:text-destructive/80"
                        title="Confirm delete"
                        aria-label={`Confirm deleting conversation with ${name}`}
                      >
                        <Check className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDelete(null)}
                        className="rounded p-0.5 text-muted-foreground hover:text-foreground"
                        title="Cancel"
                        aria-label="Cancel delete"
                      >
                        <X className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmDelete(c.id)}
                      className="rounded p-0.5 text-muted-foreground opacity-0 transition-opacity hover:text-destructive focus-visible:opacity-100 group-hover:opacity-100"
                      title="Delete conversation"
                      aria-label={`Delete conversation with ${name}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Chat panel */}
      <Card className="flex-1 flex flex-col overflow-hidden">
        {!active ? (
          <div className="flex flex-1 items-center justify-center text-muted-foreground">
            {myRole === "admin"
              ? "Select a seller conversation"
              : "Select a conversation"}
          </div>
        ) : (
          <>
            <div className="border-b border-border p-4">
              <div className="flex items-center gap-2">
                {active.type === "seller_admin" && <Shield className="h-4 w-4 text-muted-foreground" aria-hidden="true" />}
                <h3 className="font-semibold">{otherName}</h3>
              </div>
              {active.product_name && (
                <p className="text-xs text-muted-foreground">
                  About: {active.product_name}
                </p>
              )}
              {active.type === "seller_admin" && !active.product_name && (
                <p className="text-xs text-muted-foreground">
                  Subscription & Payment Verification
                </p>
              )}
            </div>
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.length === 0 && (
                <p className="text-center text-sm text-muted-foreground">
                  {active.type === "seller_admin"
                    ? "Start a conversation about your subscription."
                    : "Start a conversation."}
                </p>
              )}
              {messages.map((m) => {
                const mine = m.sender_id === myId;
                return (
                  <div
                    key={m.id}
                    className={cn("flex", mine ? "justify-end" : "justify-start")}
                  >
                    <div
                      className={cn(
                        "max-w-[75%] rounded-2xl px-4 py-2 text-sm",
                        mine
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-foreground"
                      )}
                    >
                      {m.image_url && (
                        <a href={resolveApiImageUrl(m.image_url)} target="_blank" rel="noopener noreferrer" className="block mb-1">
                          <img
                            src={resolveApiImageUrl(m.image_url)}
                            alt="Shared image"
                            className="rounded-lg max-w-full max-h-64 object-cover cursor-pointer hover:opacity-90 transition-opacity"
                          />
                        </a>
                      )}
                      {m.body && (
                        <p className="whitespace-pre-wrap break-words">{m.body}</p>
                      )}
                      <p
                        className={cn(
                          "mt-1 text-[10px]",
                          mine ? "text-primary-foreground/70" : "text-muted-foreground"
                        )}
                      >
                        {formatDateTime(m.created_at)}
                        {mine && (
                          <span className="ml-1 inline-flex items-center">
                            {m.is_read ? (
                              <CheckCheck className="h-3.5 w-3.5 text-blue-300" aria-hidden="true" />
                            ) : (
                              <Check className="h-3.5 w-3.5" aria-hidden="true" />
                            )}
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Image preview */}
            {previewImage && (
              <div className="border-t border-border px-4 pt-3">
                <div className="relative inline-block">
                  <img
                    src={previewImage}
                    alt="Preview"
                    className="h-20 rounded-lg object-cover border border-border"
                  />
                  {uploadingImage && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-lg">
                      <Loader2 className="h-5 w-5 animate-spin text-white" />
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={handleRemoveImage}
                    className="absolute -top-2 -right-2 rounded-full bg-destructive p-0.5 text-destructive-foreground hover:bg-destructive/80"
                    aria-label="Remove attached image"
                  >
                    <X className="h-3 w-3" aria-hidden="true" />
                  </button>
                </div>
              </div>
            )}

            <form
              onSubmit={handleSend}
              className="flex items-center gap-2 border-t border-border p-3"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                onChange={handleImageSelect}
                className="hidden"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingImage || sendMutation.isPending}
                title="Send image"
                aria-label="Attach image"
              >
                <ImagePlus className="h-4 w-4" aria-hidden="true" />
              </Button>
              <Input
                placeholder="Type a message..."
                aria-label="Message"
                value={text}
                onChange={(e) => setText(e.target.value)}
                disabled={sendMutation.isPending || uploadingImage}
              />
              <Button
                type="submit"
                variant="gold"
                disabled={!canSend}
                aria-label="Send message"
              >
                {sendMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  <Send className="h-4 w-4" aria-hidden="true" />
                )}
              </Button>
            </form>
          </>
        )}
      </Card>
    </div>
  );
}
