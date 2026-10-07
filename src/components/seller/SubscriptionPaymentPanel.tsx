import { useState } from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, Clock, MessageSquare, ShieldCheck, TriangleAlert, Wallet } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { getErrorMessage } from "@/lib/errors";
import { formatPrice } from "@/lib/format";
import CopyButton from "@/components/checkout/CopyButton";
import GcashReferenceInput from "@/components/checkout/GcashReferenceInput";
import {
  formatGcashNumber, formatGcashReference,
  normaliseGcashReference, validateGcashReference,
} from "@/lib/payments-api";
import { useMarkSubscriptionPaymentSent } from "@/hooks/useSubscription";
import type { SellerSubscription, SubscriptionPaymentStatus } from "@/lib/subscription-api";

/** Seller-side wording: the payer here is the seller, the verifier is the admin. */
const statusLabel: Record<SubscriptionPaymentStatus, string> = {
  pending: "Awaiting your payment",
  awaiting_confirmation: "Sent - awaiting admin",
  completed: "Confirmed by admin",
  rejected: "Payment rejected",
};

const statusClass: Record<SubscriptionPaymentStatus, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  awaiting_confirmation: "bg-blue-100 text-blue-800",
  completed: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
};

interface Props {
  subscription: SellerSubscription;
  /** Destination number from platform_settings; '' when not configured. */
  gcashNumber: string;
}

/**
 * The seller's half of the manual GCash workflow, structurally the same as
 * GcashPaymentPanel but with the admin as the verifier: the seller pays,
 * submits a reference, and the admin confirms it against their own GCash
 * before the subscription activates.
 *
 * Polling lives in useSellerSubscription's refetchInterval, so this component
 * only renders the current state.
 */
