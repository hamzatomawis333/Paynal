import { useState, useEffect, useMemo } from "react";
import { getErrorMessage } from "@/lib/errors";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { Helmet } from "react-helmet-async";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import PhilippineAddressSelect from "@/components/checkout/PhilippineAddressSelect";
import {
  EMPTY_ADDRESS,
  formatAddress,
  isAddressComplete,
  type PhilippineAddress,
} from "@/lib/phl-address";
import { useCart } from "@/context/CartContext";
import { apiFetch, isLoggedIn } from "@/lib/api";
import GcashPaymentPanel from "@/components/checkout/GcashPaymentPanel";
import { newIdempotencyKey } from "@/lib/payments-api";
import { formatPrice } from "@/lib/format";
import { toast } from "sonner";
import { ShoppingBag, MapPin, CreditCard, Wallet, Loader2, CheckCircle, TriangleAlert } from "lucide-react";

const GCASH_CODE = "gcash";

const iconMap: Record<string, React.ElementType> = {
  cod: Wallet,
  gcash: Wallet,
  bank_transfer: Wallet,
  credit_card: CreditCard,
  paypal: Wallet,
};

interface PaymentMethod {
  id: number;
  name: string;
  code: string;
  description: string;
  icon: string;
}

const Checkout = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  // Only the ticked items are ordered. Unchecked items stay in the cart, so the
// summary here must never total the whole cart.
  const { selectedItems, selectedTotalPrice, removeItems, clearSelection } = useCart();
  const shippingFee = selectedTotalPrice >= 3000 ? 0 : 150;
  const grandTotal = selectedTotalPrice + shippingFee;

  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<{
    order_id: number;
    order_number: string;
    grand_total: number;
    seller_count: number;
  } | null>(null);

  const [address, setAddress] = useState<PhilippineAddress>(EMPTY_ADDRESS);
  const [notes, setNotes] = useState("");

  // One key per checkout attempt. A double-click or a retry resends the same
  // key, and the server then returns the original order instead of creating a
  // second one and decrementing stock twice.
  const [idempotencyKey, setIdempotencyKey] = useState(() => newIdempotencyKey());

  const addressComplete = isAddressComplete(address);
  const canSubmit = addressComplete;

  useEffect(() => {
    if (!isLoggedIn()) {
      toast.error("Please login first");
      navigate("/auth");
      return;
    }
    // Nothing ticked means there is nothing to pay for; send the buyer back to
    // the cart rather than showing an empty order summary.
    if (selectedItems.length === 0 && !success) {
      toast.error("Select the items you want to buy first");
      navigate("/cart");
      return;
    }
    // Only GCash is offered at checkout; other active methods are ignored.
    apiFetch<{ payment_methods: PaymentMethod[] }>("/products/payment-methods.php")
      .then((data) => {
        setPaymentMethods(data.payment_methods.filter((pm) => pm.code === GCASH_CODE));
      })
      .catch(() => {
        setPaymentMethods([]);
      })
      .finally(() => setLoading(false));
  }, []);

  const gcashAvailable = useMemo(
    () => paymentMethods.some((pm) => pm.code === GCASH_CODE),
    [paymentMethods],
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedItems.length === 0) {
      toast.error("Select the items you want to buy first");
      navigate("/cart");
      return;
    }
    if (!addressComplete) {
      toast.error("Please complete the region, province, city and barangay");
      return;
    }
    if (!gcashAvailable) {
      toast.error("GCash is currently unavailable. Please try again later.");
      return;
    }

    setSubmitting(true);
    try {
      const data = await apiFetch<{
        success: boolean;
        duplicate?: boolean;
        order: { id: number; order_number: string; grand_total: number };
        payment_groups?: { seller_id: number | null }[];
      }>("/orders/index.php", {
        method: "POST",
        body: JSON.stringify({
          // The server composes orders.shipping_address from these parts, so
          // the client never gets to choose the stored address line.
          address: {
            region: address.region,
            province: address.province,
            city: address.city,
            barangay: address.barangay,
          },
          payment_method: GCASH_CODE,
          notes,
          idempotency_key: idempotencyKey,
          items: selectedItems.map((item) => ({
            product_id: item.id,
            quantity: item.quantity,
          })),
        }),
      });

      // Only the ordered items leave the cart. Anything the buyer left
      // unticked stays behind for a later order.
      const orderedIds = selectedItems.map((i) => i.id);
      removeItems(orderedIds);
      clearSelection();

      // The new order now exists on the server, so the buyer's order list and
      // payment history must not serve a stale cache.
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["buyer-orders"] }),
        queryClient.invalidateQueries({ queryKey: ["buyer-payments"] }),
      ]);

      setSuccess({
        order_id: data.order.id,
        order_number: data.order.order_number,
        grand_total: data.order.grand_total,
        seller_count: data.payment_groups?.length ?? 1,
      });
      toast.success(
        data.duplicate ? "This order was already placed" : "Order placed successfully!"
      );
    } catch (err) {
      toast.error(getErrorMessage(err, "Failed to place order"));
    } finally {
      setSubmitting(false);
    }
  };

  // Success state
  if (success) {
    return (
      <>
        <Helmet><title>Order Confirmed | LanaoCrafts</title></Helmet>
        <div className="min-h-screen">
          <Navbar />
          <main className="container mx-auto max-w-2xl px-4 py-10">
            <Card className="mb-6 text-center">
              <CardContent className="p-8">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                  <CheckCircle className="h-8 w-8 text-primary" />
                </div>
                <h1 className="font-display text-2xl font-bold text-foreground">Order Confirmed!</h1>
                <p className="mt-2 text-muted-foreground">
                  Your order <span className="font-semibold text-foreground">{success.order_number}</span> has been placed.
                </p>
                <p className="mt-1 text-lg font-bold text-primary">{formatPrice(success.grand_total)}</p>
                <p className="mt-3 text-sm text-muted-foreground">
                  Complete your GCash payment below to confirm your order.
                </p>
                <div className="mt-6 flex gap-3 justify-center">
                  <Button variant="outline" onClick={() => navigate("/products")}>Continue Shopping</Button>
                  <Button variant="gold" onClick={() => navigate("/account/orders")}>View Orders</Button>
                </div>
              </CardContent>
            </Card>

            <GcashPaymentPanel
              orderId={success.order_id}
              sellerCount={success.seller_count}
            />
          </main>
          <Footer />
        </div>
      </>
    );
  }

  return (
    <>
      <Helmet><title>Checkout | LanaoCrafts</title></Helmet>
      <div className="min-h-screen">
        <Navbar />
        <main className="container mx-auto px-4 py-8">
          <h1 className="mb-8 font-display text-3xl font-bold">
            Check<span className="text-primary">out</span>
          </h1>

          <form onSubmit={handleSubmit} className="grid gap-8 lg:grid-cols-3">
            {/* Left: Shipping + Payment */}
            <div className="lg:col-span-2 space-y-6">
              {/* Shipping Address */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <MapPin className="h-5 w-5 text-primary" />
                    Shipping Address
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <PhilippineAddressSelect
                    value={address}
                    onChange={setAddress}
                    disabled={submitting}
                  />

                  {addressComplete && (
                    <div className="rounded-md border border-border bg-muted/40 p-3">
                      <p className="text-xs font-medium text-muted-foreground">
                        Delivering to
                      </p>
                      <p className="mt-1 text-sm text-foreground">
                        {formatAddress(address)}
                      </p>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="order-notes">Order Notes (optional)</Label>
                    <Input
                      id="order-notes"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Special instructions, landmarks, etc."
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Payment Method */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <CreditCard className="h-5 w-5 text-primary" />
                    Payment Method
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="flex items-center gap-2 py-4 text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" /> Loading payment options...
                    </div>
                  ) : !gcashAvailable ? (
                    <div className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
                      <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
                      <p>
                        GCash is not currently available. Please try again later or
                        contact us to place your order.
                      </p>
                    </div>
                  ) : (
                    <RadioGroup value={GCASH_CODE} className="space-y-3">
                      {paymentMethods.map((pm) => {
                        const Icon = iconMap[pm.icon] || Wallet;
                        return (
                          <label
                            key={pm.code}
                            className="flex cursor-pointer items-center gap-4 rounded-lg border border-primary bg-primary/5 p-4"
                          >
                            <RadioGroupItem value={pm.code} />
                            <div className="rounded-md bg-muted p-2">
                              <Icon className="h-5 w-5 text-primary" />
                            </div>
                            <div className="flex-1">
                              <p className="font-medium text-foreground">{pm.name}</p>
                              <p className="text-sm text-muted-foreground">{pm.description}</p>
                            </div>
                          </label>
                        );
                      })}
                    </RadioGroup>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Right: Order Summary */}
            <div>
              <Card className="sticky top-24">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <ShoppingBag className="h-5 w-5 text-primary" />
                    Order Summary
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Items */}
                  <div className="max-h-64 space-y-3 overflow-y-auto">
                    {selectedItems.map((item) => (
                      <div key={item.id} className="flex items-center gap-3">
                        <img src={item.image} alt={item.name} className="h-12 w-12 rounded-md object-cover" />
                        <div className="flex-1 min-w-0">
                          <p className="truncate text-sm font-medium text-foreground">{item.name}</p>
                          <p className="text-xs text-muted-foreground">Qty: {item.quantity}</p>
                        </div>
                        <p className="text-sm font-medium text-foreground">{formatPrice(item.price * item.quantity)}</p>
                      </div>
                    ))}
                  </div>

                  <div className="border-t border-border pt-3 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span className="text-foreground">{formatPrice(selectedTotalPrice)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Shipping</span>
                      <span className="text-foreground">{shippingFee === 0 ? "Free" : formatPrice(shippingFee)}</span>
                    </div>
                    <div className="flex justify-between font-display text-lg font-bold border-t border-border pt-2">
                      <span className="text-foreground">Total</span>
                      <span className="text-primary">{formatPrice(grandTotal)}</span>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    variant="hero"
                    className="w-full"
                    disabled={submitting || loading || !canSubmit || !gcashAvailable || selectedItems.length === 0}
                  >
                    {submitting ? (
                      <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Placing Order...</>
                    ) : (
                      `Place Order — ${formatPrice(grandTotal)}`
                    )}
                  </Button>

                  <p className="text-center text-xs text-muted-foreground">
                    Free shipping on orders over ₱3,000
                  </p>
                </CardContent>
              </Card>
            </div>
          </form>
        </main>
        <Footer />
      </div>
    </>
  );
};

export default Checkout;
