import { getErrorMessage } from "@/lib/errors";
import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { useAdminSubscriptions } from "@/hooks/useAdmin";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { TableSkeleton } from "@/components/LoadingSkeleton";
import { StatusBadge } from "@/components/StatusBadge";
import { formatDate } from "@/lib/format";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { useStartConversation } from "@/hooks/useMessages";
import {
  CheckCircle, XCircle, Clock, UserCheck, MessageCircle, Loader2, Inbox,
} from "lucide-react";

const statusTabs = ["", "Pending", "Active", "Expired", "Rejected"];

export default function AdminSubscriptions() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("");
  const {
    data: subscriptions, isLoading, isError, refetch, manageSubscription,
  } = useAdminSubscriptions(activeTab || undefined);
  const startChat = useStartConversation();

  const [rejectDialog, setRejectDialog] = useState(false);
  const [rejectingId, setRejectingId] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  function handleApprove(id: number) {
    manageSubscription.mutate(
      { id, action: "approve" },
      {
        onSuccess: () => toast.success("Subscription approved!"),
        onError: (err) => toast.error(getErrorMessage(err, "Failed")),
      }
    );
  }

  function openReject(id: number) {
    setRejectingId(id);
    setRejectReason("");
    setRejectDialog(true);
  }

  function handleReject() {
    if (!rejectingId) return;
    manageSubscription.mutate(
      { id: rejectingId, action: "reject", reason: rejectReason },
      {
        onSuccess: () => {
          toast.success("Subscription rejected");
          setRejectDialog(false);
        },
        onError: (err) => toast.error(getErrorMessage(err, "Failed")),
      }
    );
  }

  function handleExpire(id: number) {
    manageSubscription.mutate(
      { id, action: "expire" },
      {
        onSuccess: () => toast.success("Subscription marked as expired"),
        onError: (err) => toast.error(getErrorMessage(err, "Failed")),
      }
    );
  }

  function handleChatSeller(sellerId: number) {
    startChat.mutate(
      { sellerId },
      {
        onSuccess: (data) => navigate(`/admin/messages?conversation=${data.conversation_id}`),
        onError: (err) => toast.error(getErrorMessage(err, "Failed to start chat")),
      }
    );
  }

  return (
    <AdminLayout>
      <Helmet>
        <title>Subscription Management | Admin</title>
      </Helmet>

      <div className="space-y-6">
        <PageHeader
          title="Subscription Management"
          subtitle="Review and manage seller subscription requests"
        />

        {/* Status Tabs */}
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filter subscriptions by status">
          {statusTabs.map((tab) => (
            <Button
              key={tab || "all"}
              variant={activeTab === tab ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveTab(tab)}
              aria-pressed={activeTab === tab}
            >
              {tab || "All"}
            </Button>
          ))}
        </div>

        {/* Subscriptions Table */}
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <TableSkeleton cols={7} className="p-6" />
            ) : isError ? (
              <ErrorState className="py-12" onRetry={() => void refetch()} />
            ) : !subscriptions?.length ? (
              <EmptyState
                icon={Inbox}
                title="No subscriptions found"
                description={
                  activeTab
                    ? `No ${activeTab.toLowerCase()} subscriptions right now.`
                    : "Seller subscription requests will appear here."
                }
                action={
                  activeTab && (
                    <Button variant="outline" size="sm" onClick={() => setActiveTab("")}>
                      Show all
                    </Button>
                  )
                }
              />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Seller</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="hidden md:table-cell">Start Date</TableHead>
                    <TableHead className="hidden md:table-cell">End Date</TableHead>
                    <TableHead className="hidden md:table-cell">Approved By</TableHead>
                    <TableHead className="hidden lg:table-cell">Requested</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {subscriptions.map((sub) => (
                    <TableRow key={sub.id}>
                      <TableCell>
                        <div>
                          <p className="text-sm font-medium text-foreground">{sub.seller_name}</p>
                          <p className="text-xs text-muted-foreground">{sub.seller_email}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={sub.status} kind="subscription" />
                      </TableCell>
                      <TableCell className="hidden text-sm text-muted-foreground md:table-cell">
                        {sub.start_date ? formatDate(sub.start_date) : "—"}
                      </TableCell>
                      <TableCell className="hidden text-sm text-muted-foreground md:table-cell">
                        {sub.end_date ? formatDate(sub.end_date) : "—"}
                      </TableCell>
                      <TableCell className="hidden text-sm text-muted-foreground md:table-cell">
                        {sub.approved_by_name || "—"}
                      </TableCell>
                      <TableCell className="hidden text-sm text-muted-foreground lg:table-cell">
                        {formatDate(sub.created_at)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {sub.status === "Pending" && (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-emerald-600 hover:bg-emerald-500/10 hover:text-emerald-700 dark:text-emerald-400"
                                onClick={() => handleApprove(Number(sub.id))}
                                title="Approve"
                                aria-label={`Approve subscription for ${sub.seller_name}`}
                                disabled={manageSubscription.isPending}
                              >
                                <CheckCircle className="h-4 w-4" aria-hidden="true" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                                onClick={() => openReject(Number(sub.id))}
                                title="Reject"
                                aria-label={`Reject subscription for ${sub.seller_name}`}
                              >
                                <XCircle className="h-4 w-4" aria-hidden="true" />
                              </Button>
                            </>
                          )}
                          {sub.status === "Active" && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-orange-500 hover:bg-orange-500/10 hover:text-orange-600"
                              onClick={() => handleExpire(Number(sub.id))}
                              title="Mark as expired"
                              aria-label={`Mark ${sub.seller_name}'s subscription as expired`}
                              disabled={manageSubscription.isPending}
                            >
                              <Clock className="h-4 w-4" aria-hidden="true" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleChatSeller(Number(sub.seller_id))}
                            title="Chat with seller"
                            aria-label={`Chat with ${sub.seller_name}`}
                          >
                            <MessageCircle className="h-4 w-4" aria-hidden="true" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Reject Dialog */}
      <Dialog open={rejectDialog} onOpenChange={setRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Subscription</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="reject-reason">Reason (optional)</Label>
              <Textarea
                id="reject-reason"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Explain why this subscription is being rejected..."
                rows={3}
              />
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setRejectDialog(false)}>Cancel</Button>
              <Button
                variant="destructive"
                onClick={handleReject}
                disabled={manageSubscription.isPending}
              >
                {manageSubscription.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
                Reject
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
