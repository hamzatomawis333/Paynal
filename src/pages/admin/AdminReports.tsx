import { Helmet } from "react-helmet-async";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { useAdminReports } from "@/hooks/useAdmin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { formatPrice } from "@/lib/format";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { TrendingUp, PackageSearch } from "lucide-react";

const AdminReports = () => {
  const { data, isLoading, isError, refetch } = useAdminReports();

  const chartData = data?.monthly_revenue?.map((m) => ({
    month: m.month,
    revenue: parseFloat(m.revenue),
    orders: m.orders,
  })) ?? [];

  return (
    <AdminLayout>
      <Helmet><title>System Reports | Admin</title></Helmet>

      <div className="space-y-6">
        <PageHeader
          title="System Reports"
          subtitle="Revenue, sales, and platform analytics"
        />

        {isLoading && (
          <div role="status" aria-label="Loading reports" className="space-y-4">
            <Skeleton className="h-72 rounded-lg" />
            <div className="grid gap-4 md:grid-cols-2">
              <Skeleton className="h-64 rounded-lg" />
              <Skeleton className="h-64 rounded-lg" />
            </div>
          </div>
        )}

        {isError && (
          <ErrorState
            title="We couldn't load the reports"
            onRetry={() => void refetch()}
          />
        )}

        {!isLoading && !isError && (
          <>
            {/* Monthly Revenue Chart */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Monthly Revenue (Last 6 Months)</CardTitle>
              </CardHeader>
              <CardContent>
                {chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="month" className="text-xs fill-muted-foreground" />
                      <YAxis className="text-xs fill-muted-foreground" />
                      <Tooltip
                        cursor={{ fill: "hsl(var(--muted))" }}
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px",
                        }}
                        labelStyle={{ color: "hsl(var(--foreground))" }}
                        formatter={(value: number) => [formatPrice(value), "Revenue"]}
                      />
                      <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <EmptyState
                    dense
                    icon={TrendingUp}
                    title="No revenue data yet"
                    description="Revenue from completed orders will appear here."
                  />
                )}
              </CardContent>
            </Card>

            <div className="grid gap-4 md:grid-cols-2">
              {/* Top Products */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Top Selling Products</CardTitle>
                </CardHeader>
                <CardContent>
                  {data?.top_products?.length ? (
                    <div className="space-y-3">
                      {data.top_products.map((p, i) => (
                        <div
                          key={i}
                          className="flex items-center justify-between gap-3 border-b border-border/50 pb-2 last:border-0 last:pb-0"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-foreground">{p.name}</p>
                            <p className="text-xs text-muted-foreground">{p.total_sold} sold</p>
                          </div>
                          <span className="shrink-0 text-sm font-semibold tabular-nums text-primary">
                            {formatPrice(parseFloat(p.total_revenue))}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <EmptyState
                      dense
                      icon={PackageSearch}
                      title="No sales data yet"
                      description="Best sellers will show up once orders complete."
                    />
                  )}
                </CardContent>
              </Card>

              {/* Summary stats */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">System Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between border-b border-border/50 pb-2">
                      <span className="text-sm text-muted-foreground">Total Revenue</span>
                      <span className="text-sm font-bold tabular-nums text-foreground">
                        {formatPrice(Number(data?.total_revenue ?? 0))}
                      </span>
                    </div>
                    <div className="flex justify-between border-b border-border/50 pb-2">
                      <span className="text-sm text-muted-foreground">Total Orders</span>
                      <span className="text-sm font-bold tabular-nums text-foreground">
                        {data?.total_orders ?? 0}
                      </span>
                    </div>
                    <div className="flex justify-between border-b border-border/50 pb-2">
                      <span className="text-sm text-muted-foreground">Active Products</span>
                      <span className="text-sm font-bold tabular-nums text-foreground">
                        {data?.active_products} / {data?.total_products}
                      </span>
                    </div>
                    <div className="flex justify-between border-b border-border/50 pb-2">
                      <span className="text-sm text-muted-foreground">Categories</span>
                      <span className="text-sm font-bold tabular-nums text-foreground">
                        {data?.total_categories}
                      </span>
                    </div>
                    {data?.user_stats?.map((s) => (
                      <div key={s.role} className="flex justify-between">
                        <span className="text-sm text-muted-foreground capitalize">{s.role}s</span>
                        <span className="text-sm font-bold tabular-nums text-foreground">{s.count}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminReports;
