import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { useAdminAuditLog } from "@/hooks/useAdmin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { TableSkeleton } from "@/components/LoadingSkeleton";
import { formatDateTime } from "@/lib/format";
import { History } from "lucide-react";
import type { AdminAuditEntry } from "@/lib/admin-api";

const ACTIONS = [
  "settings.update",
  "user.update",
  "user.delete",
  "user.delete_blocked",
  "subscription.reject",
  "subscription.expire",
  "subscription.delete",
  "subscription.delete_blocked",
] as const;

function actionVariant(action: string): "default" | "secondary" | "destructive" | "outline" {
  if (action.endsWith("_blocked") || action === "user.delete" || action === "subscription.delete") {
    return "destructive";
  }
  if (action === "settings.update") return "secondary";
  if (action === "subscription.reject" || action === "subscription.expire") return "outline";
  return "default";
}

function describeDetails(details: AdminAuditEntry["details"]): string {
  if (details === null || details === "") return "—";
  if (typeof details === "string") return details;
  const parts = Object.entries(details).map(([key, value]) => {
    if (
      value !== null &&
      typeof value === "object" &&
      "from" in (value as Record<string, unknown>) &&
      "to" in (value as Record<string, unknown>)
    ) {
      const pair = value as { from: unknown; to: unknown };
      return `${key}: ${String(pair.from)} → ${String(pair.to)}`;
    }
    if (value === null || value === "") return `${key}: —`;
    if (typeof value === "object") return `${key}: ${JSON.stringify(value)}`;
    return `${key}: ${String(value)}`;
  });
  return parts.join(" · ");
}

function targetLabel(entry: AdminAuditEntry): string {
  if (!entry.target_type) return "—";
  if (entry.target_id > 0) return `${entry.target_type} #${entry.target_id}`;
  return entry.target_type;
}

const AdminAuditLog = () => {
  const [actionFilter, setActionFilter] = useState("all");
  const {
    data: entries,
    isLoading,
    isError,
    refetch,
  } = useAdminAuditLog(200, actionFilter === "all" ? undefined : actionFilter);

  return (
    <AdminLayout>
      <Helmet>
        <title>Audit Log | Admin</title>
      </Helmet>

      <div className="space-y-6">
        <PageHeader
          title="Audit Log"
          subtitle="Trail of admin actions: settings changes, user management, and subscription decisions"
        />

        <Card>
          <CardHeader>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle className="text-base">Recent Actions ({entries?.length ?? 0})</CardTitle>
              <div className="flex flex-wrap gap-2">
                <Select value={actionFilter} onValueChange={setActionFilter}>
                  <SelectTrigger className="w-52" aria-label="Filter by action">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Actions</SelectItem>
                    {ACTIONS.map((a) => (
                      <SelectItem key={a} value={a}>
                        {a}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button variant="outline" size="sm" onClick={() => void refetch()}>
                  Refresh
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <TableSkeleton cols={5} />
            ) : isError ? (
              <ErrorState dense onRetry={() => void refetch()} />
            ) : !entries || entries.length === 0 ? (
              <EmptyState
                dense
                icon={History}
                title={actionFilter === "all" ? "No audit entries yet" : "No entries for this action"}
                description="Admin actions will be recorded here as they happen."
              />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>When</TableHead>
                    <TableHead>Admin</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead className="hidden md:table-cell">Target</TableHead>
                    <TableHead className="hidden lg:table-cell">Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entries.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell className="whitespace-nowrap text-muted-foreground">
                        {formatDateTime(entry.created_at)}
                      </TableCell>
                      <TableCell className="font-medium text-foreground">
                        {entry.admin_name ?? "—"}
                        <span className="block text-xs font-normal text-muted-foreground md:hidden">
                          {entry.admin_email ?? ""}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant={actionVariant(entry.action)}>{entry.action}</Badge>
                      </TableCell>
                      <TableCell className="hidden text-muted-foreground md:table-cell">
                        {targetLabel(entry)}
                      </TableCell>
                      <TableCell className="hidden max-w-md text-muted-foreground lg:table-cell">
                        <span className="break-words text-xs">{describeDetails(entry.details)}</span>
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

export default AdminAuditLog;
