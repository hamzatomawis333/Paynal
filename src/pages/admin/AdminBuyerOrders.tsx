import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link, useParams } from "react-router-dom";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { useAdminOrders } from "@/hooks/useAdmin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { TableSkeleton } from "@/components/LoadingSkeleton";
import { StatusBadge } from "@/components/StatusBadge";
import { formatDate, formatMoney } from "@/lib/format";
import { Search, ShoppingCart, Eye, ArrowLeft, Users } from "lucide-react";

const ORDER_STATUSES = [
  "pending",
  "confirmed",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
] as const;

// All orders for one buyer account (/admin/orders/buyer/:buyerId), the
// drill-down from the buyer account list - mirrors AdminSellerDetail.
const AdminBuyerOrders = () => {
  const { buyerId } = useParams();
  const id = buyerId ? Number(buyerId) : null;

  const [status, setStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const { data, isLoading, isError, refetch } = useAdminOrders({
    buyerId: id ? String(id) : "all",
    status,
    search: debouncedSearch,
  });

  const orders = data?.orders;
  const buyer = id !== null ? data?.buyers?.find((b) => Number(b.id) === id) : undefined;
  const hasFilters = status !== "all" || debouncedSearch !== "";

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 400);
    return () => clearTimeout(t);
  }, [search]);

  return (
    <AdminLayout>
      <Helmet>
        <title>{buyer ? `${buyer.full_name}'s Orders | Admin` : "Buyer Orders | Admin"}</title>
      </Helmet>

      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link
            to="/admin/orders"
            className="inline-flex shrink-0 items-center text-sm text-muted-foreground hover:text-primary"
          >
            <ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" />
            <span className="sr-only sm:not-sr-only sm:inline">Back to Orders</span>
          </Link>
          <PageHeader
            title={buyer ? buyer.full_name : "Buyer Orders"}
            subtitle={
              buyer
                ? `${buyer.email} · ${Number(buyer.order_count)} order${Number(buyer.order_count) === 1 ? "" : "s"}`
                : "Loading buyer..."
            }
          />
        </div>

        {isLoading ? (
          <TableSkeleton cols={6} />
        ) : isError ? (
          <ErrorState
            title="We couldn't load this buyer's orders"
            onRetry={() => void refetch()}
          />
        ) : id === null || !buyer ? (
          <EmptyState
            icon={Users}
            title="Buyer account not found"
            description="This account may have been removed."
            action={
              <Button asChild variant="outline" size="sm">
                <Link to="/admin/orders">Back to Orders</Link>
              </Button>
            }
          />
        ) : (
          <Card>
            <CardHeader>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <CardTitle className="text-base">
                  Their Orders ({orders?.length ?? 0})
                </CardTitle>
                <div className="flex flex-wrap gap-2">
                  <div className="relative">
                    <Search
                      className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                      aria-hidden="true"
                    />
                    <Input
                      className="w-52 pl-9"
                      placeholder="Search by order #..."
                      aria-label="Search orders by order number"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                  </div>
                  <Select value={status} onValueChange={setStatus}>
                    <SelectTrigger className="w-36" aria-label="Filter by order status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      {ORDER_STATUSES.map((s) => (
                        <SelectItem key={s} value={s} className="capitalize">
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {(orders ?? []).length === 0 ? (
                <EmptyState
                  dense
                  icon={ShoppingCart}
                  title={hasFilters ? "No orders match your filters" : "No orders yet"}
                  description={
                    hasFilters
                      ? "Try a different search term or status filter."
                      : "This buyer hasn't placed any orders yet."
                  }
                  action={
                    hasFilters && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSearch("");
                          setDebouncedSearch("");
                          setStatus("all");
                        }}
                      >
                        Clear filters
                      </Button>
                    )
                  }
                />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order #</TableHead>
                      <TableHead className="hidden md:table-cell">Items</TableHead>
                      <TableHead>Payment</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="hidden lg:table-cell">Placed</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead className="w-10" aria-label="Actions" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(orders ?? []).map((o) => (
                      <TableRow key={o.id}>
                        <TableCell className="font-medium text-foreground">
                          {o.order_number}
                        </TableCell>
                        <TableCell className="hidden text-muted-foreground md:table-cell">
                          {Number(o.item_count)}
                        </TableCell>
                        <TableCell>
                          <StatusBadge
                            status={o.payment_status}
                            kind="payment"
                            audience="buyer"
                          />
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={o.status} kind="order" />
                        </TableCell>
                        <TableCell className="hidden text-muted-foreground lg:table-cell">
                          {formatDate(o.created_at)}
                        </TableCell>
                        <TableCell className="text-right font-medium text-foreground">
                          {formatMoney(o.total_amount)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button asChild variant="ghost" size="icon">
                            <Link
                              to={`/admin/orders/${o.id}`}
                              title={`View order ${o.order_number}`}
                              aria-label={`View order ${o.order_number}`}
                            >
                              <Eye className="h-4 w-4" aria-hidden="true" />
                            </Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminBuyerOrders;
