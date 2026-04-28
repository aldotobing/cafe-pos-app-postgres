"use client"

import { AppShell } from "@/components/app-shell"
import { useEffect, useState } from "react"
import { useMenu, useCategories } from "@/hooks/use-cafe-data"
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { MenuSkeleton } from "@/components/skeletons"
import { useAuth } from '@/lib/auth-context'

import { AddMenuForm } from "@/components/menu/add-menu-form"
import { MenuList } from "@/components/menu/menu-list"
import { EditMenuModal } from "@/components/menu/edit-menu-modal"
import { MenuDetailModal } from "@/components/menu/menu-detail-modal"
import { DeleteMenuDialog } from "@/components/menu/delete-menu-dialog"
import { VariantAttributesManager } from "@/components/menu/variant-attributes-manager"
import { Layers, ChevronDown, ChevronUp } from "lucide-react"

export default function Page() {
  const { user, userData, loading } = useAuth();
  const { mutate: mutateMenu, isLoading: menuLoading } = useMenu(userData?.cafe_id)
  const { mutate: mutateCategories, isLoading: categoriesLoading } = useCategories(userData?.cafe_id)
  const router = useRouter();
  
  const isInitialized = !menuLoading && !categoriesLoading
  const role = userData?.role === 'admin' ? 'admin' : 'kasir'
  const cafeId = userData?.cafe_id

  // Shared state for viewing/editing
  const [editingMenuItem, setEditingMenuItem] = useState<any>(null)
  const [viewingMenuItem, setViewingMenuItem] = useState<any>(null)
  const [canShowConfirmDialog, setCanShowConfirmDialog] = useState<string | null>(null)

  // Listen for category changes from categories page and refresh store data
  useEffect(() => {
    const handleCategoryChange = () => {
      mutateMenu();
      mutateCategories();
    };

    window.addEventListener('categoriesChanged', handleCategoryChange);
    return () => window.removeEventListener('categoriesChanged', handleCategoryChange);
  }, [mutateMenu, mutateCategories]);

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 }
  };

  const headerVariants = {
    hidden: { opacity: 0, y: -20 },
    visible: { opacity: 1, y: 0 }
  };

  const formVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 20, scale: 0.95 },
    visible: { opacity: 1, y: 0, scale: 1 }
  };

  const modalVariants = {
    hidden: { opacity: 0, scale: 0.9 },
    visible: { opacity: 1, scale: 1 }
  };

  useEffect(() => {
    // Check authentication - redirect if not logged in
    if (!loading && (!user || !userData)) {
      router.push('/login');
      return;
    }

    // Check approval status for regular admin users
    if (!loading && user && userData) {
      if (!userData.is_approved && userData.role !== 'superadmin') {
        router.push('/pending-approval');
        return;
      }

      if (userData.role === 'cashier' && !userData.cafe_id) {
        router.push('/login');
        return;
      }

      if (userData.role === 'admin' && !userData.cafe_id) {
        router.push('/create-cafe');
        return;
      }
    }
  }, [user, userData, loading, router]);

  // Show loading state while checking auth or initializing
  if (loading || !isInitialized) {
    return <MenuSkeleton />;
  }

  const canEdit = role === "admin"

  return (
    <AppShell>
      <motion.div
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4"
        variants={headerVariants}
        initial="hidden"
        animate="visible"
        transition={{ duration: 0.5, ease: "easeOut" }}
      >
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Kelola Barang</h1>
          <p className="text-muted-foreground mt-1">
            Tambah, ubah, dan kelola semua inventaris bisnis Anda.
          </p>
        </div>
        {!canEdit && <span className="text-sm text-muted-foreground">Mode kasir (read-only)</span>}
      </motion.div>

      {canEdit && (
        <>
          <AddMenuForm formVariants={formVariants} />
          
          {/* Variant Attributes Section - Collapsible */}
          <VariantAttributesSection />
        </>
      )}

      <MenuList
        formVariants={formVariants}
        containerVariants={containerVariants}
        cardVariants={cardVariants}
        canEdit={canEdit}
        onEdit={(item: any) => setEditingMenuItem(item)}
        onDelete={(id: string) => setCanShowConfirmDialog(id)}
        onView={(item: any) => setViewingMenuItem(item)}
      />

      {/* Edit Menu Modal */}
      <AnimatePresence>
        {editingMenuItem && (
          <EditMenuModal
            menuItem={editingMenuItem}
            onClose={() => setEditingMenuItem(null)}
            modalVariants={modalVariants}
          />
        )}
      </AnimatePresence>

      {/* Delete Confirmation Dialog */}
      <AnimatePresence>
        {canShowConfirmDialog && (
          <DeleteMenuDialog
            itemId={canShowConfirmDialog}
            onClose={() => setCanShowConfirmDialog(null)}
            modalVariants={modalVariants}
          />
        )}
      </AnimatePresence>

      {/* Detail Modal */}
      <AnimatePresence>
        {viewingMenuItem && (
          <MenuDetailModal
            menuItem={viewingMenuItem}
            canEdit={canEdit}
            onClose={() => setViewingMenuItem(null)}
            onEdit={(item: any) => {
              setViewingMenuItem(null);
              setEditingMenuItem(item);
            }}
          />
        )}
      </AnimatePresence>
    </AppShell>
  )
}

// Variant Attributes Section Component
function VariantAttributesSection() {
  const { userData } = useAuth()
  const cafeId = userData?.cafe_id
  const [isExpanded, setIsExpanded] = useState(false)

  if (!cafeId) return null

  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0 }
      }}
      initial="hidden"
      animate="visible"
      transition={{ delay: 0.2, duration: 0.5 }}
      className="my-6 rounded-xl border bg-card overflow-hidden"
    >
      {/* Header - Click to expand */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 flex items-center justify-between bg-muted/30 hover:bg-muted/50 transition"
      >
        <div className="flex items-center gap-3">
          <div className="p-1.5 rounded-lg bg-purple-500/10">
            <Layers className="h-4 w-4 text-purple-600" />
          </div>
          <div className="text-left">
            <h3 className="text-sm font-medium">Atribut Varian</h3>
            <p className="text-xs text-muted-foreground">
              Kelola atribut untuk varian produk (warna, ukuran, model)
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 font-medium">
            Admin
          </span>
          {isExpanded ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      </button>

      {/* Expanded Content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="p-4 border-t">
              <VariantAttributesManager cafeId={cafeId} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}