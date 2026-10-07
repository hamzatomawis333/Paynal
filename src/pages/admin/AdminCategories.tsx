import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { useAdminCategories } from "@/hooks/useAdmin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { TableSkeleton } from "@/components/LoadingSkeleton";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, FolderTree } from "lucide-react";
import { getErrorMessage } from "@/lib/errors";
import type { AdminCategory } from "@/types/api";

const AdminCategories = () => {
  const {
    data: categories, isLoading, isError, refetch,
    createCategory, updateCategory, deleteCategory,
  } = useAdminCategories();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<AdminCategory | null>(null);
  const [form, setForm] = useState({ name: "", slug: "", description: "" });

  const openCreate = () => {
    setEditing(null);
    setForm({ name: "", slug: "", description: "" });
    setDialogOpen(true);
  };

  const openEdit = (cat: AdminCategory) => {
    setEditing(cat);
    setForm({ name: cat.name, slug: cat.slug, description: cat.description || "" });
    setDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.slug) { toast.error("Name and slug are required"); return; }

    if (editing) {
      updateCategory.mutate(
        { id: Number(editing.id), ...form },
        {
          onSuccess: () => { toast.success("Category updated"); setDialogOpen(false); },
          onError: (err) => toast.error(getErrorMessage(err, "Failed to update category")),
        }
      );
    } else {
      createCategory.mutate(form, {
        onSuccess: () => { toast.success("Category created"); setDialogOpen(false); },
        onError: (err) => toast.error(getErrorMessage(err, "Failed to create category")),
      });
    }
  };

  const handleDelete = (cat: AdminCategory) => {
    if (!confirm(`Delete category "${cat.name}"?`)) return;
    deleteCategory.mutate(Number(cat.id), {
      onSuccess: () => toast.success("Category deleted"),
      onError: (err) => toast.error(getErrorMessage(err, "Failed to delete category")),
    });
  };

  const generateSlug = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

  return (
    <AdminLayout>
      <Helmet><title>Category Management | Admin</title></Helmet>

      <div className="space-y-6">
        <PageHeader
          title="Category Management"
          subtitle="Organise products into browsable categories"
          actions={
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="gold" onClick={openCreate}>
                  <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
                  Add Category
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editing ? "Edit Category" : "New Category"}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="category-name">Name</Label>
                    <Input
                      id="category-name"
                      value={form.name}
                      onChange={(e) => { setForm({ ...form, name: e.target.value, slug: editing ? form.slug : generateSlug(e.target.value) }); }}
                      placeholder="e.g., Brass Works"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="category-slug">Slug</Label>
                    <Input
                      id="category-slug"
                      value={form.slug}
                      onChange={(e) => setForm({ ...form, slug: e.target.value })}
                      placeholder="e.g., brass-works"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="category-description">Description</Label>
                    <Textarea
                      id="category-description"
                      value={form.description}
                      onChange={(e) => setForm({ ...form, description: e.target.value })}
                      placeholder="Category description..."
                      rows={3}
                    />
                  </div>
                  <Button
                    type="submit"
                    variant="gold"
                    className="w-full"
                    disabled={createCategory.isPending || updateCategory.isPending}
                  >
                    {createCategory.isPending || updateCategory.isPending
                      ? "Saving..."
                      : `${editing ? "Update" : "Create"} Category`}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          }
        />

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">All Categories ({categories?.length ?? 0})</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <TableSkeleton cols={5} />
            ) : isError ? (
              <ErrorState dense onRetry={() => void refetch()} />
            ) : !categories?.length ? (
              <EmptyState
                dense
                icon={FolderTree}
                title="No categories yet"
                description="Create your first category to start organising products."
                action={
                  <Button variant="gold" size="sm" onClick={openCreate}>
                    <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
                    Add Category
                  </Button>
                }
              />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead className="hidden md:table-cell">Slug</TableHead>
                    <TableHead className="hidden lg:table-cell">Description</TableHead>
                    <TableHead>Products</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {categories.map((cat) => (
                    <TableRow key={cat.id}>
                      <TableCell className="font-medium text-foreground">
                        {cat.name}
                        <span className="block text-xs font-normal text-muted-foreground md:hidden">
                          {cat.slug}
                        </span>
                      </TableCell>
                      <TableCell className="hidden text-muted-foreground md:table-cell">
                        {cat.slug}
                      </TableCell>
                      <TableCell className="hidden max-w-xs truncate text-muted-foreground lg:table-cell">
                        {cat.description || "—"}
                      </TableCell>
                      <TableCell className="tabular-nums">{cat.product_count}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEdit(cat)}
                            title={`Edit ${cat.name}`}
                            aria-label={`Edit ${cat.name}`}
                          >
                            <Pencil className="h-4 w-4" aria-hidden="true" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                            onClick={() => handleDelete(cat)}
                            title={`Delete ${cat.name}`}
                            aria-label={`Delete ${cat.name}`}
                          >
                            <Trash2 className="h-4 w-4" aria-hidden="true" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AdminCategories;
