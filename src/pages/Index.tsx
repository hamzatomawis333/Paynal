import { Helmet } from "react-helmet-async";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { HeroSection } from "@/components/home/HeroSection";
import { FeaturedProducts } from "@/components/home/FeaturedProducts";
import { CategorySection } from "@/components/home/CategorySection";
import { ArtisanSpotlight } from "@/components/home/ArtisanSpotlight";
import { CulturalFeatures } from "@/components/home/CulturalFeatures";

const Index = () => {
  return (
    <>
      <Helmet>
        <title>LanaoCrafts - Authentic Maranao Cultural Souvenirs from Lanao del Sur</title>
        <meta
          name="description"
          content="Discover authentic handcrafted Maranao cultural souvenirs from Lanao del Sur. Shop traditional brassware, textiles, handicrafts, and more from local artisans."
        />
        <meta name="keywords" content="Maranao crafts, Lanao del Sur souvenirs, Philippine cultural products, handcrafted brass, traditional textiles" />
      </Helmet>
      
      <div className="min-h-screen">
        <Navbar />
        <main>
          <HeroSection />
          <FeaturedProducts />
          <CategorySection />
          <ArtisanSpotlight />
          <CulturalFeatures />
        </main>
        <Footer />
      </div>
    </>
  );
};

export default Index;
