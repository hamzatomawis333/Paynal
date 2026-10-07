import { useState } from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, MessageSquare, RefreshCw, TriangleAlert, Wallet } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { StatusBadge } from "@/components/StatusBadge";
import { formatPrice, formatDateTime } from "@/lib/format";
import { getErrorMessage } from "@/lib/errors";
import { toast } from "sonner";
import {
  confirmPayment, rejectPayment,
  REJECT_REASONS, type RejectReasonCode,
} from "@/lib/payments-api";
import type { SellerOrderPayment } from "@/lib/seller-api";

interface Props {
  payment: SellerOrderPayment;
  orderId: number;
  /** The order's status - when it is cancelled, no payment action remains. */
  orderStatus?: string;
  onChanged: () => void;
}

export default function SellerPaymentCard({ payment, orderId, orderStatus, onChanged }: Props) {
  const [busy, setBusy] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [reasonCode, setReasonCode] = useState<RejectReasonCode>("not_received");
  const [reason, setReason] = useState("");
  const [receivedOpen, setReceivedOpen] = useState(false);
  const [receivedNote, setReceivedNote] = useState("");

  const handleConfirm = async () => {
    setBusy(true);
    try {
      const res = await confirmPayment(payment.id);
      toast.success(
        res.already_confirmed
          ? "Already confirmed"
          : res.order_fully_paid
            ? "Payment confirmed — all sellers confirmed, the order is now confirmed."
            : "Payment confirmed — your part is done, waiting on the other sellers.",
      );
      onChanged();
    } catch (err) {
      toast.error(getErrorMessage(err, "Failed to confirm this payment"));
    } finally {
      setBusy(false);
    }
  };

  // Overturns your own rejection. The usual cause is that you rejected before
  // the money arrived, or the buyer later sent the missing balance, so this
  // deliberately sits as a quiet option rather than a peer of "Confirm payment
  // received": you should only reach it after actually finding the money.
  const handleReceivedLate = async () => {
    const note = receivedNote.trim();
    if (!note) {
      toast.error("Add a short note — the buyer sees this in the chat, so say how the money reached you.");
      return;
    }
    setBusy(true);
    try {
      const res = await confirmPayment(payment.id, note);
      toast.success(
        res.already_confirmed
          ? "Already confirmed"
          : res.order_fully_paid
            ? "Payment marked as received — all sellers confirmed, the order is now confirmed."
            : "Payment marked as received — your part is done, waiting on the other sellers.",
      );
      setReceivedOpen(false);
      setReceivedNote("");
      onChanged();
    } catch (err) {
      toast.error(getErrorMessage(err, "Failed to update this payment"));
    } finally {
      setBusy(false);
    }
  };

  const handleReject = async () => {
    if (reasonCode === "other" && !reason.trim()) {
      toast.error("Please explain the problem in the note.");
      return;
    }
    setBusy(true);
    try {
      await rejectPayment(payment.id, reasonCode, reason.trim());
      toast.success("Payment rejected — the buyer was notified in the chat and can sort it out with you.");
      setRejectOpen(false);
      setReason("");
      onChanged();
    } catch (err) {
      toast.error(getErrorMessage(err, "Failed to reject this payment"));
    } finally {
      setBusy(false);
    }
  };

  const orderCancelled = orderStatus === "cancelled";

  return (
    <Card className="border-primary/30">
      <CardContent className="space-y-3 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Wallet className="h-4 w-4 text-primary" aria-hidden="true" />
            Your GCash share
          </p>
          {/* On a cancelled order the payment row is frozen - the badge tells
              THAT story instead of inviting a confirm/reject that would go
              nowhere. */}
          {orderCancelled ? (
            <StatusBadge status="cancelled" kind="order" />
          ) : (
            <StatusBadge status={payment.status} kind="payment" audience="seller" />
          )}
        </div>

        <p className="text-xl font-bold tabular-nums text-foreground">
          {formatPrice(payment.amount)}
        </p>

        {orderCancelled ? (
          <p className="rounded-md border border-border bg-muted/50 p-2.5 text-xs text-muted-foreground">
            This order was cancelled. No payment action is needed.
          </p>
        ) : (
          <>
            {/* The reference is the seller's only way to find this transfer in
                their own GCash history, so it is shown prominently. */}
            {payment.transaction_reference && (
              <div className="rounded-md border border-border bg-muted/50 px-3 py-2">
                <p className="text-xs text-muted-foreground">Buyer&apos;s GCash reference</p>
                <p className="font-mono text-sm font-bold tracking-wide text-foreground">
                  {payment.transaction_reference}
                </p>
              </div>
            )}

            {payment.status === "pending" && (
          <p className="text-xs text-muted-foreground">
            The buyer has not marked this as sent yet. Confirm only after the money
            actually appears in your GCash.
          </p>
        )}

        {payment.status === "awaiting_confirmation" && (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Search your GCash history for the reference above, and confirm only if you
              find {formatPrice(payment.amount)}.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" disabled={busy} onClick={handleConfirm}>
                <CheckCircle2 className="mr-1.5 h-4 w-4" aria-hidden="true" />
                {busy ? "Working..." : "Confirm payment received"}
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={busy}
                onClick={() => setRejectOpen(true)}
              >
                <TriangleAlert className="mr-1.5 h-4 w-4" aria-hidden="true" />
                Cannot verify
              </Button>
              {payment.conversation_id && (
                <Button size="sm" variant="ghost" asChild>
                  <Link to={`/seller/messages?conversation=${payment.conversation_id}`}>
                    <MessageSquare className="mr-1.5 h-4 w-4" aria-hidden="true" />
                    Chat with buyer
                  </Link>
                </Button>
              )}
            </div>
          </div>
        )}

        {payment.status === "completed" && (
          <p className="flex items-start gap-2 rounded-md border border-emerald-500/30 bg-emerald-500/10 p-2.5 text-sm text-emerald-900 dark:text-emerald-200">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <span>
              You confirmed this payment
              {payment.paid_at && ` on ${formatDateTime(payment.paid_at)}`}.
            </span>
          </p>
        )}

        {payment.status === "rejected" && (
          <div className="space-y-2">
            <p className="flex items-start gap-2 rounded-md border border-red-500/30 bg-red-500/10 p-2.5 text-sm text-red-900 dark:text-red-200">
              <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <span>
                {payment.rejection_reason || "You could not verify this payment."} The buyer
                was notified and can resend it or message you.
              </span>
            </p>
            <div className="flex flex-wrap items-center gap-2">
              {payment.conversation_id && (
                <Button size="sm" variant="ghost" asChild>
                  <Link to={`/seller/messages?conversation=${payment.conversation_id}`}>
                    <MessageSquare className="mr-1.5 h-4 w-4" aria-hidden="true" />
                    Chat with buyer
                  </Link>
                </Button>
              )}
              {/* Quiet on purpose: overturning a rejection should be a considered
                  action, not something a seller taps by reflex. */}
              <Button
                size="sm"
                variant="ghost"
                disabled={busy}
                onClick={() => setReceivedOpen(true)}
              >
                <RefreshCw className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
                Update: I received this payment
              </Button>
            </div>
          </div>
        )}
          </>
        )}

        <Dialog open={receivedOpen} onOpenChange={setReceivedOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Mark this payment as received</DialogTitle>
              <DialogDescription>
                You previously marked {formatPrice(payment.amount)} as unverified. If the
                money has since reached you, confirm it now and the order can move
                forward. The buyer will see your note in the chat.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-1.5">
              <Label htmlFor="received-note">What happened (required)</Label>
              <Textarea
                id="received-note"
                value={receivedNote}
                maxLength={255}
                rows={3}
                placeholder="e.g. The remaining 250 arrived this morning, GCash history confirms the full 1,150."
                onChange={(e) => setReceivedNote(e.target.value)}
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setReceivedOpen(false)} disabled={busy}>
                Cancel
              </Button>
              <Button onClick={handleReceivedLate} disabled={busy}>
                {busy ? "Saving..." : "Yes, I received it"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Reject this payment</DialogTitle>
              <DialogDescription>
                The buyer is told what went wrong and can message you to resolve it. The
                order is not confirmed and you cannot process it until payment clears.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="reject-reason">Reason</Label>
                <Select value={reasonCode} onValueChange={(v) => setReasonCode(v as RejectReasonCode)}>
                  <SelectTrigger id="reject-reason">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {REJECT_REASONS.map((r) => (
                      <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="reject-note">
                  Note {reasonCode === "other" ? "(required)" : "(optional)"}
                </Label>
                <Input
                  id="reject-note"
                  value={reason}
                  maxLength={255}
                  placeholder="e.g. Received 900 instead of 1,150"
                  onChange={(e) => setReason(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setRejectOpen(false)} disabled={busy}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleReject} disabled={busy}>
                {busy ? "Sending..." : "Reject payment"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
