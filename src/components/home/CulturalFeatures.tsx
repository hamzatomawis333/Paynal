import { Card } from "@/components/ui/card";
import { Truck, Shield, Palette, Heart } from "lucide-react";

const features = [
  {
    icon: Palette,
    title: "100% Authentic",
    description: "Every product is handcrafted by verified local artisans from Lanao del Sur",
  },
  {
    icon: Shield,
    title: "Quality Assured",
    description: "Each item undergoes quality checks to ensure traditional craftsmanship standards",
  },
  {
    icon: Truck,
    title: "Nationwide Delivery",
    description: "We deliver across the Philippines with secure packaging and tracking",
  },
  {
    icon: Heart,
    title: "Support Local",
    description: "Your purchase directly supports Maranao artisans and their families",
  },
];

export function CulturalFeatures() {
  return (
    <section className="bg-secondary/30 py-16 lg:py-24">
      <div className="container mx-auto px-4">
        <div className="mb-12 text-center">
          <h2 className="font-display text-3xl font-bold md:text-4xl">
            Why Choose <span className="text-primary">LanaoCrafts</span>
          </h2>
          <p className="mx-auto mt-2 max-w-lg text-muted-foreground">
            More than a marketplace — a bridge to cultural heritage
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((feature) => (
            <Card key={feature.title} variant="feature" className="text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10">
                <feature.icon className="h-7 w-7 text-primary" />
              </div>
              <h3 className="font-display text-lg font-semibold">{feature.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{feature.description}</p>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
