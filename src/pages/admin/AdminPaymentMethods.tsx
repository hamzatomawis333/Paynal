import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { useAdminPaymentMethods } from "@/hooks/useAdmin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { TableSkeleton } from "@/components/LoadingSkeleton";
import { StatusBadge } from "@/components/StatusBadge";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, CreditCard, Wallet, Building2, Globe, Banknote } from "lucide-react";
import { getErrorMessage } from "@/lib/errors";
import type { AdminPaymentMethod } from "@/types/api";

const iconMap: Record<string, React.ElementType> = {
  cod: Banknote,
  gcash: Wallet,
  bank_transfer: Building2,
  credit_card: CreditCard,
  paypal: Globe,
};

const defaultMethods = [
  { name: "Cash on Delivery (COD)", code: "cod", description: "Buyer pays when the item arrives.", icon: "cod", sort_order: 1 },
  { name: "GCash", code: "gcash", description: "Popular mobile wallet in the Philippines.", icon: "gcash", sort_order: 2 },
  { name: "Bank Transfer", code: "bank_transfer", description: "Payment through a bank account.", icon: "bank_transfer", sort_order: 3 },
  { name: "Credit / Debit Card", code: "credit_card", description: "Using Visa or Mastercard.", icon: "credit_card", sort_order: 4 },
  { name: "PayPal", code: "paypal", description: "International online payment system.", icon: "paypal", sort_order: 5 },
];

