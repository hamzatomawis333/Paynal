import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { ProductCard } from "@/components/products/ProductCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { useProducts, useCategories } from "@/hooks/useProducts";
import { Search, SlidersHorizontal, X, PackageSearch } from "lucide-react";

const Products = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [showFilters, setShowFilters] = useState(false);

  const activeCategory = searchParams.get("category") || "all";
  // The URL is the source of truth so the header search can deep-link here.
  const searchQuery = searchParams.get("q") ?? "";

  // Fetch from PHP API
  const {
    data: products = [],
    isLoading,
    isError,
    refetch,
  } = useProducts({
    category: activeCategory !== "all" ? activeCategory : undefined,
    search: searchQuery || undefined,
  });

  const { data: categories = [] } = useCategories();

  const updateParams = (mutate: (params: URLSearchParams) => void) => {
    const next = new URLSearchParams(searchParams);
    mutate(next);
    // replace: typing must not flood browser history with one entry per key.
    setSearchParams(next, { replace: true });
  };

  const handleCategoryChange = (categorySlug: string) => {
    updateParams((params) => {
      if (categorySlug === "all") params.delete("category");
      else params.set("category", categorySlug);
    });
  };

  const setSearchQuery = (value: string) => {
    updateParams((params) => {
      if (value) params.set("q", value);
      else params.delete("q");
    });
  };

  const clearFilters = () => {
    setSearchParams(new URLSearchParams(), { replace: true });
  };

  return (
    <>
      <Helmet>
        <title>Shop Cultural Souvenirs | LanaoCrafts</title>
        <meta
          name="description"
          content="Browse our collection of authentic Maranao cultural souvenirs. Find traditional brassware, textiles, handicrafts, and more from Lanao del Sur artisans."
        />
      </Helmet>

      <div className="min-h-screen">
        <Navbar />
        <main className="container mx-auto px-4 py-8">
          <PageHeader
            className="mb-8"
            title={
              <>
                Our <span className="text-primary">Collection</span>
              </>
            }
            subtitle="Authentic handcrafted treasures from Lanao del Sur"
          />

          {/* Search and Filters */}
          <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative max-w-md flex-1">
              <Search
                className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
              <Input
                type="search"
                placeholder="Search products, artisans..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                aria-label="Search products"
                className="pl-10"
              />
            </div>
            <Button
              variant="outline"
              className="lg:hidden"
              onClick={() => setShowFilters(!showFilters)}
              aria-expanded={showFilters}
            >
              <SlidersHorizontal className="mr-2 h-4 w-4" aria-hidden="true" />
              Filters
            </Button>
          </div>

          {/* Categories */}
          <div
            className={`mb-8 flex flex-wrap gap-2 ${showFilters ? "flex" : "hidden lg:flex"}`}
          >
            <Button
              variant={activeCategory === "all" ? "gold" : "outline"}
              size="sm"
              onClick={() => handleCategoryChange("all")}
            >
              All Products
            </Button>
            {categories.map((category) => (
              <Button
                key={category.id}
                variant={activeCategory === category.slug ? "gold" : "outline"}
                size="sm"
                onClick={() => handleCategoryChange(category.slug)}
              >
                {category.name}
              </Button>
            ))}
          </div>

          {/* Active Filters */}
          {(activeCategory !== "all" || searchQuery) && (
            <div className="mb-6 flex flex-wrap items-center gap-2">
              <span className="text-sm text-muted-foreground">Active filters:</span>
              {activeCategory !== "all" && (
                <Badge variant="category" className="gap-1">
                  {categories.find((c) => c.slug === activeCategory)?.name || activeCategory}
                  <button
                    type="button"
                    onClick={() => handleCategoryChange("all")}
                    aria-label="Clear category filter"
                    className="rounded-full p-0.5 hover:bg-primary/20"
                  >
                    <X className="h-3 w-3" aria-hidden="true" />
                  </button>
                </Badge>
              )}
              {searchQuery && (
                <Badge variant="category" className="gap-1">
                  "{searchQuery}"
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    aria-label="Clear search filter"
                    className="rounded-full p-0.5 hover:bg-primary/20"
                  >
                    <X className="h-3 w-3" aria-hidden="true" />
                  </button>
                </Badge>
              )}
            </div>
          )}

          {/* Loading State */}
          {isLoading && (
            <div
              className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
              role="status"
              aria-label="Loading products"
            >
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="space-y-3">
                  <Skeleton className="aspect-square w-full rounded-lg" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              ))}
            </div>
          )}

          {/* Error State */}
          {isError && (
            <ErrorState
              title="We couldn't load the products"
              description="The shop is temporarily unreachable. Please check your connection and try again."
              onRetry={() => void refetch()}
            />
          )}

          {/* Products Grid */}
          {!isLoading && !isError && products.length > 0 && (
            <>
              <p className="mb-4 text-sm text-muted-foreground">
                Showing {products.length} product{products.length === 1 ? "" : "s"}
                {searchQuery && ` for "${searchQuery}"`}
              </p>
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {products.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            </>
          )}

          {!isLoading && !isError && products.length === 0 && (
            <EmptyState
              icon={PackageSearch}
              title="No products found"
              description={
                searchQuery || activeCategory !== "all"
                  ? "Try a different search term or clear your filters to see everything."
                  : "No products are available right now. Please check back soon."
              }
              action={
                (searchQuery || activeCategory !== "all") && (
                  <Button variant="outline" onClick={clearFilters}>
                    Clear Filters
                  </Button>
                )
              }
            />
          )}
        </main>
        <Footer />
      </div>
    </>
  );
};

export default Products;
