"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"
import { useAuth } from "@/lib/auth-context"
import { useMenu } from "@/hooks/use-cafe-data"
import { menuApi } from "@/lib/api"

interface DeleteMenuDialogProps {
  itemId: string;
  onClose: () => void;
  modalVariants: any;
}

export function DeleteMenuDialog({ itemId, onClose, modalVariants }: DeleteMenuDialogProps) {
  const { userData } = useAuth()
  const cafeId = userData?.cafe_id
  const { menu, mutate: mutateMenu } = useMenu(cafeId)
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!itemId) {
      toast.error('Tidak dapat menghapus menu: ID tidak valid');
      return;
    }

    setIsDeleting(true);
    try {
      // Find the menu item to get its image URL
      const menuItem = menu.find(m => m.id === itemId);
      
      // Delete image from R2 if exists
      if (menuItem?.imageUrl) {
        try {
          await fetch('/api/upload/delete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: menuItem.imageUrl, folder: 'menu' }),
          });
        } catch (imgErr) {
          // Continue with menu deletion even if image deletion fails
        }
      }

      await menuApi.delete(itemId);
      mutateMenu();
      toast.success('Menu berhasil dihapus');
      onClose();
    } catch (error) {
      toast.error('Gagal menghapus menu. Silakan coba lagi.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      <motion.div
        className="bg-card border rounded-lg p-6 w-full max-w-md mx-4 shadow-lg"
        variants={modalVariants}
        initial="hidden"
        animate="visible"
        exit="hidden"
      >
        <h3 className="font-semibold text-lg mb-2">Konfirmasi Hapus</h3>
        <p className="text-muted-foreground mb-6">Apakah Anda yakin ingin menghapus menu ini? Tindakan ini tidak dapat dibatalkan.</p>
        <div className="flex justify-end gap-2">
          <motion.button
            className="px-4 py-2 rounded-md border bg-background hover:bg-accent disabled:opacity-50"
            disabled={isDeleting}
            onClick={onClose}
            whileHover={!isDeleting ? { scale: 1.02 } : {}}
            whileTap={!isDeleting ? { scale: 0.98 } : {}}
            transition={{ duration: 0.2 }}
          >
            Batal
          </motion.button>
          <motion.button
            className="px-4 py-2 bg-destructive text-white rounded-md hover:bg-destructive/90 transition-colors disabled:opacity-50 flex items-center gap-2"
            disabled={isDeleting}
            onClick={handleDelete}
            whileHover={!isDeleting ? { scale: 1.02, y: -1 } : {}}
            whileTap={!isDeleting ? { scale: 0.98 } : {}}
            transition={{ duration: 0.2 }}
          >
            {isDeleting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Menghapus...
              </>
            ) : (
              "Hapus"
            )}
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  )
}
