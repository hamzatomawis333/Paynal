import { SellerLayout } from "@/components/seller/SellerLayout";
import { getErrorMessage } from "@/lib/errors";
import { useSellerOrders, useUpdateOrderStatus } from "@/hooks/useSeller";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { StatusBadge } from "@/components/StatusBadge";
import { formatPrice, formatDate } from "@/lib/format";
import { ShoppingCart } from "lucide-react";
import { toast } from "sonner";
import SellerPaymentCard from "@/components/seller/SellerPaymentCard";

// 'confirmed' is set automatically once every seller verifies their payment,
// so it is not offered as a manual choice here.
const statusOptions = ["pending", "processing", "shipped", "delivered", "cancelled"];

/** Fulfilled orders stay read-only: the buyer cannot undo a delivery. */
const LOCKED_STATUSES = ["delivered", "cancelled"];

/**
 * The seller may only advance fulfilment once their own GCash share is
 * confirmed. This mirrors the server's 409 so the UI explains the block instead
 * of failing after the fact.
 */
function isBlockedByPayment(order: { payment?: { status: string } | null }) {
  return order.payment != null && order.payment.status !== "completed";
}

export default function SellerOrders() {
  const { data: orders, isLoading, isError, refetch } = useSellerOrders();
  const updateStatus = useUpdateOrderStatus();

  const handleStatusChange = async (orderId: number, status: string) => {
    try {
      await updateStatus.mutateAsync({ orderId, status });
      toast.success(`Order #${orderId} marked as ${status}`);
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to update this order"));
    }
  };

  return (
    <SellerLayout>
      <div className="space-y-6">
        <PageHeader title="Orders" subtitle="View and manage customer orders" />

        <Card className="shadow-soft">
          <CardContent className="p-0">
            {isLoading ? (
              <Skeleton className="m-6 h-48 w-auto" aria-hidden="true" />
            ) : isError ? (
              <ErrorState className="py-12" onRetry={() => void refetch()} />
            ) : !orders?.length ? (
              <EmptyState
                icon={ShoppingCart}
                title="No orders yet"
                description="When buyers purchase your products, their orders will appear here."
              />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order #</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead className="hidden md:table-cell">Date</TableHead>
                    <TableHead>Your Total</TableHead>
                    <TableHead>GCash Verification</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="hidden sm:table-cell">Items</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map((order) => {
                    const locked = LOCKED_STATUSES.includes(order.status);
                    const blocked = isBlockedByPayment(order);
                    return (
                      <TableRow key={order.id} className="align-top">
                        <TableCell className="font-medium">
                          #{order.id}
                          <p className="text-xs font-normal text-muted-foreground">
                            {order.order_number}
                          </p>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="text-sm font-medium text-foreground">{order.customer_name}</p>
                            <p className="hidden text-xs text-muted-foreground md:block">{order.customer_email}</p>
                          </div>
                        </TableCell>
                        <TableCell className="hidden text-sm text-muted-foreground md:table-cell">
                          {formatDate(order.created_at)}
                        </TableCell>
                        <TableCell>
                          <p className="font-semibold tabular-nums">
                            {formatPrice(parseFloat(String(order.seller_subtotal ?? order.total_amount)))}
                          </p>
                          {order.payment && (
                            <p className="text-xs text-muted-foreground">your share only</p>
                          )}
                        </TableCell>
                        <TableCell>
                          {order.payment ? (
                            <SellerPaymentCard
                              payment={order.payment}
                              orderId={order.id}
                              onChanged={refetch}
                            />
                          ) : (
                            <p className="text-xs text-muted-foreground">No payment record</p>
                          )}
                        </TableCell>
                        <TableCell>
                          {locked ? (
                            <StatusBadge status={order.status} kind="order" />
                          ) : (
                            <Select
                              value={order.status}
                              onValueChange={(v) => handleStatusChange(order.id, v)}
                            >
                              <SelectTrigger
                                className="h-8 w-[130px] text-xs"
                                aria-label={`Status for order ${order.order_number || `#${order.id}`}`}
                              >
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {statusOptions.map((s) => (
                                  <SelectItem key={s} value={s}>
                                    <span className="capitalize">{s}</span>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                          {blocked && (
                            <p className="mt-1 text-xs text-amber-700 dark:text-amber-400">
                              Confirm payment first
                            </p>
                          )}
                        </TableCell>
                        <TableCell className="hidden tabular-nums sm:table-cell">
                          {order.items?.length || 0} items
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </SellerLayout>
  );
}
