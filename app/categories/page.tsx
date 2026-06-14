"use client"

import { AppShell } from "@/components/app-shell"
import { useCallback, useEffect, useState } from "react"
import { useCategories, useMenu } from "@/hooks/use-cafe-data"
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion';
import { FolderOpen, Plus, Pencil, Trash2, X, Loader2, GripVertical } from 'lucide-react'
import { toast } from "sonner"
import type { Category } from "@/types"
import { CategoriesSkeleton } from "@/components/skeletons"
import { IconPicker } from "@/components/category/icon-picker"
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { cn } from '@/lib/utils'

function SortableCategoryRow({
  cat,
  index,
  onEdit,
  onDelete,
}: {
  cat: Category
  index: number
  onEdit: (cat: Category) => void
  onDelete: (cat: Category) => void
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({ id: cat.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group flex items-stretch border rounded-xl bg-card shadow-subtle transition-all duration-200 overflow-hidden",
        isSortableDragging
          ? "z-50 shadow-xl ring-2 ring-primary/30 scale-[1.01] opacity-95 relative"
          : "hover:shadow-md hover:border-primary/20"
      )}
    >
      {/* Drag handle with position number */}
      <button
        {...attributes}
        {...listeners}
        className={cn(
          "touch-none shrink-0 flex flex-col items-center justify-center gap-0.5 min-w-[52px] px-3 border-r border-border/50 transition-colors cursor-grab active:cursor-grabbing",
          isSortableDragging
            ? "bg-primary/10 text-primary"
            : "bg-muted/30 text-muted-foreground group-hover:bg-muted/50 group-hover:text-foreground"
        )}
        aria-label="Tahan dan geser untuk mengubah urutan"
        title="Tahan dan geser untuk mengubah urutan"
      >
        <span className="text-xs font-bold tabular-nums leading-none">{index + 1}</span>
        <GripVertical className="h-4 w-4 opacity-60" />
      </button>

      {/* Content */}
      <div className="flex items-center gap-3 p-3 sm:p-4 flex-1 min-w-0">
        <div
          className="w-11 h-11 sm:w-12 sm:h-12 rounded-lg flex items-center justify-center text-xl shadow-inner shrink-0"
          style={{
            backgroundColor: `${cat.color || '#6B7280'}18`,
            color: cat.color || '#6B7280',
          }}
        >
          <span className="leading-none">{cat.icon || <FolderOpen className="h-5 w-5 opacity-30" />}</span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-semibold text-sm sm:text-base truncate">{cat.name}</div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 px-2 shrink-0 border-l border-border/50 bg-muted/10">
        <button
          onClick={() => onEdit(cat)}
          className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-background hover:text-primary transition-all text-muted-foreground active:scale-90"
          title="Edit"
        >
          <Pencil className="h-4 w-4" />
        </button>
        <button
          onClick={() => onDelete(cat)}
          className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-red-50 hover:text-red-600 transition-all text-muted-foreground active:scale-90"
          title="Hapus"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}

export default function CategoriesPage() {
  const { userData, loading: authLoading, user } = useAuth();
  const cafeId = userData?.cafe_id;
  const { categories, isLoading: categoriesLoading, mutate: mutateCategories } = useCategories(cafeId);
  const { mutate: mutateMenu } = useMenu(cafeId);
  const router = useRouter();
  const [showAddEdit, setShowAddEdit] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [form, setForm] = useState({ name: '', icon: '', color: '#6B7280', sortOrder: 0 })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [localCategories, setLocalCategories] = useState<Category[]>([])
  const [activeDragId, setActiveDragId] = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } })
  )

  useEffect(() => {
    if (categories.length > 0) {
      setLocalCategories([...categories].sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0)))
    } else {
      setLocalCategories([])
    }
  }, [categories])

  const handleDragStart = useCallback((event: { active: { id: string | number } }) => {
    setActiveDragId(String(event.active.id))
  }, [])

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event
      setActiveDragId(null)

      if (!over || active.id === over.id) return

      setLocalCategories((items) => {
        const oldIndex = items.findIndex((i) => i.id === active.id)
        const newIndex = items.findIndex((i) => i.id === over.id)
        const reordered = arrayMove(items, oldIndex, newIndex)

        const orders = reordered.map((item, idx) => ({
          id: item.id,
          sort_order: idx + 1,
          name: item.name,
        }))

        fetch('/api/categories/reorder', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orders: orders.map(o => ({ id: o.id, sort_order: o.sort_order })) }),
        })
          .then(() => {
            mutateCategories()
            window.dispatchEvent(new CustomEvent('categoriesChanged'))
          })
          .catch(() => {
            toast.error('Gagal menyimpan urutan')
            setLocalCategories([...categories].sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0)))
          })

        return reordered
      })
    },
    [categories, mutateCategories]
  )

  // Animation variants
  const headerVariants = {
    hidden: { opacity: 0, y: -20 },
    visible: { opacity: 1, y: 0 }
  };

  // Authentication check
  useEffect(() => {
    if (!authLoading && (!user || !userData)) {
      router.push('/login');
      return;
    }
  }, [user, userData, authLoading, router]);


  const handleSubmit = async () => {
    if (!form.name.trim()) {
      toast.error("Nama kategori wajib diisi");
      return;
    }

    setIsSubmitting(true);
    try {
      const url = editingCategory ? `/api/categories/${editingCategory.id}` : '/api/categories';
      const method = editingCategory ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cafeId,
          ...form,
        }),
      });

      if (response.ok) {
        toast.success(editingCategory ? 'Kategori berhasil diupdate' : 'Kategori berhasil ditambahkan');
        handleCloseForm();
        await mutateCategories();
        // Update menu data too in case categories affect menu display
        await mutateMenu();
        // Notify other components about category changes
        window.dispatchEvent(new CustomEvent('categoriesChanged'));
      } else {
        const error = await response.json();
        throw new Error(error.message || 'Gagal menyimpan kategori');
      }
    } catch (error: any) {
      toast.error(error.message || 'Terjadi kesalahan');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteClick = (category: Category) => {
    setDeleteConfirmId(category.id);
  };

  const handleDelete = async () => {
    if (!deleteConfirmId) return;

    const categoryToDelete = categories.find(c => c.id === deleteConfirmId);
    if (!categoryToDelete) {
      toast.error('Kategori tidak ditemukan');
      setDeleteConfirmId(null);
      return;
    }

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/categories/${deleteConfirmId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success('Kategori berhasil dihapus');
        setDeleteConfirmId(null);
        await mutateCategories();
        // Update menu data too
        await mutateMenu();
        // Notify other components about category changes
        window.dispatchEvent(new CustomEvent('categoriesChanged'));
      } else {
        const error = await response.json();
        throw new Error(error.message || 'Gagal menghapus kategori');
      }
    } catch (error: any) {
      toast.error(error.message || 'Terjadi kesalahan');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCancelDelete = () => {
    setDeleteConfirmId(null);
  };

  const handleEdit = (category: Category) => {
    setEditingCategory(category);
    setForm({
      name: category.name,
      icon: category.icon || '',
      color: category.color || '#6B7280',
      sortOrder: category.sortOrder || 0,
    });
    setShowAddEdit(true);
  };

  const handleCloseForm = () => {
    setShowAddEdit(false);
    setEditingCategory(null);
    setForm({ name: '', icon: '', color: '#6B7280', sortOrder: 0 });
  };

  if (authLoading || categoriesLoading) {
    return <CategoriesSkeleton />;
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
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Kategori Menu</h1>
          <p className="text-sm text-muted-foreground">
            Atur dan kelompokkan menu Anda. Tahan lalu geser untuk mengubah urutan tampil.
          </p>
        </div>
        <button
          onClick={() => setShowAddEdit(true)}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-all text-sm font-medium shadow-md shadow-primary/10 active:scale-95"
        >
          <Plus className="h-4 w-4" />
          <span>Tambah Kategori</span>
        </button>
      </motion.div>

      {/* Categories Content */}
      <div className="space-y-4">
        {localCategories.length === 0 ? (
          <motion.div
            className="flex flex-col items-center justify-center py-20 px-4 text-center bg-card/50 rounded-3xl border-2 border-dashed border-muted/50"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <div className="p-4 rounded-full bg-muted/30 mb-4 text-muted-foreground/30">
              <FolderOpen className="h-16 w-16" />
            </div>
            <h3 className="text-xl font-bold mb-2">Belum ada kategori</h3>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto leading-relaxed">
              Mulai dengan menambahkan kategori untuk mengorganisir daftar menu Anda.
            </p>
          </motion.div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={localCategories.map(c => c.id)}
              strategy={verticalListSortingStrategy}
            >
              <motion.div
                className="space-y-2"
                initial="hidden"
                animate="visible"
                transition={{ duration: 0.3, ease: "easeOut" }}
              >
                <AnimatePresence mode="popLayout">
                  {localCategories.map((cat, idx) => (
                    <SortableCategoryRow
                      key={cat.id}
                      cat={cat}
                      index={idx}
                      onEdit={handleEdit}
                      onDelete={handleDeleteClick}
                    />
                  ))}
                </AnimatePresence>
              </motion.div>
            </SortableContext>
          </DndContext>
        )}
      </div>

      {/* Add/Edit Dialog */}
      <AnimatePresence>
        {showAddEdit && (
          <>
            <motion.div
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleCloseForm}
            />
            <motion.div
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
            >
              <div className="w-full max-w-md bg-card border rounded-xl shadow-2xl overflow-hidden">
                {/* Dialog Header */}
                <div className="flex items-center justify-between p-4 border-b">
                  <div className="flex items-center gap-2">
                    <FolderOpen className="h-5 w-5 text-primary" />
                    <h3 className="font-semibold">
                      {editingCategory ? 'Edit Kategori' : 'Tambah Kategori'}
                    </h3>
                  </div>
                  <button
                    onClick={handleCloseForm}
                    className="p-1 rounded-md hover:bg-muted transition"
                  >
                    <X className="h-4 w-4 text-muted-foreground" />
                  </button>
                </div>

                {/* Dialog Content */}
                <div className="p-4 space-y-4">
                  {/* Name */}
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Nama Kategori</label>
                    <input
                      type="text"
                      value={form.name}
                      onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
                      placeholder="Contoh: Minuman Panas"
                      className="w-full rounded-lg border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                      autoFocus
                    />
                  </div>

                  {/* Icon Picker */}
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Ikon</label>
                    <IconPicker
                      selectedIcon={form.icon}
                      onSelect={(icon) => setForm(f => ({ ...f, icon }))}
                    />
                    <p className="text-xs text-muted-foreground mt-1.5">Gulir untuk melihat semua ikon</p>
                  </div>

                  {/* Color Picker hidden as requested */}
                  <input type="hidden" value={form.color} />


                  {/* Sort Order */}
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Urutan Tampil</label>
                    <input
                      type="number"
                      inputMode="numeric"
                      value={form.sortOrder}
                      onChange={(e) => setForm(f => ({ ...f, sortOrder: Number(e.target.value) || 0 }))}
                      onFocus={(e) => e.target.select()}
                      min={0}
                      className="w-full rounded-lg border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                    />
                    <p className="text-xs text-muted-foreground mt-1">Angka lebih kecil tampil lebih dulu</p>
                  </div>
                </div>

                {/* Dialog Footer */}
                <div className="flex gap-2 p-4 border-t bg-muted/20">
                  <button
                    onClick={handleCloseForm}
                    disabled={isSubmitting}
                    className="flex-1 px-4 py-2 rounded-lg border bg-background hover:bg-muted transition text-sm disabled:opacity-50"
                  >
                    Batal
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={isSubmitting || !form.name.trim()}
                    className="flex-1 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Menyimpan...</span>
                      </>
                    ) : (
                      <span>{editingCategory ? 'Update' : 'Tambah'}</span>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Dialog */}
      <AnimatePresence>
        {deleteConfirmId && (
          <>
            <motion.div
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleCancelDelete}
            />
            <motion.div
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
            >
              <div className="w-full max-w-md bg-card border rounded-xl shadow-2xl overflow-hidden">
                <div className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="p-2.5 rounded-full bg-red-500/10 flex-shrink-0">
                      <Trash2 className="h-5 w-5 text-red-600" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg mb-1">Hapus Kategori?</h3>
                      <p className="text-sm text-muted-foreground">
                        Apakah Anda yakin ingin menghapus kategori <span className="font-medium text-foreground">"{categories.find(c => c.id === deleteConfirmId)?.name}"</span>? 
                      </p>
                      <p className="text-xs text-muted-foreground mt-2">
                        Barang dalam kategori ini tidak akan terhapus.
                      </p>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 p-4 border-t bg-muted/20">
                  <button
                    onClick={handleCancelDelete}
                    disabled={isDeleting}
                    className="flex-1 px-4 py-2 rounded-lg border bg-background hover:bg-muted transition text-sm disabled:opacity-50"
                  >
                    Batal
                  </button>
                  <button
                    onClick={handleDelete}
                    disabled={isDeleting}
                    className="flex-1 px-4 py-2 rounded-lg bg-destructive text-destructive-foreground hover:bg-destructive/90 transition text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isDeleting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Menghapus...</span>
                      </>
                    ) : (
                      <>
                        <Trash2 className="h-4 w-4" />
                        <span>Hapus</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </AppShell>
  )
}
