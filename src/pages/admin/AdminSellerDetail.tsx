import { Helmet } from "react-helmet-async";
import { Link, useParams } from "react-router-dom";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { useAdminSellerDetail } from "@/hooks/useAdmin";
import { ProfileHeader } from "@/components/ProfileHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/PageHeader";
import { ErrorState } from "@/components/ErrorState";
import { TableSkeleton } from "@/components/LoadingSkeleton";
import { StatusBadge } from "@/components/StatusBadge";
import { formatDate, formatDateTime, formatMoney } from "@/lib/format";
import { ArrowLeft, Package, Store, Wallet } from "lucide-react";
import type { AdminSellerDetail } from "@/types/api";

const AdminSellerDetail = () => {
  const { id } = useParams();
  const sellerId = id ? Number(id) : null;
  const { data: seller, isLoading, isError, refetch } = useAdminSellerDetail(sellerId);

  return (
    <AdminLayout>
      <Helmet><title>{seller ? `${seller.shop_name || seller.full_name} | Admin` : "Seller | Admin"}</title></Helmet>

      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link
            to="/admin/sellers"
            className="inline-flex shrink-0 items-center text-sm text-muted-foreground hover:text-primary"
          >
            <ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" />
            <span className="sr-only sm:not-sr-only sm:inline">Back to Sellers</span>
          </Link>
          <PageHeader
            title={seller ? seller.shop_name || seller.full_name : "Seller"}
            subtitle={seller ? `Joined ${formatDate(seller.created_at, true)}` : "Loading seller..."}
          />
        </div>

        {isLoading ? (
          <div className="space-y-6">
            <TableSkeleton cols={4} />
            <TableSkeleton cols={5} />
          </div>
        ) : isError ? (
          <ErrorState
            title="We couldn't load this seller"
            onRetry={() => void refetch()}
          />
        ) : seller ? (
          <>
            <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
              <ProfileHeader
                name={seller.full_name}
                email={seller.email}
                role="seller"
                avatarUrl={seller.avatar_url}
                createdAt={seller.created_at}
              />
              <Card className="shadow-soft">
                <CardContent className="space-y-3 p-5">
                  <div className="flex items-center gap-2 text-sm">
                    <Store className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                    <span className="font-medium">{seller.shop_name || "No shop name"}</span>
                    <StatusBadge status={Number(seller.is_active) === 1 ? "active" : "inactive"} kind="active" />
                  </div>
                  <p className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Store className="h-4 w-4" aria-hidden="true" />
                    {seller.shop_address || "No shop address on file"}
                  </p>
                  <p className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Wallet className="h-4 w-4" aria-hidden="true" />
                    GCash: {seller.gcash_number ? `+63 ${seller.gcash_number}` : "Not configured"}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              <StatCard label="Total Sales" value={formatMoney(seller.total_sales)} />
              <StatCard label="Items Sold" value={String(Number(seller.sold_items))} />
              <StatCard label="Orders" value={String(Number(seller.order_count))} />
              <StatCard label="Products" value={String(Number(seller.product_count))} />
            </div>

            {/* Products */}
            <section aria-labelledby="products-heading">
              <SectionTitle id="products-heading" icon={<Package className="h-4 w-4" aria-hidden="true" />} title="Products" count={seller.products.length} />
              <Card className="shadow-soft">
                <CardContent>
                  {seller.products.length === 0 ? (
                    <p className="py-4 text-sm text-muted-foreground">This seller has not posted any products.</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Product</TableHead>
                          <TableHead className="hidden sm:table-cell">Posted</TableHead>
                          <TableHead className="text-right">Price</TableHead>
                          <TableHead className="text-right">Stock</TableHead>
                          <TableHead className="hidden md:table-cell">Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {seller.products.map((p) => (
                          <TableRow key={p.id}>
                            <TableCell className="font-medium text-foreground">
                              <div className="flex items-center gap-3">
                                {p.image_url && (
                                  <img src={p.image_url} alt={p.name} className="h-10 w-10 rounded-md object-cover" />
                                )}
                                <span className="block truncate">{p.name}</span>
                              </div>
                            </TableCell>
                            <TableCell className="hidden text-muted-foreground sm:table-cell">
                              {formatDate(p.created_at)}
                            </TableCell>
                            <TableCell className="text-right font-medium text-foreground">
                              {formatMoney(p.price)}
                            </TableCell>
                            <TableCell className="text-right text-muted-foreground">
                              {Number(p.stock_quantity)}
                            </TableCell>
                            <TableCell className="hidden md:table-cell">
                              <StatusBadge status={Number(p.is_active) === 1 ? "active" : "inactive"} kind="active" />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </section>

            {/* Sales */}
            <section aria-labelledby="sales-heading">
              <SectionTitle id="sales-heading" icon={<Wallet className="h-4 w-4" aria-hidden="true" />} title="Recent Sales" count={seller.sales.length} />
              <Card className="shadow-soft">
                <CardContent>
                  {seller.sales.length === 0 ? (
                    <p className="py-4 text-sm text-muted-foreground">No sales recorded yet.</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Order</TableHead>
                          <TableHead className="hidden sm:table-cell">Product</TableHead>
                          <TableHead className="text-center">Qty</TableHead>
                          <TableHead className="hidden md:table-cell">Order Status</TableHead>
                          <TableHead className="hidden lg:table-cell">Date</TableHead>
                          <TableHead className="text-right">Subtotal</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {seller.sales.map((s) => (
                          <TableRow key={s.id}>
                            <TableCell className="font-medium text-foreground">{s.order_number}</TableCell>
                            <TableCell className="hidden text-muted-foreground sm:table-cell">{s.product_name}</TableCell>
                            <TableCell className="text-center text-muted-foreground">{Number(s.quantity)}</TableCell>
                            <TableCell className="hidden md:table-cell">
                              <StatusBadge status={s.order_status} kind="order" />
                            </TableCell>
                            <TableCell className="hidden text-muted-foreground lg:table-cell">
                              {formatDateTime(s.created_at)}
                            </TableCell>
                            <TableCell className="text-right font-medium text-foreground">
                              {formatMoney(s.subtotal)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </section>

            {/* Payments */}
            <section aria-labelledby="payments-heading">
              <SectionTitle id="payments-heading" icon={<Wallet className="h-4 w-4" aria-hidden="true" />} title="Payments" count={seller.payments.length} />
              <Card className="shadow-soft">
                <CardContent>
                  {seller.payments.length === 0 ? (
                    <p className="py-4 text-sm text-muted-foreground">No payment rows for this seller.</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Order</TableHead>
                          <TableHead className="text-right">Amount</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="hidden md:table-cell">Reference</TableHead>
                          <TableHead className="hidden lg:table-cell">Paid at</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {seller.payments.map((pay) => (
                          <TableRow key={pay.id}>
                            <TableCell className="font-medium text-foreground">{pay.order_number}</TableCell>
                            <TableCell className="text-right font-medium text-foreground">
                              {formatMoney(pay.amount)}
                            </TableCell>
                            <TableCell>
                              <StatusBadge status={pay.status} kind="payment" audience="buyer" />
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
                  {seller.payments.some((pay) => pay.rejection_reason) && (
                    <div className="mt-4 space-y-2">
                      {seller.payments
                        .filter((pay) => pay.rejection_reason)
                        .map((pay) => (
                          <div
                            key={pay.id}
                            className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-700 dark:text-red-200"
                          >
                            {pay.order_number}: {pay.rejection_reason}
                          </div>
                        ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </section>
          </>
        ) : null}
      </div>
    </AdminLayout>
  );
};

function SectionTitle({ id, icon, title, count }: { id: string; icon: React.ReactNode; title: string; count: number }) {
  return (
    <h2 id={id} className="mb-3 flex items-center gap-2 font-display text-base font-semibold">
      {icon}
      {title}
      <span className="text-sm font-normal text-muted-foreground">({count})</span>
    </h2>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <Card className="shadow-soft">
      <CardContent className="p-5">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="mt-1 font-display text-xl font-semibold text-foreground">{value}</p>
      </CardContent>
    </Card>
  );
}

export default AdminSellerDetail;