"use client";

import React, { createContext, useContext, useState, ReactNode } from "react";
import { mutate as globalMutate } from "swr";
import type { CartItem, MenuItem, Transaction, PaymentMethod } from "../types";
import { transactionsApi } from "../lib/api";
import { toast } from "sonner";

interface CartContextType {
  cart: CartItem[];
  addToCart: (menuItem: MenuItem, trackStock?: boolean, maxStock?: number) => void;
  increaseQty: (menuId: string, variantId?: string, trackStock?: boolean, maxStock?: number) => void;
  decreaseQty: (menuId: string, variantId?: string) => void;
  setItemNote: (menuId: string, note: string, variantId?: string) => void;
  setItemDiscount: (menuId: string, discount: number, variantId?: string) => void;
  clearCart: () => void;
  checkout: (
    payment: PaymentMethod,
    orderNote?: string,
    userId?: string,
    userName?: string,
    cafeId?: number,
    settings?: any,
    menuMap?: Map<string, MenuItem>,
    discountInfo?: { type: string; value: number; amount: number }
  ) => Promise<Transaction | null>;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<CartItem[]>([]);

  const addToCart = (menuItem: MenuItem, trackStock?: boolean, maxStock?: number) => {
    setCart((prev) => {
      const variantId = (menuItem as any).variantId;
      const cartKey = variantId ? `${menuItem.id}-${variantId}` : menuItem.id;
      const existing = prev.find((c) => {
        const existingKey = c.variantId ? `${c.menuId}-${c.variantId}` : c.menuId;
        return existingKey === cartKey;
      });

      const limit = trackStock ? (maxStock || 0) : Infinity;
      const currentQty = existing ? existing.qty : 0;

      if (currentQty + 1 > limit) {
        toast.error(`Stok ${menuItem.name} tidak mencukupi! Tersisa: ${limit - currentQty}`);
        return prev;
      }

      if (existing) {
        return prev.map((c) => {
          const existingKey = c.variantId ? `${c.menuId}-${c.variantId}` : c.menuId;
          return existingKey === cartKey ? { ...c, qty: c.qty + 1 } : c;
        });
      }

      return [
        ...prev,
        {
          menuId: menuItem.id,
          name: menuItem.name,
          price: menuItem.price,
          qty: 1,
          variantId: (menuItem as any).variantId,
          variantName: (menuItem as any).variantName,
        },
      ];
    });
  };

  const increaseQty = (menuId: string, variantId?: string, trackStock?: boolean, maxStock?: number) => {
    setCart((prev) => {
      const cartKey = variantId ? `${menuId}-${variantId}` : menuId;
      const cartItem = prev.find((c) => {
        const existingKey = c.variantId ? `${c.menuId}-${c.variantId}` : c.menuId;
        return existingKey === cartKey;
      });
      if (!cartItem) return prev;

      const limit = trackStock ? (maxStock || 0) : Infinity;

      if (cartItem.qty + 1 > limit) {
        toast.error(`Stok tidak mencukupi! Tersisa: ${limit - cartItem.qty}`);
        return prev;
      }

      return prev.map((c) => {
        const existingKey = c.variantId ? `${c.menuId}-${c.variantId}` : c.menuId;
        return existingKey === cartKey ? { ...c, qty: c.qty + 1 } : c;
      });
    });
  };

  const decreaseQty = (menuId: string, variantId?: string) => {
    setCart((prev) => {
      const cartKey = variantId ? `${menuId}-${variantId}` : menuId;
      return prev
        .map((c) => {
          const existingKey = c.variantId ? `${c.menuId}-${c.variantId}` : c.menuId;
          return existingKey === cartKey ? { ...c, qty: Math.max(0, c.qty - 1) } : c;
        })
        .filter((c) => c.qty > 0);
    });
  };

  const setItemNote = (menuId: string, note: string, variantId?: string) => {
    setCart((prev) => {
      const cartKey = variantId ? `${menuId}-${variantId}` : menuId;
      return prev.map((c) => {
        const existingKey = c.variantId ? `${c.menuId}-${c.variantId}` : c.menuId;
        return existingKey === cartKey ? { ...c, note } : c;
      });
    });
  };

