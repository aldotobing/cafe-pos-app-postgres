"use client"

import Image from "next/image"
import { useCart } from "../../contexts/cart-context"
import { useMenu, useCategories } from "../../hooks/use-cafe-data"
import { useAuth } from "@/lib/auth-context"
import { formatRupiah } from "../../lib/format"
import { useEffect, useState, useMemo, useRef } from "react"
import type { Category } from "@/types"
import { toast } from "sonner"
import { motion, AnimatePresence } from "framer-motion"
import { VariantSelector } from "./variant-selector"
import type { ProductVariant } from "@/types"

export function MenuGrid() {
  const { userData } = useAuth()
  const { menu, isLoading: menuLoading, mutate: mutateMenu } = useMenu(userData?.cafe_id)
  const { categories, isLoading: categoriesLoading, mutate: mutateCategories } = useCategories(userData?.cafe_id)
  const { cart, addToCart } = useCart()
  const isInitialized = !menuLoading && !categoriesLoading
  const categoriesLoaded = !categoriesLoading
  const [activeCategory, setActiveCategory] = useState<string>('all')
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  
  // Variant selector state
  const [selectedItemForVariant, setSelectedItemForVariant] = useState<any>(null)
  const [isVariantSelectorOpen, setIsVariantSelectorOpen] = useState(false)
  const [variantsMap, setVariantsMap] = useState<Record<string, any[]>>({})
  const [isVariantsLoading, setIsVariantsLoading] = useState(false)

  const checkScroll = () => {
    if (!scrollContainerRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
    setCanScrollLeft(scrollLeft > 0);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 5);
  };

  useEffect(() => {
    checkScroll();
    window.addEventListener('resize', checkScroll);
    return () => window.removeEventListener('resize', checkScroll);
  }, [categories]);

  const scroll = (direction: 'left' | 'right') => {
    if (!scrollContainerRef.current) return;
    const scrollAmount = 150;
    scrollContainerRef.current.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth'
    });
  };

  // Load variants for menu items with hasVariants
  useEffect(() => {
    const loadVariants = async () => {
      const itemsWithVariants = (menu as any[]).filter((m: any) => m.hasVariants || !!m.has_variants);
      if (itemsWithVariants.length === 0) return;

      setIsVariantsLoading(true);
      const newVariantsMap: Record<string, any[]> = {};
      
      for (const item of itemsWithVariants) {
        try {
          const response = await fetch(`/api/rest/product_variants?menu_id=${item.id}`);
          const data = await response.json();
          const variantsList = Array.isArray(data) ? data : (data.data || data.results || []);
          newVariantsMap[item.id] = variantsList;
        } catch (error) {
          console.error('Failed to load variants for', item.id, error);
        }
      }
      
      setVariantsMap(newVariantsMap);
      setIsVariantsLoading(false);
    };

    if (menu.length > 0) {
      loadVariants();
    }
  }, [menu]);

  // Listen for category changes from categories page
  useEffect(() => {
    const handleCategoryChange = () => {
      mutateMenu();
      mutateCategories();
    };

    window.addEventListener('categoriesChanged', handleCategoryChange);
    return () => window.removeEventListener('categoriesChanged', handleCategoryChange);
  }, [mutateMenu, mutateCategories]);

  // Listen for transaction completed to reload variants and menu
  useEffect(() => {
    const handleTransactionCompleted = () => {
      // Refresh menu data to update stock badges
      mutateMenu();
      
      // Force reload variants after checkout
      const loadVariants = async () => {
        const itemsWithVariants = (menu as any[]).filter((m: any) => m.hasVariants || !!m.has_variants);
        if (itemsWithVariants.length === 0) return;

        setIsVariantsLoading(true);
        const newVariantsMap: Record<string, any[]> = {};
        
        for (const item of itemsWithVariants) {
          try {
            const response = await fetch(`/api/rest/product_variants?menu_id=${item.id}`);
            const data = await response.json();
            const variantsList = Array.isArray(data) ? data : (data.data || data.results || []);
            newVariantsMap[item.id] = variantsList;
          } catch (error) {
            console.error('Failed to reload variants for', item.id, error);
          }
        }
        
        setVariantsMap(newVariantsMap);
        setIsVariantsLoading(false);
      };
      
      loadVariants();
    };

    window.addEventListener('transactionCompleted', handleTransactionCompleted);
    return () => window.removeEventListener('transactionCompleted', handleTransactionCompleted);
  }, [menu, mutateMenu]);

  // Filter available menu items and sort by category then name for consistent ordering
  const availableMenu = useMemo(() =>
    (menu as any[])
      .filter((m: any) => m.available)
      .sort((a: any, b: any) => {
        // First sort by category name
        if (a.category !== b.category) return a.category.localeCompare(b.category);
        // Then sort by name within category
        return a.name.localeCompare(b.name);
      }),
    [menu]
  );

  // Group menu items by category - use consistent category order
  const menuByCategory = useMemo(() => {
    const grouped: Record<string, typeof menu> = {};
    const categoryOrder: string[] = [];

    // Always use sorted category names for consistent ordering
    const allCategories = [...new Set(availableMenu.map(m => m.category))].sort();

    // If we have DB categories, use their order; otherwise use alphabetical
    if (categories.length > 0) {
      // Use DB category order
      (categories as any[]).forEach((cat: any) => {
        if (allCategories.includes(cat.name)) {
          categoryOrder.push(cat.name);
        }
      });
      // Add any categories not in DB
      allCategories.forEach(cat => {
        if (!categoryOrder.includes(cat)) {
          categoryOrder.push(cat);
        }
      });
    } else {
      // Use alphabetical order
      categoryOrder.push(...allCategories);
    }

    // Group items by category ID
    (categories as any[]).forEach((cat: any) => {
      const items = availableMenu.filter((m: any) => m.categoryId === cat.id || m.category === cat.name);
      if (items.length > 0) {
        grouped[cat.id] = items;
      }
    });

    return grouped;
  }, [availableMenu, categories]);

  // Filter by active category
  const filteredMenu = useMemo(() => {
    let filtered = availableMenu;

    // Filter by category (use ID for robust matching)
    if (activeCategory !== 'all') {
      filtered = filtered.filter((m: any) => {
        // Find category by ID if it's an ID, otherwise check names for backward stability
        const targetCat = (categories as any[]).find((c: any) => c.id === activeCategory || c.name === activeCategory);
        return m.categoryId === targetCat?.id || m.category === targetCat?.name;
      });
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((m: any) =>
        m.name.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [availableMenu, activeCategory, searchQuery]);

  // Helper to get category info
  const getCategoryInfo = (item: any) => {
    const cat = (categories as any[]).find((c: any) => c.id === item.categoryId || c.name === item.category);
    return {
      icon: cat?.icon || '📦',
      color: cat?.color || '#6B7280',
    };
  };

  // Show skeleton while categories are loading
  if (!isInitialized || !categoriesLoaded) {
    return (
      <div className="space-y-4">
        {/* Category pills skeleton */}
        <div className="flex gap-2 overflow-x-auto pb-2 px-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-8 w-20 bg-muted rounded-full animate-pulse flex-shrink-0" />
          ))}
        </div>
        
        {/* Search bar skeleton */}
        <div className="h-10 w-full bg-muted rounded-md animate-pulse px-2" />
        
        {/* Menu grid skeleton */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 px-2">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} className="rounded-xl border bg-card overflow-hidden">
              <div className="aspect-[4/3] w-full bg-muted/30 animate-pulse" />
              <div className="p-2.5 space-y-2">
                <div className="h-3 w-3/4 bg-muted rounded animate-pulse" />
                <div className="h-4 w-1/2 bg-muted/50 rounded animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Category Filter Pills */}
      {categories.length > 0 && (
        <div className="relative px-2">
          {/* Left Arrow */}
          {canScrollLeft && (
            <button
              onClick={() => scroll('left')}
              className="absolute left-0 top-0 z-10 w-8 h-10 flex items-center justify-center bg-gradient-to-r from-background to-transparent hover:from-accent/50 transition"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
            </button>
          )}
          
          <div
            ref={scrollContainerRef}
            onScroll={checkScroll}
            className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide pr-8"
          >
            <button
              onClick={() => setActiveCategory('all')}
              className={`flex-shrink-0 w-10 h-10 rounded-md flex items-center justify-center text-sm font-medium transition-all border ${
                activeCategory === 'all'
                  ? 'bg-primary text-primary-foreground border-transparent'
                  : 'bg-muted text-muted-foreground hover:text-foreground border-border/80'
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/></svg>
            </button>
          {(categories as any[]).map((cat: any) => {
            const itemCount = menuByCategory[cat.id]?.length || 0;
            if (itemCount === 0) return null;
            
            return (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`flex-shrink-0 px-2.5 py-1 rounded-full text-[11px] font-medium transition-all flex items-center gap-1 border ${
                  activeCategory === cat.id
                    ? 'border-transparent bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:text-foreground border-border/80'
                }`}
              >
                <span>{cat.icon}</span>
                <span>{cat.name}</span>
                <span className="opacity-60 text-[10px]">({itemCount})</span>
              </button>
            );
          })}
        </div>
        
        {/* Right Arrow */}
        {canScrollRight && (
          <button
            onClick={() => scroll('right')}
            className="absolute right-0 top-0 z-10 w-8 h-10 flex items-center justify-center bg-gradient-to-l from-background to-transparent hover:from-accent/50 transition"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
          </button>
        )}
      </div>
      )}

      {/* Search Bar */}
      <div className="relative px-2">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute left-5 top-1/2 -translate-y-1/2 text-muted-foreground"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Cari menu..."
          className="w-full h-10 rounded-md border bg-background pl-10 pr-10 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
          </button>
        )}
      </div>

      {/* Menu Grid */}
      <AnimatePresence mode="wait">
        {activeCategory === 'all' && !searchQuery ? (
          <motion.div 
            key="all-categories"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-6"
          >
            {Object.entries(menuByCategory).map(([catId, items], catIdx) => {
              const cat = (categories as any[]).find((c: any) => c.id === catId);
              const catInfo = {
                icon: cat?.icon || '📦',
                color: cat?.color || '#6B7280',
                name: cat?.name || catId
              };
              const filteredItems = searchQuery
                ? (items as any[]).filter((m: any) => m.name.toLowerCase().includes(searchQuery.toLowerCase()))
                : items;

              if (filteredItems.length === 0) return null;

              return (
                <motion.section 
                  key={catId} 
                  className="group"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: catIdx * 0.1 }}
                >
                  <div className="flex items-center gap-2.5 mb-4">
                    <span className="text-xl w-7 h-7 flex items-center justify-center">{catInfo.icon}</span>
                    <h3
                      className="text-sm font-semibold"
                      style={{ color: catInfo.color }}
                    >
                      {catInfo.name}
                    </h3>
                    <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">{filteredItems.length}</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {filteredItems.map((m, index) => (
                      <MenuCard 
                        key={m.id} 
                        item={m} 
                        index={index} 
                        addToCart={addToCart} 
                        catInfo={catInfo} 
                        cart={cart}
                        variantsMap={variantsMap}
                        isVariantsLoading={isVariantsLoading}
                        onSelectVariant={() => {
                          setSelectedItemForVariant(m)
                          setIsVariantSelectorOpen(true)
                        }}
                      />
                    ))}
                  </div>
                  {/* Divider between categories */}
                  {catIdx < Object.entries(menuByCategory).length - 1 && (
                    <div className="mt-6 pt-5">
                      <div className="h-px bg-gradient-to-r from-transparent via-border/60 to-transparent" />
                    </div>
                  )}
                </motion.section>
              );
            })}
          </motion.div>
        ) : (
          <motion.div 
            key="filtered-results"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {filteredMenu.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-muted flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground/60"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
                </div>
                <div className="text-sm font-medium">Tidak ada menu yang ditemukan</div>
                <div className="text-xs mt-1">Coba kata kunci lain atau hapus pencarian</div>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {filteredMenu.map((m, index) => {
                  const catInfo = getCategoryInfo(m);
                  return (
                    <MenuCard 
                      key={m.id} 
                      item={m} 
                      index={index} 
                      addToCart={addToCart} 
                      catInfo={catInfo} 
                      cart={cart}
                      variantsMap={variantsMap}
                      isVariantsLoading={isVariantsLoading}
                      onSelectVariant={() => {
                        setSelectedItemForVariant(m)
                        setIsVariantSelectorOpen(true)
                      }}
                    />
                  );
                })}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Variant Selector Modal */}
      <VariantSelector
        menuItem={selectedItemForVariant}
        isOpen={isVariantSelectorOpen}
        onClose={() => {
          setIsVariantSelectorOpen(false)
          setSelectedItemForVariant(null)
        }}
        onAddToCart={(menuItem: any, variant: ProductVariant, qty: number) => {
          // Add variant product to cart
          const price = variant.price || menuItem.price
          for (let i = 0; i < qty; i++) {
              addToCart({
                id: menuItem.id,
                menuId: menuItem.id,
                variantId: variant.id,
                name: menuItem.name,
                variantName: variant.variantName || variant.variant_name,
                sku: variant.sku,
                barcode: variant.barcode,
                price: price,
                qty: 1,
                note: ''
              } as any)
          }
          // Toast handled by variant-selector summary
        }}
      />
    </div>
  )
}

function MenuCard({ item, index, addToCart, catInfo, cart, onSelectVariant, variantsMap, isVariantsLoading }: {
  item: any;
  index: number;
  addToCart: (item: any) => void;
  catInfo: { icon: string; color: string };
  cart: any[];
  onSelectVariant?: () => void;
  variantsMap?: Record<string, any[]>;
  isVariantsLoading?: boolean;
}) {
  // For products with variants, stock is managed per variant
  // Don't show "Habis" based on menu.stockQuantity (which is 0 for variant products)
  const hasVariants = item.hasVariants || !!item.has_variants;
  const variantsLoaded = variantsMap && variantsMap[item.id];
  const variantsData = hasVariants && variantsLoaded ? variantsMap[item.id] : null;
  
  // Calculate stock from variants if available, otherwise use menu stock (for non-variants)
  let currentStock = hasVariants 
    ? (variantsData?.reduce((sum: number, v: any) => sum + (v.stock_quantity || 0), 0) ?? null)
    : (item.stockQuantity || 0);
  
  // For variant products still loading, don't consider as out of stock
  const isOutOfStock = item.trackStock && currentStock === 0 && !hasVariants;
  const isLowStock = item.trackStock && !hasVariants && currentStock <= (item.minStock || 5);
  const shouldDisable = isOutOfStock;
  const [isPressing, setIsPressing] = useState(false);

  const handleAddToCart = () => {
    // Check if product has variants
    if (item.hasVariants || !!item.has_variants) {
      onSelectVariant?.()
      return
    }

    if (shouldDisable) {
      toast.error(`Stok ${item.name} habis!`);
      return;
    }

    // Check stock limit
    if (item.trackStock) {
      const maxStock = currentStock;
      const cartItem = cart.find(c => c.menuId === item.id);
      const currentQty = cartItem ? cartItem.qty : 0;

      if (currentQty >= maxStock) {
        if (maxStock === 0) {
          toast.error(`Stok ${item.name} habis!`);
        } else {
          toast.error(`Stok ${item.name} tidak mencukupi! Tersisa: ${maxStock - currentQty}`);
        }
        return;
      }
    }

    addToCart(item);
  };

  return (
    <motion.button
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.05, duration: 0.2 }}
      onClick={handleAddToCart}
      onMouseDown={() => setIsPressing(true)}
      onMouseUp={() => setIsPressing(false)}
      onMouseLeave={() => setIsPressing(false)}
      onTouchStart={() => setIsPressing(true)}
      onTouchEnd={() => setIsPressing(false)}
      disabled={shouldDisable}
      className="group relative rounded-xl border bg-card text-left transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden hover:shadow-md hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      style={{
        transform: isPressing ? 'scale(0.97)' : undefined,
      }}
    >
      {/* Stock Badge - show for all items with trackStock */}
      {item.trackStock && (
        <div className={`absolute top-2 right-2 z-10 px-2 py-0.5 rounded-full text-[10px] font-semibold shadow-sm backdrop-blur-sm ${
          isOutOfStock
            ? 'bg-red-500/90 text-white'
            : isLowStock
            ? 'bg-amber-500/90 text-white'
            : 'bg-emerald-500/80 text-white'
        }`}>
          {hasVariants 
            ? (currentStock === null 
                ? 'Cek varian' 
                : `Stok ${currentStock}`)
            : isOutOfStock 
              ? 'Habis' 
              : isLowStock 
                ? `Sisa ${currentStock}` 
                : `Stok ${currentStock}`}
        </div>
      )}

      {/* Variants Badge - show below stock badge for items with variants */}
      {(item.hasVariants || !!item.has_variants) && (
        <div className="absolute top-8 right-2 z-10 px-2 py-0.5 rounded-full text-[10px] font-semibold shadow-sm backdrop-blur-sm bg-purple-500/90 text-white">
          Varian
        </div>
      )}

      {/* Image */}
      <div className={`aspect-[4/3] w-full bg-muted/30 overflow-hidden ${isOutOfStock && !hasVariants ? 'opacity-50 grayscale' : ''}`}>
        <Image
          src={
            item.imageUrl ||
            "/placeholder.svg?height=200&width=300&query=menu%20item%20photo" ||
            "/placeholder.svg"
          }
          alt={item.name}
          width={200}
          height={150}
          priority={index < 3}
          loading={index < 3 ? 'eager' : 'lazy'}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
        />
      </div>

      {/* Content */}
      <div className="px-2.5 py-2">
        <div className="text-xs font-medium truncate leading-tight" title={item.name}>{item.name}</div>
        <div className="text-xs font-semibold mt-1" style={{ color: catInfo.color }}>{formatRupiah(item.price)}</div>
      </div>
    </motion.button>
  );
}
