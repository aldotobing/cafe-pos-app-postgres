"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { 
  Palette, Ruler, Plus, Trash2, Edit3, X, Check,
  GripVertical, AlertCircle, Loader2
} from "lucide-react"
import { toast } from "sonner"
import type { VariantAttribute, VariantAttributeValue } from "@/types"

interface VariantAttributesManagerProps {
  cafeId: number
  onChange?: () => void
}

export function VariantAttributesManager({ cafeId, onChange }: VariantAttributesManagerProps) {
  const [attributes, setAttributes] = useState<VariantAttribute[]>([])
  const [attributeValues, setAttributeValues] = useState<Record<string, VariantAttributeValue[]>>({})
  const [isLoading, setIsLoading] = useState(false)
  const [deletingAttributeId, setDeletingAttributeId] = useState<string | null>(null)
  const [deletingValueId, setDeletingValueId] = useState<string | null>(null)
  
  // Delete confirmation dialog states
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleteDialogConfig, setDeleteDialogConfig] = useState<{
    title: string
    message: string
    onConfirm: () => void
  } | null>(null)
  
  // Form states
  const [newAttributeName, setNewAttributeName] = useState("")
  const [editingAttribute, setEditingAttribute] = useState<string | null>(null)
  const [newValueInput, setNewValueInput] = useState<Record<string, string>>({})
  const [expandedAttributes, setExpandedAttributes] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (cafeId) {
      loadAttributes()
    }
  }, [cafeId])

  // Notify parent when attributes change
  const notifyChange = () => {
    onChange?.()
  }

  const loadAttributes = async () => {
    try {
      // Single API call to get all attributes with their values
      const response = await fetch(`/api/rest/variant_attributes/with-values?cafe_id=${cafeId}`)
      const data = await response.json()

      if (!response.ok) {
        console.error('Failed to load attributes:', data.error)
        return
      }

      // Transform data from the new endpoint format
      const attributesList = Array.isArray(data) ? data : (data.data || data.results || [])

      // Extract attributes (without values nested)
      const attrs: VariantAttribute[] = attributesList.map((attr: any) => ({
        id: attr.id,
        cafe_id: attr.cafe_id,
        name: attr.name,
        sortOrder: attr.sort_order,
        isActive: attr.is_active,
        createdAt: attr.created_at,
        updatedAt: attr.updated_at,
        deleted_at: attr.deleted_at,
        version: attr.version,
      }))

      // Build values map from nested values
      const valuesMap: Record<string, VariantAttributeValue[]> = {}
      attributesList.forEach((attr: any) => {
        valuesMap[attr.id] = (attr.values || []).map((val: any) => ({
          id: val.id,
          attributeId: attr.id,
          value: val.value,
          sortOrder: val.sort_order,
          isActive: val.is_active,
          createdAt: val.created_at,
          updatedAt: val.updated_at,
        }))
      })

      setAttributes(attrs)
      setAttributeValues(valuesMap)
    } catch (error) {
      console.error("Failed to load attributes:", error)
    }
  }

  const handleCreateAttribute = async () => {
    if (!newAttributeName.trim()) {
      toast.error("Nama atribut tidak boleh kosong")
      return
    }

    setIsLoading(true)
    try {
      const payload = {
        id: crypto.randomUUID(),
        cafe_id: cafeId,
        name: newAttributeName.trim(),
        sort_order: attributes.length
      }
      const response = await fetch(`/api/rest/variant_attributes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      })

      const data = await response.json()
      
      if (data.success || response.ok) {
        toast.success("Atribut berhasil ditambahkan")
        setNewAttributeName("")
        await loadAttributes()
        notifyChange()
      } else {
        toast.error(data.error || "Gagal menambahkan atribut")
      }
    } catch (error) {
      console.error('Error creating attribute:', error)
      toast.error("Terjadi kesalahan")
    } finally {
      setIsLoading(false)
    }
  }

  const openDeleteAttributeDialog = (attributeId: string) => {
    const attr = attributes.find(a => a.id === attributeId)
    const valueCount = attributeValues[attributeId]?.length || 0
    
    setDeleteDialogConfig({
      title: "Konfirmasi Hapus Atribut",
      message: `Apakah Anda yakin ingin menghapus atribut "${attr?.name || ''}"?${valueCount > 0 ? ` Semua ${valueCount} nilai atribut juga akan dihapus.` : ''} Tindakan ini tidak dapat dibatalkan.`,
      onConfirm: () => executeDeleteAttribute(attributeId)
    })
    setDeleteDialogOpen(true)
  }

  const executeDeleteAttribute = async (attributeId: string) => {
    setDeleteDialogOpen(false)
    setDeletingAttributeId(attributeId)
    try {
      const response = await fetch(`/api/rest/variant_attributes/${attributeId}`, {
        method: "DELETE"
      })

      const data = await response.json()
      
      if (data.success || response.ok) {
        toast.success("Atribut dihapus")
        await loadAttributes()
        notifyChange()
      } else {
        toast.error("Gagal menghapus atribut")
      }
    } catch (error) {
      console.error('Delete error:', error)
      toast.error("Gagal menghapus atribut")
    } finally {
      setDeletingAttributeId(null)
    }
  }

  const handleAddValue = async (attributeId: string) => {
    const value = newValueInput[attributeId]?.trim()
    if (!value) return

    try {
      const response = await fetch(`/api/rest/variant_attribute_values`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: crypto.randomUUID(),
          attribute_id: attributeId,
          value: value,
          sort_order: (attributeValues[attributeId] || []).length
        })
      })

      const data = await response.json()
      if (data.success || response.ok) {
        setNewValueInput(prev => ({ ...prev, [attributeId]: "" }))
        await loadAttributes()
        notifyChange()
      }
    } catch (error) {
      toast.error("Gagal menambahkan nilai")
    }
  }

  const openDeleteValueDialog = (valueId: string, attributeId: string) => {
    const value = attributeValues[attributeId]?.find(v => v.id === valueId)
    
    setDeleteDialogConfig({
      title: "Konfirmasi Hapus Nilai",
      message: `Apakah Anda yakin ingin menghapus nilai "${value?.value || ''}"? Tindakan ini tidak dapat dibatalkan.`,
      onConfirm: () => executeDeleteValue(valueId)
    })
    setDeleteDialogOpen(true)
  }

  const executeDeleteValue = async (valueId: string) => {
    setDeleteDialogOpen(false)
    setDeletingValueId(valueId)
    try {
      const response = await fetch(`/api/rest/variant_attribute_values/${valueId}`, {
        method: "DELETE"
      })

      const data = await response.json()
      if (data.success || response.ok) {
        toast.success("Nilai dihapus")
        await loadAttributes()
        notifyChange()
      } else {
        toast.error("Gagal menghapus nilai")
      }
    } catch (error) {
      toast.error("Gagal menghapus nilai")
    } finally {
      setDeletingValueId(null)
    }
  }

  const toggleExpand = (attributeId: string) => {
    setExpandedAttributes(prev => {
      const next = new Set(prev)
      if (next.has(attributeId)) {
        next.delete(attributeId)
      } else {
        next.add(attributeId)
      }
      return next
    })
  }

  const getAttributeIcon = (name: string) => {
    const lower = name.toLowerCase()
    if (lower.includes('warna') || lower.includes('color')) return Palette
    if (lower.includes('ukuran') || lower.includes('size')) return Ruler
    return Edit3
  }

  return (
    <div className="space-y-6">
      {/* Add New Attribute */}
      <div className="p-4 rounded-xl border bg-card">
        <h4 className="text-sm font-medium mb-3">Tambah Atribut Baru</h4>
        <div className="flex gap-3">
          <input
            type="text"
            placeholder="Contoh: Warna, Ukuran, Model"
            className="flex-1 rounded-md border bg-background px-3 py-2 text-sm"
            value={newAttributeName}
            onChange={(e) => setNewAttributeName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreateAttribute()}
          />
          <button
            onClick={handleCreateAttribute}
            disabled={isLoading || !newAttributeName.trim()}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 transition disabled:opacity-50 flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Tambah
          </button>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Atribut seperti "Warna", "Ukuran", "Model" yang bisa dipilih untuk setiap produk.
        </p>
      </div>

      {/* Attributes List */}
      <div className="space-y-3">
        {attributes.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground border border-dashed rounded-xl">
            <Edit3 className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Belum ada atribut varian</p>
            <p className="text-xs mt-1">Tambahkan atribut pertama untuk memulai</p>
          </div>
        ) : (
          attributes.map((attr) => {
            const Icon = getAttributeIcon(attr.name)
            const isExpanded = expandedAttributes.has(attr.id)
            const values = attributeValues[attr.id] || []

            return (
              <motion.div
                key={attr.id}
                layout
                className="rounded-xl border overflow-hidden bg-card"
              >
                {/* Attribute Header */}
                <div className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Icon className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <h5 className="font-medium">{attr.name}</h5>
                      <p className="text-xs text-muted-foreground">
                        {values.length} nilai
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => toggleExpand(attr.id)}
                      className="px-3 py-1.5 text-xs font-medium rounded-md bg-muted hover:bg-muted/80 transition"
                    >
                      {isExpanded ? "Tutup" : "Kelola Nilai"}
                    </button>
                    <button
                      onClick={() => openDeleteAttributeDialog(attr.id)}
                      disabled={deletingAttributeId === attr.id}
                      className="p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {deletingAttributeId === attr.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Expanded Values Section */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden border-t bg-muted/30"
                    >
                      <div className="p-4 space-y-3">
                        {/* Existing Values */}
                        {values.length > 0 ? (
                          <div className="flex flex-wrap gap-2">
                            {values.map((val) => (
                              <div
                                key={val.id}
                                className="group flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-background border text-sm"
                              >
                                <span>{val.value}</span>
                                <button
                                  onClick={() => openDeleteValueDialog(val.id, attr.id)}
                                  disabled={deletingValueId === val.id}
                                  className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  {deletingValueId === val.id ? (
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                  ) : (
                                    <X className="h-3 w-3" />
                                  )}
                                </button>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground">
                            Belum ada nilai untuk atribut ini
                          </p>
                        )}

                        {/* Add Value Input */}
                        <div className="flex gap-2">
                          <input
                            type="text"
                            placeholder={`Tambah nilai ${attr.name.toLowerCase()}...`}
                            className="flex-1 rounded-md border bg-background px-3 py-2 text-sm"
                            value={newValueInput[attr.id] || ""}
                            onChange={(e) => setNewValueInput(prev => ({
                              ...prev,
                              [attr.id]: e.target.value
                            }))}
                            onKeyDown={(e) => e.key === "Enter" && handleAddValue(attr.id)}
                          />
                          <button
                            onClick={() => handleAddValue(attr.id)}
                            disabled={!newValueInput[attr.id]?.trim()}
                            className="px-3 py-2 bg-primary text-primary-foreground rounded-md text-sm hover:bg-primary/90 transition disabled:opacity-50"
                          >
                            <Plus className="h-4 w-4" />
                          </button>
                        </div>

                        <p className="text-xs text-muted-foreground">
                          Tekan Enter untuk menambahkan nilai baru
                        </p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )
          })
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <AnimatePresence>
        {deleteDialogOpen && deleteDialogConfig && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setDeleteDialogOpen(false)}
          >
            <motion.div
              className="bg-card border rounded-lg p-6 w-full max-w-md mx-4 shadow-lg"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="font-semibold text-lg mb-2">{deleteDialogConfig.title}</h3>
              <p className="text-muted-foreground mb-6">{deleteDialogConfig.message}</p>
              <div className="flex justify-end gap-2">
                <motion.button
                  className="px-4 py-2 rounded-md border bg-background hover:bg-accent"
                  onClick={() => setDeleteDialogOpen(false)}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  transition={{ duration: 0.2 }}
                >
                  Batal
                </motion.button>
                <motion.button
                  className="px-4 py-2 bg-destructive text-white rounded-md hover:bg-destructive/90 transition-colors flex items-center gap-2"
                  onClick={deleteDialogConfig.onConfirm}
                  whileHover={{ scale: 1.02, y: -1 }}
                  whileTap={{ scale: 0.98 }}
                  transition={{ duration: 0.2 }}
                >
                  <Trash2 className="h-4 w-4" />
                  Hapus
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Help Text */}
      <div className="p-4 rounded-xl bg-blue-500/5 border border-blue-200 dark:border-blue-900/30">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
          <div>
            <h5 className="text-sm font-medium text-blue-700 dark:text-blue-400">
              Tips Penggunaan Atribut
            </h5>
            <ul className="mt-2 text-xs text-muted-foreground space-y-1 list-disc list-inside">
              <li>Buat atribut umum seperti "Warna" dan "Ukuran"</li>
              <li>Tambahkan nilai seperti "Merah", "Biru", "M", "L", "XL"</li>
              <li>Setiap produk bisa memiliki kombinasi varian dari atribut ini</li>
              <li>Contoh: Kaos (Warna: Merah + Ukuran: M) = SKU: KAOS-RED-M</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
