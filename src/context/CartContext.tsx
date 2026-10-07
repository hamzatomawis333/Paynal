import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { CartItem, Product } from "@/types/product";
import { toast } from "sonner";

const CART_ITEMS_KEY = "maranao_cart_items";
const CART_SELECTED_KEY = "maranao_cart_selected";

/** Reads a JSON list from localStorage, falling back to [] on missing/corrupt data. */
function readStored<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

function writeStored(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage full or unavailable - the cart still works for this session.
  }
}

interface CartContextType {
  items: CartItem[];
  addToCart: (product: Product) => void;
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  /** Drops only the given products, used after a partial checkout. */
  removeItems: (productIds: string[]) => void;
  totalItems: number;
  totalPrice: number;
  // ---- selection ----
  /** Product ids ticked for checkout. Everything else stays in the cart. */
  selectedIds: string[];
  selectedItems: CartItem[];
  selectedTotalPrice: number;
  selectedCount: number;
  isSelected: (productId: string) => boolean;
  toggleSelected: (productId: string) => void;
  selectAll: () => void;
  clearSelection: () => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(() => readStored<CartItem>(CART_ITEMS_KEY));
  const [selectedIds, setSelectedIds] = useState<string[]>(() =>
    readStored<string>(CART_SELECTED_KEY)
  );

  // A selection can only ever contain ids that are still in the cart, so
  // removing a product cannot leave a dangling checkbox behind.
  const pruneSelection = (cart: CartItem[], selection: string[]) => {
    const present = new Set(cart.map((i) => i.id));
    return selection.filter((id) => present.has(id));
  };

  // Hydration can leave a selection pointing at products that were removed in
  // a previous session, so prune it once against the restored cart.
  useEffect(() => {
    setSelectedIds((prev) => {
      const pruned = pruneSelection(items, prev);
      return pruned.length === prev.length ? prev : pruned;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist across refreshes: without this the cart resets to empty every reload.
  useEffect(() => {
    writeStored(CART_ITEMS_KEY, items);
  }, [items]);

  useEffect(() => {
    writeStored(CART_SELECTED_KEY, selectedIds);
  }, [selectedIds]);

  const addToCart = (product: Product) => {
    setItems((prev) => {
      const existing = prev.find((item) => item.id === product.id);
      if (existing) {
        toast.success(`Added another ${product.name} to cart`);
        return prev.map((item) =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      toast.success(`${product.name} added to cart`);
      return [...prev, { ...product, quantity: 1 }];
    });
    // New items are ticked by default: the buyer asked for them.
    setSelectedIds((prev) => (prev.includes(product.id) ? prev : [...prev, product.id]));
  };

  const removeFromCart = (productId: string) => {
    setItems((prev) => prev.filter((item) => item.id !== productId));
    setSelectedIds((prev) => prev.filter((id) => id !== productId));
    toast.info("Item removed from cart");
  };

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity < 1) {
      removeFromCart(productId);
      return;
    }
    setItems((prev) =>
      prev.map((item) =>
        item.id === productId ? { ...item, quantity } : item
      )
    );
  };

  const clearCart = () => {
    setItems([]);
    setSelectedIds([]);
    toast.info("Cart cleared");
  };

  const removeItems = (productIds: string[]) => {
    const drop = new Set(productIds);
    setItems((prev) => prev.filter((item) => !drop.has(item.id)));
    setSelectedIds((prev) => prev.filter((id) => !drop.has(id)));
  };

  const isSelected = (productId: string) => selectedIds.includes(productId);

  const toggleSelected = (productId: string) => {
    setSelectedIds((prev) =>
      prev.includes(productId)
        ? prev.filter((id) => id !== productId)
        : [...prev, productId]
    );
  };

  const selectAll = () => setSelectedIds(items.map((i) => i.id));

  const clearSelection = () => setSelectedIds([]);

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  // Totals for the ticked items only - this is what checkout charges.
  const selectedItems = items.filter((item) => selectedIds.includes(item.id));
  const selectedCount = selectedItems.reduce((sum, item) => sum + item.quantity, 0);
  const selectedTotalPrice = selectedItems.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  return (
    <CartContext.Provider
      value={{
        items,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        removeItems,
        totalItems,
        totalPrice,
        selectedIds,
        selectedItems,
        selectedTotalPrice,
        selectedCount,
        isSelected,
        toggleSelected,
        selectAll,
        clearSelection,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}