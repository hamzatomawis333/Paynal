import { resolveApiImageUrl } from "@/lib/api";
import { useState } from "react";
import { Link } from "react-router-dom";
import { BuyerLayout } from "@/components/buyer/BuyerLayout";
import { useBuyerOrders, useCancelBuyerOrder } from "@/hooks/useBuyer";
import { isOrderAwaitingPayment, isRealOrder } from "@/lib/buyer-api";
import { getErrorMessage } from "@/lib/errors";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { StatusBadge } from "@/components/StatusBadge";
import { formatPrice, formatDate } from "@/lib/format";
import { toast } from "sonner";
import { ShoppingBag, ChevronDown, ChevronUp, TriangleAlert, XCircle, Clock } from "lucide-react";

// Orders whose GCash reference is in but the seller has not verified it yet,
// or that need the buyer to fix something. Rendered via StatusBadge so the
// vocabulary matches the payment page.
const needsAttention = new Set(["awaiting_confirmation", "rejected"]);

const statusFilter = ["all", "pending", "confirmed", "processing", "shipped", "delivered", "cancelled"];

// The buyer may ASK to cancel any time before the order is on a truck; a
// seller then confirms it. Shipped and delivered are final; cancelled needs no
// button.
const cancelableStatuses = new Set(["pending", "confirmed", "processing"]);

const paymentMethodLabel = (code: string) =>
  code === "cod" ? "Cash on Delivery" : code === "gcash" ? "GCash" : code;

