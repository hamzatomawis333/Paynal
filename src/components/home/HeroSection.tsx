import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Star } from "lucide-react";
import heroImage from "@/assets/hero-maranao.jpg";

export function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-gradient-hero">
      {/* Decorative pattern */}
      <div className="okir-pattern absolute inset-0 opacity-30" />
      
      <div className="container relative mx-auto px-4 py-16 lg:py-24">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          {/* Content */}
          <div className="max-w-xl animate-fade-up space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary">
              <Star className="h-4 w-4 fill-primary" aria-hidden="true" />
              Authentic Maranao Craftsmanship
            </div>
            
            <h1 className="font-display text-4xl font-bold leading-tight text-foreground md:text-5xl lg:text-6xl">
              Discover the{" "}
              <span className="text-gradient-gold">Cultural Treasures</span>{" "}
              of Lanao del Sur
            </h1>
            
            <p className="text-lg text-muted-foreground">
              Experience the rich heritage of the Maranao people through authentic handcrafted souvenirs. Each piece tells a story of tradition, artistry, and cultural pride.
            </p>
            
            <div className="flex flex-col gap-4 sm:flex-row">
              <Button variant="hero" size="lg" asChild>
                <Link to="/products">
                  Explore Collection
                  <ArrowRight className="ml-2 h-5 w-5" aria-hidden="true" />
                </Link>
              </Button>
              <Link to="/artisans">
                <Button variant="heroOutline" size="lg">
                  Meet Our Artisans
                </Button>
              </Link>
            </div>
            
            {/* Stats */}
            <div className="flex gap-8 pt-4">
              <div>
                <p className="font-display text-3xl font-bold text-primary">500+</p>
                <p className="text-sm text-muted-foreground">Products</p>
              </div>
              <div>
                <p className="font-display text-3xl font-bold text-primary">100+</p>
                <p className="text-sm text-muted-foreground">Artisans</p>
              </div>
              <div>
                <p className="font-display text-3xl font-bold text-primary">5K+</p>
                <p className="text-sm text-muted-foreground">Happy Customers</p>
              </div>
            </div>
          </div>
          
          {/* Hero Image */}
          <div className="relative animate-fade-up" style={{ animationDelay: "0.2s" }}>
            <div className="relative overflow-hidden rounded-2xl shadow-medium">
              <img
                src={heroImage}
                alt="Traditional Maranao brass crafts and textiles from Lanao del Sur"
                className="aspect-[4/3] w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-foreground/20 to-transparent" />
            </div>
            
            {/* Floating card */}
            <div className="absolute -bottom-6 -left-6 rounded-xl border border-border bg-card p-4 shadow-medium md:-bottom-8 md:-left-8 md:p-6">
              <p className="text-sm text-muted-foreground">Featured Artisan</p>
              <p className="font-display font-semibold">Master Hadji Ibrahim</p>
              <p className="text-sm text-primary">40+ years of experience</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
