import { getErrorMessage } from "@/lib/errors";
import { Helmet } from "react-helmet-async";
import { useNavigate } from "react-router-dom";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useArtisans } from "@/hooks/useProducts";
import { useStartConversation } from "@/hooks/useMessages";
import { getStoredUser } from "@/lib/api";
import { ErrorState } from "@/components/ErrorState";
import { toast } from "sonner";
import { MapPin, Loader2, MessageCircle } from "lucide-react";

const Artisans = () => {
  const { data: artisans = [], isLoading, isError, refetch } = useArtisans();
  const navigate = useNavigate();
  const startConv = useStartConversation();

  function handleMessage(sellerId: number) {
    const me = getStoredUser();
    if (!me || me.role !== "buyer") {
      toast.error("Please login as a buyer to message artisans");
      return;
    }
    startConv.mutate(
      { sellerId, productId: null },
      {
        onSuccess: (data) => navigate(`/account/messages?conversation=${data.conversation_id}`),
        onError: (e) => toast.error(getErrorMessage(e, "Failed to start chat")),
      }
    );
  }

  return (
    <>
      <Helmet>
        <title>Meet Our Artisans | LanaoCrafts</title>
        <meta
          name="description"
          content="Meet the talented Maranao artisans behind our cultural treasures. Learn their stories and traditions."
        />
      </Helmet>

      <div className="min-h-screen">
        <Navbar />
        <main className="container mx-auto px-4 py-8">
          {/* Header */}
          <div className="mb-12 text-center">
            <h1 className="font-display text-3xl font-bold md:text-4xl lg:text-5xl">
              Meet Our <span className="text-primary">Master Artisans</span>
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
              The heart and soul of LanaoCrafts — talented craftspeople preserving centuries of Maranao tradition
            </p>
          </div>

          {/* Loading */}
          {isLoading && (
            <div className="flex items-center justify-center py-16" role="status" aria-label="Loading artisans">
              <Loader2 className="h-8 w-8 animate-spin text-primary" aria-hidden="true" />
            </div>
          )}

          {/* Error */}
          {isError && (
            <ErrorState
              title="We couldn't load our artisans"
              description="Something went wrong while fetching the artisan profiles. Please check your connection and try again."
              onRetry={() => void refetch()}
            />
          )}

          {/* Empty */}
          {!isLoading && !isError && artisans.length === 0 && (
            <p className="py-16 text-center text-muted-foreground">
              No artisans to show just yet — check back soon.
            </p>
          )}

          {/* Artisans Grid */}
          {!isLoading && !isError && artisans.length > 0 && (
            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
              {artisans.map((artisan, index) => (
                <Card
                  key={artisan.id}
                  variant="artisan"
                  className="animate-fade-up p-8"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <div className="mb-6 flex items-center gap-4">
                    <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-gold text-3xl font-bold text-primary-foreground shadow-gold">
                      {artisan.full_name.charAt(0)}
                    </div>
                    <div>
                      <h2 className="font-display text-xl font-semibold">
                        {artisan.full_name}
                      </h2>
                      <p className="text-primary">{artisan.specialty}</p>
                    </div>
                  </div>
                  <p className="mb-6 text-muted-foreground">{artisan.bio}</p>
                  <div className="mb-6 flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4" aria-hidden="true" />
                    {artisan.location}
                  </div>
                  <Button
                    variant="teal"
                    className="w-full"
                    onClick={() => handleMessage(artisan.id)}
                    disabled={startConv.isPending}
                  >
                    <MessageCircle className="mr-2 h-4 w-4" aria-hidden="true" />
                    Message Artisan
                  </Button>
                </Card>
              ))}
            </div>
          )}

          {/* Call to Action */}
          <div className="mt-16 rounded-2xl bg-secondary/50 p-8 text-center lg:p-12">
            <h2 className="font-display text-2xl font-bold md:text-3xl">
              Are You an Artisan?
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
              Join our community of master craftspeople and share your cultural treasures with the world. We support local artisans in preserving and promoting Maranao heritage.
            </p>
          </div>
        </main>
        <Footer />
      </div>
    </>
  );
};

export default Artisans;
