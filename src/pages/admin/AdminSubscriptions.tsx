import { getErrorMessage } from "@/lib/errors";
import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { useAdminSubscriptions, usePlatformSettings } from "@/hooks/useAdmin";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { TableSkeleton } from "@/components/LoadingSkeleton";
import { StatusBadge } from "@/components/StatusBadge";
import { SubscriptionCountdown } from "@/components/SubscriptionCountdown";
import { formatDate, formatPrice } from "@/lib/format";
import { formatGcashReference, REJECT_REASONS, type RejectReasonCode } from "@/lib/payments-api";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { useStartConversation } from "@/hooks/useMessages";
import {
  CheckCircle, XCircle, Clock, UserCheck, MessageCircle, Loader2, Inbox, Trash2, Pencil,
} from "lucide-react";
import type { AdminSubscription } from "@/types/api";

const statusTabs = ["", "Pending", "Active", "Expired", "Rejected"];

export default function AdminSubscriptions() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("");
  const {
    data: subscriptions, isLoading, isError, refetch,
    manageSubscription, deleteSubscription, confirmPayment, rejectPayment,
  } = useAdminSubscriptions(activeTab || undefined);
  const startChat = useStartConversation();
  const platform = usePlatformSettings();

  // Inline editor for the platform-wide subscription price. Changing it only
  // affects NEW requests - rows already in the table keep their amounts.
  const [priceEditing, setPriceEditing] = useState(false);
  const [priceDraft, setPriceDraft] = useState("");
  const currentPrice = Number(platform.data?.subscription_price) || 299;

  function startPriceEdit() {
    setPriceDraft(platform.data?.subscription_price ?? String(currentPrice));
    setPriceEditing(true);
  }

  function handleSavePrice() {
    const raw = priceDraft.trim();
    if (!/^\d{1,6}(\.\d{1,2})?$/.test(raw) || Number(raw) < 1 || Number(raw) > 100000) {
      toast.error("Enter a price between ₱1.00 and ₱100,000.00 (up to 2 decimals)");
      return;
    }
    platform.updateSettings.mutate(
      { subscription_price: raw },
      {
        onSuccess: () => {
          toast.success("Subscription price updated - new requests will use it");
          setPriceEditing(false);
        },
        onError: (err) => toast.error(getErrorMessage(err, "Failed to update price")),
      }
    );
  }

  const [rejectDialog, setRejectDialog] = useState(false);
  const [rejectingId, setRejectingId] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  // Payment rejection (separate from business rejection: the subscription stays
  // Pending and the seller resubmits a corrected GCash reference).
  const [payRejectDialog, setPayRejectDialog] = useState(false);
  const [payRejectingId, setPayRejectingId] = useState<number | null>(null);
  const [payReasonCode, setPayReasonCode] = useState<RejectReasonCode>("not_received");
  const [payReason, setPayReason] = useState("");

  // Deletion (cleanup of expired/rejected/pending records)
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<AdminSubscription | null>(null);

  function handleConfirmPayment(sub: AdminSubscription) {
    confirmPayment.mutate(
      { subscription_id: Number(sub.id) },
      {
        onSuccess: (res) => {
          if (res.already_confirmed) toast.info("This payment is already confirmed");
          else toast.success(`Payment confirmed - subscription active until ${formatDate(res.end_date)}`);
        },
        onError: (err) => toast.error(getErrorMessage(err, "Failed to confirm payment")),
      }
    );
  }

  function openPayReject(id: number) {
    setPayRejectingId(id);
    setPayReasonCode("not_received");
    setPayReason("");
    setPayRejectDialog(true);
  }

  function handlePayReject() {
    if (!payRejectingId) return;
    if (payReasonCode === "other" && !payReason.trim()) {
      toast.error("Add a note so the seller knows what to fix");
      return;
    }
    rejectPayment.mutate(
      {
        subscription_id: payRejectingId,
        reason_code: payReasonCode,
        reason: payReason.trim() || REJECT_REASONS.find((r) => r.value === payReasonCode)?.label || "",
      },
      {
        onSuccess: () => {
          toast.success("Payment rejected - the seller can resubmit a new reference");
          setPayRejectDialog(false);
        },
        onError: (err) => toast.error(getErrorMessage(err, "Failed to reject payment")),
      }
    );
  }

  function openReject(id: number) {
    setRejectingId(id);
    setRejectReason("");
    setRejectDialog(true);
  }

  function handleReject() {
    if (!rejectingId) return;
    manageSubscription.mutate(
      { id: rejectingId, action: "reject", reason: rejectReason },
      {
        onSuccess: () => {
          toast.success("Subscription rejected");
          setRejectDialog(false);
        },
        onError: (err) => toast.error(getErrorMessage(err, "Failed")),
      }
    );
  }

  function handleExpire(id: number) {
    manageSubscription.mutate(
      { id, action: "expire" },
      {
        onSuccess: () => toast.success("Subscription marked as expired"),
        onError: (err) => toast.error(getErrorMessage(err, "Failed")),
      }
    );
  }

  function openDelete(sub: AdminSubscription) {
    setDeleteTarget(sub);
    setDeleteDialog(true);
  }

  function handleDelete() {
    if (!deleteTarget) return;
    deleteSubscription.mutate(Number(deleteTarget.id), {
      onSuccess: () => {
        toast.success("Subscription deleted");
        setDeleteDialog(false);
        setDeleteTarget(null);
      },
      onError: (err) => toast.error(getErrorMessage(err, "Failed to delete subscription")),
    });
  }

  function handleChatSeller(sellerId: number) {
    startChat.mutate(
      { sellerId },
      {
        onSuccess: (data) => navigate(`/admin/messages?conversation=${data.conversation_id}`),
        onError: (err) => toast.error(getErrorMessage(err, "Failed to start chat")),
      }
    );
  }

  const busy =
    manageSubscription.isPending || confirmPayment.isPending ||
    rejectPayment.isPending || deleteSubscription.isPending;

  return (
    <AdminLayout>
      <Helmet>
        <title>Subscription Management | Admin</title>
      </Helmet>

      <div className="space-y-6">
        <PageHeader
          title="Subscription Management"
          subtitle="Review and manage seller subscription requests"
        />

        {/* Platform subscription price */}
        <Card>
          <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
            <div>
              <p className="text-sm text-muted-foreground">Subscription Price</p>
              {priceEditing ? (
                <div className="mt-1 flex items-center gap-1.5">
                  <span className="text-sm font-medium text-muted-foreground" aria-hidden="true">₱</span>
                  <Input
                    autoFocus
                    className="h-8 w-32"
                    inputMode="decimal"
                    placeholder="299.00"
                    aria-label="Subscription price"
                    value={priceDraft}
                    onChange={(e) => setPriceDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSavePrice();
                    }}
                  />
                </div>
              ) : (
                <p className="text-xl font-bold text-primary">{formatPrice(currentPrice)}</p>
              )}
            </div>
            <div className="flex items-center gap-2">
              {priceEditing ? (
                <>
                  <Button size="sm" onClick={handleSavePrice} disabled={platform.updateSettings.isPending}>
                    {platform.updateSettings.isPending && <Loader2 className="mr-1 h-4 w-4 animate-spin" aria-hidden="true" />}
                    Save
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setPriceEditing(false)}>
                    Cancel
                  </Button>
                </>
              ) : (
                <Button size="sm" variant="outline" onClick={startPriceEdit} disabled={platform.isLoading}>
                  <Pencil className="mr-1 h-4 w-4" aria-hidden="true" />
                  Edit Price
                </Button>
              )}
            </div>
            <p className="w-full text-xs text-muted-foreground">
              Applies to new subscription requests only - amounts on existing pending and active
              subscriptions stay unchanged.
            </p>
          </CardContent>
        </Card>

        {/* Status Tabs */}
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filter subscriptions by status">
          {statusTabs.map((tab) => (
            <Button
              key={tab || "all"}
              variant={activeTab === tab ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveTab(tab)}
              aria-pressed={activeTab === tab}
            >
              {tab || "All"}
            </Button>
          ))}
        </div>

        {/* Subscriptions Table */}
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <TableSkeleton cols={8} className="p-6" />
            ) : isError ? (
              <ErrorState className="py-12" onRetry={() => void refetch()} />
            ) : !subscriptions?.length ? (
              <EmptyState
                icon={Inbox}
                title="No subscriptions found"
                description={
                  activeTab
                    ? `No ${activeTab.toLowerCase()} subscriptions right now.`
                    : "Seller subscription requests will appear here."
                }
                action={
                  activeTab && (
                    <Button variant="outline" size="sm" onClick={() => setActiveTab("")}>
                      Show all
                    </Button>
                  )
                }
              />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Seller</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="hidden md:table-cell">Payment</TableHead>
                    <TableHead className="hidden md:table-cell">Start Date</TableHead>
                    <TableHead className="hidden md:table-cell">End Date</TableHead>
                    <TableHead className="hidden lg:table-cell">Approved By</TableHead>
                    <TableHead className="hidden lg:table-cell">Requested</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {subscriptions.map((sub) => (
                    <TableRow key={sub.id}>
                      <TableCell>
                        <div>
                          <p className="text-sm font-medium text-foreground">{sub.seller_name}</p>
                          <p className="text-xs text-muted-foreground">{sub.seller_email}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={sub.status} kind="subscription" />
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <div className="space-y-1">
                          <StatusBadge status={sub.payment_status} kind="subscription-payment" />
                          <p className="text-xs text-muted-foreground">
                            {formatPrice(Number(sub.payment_amount) || 0)}
                            {sub.transaction_reference && (
                              <span className="ml-1 font-mono">
                                · ref {formatGcashReference(sub.transaction_reference)}
                              </span>
                            )}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="hidden text-sm text-muted-foreground md:table-cell">
                        {sub.start_date ? formatDate(sub.start_date) : "—"}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {sub.end_date ? (
                          <div className="text-sm text-muted-foreground">
                            <span>{formatDate(sub.end_date)}</span>
                            {sub.status === "Active" && (
                              <SubscriptionCountdown
                                endDate={sub.end_date}
                                showSeconds={false}
                                className="block text-xs font-medium text-primary"
                              />
                            )}
                          </div>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell className="hidden text-sm text-muted-foreground lg:table-cell">
                        {sub.approved_by_name || "—"}
                      </TableCell>
                      <TableCell className="hidden text-sm text-muted-foreground lg:table-cell">
                        {formatDate(sub.created_at)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {sub.status === "Pending" && sub.payment_status === "awaiting_confirmation" && (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-emerald-600 hover:bg-emerald-500/10 hover:text-emerald-700 dark:text-emerald-400"
                                onClick={() => handleConfirmPayment(sub)}
                                title="Confirm payment & activate"
                                aria-label={`Confirm subscription payment for ${sub.seller_name}`}
                                disabled={busy}
                              >
                                <CheckCircle className="h-4 w-4" aria-hidden="true" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                                onClick={() => openPayReject(Number(sub.id))}
                                title="Reject payment"
                                aria-label={`Reject subscription payment for ${sub.seller_name}`}
                                disabled={busy}
                              >
                                <XCircle className="h-4 w-4" aria-hidden="true" />
                              </Button>
                            </>
                          )}
                          {sub.status === "Pending" && (sub.payment_status === "pending" || sub.payment_status === "rejected") && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                              onClick={() => openReject(Number(sub.id))}
                              title="Reject subscription"
                              aria-label={`Reject subscription for ${sub.seller_name}`}
                              disabled={busy}
                            >
                              <XCircle className="h-4 w-4" aria-hidden="true" />
                            </Button>
                          )}
                          {sub.status === "Active" && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-orange-500 hover:bg-orange-500/10 hover:text-orange-600"
                              onClick={() => handleExpire(Number(sub.id))}
                              title="Mark as expired"
                              aria-label={`Mark ${sub.seller_name}'s subscription as expired`}
                              disabled={busy}
                            >
                              <Clock className="h-4 w-4" aria-hidden="true" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleChatSeller(Number(sub.seller_id))}
                            title="Chat with seller"
                            aria-label={`Chat with ${sub.seller_name}`}
                          >
                            <MessageCircle className="h-4 w-4" aria-hidden="true" />
                          </Button>
                          {sub.status !== "Active" && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                              onClick={() => openDelete(sub)}
                              title="Delete subscription"
                              aria-label={`Delete ${sub.seller_name}'s subscription`}
                              disabled={busy}
                            >
                              <Trash2 className="h-4 w-4" aria-hidden="true" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Reject Subscription Dialog (business rejection - terminal) */}
      <Dialog open={rejectDialog} onOpenChange={setRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Subscription</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="reject-reason">Reason (optional)</Label>
              <Textarea
                id="reject-reason"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Explain why this subscription is being rejected..."
                rows={3}
              />
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setRejectDialog(false)}>Cancel</Button>
              <Button
                variant="destructive"
                onClick={handleReject}
                disabled={manageSubscription.isPending}
              >
                {manageSubscription.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
                Reject
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Reject Payment Dialog - subscription stays Pending, seller resubmits */}
      <Dialog open={payRejectDialog} onOpenChange={setPayRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Payment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              The seller will be asked to send a corrected GCash reference. Their
              subscription request stays open.
            </p>
            <div className="space-y-2">
              <Label htmlFor="pay-reject-reason">What was wrong?</Label>
              <Select value={payReasonCode} onValueChange={(v) => setPayReasonCode(v as RejectReasonCode)}>
                <SelectTrigger id="pay-reject-reason">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {REJECT_REASONS.map((r) => (
                    <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="pay-reject-note">
                Note {payReasonCode === "other" ? "(required)" : "(optional)"}
              </Label>
              <Textarea
                id="pay-reject-note"
                value={payReason}
                onChange={(e) => setPayReason(e.target.value)}
                placeholder="Tell the seller what to fix..."
                rows={3}
              />
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setPayRejectDialog(false)}>Cancel</Button>
              <Button
                variant="destructive"
                onClick={handlePayReject}
                disabled={rejectPayment.isPending}
              >
                {rejectPayment.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
                Reject Payment
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      {/* Delete Subscription Dialog - removes the record permanently */}
      <Dialog open={deleteDialog} onOpenChange={setDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Subscription</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              This permanently removes the{" "}
              <span className="font-medium text-foreground">
                {deleteTarget?.status.toLowerCase()}
              </span>{" "}
              subscription record for{" "}
              <span className="font-medium text-foreground">{deleteTarget?.seller_name}</span>,
              together with its payment history and notifications. This can't be undone.
            </p>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setDeleteDialog(false)}>Cancel</Button>
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={deleteSubscription.isPending}
              >
                {deleteSubscription.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
                Delete
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
