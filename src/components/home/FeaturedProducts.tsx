import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ProductCard } from "@/components/products/ProductCard";
import { useProducts } from "@/hooks/useProducts";
import { ArrowRight, Loader2 } from "lucide-react";

export function FeaturedProducts() {
  const { data: products = [], isLoading } = useProducts();
  const featuredProducts = products.slice(0, 4);

  return (
    <section className="py-16 lg:py-24">
      <div className="container mx-auto px-4">
        <div className="mb-12 flex flex-col items-start justify-between gap-4 md:flex-row md:items-end">
          <div>
            <h2 className="font-display text-3xl font-bold md:text-4xl">
              Featured <span className="text-primary">Treasures</span>
            </h2>
            <p className="mt-2 max-w-lg text-muted-foreground">
              Handpicked cultural artifacts crafted by master artisans from Lanao del Sur
            </p>
          </div>
          <Button variant="outline" asChild>
            <Link to="/products">
              View All Products
              <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
            </Link>
          </Button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12" role="status" aria-label="Loading">
            <Loader2 className="h-8 w-8 animate-spin text-primary" aria-hidden="true" />
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {featuredProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
