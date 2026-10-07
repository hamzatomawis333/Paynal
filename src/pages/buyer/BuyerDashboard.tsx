import { BuyerLayout } from "@/components/buyer/BuyerLayout";
import { useBuyerOrders, useWishlist } from "@/hooks/useBuyer";
import { isOrderAwaitingPayment, isRealOrder } from "@/lib/buyer-api";
import { useAuth } from "@/context/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { StatusBadge } from "@/components/StatusBadge";
import { formatPrice, formatDate } from "@/lib/format";
import { ShoppingBag, Heart, Package, Clock, TriangleAlert, Inbox } from "lucide-react";
import { Link } from "react-router-dom";

export default function BuyerDashboard() {
  const { user } = useAuth();
  const { data: orders, isLoading: ordersLoading } = useBuyerOrders();
  const { data: wishlist, isLoading: wishlistLoading } = useWishlist();

  const isLoading = ordersLoading || wishlistLoading;
  const firstName = user?.full_name?.trim().split(/\s+/)[0] || "there";

  // An order only counts once the buyer has claimed the payment. Anything still
  // unpaid is a checkout they walked away from, not a purchase, so it is kept out
  // of every count and out of the recent list.
  const realOrders = orders?.filter(isRealOrder) ?? [];
  const awaitingPayment = orders?.filter(isOrderAwaitingPayment) ?? [];

  const activeOrders = realOrders.filter(
    (o) => o.status !== "delivered" && o.status !== "cancelled",
  );
  const totalSpent = realOrders.reduce(
    (sum, o) => sum + parseFloat(o.total_amount) + parseFloat(o.shipping_fee || "0"),
    0,
  );

  const stats = [
    { label: "Active Orders", value: activeOrders.length, icon: ShoppingBag, color: "text-primary", bg: "bg-primary/10" },
    { label: "Total Orders", value: realOrders.length, icon: Package, color: "text-foreground", bg: "bg-muted" },
    { label: "Wishlist Items", value: wishlist?.length ?? 0, icon: Heart, color: "text-accent", bg: "bg-accent/10" },
    { label: "Total Spent", value: formatPrice(totalSpent), icon: Clock, color: "text-teal-600 dark:text-teal-400", bg: "bg-teal-500/10" },
  ];

  return (
    <BuyerLayout>
      <div className="space-y-6">
        <PageHeader
          title={`Welcome back, ${firstName}`}
          subtitle="Here's an overview of your orders and wishlist."
        />

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {stats.map((stat) => (
            <Card key={stat.label} className="shadow-soft">
              <CardContent className="flex items-center gap-4 p-6">
                {isLoading ? (
                  <Skeleton className="h-16 w-full" aria-hidden="true" />
                ) : (
                  <>
                    <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${stat.bg}`}>
                      <stat.icon className={`h-6 w-6 ${stat.color}`} aria-hidden="true" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">{stat.label}</p>
                      <p className="text-2xl font-bold tabular-nums text-foreground">{stat.value}</p>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Unpaid checkouts: surfaced so they can be finished, but not counted
            anywhere above. */}
        {awaitingPayment.length > 0 && (
          <Card className="border-amber-500/40 bg-amber-500/10 shadow-soft">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-display text-base text-amber-900 dark:text-amber-200">
                <TriangleAlert className="h-4 w-4" aria-hidden="true" />
                {awaitingPayment.length} payment{awaitingPayment.length > 1 ? "s" : ""} not sent yet
              </CardTitle>
              <p className="text-sm text-amber-900/80 dark:text-amber-200/80">
                These orders are not counted until you send your GCash reference.
              </p>
            </CardHeader>
            <CardContent>
              <Button asChild size="sm" variant="gold">
                <Link to="/account/orders">Finish your payment</Link>
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Recent Orders */}
        <Card className="shadow-soft">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2 font-display text-lg">
              <Clock className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
              Recent Orders
            </CardTitle>
            <Link
              to="/account/orders"
              className="text-sm text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
            >
              View All
            </Link>
          </CardHeader>
          <CardContent>
            {ordersLoading ? (
              <div className="space-y-3" role="status" aria-label="Loading recent orders">
                {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full" aria-hidden="true" />)}
              </div>
            ) : !realOrders.length ? (
              <EmptyState
                dense
                icon={Inbox}
                title="No orders yet"
                description="Your confirmed orders will show up here after checkout."
                action={
                  <Button asChild size="sm" variant="gold">
                    <Link to="/products">Start shopping</Link>
                  </Button>
                }
              />
            ) : (
              <div className="space-y-3">
                {realOrders.slice(0, 5).map((order) => (
                  <div
                    key={order.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border p-3"
                  >
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {order.order_number || `Order #${order.id}`}
                      </p>
                      <p className="text-xs text-muted-foreground">{formatDate(order.created_at)}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-semibold tabular-nums text-foreground">
                        {formatPrice(parseFloat(order.total_amount))}
                      </span>
                      <StatusBadge
                        status={
                          order.cancel_requested && order.status !== "cancelled"
                            ? "cancel_requested"
                            : order.status
                        }
                        kind="order"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </BuyerLayout>
  );
}
