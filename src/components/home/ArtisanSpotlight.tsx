import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useArtisans } from "@/hooks/useProducts";
import { ArrowRight, MapPin, Loader2 } from "lucide-react";

export function ArtisanSpotlight() {
  const { data: artisans = [], isLoading } = useArtisans();

  return (
    <section className="py-16 lg:py-24">
      <div className="container mx-auto px-4">
        <div className="mb-12 flex flex-col items-start justify-between gap-4 md:flex-row md:items-end">
          <div>
            <h2 className="font-display text-3xl font-bold md:text-4xl">
              Meet Our <span className="text-primary">Artisans</span>
            </h2>
            <p className="mt-2 max-w-lg text-muted-foreground">
              The talented hands behind every cultural treasure
            </p>
          </div>
          <Button variant="outline" asChild>
            <Link to="/artisans">
              View All Artisans
              <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
            </Link>
          </Button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12" role="status" aria-label="Loading">
            <Loader2 className="h-8 w-8 animate-spin text-primary" aria-hidden="true" />
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {artisans.map((artisan) => (
              <Card key={artisan.id} variant="artisan" className="p-6">
                <div className="mb-4 flex items-center gap-4">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-gold text-2xl font-bold text-primary-foreground">
                    {artisan.full_name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-display text-lg font-semibold">
                      {artisan.full_name}
                    </h3>
                    <p className="text-sm text-primary">{artisan.specialty}</p>
                  </div>
                </div>
                <p className="mb-4 text-sm text-muted-foreground">
                  {artisan.bio}
                </p>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="h-4 w-4" aria-hidden="true" />
                  {artisan.location}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
