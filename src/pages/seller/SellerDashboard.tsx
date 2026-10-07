import { useNavigate } from "react-router-dom";
import { getErrorMessage } from "@/lib/errors";
import { SellerLayout } from "@/components/seller/SellerLayout";
import { useSellerDashboard } from "@/hooks/useSeller";
import { useSellerSubscription, useStartAdminConversation } from "@/hooks/useSubscription";
import { useAuth } from "@/context/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { StatusBadge } from "@/components/StatusBadge";
import { SubscriptionCountdown } from "@/components/SubscriptionCountdown";
import { formatPrice, formatDate } from "@/lib/format";
import { Package, ShoppingCart, TrendingUp, Clock, CreditCard, MessageCircle, Loader2, CheckCircle, Inbox, Wallet } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

export default function SellerDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data, isLoading, isError, refetch } = useSellerDashboard();
  const { data: subData, isLoading: subLoading } = useSellerSubscription();
  const startChat = useStartAdminConversation();

  const subscription = subData?.subscription;
  const hasActive = subData?.has_active_subscription ?? false;
  const firstName = user?.full_name?.trim().split(/\s+/)[0] || "there";

  const stats = [
    {
      label: "Total Products",
      value: data?.total_products ?? 0,
      icon: Package,
      color: "text-primary",
      bg: "bg-primary/10",
    },
    {
      label: "Total Orders",
      value: data?.total_orders ?? 0,
      icon: ShoppingCart,
      color: "text-accent",
      bg: "bg-accent/10",
    },
    {
      label: "Total Sales",
      value: formatPrice(Number(data?.total_sales ?? 0)),
      icon: TrendingUp,
      color: "text-emerald-600 dark:text-emerald-400",
      bg: "bg-emerald-500/10",
    },
  ];

  function handleChatAdmin() {
    startChat.mutate(undefined, {
      onSuccess: (d) => navigate(`/seller/messages?conversation=${d.conversation_id}`),
      onError: (e) => toast.error(getErrorMessage(e, "Failed")),
    });
  }

  return (
    <SellerLayout>
      <div className="space-y-6">
        <PageHeader
          title={`Welcome back, ${firstName}`}
          subtitle="Here's your store summary."
        />

        {/* Subscription Card */}
        {subLoading ? (
          <Skeleton className="h-32 w-full" aria-hidden="true" />
        ) : (
          <Card className={`shadow-soft ${!hasActive ? "border-amber-500/40 bg-amber-500/10" : ""}`}>
            <CardContent className="p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5 text-primary" aria-hidden="true" />
                    <h3 className="font-display font-semibold text-foreground">Seller Subscription</h3>
                  </div>
                  {subscription ? (
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">Status:</span>
                        <StatusBadge status={subscription.status} kind="subscription" />
                      </div>
                      {subscription.status === "Active" && subscription.end_date && (
                        <>
                          <div className="flex items-center gap-2 text-sm">
                            <span className="text-muted-foreground">Expires:</span>
                            <span className="font-medium text-foreground">
                              {formatDate(subscription.end_date, true)}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <span className="text-muted-foreground">Time Remaining:</span>
                            <span className="font-bold text-primary">
                              <SubscriptionCountdown endDate={subscription.end_date} />
                            </span>
                          </div>
                        </>
                      )}
                      {(subscription.status === "Expired" || subscription.status === "Rejected") && (
                        <p className="text-sm text-muted-foreground">
                          {subscription.status === "Expired"
                            ? "Your subscription has expired. Please renew."
                            : "Your subscription was rejected. Please contact admin."}
                        </p>
                      )}
                      {subscription.status === "Pending" && (
                        <p className="text-sm text-muted-foreground">
                          {subscription.payment_status === "awaiting_confirmation"
                            ? "Payment sent - waiting for the admin to verify it."
                            : "Complete your GCash payment to activate your subscription."}
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      You have no subscription. Subscribe to start selling products.
                    </p>
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  {(!subscription || subscription.status === "Expired" || subscription.status === "Rejected") && (
                    <Button variant="gold" size="sm" onClick={() => navigate("/seller/subscription")}>
                      Subscribe — {formatPrice(Number(subData?.subscription_price) || 299)}
                    </Button>
                  )}
                  {subscription?.status === "Active" && (
                    <Button variant="outline" size="sm" onClick={() => navigate("/seller/subscription")}>
                      <CheckCircle className="mr-1 h-3 w-3" aria-hidden="true" /> View Details
                    </Button>
                  )}
                  {(!hasActive) && (
                    <Button variant="teal" size="sm" onClick={handleChatAdmin} disabled={startChat.isPending}>
                      {startChat.isPending ? (
                        <Loader2 className="mr-1 h-3 w-3 animate-spin" aria-hidden="true" />
                      ) : (
                        <MessageCircle className="mr-1 h-3 w-3" aria-hidden="true" />
                      )}
                      Chat with Admin
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {isError && (
          <ErrorState title="We couldn't load your dashboard" onRetry={() => void refetch()} />
        )}

        {/* Stats Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {stats.map((stat) => (
            <Card key={stat.label} className="shadow-soft">
              <CardContent className="flex items-center gap-4 p-6">
                {isLoading ? (
                  <Skeleton className="h-16 w-full" aria-hidden="true" />
                ) : (
                  <>
                    <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${stat.bg}`}>
                      <stat.icon className={`h-6 w-6 ${stat.color}`} aria-hidden="true" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm text-muted-foreground">{stat.label}</p>
                      <p className="truncate text-2xl font-bold tabular-nums text-foreground">{stat.value}</p>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Recent Orders */}
        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-display text-lg">
              <Clock className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
              Recent Orders
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3" role="status" aria-label="Loading recent orders">
                {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full" aria-hidden="true" />)}
              </div>
            ) : !data?.recent_orders?.length ? (
              <EmptyState
                dense
                icon={Inbox}
                title="No orders yet"
                description="Orders from buyers will appear here as soon as they come in."
              />
            ) : (
              <div className="space-y-3">
                {data.recent_orders.map((order) => (
                  <div
                    key={order.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border p-3"
                  >
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        Order #{order.id}
                      </p>
                      <p className="text-xs text-muted-foreground">{order.customer_name}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1 text-sm font-semibold tabular-nums text-foreground">
                        <Wallet className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
                        {formatPrice(parseFloat(order.total_amount))}
                      </span>
                      <StatusBadge status={order.status} kind="order" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </SellerLayout>
  );
}
