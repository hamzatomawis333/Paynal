import { getErrorMessage } from "@/lib/errors";
import { resolveApiImageUrl } from "@/lib/api";
import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useCreateProduct, useUpdateProduct } from "@/hooks/useSeller";
import { uploadProductImage, type SellerProduct } from "@/lib/seller-api";
import { useToast } from "@/hooks/use-toast";
import { Upload, Loader2 } from "lucide-react";

interface ProductFormProps {
  product: SellerProduct | null;
  categories: Array<{ id: number; name: string; slug: string; description: string }>;
  onSuccess: () => void;
}

export function ProductForm({ product, categories, onSuccess }: ProductFormProps) {
  const isEdit = !!product;
  const createMutation = useCreateProduct();
  const updateMutation = useUpdateProduct();
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    name: product?.name || "",
    description: product?.description || "",
    cultural_background: product?.cultural_background || "",
    price: product?.price || "",
    stock_quantity: String(product?.stock_quantity ?? ""),
    category_id: String(product?.category_id ?? ""),
    image_url: product?.image_url || "",
    is_active: product?.is_active ?? 1,
  });

  const [uploading, setUploading] = useState(false);

  const handleChange = (key: string, value: string | number) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const result = await uploadProductImage(file);
      handleChange("image_url", result.image_url);
      toast({ title: "Image uploaded" });
    } catch (error) {
      toast({ title: "Upload failed", description: getErrorMessage(error), variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        name: form.name,
        description: form.description,
        cultural_background: form.cultural_background,
        price: parseFloat(form.price),
        stock_quantity: parseInt(form.stock_quantity),
        category_id: parseInt(form.category_id),
        image_url: form.image_url,
        is_active: form.is_active,
      };

      if (isEdit && product) {
        await updateMutation.mutateAsync({ ...payload, id: product.id });
        toast({ title: "Product updated" });
      } else {
        await createMutation.mutateAsync(payload);
        toast({ title: "Product created" });
      }
      onSuccess();
    } catch (error) {
      toast({ title: "Error", description: getErrorMessage(error), variant: "destructive" });
    }
  };

  const isSubmitting = createMutation.isPending || updateMutation.isPending;
  const imagePreview = form.image_url ? resolveApiImageUrl(form.image_url) : null;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="name">Product Name *</Label>
          <Input
            id="name"
            value={form.name}
            onChange={(e) => handleChange("name", e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="category">Category *</Label>
          <Select value={form.category_id} onValueChange={(v) => handleChange("category_id", v)}>
            <SelectTrigger>
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((cat) => (
                <SelectItem key={cat.id} value={String(cat.id)}>
                  {cat.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={form.description}
          onChange={(e) => handleChange("description", e.target.value)}
          rows={3}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="cultural_bg">Cultural Background</Label>
        <Textarea
          id="cultural_bg"
          value={form.cultural_background}
          onChange={(e) => handleChange("cultural_background", e.target.value)}
          rows={2}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="price">Price (₱) *</Label>
          <Input
            id="price"
            type="number"
            min="0"
            step="0.01"
            value={form.price}
            onChange={(e) => handleChange("price", e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="stock">Stock Quantity *</Label>
          <Input
            id="stock"
            type="number"
            min="0"
            value={form.stock_quantity}
            onChange={(e) => handleChange("stock_quantity", e.target.value)}
            required
          />
        </div>
      </div>

      {/* Image Upload */}
      <div className="space-y-2">
        <Label>Product Image</Label>
        <div className="flex items-center gap-4">
          {imagePreview && (
            <img src={imagePreview} alt="Preview" className="h-20 w-20 rounded-lg object-cover border border-border" />
          )}
          <div className="flex flex-col gap-2">
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
            />
            <Button type="button" variant="outline" onClick={() => fileRef.current?.click()} disabled={uploading}>
              {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
              {uploading ? "Uploading..." : "Upload Image"}
            </Button>
            <p className="text-xs text-muted-foreground">Or enter image URL below</p>
          </div>
        </div>
        <Input
          placeholder="https://example.com/image.jpg"
          value={form.image_url}
          onChange={(e) => handleChange("image_url", e.target.value)}
        />
      </div>

      {isEdit && (
        <div className="flex items-center gap-3">
          <Switch
            checked={form.is_active === 1}
            onCheckedChange={(checked) => handleChange("is_active", checked ? 1 : 0)}
          />
          <Label>Active</Label>
        </div>
      )}

      <div className="flex justify-end gap-3 pt-4">
        <Button type="submit" variant="gold" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isEdit ? "Update Product" : "Add Product"}
        </Button>
      </div>
    </form>
  );
}
