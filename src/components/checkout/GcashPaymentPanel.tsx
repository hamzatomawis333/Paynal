import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import {
  CheckCircle2, Clock, MessageSquare, ShieldCheck, TriangleAlert, Wallet,
} from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { getErrorMessage } from "@/lib/errors";
import { formatPrice, formatDateTime } from "@/lib/format";
import CopyButton from "@/components/checkout/CopyButton";
import {
  fetchOrderPayments, markPaymentSent, formatGcashNumber,
  normaliseGcashReference, validateGcashReference,
  paymentStatusClass, paymentStatusLabel,
  type PaymentGroup, type PaymentSnapshot,
} from "@/lib/payments-api";

function GroupCard({ group, onMarked }: { group: PaymentGroup; onMarked: () => void }) {
  const [reference, setReference] = useState("");
  const [busy, setBusy] = useState(false);
  const [touched, setTouched] = useState(false);
  const queryClient = useQueryClient();

  // Shared with the server so the button can be disabled up front rather than
  // round-tripping for a rejection the buyer can be told about immediately.
  const referenceError = validateGcashReference(reference);
  const canSubmit = referenceError === null && !busy;

  const handleMarkSent = async () => {
    setTouched(true);
    if (referenceError) return;
    setBusy(true);
    try {
      const res = await markPaymentSent(group.payment_id, normaliseGcashReference(reference));
      if (res.already_marked) toast.info("This payment is already marked as sent");
      else toast.success("Notified the seller - they will check that reference");
      // The order only becomes a real order once its payment leaves pending, so
      // the buyer's order list and payment history should re-read immediately.
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["buyer-orders"] }),
        queryClient.invalidateQueries({ queryKey: ["buyer-payments"] }),
      ]);
      onMarked();
    } catch (err) {
      toast.error(getErrorMessage(err, "Could not mark this payment as sent"));
    } finally {
      setBusy(false);
    }
  };

  const statusIcon =
    group.status === "completed" ? <CheckCircle2 className="h-4 w-4" /> :
    group.status === "rejected" ? <TriangleAlert className="h-4 w-4" /> :
    group.status === "awaiting_confirmation" ? <Clock className="h-4 w-4" /> :
    <Wallet className="h-4 w-4" />;

  return (
    <Card>
      <CardContent className="space-y-4 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="font-semibold text-foreground">{group.seller_name}</p>
            <p className="text-xs text-muted-foreground">
              {group.items.reduce((n, i) => n + i.quantity, 0)} item(s) from this seller
            </p>
          </div>
          <Badge className={`gap-1 ${paymentStatusClass[group.status]}`}>
            {statusIcon}
            {paymentStatusLabel[group.status]}
          </Badge>
        </div>

        <ul className="space-y-1 border-l-2 border-border pl-3">
          {group.items.map((item, idx) => (
            <li key={idx} className="text-sm text-muted-foreground">
              {item.quantity} x {item.name}
              <span className="float-right tabular-nums">{formatPrice(item.subtotal)}</span>
            </li>
          ))}
        </ul>

        <dl className="space-y-1 border-t border-border pt-3 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Items subtotal</dt>
            <dd className="tabular-nums">{formatPrice(group.subtotal)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Shipping share</dt>
            <dd className="tabular-nums">{formatPrice(group.shipping_share)}</dd>
          </div>
          <div className="flex justify-between font-semibold">
            <dt>Send to this seller</dt>
            <dd className="tabular-nums">{formatPrice(group.amount)}</dd>
          </div>
        </dl>

        {group.status === "completed" && (
          <p className="flex items-start gap-2 rounded-md border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-900 dark:text-emerald-200">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <span>
              {group.seller_name} confirmed receipt
              {group.paid_at && ` on ${formatDateTime(group.paid_at)}`}.
            </span>
          </p>
        )}

        {group.status === "rejected" && (
          <p className="flex items-start gap-2 rounded-md border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-900 dark:text-red-200">
            <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <span>
              {group.rejection_reason || "The seller could not verify this payment."}{" "}
              {group.conversation_id && (
                <Link
                  to={`/account/messages?conversation=${group.conversation_id}`}
                  className="font-semibold underline"
                >
                  Message the seller
                </Link>
              )}{" "}
              to sort it out.
            </span>
          </p>
        )}

        {(group.status === "pending" || group.status === "awaiting_confirmation") && (
          <div className="space-y-3 rounded-md bg-muted/50 p-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-xs text-muted-foreground">Send exactly this amount to</p>
                <p className="font-mono text-lg font-bold tracking-wide text-foreground">
                  {group.gcash_number ? formatGcashNumber(group.gcash_number) : "Not available"}
                </p>
              </div>
              {group.gcash_number && <CopyButton value={group.gcash_number} label="Copy GCash number" />}
            </div>

            {group.status === "pending" ? (
              <div className="space-y-2">
                <Label htmlFor={`ref-${group.payment_id}`} className="text-xs">
                  GCash reference number (required)
                </Label>
                <Input
                  id={`ref-${group.payment_id}`}
                  value={reference}
                  inputMode="text"
                  autoComplete="off"
                  spellCheck={false}
                  maxLength={100}
                  placeholder="e.g. 1234567890123"
                  aria-invalid={touched && referenceError !== null}
                  aria-describedby={`ref-help-${group.payment_id}`}
                  onChange={(e) => setReference(e.target.value)}
                  onBlur={() => setTouched(true)}
                  className={touched && referenceError ? "border-destructive" : undefined}
                />
                <p
                  id={`ref-help-${group.payment_id}`}
                  className={`text-xs ${touched && referenceError ? "text-destructive" : "text-muted-foreground"}`}
                >
                  {touched && referenceError
                    ? referenceError
                    : "Find this on your GCash receipt or confirmation message. The seller uses it to match your transfer."}
                </p>
                <Button
                  className="w-full"
                  disabled={!canSubmit || !group.gcash_number}
                  onClick={handleMarkSent}
                >
                  {busy ? "Notifying..." : "I've sent the payment"}
                </Button>
                <p className="text-xs text-muted-foreground">
                  This does not confirm payment - the seller still has to find that
                  reference in their GCash and confirm it.
                </p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Waiting for {group.seller_name} to check their GCash.
                {group.conversation_id && (
                  <Link
                    to={`/account/messages?conversation=${group.conversation_id}`}
                    className="ml-1 font-semibold text-primary underline"
                  >
                    <MessageSquare className="inline h-3 w-3" /> Open chat
                  </Link>
                )}
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface Props {
  orderId: number;
  /** Shown when the order has several sellers. */
  sellerCount?: number;
  /**
   * Fired whenever a group changes state (e.g. the buyer submitted a
   * reference). Callers that also list orders need this, because the order only
   * becomes a real order once its payment leaves 'pending'.
   */
  onChanged?: () => void;
}

export default function GcashPaymentPanel({ orderId, sellerCount, onChanged }: Props) {
  const [snapshot, setSnapshot] = useState<PaymentSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      setSnapshot(await fetchOrderPayments(orderId));
    } catch (err) {
      setError(getErrorMessage(err, "Could not load your payment details"));
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  // Derived before the effects so hook order does not depend on the early
  // returns below.
  const groups = snapshot?.payment_groups ?? [];

  useEffect(() => { void load(); }, [load]);

  // Poll while a seller could still change the state on their own. Stops once
  // every group has reached a settled status so an idle success page costs
  // nothing.
  const settled =
    groups.length > 0 &&
    groups.every((g) => ["completed", "rejected", "refunded"].includes(g.status));

  useEffect(() => {
    if (loading || error || settled) return;
    const id = setInterval(() => void load(), 5000);
    return () => clearInterval(id);
  }, [loading, error, settled, load]);

  if (loading) {
    return (
      <Card>
        <CardContent className="p-5 text-sm text-muted-foreground">
          Loading your GCash payment details...
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-destructive/40">
        <CardContent className="p-5">
          <p className="text-sm text-destructive">{error}</p>
          <Button variant="outline" size="sm" className="mt-3" onClick={() => void load()}>
            Try again
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (groups.length === 0) return null;

  const allConfirmed = groups.every((g) => g.status === "completed");
  const anyRejected = groups.some((g) => g.status === "rejected");
  const total = groups.reduce((n, g) => n + g.amount, 0);

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="space-y-2 p-5">
          <h2 className="flex items-center gap-2 font-display text-lg font-bold text-foreground">
            <Wallet className="h-5 w-5 text-primary" />
            Pay with GCash
          </h2>
          {sellerCount && sellerCount > 1 && (
            <p className="text-sm text-muted-foreground">
              This order contains items from {sellerCount} sellers, so send a separate
              transfer to each one. Your order is only confirmed once every seller has
              received their part.
            </p>
          )}
          <p className="text-sm text-muted-foreground">
            Total to transfer:{" "}
            <span className="font-semibold text-foreground">{formatPrice(total)}</span>
          </p>
          {allConfirmed && (
            <p className="flex items-center gap-2 rounded-md border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm font-medium text-emerald-900 dark:text-emerald-200">
              <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
              Every seller has confirmed your payment. Your order is being prepared.
            </p>
          )}
          {!allConfirmed && anyRejected && (
            <p className="flex items-start gap-2 rounded-md border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-900 dark:text-red-200">
              <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <span>
                A seller could not verify their part. Open the chat on that card below to
                resolve it.
              </span>
            </p>
          )}
        </CardContent>
      </Card>

      {groups.map((group) => (
        <GroupCard
          key={group.payment_id}
          group={group}
          onMarked={() => {
            void load();
            onChanged?.();
          }}
        />
      ))}
    </div>
  );
}