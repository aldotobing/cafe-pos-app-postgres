"use client"

import { AppShell } from "@/components/app-shell"
import { useEffect, useState, useMemo, useRef } from "react"
import { useMenu, useCategories } from "@/hooks/use-cafe-data"
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion';
import { Package, TrendingDown, AlertTriangle, Plus, History, Filter, X, ArrowUpCircle, ArrowDownCircle, FileText, RefreshCw, ClipboardCheck, Loader2, ChevronLeft, ChevronRight } from 'lucide-react'
import { formatRupiah, formatTanggal } from "@/lib/format"
import { toast } from "sonner"
import { RestockDialog } from "@/components/stock/restock-dialog"
import { StockOpnameDialog } from "@/components/stock/stock-opname-dialog"
import { StockSkeleton } from "@/components/skeletons"
import { StatCard } from "@/components/statistik/StatCard"
import { cn } from "@/lib/utils"

interface StockMutation {
  id: string
  menuId: string
  variantId?: string
  menuName: string
  variantName?: string
  type: 'in' | 'out' | 'adjustment' | 'opname'
  quantity: number
  hppPrice?: number
  referenceType?: string
  notes?: string
  createdBy?: string
  createdByName?: string
  createdAt: string
}

export default function StockPage() {
  const { userData, loading: authLoading, user } = useAuth();
  const cafeId = userData?.cafe_id;
  const { menu, isLoading: menuLoading, mutate: mutateMenu } = useMenu(cafeId)
  const { categories, isLoading: categoriesLoading } = useCategories(cafeId)
  const router = useRouter();
  const [filter, setFilter] = useState<'all' | 'low' | 'out'>('all')
  const [mutationFilter, setMutationFilter] = useState<'all' | 'in' | 'out' | 'adjustment' | 'opname'>('all')
  const [restockItem, setRestockItem] = useState<any>(null)
  const [showHistory, setShowHistory] = useState(false)
  const [showOpname, setShowOpname] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [mutations, setMutations] = useState<StockMutation[]>([])
  const [isLoadingHistory, setIsLoadingHistory] = useState(false)
  const [isInitialLoading, setIsInitialLoading] = useState(true)
  const [historyOffset, setHistoryOffset] = useState(0)
  const [hasMoreHistory, setHasMoreHistory] = useState(true)
  const [variantsMap, setVariantsMap] = useState<Record<string, any[]>>({})
  const [isLoadingVariants, setIsLoadingVariants] = useState(false)
  const [isRefreshingData, setIsRefreshingData] = useState(false)
  const [hasMounted, setHasMounted] = useState(false)
  
  useEffect(() => {
    setHasMounted(true)
  }, [])
  
  // Scroll management
  const categoryScrollRef = useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)

  // Manual Scroll logic
  const checkScroll = () => {
    if (!categoryScrollRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = categoryScrollRef.current;
    setCanScrollLeft(scrollLeft > 5);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 5);
  };

  const scroll = (direction: 'left' | 'right') => {
    if (!categoryScrollRef.current) return;
    const scrollAmount = 200;
    categoryScrollRef.current.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth'
    });
  };

  useEffect(() => {
    checkScroll();
    window.addEventListener('resize', checkScroll);
    return () => window.removeEventListener('resize', checkScroll);
  }, [categories]);

  // Memoize filtered mutations to prevent unnecessary re-renders
  const filteredMutations = useMemo(() => {
    return mutations.filter(mut => mutationFilter === 'all' || mut.type === mutationFilter);
  }, [mutations, mutationFilter]);

  // Animation variants
  const headerVariants = {
    hidden: { opacity: 0, y: -20 },
    visible: { opacity: 1, y: 0 }
  };

  const statsVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  const filterVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  const tableVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  const rowVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: { opacity: 1, x: 0 }
  };

  useEffect(() => {
    if (!authLoading && (!user || !userData)) {
      router.push('/login');
      return;
    }
  }, [user, userData, authLoading, router]);


  // Load variants for menu items with hasVariants (batched bulk fetch for 100+ items)
  useEffect(() => {
    const loadVariants = async () => {
      const itemsWithVariants = menu.filter(m => m.hasVariants);
      if (itemsWithVariants.length === 0) return;

      setIsLoadingVariants(true);
      
      try {
        const BATCH_SIZE = 50; // Max 50 IDs per request to avoid URL length issues
        const newVariantsMap: Record<string, any[]> = {};
        itemsWithVariants.forEach(item => {
          newVariantsMap[item.id] = [];
        });
        
        // Split into batches
        const ids = itemsWithVariants.map(m => m.id);
        const batches: string[][] = [];
        for (let i = 0; i < ids.length; i += BATCH_SIZE) {
          batches.push(ids.slice(i, i + BATCH_SIZE));
        }
        
        // Fetch all batches in parallel
        const batchResponses = await Promise.all(
          batches.map(batch =>
            fetch(`/api/rest/product_variants?menu_ids=${batch.join(',')}`)
              .then(r => r.json())
              .then(data => Array.isArray(data) ? data : (data.data || data.results || []))
              .catch(() => [])
          )
        );
        
        // Merge all variants
        batchResponses.forEach(variants => {
          variants.forEach((variant: any) => {
            if (variant.menu_id && newVariantsMap[variant.menu_id] !== undefined) {
              newVariantsMap[variant.menu_id].push(variant);
            }
          });
        });
        
        setVariantsMap(newVariantsMap);
      } catch {
        // Fallback: load individually if bulk fails
        const newVariantsMap: Record<string, any[]> = {};
        await Promise.all(
          itemsWithVariants.map(async (item) => {
            try {
              const response = await fetch(`/api/rest/product_variants?menu_id=${item.id}`);
              const data = await response.json();
              newVariantsMap[item.id] = Array.isArray(data) ? data : (data.data || data.results || []);
            } catch {
              newVariantsMap[item.id] = [];
            }
          })
        );
        setVariantsMap(newVariantsMap);
      } finally {
        setIsLoadingVariants(false);
      }
    };

    if (menu.length > 0) {
      loadVariants();
    }
  }, [menu]);

  const handleRestock = async (menuId: string, quantity: number, hppPrice?: number, notes?: string, variantId?: string) => {
    try {
      const response = await fetch('/api/stock/restock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          menuId,
          quantity,
          hppPrice,
          notes,
          cafeId,
          userId: user?.id,
          variantId,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Gagal restock');
      }

      // Refresh menu data
      await mutateMenu();

      // Force reload variants for the specific item that was restocked
      if (variantId || menuId) {
        const targetMenuId = variantId ? menu.find(m => m.id === menuId)?.id : menuId;
        if (targetMenuId) {
          try {
            const response = await fetch(`/api/rest/product_variants?menu_id=${targetMenuId}`);
            const data = await response.json();
            const variantsList = Array.isArray(data) ? data : (data.data || data.results || []);
            setVariantsMap(prev => ({
              ...prev,
              [targetMenuId]: variantsList
            }));
          } catch {
            // Silently ignore variant reload errors
          }
        }
      }
      
      // Refresh mutation history if visible
      if (showHistory) {
        setHistoryOffset(0);
        await loadMutationHistory(false);
      }
    } catch (error: any) {
      throw error;
    }
  };

  const handleOpname = async (results: Array<{ menuId: string, actualQty: number, notes?: string, variantId?: string }>) => {
    try {
      const response = await fetch('/api/stock/opname', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          results,
          cafeId,
          userId: user?.id,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Gagal stock opname');
      }

      // Refresh menu data
      await mutateMenu();
      
      // Wait for DB sync
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Reload variants for items that were adjusted in opname (batched bulk request)
      const adjustedMenuIds = Array.from(new Set(results.map(r => r.menuId)));
      if (adjustedMenuIds.length > 0) {
        try {
          const BATCH_SIZE = 50;
          const batches: string[][] = [];
          for (let i = 0; i < adjustedMenuIds.length; i += BATCH_SIZE) {
            batches.push(adjustedMenuIds.slice(i, i + BATCH_SIZE));
          }
          
          // Fetch all batches in parallel
          const batchResponses = await Promise.all(
            batches.map(batch =>
              fetch(`/api/rest/product_variants?menu_ids=${batch.join(',')}`)
                .then(r => r.json())
                .then(data => Array.isArray(data) ? data : (data.data || data.results || []))
                .catch(() => [])
            )
          );
          
          // Group by menu_id
          const newVariantsMap: Record<string, any[]> = { ...variantsMap };
          adjustedMenuIds.forEach(id => {
            newVariantsMap[id] = [];
          });
          batchResponses.forEach(variants => {
            variants.forEach((variant: any) => {
              if (variant.menu_id && newVariantsMap[variant.menu_id] !== undefined) {
                newVariantsMap[variant.menu_id].push(variant);
              }
            });
          });
          setVariantsMap(newVariantsMap);
        } catch {
          // Silently ignore bulk reload errors
        }
      }
      
      // Refresh mutation history if visible (parallel with other operations)
      if (showHistory) {
        setHistoryOffset(0);
        loadMutationHistory(false);
      }
    } catch (error: any) {
      throw error;
    }
  };

  const loadMutationHistory = async (isLoadMore = false) => {
    if (isLoadingHistory) return;
    if (isLoadMore && !hasMoreHistory) return;

    setIsLoadingHistory(true);
    try {
      const currentOffset = isLoadMore ? historyOffset : 0;
      const response = await fetch(`/api/stock/mutations?cafeId=${cafeId}&limit=10&offset=${currentOffset}`);

      if (response.ok) {
        const data = await response.json();
        const newMutations = data.mutations || [];
        
        if (isLoadMore) {
          setMutations(prev => [...prev, ...newMutations]);
          setHistoryOffset(prev => prev + newMutations.length);
        } else {
          setMutations(newMutations);
          setHistoryOffset(newMutations.length);
        }
        
        setHasMoreHistory(data.hasMore ?? newMutations.length >= 10);
      }
    } catch {
      // Silently ignore mutation load errors
    } finally {
      setIsLoadingHistory(false);
      setIsInitialLoading(false);
    }
  };

  useEffect(() => {
    if (showHistory && mutations.length === 0) {
      loadMutationHistory();
    }
  }, [showHistory]);

  // Filter menu items by stock status, category, and search query
  const filteredMenu = useMemo(() => {
    const filtered = menu.filter(m => {
      if (!m.trackStock) return false;

      // 1. Search Query Filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const categoryName = categories.find(c => c.id === m.categoryId)?.name || '';
        const matchesSearch = m.name.toLowerCase().includes(query) ||
                             categoryName.toLowerCase().includes(query);
        if (!matchesSearch) return false;
      }

      // 2. Category Filter
      if (selectedCategory !== 'all' && m.categoryId !== selectedCategory) {
        return false;
      }

      // 3. Stock Status Filter
      // If has variants, calculate total stock from variants
      let stock = m.stockQuantity || 0;
      if (m.hasVariants && variantsMap[m.id]) {
        stock = variantsMap[m.id].reduce((sum: number, v: any) => sum + (v.stock_quantity || 0), 0);
      }
      const minStock = m.minStock || 5;

      if (filter === 'low') return stock > 0 && stock <= minStock;
      if (filter === 'out') return stock === 0;

      return true;
    });

    // Sort by priority: out of stock > low stock > normal
    return filtered.sort((a, b) => {
      const getPriority = (m: any) => {
        let stock = m.stockQuantity || 0;
        if (m.hasVariants && variantsMap[m.id]) {
          stock = variantsMap[m.id].reduce((sum: number, v: any) => sum + (v.stock_quantity || 0), 0);
        }
        const minStock = m.minStock || 5;
        if (stock === 0) return 2; // Highest priority
        if (stock > 0 && stock <= minStock) return 1; // Medium priority
        return 0; // Normal priority
      };

      const priorityA = getPriority(a);
      const priorityB = getPriority(b);

      // Sort by priority descending (higher priority first)
      if (priorityA !== priorityB) {
        return priorityB - priorityA;
      }

      // If same priority, sort by name alphabetically
      return a.name.localeCompare(b.name);
    });
  }, [menu, searchQuery, selectedCategory, filter, categories, variantsMap]);

  // Calculate stats - same logic as badge in app-shell.tsx
  const totalItems = menu.filter(m => m.trackStock).length;
  
  const lowStockCount = menu.reduce((count, m) => {
    if (!m.trackStock) return count;
    
    let lowStockItems = 0;
    
    // If item has variants AND variants exist, check each variant
    if (m.hasVariants && variantsMap[m.id] && variantsMap[m.id].length > 0) {
      lowStockItems = variantsMap[m.id].filter((v: any) => 
        v.track_stock !== false && 
        v.stock_quantity !== undefined && 
        v.stock_quantity > 0 && 
        v.stock_quantity <= (v.min_stock || m.minStock || 5)
      ).length;
    } else {
      // For items without variants, check item stock directly
      if (m.stockQuantity !== undefined && m.stockQuantity > 0 && m.stockQuantity <= (m.minStock || 5)) {
        lowStockItems = 1;
      }
    }
    
    return count + lowStockItems;
  }, 0);
  
  const outOfStockCount = menu.reduce((count, m) => {
    if (!m.trackStock) return count;
    
    let outOfStockItems = 0;
    
    // If item has variants AND variants exist, check each variant
    if (m.hasVariants && variantsMap[m.id] && variantsMap[m.id].length > 0) {
      outOfStockItems = variantsMap[m.id].filter((v: any) => 
        v.track_stock !== false && 
        v.stock_quantity !== undefined && 
        v.stock_quantity === 0
      ).length;
    } else {
      // For items without variants, check item stock directly
      if (m.stockQuantity !== undefined && m.stockQuantity === 0) {
        outOfStockItems = 1;
      }
    }
    
    return count + outOfStockItems;
  }, 0);

  
  if (authLoading || menuLoading || categoriesLoading || !hasMounted) {
    return <StockSkeleton />;
  }

  return (
    <AppShell>
      {/* Header */}
      <motion.div
        className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 mb-8"
        variants={headerVariants}
        initial="hidden"
        animate="visible"
        transition={{ duration: 0.3, ease: "easeOut" }}
      >
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Manajemen Stok</h1>
          <p className="text-sm text-muted-foreground">
            Kelola ketersediaan stok menu dan pantau mutasi barang.
          </p>
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto">
          <button
            onClick={() => setShowOpname(true)}
            className="flex-1 md:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border bg-card hover:bg-muted transition text-sm font-medium shadow-sm"
          >
            <ClipboardCheck className="h-4 w-4 text-primary" />
            <span>Stock Opname</span>
          </button>
          <button
            onClick={() => setShowHistory(!showHistory)}
            className={`flex-1 md:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border transition text-sm font-medium shadow-sm ${
              showHistory
                ? 'bg-primary/10 border-primary/30 text-primary'
                : 'bg-card hover:bg-muted'
            }`}
          >
            <History className="h-4 w-4" />
            <span>{showHistory ? 'Tutup Mutasi' : 'Mutasi'}</span>
          </button>
        </div>
      </motion.div>

      {/* Stats Cards - Hidden when viewing mutation history */}
      <AnimatePresence>
        {!showHistory && (
          <motion.div
            className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8"
            variants={statsVariants}
            initial="hidden"
            animate="visible"
            exit={{ opacity: 0, y: -20 }}
            transition={{ delay: 0.1, duration: 0.3, ease: "easeOut" }}
          >
            <motion.div variants={statsVariants}>
              <StatCard
                title="Total Item"
                value={totalItems}
                description="Produk yang dilacak stoknya"
                icon={Package}
              />
            </motion.div>

            <motion.div variants={statsVariants}>
              <StatCard
                title="Stok Rendah"
                value={lowStockCount}
                description="Membutuhkan restock segera"
                icon={AlertTriangle}
                iconClassName="text-amber-500"
                className="bg-amber-500/5 border-amber-500/20"
                valueClassName="text-amber-600"
                titleClassName="text-amber-600/80"
              />
            </motion.div>

            <motion.div variants={statsVariants}>
              <StatCard
                title="Stok Habis"
                value={outOfStockCount}
                description="Segera lakukan pengadaan"
                icon={TrendingDown}
                iconClassName="text-red-500"
                className="bg-red-500/5 border-red-500/20"
                valueClassName="text-red-600"
                titleClassName="text-red-600/80"
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Search and Filters */}
      {!showHistory && (
        <motion.div
          variants={filterVariants}
          initial="hidden"
          animate="visible"
          transition={{ delay: 0.15, duration: 0.3, ease: "easeOut" }}
          className="space-y-4 mb-6"
        >
          {/* Search Bar */}
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
              <Filter className="h-4 w-4 text-muted-foreground/50 group-focus-within:text-primary transition-colors" />
            </div>
            <input
              type="text"
              placeholder="Cari item atau kategori..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-card border border-border/80 rounded-2xl py-3 pl-11 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all shadow-sm shadow-black/5"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="h-4 w-4 bg-muted p-0.5 rounded-full" />
              </button>
            )}
          </div>

          <div className="flex flex-col gap-4">
            {/* Status Filter */}
            <div className="flex items-center gap-3 overflow-x-auto pb-1 scrollbar-hide">
              <div className="p-1.5 rounded-lg bg-muted/60 text-muted-foreground flex-shrink-0">
                <AlertTriangle className="h-3.5 w-3.5" />
              </div>
              <div className="flex gap-2">
                {[
                  { id: 'all', label: 'Semua Status', count: totalItems, color: 'primary' },
                  { id: 'low', label: 'Stok Rendah', count: lowStockCount, color: 'amber-500' },
                  { id: 'out', label: 'Habis', count: outOfStockCount, color: 'red-500' }
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setFilter(item.id as any)}
                    className={cn(
                      "px-4 py-1.5 rounded-xl text-[11px] font-extrabold transition-all border flex-shrink-0 flex items-center gap-2",
                      filter === item.id
                        ? item.id === 'all' 
                          ? "bg-foreground text-background border-transparent shadow-md"
                          : `bg-${item.color} text-white border-transparent shadow-md`
                        : "bg-background text-muted-foreground hover:bg-muted border-border/80"
                    )}
                  >
                    {item.label.toUpperCase()}
                    <span className={cn(
                      "flex items-center justify-center min-w-[20px] h-4.5 px-1 rounded text-[9px]",
                      filter === item.id ? "bg-white/20" : "bg-muted"
                    )}>
                      {item.count}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Category Filter */}
            <div className="flex items-center gap-3">
              <div className="p-1.5 rounded-lg bg-muted/60 text-muted-foreground flex-shrink-0">
                <Package className="h-3.5 w-3.5" />
              </div>
              <div className="relative flex-1 group/scroll overflow-hidden">
                {/* Scroll Indicators */}
                <AnimatePresence>
                  {canScrollLeft && (
                    <motion.div
                      key="left-indicator"
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -10 }}
                      className="absolute left-0 top-0 bottom-2 z-10 w-12 flex items-center justify-start bg-gradient-to-r from-card to-transparent pointer-events-none"
                    >
                      <button
                        onClick={() => scroll('left')}
                        className="h-7 w-7 rounded-full bg-background/80 border shadow-sm flex items-center justify-center hover:bg-background transition pointer-events-auto active:scale-95"
                      >
                        <ChevronLeft className="h-3.5 w-3.5" />
                      </button>
                    </motion.div>
                  )}
                  {canScrollRight && (
                    <motion.div
                      key="right-indicator"
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 10 }}
                      className="absolute right-0 top-0 bottom-2 z-10 w-12 flex items-center justify-end bg-gradient-to-l from-card to-transparent pointer-events-none"
                    >
                      <button
                        onClick={() => scroll('right')}
                        className="h-7 w-7 rounded-full bg-background/80 border shadow-sm flex items-center justify-center hover:bg-background transition pointer-events-auto active:scale-95"
                      >
                        <ChevronRight className="h-3.5 w-3.5" />
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div 
                  ref={categoryScrollRef}
                  onScroll={checkScroll}
                  className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide px-1"
                >
                  <button
                    onClick={() => setSelectedCategory('all')}
                    className={cn(
                      "px-4 py-1.5 rounded-xl text-[11px] font-extrabold transition-all border flex-shrink-0",
                      selectedCategory === 'all'
                        ? "bg-primary text-primary-foreground border-transparent shadow-md"
                        : "bg-background text-muted-foreground hover:bg-muted border-border/80"
                    )}
                  >
                    SEMUA KATEGORI
                  </button>
                  {categories.map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => setSelectedCategory(cat.id)}
                      className={cn(
                        "px-4 py-1.5 rounded-xl text-[11px] font-extrabold transition-all border flex-shrink-0 flex items-center gap-2",
                        selectedCategory === cat.id
                          ? "bg-primary text-primary-foreground border-transparent shadow-md"
                          : "bg-background text-muted-foreground hover:bg-muted border-border/80"
                      )}
                    >
                      {cat.icon && <span className="text-xs">{cat.icon}</span>}
                      {cat.name.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Stock Table or History */}
      <AnimatePresence mode="wait">
        {!showHistory ? (
          <motion.div
            key="stock-table"
            variants={tableVariants}
            initial="hidden"
            animate="visible"
            exit={{ opacity: 0 }}
            transition={{ delay: 0.2, duration: 0.3, ease: "easeOut" }}
            className="rounded-xl border bg-card overflow-hidden"
          >
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-xs uppercase tracking-wider text-muted-foreground">Item</th>
                    <th className="px-4 py-3 text-left font-medium text-xs uppercase tracking-wider text-muted-foreground">Kategori</th>
                    <th className="px-4 py-3 text-right font-medium text-xs uppercase tracking-wider text-muted-foreground">Stok</th>
                    <th className="px-4 py-3 text-right font-medium text-xs uppercase tracking-wider text-muted-foreground">Min. Stok</th>
                    <th className="px-4 py-3 text-right font-medium text-xs uppercase tracking-wider text-muted-foreground">HPP</th>
                    <th className="px-4 py-3 text-center font-medium text-xs uppercase tracking-wider text-muted-foreground">Status</th>
                    <th className="px-4 py-3 text-center font-medium text-xs uppercase tracking-wider text-muted-foreground">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMenu.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
                        <Package className="h-12 w-12 mx-auto mb-2 opacity-30" />
                        <div className="text-sm font-medium">Tidak ada item stok</div>
                        <div className="text-xs">
                          {filter !== 'all' ? 'Coba ubah filter' : 'Aktifkan "Track Stok" pada menu item'}
                        </div>
                      </td>
                    </tr>
                  ) : (
                    <AnimatePresence>
                      {filteredMenu.flatMap((m, menuIdx) => {
                        const variants = m.hasVariants && variantsMap[m.id] ? variantsMap[m.id] : null;

                        // If no variants, show single row
                        if (!variants || variants.length === 0) {
                          let stock = m.stockQuantity || 0;
                          const minStock = m.minStock || 5;
                          const isLow = stock > 0 && stock <= minStock;
                          const isOut = stock === 0;

                          return (
                            <motion.tr
                              key={m.id}
                              className="border-t last:border-b-0"
                              variants={rowVariants}
                              initial="hidden"
                              animate="visible"
                              exit={{ opacity: 0, x: -20 }}
                              transition={{ delay: menuIdx * 0.03, duration: 0.15, ease: "easeOut" }}
                              whileHover={{ backgroundColor: "rgba(0, 0, 0, 0.05)" }}
                            >
                              <td className="px-4 py-3 font-medium">{m.name}</td>
                              <td className="px-4 py-3 text-muted-foreground">
                                {categories.find(c => c.id === m.categoryId)?.name || m.category}
                              </td>
                              <td className="px-4 py-3 text-right">
                                <span className={`font-bold ${isOut ? 'text-red-500' : isLow ? 'text-amber-500' : ''}`}>
                                  {stock}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-right text-muted-foreground">{minStock}</td>
                              <td className="px-4 py-3 text-right">{formatRupiah(m.hppPrice || 0)}</td>
                              <td className="px-4 py-3 text-center">
                                {isOut ? (
                                  <span className="px-2 py-1 rounded-md text-xs font-medium bg-red-500/10 text-red-600">Habis</span>
                                ) : isLow ? (
                                  <span className="px-2 py-1 rounded-md text-xs font-medium bg-amber-500/10 text-amber-600">Rendah</span>
                                ) : (
                                  <span className="px-2 py-1 rounded-md text-xs font-medium bg-emerald-500/10 text-emerald-600">Aman</span>
                                )}
                              </td>
                              <td className="px-4 py-3 text-center">
                                <button
                                  onClick={() => setRestockItem(m)}
                                  className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium bg-primary/10 text-primary hover:bg-primary/20 transition"
                                >
                                  <Plus className="h-3 w-3" />
                                  Restock
                                </button>
                              </td>
                            </motion.tr>
                          );
                        }

                        // If has variants, show parent row with variants indented below
                        const rows = [];

                        // Parent row (shows aggregated info)
                        const totalStock = variants.reduce((sum: number, v: any) => sum + (v.stock_quantity || 0), 0);
                        const minStock = m.minStock || 5;
                        const isLow = totalStock > 0 && totalStock <= minStock;
                        const isOut = totalStock === 0;

                        rows.push(
                          <motion.tr
                            key={m.id}
                            className="border-t last:border-b-0 bg-muted/30"
                            variants={rowVariants}
                            initial="hidden"
                            animate="visible"
                            exit={{ opacity: 0, x: -20 }}
                            transition={{ delay: menuIdx * 0.03, duration: 0.15, ease: "easeOut" }}
                          >
                            <td className="px-4 py-2.5 font-medium">
                              <div className="flex items-center gap-2">
                                {m.name}
                                <span className="text-xs text-muted-foreground">({variants.length} varian)</span>
                              </div>
                            </td>
                            <td className="px-4 py-2.5 text-muted-foreground">
                              {categories.find(c => c.id === m.categoryId)?.name || m.category}
                            </td>
                            <td className="px-4 py-2.5 text-right">
                              <span className={`font-bold ${isOut ? 'text-red-500' : isLow ? 'text-amber-500' : ''}`}>
                                {totalStock}
                              </span>
                            </td>
                            <td className="px-4 py-2.5 text-right text-muted-foreground">{minStock}</td>
                            <td className="px-4 py-2.5 text-right text-muted-foreground">-</td>
                            <td className="px-4 py-2.5 text-center">
                              {isOut ? (
                                <span className="px-2 py-1 rounded-md text-xs font-medium bg-red-500/10 text-red-600">Habis</span>
                              ) : isLow ? (
                                <span className="px-2 py-1 rounded-md text-xs font-medium bg-amber-500/10 text-amber-600">Rendah</span>
                              ) : (
                                <span className="px-2 py-1 rounded-md text-xs font-medium bg-emerald-500/10 text-emerald-600">Aman</span>
                              )}
                            </td>
                            <td className="px-4 py-2.5 text-center text-muted-foreground text-xs">
                              -
                            </td>
                          </motion.tr>
                        );

                        // Variant rows (indented)
                        variants.forEach((v: any, variantIdx: number) => {
                          const stock = v.stock_quantity || 0;
                          const isLow = stock > 0 && stock <= minStock;
                          const isOut = stock === 0;
                          const delay = (menuIdx + variantIdx * 0.1) * 0.03;

                          rows.push(
                            <motion.tr
                              key={`${m.id}-${v.id}`}
                              className="border-t last:border-b-0"
                              variants={rowVariants}
                              initial="hidden"
                              animate="visible"
                              exit={{ opacity: 0, x: -20 }}
                              transition={{ delay, duration: 0.15, ease: "easeOut" }}
                              whileHover={{ backgroundColor: "rgba(0, 0, 0, 0.05)" }}
                            >
                              <td className="px-4 py-2.5 pl-8 text-muted-foreground text-xs">
                                └ {v.variant_name || v.id}
                              </td>
                              <td className="px-4 py-2.5 text-muted-foreground text-xs">
                                -
                              </td>
                              <td className="px-4 py-2.5 text-right">
                                <span className={`font-bold text-sm ${isOut ? 'text-red-500' : isLow ? 'text-amber-500' : ''}`}>
                                  {stock}
                                </span>
                              </td>
                              <td className="px-4 py-2.5 text-right text-muted-foreground text-xs">{minStock}</td>
                              <td className="px-4 py-2.5 text-right text-muted-foreground text-xs">{formatRupiah(v.hpp_price || m.hppPrice || 0)}</td>
                              <td className="px-4 py-2.5 text-center">
                                {isOut ? (
                                  <span className="px-2 py-1 rounded-md text-xs font-medium bg-red-500/10 text-red-600">Habis</span>
                                ) : isLow ? (
                                  <span className="px-2 py-1 rounded-md text-xs font-medium bg-amber-500/10 text-amber-600">Rendah</span>
                                ) : (
                                  <span className="px-2 py-1 rounded-md text-xs font-medium bg-emerald-500/10 text-emerald-600">Aman</span>
                                )}
                              </td>
                              <td className="px-4 py-2.5 text-center">
                                <button
                                  onClick={() => setRestockItem({ ...m, variantId: v.id, variantName: v.variant_name, stockQuantity: v.stock_quantity, hppPrice: v.hpp_price })}
                                  className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium bg-primary/10 text-primary hover:bg-primary/20 transition"
                                >
                                  <Plus className="h-3 w-3" />
                                  Restock
                                </button>
                              </td>
                            </motion.tr>
                          );
                        });

                        return rows;
                      })}
                    </AnimatePresence>
                  )}
                </tbody>
              </table>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="mutation-history"
            variants={tableVariants}
            initial="hidden"
            animate="visible"
            exit={{ opacity: 0 }}
            transition={{ delay: 0.2, duration: 0.3, ease: "easeOut" }}
            className="rounded-xl border bg-card overflow-hidden"
          >
            <div className="flex items-center justify-between p-4 border-b">
              <div className="flex items-center gap-2">
                <History className="h-5 w-5 text-muted-foreground" />
                <h2 className="font-semibold">Riwayat Mutasi Stok</h2>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => loadMutationHistory()}
                  disabled={isLoadingHistory}
                  className="p-1.5 rounded-md hover:bg-muted transition disabled:opacity-50"
                  title="Refresh"
                >
                  <RefreshCw className={`h-4 w-4 text-muted-foreground ${isLoadingHistory ? 'animate-spin' : ''}`} />
                </button>
                <button
                  onClick={() => {
                    setShowHistory(false);
                    setMutationFilter('all');
                  }}
                  className="p-1.5 rounded-md hover:bg-muted transition"
                >
                  <X className="h-4 w-4 text-muted-foreground" />
                </button>
              </div>
            </div>

            {/* Mutation Type Filter */}
            <div className="flex items-center gap-2 px-4 py-2 border-b bg-muted/20 overflow-x-auto scrollbar-hide">
              <Filter className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
              <button
                onClick={() => setMutationFilter('all')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition flex-shrink-0 border ${
                  mutationFilter === 'all'
                    ? 'bg-primary text-primary-foreground border-transparent'
                    : 'bg-muted text-muted-foreground hover:text-foreground border-border/80'
                }`}
              >
                Semua
              </button>
              <button
                onClick={() => setMutationFilter('in')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition flex-shrink-0 border ${
                  mutationFilter === 'in'
                    ? 'bg-emerald-500 text-white border-transparent'
                    : 'bg-muted text-muted-foreground hover:text-foreground border-border/80'
                }`}
              >
                Masuk
              </button>
              <button
                onClick={() => setMutationFilter('out')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition flex-shrink-0 border ${
                  mutationFilter === 'out'
                    ? 'bg-red-500 text-white border-transparent'
                    : 'bg-muted text-muted-foreground hover:text-foreground border-border/80'
                }`}
              >
                Keluar
              </button>
              <button
                onClick={() => setMutationFilter('adjustment')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition flex-shrink-0 border ${
                  mutationFilter === 'adjustment'
                    ? 'bg-amber-500 text-white border-transparent'
                    : 'bg-muted text-muted-foreground hover:text-foreground border-border/80'
                }`}
              >
                Penyesuaian
              </button>
              <button
                onClick={() => setMutationFilter('opname')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition flex-shrink-0 border ${
                  mutationFilter === 'opname'
                    ? 'bg-blue-500 text-white border-transparent'
                    : 'bg-muted text-muted-foreground hover:text-foreground border-border/80'
                }`}
              >
                Opname
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-xs uppercase tracking-wider text-muted-foreground">Waktu</th>
                    <th className="px-4 py-3 text-left font-medium text-xs uppercase tracking-wider text-muted-foreground">Item</th>
                    <th className="px-4 py-3 text-center font-medium text-xs uppercase tracking-wider text-muted-foreground">Tipe</th>
                    <th className="px-4 py-3 text-right font-medium text-xs uppercase tracking-wider text-muted-foreground">Qty</th>
                    <th className="px-4 py-3 text-right font-medium text-xs uppercase tracking-wider text-muted-foreground">HPP</th>
                    <th className="px-4 py-3 text-left font-medium text-xs uppercase tracking-wider text-muted-foreground">Catatan</th>
                    <th className="px-4 py-3 text-left font-medium text-xs uppercase tracking-wider text-muted-foreground">Oleh</th>
                  </tr>
                </thead>
                <tbody>
                  {isInitialLoading ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
                        <RefreshCw className="h-6 w-6 mx-auto mb-2 opacity-30 animate-spin" />
                        Memuat riwayat...
                      </td>
                    </tr>
                  ) : mutations.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
                        <FileText className="h-12 w-12 mx-auto mb-2 opacity-30" />
                        <div className="text-sm font-medium">Belum ada mutasi stok</div>
                        <div className="text-xs mt-1">Mutasi akan tercatat saat restock, transaksi, atau stock opname</div>
                      </td>
                    </tr>
                  ) : (
                    filteredMutations.map((mut, index) => (
                      <tr key={`${mut.id}-${index}`} className="border-t last:border-b-0">
                        <td className="px-4 py-3 text-muted-foreground text-xs">{formatTanggal(mut.createdAt)}</td>
                        <td className="px-4 py-3">
                          <div className="font-medium">{mut.menuName}</div>
                          {mut.variantName && (
                            <div className="text-xs text-muted-foreground">{mut.variantName}</div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {mut.type === 'in' && (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium bg-emerald-500/10 text-emerald-600">
                              <ArrowUpCircle className="h-3 w-3" />
                              Masuk
                            </span>
                          )}
                          {mut.type === 'out' && (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium bg-red-500/10 text-red-600">
                              <ArrowDownCircle className="h-3 w-3" />
                              Keluar
                            </span>
                          )}
                          {mut.type === 'adjustment' && (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium bg-amber-500/10 text-amber-600">
                              Penyesuaian
                            </span>
                          )}
                          {mut.type === 'opname' && (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium bg-blue-500/10 text-blue-600">
                              Opname
                            </span>
                          )}
                          {mut.type === 'in' && mut.referenceType === 'initial_stock' && (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium bg-purple-500/10 text-purple-600">
                              <Package className="h-3 w-3" />
                              Stok Awal
                            </span>
                          )}
                        </td>
                        <td className={`px-4 py-3 text-right font-bold ${
                          mut.type === 'in' ? 'text-emerald-500' : 'text-red-500'
                        }`}>
                          {mut.type === 'in' ? '+' : '-'}{Math.abs(mut.quantity)}
                        </td>
                        <td className="px-4 py-3 text-right text-muted-foreground text-xs">
                          {mut.hppPrice ? formatRupiah(mut.hppPrice) : '-'}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground text-xs">
                          {mut.notes || '-'}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground text-xs">
                          {mut.createdByName || '-'}
                        </td>
                      </tr>
                      ))
                  )}
                </tbody>
              </table>
              
              {/* Pagination / Load More */}
              {hasMoreHistory && mutations.length > 0 && (
                <div className="p-4 border-t bg-muted/20 flex justify-center">
                  <button
                    onClick={() => loadMutationHistory(true)}
                    disabled={isLoadingHistory}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border bg-background hover:bg-muted transition text-sm font-medium disabled:opacity-50 text-muted-foreground hover:text-foreground"
                  >
                    {isLoadingHistory ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        <span>Memuat...</span>
                      </>
                    ) : (
                      <>
                        <span>Tampilkan Lebih Banyak</span>
                        <Plus className="h-4 w-4" />
                      </>
                    )}
                  </button>
                </div>
              )}

              {mutations.length > 0 && filteredMutations.length === 0 && (
                <div className="px-4 py-12 text-center text-muted-foreground">
                  <Filter className="h-12 w-12 mx-auto mb-2 opacity-30" />
                  <div className="text-sm font-medium">Tidak ada mutasi dengan filter ini</div>
                  <button
                    onClick={() => setMutationFilter('all')}
                    className="text-xs text-primary hover:underline mt-1"
                  >
                    Tampilkan semua mutasi
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Restock Dialog */}
      <RestockDialog
        isOpen={!!restockItem}
        onClose={() => setRestockItem(null)}
        menuItem={restockItem}
        onRestock={handleRestock}
      />

      {/* Stock Opname Dialog */}
      <StockOpnameDialog
        isOpen={showOpname}
        onClose={() => setShowOpname(false)}
        menuItems={menu}
        variantsMap={variantsMap}
        userId={user?.id}
        cafeId={cafeId}
        onComplete={handleOpname}
      />
    </AppShell>
  )
}
