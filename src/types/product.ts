export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string;
  category: string;
  artisan: string;
  culturalBackground: string;
  rating: number;
  reviews: number;
  inStock: boolean;
  sellerId?: number;
}

export interface CartItem extends Product {
  quantity: number;
}

export interface Artisan {
  id: string;
  name: string;
  specialty: string;
  story: string;
  location: string;
}
