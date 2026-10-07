import { Helmet } from "react-helmet-async";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { useAdminReports } from "@/hooks/useAdmin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { StatusBadge } from "@/components/StatusBadge";
import { formatPrice } from "@/lib/format";
import { Users, Package, ShoppingCart, DollarSign, FolderTree, ClipboardList } from "lucide-react";

const AdminDashboard = () => {
  const { data, isLoading, isError, refetch } = useAdminReports();

  const totalUsers = data?.user_stats?.reduce((sum, s) => sum + Number(s.count), 0) ?? 0;

  const stats = [
    { label: "Total Users", value: String(totalUsers), icon: Users, color: "text-sky-500" },
    { label: "Products", value: String(data?.total_products ?? 0), icon: Package, color: "text-emerald-500" },
    { label: "Orders", value: String(data?.total_orders ?? 0), icon: ShoppingCart, color: "text-orange-500" },
    { label: "Revenue", value: formatPrice(Number(data?.total_revenue ?? 0)), icon: DollarSign, color: "text-primary" },
    { label: "Categories", value: String(data?.total_categories ?? 0), icon: FolderTree, color: "text-violet-500" },
  ];

  return (
    <AdminLayout>
      <Helmet><title>Admin Dashboard | LanaoCrafts</title></Helmet>

      <div className="space-y-6">
        <PageHeader title="Admin Dashboard" subtitle="System overview at a glance" />

        {isLoading && (
          <div role="status" aria-label="Loading dashboard">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-20 rounded-lg" />
              ))}
            </div>
            <Skeleton className="mt-6 h-64 rounded-lg" />
          </div>
        )}

        {isError && (
          <ErrorState
            title="We couldn't load the dashboard"
            onRetry={() => void refetch()}
          />
        )}

        {!isLoading && !isError && (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              {stats.map((s) => (
                <Card key={s.label}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className={`rounded-lg bg-muted p-2 ${s.color}`}>
                        <s.icon className="h-5 w-5" aria-hidden="true" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs text-muted-foreground">{s.label}</p>
                        <p className="truncate text-lg font-bold tabular-nums text-foreground">
                          {s.value}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Breakdowns */}
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Users by Role</CardTitle>
                </CardHeader>
                <CardContent>
                  {data?.user_stats?.length ? (
                    <div className="space-y-3">
                      {data.user_stats.map((s) => (
                        <div
                          key={s.role}
                          className="flex items-center justify-between border-b border-border/50 pb-2 last:border-0 last:pb-0"
                        >
                          <span className="text-sm capitalize text-muted-foreground">{s.role}</span>
                          <span className="text-sm font-semibold tabular-nums text-foreground">
                            {s.count}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No user data yet.</p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Orders by Status</CardTitle>
                </CardHeader>
                <CardContent>
                  {data?.orders_by_status?.length ? (
                    <div className="space-y-3">
                      {data.orders_by_status.map((s) => (
                        <div
                          key={s.status}
                          className="flex items-center justify-between border-b border-border/50 pb-2 last:border-0 last:pb-0"
                        >
                          <StatusBadge status={s.status} kind="order" />
                          <span className="text-sm font-semibold tabular-nums text-foreground">
                            {s.count}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No orders yet.</p>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Recent orders */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Recent Orders</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {data?.recent_orders?.length ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Order #</TableHead>
                        <TableHead>Buyer</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.recent_orders.map((o) => (
                        <TableRow key={o.id}>
                          <TableCell className="font-medium">#{o.id}</TableCell>
                          <TableCell>{o.buyer_name}</TableCell>
                          <TableCell className="tabular-nums">
                            {formatPrice(parseFloat(o.total_amount))}
                          </TableCell>
                          <TableCell>
                            <StatusBadge status={o.status} kind="order" />
                          </TableCell>
                          <TableCell className="text-right text-muted-foreground">
                            {new Date(o.created_at).toLocaleDateString("en-PH", {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                            })}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <EmptyState
                    dense
                    icon={ClipboardList}
                    title="No orders yet"
                    description="Orders placed by buyers will show up here."
                  />
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminDashboard;
