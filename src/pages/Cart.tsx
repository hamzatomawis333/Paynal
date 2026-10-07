import { Link, useNavigate } from "react-router-dom";
import { useMemo } from "react";
import { Helmet } from "react-helmet-async";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useCart } from "@/context/CartContext";
import { formatPrice } from "@/lib/format";
import { toast } from "sonner";
import {
  Minus, Plus, Trash2, ShoppingBag, ArrowRight, Store,
} from "lucide-react";
import type { CartItem } from "@/types/product";

/**
 * Marketplace-style cart.
 *
 * Items are grouped into per-seller (artisan) sections so the buyer sees how
 * much they owe each shop — it mirrors the multi-seller GCash workflow where
 * every vendor is paid separately. Cart state and selection logic live in
 * CartContext; this page only presents it.
 */

const Cart = () => {
  const navigate = useNavigate();
  const {
    items, removeFromCart, updateQuantity, clearCart,
    selectedItems, selectedTotalPrice, selectedCount,
    isSelected, toggleSelected, selectAll, clearSelection, removeItems,
  } = useCart();

  const shipping = selectedTotalPrice >= 3000 || selectedTotalPrice === 0 ? 0 : 150;
  const allSelected = items.length > 0 && selectedItems.length === items.length;
  // Radix Checkbox is controlled via checked; this covers every mixed state.
  const selectAllState = allSelected ? true : selectedItems.length > 0 ? "indeterminate" : false;

  // Preserve first-appearance order of shops while grouping items.
  const groups = useMemo(() => {
    const byShop = new Map<string, CartItem[]>();
    for (const item of items) {
      const shop = item.artisan || "Seller";
      const bucket = byShop.get(shop);
      if (bucket) bucket.push(item);
      else byShop.set(shop, [item]);
    }
    return Array.from(byShop.entries());
  }, [items]);

  const toggleGroup = (shop: string) => {
    const group = items.filter((i) => (i.artisan || "Seller") === shop);
    const selectedInGroup = group.filter((i) => isSelected(i.id)).length;
    if (selectedInGroup === group.length) {
      group.forEach((i) => {
        if (isSelected(i.id)) toggleSelected(i.id);
      });
    } else {
      group.forEach((i) => {
        if (!isSelected(i.id)) toggleSelected(i.id);
      });
    }
  };

  const handleRemoveSelected = () => {
    if (selectedItems.length === 0) return;
    if (!confirm(`Remove ${selectedItems.length} selected item${selectedItems.length === 1 ? "" : "s"}?`)) return;
    removeItems(selectedItems.map((i) => i.id));
    toast.info("Selected item(s) removed");
  };

  const handleClearCart = () => {
    if (!confirm("Remove everything from your cart?")) return;
    clearCart();
  };

  const handleCheckout = () => {
    if (selectedItems.length === 0) {
      toast.error("Select at least one item to check out");
      return;
    }
    navigate("/checkout");
  };

  if (items.length === 0) {
    return (
      <>
        <Helmet>
          <title>Shopping Cart | Paynal</title>
        </Helmet>
        <div className="min-h-screen">
          <Navbar />
          <main className="container mx-auto flex min-h-[60vh] items-center justify-center px-4">
            <div className="text-center">
              <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-secondary">
                <ShoppingBag className="h-12 w-12 text-muted-foreground" aria-hidden="true" />
              </div>
              <h1 className="font-display text-2xl font-bold">Your cart is empty</h1>
              <p className="mt-2 text-muted-foreground">
                Looks like you haven't added any treasures yet.
              </p>
              <Button asChild variant="gold" className="mt-6">
                <Link to="/products">
                  Continue Shopping
                  <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
                </Link>
              </Button>
            </div>
          </main>
          <Footer />
        </div>
      </>
    );
  }

  return (
    <>
      <Helmet>
        <title>{`Shopping Cart (${items.length}) | Paynal`}</title>
      </Helmet>

      <div className="min-h-screen">
        <Navbar />
        <main className="container mx-auto px-4 py-8 pb-28 lg:pb-8">
          <h1 className="mb-6 font-display text-3xl font-bold">
            Shopping <span className="text-primary">Cart</span>
          </h1>

          <div className="grid gap-6 lg:grid-cols-3">
            {/* Cart items */}
            <div className="lg:col-span-2">
              {/* Select-all toolbar */}
              <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card px-4 py-3 shadow-soft">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="select-all"
                    checked={selectAllState}
                    onCheckedChange={(v) => (v === true ? selectAll() : clearSelection())}
                  />
                  <Label htmlFor="select-all" className="cursor-pointer font-medium">
                    Select All
                  </Label>
                </div>
                <p className="text-sm text-muted-foreground">
                  {selectedItems.length} of {items.length} selected
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                  disabled={selectedItems.length === 0}
                  onClick={handleRemoveSelected}
                >
                  <Trash2 className="mr-2 h-4 w-4" aria-hidden="true" />
                  Remove Selected
                </Button>
              </div>

              {/* Seller groups */}
              <div className="space-y-5">
                {groups.map(([shop, shopItems]) => (
                  <ShopGroup
                    key={shop}
                    shop={shop}
                    items={shopItems}
                    isSelected={isSelected}
                    onToggleGroup={() => toggleGroup(shop)}
                    onToggleItem={toggleSelected}
                    onRemove={removeFromCart}
                    onUpdateQuantity={updateQuantity}
                  />
                ))}
              </div>

              <div className="mt-5">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground hover:text-destructive"
                  onClick={handleClearCart}
                >
                  <Trash2 className="mr-2 h-4 w-4" aria-hidden="true" />
                  Clear Cart
                </Button>
              </div>
            </div>

            {/* Order summary (desktop) */}
            <div className="hidden lg:block">
              <Card className="sticky top-24 p-6 shadow-soft">
                <h2 className="font-display text-xl font-semibold">Order Summary</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {selectedItems.length === 0
                    ? "No items selected yet"
                    : `${selectedCount} item${selectedCount === 1 ? "" : "s"} selected`}
                </p>
                <div className="mt-4 space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span className="tabular-nums">{formatPrice(selectedTotalPrice)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Shipping</span>
                    <span className="tabular-nums">{shipping === 0 ? "Free" : formatPrice(shipping)}</span>
                  </div>
                  <div className="border-t border-border pt-3">
                    <div className="flex justify-between font-display text-lg font-bold">
                      <span>Total</span>
                      <span className="tabular-nums text-primary">
                        {formatPrice(selectedTotalPrice + shipping)}
                      </span>
                    </div>
                  </div>
                </div>
                <Button
                  variant="hero"
                  className="mt-6 w-full"
                  disabled={selectedItems.length === 0}
                  onClick={handleCheckout}
                >
                  Proceed to Checkout
                  {selectedItems.length > 0 && ` (${selectedCount})`}
                </Button>
                {selectedItems.length === 0 && (
                  <p className="mt-3 text-center text-xs text-destructive">
                    Tick the items you want to buy to continue.
                  </p>
                )}
                <p className="mt-4 text-center text-xs text-muted-foreground">
                  Free shipping on orders over ₱3,000
                </p>
              </Card>
            </div>
          </div>
        </main>

        {/* Sticky checkout bar (mobile / tablet) */}
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 px-4 py-3 backdrop-blur lg:hidden">
          <div className="mx-auto flex max-w-3xl items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">
                {selectedItems.length === 0 ? "No items selected" : `${selectedCount} item${selectedCount === 1 ? "" : "s"} selected`}
              </p>
              <p className="truncate font-display text-lg font-bold text-primary tabular-nums">
                {formatPrice(selectedTotalPrice + shipping)}
              </p>
            </div>
            <Button
              variant="hero"
              onClick={handleCheckout}
              disabled={selectedItems.length === 0}
            >
              Checkout
              <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
            </Button>
          </div>
        </div>

        <Footer />
      </div>
    </>
  );
};

