import { getErrorMessage } from "@/lib/errors";
import { Helmet } from "react-helmet-async";
import { useNavigate } from "react-router-dom";
import { SellerLayout } from "@/components/seller/SellerLayout";
import { useSellerSubscription, useRequestSubscription, useStartAdminConversation } from "@/hooks/useSubscription";
import SubscriptionPaymentPanel from "@/components/seller/SubscriptionPaymentPanel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { StatusBadge } from "@/components/StatusBadge";
import { SubscriptionCountdown } from "@/components/SubscriptionCountdown";
import { formatDate, formatPrice } from "@/lib/format";
import { toast } from "sonner";
import { CreditCard, Clock, MessageCircle, Loader2, CalendarClock } from "lucide-react";

export default function SellerSubscription() {
  const navigate = useNavigate();
  const { data, isLoading, isError, refetch } = useSellerSubscription();
  const requestMutation = useRequestSubscription();
  const startChat = useStartAdminConversation();

  const subscription = data?.subscription;
  const gcashNumber = data?.gcash_number ?? "";
  // A live payment is anything while the request itself is still Pending.
  const hasLivePayment =
    subscription?.status === "Pending" &&
    ["pending", "awaiting_confirmation", "rejected"].includes(subscription.payment_status);
  // What the seller would pay next: the current platform price, except while
  // a Pending/Active record exists, where the amount stored on that row is
  // the one that matters (price changes only apply to new requests).
  const platformPrice = Number(data?.subscription_price) || 299;
  const price =
    subscription?.payment_amount &&
    (subscription.status === "Pending" || subscription.status === "Active")
      ? Number(subscription.payment_amount)
      : platformPrice;

  function handleRequestSubscription() {
    requestMutation.mutate(undefined, {
      onSuccess: () => toast.success("Subscription started! Send the GCash payment below to activate it."),
      onError: (err) => toast.error(getErrorMessage(err, "Failed to request subscription")),
    });
  }

  function handleChatWithAdmin() {
    startChat.mutate(undefined, {
      onSuccess: (data) => {
        navigate(`/seller/messages?conversation=${data.conversation_id}`);
      },
      onError: (err) => toast.error(getErrorMessage(err, "Failed to start chat")),
    });
  }

  return (
    <SellerLayout>
      <Helmet>
        <title>Subscription | Seller Hub</title>
      </Helmet>

      <div className="mx-auto w-full max-w-6xl space-y-6 pt-4 lg:pt-6">
        <PageHeader
          title="Seller Subscription"
          subtitle="Manage your subscription to sell products"
        />

        {isLoading ? (
          <Skeleton className="h-64 w-full" aria-hidden="true" />
        ) : isError ? (
          <ErrorState title="We couldn't load your subscription" onRetry={() => void refetch()} />
        ) : (
          <div className="grid gap-6 lg:grid-cols-5">
            {/* Subscription Details */}
            <Card className="shadow-soft lg:col-span-3">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 font-display text-lg">
                  <CreditCard className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
                  Subscription Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                {subscription ? (
                  <div className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
                    <div>
                      <p className="text-sm text-muted-foreground">Status</p>
                      <div className="mt-1.5">
                        <StatusBadge status={subscription.status} kind="subscription" />
                      </div>
                    </div>

                    {subscription.status === "Active" && subscription.start_date && subscription.end_date && (
                      <>
                        <div>
                          <p className="text-sm text-muted-foreground">Start Date</p>
                          <p className="mt-1 text-sm font-medium text-foreground">
                            {formatDate(subscription.start_date, true)}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Expires</p>
                          <p className="mt-1 text-sm font-medium text-foreground">
                            {formatDate(subscription.end_date, true)}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Time Remaining</p>
                          <p className="mt-1 text-sm font-bold text-primary">
                            <SubscriptionCountdown endDate={subscription.end_date} />
                          </p>
                        </div>
                      </>
                    )}

                    <div>
                      <p className="text-sm text-muted-foreground">Price</p>
                      <p className="mt-1 text-lg font-bold text-primary">{formatPrice(price)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Duration</p>
                      <p className="mt-1 text-sm font-medium text-foreground">30 Days</p>
                    </div>
                  </div>
                ) : (
                  <EmptyState
                    dense
                    icon={CalendarClock}
                    title="You have no subscription yet"
                    description="Subscribe to unlock product selling features."
                  />
                )}

                {subscription?.status === "Rejected" && subscription.rejection_reason && (
                  <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3">
                    <p className="text-sm text-muted-foreground">Reason:</p>
                    <p className="text-sm text-foreground">{subscription.rejection_reason}</p>
                  </div>
                )}

                {subscription?.status === "Pending" && !hasLivePayment && (
                  <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3">
                    <p className="text-sm text-muted-foreground">
                      Your payment has been received. The admin is verifying it - your
                      subscription activates as soon as they confirm.
                    </p>
                  </div>
                )}

                {hasLivePayment && subscription && gcashNumber && (
                  <SubscriptionPaymentPanel subscription={subscription} gcashNumber={gcashNumber} />
                )}

                {hasLivePayment && subscription && !gcashNumber && (
                  <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3">
                    <p className="text-sm text-muted-foreground">
                      Subscription payments are not configured yet. Please chat with the
                      admin to arrange payment.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Action Buttons + How it works */}
            <div className="space-y-6 lg:col-span-2">
              <div className="space-y-3">
                {(!subscription || subscription.status === "Expired" || subscription.status === "Rejected") && (
                  <Button
                    variant="gold"
                    className="w-full"
                    onClick={handleRequestSubscription}
                    disabled={requestMutation.isPending}
                  >
                    {requestMutation.isPending ? (
                      <><Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />Requesting...</>
                    ) : (
                      <><CreditCard className="mr-2 h-4 w-4" aria-hidden="true" />Subscribe Now — {formatPrice(price)}</>
                    )}
                  </Button>
                )}

                <Button
                  variant="teal"
                  className="w-full"
                  onClick={handleChatWithAdmin}
                  disabled={startChat.isPending}
                >
                  {startChat.isPending ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />Opening chat...</>
                  ) : (
                    <><MessageCircle className="mr-2 h-4 w-4" aria-hidden="true" />Chat with Admin</>
                  )}
                </Button>
              </div>

              {/* Info */}
              <Card className="shadow-soft">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 font-display text-base">
                    <Clock className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                    How it works
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ol className="list-decimal space-y-2 pl-5 text-sm text-muted-foreground">
                    <li>Click "Subscribe Now" to start your 30-day subscription.</li>
                    <li>Send the payment via GCash to the number shown in the panel.</li>
                    <li>Paste your GCash reference number and mark it as sent.</li>
                    <li>The admin verifies the reference and confirms your payment.</li>
                    <li>Your subscription activates and you can start selling!</li>
                  </ol>
                  <p className="mt-3 text-xs text-muted-foreground">
                    Trouble with the transfer? Use Chat with Admin to sort it out.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </SellerLayout>
  );
}