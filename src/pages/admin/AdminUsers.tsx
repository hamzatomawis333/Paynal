import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { useAdminUsers } from "@/hooks/useAdmin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { TableSkeleton } from "@/components/LoadingSkeleton";
import { StatusBadge } from "@/components/StatusBadge";
import { formatDate } from "@/lib/format";
import { toast } from "sonner";
import { Search, UserCheck, UserX, Trash2, Users } from "lucide-react";
import { getErrorMessage } from "@/lib/errors";
import type { AdminUser } from "@/types/api";

const AdminUsers = () => {
  const {
    data: users, isLoading, isError, refetch, updateUser, deleteUser,
    total, hasMore, loadMore,
  } = useAdminUsers();
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");

  const filtered = (users ?? []).filter((u) => {
    const matchSearch = u.full_name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase());
    const matchRole = roleFilter === "all" || u.role === roleFilter;
    return matchSearch && matchRole;
  });

  const handleToggleActive = (user: AdminUser) => {
    // is_active arrives as the string "1" / "0", so compare numerically:
    // a plain truthiness check would treat "0" as active.
    const newStatus = Number(user.is_active) === 1 ? 0 : 1;
    updateUser.mutate(
      { userId: Number(user.id), data: { is_active: newStatus } },
      { onSuccess: () => toast.success(`User ${newStatus ? "activated" : "deactivated"}`) }
    );
  };

  const handleChangeRole = (user: AdminUser, newRole: string) => {
    updateUser.mutate(
      { userId: Number(user.id), data: { role: newRole } },
      { onSuccess: () => toast.success(`Role updated to ${newRole}`) }
    );
  };

  const handleDelete = (user: AdminUser) => {
    if (!confirm(`Delete user "${user.full_name}"? This cannot be undone.`)) return;
    deleteUser.mutate(Number(user.id), {
      onSuccess: () => toast.success("User deleted"),
      onError: (err) => toast.error(getErrorMessage(err, "Failed to delete user")),
    });
  };

  const roleBadgeVariant = (role: string) => {
    if (role === "admin") return "destructive" as const;
    if (role === "seller") return "default" as const;
    return "secondary" as const;
  };

  const isActive = (u: AdminUser) => Number(u.is_active) === 1;
  const hasFilters = search !== "" || roleFilter !== "all";

  return (
    <AdminLayout>
      <Helmet><title>User Management | Admin</title></Helmet>

      <div className="space-y-6">
        <PageHeader
          title="User Management"
          subtitle="Search, update roles, and manage account access"
        />

        <Card>
          <CardHeader>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle className="text-base">All Users ({filtered.length})</CardTitle>
              <div className="flex flex-wrap gap-2">
                <div className="relative">
                  <Search
                    className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                    aria-hidden="true"
                  />
                  <Input
                    className="w-48 pl-9"
                    placeholder="Search users..."
                    aria-label="Search users by name or email"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
                <Select value={roleFilter} onValueChange={setRoleFilter}>
                  <SelectTrigger className="w-32" aria-label="Filter by role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Roles</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="seller">Seller</SelectItem>
                    <SelectItem value="buyer">Buyer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <TableSkeleton cols={6} />
            ) : isError ? (
              <ErrorState dense onRetry={() => void refetch()} />
            ) : filtered.length === 0 ? (
              <EmptyState
                dense
                icon={Users}
                title={hasFilters ? "No users match your filters" : "No users yet"}
                description={
                  hasFilters
                    ? "Try a different search term or role filter."
                    : "Registered accounts will appear here."
                }
                action={
                  hasFilters && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSearch("");
                        setRoleFilter("all");
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
                    <TableHead>Name</TableHead>
                    <TableHead className="hidden md:table-cell">Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="hidden lg:table-cell">Joined</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell className="font-medium text-foreground">
                        {u.full_name}
                        <span className="block text-xs font-normal text-muted-foreground md:hidden">
                          {u.email}
                        </span>
                      </TableCell>
                      <TableCell className="hidden text-muted-foreground md:table-cell">
                        {u.email}
                      </TableCell>
                      <TableCell>
                        <Select value={u.role} onValueChange={(v) => handleChangeRole(u, v)}>
                          <SelectTrigger
                            className="h-8 w-24"
                            aria-label={`Change role for ${u.full_name}`}
                          >
                            <Badge variant={roleBadgeVariant(u.role)} className="capitalize">
                              {u.role}
                            </Badge>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="buyer">Buyer</SelectItem>
                            <SelectItem value="seller">Seller</SelectItem>
                            <SelectItem value="admin">Admin</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <StatusBadge
                          status={isActive(u) ? "active" : "inactive"}
                          kind="active"
                        />
                      </TableCell>
                      <TableCell className="hidden text-muted-foreground lg:table-cell">
                        {formatDate(u.created_at)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleToggleActive(u)}
                            title={isActive(u) ? "Deactivate" : "Activate"}
                            aria-label={`${isActive(u) ? "Deactivate" : "Activate"} ${u.full_name}`}
                          >
                            {isActive(u) ? (
                              <UserX className="h-4 w-4" aria-hidden="true" />
                            ) : (
                              <UserCheck className="h-4 w-4" aria-hidden="true" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                            onClick={() => handleDelete(u)}
                            title="Delete"
                            aria-label={`Delete ${u.full_name}`}
                          >
                            <Trash2 className="h-4 w-4" aria-hidden="true" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
            {!isLoading && !isError && users?.length ? (
              <div className="flex flex-col items-center gap-2 border-t px-6 py-4 sm:flex-row sm:justify-between">
                <p className="text-sm text-muted-foreground">
                  Showing {users.length} of {total} user{total === 1 ? "" : "s"}
                  {hasFilters && !hasMore ? " (matching your filters)" : ""}
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

export default AdminUsers;