/** One seller's section: header, product rows, shop subtotal. */
function ShopGroup({
  shop,
  items,
  isSelected,
  onToggleGroup,
  onToggleItem,
  onRemove,
  onUpdateQuantity,
}: {
  shop: string;
  items: CartItem[];
  isSelected: (id: string) => boolean;
  onToggleGroup: () => void;
  onToggleItem: (id: string) => void;
  onRemove: (id: string) => void;
  onUpdateQuantity: (id: string, quantity: number) => void;
}) {
  const selectedInGroup = items.filter((i) => isSelected(i.id)).length;
  const groupAll = selectedInGroup === items.length;
  const groupState = groupAll ? true : selectedInGroup > 0 ? ("indeterminate" as const) : false;
  const groupSubtotal = items
    .filter((i) => isSelected(i.id))
    .reduce((sum, i) => sum + i.price * i.quantity, 0);

  return (
    <section
      aria-label={`Shop: ${shop}`}
      className="overflow-hidden rounded-lg border border-border bg-card shadow-soft"
    >
      {/* Shop header */}
      <div className="flex items-center gap-3 border-b border-border px-4 py-3">
        <Checkbox
          id={`shop-${shop}`}
          checked={groupState}
          onCheckedChange={() => onToggleGroup()}
          aria-label={`Select all items from ${shop}`}
        />
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
          <Store className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium text-foreground">{shop}</p>
          <p className="text-xs text-muted-foreground">{items.length} item{items.length === 1 ? "" : "s"}</p>
        </div>
        <p className="text-sm text-muted-foreground sm:hidden">
          {selectedInGroup === 0 ? "" : `${selectedInGroup} selected`}
        </p>
      </div>

      {/* Column headers (desktop) */}
      <div className="hidden items-center gap-4 border-b border-border bg-muted/40 px-4 py-2 text-xs font-medium text-muted-foreground sm:grid sm:grid-cols-[minmax(0,1fr)_112px_132px_120px_36px]">
        <span>Product</span>
        <span>Unit Price</span>
        <span>Quantity</span>
        <span className="text-right">Subtotal</span>
        <span aria-hidden="true" />
      </div>

      <div className="divide-y divide-border">
        {items.map((item) => (
          <CartItemRow
            key={item.id}
            item={item}
            checked={isSelected(item.id)}
            onToggle={() => onToggleItem(item.id)}
            onRemove={() => onRemove(item.id)}
            onUpdateQuantity={onUpdateQuantity}
          />
        ))}
      </div>

      {/* Shop subtotal */}
      <div className="flex items-end justify-end gap-2 border-t border-border bg-muted/30 px-4 py-2.5 text-sm">
        <span className="text-muted-foreground">Shop subtotal</span>
        <span className="font-semibold text-foreground tabular-nums">
          {formatPrice(groupSubtotal)}
        </span>
      </div>
    </section>
  );
}

