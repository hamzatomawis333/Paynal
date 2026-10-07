import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { useAdminSellers } from "@/hooks/useAdmin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { TableSkeleton } from "@/components/LoadingSkeleton";
import { StatusBadge } from "@/components/StatusBadge";
import { formatDate, formatMoney } from "@/lib/format";
import { Search, Store, Eye } from "lucide-react";
import type { AdminSeller } from "@/types/api";

const initials = (name: string) =>
  name
    .split(/\s+/)
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

const AdminSellers = () => {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const { data: sellers, isLoading, isError, refetch } = useAdminSellers(debouncedSearch);

  const hasFilters = debouncedSearch !== "";
  const isActive = (s: AdminSeller) => Number(s.is_active) === 1;

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 400);
    return () => clearTimeout(t);
  }, [search]);

  return (
    <AdminLayout>
      <Helmet><title>Sellers | Admin</title></Helmet>

      <div className="space-y-6">
        <PageHeader
          title="Sellers"
          subtitle="Seller accounts, their sales, and the products they post"
        />

        <Card>
          <CardHeader>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle className="text-base">All Sellers ({sellers?.length ?? 0})</CardTitle>
              <div className="relative">
                <Search
                  className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                  aria-hidden="true"
                />
                <Input
                  className="w-52 pl-9"
                  placeholder="Search by shop, name, email..."
                  aria-label="Search sellers by shop, name or email"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <TableSkeleton cols={6} />
            ) : isError ? (
              <ErrorState dense onRetry={() => void refetch()} />
            ) : (sellers ?? []).length === 0 ? (
              <EmptyState
                dense
                icon={Store}
                title={hasFilters ? "No sellers match your search" : "No sellers yet"}
                description={
                  hasFilters
                    ? "Try a different search term."
                    : "Registered seller accounts will appear here."
                }
                action={
                  hasFilters && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSearch("");
                        setDebouncedSearch("");
                      }}
                    >
                      Clear search
                    </Button>
                  )
                }
              />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Seller</TableHead>
                    <TableHead className="hidden md:table-cell">Products</TableHead>
                    <TableHead className="hidden md:table-cell">Items Sold</TableHead>
                    <TableHead className="text-right">Total Sales</TableHead>
                    <TableHead className="hidden lg:table-cell">Status</TableHead>
                    <TableHead className="hidden lg:table-cell">Joined</TableHead>
                    <TableHead className="w-10" aria-label="Actions" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(sellers ?? []).map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium text-foreground">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9">
                            <AvatarImage src={s.avatar_url || undefined} alt="" />
                            <AvatarFallback>{initials(s.full_name)}</AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <span className="block truncate">{s.shop_name || s.full_name}</span>
                            <span className="block truncate text-xs font-normal text-muted-foreground">
                              {s.email}
                            </span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden text-muted-foreground md:table-cell">
                        {Number(s.product_count)}
                      </TableCell>
                      <TableCell className="hidden text-muted-foreground md:table-cell">
                        {Number(s.sold_items)}
                      </TableCell>
                      <TableCell className="text-right font-medium text-foreground">
                        {formatMoney(s.total_sales)}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <StatusBadge status={isActive(s) ? "active" : "inactive"} kind="active" />
                      </TableCell>
                      <TableCell className="hidden text-muted-foreground lg:table-cell">
                        {formatDate(s.created_at)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button asChild variant="ghost" size="icon">
                          <Link
                            to={`/admin/sellers/${s.id}`}
                            title={`View ${s.shop_name || s.full_name}`}
                            aria-label={`View seller ${s.shop_name || s.full_name}`}
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
      </div>
    </AdminLayout>
  );
};

export default AdminSellers;