import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  ReactNode,
} from "react";
import { CartItem, Product } from "@/types/product";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import {
  apiProductToProduct,
  fetchCart,
  addToCartApi,
  updateCartItem,
  removeCartItem,
  clearCartApi,
  type ApiCartRow,
} from "@/lib/api";
import { getErrorMessage } from "@/lib/errors";

const CART_ITEMS_KEY = "maranao_cart_items";
const CART_SELECTED_KEY = "maranao_cart_selected";
/** Which account populated the locally stored cart (merge vs replace). */
const CART_OWNER_KEY = "maranao_cart_owner";

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

function readOwner(): string | null {
  try {
    return localStorage.getItem(CART_OWNER_KEY);
  } catch {
    return null;
  }
}

function writeOwner(owner: string | null) {
  try {
    if (owner === null) localStorage.removeItem(CART_OWNER_KEY);
    else localStorage.setItem(CART_OWNER_KEY, owner);
  } catch {
    // ignore
  }
}

function rowToCartItem(row: ApiCartRow): CartItem {
  return { ...apiProductToProduct(row), quantity: Number(row.quantity) };
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
  const { user, isLoading: authLoading } = useAuth();

  const [items, setItems] = useState<CartItem[]>(() => readStored<CartItem>(CART_ITEMS_KEY));
  const [selectedIds, setSelectedIds] = useState<string[]>(() =>
    readStored<string>(CART_SELECTED_KEY)
  );

  // The user id whose server cart has been merged into `items`. null = guest
  // mode (localStorage only). Logged-in writes only go to the server once
  // hydration has finished, so a mid-hydration click can never be dropped.
  const syncedUserId = useRef<string | null>(null);
  const currentUserId = user && !authLoading ? String(user.id) : null;

  // A selection can only ever contain ids that are still in the cart, so
  // removing a product cannot leave a dangling checkbox behind.
  const pruneSelection = (cart: CartItem[], selection: string[]) => {
    const present = new Set(cart.map((i) => i.id));
    return selection.filter((id) => present.has(id));
  };

  // Prune whenever the cart itself changes (mount, hydration replace,
  // removals) - a hydrated server cart may not contain locally ticked ids.
  useEffect(() => {
    setSelectedIds((prev) => {
      const pruned = pruneSelection(items, prev);
      return pruned.length === prev.length ? prev : pruned;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items]);

  // Persist across refreshes: without this the cart resets to empty every reload.
  useEffect(() => {
    writeStored(CART_ITEMS_KEY, items);
  }, [items]);

  useEffect(() => {
    writeStored(CART_SELECTED_KEY, selectedIds);
  }, [selectedIds]);

  // ---- server hydration (logged-in users) ----
  useEffect(() => {
    if (authLoading || currentUserId === null) return;
    if (syncedUserId.current === currentUserId) return;

    const uid = currentUserId;
    const localOwner = readOwner();
    let cancelled = false;

    void (async () => {
      try {
        const server = await fetchCart();
        if (cancelled) return;
        const serverItems = server.cart.map(rowToCartItem);

        if (localOwner === uid) {
          // Same account as before (guest session, or previous page load):
          // push anything the server doesn't know about yet, then merge.
          const serverIds = new Set(serverItems.map((i) => i.id));
          const missing = items.filter((i) => !serverIds.has(i.id));
          await Promise.all(
            missing.map((i) => addToCartApi(Number(i.id), i.quantity).catch(() => undefined))
          );
          if (cancelled) return;
          const pushedIds = new Set(missing.map((i) => i.id));
          setItems((prev) => {
            const merged = [...serverItems];
            const have = new Set(serverItems.map((i) => i.id));
            for (const p of prev) {
              // keep concurrent adds made while the fetch was in flight
              if (!have.has(p.id) && !pushedIds.has(p.id)) {
                merged.push(p);
                have.add(p.id);
              }
            }
            return merged;
          });
        } else {
          // Fresh browser or a different account: the server cart wins and
          // the previous account's local items must not leak into it.
          setItems(serverItems);
          setSelectedIds([]);
        }

        writeOwner(uid);
        syncedUserId.current = uid;
      } catch (err) {
        // Offline / API down: fall back to whatever we have locally instead
        // of blowing up. Writes stay local until a later session succeeds.
        console.warn("Cart hydration failed, staying on local cart:", err);
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, currentUserId]);

  // On logout the local items stay visible (nice continuity), but they now
  // belong to no account: the next login decides merge vs replace.
  useEffect(() => {
    if (!authLoading && currentUserId === null) {
      syncedUserId.current = null;
    }
  }, [authLoading, currentUserId]);

  const isSynced = () =>
    currentUserId !== null && syncedUserId.current === currentUserId;

  // Replaces state with the authoritative server cart after a failed write.
  const resync = async () => {
    if (!isSynced()) return;
    try {
      const server = await fetchCart();
      setItems(server.cart.map(rowToCartItem));
    } catch {
      // Keep the optimistic state; the next hydration will reconcile.
    }
  };

  const addToCart = (product: Product) => {
    if (isSynced()) {
      // Server upsert matches local semantics exactly: +1 for an existing
      // row, quantity 1 for a new one.
      addToCartApi(Number(product.id), 1).catch(async (err) => {
        toast.error(getErrorMessage(err, "Couldn't add to cart"));
        await resync();
      });
    }
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
    if (isSynced()) {
      removeCartItem(Number(productId)).catch(async (err) => {
        toast.error(getErrorMessage(err, "Couldn't update cart"));
        await resync();
      });
    }
    setItems((prev) => prev.filter((item) => item.id !== productId));
    setSelectedIds((prev) => prev.filter((id) => id !== productId));
    toast.info("Item removed from cart");
  };

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity < 1) {
      removeFromCart(productId);
      return;
    }
    if (isSynced()) {
      updateCartItem(Number(productId), quantity).catch(async (err) => {
        toast.error(getErrorMessage(err, "Couldn't update quantity"));
        await resync();
      });
    }
    setItems((prev) =>
      prev.map((item) =>
        item.id === productId ? { ...item, quantity } : item
      )
    );
  };

  const clearCart = () => {
    if (isSynced()) {
      clearCartApi().catch(async (err) => {
        toast.error(getErrorMessage(err, "Couldn't clear cart"));
        await resync();
      });
    }
    setItems([]);
    setSelectedIds([]);
    toast.info("Cart cleared");
  };

  const removeItems = (productIds: string[]) => {
    const drop = new Set(productIds);
    if (isSynced()) {
      Promise.all(productIds.map((id) => removeCartItem(Number(id)).catch(() => undefined)))
        .catch(() => undefined);
    }
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
