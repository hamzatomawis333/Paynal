import { BuyerLayout } from "@/components/buyer/BuyerLayout";
import { useBuyerPayments } from "@/hooks/useBuyer";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { StatusBadge } from "@/components/StatusBadge";
import { formatPrice, formatDate } from "@/lib/format";
import { CreditCard } from "lucide-react";
import { Link } from "react-router-dom";

export default function BuyerPayments() {
  const { data: payments, isLoading } = useBuyerPayments();

  return (
    <BuyerLayout>
      <div className="space-y-6">
        <PageHeader
          title="Payment Information"
          subtitle="View your payment history and details"
        />

        {isLoading ? (
          <div className="space-y-4" role="status" aria-label="Loading payments">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 w-full" aria-hidden="true" />)}
          </div>
        ) : !payments?.length ? (
          <Card className="shadow-soft">
            <CardContent>
              <EmptyState
                dense
                icon={CreditCard}
                title="No payment records yet"
                description="Payments you submit for your orders will be listed here."
                action={
                  <Button asChild size="sm" variant="outline">
                    <Link to="/account/orders">Go to my orders</Link>
                  </Button>
                }
              />
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {payments.map((payment) => (
              <Card key={payment.id} className="shadow-soft">
                <CardContent className="p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-medium text-foreground">{payment.order_number}</p>
                      <p className="text-xs text-muted-foreground">{formatDate(payment.created_at, true)}</p>
                      <p className="mt-1 text-xs capitalize text-muted-foreground">
                        Method: {payment.payment_method === "cod" ? "Cash on Delivery" : "Online Payment"}
                      </p>
                    </div>
                    <div className="space-y-1 text-right">
                      <p className="text-lg font-bold tabular-nums text-foreground">
                        {formatPrice(parseFloat(payment.amount))}
                      </p>
                      <div className="flex flex-wrap justify-end gap-2">
                        <StatusBadge status={payment.status} kind="payment" audience="buyer" />
                        <StatusBadge status={payment.order_status} kind="order" />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </BuyerLayout>
  );
}