export default function BuyerOrders() {
  const { data: orders, isLoading } = useBuyerOrders();
  const cancelOrder = useCancelBuyerOrder();
  const [filter, setFilter] = useState("all");
  const [expandedId, setExpandedId] = useState<number | null>(null);

  function handleCancel(orderId: number, orderNumber: string) {
    if (
      !window.confirm(
        `Request cancellation of order ${orderNumber || `#${orderId}`}? The seller has to confirm it before the order is actually cancelled.`
      )
    ) {
      return;
    }
    cancelOrder.mutate(orderId, {
      onSuccess: (res) => {
        if (res.already) {
          toast.success(
            res.cancel_requested
              ? "You have already requested a cancellation for this order"
              : "This order is already cancelled"
          );
        } else {
          toast.success("Cancellation requested - waiting for the seller to confirm");
        }
      },
      onError: (err) => toast.error(getErrorMessage(err, "Could not request cancellation")),
    });
  }

  // Split first, then filter. An order the buyer never paid for is not an order
  // in their book yet, so it must not appear under "My Orders" or any status tab
  // - EXCEPT once a cancellation starts (requested or confirmed), which moves it
  // into the real list so it is labelled instead of invited-to-be-paid.
  const realOrders = orders?.filter(isRealOrder) ?? [];
  const unpaidOrders = orders?.filter(isOrderAwaitingPayment) ?? [];

  const filtered = filter === "all" ? realOrders : realOrders.filter((o) => o.status === filter);

  return (
    <BuyerLayout>
      <div className="space-y-6">
        <PageHeader title="My Orders" subtitle="Track and manage your orders" />

        {/* Orders the buyer placed but never paid for. Not counted as orders,
            but kept reachable so the payment can still be finished. */}
        {unpaidOrders.length > 0 && (
          <Card className="border-amber-500/40 bg-amber-500/10 shadow-soft">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-display text-base text-amber-900 dark:text-amber-200">
                <TriangleAlert className="h-4 w-4" aria-hidden="true" />
                Waiting for your GCash payment
              </CardTitle>
              <p className="text-sm text-amber-900/80 dark:text-amber-200/80">
                Send your GCash reference to confirm these. They only become real
                orders once you do.
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              {unpaidOrders.map((order) => (
                <div
                  key={order.id}
                  className="rounded-lg border border-amber-500/30 bg-background p-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {order.order_number || `Order #${order.id}`}
                      </p>
                      <p className="text-xs text-muted-foreground">{formatDate(order.created_at)}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-semibold tabular-nums text-foreground">
                        {formatPrice(parseFloat(order.total_amount) + parseFloat(order.shipping_fee || "0"))}
                      </span>
                      <Button asChild size="sm" variant="gold">
                        <Link to={`/account/orders/${order.id}/pay`}>Pay now</Link>
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Filters */}
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filter orders by status">
          {statusFilter.map((s) => (
            <Button
              key={s}
              variant={filter === s ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter(s)}
              className="capitalize"
              aria-pressed={filter === s}
            >
              {s}
            </Button>
          ))}
        </div>

        {isLoading ? (
          <div className="space-y-4" role="status" aria-label="Loading orders">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 w-full" aria-hidden="true" />)}
          </div>
        ) : !filtered.length ? (
          <Card className="shadow-soft">
            <CardContent>
              <EmptyState
                dense
                icon={ShoppingBag}
                title={
                  realOrders.length === 0 && unpaidOrders.length > 0
                    ? "No confirmed orders yet"
                    : filter === "all"
                      ? "No orders found"
                      : `No ${filter} orders`
                }
                description={
                  realOrders.length === 0 && unpaidOrders.length > 0
                    ? "Finish your GCash payment above and the order will appear here."
                    : filter === "all"
                      ? "Orders you place will show up here."
                      : "Try another status filter to see more orders."
                }
                action={
                  filter !== "all" && (
                    <Button variant="outline" size="sm" onClick={() => setFilter("all")}>
                      Show all orders
                    </Button>
                  )
                }
              />
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filtered.map((order) => (
              <Card key={order.id} className="shadow-soft">
                <CardHeader
                  className="cursor-pointer rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  role="button"
                  tabIndex={0}
                  aria-expanded={expandedId === order.id}
                  aria-label={`${order.order_number || `Order #${order.id}`}, ${order.status}`}
                  onClick={() => setExpandedId(expandedId === order.id ? null : order.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setExpandedId(expandedId === order.id ? null : order.id);
                    }
                  }}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <CardTitle className="text-base font-medium">
                        {order.order_number || `Order #${order.id}`}
                      </CardTitle>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {formatDate(order.created_at, true)}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                      <span className="text-sm font-semibold tabular-nums text-foreground">
                        {formatPrice(parseFloat(order.total_amount))}
                      </span>
                      {needsAttention.has(order.payment_status) && (
                        <StatusBadge status={order.payment_status} kind="payment" audience="buyer" />
                      )}
                      {/* Once a cancellation is in flight the live status is
                          not the story - the badge tells it. */}
                      <StatusBadge
                        status={
                          order.cancel_requested && order.status !== "cancelled"
                            ? "cancel_requested"
                            : order.status
                        }
                        kind="order"
                      />
                      {expandedId === order.id ? (
                        <ChevronUp className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                      )}
                    </div>
                  </div>
                </CardHeader>
                {expandedId === order.id && (
                  <CardContent className="border-t border-border pt-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <p className="mb-1 text-xs font-medium text-muted-foreground">Shipping Address</p>
                        <p className="text-sm text-foreground">{order.shipping_address || "N/A"}</p>
                      </div>
                      <div>
                        <p className="mb-1 text-xs font-medium text-muted-foreground">Payment Method</p>
                        <p className="text-sm text-foreground">{paymentMethodLabel(order.payment_method)}</p>
                      </div>
                    </div>
                    {order.items?.length > 0 && (
                      <div className="mt-4 space-y-2">
                        <p className="text-xs font-medium text-muted-foreground">Items</p>
                        {order.items.map((item) => (
                          <div key={item.id} className="flex items-center gap-3 rounded-lg border border-border p-2">
                            <img
                              src={resolveApiImageUrl(item.image_url)}
                              alt=""
                              className="h-12 w-12 rounded-md object-cover"
                            />
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium text-foreground">{item.name}</p>
                              <p className="text-xs text-muted-foreground">
                                Qty: {item.quantity} × {formatPrice(parseFloat(item.unit_price))}
                              </p>
                            </div>
                            <span className="text-sm font-semibold tabular-nums text-foreground">
                              {formatPrice(parseFloat(item.subtotal))}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="mt-4 flex justify-end border-t border-border pt-3">
                      <div className="text-right text-sm">
                        <p className="text-muted-foreground">
                          Shipping: {formatPrice(parseFloat(order.shipping_fee || "0"))}
                        </p>
                        <p className="text-base font-bold tabular-nums text-foreground">
                          Total: {formatPrice(parseFloat(order.total_amount) + parseFloat(order.shipping_fee || "0"))}
                        </p>
                      </div>
                    </div>
                    {/* Payment detail lives on its own page so there is a single
                        place that knows how to submit a reference. A COD order
                        has nothing to submit. Cancellation is two-step: the
                        buyer can only ask; once asked, the button parks until
                        a seller confirms. */}
                    <div className="mt-4 flex flex-wrap items-center justify-end gap-2 border-t border-border pt-4">
                      {order.payment_method !== "cod" && (
                        <Button asChild size="sm" variant="outline">
                          <Link to={`/account/orders/${order.id}/pay`}>
                            View payment details
                          </Link>
                        </Button>
                      )}
                      {cancelableStatuses.has(order.status) &&
                        (order.cancel_requested === 1 || order.cancel_requested === true ? (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled
                            aria-label={`Cancellation requested for order ${order.order_number || `#${order.id}`}`}
                          >
                            <Clock className="mr-1.5 h-4 w-4" aria-hidden="true" />
                            Cancellation requested
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                            disabled={cancelOrder.isPending}
                            onClick={() => handleCancel(order.id, order.order_number)}
                            aria-label={`Request cancellation of order ${order.order_number || `#${order.id}`}`}
                          >
                            <XCircle className="mr-1.5 h-4 w-4" aria-hidden="true" />
                            {cancelOrder.isPending && cancelOrder.variables === order.id
                              ? "Requesting..."
                              : "Request cancellation"}
                          </Button>
                        ))}
                    </div>
                  </CardContent>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>
    </BuyerLayout>
  );
}