  const setItemDiscount = (menuId: string, discount: number, variantId?: string) => {
    setCart((prev) => {
      const cartKey = variantId ? `${menuId}-${variantId}` : menuId;
      return prev.map((c) => {
        const existingKey = c.variantId ? `${c.menuId}-${c.variantId}` : c.menuId;
        return existingKey === cartKey ? { ...c, discount: Math.max(0, discount) } : c;
      });
    });
  };

  const clearCart = () => setCart([]);

  const checkout = async (
    payment: PaymentMethod,
    orderNote?: string,
    userId?: string,
    userName?: string,
    cafeId?: number,
    settings?: any,
    menuMap?: Map<string, MenuItem>,
    discountInfo?: { type: string; value: number; amount: number }
  ) => {
    if (cart.length === 0) return null;

    // Quick stock check from memory (non-variant items only)
    if (menuMap) {
      for (const cartItem of cart) {
        if (cartItem.variantId) continue;
        const menuItem = menuMap.get(cartItem.menuId);
        if (menuItem?.trackStock && menuItem.stockQuantity !== undefined && menuItem.stockQuantity < cartItem.qty) {
          toast.error(`Stok ${menuItem.name} tidak mencukupi. Tersisa: ${menuItem.stockQuantity}`);
          return null;
        }
      }
    }

    const items = cart.map((c) => {
      const disc = c.discount ?? 0;
      const lineTotal = Math.max(0, c.price * c.qty - disc);
      return {
        menuId: c.menuId,
        variantId: c.variantId,
        variantName: c.variantName,
        sku: c.sku,
        barcode: c.barcode,
        name: c.variantName ? `${c.name} - ${c.variantName}` : c.name,
        price: c.price,
        qty: c.qty,
        note: c.note,
        discount: disc,
        lineTotal,
      };
    });

    const subtotal = items.reduce((sum, it) => sum + it.lineTotal, 0);
    const tax = Math.round(((settings?.taxPercent || 0) / 100) * subtotal);
    const service = Math.round(((settings?.servicePercent || 0) / 100) * subtotal);
    const total = subtotal + tax + service;

    const currentCafeId = cafeId !== null && cafeId !== undefined ? Number(cafeId) : 1;
    const currentUserId = userId || "unknown";

    const txData: Record<string, unknown> = {
      subtotal,
      taxAmount: tax,
      serviceCharge: service,
      totalAmount: total,
      paymentMethod: payment,
      paymentAmount: total,
      changeAmount: 0,
      orderNote: orderNote || "",
      cafe_id: currentCafeId,
      created_by: currentUserId,
      discount_type: discountInfo?.type || 'none',
      discount_value: discountInfo?.value || 0,
      discount_amount: discountInfo?.amount || 0,
      items: items.map((it) => ({
        menuId: it.menuId,
        name: it.name,
        variantId: it.variantId,
        variantName: it.variantName,
        sku: it.sku,
        barcode: it.barcode,
        price: it.price,
        qty: it.qty,
        discount: it.discount,
        note: it.note || "",
      })),
    };

    // Clear cart before request — prevents duplicate checkout on network dropout
    const cartSnapshot = [...cart];
    setCart([]);

    try {
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("syncStart"));
      }

      const createdTx = await transactionsApi.create(txData, currentCafeId);

      if (currentCafeId) {
        globalMutate(
          (key) => typeof key === 'string' && key.includes('/api/rest/transactions') && key.includes(`cafe_id=${currentCafeId}`),
          { revalidate: true }
        ).then(() => {
          if (typeof window !== "undefined") {
            window.dispatchEvent(new CustomEvent("syncEnd"));
          }
        });
      }

      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("transactionCompleted"));
      }

      return createdTx;
    } catch (e) {
      console.error(e);
      setCart(cartSnapshot);
      toast.error("Gagal menyimpan transaksi");
      return null;
    }
  };

  return (
    <CartContext.Provider
      value={{
        cart,
        addToCart,
        increaseQty,
        decreaseQty,
        setItemNote,
        setItemDiscount,
        clearCart,
        checkout,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}
