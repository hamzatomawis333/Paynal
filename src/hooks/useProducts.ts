import { useQuery } from "@tanstack/react-query";
import { fetchProducts, fetchProduct, fetchCategories, fetchArtisans, apiProductToProduct } from "@/lib/api";
import { Product } from "@/types/product";

export function useProducts(params?: { category?: string; search?: string }) {
  return useQuery({
    queryKey: ["products", params],
    queryFn: async (): Promise<Product[]> => {
      const data = await fetchProducts(params);
      return data.products.map(apiProductToProduct);
    },
  });
}

export function useProduct(id: string | undefined) {
  return useQuery({
    queryKey: ["product", id],
    queryFn: async (): Promise<Product> => {
      if (!id) throw new Error("No product ID");
      const data = await fetchProduct(id);
      return apiProductToProduct(data.product);
    },
    enabled: !!id,
  });
}

// Fallback categories when API is unreachable
const FALLBACK_CATEGORIES = [
  { id: 1, name: "Malong", slug: "malong", description: "Traditional Maranao woven textile" },
  { id: 2, name: "Okir Woodcraft", slug: "okir-woodcraft", description: "Intricate Maranao wood carvings" },
  { id: 3, name: "Brassware", slug: "brassware", description: "Traditional brass crafts and vessels" },
  { id: 4, name: "Traditional Clothing", slug: "traditional-clothing", description: "Authentic Maranao garments" },
  { id: 5, name: "Beads & Accessories", slug: "beads-accessories", description: "Handcrafted beads and accessories" },
  { id: 6, name: "Home Decor", slug: "home-decor", description: "Maranao-inspired home decorations" },
];

export function useCategories() {
  return useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      try {
        const data = await fetchCategories();
        return data.categories;
      } catch {
        return FALLBACK_CATEGORIES;
      }
    },
  });
}

export function useArtisans() {
  return useQuery({
    queryKey: ["artisans"],
    queryFn: async () => {
      const data = await fetchArtisans();
      return data.artisans;
    },
  });
}
