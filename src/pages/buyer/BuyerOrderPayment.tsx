import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft, CheckCircle2, Clock, MessageSquare, ShieldCheck, TriangleAlert, Wallet,
} from "lucide-react";
import { toast } from "sonner";
import { BuyerLayout } from "@/components/buyer/BuyerLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import CopyButton from "@/components/checkout/CopyButton";
import GcashReferenceInput from "@/components/checkout/GcashReferenceInput";
import SendPaymentDialog from "@/components/checkout/SendPaymentDialog";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { StatusBadge } from "@/components/StatusBadge";
import { formatPrice, formatDateTime } from "@/lib/format";
import { getErrorMessage } from "@/lib/errors";
import {
  fetchOrderPayments, markPaymentSent, formatGcashNumber, formatGcashReference,
  normaliseGcashReference, validateGcashReference,
  type PaymentGroup, type PaymentSnapshot, type PaymentStatus,
} from "@/lib/payments-api";

/** How often to re-read the payments while anything is still moving. */
const POLL_MS = 5000;

/**
 * Terminal: no party can act on these any more. `rejected` is NOT here,
 * because a rejected payment is recoverable - the buyer can resend a corrected
 * reference and the seller can confirm money that arrived late.
 */
const isSettled = (status: PaymentStatus) =>
  status === "completed" || status === "refunded";

/**
 * One seller to pay. Each is an independent transfer, so this is a numbered
 * checklist rather than a single form.
 */
