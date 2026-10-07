import { resolveApiImageUrl } from "@/lib/api";
import { BuyerLayout } from "@/components/buyer/BuyerLayout";
import { useBuyerOrders } from "@/hooks/useBuyer";
import { isRealOrder } from "@/lib/buyer-api";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { StatusBadge } from "@/components/StatusBadge";
import { formatPrice, formatDate } from "@/lib/format";
import { History } from "lucide-react";
import { Link } from "react-router-dom";

export default function BuyerHistory() {
  const { data: orders, isLoading } = useBuyerOrders();

  // Show only completed or cancelled orders the buyer actually paid for.
  const pastOrders =
    orders?.filter(
      (o) => isRealOrder(o) && (o.status === "delivered" || o.status === "cancelled"),
    ) ?? [];

  return (
    <BuyerLayout>
      <div className="space-y-6">
        <PageHeader
          title="Order History"
          subtitle="Your past purchases and completed orders"
        />

        {isLoading ? (
          <div className="space-y-4" role="status" aria-label="Loading order history">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 w-full" aria-hidden="true" />)}
          </div>
        ) : !pastOrders.length ? (
          <Card className="shadow-soft">
            <CardContent>
              <EmptyState
                dense
                icon={History}
                title="No completed orders yet"
                description="Delivered and cancelled orders will be archived here."
                action={
                  <Button asChild size="sm" variant="outline">
                    <Link to="/products">Browse products</Link>
                  </Button>
                }
              />
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {pastOrders.map((order) => (
              <Card key={order.id} className="shadow-soft">
                <CardContent className="p-4">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-medium text-foreground">
                        {order.order_number || `Order #${order.id}`}
                      </p>
                      <p className="text-xs text-muted-foreground">{formatDate(order.created_at, true)}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-semibold tabular-nums text-foreground">
                        {formatPrice(parseFloat(order.total_amount))}
                      </span>
                      <StatusBadge status={order.status} kind="order" />
                    </div>
                  </div>
                  {order.items?.length > 0 && (
                    <div className="flex gap-2 overflow-x-auto pb-2">
                      {order.items.map((item) => (
                        <img
                          key={item.id}
                          src={resolveApiImageUrl(item.image_url)}
                          alt={item.name}
                          title={`${item.name} (x${item.quantity})`}
                          className="h-14 w-14 flex-shrink-0 rounded-md border border-border object-cover"
                        />
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </BuyerLayout>
  );
}
