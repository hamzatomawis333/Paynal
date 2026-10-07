import { getErrorMessage } from "@/lib/errors";
import { useParams, Link, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { useCart } from "@/context/CartContext";
import { useProduct } from "@/hooks/useProducts";
import { useWishlist } from "@/hooks/useBuyer";
import { useStartConversation } from "@/hooks/useMessages";
import { ErrorState } from "@/components/ErrorState";
import { formatPrice } from "@/lib/format";
import { toast } from "sonner";
import { ShoppingCart, Star, ArrowLeft, MapPin, Truck, Shield, Loader2, Heart, MessageCircle } from "lucide-react";

const ProductDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const { data: product, isLoading, isError, refetch } = useProduct(id);
  const { data: wishlist, addToWishlist, removeFromWishlist } = useWishlist();
  const startConv = useStartConversation();

  const isLoggedIn = !!localStorage.getItem("auth_token");
  const user = localStorage.getItem("auth_user");
  const isBuyer = user ? JSON.parse(user).role === "buyer" : false;

  const isInWishlist = wishlist?.some(
    (item) => String(item.product_id) === String(id)
  );

  function handleToggleWishlist() {
    if (!isLoggedIn || !isBuyer) {
      toast.error("Please login as a buyer to use wishlist");
      return;
    }
    if (isInWishlist) {
      removeFromWishlist.mutate(Number(id));
    } else {
      addToWishlist.mutate(Number(id));
    }
  }

  function handleMessageSeller() {
    if (!isLoggedIn || !isBuyer) {
      toast.error("Please login as a buyer to message the seller");
      return;
    }
    if (!product?.sellerId) {
      toast.error("Seller info not available");
      return;
    }
    startConv.mutate(
      { sellerId: product.sellerId, productId: Number(id) },
      {
        onSuccess: (data) => {
          navigate(`/account/messages?conversation=${data.conversation_id}`);
        },
        onError: (e) => toast.error(getErrorMessage(e, "Failed to start chat")),
      }
    );
  }


  if (isLoading) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <div className="container mx-auto flex min-h-[60vh] items-center justify-center px-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-2 text-muted-foreground">Loading product...</span>
        </div>
        <Footer />
      </div>
    );
  }

  if (isError || !product) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <div className="container mx-auto flex min-h-[60vh] items-center justify-center px-4">
          <ErrorState
            title="Product not found"
            description="The product you're looking for doesn't exist or could not be loaded."
            retryLabel="Try again"
            onRetry={() => void refetch()}
            action={
              <Button asChild>
                <Link to="/products">
                  <ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" />
                  Back to Shop
                </Link>
              </Button>
            }
          />
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>{product.name} | LanaoCrafts</title>
        <meta name="description" content={product.description} />
      </Helmet>

      <div className="min-h-screen">
        <Navbar />
        <main className="container mx-auto px-4 py-8">
          {/* Breadcrumb */}
          <nav className="mb-6 flex items-center gap-2 text-sm text-muted-foreground">
            <Link to="/" className="hover:text-primary">Home</Link>
            <span>/</span>
            <Link to="/products" className="hover:text-primary">Products</Link>
            <span>/</span>
            <span className="text-foreground">{product.name}</span>
          </nav>

          <div className="grid gap-8 lg:grid-cols-2 lg:gap-12">
            {/* Image */}
            <div className="overflow-hidden rounded-2xl bg-secondary/30">
              <img
                src={product.image}
                alt={product.name}
                className="aspect-square w-full object-cover"
              />
            </div>

            {/* Details */}
            <div className="space-y-6">
              <div>
                <Badge variant="category" className="mb-3 capitalize">
                  {product.category}
                </Badge>
                <h1 className="font-display text-3xl font-bold md:text-4xl">
                  {product.name}
                </h1>
                <p className="mt-2 text-lg text-muted-foreground">
                  Crafted by {product.artisan}
                </p>
              </div>

              <div className="flex items-center gap-2" role="img" aria-label={`Rated ${product.rating} out of 5 from ${product.reviews} reviews`}>
                <div className="flex items-center gap-1" aria-hidden="true">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`h-5 w-5 ${
                        i < Math.floor(product.rating)
                          ? "fill-primary text-primary"
                          : "text-muted"
                      }`}
                    />
                  ))}
                </div>
                <span className="font-medium">{product.rating}</span>
                <span className="text-muted-foreground">({product.reviews} reviews)</span>
              </div>

              <p className="font-display text-4xl font-bold text-primary">
                {formatPrice(product.price)}
              </p>

              <p className="text-muted-foreground">{product.description}</p>

              {/* Cultural Background */}
              <Card className="bg-primary/5 p-4">
                <h3 className="font-display font-semibold text-primary">
                  Cultural Significance
                </h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  {product.culturalBackground}
                </p>
              </Card>

              {/* Actions */}
              <div className="flex flex-col gap-3 sm:flex-row">
                <Button
                  variant="hero"
                  size="lg"
                  className="flex-1"
                  onClick={() => addToCart(product)}
                  disabled={!product.inStock}
                >
                  <ShoppingCart className="mr-2 h-5 w-5" />
                  {product.inStock ? "Add to Cart" : "Out of Stock"}
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  onClick={handleToggleWishlist}
                  className={isInWishlist ? "border-destructive text-destructive hover:bg-destructive/10 hover:text-destructive" : ""}
                >
                  <Heart className={`mr-2 h-5 w-5 ${isInWishlist ? "fill-destructive" : ""}`} />
                  {isInWishlist ? "Saved" : "Save to Wishlist"}
                </Button>
              </div>

              <Button
                variant="teal"
                size="lg"
                className="w-full"
                onClick={handleMessageSeller}
                disabled={startConv.isPending}
              >
                <MessageCircle className="mr-2 h-5 w-5" />
                {startConv.isPending ? "Opening chat..." : `Message ${product.artisan}`}
              </Button>

              {/* Features */}
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <Truck className="h-5 w-5 text-primary" />
                  </div>
                  <div className="text-sm">
                    <p className="font-medium">Free Shipping</p>
                    <p className="text-muted-foreground">Orders over ₱3,000</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <Shield className="h-5 w-5 text-primary" />
                  </div>
                  <div className="text-sm">
                    <p className="font-medium">Authentic</p>
                    <p className="text-muted-foreground">100% Genuine</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <MapPin className="h-5 w-5 text-primary" />
                  </div>
                  <div className="text-sm">
                    <p className="font-medium">Local Origin</p>
                    <p className="text-muted-foreground">Lanao del Sur</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    </>
  );
};

export default ProductDetail;
