import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useCart } from "@/context/CartContext";
import { Product } from "@/types/product";
import { ShoppingCart, Star, Heart } from "lucide-react";
import { useWishlist } from "@/hooks/useBuyer";
import { toast } from "@/hooks/use-toast";

function ProductCard({ product }: { product: Product }) {
  const { addToCart } = useCart();
  const { data: wishlist, addToWishlist, removeFromWishlist } = useWishlist();

  const isLoggedIn = !!localStorage.getItem("auth_token");
  const user = localStorage.getItem("auth_user");
  const isBuyer = user ? JSON.parse(user).role === "buyer" : false;

  const isInWishlist = wishlist?.some(
    (item) => String(item.product_id) === String(product.id)
  );

  function formatPrice(price: number) {
    return "₱" + price.toLocaleString();
  }

  function handleAddToCart() {
    addToCart(product);
  }

  function handleToggleWishlist(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!isLoggedIn || !isBuyer) {
      toast({ title: "Please login as a buyer to use wishlist", variant: "destructive" });
      return;
    }
    if (isInWishlist) {
      removeFromWishlist.mutate(Number(product.id));
    } else {
      addToWishlist.mutate(Number(product.id));
    }
  }

  return (
    <Card variant="product" className="flex flex-col">
      <div className="relative overflow-hidden">
        <Link to={"/products/" + product.id}>
          <img
            src={product.image}
            alt={product.name}
            className="aspect-square w-full object-cover"
          />
        </Link>

        <Badge variant="category" className="absolute left-3 top-3 capitalize">
          {product.category}
        </Badge>

        {/* Wishlist Heart Button */}
        <button
          onClick={handleToggleWishlist}
          className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-background/80 backdrop-blur-sm transition-all hover:bg-background hover:scale-110"
        >
          <Heart
            className={`h-5 w-5 transition-colors ${
              isInWishlist
                ? "fill-destructive text-destructive"
                : "text-muted-foreground"
            }`}
          />
        </button>

        {product.inStock === false && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/80">
            <Badge variant="secondary">Out of Stock</Badge>
          </div>
        )}
      </div>

      <CardContent className="flex flex-1 flex-col p-4">
        <Link to={"/products/" + product.id}>
          <h3 className="font-display text-lg font-semibold hover:text-primary">
            {product.name}
          </h3>
        </Link>

        <p className="mt-1 text-sm text-muted-foreground">
          by {product.artisan}
        </p>

        <div className="mt-2 flex items-center gap-1">
          <Star className="h-4 w-4 fill-primary text-primary" />
          <span className="text-sm font-medium">{product.rating}</span>
          <span className="text-sm text-muted-foreground">
            ({product.reviews} reviews)
          </span>
        </div>

        <div className="mt-auto flex items-center justify-between pt-4">
          <p className="font-display text-xl font-bold text-primary">
            {formatPrice(product.price)}
          </p>

          <Button
            size="sm"
            variant="gold"
            onClick={handleAddToCart}
            disabled={product.inStock === false}
          >
            <ShoppingCart className="mr-1 h-4 w-4" />
            Add
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export { ProductCard };
