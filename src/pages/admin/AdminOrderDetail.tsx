import { Helmet } from "react-helmet-async";
import { Link, useParams } from "react-router-dom";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { useAdminOrderDetail } from "@/hooks/useAdmin";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/PageHeader";
import { ErrorState } from "@/components/ErrorState";
import { TableSkeleton } from "@/components/LoadingSkeleton";
import { StatusBadge } from "@/components/StatusBadge";
import { formatDate, formatDateTime, formatMoney } from "@/lib/format";
import { ArrowLeft, MapPin, ReceiptText, Users, Wallet } from "lucide-react";

const AdminOrderDetail = () => {
  const { id } = useParams();
  const orderId = id ? Number(id) : null;
  const { data: order, isLoading, isError, refetch } = useAdminOrderDetail(orderId);

  return (
    <AdminLayout>
      <Helmet><title>{order ? `Order ${order.order_number} | Admin` : "Order | Admin"}</title></Helmet>

      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <ButtonBack />
          <PageHeader
            title={order ? `Order ${order.order_number}` : "Order Detail"}
            subtitle={order ? `Placed ${formatDateTime(order.created_at)}` : "Loading order..."}
          />
        </div>

        {isLoading ? (
          <div className="space-y-6">
            <TableSkeleton cols={4} />
            <TableSkeleton cols={5} />
          </div>
        ) : isError ? (
          <ErrorState
            title="We couldn't load this order"
            onRetry={() => void refetch()}
          />
        ) : order ? (
          <>
            {/* Summary */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <SummaryCard
                icon={<ReceiptText className="h-4 w-4" aria-hidden="true" />}
                label="Total"
                value={formatMoney(order.total_amount)}
              />
              <SummaryCard
                icon={<Wallet className="h-4 w-4" aria-hidden="true" />}
                label="Payment"
                value={<StatusBadge status={order.payment_status} kind="payment" audience="buyer" />}
              />
              <SummaryCard
                icon={<Users className="h-4 w-4" aria-hidden="true" />}
                label="Buyer"
                value={order.buyer_name}
                sub={order.buyer_email}
              />
              <SummaryCard
                icon={<ReceiptText className="h-4 w-4" aria-hidden="true" />}
                label="Status"
                value={<StatusBadge status={order.status} kind="order" />}
              />
            </div>

            {/* Shipping / notes */}
            <Card className="shadow-soft">
              <CardContent className="p-5">
                <div className="flex items-start gap-3">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium">Shipping address</p>
                    <p className="mt-0.5 text-sm text-muted-foreground">
                      {order.shipping_address || "No address recorded"}
                    </p>
                    {order.notes && (
                      <p className="mt-2 text-sm text-muted-foreground">
                        <span className="font-medium text-foreground">Notes:</span> {order.notes}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Items */}
            <Card className="shadow-soft">
              <div className="border-b px-5 py-4">
                <h2 className="font-display text-base font-semibold">
                  Items ({order.items.length})
                </h2>
              </div>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead className="hidden sm:table-cell">Seller</TableHead>
                      <TableHead className="text-center">Qty</TableHead>
                      <TableHead className="hidden md:table-cell">Unit price</TableHead>
                      <TableHead className="text-right">Subtotal</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {order.items.map((it) => (
                      <TableRow key={it.id}>
                        <TableCell className="font-medium text-foreground">
                          <div className="flex items-center gap-3">
                            {it.image_url && (
                              <img
                                src={it.image_url}
                                alt={it.name}
                                className="h-10 w-10 rounded-md object-cover"
                              />
                            )}
                            <div className="min-w-0">
                              <span className="block truncate">{it.name}</span>
                              <span className="block text-xs font-normal text-muted-foreground sm:hidden">
                                {it.seller_name || "Seller"}
                              </span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="hidden text-muted-foreground sm:table-cell">
                          {it.seller_name ? (
                            <Link
                              to={`/admin/sellers/${it.seller_id}`}
                              className="hover:text-primary"
                            >
                              {it.seller_name}
                            </Link>
                          ) : (
                            "—"
                          )}
                        </TableCell>
                        <TableCell className="text-center text-muted-foreground">
                          {Number(it.quantity)}
                        </TableCell>
                        <TableCell className="hidden text-muted-foreground md:table-cell">
                          {formatMoney(it.unit_price)}
                        </TableCell>
                        <TableCell className="text-right font-medium text-foreground">
                          {formatMoney(it.subtotal)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <div className="mt-4 flex flex-col items-end gap-1 text-sm">
                  <div className="flex gap-6 text-muted-foreground">
                    <span>Subtotal</span>
                    <span className="w-24 text-right">{formatMoney(order.total_amount)}</span>
                  </div>
                  <div className="flex gap-6 text-muted-foreground">
                    <span>Shipping</span>
                    <span className="w-24 text-right">{formatMoney(order.shipping_fee)}</span>
                  </div>
                  <div className="flex gap-6 font-semibold text-foreground">
                    <span>Total</span>
                    <span className="w-24 text-right">{formatMoney(Number(order.total_amount) + Number(order.shipping_fee))}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Payments */}
            <Card className="shadow-soft">
              <div className="border-b px-5 py-4">
                <h2 className="font-display text-base font-semibold">
                  Payments ({order.payments.length})
                </h2>
              </div>
              <CardContent>
                {order.payments.length === 0 ? (
                  <p className="py-4 text-sm text-muted-foreground">
                    No payment rows recorded for this order.
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Seller</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="hidden md:table-cell">Reference</TableHead>
                        <TableHead className="hidden lg:table-cell">Paid at</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {order.payments.map((pay) => (
                        <TableRow key={pay.id}>
                          <TableCell className="font-medium text-foreground">
                          {pay.seller_id !== null && pay.seller_name ? (
                            <Link
                              to={`/admin/sellers/${pay.seller_id}`}
                              className="hover:text-primary"
                            >
                              {pay.seller_name}
                            </Link>
                          ) : (
                            "Legacy order payment"
                          )}
                        </TableCell>
                          <TableCell className="font-medium text-foreground">
                            {formatMoney(pay.amount)}
                          </TableCell>
                          <TableCell>
                            <StatusBadge
                              status={pay.status}
                              kind="payment"
                              audience="buyer"
                            />
                          </TableCell>
                          <TableCell className="hidden text-muted-foreground md:table-cell">
                            {pay.transaction_reference || "—"}
                          </TableCell>
                          <TableCell className="hidden text-muted-foreground lg:table-cell">
                            {pay.paid_at ? formatDateTime(pay.paid_at) : "—"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
                {order.payments.some((pay) => pay.rejection_reason) && (
                  <div className="mt-4 space-y-2">
                    {order.payments
                      .filter((pay) => pay.rejection_reason)
                      .map((pay) => (
                        <div
                          key={pay.id}
                          className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-700 dark:text-red-200"
                        >
                          <Badge variant="outline" className="mr-2 border-red-500/30 bg-transparent">
                            Rejection
                          </Badge>
                          {pay.seller_name}: {pay.rejection_reason}
                        </div>
                      ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        ) : null}
      </div>
    </AdminLayout>
  );
};

function SummaryCard({
  icon,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  sub?: string;
}) {
  return (
    <Card className="shadow-soft">
      <CardContent className="p-5">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          {icon}
          <span>{label}</span>
        </div>
        <p className="mt-2 font-display text-lg font-semibold text-foreground">{value}</p>
        {sub && <p className="mt-0.5 truncate text-xs text-muted-foreground">{sub}</p>}
      </CardContent>
    </Card>
  );
}

function ButtonBack() {
  return (
    <Link
      to="/admin/orders"
      className="inline-flex shrink-0 items-center text-sm text-muted-foreground hover:text-primary"
    >
      <ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" />
      <span className="sr-only sm:not-sr-only sm:inline">Back to Orders</span>
    </Link>
  );
}

export default AdminOrderDetail;