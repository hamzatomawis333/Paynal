import { resolveApiImageUrl } from "@/lib/api";
import { BuyerLayout } from "@/components/buyer/BuyerLayout";
import { useWishlist } from "@/hooks/useBuyer";
import type { WishlistItem } from "@/lib/buyer-api";
import { useCart } from "@/context/CartContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { formatPrice } from "@/lib/format";
import { Heart, ShoppingCart, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Link } from "react-router-dom";

export default function BuyerWishlist() {
  const { data: wishlist, isLoading, isError, refetch, removeFromWishlist } = useWishlist();
  const { addToCart } = useCart();

  const handleRemove = (productId: number, name: string) => {
    removeFromWishlist.mutate(productId, {
      onSuccess: () => toast.success(`${name} removed from wishlist`),
      onError: () => toast.error("Failed to remove"),
    });
  };

  const handleAddToCart = (item: WishlistItem) => {
    addToCart({
      id: String(item.product_id),
      name: item.name,
      price: parseFloat(item.price),
      image: resolveApiImageUrl(item.image_url),
      category: item.category_slug || "",
      artisan: "",
      culturalBackground: "",
      description: "",
      rating: 0,
      reviews: 0,
      inStock: Number(item.stock_quantity) > 0,
    });
    toast.success(`${item.name} added to cart`);
  };

  return (
    <BuyerLayout>
      <div className="space-y-6">
        <PageHeader title="My Wishlist" subtitle="Products you've saved for later" />

        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" role="status" aria-label="Loading wishlist">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-64 w-full" aria-hidden="true" />)}
          </div>
        ) : isError ? (
          <ErrorState onRetry={() => void refetch()} />
        ) : !wishlist?.length ? (
          <EmptyState
            icon={Heart}
            title="Your wishlist is empty"
            description="Tap the heart on any product to save it here for later."
            action={
              <Button asChild variant="gold">
                <Link to="/products">Browse Products</Link>
              </Button>
            }
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {wishlist.map((item) => (
              <Card key={item.id} className="overflow-hidden shadow-soft">
                <div className="aspect-square overflow-hidden">
                  <img
                    src={resolveApiImageUrl(item.image_url)}
                    alt={item.name}
                    className="h-full w-full object-cover transition-transform hover:scale-105"
                  />
                </div>
                <CardContent className="space-y-3 p-4">
                  <div>
                    <p className="text-xs capitalize text-muted-foreground">{item.category_name}</p>
                    <h3 className="font-medium text-foreground">{item.name}</h3>
                    <p className="text-lg font-bold tabular-nums text-primary">
                      {formatPrice(parseFloat(item.price))}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className="flex-1"
                      onClick={() => handleAddToCart(item)}
                      disabled={item.stock_quantity <= 0}
                    >
                      <ShoppingCart className="mr-2 h-4 w-4" aria-hidden="true" />
                      {item.stock_quantity > 0 ? "Add to Cart" : "Out of Stock"}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleRemove(item.product_id, item.name)}
                      disabled={removeFromWishlist.isPending}
                      title={`Remove ${item.name} from wishlist`}
                      aria-label={`Remove ${item.name} from wishlist`}
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </Button>
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
