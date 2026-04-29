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
  
  // Form states
  const [newAttributeName, setNewAttributeName] = useState("")
  const [editingAttribute, setEditingAttribute] = useState<string | null>(null)
  const [newValueInput, setNewValueInput] = useState<Record<string, string>>({})
  const [expandedAttributes, setExpandedAttributes] = useState<Set<string>>(new Set())

  useEffect(() => {
    loadAttributes()
  }, [cafeId])

  // Notify parent when attributes change
  const notifyChange = () => {
    onChange?.()
  }

  const loadAttributes = async () => {
    try {
      const response = await fetch(`/api/rest/variant_attributes?cafe_id=${cafeId}`)
      const data = await response.json()
      console.log('Load attributes response:', data)
      
      // Handle different response formats
      const attributesList = Array.isArray(data) ? data : (data.data || data.results || [])
      console.log('Attributes list:', attributesList)
      
      setAttributes(attributesList)
      
      // Load values for each attribute
      const valuesMap: Record<string, VariantAttributeValue[]> = {}
      for (const attr of attributesList) {
        const valuesRes = await fetch(`/api/rest/variant_attribute_values?attribute_id=${attr.id}`)
        const valuesData = await valuesRes.json()
        const valuesList = Array.isArray(valuesData) ? valuesData : (valuesData.data || valuesData.results || [])
        valuesMap[attr.id] = valuesList
      }
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
      console.log('Creating attribute with payload:', payload)
      
      const response = await fetch(`/api/rest/variant_attributes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      })

      const data = await response.json()
      console.log('API response:', data)
      console.log('Response status:', response.status)
      
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

  const handleDeleteAttribute = async (attributeId: string) => {
    console.log('Deleting attribute with ID:', attributeId)
    if (!confirm("Yakin ingin menghapus atribut ini? Semua nilai atribut juga akan dihapus.")) return

    setDeletingAttributeId(attributeId)
    try {
      const response = await fetch(`/api/rest/variant_attributes/${attributeId}`, {
        method: "DELETE"
      })

      console.log('Delete response status:', response.status)
      const data = await response.json()
      console.log('Delete response data:', data)
      
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

  const handleDeleteValue = async (valueId: string, attributeId: string) => {
    if (!confirm("Yakin ingin menghapus nilai ini?")) return

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
                      onClick={() => handleDeleteAttribute(attr.id)}
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
                                  onClick={() => handleDeleteValue(val.id, attr.id)}
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
