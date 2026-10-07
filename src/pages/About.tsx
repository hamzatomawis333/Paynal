import { Helmet } from "react-helmet-async";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Card } from "@/components/ui/card";
import heroImage from "@/assets/hero-maranao.jpg";
import { Heart, Users, Globe, Award } from "lucide-react";

const About = () => {
  return (
    <>
      <Helmet>
        <title>About Us | LanaoCrafts</title>
        <meta
          name="description"
          content="Learn about LanaoCrafts' mission to preserve and promote Maranao cultural heritage through authentic handcrafted souvenirs."
        />
      </Helmet>

      <div className="min-h-screen">
        <Navbar />
        <main>
          {/* Hero */}
          <section className="relative overflow-hidden bg-gradient-hero py-16 lg:py-24">
            <div className="okir-pattern absolute inset-0 opacity-30" />
            <div className="container relative mx-auto px-4">
              <div className="grid items-center gap-12 lg:grid-cols-2">
                <div className="animate-fade-up">
                  <h1 className="font-display text-3xl font-bold md:text-4xl lg:text-5xl">
                    Preserving{" "}
                    <span className="text-primary">Cultural Heritage</span>,
                    One Craft at a Time
                  </h1>
                  <p className="mt-6 text-lg text-muted-foreground">
                    LanaoCrafts is more than a marketplace — we're a bridge connecting the rich cultural traditions of Lanao del Sur with people around the world who appreciate authentic artistry.
                  </p>
                </div>
                <div className="animate-fade-up" style={{ animationDelay: "0.2s" }}>
                  <img
                    src={heroImage}
                    alt="Traditional Maranao crafts"
                    className="rounded-2xl shadow-medium"
                  />
                </div>
              </div>
            </div>
          </section>

          {/* Mission */}
          <section className="py-16 lg:py-24">
            <div className="container mx-auto px-4">
              <div className="mx-auto max-w-3xl text-center">
                <h2 className="font-display text-3xl font-bold">
                  Our <span className="text-primary">Mission</span>
                </h2>
                <p className="mt-6 text-lg text-muted-foreground">
                  To support local artisans of Lanao del Sur by providing a platform that celebrates their craftsmanship, preserves Maranao cultural heritage, and creates sustainable livelihoods for communities through the promotion and sale of authentic cultural souvenirs.
                </p>
              </div>

              <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                <Card variant="feature" className="text-center">
                  <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10">
                    <Heart className="h-7 w-7 text-primary" aria-hidden="true" />
                  </div>
                  <h3 className="font-display text-lg font-semibold">Empowerment</h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Supporting artisans and their families through fair trade practices
                  </p>
                </Card>

                <Card variant="feature" className="text-center">
                  <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10">
                    <Users className="h-7 w-7 text-primary" aria-hidden="true" />
                  </div>
                  <h3 className="font-display text-lg font-semibold">Community</h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Building connections between artisans and appreciators worldwide
                  </p>
                </Card>

                <Card variant="feature" className="text-center">
                  <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10">
                    <Globe className="h-7 w-7 text-primary" aria-hidden="true" />
                  </div>
                  <h3 className="font-display text-lg font-semibold">Preservation</h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Keeping traditional crafts alive for future generations
                  </p>
                </Card>

                <Card variant="feature" className="text-center">
                  <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10">
                    <Award className="h-7 w-7 text-primary" aria-hidden="true" />
                  </div>
                  <h3 className="font-display text-lg font-semibold">Authenticity</h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Guaranteeing genuine, handcrafted cultural products
                  </p>
                </Card>
              </div>
            </div>
          </section>

          {/* Maranao Culture */}
          <section className="bg-secondary/30 py-16 lg:py-24">
            <div className="container mx-auto px-4">
              <div className="mx-auto max-w-3xl">
                <h2 className="text-center font-display text-3xl font-bold">
                  The <span className="text-primary">Maranao</span> Heritage
                </h2>
                <div className="mt-8 space-y-6 text-muted-foreground">
                  <p>
                    The Maranao people, whose name means "People of the Lake," are one of the largest indigenous groups in the Philippines. Living around the scenic Lake Lanao in Lanao del Sur, they have developed a rich cultural tradition that spans centuries.
                  </p>
                  <p>
                    Central to Maranao artistry is the <strong className="text-foreground">Okir</strong>, an intricate form of decorative design featuring curvilinear patterns inspired by nature — particularly the flowing forms of leaves, vines, and mythical creatures. This art form adorns everything from brassware to textiles, architecture to weapons.
                  </p>
                  <p>
                    The <strong className="text-foreground">Sarimanok</strong>, a legendary bird depicted in vibrant colors with a fish in its beak, is perhaps the most iconic symbol of Maranao culture, representing good fortune and prosperity.
                  </p>
                  <p>
                    Through LanaoCrafts, we aim to share these beautiful traditions with the world while ensuring that the artisans who keep these crafts alive are fairly compensated and celebrated for their invaluable contributions to Philippine cultural heritage.
                  </p>
                </div>
              </div>
            </div>
          </section>
        </main>
        <Footer />
      </div>
    </>
  );
};

export default About;