export default function SubscriptionPaymentPanel({ subscription, gcashNumber }: Props) {
  const markSent = useMarkSubscriptionPaymentSent();

  const [reference, setReference] = useState("");
  const [touched, setTouched] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const amount = Number(subscription.payment_amount) || 0;
  const status = subscription.payment_status;
  const referenceError = validateGcashReference(reference);
  const busy = markSent.isPending;

  const submit = () => {
    setTouched(true);
    if (referenceError) return;
    markSent.mutate(
      { subscriptionId: Number(subscription.id), reference: normaliseGcashReference(reference) },
      {
        onSuccess: (res) => {
          if (res.already_marked) toast.info("This payment is already marked as sent");
          else toast.success("Reference submitted - the admin will check their GCash");
          setConfirmOpen(false);
          setReference("");
          setTouched(false);
        },
        onError: (err) => toast.error(getErrorMessage(err, "Could not submit the reference")),
      }
    );
  };

  const statusIcon =
    status === "completed" ? <CheckCircle2 className="h-4 w-4" /> :
    status === "rejected" ? <TriangleAlert className="h-4 w-4" /> :
    status === "awaiting_confirmation" ? <Clock className="h-4 w-4" /> :
    <Wallet className="h-4 w-4" />;

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="space-y-2 p-5">
          <h2 className="flex items-center gap-2 font-display text-lg font-bold text-foreground">
            <Wallet className="h-5 w-5 text-primary" />
            Pay with GCash
          </h2>
          <p className="text-sm text-muted-foreground">
            Send exactly{" "}
            <span className="font-semibold text-foreground">{formatPrice(amount)}</span> to the
            platform's GCash number below, then paste your reference number. Your subscription
            activates once the admin verifies the payment.
          </p>
          <Badge className={`gap-1 ${statusClass[status]}`}>
            {statusIcon}
            {statusLabel[status]}
          </Badge>
          {status === "completed" && subscription.paid_at && (
            <p className="flex items-start gap-2 rounded-md border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-900 dark:text-emerald-200">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <span>Payment confirmed by the admin.</span>
            </p>
          )}
        </CardContent>
      </Card>

      {status === "rejected" && (
        <p className="flex items-start gap-2 rounded-md border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-900 dark:text-red-200">
          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>
            {subscription.payment_rejection_reason || "The admin could not verify this payment."}{" "}
            {subscription.conversation_id ? (
              <Link
                to={`/seller/messages?conversation=${subscription.conversation_id}`}
                className="font-semibold underline"
              >
                Message the admin
              </Link>
            ) : (
              "Use Chat with Admin"
            )}{" "}
            to sort it out, then submit the corrected reference below.
          </span>
        </p>
      )}

      {(status === "pending" || status === "rejected" || status === "awaiting_confirmation") && (
        <div className="space-y-3 rounded-md border border-border bg-muted/50 p-4">
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-xs text-muted-foreground">Send exactly this amount to</p>
              <p className="font-mono text-lg font-bold tracking-wide text-foreground">
                {gcashNumber ? formatGcashNumber(gcashNumber) : "Not configured"}
              </p>
            </div>
            {gcashNumber && <CopyButton value={gcashNumber} label="Copy GCash number" />}
          </div>

          {status === "awaiting_confirmation" ? (
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">
                Waiting for the admin to check their GCash.
                {subscription.transaction_reference && (
                  <span className="ml-1 font-mono text-xs text-foreground">
                    Ref: {formatGcashReference(subscription.transaction_reference)}
                  </span>
                )}
              </p>
              {subscription.conversation_id && (
                <Link
                  to={`/seller/messages?conversation=${subscription.conversation_id}`}
                  className="inline-flex items-center gap-1 text-sm font-semibold text-primary underline"
                >
                  <MessageSquare className="h-3.5 w-3.5" /> Open chat
                </Link>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <GcashReferenceInput
                id="sub-ref"
                value={reference}
                onChange={(raw) => setReference(raw)}
                touched={touched}
                onBlur={() => setTouched(true)}
                disabled={busy}
              />
              <Button
                className="w-full"
                disabled={referenceError !== null || !gcashNumber || busy}
                onClick={() => {
                  setTouched(true);
                  if (referenceError) return;
                  setConfirmOpen(true);
                }}
              >
                {busy ? "Notifying..." : status === "rejected" ? "Resend corrected reference" : "I've sent the payment"}
              </Button>
              <p className="text-xs text-muted-foreground">
                This does not confirm payment - the admin still has to find that reference
                in their GCash and confirm it.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Deliberate confirmation before claiming a transfer was sent, echoing the
          amount/number/reference back so a mis-pasted reference is caught here. */}
      <Dialog open={confirmOpen} onOpenChange={(next) => { if (!next && !busy) setConfirmOpen(false); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {status === "rejected" ? "Confirm you sent the payment again" : "Confirm you sent this payment"}
            </DialogTitle>
            <DialogDescription>
              {status === "rejected"
                ? "The new reference replaces the rejected one and will be checked again."
                : "The admin will be notified and will look for this reference in their GCash."}
            </DialogDescription>
          </DialogHeader>

          <dl className="space-y-2 rounded-md border border-border bg-muted/50 p-4 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Amount</dt>
              <dd className="text-right font-semibold tabular-nums text-foreground">{formatPrice(amount)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Sent to</dt>
              <dd className="text-right font-mono font-medium text-foreground">
                {gcashNumber ? formatGcashNumber(gcashNumber) : "-"}
              </dd>
            </div>
            <div className="flex justify-between gap-4 border-t border-border pt-2">
              <dt className="text-muted-foreground">Your reference</dt>
              <dd className="text-right font-mono font-semibold text-foreground">
                {formatGcashReference(reference)}
              </dd>
            </div>
          </dl>

          <p className="text-xs text-muted-foreground">
            This does not confirm the payment - the admin still has to verify it in their
            GCash. If they cannot find it, they will reject it and you can sort it out over chat.
          </p>

          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)} disabled={busy}>
              Cancel
            </Button>
            <Button onClick={submit} disabled={busy}>
              {busy ? "Sending..." : status === "rejected" ? "Yes, I've sent it again" : "Yes, I've sent it"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