/** Single product row inside a shop group. */
function CartItemRow({
  item,
  checked,
  onToggle,
  onRemove,
  onUpdateQuantity,
}: {
  item: CartItem;
  checked: boolean;
  onToggle: () => void;
  onRemove: () => void;
  onUpdateQuantity: (id: string, quantity: number) => void;
}) {
  const unitPrice = formatPrice(item.price);
  const subtotal = formatPrice(item.price * item.quantity);

  return (
    <div className={`p-4 transition-colors ${checked ? "bg-primary/[0.03]" : ""}`}>
      {/* Desktop / tablet row */}
      <div className="hidden items-center gap-4 sm:grid sm:grid-cols-[minmax(0,1fr)_112px_132px_120px_36px]">
        <div className="flex min-w-0 items-center gap-3">
          <Checkbox
            id={`select-${item.id}`}
            checked={checked}
            onCheckedChange={() => onToggle()}
            aria-label={`Select ${item.name}`}
          />
          <Link to={`/products/${item.id}`} className="shrink-0">
            <img
              src={item.image}
              alt={item.name}
              className="h-16 w-16 rounded-md border border-border bg-muted/40 object-contain p-1"
            />
          </Link>
          <div className="min-w-0">
            <Link to={`/products/${item.id}`}>
              <p className="truncate font-medium text-foreground hover:text-primary">{item.name}</p>
            </Link>
            <p className="truncate text-xs text-muted-foreground">{item.category}</p>
          </div>
        </div>
        <div className="text-sm text-muted-foreground tabular-nums">{unitPrice}</div>
        <QuantityControl item={item} onUpdateQuantity={onUpdateQuantity} />
        <div className="text-right font-semibold text-foreground tabular-nums">{subtotal}</div>
        <div className="flex justify-end">
          <RemoveButton name={item.name} onRemove={onRemove} className="hidden sm:inline-flex" />
        </div>
      </div>

      {/* Mobile row */}
      <div className="sm:hidden">
        <div className="flex items-start gap-3">
          <div className="flex items-center gap-3">
            <Checkbox
              checked={checked}
              onCheckedChange={() => onToggle()}
              aria-label={`Select ${item.name}`}
            />
            <Link to={`/products/${item.id}`} className="shrink-0">
              <img
                src={item.image}
                alt={item.name}
                className="h-16 w-16 rounded-md border border-border bg-muted/40 object-contain p-1"
              />
            </Link>
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <Link to={`/products/${item.id}`}>
                  <p className="font-medium leading-snug text-foreground hover:text-primary">{item.name}</p>
                </Link>
                <p className="mt-0.5 text-xs text-muted-foreground">{item.category}</p>
              </div>
              <RemoveButton name={item.name} onRemove={onRemove} className="sm:hidden" />
            </div>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-muted-foreground">
                Unit: <span className="font-medium text-foreground tabular-nums">{unitPrice}</span>
              </p>
              <div className="flex items-center gap-3">
                <QuantityControl item={item} onUpdateQuantity={onUpdateQuantity} />
                <p className="font-semibold text-foreground tabular-nums">{subtotal}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Compact [ − ] [ n ] [ + ] quantity control. Minus is disabled at minimum. */
function QuantityControl({
  item,
  onUpdateQuantity,
}: {
  item: CartItem;
  onUpdateQuantity: (id: string, quantity: number) => void;
}) {
  const atMin = item.quantity <= 1;
  return (
    <div className="flex w-fit items-center rounded-md border border-border bg-background">
      <button
        type="button"
        disabled={atMin}
        onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
        className="flex h-8 w-8 items-center justify-center text-muted-foreground hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
        aria-label={`Decrease quantity of ${item.name}`}
      >
        <Minus className="h-3.5 w-3.5" aria-hidden="true" />
      </button>
      <span className="w-9 text-center text-sm font-medium tabular-nums">{item.quantity}</span>
      <button
        type="button"
        onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
        className="flex h-8 w-8 items-center justify-center text-muted-foreground hover:bg-muted"
        aria-label={`Increase quantity of ${item.name}`}
      >
        <Plus className="h-3.5 w-3.5" aria-hidden="true" />
      </button>
    </div>
  );
}

/** Ghost delete button, shown in two spots per breakpoint. */
function RemoveButton({
  name,
  onRemove,
  className,
}: {
  name: string;
  onRemove: () => void;
  className?: string;
}) {
  return (
    <Button
      variant="ghost"
      size="icon"
      className={`h-8 w-8 text-muted-foreground hover:bg-destructive/10 hover:text-destructive ${className ?? ""}`}
      onClick={onRemove}
      aria-label={`Remove ${name}`}
      title="Remove"
    >
      <Trash2 className="h-4 w-4" aria-hidden="true" />
    </Button>
  );
}

export default Cart;