import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { useCategories } from "@/hooks/useProducts";
import { Loader2 } from "lucide-react";
import productBrass from "@/assets/product-brass.jpg";
import productMalong from "@/assets/product-malong.jpg";
import productBasket from "@/assets/product-basket.jpg";
import productAccessories from "@/assets/product-accessories.jpg";
import productWoodcraft from "@/assets/product-woodcraft.jpg";

const categoryImages: Record<string, string> = {
  brassware: productBrass,
  textiles: productMalong,
  handicrafts: productBasket,
  accessories: productAccessories,
  woodcraft: productWoodcraft,
  artworks: productWoodcraft,
};

export function CategorySection() {
  const { data: categories = [], isLoading } = useCategories();

  return (
    <section className="bg-secondary/30 py-16 lg:py-24">
      <div className="container mx-auto px-4">
        <div className="mb-12 text-center">
          <h2 className="font-display text-3xl font-bold md:text-4xl">
            Shop by <span className="text-primary">Category</span>
          </h2>
          <p className="mx-auto mt-2 max-w-lg text-muted-foreground">
            Explore our curated collection of authentic Maranao cultural products
          </p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12" role="status" aria-label="Loading">
            <Loader2 className="h-8 w-8 animate-spin text-primary" aria-hidden="true" />
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {categories.map((category) => (
              <Link
                key={category.id}
                to={`/products?category=${category.slug}`}
                className="group"
              >
                <Card className="relative h-48 overflow-hidden transition-all duration-300 hover:shadow-medium">
                  <img
                    src={categoryImages[category.slug] || productWoodcraft}
                    alt={category.name}
                    className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-foreground/80 via-foreground/40 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-4">
                    <h3 className="font-display text-xl font-semibold text-background">
                      {category.name}
                    </h3>
                    <p className="text-sm text-background/80">{category.description}</p>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
