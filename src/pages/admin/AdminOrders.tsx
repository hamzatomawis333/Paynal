import { useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link, useNavigate } from "react-router-dom";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { useAdminOrders } from "@/hooks/useAdmin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { TableSkeleton } from "@/components/LoadingSkeleton";
import { formatDate } from "@/lib/format";
import { Search, Users, Eye } from "lucide-react";

const initials = (name: string) =>
  name
    .split(/\s+/)
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

// Landing page for Orders: shows buyer ACCOUNTS only (like the Sellers page).
// Clicking one drills into that buyer's orders at /admin/orders/buyer/:id.
const AdminOrders = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");

  const { data, isLoading, isError, refetch, total, hasMore, loadMore } = useAdminOrders(undefined, true);
  const buyers = data?.buyers ?? [];

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return buyers;
    return buyers.filter(
      (b) => b.full_name.toLowerCase().includes(q) || b.email.toLowerCase().includes(q)
    );
  }, [buyers, search]);

  return (
    <AdminLayout>
      <Helmet><title>Orders | Admin</title></Helmet>

      <div className="space-y-6">
        <PageHeader
          title="Orders"
          subtitle="Pick a buyer account to see all of their orders"
        />

        <Card>
          <CardHeader>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle className="text-base">Buyer Accounts ({filtered.length})</CardTitle>
              <div className="relative">
                <Search
                  className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                  aria-hidden="true"
                />
                <Input
                  className="w-52 pl-9"
                  placeholder="Search by name, email..."
                  aria-label="Search buyer accounts by name or email"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <TableSkeleton cols={4} />
            ) : isError ? (
              <ErrorState dense onRetry={() => void refetch()} />
            ) : filtered.length === 0 ? (
              <EmptyState
                dense
                icon={Users}
                title={
                  search
                    ? "No buyers match your search"
                    : "No buyer accounts yet"
                }
                description={
                  search
                    ? "Try a different name or email."
                    : "Registered buyer accounts will appear here."
                }
                action={
                  search && (
                    <Button variant="outline" size="sm" onClick={() => setSearch("")}>
                      Clear search
                    </Button>
                  )
                }
              />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Buyer</TableHead>
                    <TableHead className="hidden md:table-cell">Orders</TableHead>
                    <TableHead className="hidden md:table-cell">Last Order</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((b) => (
                    <TableRow
                      key={b.id}
                      className="cursor-pointer"
                      onClick={() => navigate(`/admin/orders/buyer/${b.id}`)}
                    >
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9">
                            <AvatarImage src={b.avatar_url || undefined} alt="" />
                            <AvatarFallback>{initials(b.full_name)}</AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <span className="block truncate font-medium text-foreground">
                              {b.full_name}
                            </span>
                            <span className="block truncate text-xs font-normal text-muted-foreground">
                              {b.email}
                            </span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden text-muted-foreground md:table-cell">
                        {Number(b.order_count)}
                      </TableCell>
                      <TableCell className="hidden text-muted-foreground md:table-cell">
                        {b.last_order_at ? formatDate(b.last_order_at) : "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button asChild variant="ghost" size="icon">
                          <Link
                            to={`/admin/orders/buyer/${b.id}`}
                            title={`View orders of ${b.full_name}`}
                            aria-label={`View orders of ${b.full_name}`}
                            onClick={(e) => e.stopPropagation()}
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
            {!isLoading && !isError && buyers.length ? (
              <div className="flex flex-col items-center gap-2 border-t px-6 py-4 sm:flex-row sm:justify-between">
                <p className="text-sm text-muted-foreground">
                  Showing {buyers.length} of {total} buyer account{total === 1 ? "" : "s"}
                </p>
                {hasMore && (
                  <Button variant="outline" size="sm" onClick={loadMore}>
                    Load more
                  </Button>
                )}
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AdminOrders;