function SellerStep({
  group,
  index,
  canSubmit,
  onChanged,
}: {
  group: PaymentGroup;
  index: number;
  canSubmit: boolean;
  onChanged: () => void;
}) {
  const [reference, setReference] = useState("");
  const [touched, setTouched] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const queryClient = useQueryClient();

  const error = validateGcashReference(reference);

  const submit = async () => {
    setBusy(true);
    try {
      const res = await markPaymentSent(group.payment_id, normaliseGcashReference(reference));
      toast.success(
        res.resubmitted
          ? `${group.seller_name} has your new reference and will check again`
          : `${group.seller_name} has been notified - they will check for that reference`,
      );
      // Keep the Order History / Payments pages current with this submission.
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["buyer-orders"] }),
        queryClient.invalidateQueries({ queryKey: ["buyer-payments"] }),
      ]);
      setReference("");
      setTouched(false);
      setConfirmOpen(false);
      onChanged();
    } catch (err) {
      toast.error(getErrorMessage(err, "Could not send this reference"));
    } finally {
      setBusy(false);
    }
  };

  const openConfirm = () => {
    setTouched(true);
    if (error) return;
    setConfirmOpen(true);
  };

  const chatLink = group.conversation_id ? (
    <Link
      to={`/account/messages?conversation=${group.conversation_id}`}
      className="inline-flex items-center gap-1 font-semibold text-primary underline"
    >
      <MessageSquare className="h-3 w-3" /> Open chat
    </Link>
  ) : null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <span
              className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                group.status === "completed"
                  ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
                  : group.status === "pending"
                    ? "bg-primary/10 text-primary"
                    : "bg-muted text-muted-foreground"
              }`}
              aria-hidden="true"
            >
              {group.status === "completed" ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                index
              )}
            </span>
            <div>
              <CardTitle className="text-base">{group.seller_name}</CardTitle>
              <p className="text-xs text-muted-foreground">
                {group.items.reduce((n, i) => n + i.quantity, 0)} item(s) from this seller
              </p>
            </div>
          </div>
          <StatusBadge status={group.status} kind="payment" audience="buyer" />
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <ul className="space-y-1 border-l-2 border-border pl-3">
          {group.items.map((item, i) => (
            <li key={i} className="flex justify-between gap-3 text-sm text-muted-foreground">
              <span>{item.quantity} x {item.name}</span>
              <span className="shrink-0 tabular-nums">{formatPrice(item.subtotal)}</span>
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
          <div className="flex justify-between text-base font-semibold">
            <dt>Send to this seller</dt>
            <dd className="tabular-nums">{formatPrice(group.amount)}</dd>
          </div>
        </dl>

        {/* The GCash number to transfer to. Shown for every unpaid state, including
            rejected: a rejected payment is recoverable, and the buyer still
            needs the number to send the remaining balance. */}
        {(group.status === "pending" || group.status === "awaiting_confirmation" || group.status === "rejected") && (
          <div className="space-y-3 rounded-md bg-muted/50 p-4">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Send exactly this amount to</p>
                <p className="truncate font-mono text-lg font-bold tracking-wide text-foreground">
                  {group.gcash_number ? formatGcashNumber(group.gcash_number) : "Not available"}
                </p>
              </div>
              {group.gcash_number && <CopyButton value={group.gcash_number} label="Copy GCash number" />}
            </div>

            {group.status === "awaiting_confirmation" ? (
              <div className="rounded-md border border-border bg-background px-3 py-2">
                <p className="text-xs text-muted-foreground">Reference submitted</p>
                <p className="font-mono text-sm font-bold tracking-wide text-foreground">
                  {formatGcashReference(group.transaction_reference ?? "")}
                </p>
              </div>
            ) : (
              <>
                <div className="rounded-md border border-dashed border-border bg-background px-3 py-2">
                  <p className="text-xs text-muted-foreground">
                    {group.status === "rejected" ? "New reference to enter" : "Reference you will enter"}
                  </p>
                  <p className="font-mono text-sm font-semibold text-foreground">
                    {group.status === "rejected" ? "Replaces the rejected one" : "Not submitted yet"}
                  </p>
                </div>

                <GcashReferenceInput
                  id={`ref-${group.payment_id}`}
                  value={reference}
                  onChange={setReference}
                  touched={touched}
                  onBlur={() => setTouched(true)}
                  disabled={busy}
                />

                {/* Disabled on an invalid value, not merely after a failed
                    submit, so an empty field never offers a dead-end click. */}
                <Button
                  className="w-full"
                  disabled={error !== null || busy || !canSubmit || !group.gcash_number}
                  onClick={openConfirm}
                >
                  {group.status === "rejected" ? "I've sent this again" : "I've sent this"}
                </Button>
              </>
            )}
          </div>
        )}

        {group.status === "pending" && !group.gcash_number && (
          <p className="rounded-md border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-900 dark:text-red-200">
            This seller has no GCash number on file, so you cannot pay them
            online. Please contact them to arrange another way.
          </p>
        )}

        {group.status === "awaiting_confirmation" && (
          <p className="flex flex-wrap items-center gap-1 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            Waiting for {group.seller_name} to check their GCash. {chatLink}
          </p>
        )}

        {group.status === "completed" && (
          <div className="space-y-2 rounded-md border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-900 dark:text-emerald-200">
            <p className="flex items-start gap-2 font-medium">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                {group.seller_name} confirmed receipt
                {group.paid_at && ` on ${formatDateTime(group.paid_at)}`}.
              </span>
            </p>
            {group.transaction_reference && (
              <p className="text-xs">
                Reference{" "}
                <span className="font-mono font-semibold">
                  {formatGcashReference(group.transaction_reference)}
                </span>
              </p>
            )}
          </div>
        )}

        {group.status === "rejected" && (
          <div className="space-y-3 rounded-md border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-900 dark:text-red-200">
            <p className="flex items-start gap-2">
              <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                {group.rejection_reason || "The seller could not verify this payment."}{" "}
                {group.transaction_reference
                  ? `They were given the reference ${formatGcashReference(group.transaction_reference)}.`
                  : null}
              </span>
            </p>
            {group.conversation_id ? (
              <div className="flex flex-wrap items-center gap-2">
                <Button asChild size="sm" variant="outline">
                  <Link to={`/account/messages?conversation=${group.conversation_id}`}>
                    <MessageSquare className="h-4 w-4" />
                    Message {group.seller_name}
                  </Link>
                </Button>
                <span className="text-xs text-red-900/70 dark:text-red-200/70">
                  Already sent the right amount? Enter the same reference above,
                  or tell {group.seller_name} when you sent it.
                </span>
              </div>
            ) : (
              <p className="text-xs text-red-900/70 dark:text-red-200/70">
                No chat is available for this seller. Please contact them another
                way.
              </p>
            )}
          </div>
        )}

        <SendPaymentDialog
          group={group}
          reference={reference}
          open={confirmOpen}
          busy={busy}
          resubmit={group.status === "rejected"}
          onCancel={() => setConfirmOpen(false)}
          onConfirm={() => void submit()}
        />
      </CardContent>
    </Card>
  );
}

export default function BuyerOrderPayment() {
  const { id } = useParams();
  const orderId = Number(id);
  const navigate = useNavigate();

  const [snapshot, setSnapshot] = useState<PaymentSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      setSnapshot(await fetchOrderPayments(orderId));
    } catch (err) {
      setError(getErrorMessage(err, "Could not load this order's payment details"));
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    if (!Number.isFinite(orderId) || orderId <= 0) {
      setError("That order link is not valid");
      setLoading(false);
      return;
    }
    void load();
  }, [load, orderId]);

  const groups = useMemo(() => snapshot?.payment_groups ?? [], [snapshot]);

  const submittedCount = groups.filter(
    (g) => g.status === "awaiting_confirmation" || g.status === "completed",
  ).length;
  const allSettled = groups.length > 0 && groups.every((g) => isSettled(g.status));
  const awaitingSeller = groups.some((g) => g.status === "awaiting_confirmation");

  // Keep polling while anything can still change on its own: a pending group the
  // buyer has yet to act on, one the seller has yet to verify, or a rejected one
// they can still rescue. Stops once every seller has confirmed or refunded, so
// a genuinely finished page costs nothing.
  //
  // A rejected group deliberately keeps polling. Before recovery existed it was
  // terminal, but now the buyer can resend and the seller can confirm late, so
  // treating it as settled would let this page go stale on exactly the screen
  // where the buyer is waiting for the seller's reply.
  const canStillMove = groups.some(
    (g) =>
      g.status === "pending" ||
      g.status === "awaiting_confirmation" ||
      g.status === "rejected",
  );
  useEffect(() => {
    if (loading || error || !canStillMove) return;
    timer.current = setInterval(() => void load(), POLL_MS);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [loading, error, canStillMove, load]);

  const total = groups.reduce((n, g) => n + g.amount, 0);
  const rejectedGroups = groups.filter((g) => g.status === "rejected");
  const allConfirmed = groups.length > 0 && groups.every((g) => g.status === "completed");

  return (
    <BuyerLayout>
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="space-y-2">
          <Button
            variant="ghost"
            size="sm"
            className="-ml-2"
            onClick={() => navigate("/account/orders")}
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back to My Orders
          </Button>
          <PageHeader
            title={
              snapshot?.order.order_number
                ? `Pay for ${snapshot.order.order_number}`
                : "Complete your payment"
            }
            subtitle="Send a separate GCash transfer to each seller, then enter the reference from your receipt."
          />
        </div>

        {loading ? (
          <div className="space-y-4" role="status" aria-label="Loading payment details">
            <Skeleton className="h-32 w-full" aria-hidden="true" />
            <Skeleton className="h-56 w-full" aria-hidden="true" />
          </div>
        ) : error ? (
          <ErrorState
            title="We couldn't load this payment"
            description={error}
            onRetry={() => void load()}
          />
        ) : groups.length === 0 ? (
          <EmptyState
            icon={Wallet}
            title="No pending payments"
            description="This order has no payments left to make."
            action={
              <Button asChild variant="outline" size="sm">
                <Link to="/account/orders">Back to My Orders</Link>
              </Button>
            }
          />
        ) : (
          <>
            <Card>
              <CardContent className="space-y-4 p-5">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Wallet className="h-4 w-4" />
                    Total to transfer
                  </span>
                  <span className="font-display text-2xl font-bold text-foreground">
                    {formatPrice(total)}
                  </span>
                </div>

                {groups.length > 1 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{submittedCount} of {groups.length} sellers notified</span>
                      <span>{Math.round((submittedCount / groups.length) * 100)}%</span>
                    </div>
                    <Progress value={(submittedCount / groups.length) * 100} />
                  </div>
                )}

                {allConfirmed && (
                  <p className="flex items-center gap-2 rounded-md border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm font-medium text-emerald-900 dark:text-emerald-200">
                    <CheckCircle2 className="h-4 w-4" />
                    Every seller has confirmed your payment. Your order is being
                    prepared.
                  </p>
                )}

                {!allConfirmed && awaitingSeller && (
                  <p className="flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-900 dark:text-amber-200">
                    <Clock className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>
                      Verifying your payment - please wait. Sellers check their
                      GCash manually, so this can take a little while. This page
                      updates on its own.
                    </span>
                  </p>
                )}

                {!allConfirmed && rejectedGroups.length > 0 && (
                  <div className="space-y-3 rounded-md border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-900 dark:text-red-200">
                    <p className="flex items-start gap-2 font-medium">
                      <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
                      <span>
                        {rejectedGroups.length === 1
                          ? `${rejectedGroups[0].seller_name} could not verify their payment.`
                          : `${rejectedGroups.length} sellers could not verify their payment.`}
                      </span>
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {rejectedGroups.map((group) => (
                        <Button
                          key={group.payment_id}
                          asChild
                          size="sm"
                          variant="outline"
                          disabled={!group.conversation_id}
                        >
                          {group.conversation_id ? (
                            <Link to={`/account/messages?conversation=${group.conversation_id}`}>
                              <MessageSquare className="h-4 w-4" />
                              Message {group.seller_name}
                            </Link>
                          ) : (
                            <span>{group.seller_name}</span>
                          )}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="space-y-4">
              {groups.map((group, i) => (
                <SellerStep
                  key={group.payment_id}
                  group={group}
                  index={i + 1}
                  canSubmit
                  onChanged={() => void load()}
                />
              ))}
            </div>

            <div className="flex justify-end">
              <Button asChild variant="outline">
                <Link to="/account/orders">Back to My Orders</Link>
              </Button>
            </div>
          </>
        )}
      </div>
    </BuyerLayout>
  );
}