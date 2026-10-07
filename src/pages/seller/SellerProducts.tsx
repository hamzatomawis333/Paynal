import { resolveApiImageUrl } from "@/lib/api";
import { getErrorMessage } from "@/lib/errors";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { SellerLayout } from "@/components/seller/SellerLayout";
import { useSellerProducts, useDeleteProduct } from "@/hooks/useSeller";
import { useCategories } from "@/hooks/useProducts";
import { useSellerSubscription, useStartAdminConversation } from "@/hooks/useSubscription";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Plus, Pencil, Trash2, Package, CreditCard, MessageCircle, Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { TableSkeleton } from "@/components/LoadingSkeleton";
import { StatusBadge } from "@/components/StatusBadge";
import { formatPrice } from "@/lib/format";
import { ProductForm } from "@/components/seller/ProductForm";
import type { SellerProduct } from "@/lib/seller-api";
import { toast } from "sonner";

export default function SellerProducts() {
  const navigate = useNavigate();
  const { data: products, isLoading, isError, refetch } = useSellerProducts();
  const { data: categories } = useCategories();
  const { data: subData } = useSellerSubscription();
  const startChat = useStartAdminConversation();
  const deleteMutation = useDeleteProduct();
  const [editProduct, setEditProduct] = useState<SellerProduct | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const hasActive = subData?.has_active_subscription ?? false;

  const handleDelete = async (id: number) => {
    try {
      await deleteMutation.mutateAsync(id);
      toast.success("Product has been removed.");
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to delete this product"));
    }
  };

  const openAdd = () => {
    if (!hasActive) {
      toast.error("Active subscription required to add products");
      return;
    }
    setEditProduct(null);
    setDialogOpen(true);
  };

  const openEdit = (product: SellerProduct) => {
    if (!hasActive) {
      toast.error("Active subscription required to edit products");
      return;
    }
    setEditProduct(product);
    setDialogOpen(true);
  };

  function handleChatAdmin() {
    startChat.mutate(undefined, {
      onSuccess: (d) => navigate(`/seller/messages?conversation=${d.conversation_id}`),
      onError: (e) => toast.error(getErrorMessage(e, "Failed")),
    });
  }

  return (
    <SellerLayout>
      <div className="space-y-6">
        <PageHeader
          title="Product Management"
          subtitle="Manage your product listings"
          actions={
            <Button onClick={openAdd} variant="gold" disabled={!hasActive}>
              <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
              Add Product
            </Button>
          }
        />

        {!hasActive && (
          <Card className="border-amber-500/40 bg-amber-500/10 shadow-soft">
            <CardContent className="p-6">
              <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/15">
                    <CreditCard className="h-5 w-5 text-amber-700 dark:text-amber-400" aria-hidden="true" />
                  </div>
                  <div>
                    <h3 className="font-display font-semibold text-foreground">Subscription Required</h3>
                    <p className="text-sm text-muted-foreground">
                      You need an active subscription to add, edit, or publish products.
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Price: <span className="font-bold text-primary">₱299</span> for 30 days
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="gold" size="sm" onClick={() => navigate("/seller/subscription")}>
                    Subscribe Now
                  </Button>
                  <Button variant="teal" size="sm" onClick={handleChatAdmin} disabled={startChat.isPending}>
                    {startChat.isPending ? <Loader2 className="mr-1 h-3 w-3 animate-spin" aria-hidden="true" /> : <MessageCircle className="mr-1 h-3 w-3" aria-hidden="true" />}
                    Chat with Admin
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="shadow-soft">
          <CardContent className="p-0">
            {isLoading ? (
              <TableSkeleton cols={6} />
            ) : isError ? (
              <ErrorState className="py-12" onRetry={() => void refetch()} />
            ) : !products?.length ? (
              <EmptyState
                icon={Package}
                title="No products yet"
                description={
                  hasActive
                    ? "Add your first product to start selling."
                    : "Subscribe to start selling."
                }
                action={
                  !hasActive && (
                    <Button variant="gold" onClick={() => navigate("/seller/subscription")}>
                      Subscribe to Sell
                    </Button>
                  )
                }
              />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead className="hidden md:table-cell">Category</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead className="hidden sm:table-cell">Stock</TableHead>
                    <TableHead className="hidden sm:table-cell">Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products.map((product) => (
                    <TableRow key={product.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <img
                            src={resolveApiImageUrl(product.image_url)}
                            alt=""
                            className="h-10 w-10 rounded-lg object-cover"
                          />
                          <div>
                            <p className="text-sm font-medium text-foreground">{product.name}</p>
                            <p className="hidden max-w-[200px] truncate text-xs text-muted-foreground md:block">
                              {product.description}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <Badge variant="secondary">{product.category_name}</Badge>
                      </TableCell>
                      <TableCell className="font-semibold tabular-nums">
                        {formatPrice(parseFloat(product.price))}
                      </TableCell>
                      <TableCell className="hidden tabular-nums sm:table-cell">{product.stock_quantity}</TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <StatusBadge
                          status={product.is_active ? "active" : "inactive"}
                          kind="active"
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEdit(product)}
                            title={`Edit ${product.name}`}
                            aria-label={`Edit ${product.name}`}
                          >
                            <Pencil className="h-4 w-4" aria-hidden="true" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                                title={`Delete ${product.name}`}
                                aria-label={`Delete ${product.name}`}
                              >
                                <Trash2 className="h-4 w-4" aria-hidden="true" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Product</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete "{product.name}"? This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDelete(product.id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="font-display">
                {editProduct ? "Edit Product" : "Add New Product"}
              </DialogTitle>
            </DialogHeader>
            <ProductForm
              product={editProduct}
              categories={categories || []}
              onSuccess={() => setDialogOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </div>
    </SellerLayout>
  );
}
