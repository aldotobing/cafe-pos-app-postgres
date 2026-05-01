"use client"

import { useState, useMemo, useRef, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Package, Filter, X, Eye, FolderOpen, ChevronLeft, ChevronRight, EyeOff, Pencil, Trash2, Image as ImageIcon, Layers, Loader2 } from "lucide-react"
import { useMenu, useCategories } from "@/hooks/use-cafe-data"
import { useAuth } from "@/lib/auth-context"
import { menuApi } from "@/lib/api"
import { formatRupiah, cn } from "@/lib/utils"
import { toast } from "sonner"

interface MenuListProps {
  formVariants: any;
  containerVariants: any;
  cardVariants: any;
  canEdit: boolean;
  onEdit: (item: any) => void;
  onDelete: (id: string) => void;
  onView: (item: any) => void;
}

export function MenuList({
  formVariants,
  containerVariants,
  cardVariants,
  canEdit,
  onEdit,
  onDelete,
  onView,
}: MenuListProps) {
  const { userData } = useAuth()
  const { menu, isLoading: menuLoading, mutate: mutateMenu } = useMenu(userData?.cafe_id)
  const { categories, isLoading: categoriesLoading } = useCategories(userData?.cafe_id)
  
  const toggleAvailability = async (id: string) => {
    const item = menu.find(m => m.id === id)
    if (!item) return
    setTogglingId(id)
    try {
      await menuApi.update(id, { available: !item.available })
      await mutateMenu()
    } finally {
      setTogglingId(null)
    }
  }
  
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [statusFilter, setStatusFilter] = useState<'all' | 'available' | 'unavailable'>('all')
  const [togglingId, setTogglingId] = useState<string | null>(null)

  // Scroll management for categories
  const categoryScrollRef = useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)

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

  // Filter menu items
  const filteredMenuList = useMemo(() => {
    return menu.filter(m => {
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const categoryName = categories.find(c => c.id === m.categoryId)?.name || '';
        const matchesSearch = m.name.toLowerCase().includes(query) || 
                             categoryName.toLowerCase().includes(query);
        if (!matchesSearch) return false;
      }
      if (selectedCategory !== 'all' && m.categoryId !== selectedCategory) {
        return false;
      }
      if (statusFilter === 'available' && !m.available) return false;
      if (statusFilter === 'unavailable' && m.available) return false;
      return true;
    });
  }, [menu, searchQuery, selectedCategory, statusFilter, categories]);

  return (
    <>
      {/* Search and Filters Section */}
      <motion.div
        variants={formVariants}
        initial="hidden"
        animate="visible"
        transition={{ delay: 0.2, duration: 0.5, ease: "easeOut" }}
        className="mt-8 space-y-4"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            Daftar Barang
          </h2>
          <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full font-medium">
            {filteredMenuList.length} Barang ditemukan
          </span>
        </div>

        {/* Search Bar */}
        <div className="relative group">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
            <Filter className="h-4 w-4 text-muted-foreground/50 group-focus-within:text-primary transition-colors" />
          </div>
          <input
            type="text"
            placeholder="Cari nama barang atau kategori..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-card border border-border/80 rounded-2xl py-3 pl-11 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all shadow-sm"
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
          {/* Status Quick Filter */}
          <div className="flex items-center gap-3 overflow-x-auto pb-1 scrollbar-hide">
             <div className="p-1.5 rounded-lg bg-muted/60 text-muted-foreground flex-shrink-0">
               <Eye className="h-3.5 w-3.5" />
             </div>
             <div className="flex gap-2">
               {[
                 { id: 'all', label: 'SEMUA STATUS', color: 'primary' },
                 { id: 'available', label: 'TERSEDIA', color: 'emerald-500' },
                 { id: 'unavailable', label: 'NONAKTIF', color: 'red-500' }
               ].map((item) => (
                 <button
                   key={item.id}
                   onClick={() => setStatusFilter(item.id as any)}
                   className={cn(
                     "px-4 py-1.5 rounded-xl text-[10px] font-extrabold transition-all border flex-shrink-0",
                     statusFilter === item.id
                       ? item.id === 'all' 
                         ? "bg-foreground text-background border-transparent shadow-md"
                         : `bg-${item.color} text-white border-transparent shadow-md`
                       : "bg-background text-muted-foreground hover:bg-muted border-border/80"
                   )}
                 >
                   {item.label}
                 </button>
               ))}
             </div>
          </div>

          {/* Category Filter with Arrows */}
          <div className="flex items-center gap-3">
             <div className="p-1.5 rounded-lg bg-muted/60 text-muted-foreground flex-shrink-0">
               <FolderOpen className="h-3.5 w-3.5" />
             </div>
             <div className="relative flex-1 group/scroll overflow-hidden">
               <AnimatePresence>
                 {canScrollLeft && (
                   <motion.div
                     key="cat-scroll-left"
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
                     key="cat-scroll-right"
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
                     "px-4 py-1.5 rounded-xl text-[10px] font-extrabold transition-all border flex-shrink-0",
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
                       "px-4 py-1.5 rounded-xl text-[10px] font-extrabold transition-all border flex-shrink-0 flex items-center gap-2",
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

      <motion.div
        className="mt-4 sm:mt-6 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-3"
        variants={containerVariants}
        initial={false}
        animate="visible"
        transition={{ duration: 0.3, ease: "easeOut" }}
      >
        <AnimatePresence mode="popLayout">
          {filteredMenuList.length === 0 ? (
            <motion.div 
              className="col-span-full py-20 text-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <div className="w-16 h-16 bg-muted rounded-2xl mx-auto flex items-center justify-center mb-4">
                <Package className="h-8 w-8 text-muted-foreground/40" />
              </div>
              <h3 className="text-sm font-semibold">Tidak ada barang ditemukan</h3>
              <p className="text-xs text-muted-foreground mt-1">Coba ubah filter atau kata kunci pencarian Anda</p>
              <button 
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('all');
                  setStatusFilter('all');
                }}
                className="mt-4 text-xs font-bold text-primary hover:underline"
              >
                Reset Semua Filter
              </button>
            </motion.div>
          ) : (
            filteredMenuList.map((m, index) => (
            <motion.div
              key={m.id}
              className="rounded-lg border bg-card overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200 cursor-pointer"
              variants={cardVariants}
              initial="hidden"
              animate="visible"
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ delay: index * 0.03, duration: 0.3, ease: "easeOut" }}
              whileHover={{
                y: -4,
                boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)"
              }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onView(m)}
            >
              <div className="aspect-square relative bg-muted overflow-hidden">
                {m.imageUrl ? (
                  <motion.img
                    src={m.imageUrl}
                    alt={m.name}
                    className="w-full h-full object-cover"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                      target.parentElement!.style.display = 'flex';
                      target.parentElement!.style.alignItems = 'center';
                      target.parentElement!.style.justifyContent = 'center';
                    }}
                    whileHover={{ scale: 1.05 }}
                    transition={{ duration: 0.3 }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-muted">
                    <div className="text-muted-foreground text-center p-2">
                      <div className="bg-muted rounded-lg w-12 h-12 mx-auto mb-1 flex items-center justify-center">
                        <ImageIcon className="h-6 w-6 opacity-50" />
                      </div>
                      <span className="text-[10px]">Tanpa Gambar</span>
                    </div>
                  </div>
                )}
              </div>
              <div className="p-2">
                <div className="flex flex-col justify-between h-[80px]">
                  <div>
                    <motion.div
                      className="font-semibold text-xs mb-1 line-clamp-1"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.1, duration: 0.3 }}
                    >
                      {m.name}
                    </motion.div>
                    <motion.div
                      className="text-[10px] text-muted-foreground mb-1 flex items-center gap-1"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.2, duration: 0.3 }}
                    >
                      {categories.find(c => c.id === m.categoryId)?.name || (m.category && String(m.category)) || 'Tanpa Kategori'}
                      {!!(m.hasVariants || m.has_variants) && (
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-[9px] font-medium">
                          <Layers className="h-2.5 w-2.5" />
                          Varian
                        </span>
                      )}
                    </motion.div>
                  </div>
                  <motion.div
                    className="text-sm font-bold text-primary"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3, duration: 0.3 }}
                  >
                    {(m.hasVariants || m.has_variants) && !!(m.variantCount || m.variants?.length)
                      ? `${formatRupiah(m.price)}+`
                      : formatRupiah(m.price)}
                  </motion.div>
                </div>
                <div className="mt-2 flex flex-wrap gap-1">
                  <motion.button
                    className="inline-flex items-center gap-1 rounded-md border px-1 py-0.5 text-[10px] disabled:opacity-50 disabled:cursor-not-allowed"
                    onClick={async (e) => {
                      e.stopPropagation();
                      if (!m.id) {
                        toast.error('Tidak dapat mengganti status ketersediaan: ID tidak valid');
                        return;
                      }
                      try {
                        await toggleAvailability(m.id);
                        toast.success('Status ketersediaan berhasil diubah');
                      } catch (error) {
                        toast.error('Gagal mengganti status ketersediaan. Silakan coba lagi.');
                      }
                    }}
                    disabled={togglingId === m.id}
                    whileHover={togglingId !== m.id ? { scale: 1.05 } : {}}
                    whileTap={togglingId !== m.id ? { scale: 0.95 } : {}}
                    transition={{ duration: 0.2 }}
                  >
                    {togglingId === m.id ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : m.available ? (
                      <Eye size={12} />
                    ) : (
                      <EyeOff size={12} />
                    )}
                    <span className="hidden sm:inline">
                      {togglingId === m.id ? "Memproses..." : m.available ? "Tersedia" : "Nonaktif"}
                    </span>
                    <span className="sm:hidden">
                      {togglingId === m.id ? "..." : m.available ? "Tersedia" : "Nonaktif"}
                    </span>
                  </motion.button>
                  {canEdit && (
                    <>
                      <motion.button
                        className="inline-flex items-center gap-1 rounded-md border px-1 py-0.5 text-[10px]"
                        onClick={(e) => {
                          e.stopPropagation();
                          onEdit(m);
                        }}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                      >
                        <Pencil size={12} /> Ubah
                      </motion.button>
                      <motion.button
                        className="inline-flex items-center gap-1 rounded-md border px-1 py-0.5 text-[10px] text-destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (!m.id) {
                            toast.error('Tidak dapat menghapus menu: ID tidak valid');
                            return;
                          }
                          onDelete(m.id);
                        }}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                      >
                        <Trash2 size={12} /> Hapus
                      </motion.button>
                    </>
                  )}
                </div>
              </div>
            </motion.div>
            ))
          )}
        </AnimatePresence>
      </motion.div>
    </>
  )
}