const AdminPaymentMethods = () => {
  const {
    data: methods, isLoading, isError, refetch,
    createMethod, updateMethod, deleteMethod,
  } = useAdminPaymentMethods();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<AdminPaymentMethod | null>(null);
  const [form, setForm] = useState({ name: "", code: "", description: "", icon: "", is_active: 1, sort_order: 0 });

  const openCreate = () => {
    setEditing(null);
    setForm({ name: "", code: "", description: "", icon: "", is_active: 1, sort_order: (methods?.length ?? 0) + 1 });
    setDialogOpen(true);
  };

  const openEdit = (m: AdminPaymentMethod) => {
    setEditing(m);
    setForm({
      name: m.name,
      code: m.code,
      description: m.description || "",
      icon: m.icon || "",
      is_active: Number(m.is_active),
      sort_order: Number(m.sort_order),
    });
    setDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.code) { toast.error("Name and code are required"); return; }

    if (editing) {
      updateMethod.mutate(
        { id: Number(editing.id), ...form },
        {
          onSuccess: () => { toast.success("Payment method updated"); setDialogOpen(false); },
          onError: (err) => toast.error(getErrorMessage(err, "Failed to update payment method")),
        }
      );
    } else {
      createMethod.mutate(form, {
        onSuccess: () => { toast.success("Payment method created"); setDialogOpen(false); },
        onError: (err) => toast.error(getErrorMessage(err, "Failed to create payment method")),
      });
    }
  };

  const handleDelete = (m: AdminPaymentMethod) => {
    if (!confirm(`Delete payment method "${m.name}"?`)) return;
    deleteMethod.mutate(Number(m.id), {
      onSuccess: () => toast.success("Payment method deleted"),
      onError: (err) => toast.error(getErrorMessage(err, "Failed to delete payment method")),
    });
  };

  const handleToggleActive = (m: AdminPaymentMethod) => {
    updateMethod.mutate(
      { id: Number(m.id), name: m.name, code: m.code, is_active: Number(m.is_active) === 1 ? 0 : 1 },
      {
        onSuccess: () => toast.success(`${m.name} ${Number(m.is_active) === 1 ? "disabled" : "enabled"}`),
        onError: (err) => toast.error(getErrorMessage(err, "Failed to update payment method")),
      }
    );
  };

  const seedDefaults = () => {
    defaultMethods.forEach((m) => {
      createMethod.mutate(m, { onError: () => {} });
    });
    toast.success("Default payment methods added!");
  };

  const generateCode = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/(^_|_$)/g, "");

  const getIcon = (icon: string) => {
    const Icon = iconMap[icon] || CreditCard;
    return <Icon className="h-4 w-4" aria-hidden="true" />;
  };

  return (
    <AdminLayout>
      <Helmet><title>Payment Methods | Admin</title></Helmet>

      <div className="space-y-6">
        <PageHeader
          title="Payment Methods"
          subtitle="Manage available payment options for buyers"
          actions={
            <div className="flex flex-wrap gap-2">
              {(!methods || methods.length === 0) && !isLoading && (
                <Button variant="outline" onClick={seedDefaults}>
                  <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
                  Seed Defaults
                </Button>
              )}
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="gold" onClick={openCreate}>
                    <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
                    Add Method
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
                  <DialogHeader>
                    <DialogTitle>{editing ? "Edit Payment Method" : "New Payment Method"}</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="pm-name">Name</Label>
                      <Input
                        id="pm-name"
                        value={form.name}
                        onChange={(e) => setForm({ ...form, name: e.target.value, code: editing ? form.code : generateCode(e.target.value) })}
                        placeholder="e.g., Cash on Delivery (COD)"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="pm-code">Code</Label>
                      <Input
                        id="pm-code"
                        value={form.code}
                        onChange={(e) => setForm({ ...form, code: e.target.value })}
                        placeholder="e.g., cod"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="pm-description">Description</Label>
                      <Textarea
                        id="pm-description"
                        value={form.description}
                        onChange={(e) => setForm({ ...form, description: e.target.value })}
                        placeholder="Brief description of this payment method..."
                        rows={3}
                      />
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="pm-icon">Icon Key</Label>
                        <Input
                          id="pm-icon"
                          value={form.icon}
                          onChange={(e) => setForm({ ...form, icon: e.target.value })}
                          placeholder="e.g., cod, gcash"
                        />
                        <p className="text-xs text-muted-foreground">Keys: cod, gcash, bank_transfer, credit_card, paypal</p>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="pm-sort">Sort Order</Label>
                        <Input
                          id="pm-sort"
                          type="number"
                          value={form.sort_order}
                          onChange={(e) => setForm({ ...form, sort_order: parseInt(e.target.value) || 0 })}
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Switch
                        id="pm-active"
                        checked={form.is_active === 1}
                        onCheckedChange={(v) => setForm({ ...form, is_active: v ? 1 : 0 })}
                      />
                      <Label htmlFor="pm-active" className="cursor-pointer">Active</Label>
                    </div>
                    <Button
                      type="submit"
                      variant="gold"
                      className="w-full"
                      disabled={createMethod.isPending || updateMethod.isPending}
                    >
                      {createMethod.isPending || updateMethod.isPending
                        ? "Saving..."
                        : `${editing ? "Update" : "Create"} Payment Method`}
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          }
        />

        {/* Summary Cards */}
        <div className="grid gap-4 sm:grid-cols-3">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-muted p-2 text-primary" aria-hidden="true"><CreditCard className="h-5 w-5" /></div>
                <div>
                  <p className="text-xs text-muted-foreground">Total Methods</p>
                  <p className="text-lg font-bold tabular-nums text-foreground">{methods?.length ?? 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-muted p-2 text-primary" aria-hidden="true"><Wallet className="h-5 w-5" /></div>
                <div>
                  <p className="text-xs text-muted-foreground">Active</p>
                  <p className="text-lg font-bold tabular-nums text-foreground">{methods?.filter((m) => Number(m.is_active) === 1).length ?? 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-muted p-2 text-muted-foreground" aria-hidden="true"><Banknote className="h-5 w-5" /></div>
                <div>
                  <p className="text-xs text-muted-foreground">Inactive</p>
                  <p className="text-lg font-bold tabular-nums text-foreground">{methods?.filter((m) => Number(m.is_active) === 0).length ?? 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Table */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">All Payment Methods ({methods?.length ?? 0})</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <TableSkeleton cols={7} />
            ) : isError ? (
              <ErrorState dense onRetry={() => void refetch()} />
            ) : !methods?.length ? (
              <EmptyState
                dense
                icon={CreditCard}
                title="No payment methods yet"
                description="Add methods manually, or seed the standard defaults for this region."
                action={
                  <Button variant="gold" onClick={seedDefaults}>
                    <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
                    Add Default Payment Methods
                  </Button>
                }
              />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Method</TableHead>
                    <TableHead className="hidden md:table-cell">Code</TableHead>
                    <TableHead className="hidden lg:table-cell">Description</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="hidden sm:table-cell">Usage</TableHead>
                    <TableHead className="hidden sm:table-cell">Order</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {methods.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="rounded-md bg-muted p-1.5" aria-hidden="true">{getIcon(m.icon)}</div>
                          <span className="font-medium text-foreground">{m.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <code className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">{m.code}</code>
                      </TableCell>
                      <TableCell className="hidden max-w-xs truncate text-muted-foreground lg:table-cell">
                        {m.description || "—"}
                      </TableCell>
                      <TableCell>
                        <button
                          type="button"
                          onClick={() => handleToggleActive(m)}
                          className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          title={Number(m.is_active) === 1 ? "Disable" : "Enable"}
                          aria-label={`${Number(m.is_active) === 1 ? "Disable" : "Enable"} ${m.name}`}
                        >
                          <StatusBadge
                            status={Number(m.is_active) === 1 ? "active" : "inactive"}
                            kind="active"
                          />
                        </button>
                      </TableCell>
                      <TableCell className="hidden tabular-nums sm:table-cell">{m.usage_count ?? 0}</TableCell>
                      <TableCell className="hidden tabular-nums sm:table-cell">{m.sort_order}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEdit(m)}
                            title={`Edit ${m.name}`}
                            aria-label={`Edit ${m.name}`}
                          >
                            <Pencil className="h-4 w-4" aria-hidden="true" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                            onClick={() => handleDelete(m)}
                            title={`Delete ${m.name}`}
                            aria-label={`Delete ${m.name}`}
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

export default AdminPaymentMethods;
