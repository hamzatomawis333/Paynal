import { Product } from "@/types/product";
import productBrass from "@/assets/product-brass.jpg";
import productMalong from "@/assets/product-malong.jpg";
import productBasket from "@/assets/product-basket.jpg";
import productAccessories from "@/assets/product-accessories.jpg";
import productWoodcraft from "@/assets/product-woodcraft.jpg";

export const categories = [
  { id: "brassware", name: "Brassware", description: "Traditional brass craftsmanship" },
  { id: "textiles", name: "Textiles & Malong", description: "Handwoven fabrics and garments" },
  { id: "handicrafts", name: "Handicrafts", description: "Woven baskets and decor" },
  { id: "accessories", name: "Accessories", description: "Jewelry and ornaments" },
  { id: "woodcraft", name: "Woodcraft", description: "Carved artworks" },
  { id: "artworks", name: "Artworks", description: "Traditional paintings and art" },
];

export const products: Product[] = [
  {
    id: "1",
    name: "Traditional Brass Gador",
    description: "Handcrafted brass jar featuring intricate okir patterns, a symbol of Maranao royalty and craftsmanship. Each piece is individually made by master artisans.",
    price: 4500,
    image: productBrass,
    category: "brassware",
    artisan: "Master Hadji Ibrahim",
    culturalBackground: "The Gador is a traditional Maranao brass container used during important ceremonies and as a symbol of wealth and status.",
    rating: 4.8,
    reviews: 24,
    inStock: true,
  },
  {
    id: "2",
    name: "Royal Malong Textile",
    description: "Authentic handwoven Malong featuring traditional geometric patterns in vibrant colors. Perfect for cultural events or home decoration.",
    price: 2800,
    image: productMalong,
    category: "textiles",
    artisan: "Weaver Amina Salipada",
    culturalBackground: "The Malong is a versatile tubular garment that represents Maranao identity and is worn during various occasions and ceremonies.",
    rating: 4.9,
    reviews: 42,
    inStock: true,
  },
  {
    id: "3",
    name: "Handwoven Rattan Basket",
    description: "Skillfully woven basket using traditional techniques passed down through generations. Functional art for storage or display.",
    price: 1200,
    image: productBasket,
    category: "handicrafts",
    artisan: "Artisan Fatima Macaraya",
    culturalBackground: "Basket weaving is an ancient Maranao tradition that demonstrates the resourcefulness and artistry of the community.",
    rating: 4.7,
    reviews: 18,
    inStock: true,
  },
  {
    id: "4",
    name: "Okir Brass Necklace Set",
    description: "Elegant brass jewelry set featuring miniature okir designs. Includes necklace with matching earrings.",
    price: 1800,
    image: productAccessories,
    category: "accessories",
    artisan: "Jewelry Master Salic Adiong",
    culturalBackground: "Maranao jewelry often incorporates okir patterns that hold deep cultural significance and represent prosperity.",
    rating: 4.6,
    reviews: 31,
    inStock: true,
  },
  {
    id: "5",
    name: "Carved Warrior Wall Art",
    description: "Hand-carved wooden artwork depicting a traditional Maranao warrior. A stunning piece of cultural heritage for your collection.",
    price: 5500,
    image: productWoodcraft,
    category: "woodcraft",
    artisan: "Carver Abdul Mangondato",
    culturalBackground: "Wood carving is a prestigious art form in Maranao culture, often depicting legendary heroes and epic stories.",
    rating: 5.0,
    reviews: 12,
    inStock: true,
  },
  {
    id: "6",
    name: "Miniature Brass Sarimanok",
    description: "The legendary Sarimanok bird crafted in gleaming brass. A symbol of good fortune and the most iconic Maranao art piece.",
    price: 3200,
    image: productBrass,
    category: "brassware",
    artisan: "Master Hadji Ibrahim",
    culturalBackground: "The Sarimanok is a mythical bird in Maranao folklore, representing prosperity and good fortune.",
    rating: 4.9,
    reviews: 56,
    inStock: true,
  },
];

export const artisans = [
  {
    id: "1",
    name: "Master Hadji Ibrahim",
    specialty: "Brassware",
    story: "With over 40 years of experience, Hadji Ibrahim has dedicated his life to preserving the traditional art of Maranao brass making. His works have been featured in national exhibitions.",
    location: "Tugaya, Lanao del Sur",
  },
  {
    id: "2",
    name: "Weaver Amina Salipada",
    specialty: "Textile Weaving",
    story: "Amina learned the art of weaving from her grandmother at age 12. She continues the tradition while training young women in the community.",
    location: "Marawi City",
  },
  {
    id: "3",
    name: "Carver Abdul Mangondato",
    specialty: "Woodcraft",
    story: "Abdul creates stunning wooden sculptures that tell stories of Maranao legends. His intricate okir carvings are sought after by collectors worldwide.",
    location: "Wato-Balindong, Lanao del Sur",
  },
];
