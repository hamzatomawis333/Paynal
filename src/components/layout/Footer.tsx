import { Link } from "react-router-dom";
import { Facebook, Instagram, Mail, MapPin, Phone } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-border bg-secondary/30">
      <div className="container mx-auto px-4 py-12">
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
          {/* Brand */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-gold">
                <span className="font-display text-lg font-bold text-primary-foreground">L</span>
              </div>
              <div>
                <h3 className="font-display text-xl font-semibold">
                  Lanao<span className="text-primary">Crafts</span>
                </h3>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              Preserving and promoting the rich cultural heritage of Lanao del Sur through authentic handcrafted souvenirs.
            </p>
            <div className="flex gap-4">
              <a href="#" className="text-muted-foreground transition-colors hover:text-primary">
                <Facebook className="h-5 w-5" />
              </a>
              <a href="#" className="text-muted-foreground transition-colors hover:text-primary">
                <Instagram className="h-5 w-5" />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-4">
            <h4 className="font-display font-semibold">Quick Links</h4>
            <nav className="flex flex-col gap-2">
              <Link to="/products" className="text-sm text-muted-foreground transition-colors hover:text-primary">
                Shop All
              </Link>
              <Link to="/artisans" className="text-sm text-muted-foreground transition-colors hover:text-primary">
                Meet Our Artisans
              </Link>
              <Link to="/about" className="text-sm text-muted-foreground transition-colors hover:text-primary">
                Our Story
              </Link>
              <Link to="/auth" className="text-sm text-muted-foreground transition-colors hover:text-primary">
                Become a Seller
              </Link>
            </nav>
          </div>

          {/* Categories */}
          <div className="space-y-4">
            <h4 className="font-display font-semibold">Categories</h4>
            <nav className="flex flex-col gap-2">
              <Link to="/products?category=brassware" className="text-sm text-muted-foreground transition-colors hover:text-primary">
                Brassware
              </Link>
              <Link to="/products?category=textiles" className="text-sm text-muted-foreground transition-colors hover:text-primary">
                Textiles & Malong
              </Link>
              <Link to="/products?category=handicrafts" className="text-sm text-muted-foreground transition-colors hover:text-primary">
                Handicrafts
              </Link>
              <Link to="/products?category=accessories" className="text-sm text-muted-foreground transition-colors hover:text-primary">
                Accessories
              </Link>
            </nav>
          </div>

          {/* Contact */}
          <div className="space-y-4">
            <h4 className="font-display font-semibold">Contact Us</h4>
            <div className="flex flex-col gap-3">
              <div className="flex items-start gap-3 text-sm text-muted-foreground">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                <span>Marawi City, Lanao del Sur, Philippines</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <Phone className="h-4 w-4 shrink-0" />
                <span>+63 912 345 6789</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <Mail className="h-4 w-4 shrink-0" />
                <span>hello@lanaocrafts.ph</span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-12 border-t border-border pt-6">
          <div className="flex flex-col items-center justify-between gap-4 text-center sm:flex-row sm:text-left">
            <p className="text-sm text-muted-foreground">
              © 2024 LanaoCrafts. All rights reserved.
            </p>
            <div className="flex gap-6">
              <Link to="#" className="text-sm text-muted-foreground transition-colors hover:text-primary">
                Privacy Policy
              </Link>
              <Link to="#" className="text-sm text-muted-foreground transition-colors hover:text-primary">
                Terms of Service
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
