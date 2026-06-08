"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Plus, FolderOpen, Loader2, DollarSign, Pencil, TrendingUp, Layers, Tag, Barcode, ChevronDown, ChevronUp, AlertCircle } from "lucide-react"
import { ImageUpload } from "@/components/ui/image-upload"
import { BarcodePreview } from "@/components/ui/barcode-preview"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { formatRupiah, cn } from "@/lib/utils"
import { useAuth } from "@/lib/auth-context"
import { useMenu, useCategories } from "@/hooks/use-cafe-data"
import { menuApi } from "@/lib/api"

import type { VariantAttribute, VariantAttributeValue } from "@/types"

interface AddMenuFormProps {
  formVariants: any
  initialAttributes?: VariantAttribute[]
  initialAttributeValues?: VariantAttributeValue[]
}

export function AddMenuForm({ formVariants, initialAttributes = [], initialAttributeValues = [] }: AddMenuFormProps) {
  const router = useRouter()
  const { userData } = useAuth()
  const cafeId = userData?.cafe_id
  const { categories, isLoading: categoriesLoading } = useCategories(cafeId)
  const { mutate: mutateMenu } = useMenu(cafeId)
  const [isPriceManual, setIsPriceManual] = useState(false)
  const [isAdding, setIsAdding] = useState(false)
  const [isUploadingImage, setIsUploadingImage] = useState(false)
  const [formExpanded, setFormExpanded] = useState(false)

  const [form, setForm] = useState({
    name: "",
    category: "",
    categoryId: "",
    hppPrice: 0,
    marginPercent: 30,
    price: 0,
    stockQuantity: 0,
    minStock: 5,
    trackStock: true,
    available: true,
    imageUrl: "",
    hasVariants: false,
  })

  const [showVariantForm, setShowVariantForm] = useState(false)
  const [variantForm, setVariantForm] = useState({
    sku: "",
    barcode: "",
    stockQuantity: 0,
    price: 0,
  })

  const attributes = initialAttributes
  const attributeValues = initialAttributeValues
  const [selectedAttributeValues, setSelectedAttributeValues] = useState<Record<string, string>>({})
  const [selectedProductAttributes, setSelectedProductAttributes] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (attributes.length > 0 && selectedProductAttributes.size === 0) {
      setSelectedProductAttributes(new Set(attributes.map(a => a.id)))
    }
  }, [attributes, selectedProductAttributes.size])

  useEffect(() => {
    setSelectedAttributeValues(prev => {
      const updated = { ...prev }
      const currentAttributeIds = new Set(attributes.map(a => a.id))
      Object.keys(updated).forEach(attrId => {
        if (!currentAttributeIds.has(attrId)) delete updated[attrId]
      })
      return updated
    })
    setSelectedProductAttributes(prev => {
      const currentAttributeIds = new Set(attributes.map(a => a.id))
      return new Set(Array.from(prev).filter(id => currentAttributeIds.has(id)))
    })
  }, [attributes])

  useEffect(() => {
    if (!categoriesLoading && categories.length > 0 && !form.category) {
      setForm(f => ({ ...f, category: categories[0].name, categoryId: categories[0].id }))
    }
  }, [categories, categoriesLoading, form.category])

  useEffect(() => {
    if (!isPriceManual && form.hppPrice > 0) {
      setForm(f => ({ ...f, price: Math.round(f.hppPrice * (1 + f.marginPercent / 100)) }))
    } else if (!form.hppPrice) {
      setForm(f => ({ ...f, price: 0 }))
    }
  }, [form.hppPrice, form.marginPercent, isPriceManual])

  useEffect(() => {
    if (isPriceManual && form.hppPrice > 0 && form.price > 0) {
      setForm(f => ({ ...f, marginPercent: Math.round(((f.price - f.hppPrice) / f.hppPrice) * 100 * 10) / 10 }))
    }
  }, [form.hppPrice, form.price, isPriceManual])

  const abbreviate = (text: string): string => {
    const words = text.trim().toUpperCase().split(/\s+/)
    if (words.length === 1) return words[0].slice(0, 3)
    return words.slice(0, 3).map(w => w[0]).join('')
  }

  const generateSKU = () => {
    const productName = form.name?.trim() || ""
    const timestamp = Date.now().toString(36).toUpperCase().slice(-3)
    const selectedValueIds = Object.values(selectedAttributeValues).filter(Boolean)
    const selectedAttrAbbrs = attributeValues
      .filter((v: any) => selectedValueIds.includes(v.id))
      .map((v: any) => abbreviate(v.value))
      .join("-")
    let prefix: string
    if (productName) {
      prefix = productName.split(/\s+/).slice(0, 2).map(w => w.slice(0, 2).toUpperCase()).join('').slice(0, 4)
    } else {
      prefix = "VAR"
    }
    const attrPart = selectedAttrAbbrs ? `-${selectedAttrAbbrs}` : ""
    setVariantForm(prev => ({ ...prev, sku: `${prefix}${attrPart}-${timestamp}`, barcode: `${prefix}${attrPart}-${timestamp}` }))
  }

  const inputClass = "w-full rounded-lg border bg-background px-3 py-2 text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary"

  const handleSubmit = async () => {
    if (form.hasVariants) {
      const hasSelectedAttributes = selectedProductAttributes.size > 0
      const hasSelectedValues = Object.values(selectedAttributeValues).filter(Boolean).length > 0
      if (hasSelectedAttributes && !hasSelectedValues) {
        toast.error("Silakan pilih nilai untuk atribut varian yang dipilih")
        return
      }
    }

    setIsAdding(true)
    try {
      const newMenuItem = await menuApi.create({
        name: form.name,
        category: form.category,
        categoryId: form.categoryId,
        price: form.price,
        hppPrice: form.hppPrice,
        marginPercent: form.marginPercent,
        stockQuantity: form.hasVariants ? 0 : form.stockQuantity,
        minStock: form.minStock,
        trackStock: form.trackStock,
        available: form.available,
        imageUrl: form.imageUrl || undefined,
        hasVariants: form.hasVariants,
      }, cafeId)

      let createdVariantId: string | null = null
      if (form.hasVariants && newMenuItem?.id) {
        const selectedValueIds = Object.values(selectedAttributeValues).filter(Boolean)
        const variantCafeId = newMenuItem.cafe_id || cafeId
        let variantName: string
        if (selectedValueIds.length > 0) {
          variantName = attributeValues.filter((v: any) => selectedValueIds.includes(v.id)).map((v: any) => v.value).join(" - ")
        } else {
          variantName = "Default"
        }

        const variantResponse = await fetch(`/api/rest/product_variants?cafe_id=${variantCafeId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            menu_id: newMenuItem.id, cafe_id: variantCafeId,
            sku: variantForm.sku || null, barcode: variantForm.barcode || null,
            variant_name: variantName, price: variantForm.price || null,
            hpp_price: form.hppPrice, stock_quantity: 0, track_stock: form.trackStock,
            attribute_value_ids: selectedValueIds.length > 0 ? selectedValueIds : undefined
          })
        })
        const variantData = await variantResponse.json()
        createdVariantId = variantData.data?.id || variantData.id
        if (!createdVariantId) toast.error('Gagal membuat varian produk')
      }

      if (createdVariantId && variantForm.stockQuantity > 0 && form.trackStock) {
        try {
          await fetch('/api/stock/mutations', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ menuId: newMenuItem.id, variantId: createdVariantId, cafeId, type: 'in', quantity: variantForm.stockQuantity, hppPrice: form.hppPrice, referenceType: 'initial_stock', notes: 'Stok awal pembuatan varian' })
          })
        } catch { /* ignore */ }
      }

      mutateMenu()
      toast.success('Produk berhasil ditambahkan ke inventaris')
      setForm({ name: "", category: categories[0]?.name || "", categoryId: categories[0]?.id || "", hppPrice: 0, marginPercent: 30, price: 0, stockQuantity: 0, minStock: 5, trackStock: true, available: true, imageUrl: "", hasVariants: false })
      setVariantForm({ sku: "", barcode: "", stockQuantity: 0, price: 0 })
      setSelectedAttributeValues({})
      setSelectedProductAttributes(new Set())
      setShowVariantForm(false)
      setFormExpanded(false)
    } catch {
      toast.error('Gagal menambahkan produk. Silakan coba lagi.')
    } finally {
      setIsAdding(false)
    }
  }

  return (
    <motion.div
      className="w-full my-6 space-y-4"
      variants={formVariants}
      initial="hidden"
      animate="visible"
      transition={{ delay: 0.1, duration: 0.5, ease: "easeOut" }}
    >
      <div className="rounded-xl sm:rounded-2xl border bg-card shadow-sm overflow-hidden">

        {/* Collapsible header */}
        <button
          onClick={() => setFormExpanded(!formExpanded)}
          className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-muted/30 transition-colors"
        >
          <div className="flex items-center gap-3">
            <Plus className="h-4 w-4 text-primary" />
            <div className="text-left">
              <h3 className="text-sm font-semibold">Tambah Produk Baru</h3>
              <p className="text-xs text-muted-foreground">Tambahkan produk ke inventaris dengan harga dan stok</p>
            </div>
          </div>
          {formExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
        </button>

        <AnimatePresence>
          {formExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="border-t">
                <div className="p-5 space-y-6">

                  {/* Name + Category row */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium">Nama Produk <span className="text-destructive">*</span></label>
                      <input type="text" className={inputClass} placeholder="Contoh: Kaus Polos / Nasi Goreng" value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium">Kategori <span className="text-destructive">*</span></label>
                      {categories.length === 0 ? (
                        <button type="button" onClick={() => router.push('/categories')} className="inline-flex items-center gap-2 text-sm font-medium text-primary bg-primary/10 px-4 py-2 rounded-lg hover:bg-primary/15 transition-colors">
                          <Plus className="h-4 w-4" /> Tambah Kategori
                        </button>
                      ) : (
                        <div className="flex items-center gap-2">
                          <select className={inputClass} value={form.categoryId} onChange={(e) => {
                            const sel = categories.find(c => c.id === e.target.value)
                            setForm(f => ({ ...f, categoryId: e.target.value, category: sel?.name || '' }))
                          }}>
                            {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.icon} {cat.name}</option>)}
                          </select>
                          <button type="button" onClick={() => router.push('/categories')} className="shrink-0 text-xs font-medium text-primary hover:text-primary/80 bg-primary/5 px-3 py-2 rounded-lg transition-colors flex items-center gap-1">
                            <FolderOpen className="h-3.5 w-3.5" /> Kelola
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Image upload */}
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Foto Produk</label>
                    <div className="w-full sm:max-w-[280px]">
                      <ImageUpload value={form.imageUrl} onChange={(url) => setForm(f => ({ ...f, imageUrl: url }))} onUploadingChange={setIsUploadingImage} disabled={isAdding} />
                    </div>
                  </div>

                  {/* Separator */}
                  <div className="border-t" />

                  {/* HP Price + Margin */}
                  <div className="space-y-4">
                    <h4 className="text-sm font-semibold flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-emerald-600" /> Harga & Margin Profit
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-sm font-medium">Harga Modal (HPP)</label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">Rp</span>
                          <input type="text" inputMode="numeric" className={`${inputClass} pl-11`} value={form.hppPrice ? form.hppPrice.toLocaleString('id-ID') : ''} onChange={(e) => { const raw = e.target.value.replace(/\D/g, ''); setForm(f => ({ ...f, hppPrice: Number(raw) || 0 })) }} placeholder="0" />
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-sm font-medium">Target Keuntungan</label>
                        <div className="flex items-center gap-2">
                          <div className="relative w-28">
                            <input type="text" inputMode="numeric" className={inputClass} value={form.marginPercent || ''} onChange={(e) => { const raw = e.target.value.replace(/\D/g, ''); setForm(f => ({ ...f, marginPercent: Math.min(999, Number(raw) || 0) })) }} />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">%</span>
                          </div>
                          <div className="flex bg-muted rounded-lg p-0.5 border">
                            {[25, 50, 100].map(m => (
                              <button key={m} type="button" onClick={() => { setIsPriceManual(false); setForm(f => ({ ...f, marginPercent: m })) }}
                                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${form.marginPercent === m && !isPriceManual ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
                                {m}%
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Final Price */}
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium">Harga Jual Final</label>
                      <div className="flex items-center gap-3">
                        {isPriceManual ? (
                          <div className="relative flex-1 sm:max-w-[280px]">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">Rp</span>
                            <input type="text" inputMode="numeric" className={`${inputClass} pl-11`} value={form.price ? form.price.toLocaleString('id-ID') : ''} onChange={(e) => { const raw = e.target.value.replace(/\D/g, ''); setForm(f => ({ ...f, price: Number(raw) || 0 })) }} placeholder="0" />
                          </div>
                        ) : (
                          <div className="flex-1 sm:max-w-[280px] rounded-lg border border-transparent bg-muted/40 px-3 py-2 text-sm font-semibold text-foreground">
                            {form.price > 0 ? formatRupiah(form.price) : 'Rp 0'}
                          </div>
                        )}
                        <button type="button" onClick={() => setIsPriceManual(!isPriceManual)}
                          className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors border ${isPriceManual ? 'bg-primary/10 text-primary border-primary/20' : 'bg-background text-muted-foreground hover:text-foreground hover:bg-muted'}`}>
                          <Pencil className="h-3.5 w-3.5" />
                          {isPriceManual ? 'Auto' : 'Edit'}
                        </button>
                      </div>
                      {form.hppPrice > 0 && form.price > form.hppPrice && (
                        <p className="text-xs text-emerald-600">Estimasi untung kotor: +{formatRupiah(form.price - form.hppPrice)} per item</p>
                      )}
                    </div>
                  </div>

                  {/* Separator */}
                  <div className="border-t" />

                  {/* Configuration toggles */}
                  <div className="space-y-4">
                    <h4 className="text-sm font-semibold flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-blue-600" /> Visibilitas & Stok
                    </h4>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <label className="flex items-center gap-3 p-3 rounded-xl border bg-muted/20 cursor-pointer hover:bg-muted/40 transition-colors">
                        <input type="checkbox" checked={form.available} onChange={(e) => setForm(f => ({ ...f, available: e.target.checked }))} className="sr-only" />
                        <div className={cn("w-10 h-6 rounded-full transition-colors border-2 flex items-center", form.available ? "bg-primary border-primary justify-end" : "bg-muted-foreground/20 border-transparent justify-start")}>
                          <div className="w-4 h-4 rounded-full bg-white shadow-sm" />
                        </div>
                        <span className="text-sm">Tersedia di POS</span>
                      </label>
                      <label className="flex items-center gap-3 p-3 rounded-xl border bg-muted/20 cursor-pointer hover:bg-muted/40 transition-colors">
                        <input type="checkbox" checked={form.trackStock} onChange={(e) => setForm(f => ({ ...f, trackStock: e.target.checked }))} className="sr-only" />
                        <div className={cn("w-10 h-6 rounded-full transition-colors border-2 flex items-center", form.trackStock ? "bg-primary border-primary justify-end" : "bg-muted-foreground/20 border-transparent justify-start")}>
                          <div className="w-4 h-4 rounded-full bg-white shadow-sm" />
                        </div>
                        <span className="text-sm">Pantau Stok</span>
                      </label>
                    </div>

                    {form.trackStock && (
                      <div className="p-4 rounded-xl bg-muted/30 border">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <label className="text-sm font-medium">Stok Tersedia</label>
                            <input type="text" inputMode="numeric" disabled={form.hasVariants} className={`${inputClass} disabled:bg-muted/50 disabled:cursor-not-allowed`}
                              value={form.hasVariants ? 'Dikelola di varian' : (form.stockQuantity || '')} placeholder="0"
                              onChange={(e) => { if (!form.hasVariants) { const raw = e.target.value.replace(/\D/g, ''); setForm(f => ({ ...f, stockQuantity: Number(raw) || 0 })) } }} />
                            {form.hasVariants && <p className="text-xs text-muted-foreground">Stok dihitung dari varian yang ditambahkan</p>}
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-sm font-medium">Minimum Stok</label>
                            <input type="text" inputMode="numeric" className={inputClass} value={form.minStock || ''} placeholder="5"
                              onChange={(e) => { const raw = e.target.value.replace(/\D/g, ''); setForm(f => ({ ...f, minStock: Number(raw) || 5 })) }} />
                            <p className="text-xs text-muted-foreground">Peringatan saat stok menipis</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Separator */}
                  <div className="border-t" />

                  {/* Variants */}
                  <div className="space-y-4">
                    <h4 className="text-sm font-semibold flex items-center gap-2">
                      <Layers className="h-4 w-4 text-purple-600" /> Varian Produk
                    </h4>

                    <label className="flex items-center gap-3 p-3 rounded-xl border bg-muted/20 cursor-pointer hover:bg-muted/40 transition-colors">
                      <input type="checkbox" checked={form.hasVariants} onChange={(e) => {
                        setForm(f => ({ ...f, hasVariants: e.target.checked }))
                        if (e.target.checked) setShowVariantForm(true)
                        else setShowVariantForm(false)
                      }} className="sr-only" />
                      <div className={cn("w-10 h-6 rounded-full transition-colors border-2 flex items-center", form.hasVariants ? "bg-primary border-primary justify-end" : "bg-muted-foreground/20 border-transparent justify-start")}>
                        <div className="w-4 h-4 rounded-full bg-white shadow-sm" />
                      </div>
                      <span className="text-sm">Produk memiliki varian (ukuran, warna, model)</span>
                    </label>

                    {form.hasVariants && (
                      <div className="p-4 rounded-xl border bg-muted/30 space-y-4">
                        <button onClick={() => setShowVariantForm(!showVariantForm)} className="w-full flex items-center justify-between text-sm font-medium hover:text-primary transition-colors">
                          <span className="flex items-center gap-2"><Plus className="h-4 w-4" /> Tambah Varian Pertama (Opsional)</span>
                          {showVariantForm ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </button>

                        {showVariantForm && (
                          <div className="space-y-4">
                            {/* Attribute selection */}
                            {attributes.length > 0 && (
                              <div className="p-3 rounded-xl border space-y-2">
                                <label className="text-xs font-medium">Pilih Atribut Produk:</label>
                                <div className="flex flex-wrap gap-2">
                                  {attributes.map(attr => (
                                    <label key={attr.id} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border cursor-pointer hover:bg-muted transition-colors text-xs">
                                      <input type="checkbox" checked={selectedProductAttributes.has(attr.id)} onChange={(e) => {
                                        const s = new Set(selectedProductAttributes)
                                        e.target.checked ? s.add(attr.id) : (s.delete(attr.id), setSelectedAttributeValues(prev => { const n = { ...prev }; delete n[attr.id]; return n }))
                                        setSelectedProductAttributes(s)
                                      }} className="rounded" />
                                      {attr.name}
                                    </label>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Attribute values */}
                            {attributes.length > 0 && selectedProductAttributes.size > 0 ? (
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {attributes.filter(a => selectedProductAttributes.has(a.id)).map(attr => {
                                  const vals = attributeValues.filter((v: any) => v.attributeId === attr.id)
                                  return (
                                    <div key={attr.id} className="space-y-1.5">
                                      <label className="text-xs font-medium">{attr.name} <span className="text-destructive">*</span></label>
                                      {vals.length > 0 ? (
                                        <select className={inputClass} value={selectedAttributeValues[attr.id] || ""} onChange={(e) => setSelectedAttributeValues(prev => ({ ...prev, [attr.id]: e.target.value }))}>
                                          <option value="">Pilih {attr.name}</option>
                                          {vals.map((v: any) => <option key={v.id} value={v.id}>{v.value}</option>)}
                                        </select>
                                      ) : (
                                        <div className="p-3 rounded-lg bg-amber-500/10 text-amber-700 text-xs">Belum ada nilai untuk {attr.name}.</div>
                                      )}
                                    </div>
                                  )
                                })}
                              </div>
                            ) : attributes.length > 0 && selectedProductAttributes.size === 0 ? (
                              <div className="p-3 rounded-lg bg-amber-500/10 text-amber-700 text-xs flex items-start gap-2">
                                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                                <span>Pilih minimal satu atribut untuk varian.</span>
                              </div>
                            ) : (
                              <div className="p-3 rounded-lg bg-amber-500/10 text-amber-700 text-xs flex items-start gap-2">
                                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                                <span>Tambahkan atribut di "Atribut Varian" sebelum membuat varian.</span>
                              </div>
                            )}

                            {/* SKU + Barcode */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div className="space-y-1.5">
                                <label className="text-xs font-medium flex items-center gap-1"><Tag className="h-3 w-3" /> SKU</label>
                                <div className="flex gap-2">
                                  <input type="text" className={`${inputClass} flex-1`} placeholder="KP-RED-M" value={variantForm.sku} onChange={(e) => setVariantForm(f => ({ ...f, sku: e.target.value }))} />
                                  <button type="button" onClick={generateSKU} className="px-3 py-2 text-xs bg-muted rounded-lg hover:bg-muted/70 transition border">Auto</button>
                                </div>
                              </div>
                              <div className="space-y-1.5">
                                <label className="text-xs font-medium flex items-center gap-1"><Barcode className="h-3 w-3" /> Barcode</label>
                                <input type="text" className={inputClass} placeholder="Scan atau ketik" value={variantForm.barcode} onChange={(e) => setVariantForm(f => ({ ...f, barcode: e.target.value }))} />
                                <BarcodePreview value={variantForm.barcode} />
                              </div>
                            </div>

                            {/* Variant stock + price */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div className="space-y-1.5">
                                <label className="text-xs font-medium">Stok Varian</label>
                                <input type="text" inputMode="numeric" className={inputClass} placeholder="0" value={variantForm.stockQuantity || ''} onChange={(e) => { const raw = e.target.value.replace(/\D/g, ''); setVariantForm(f => ({ ...f, stockQuantity: Number(raw) || 0 })) }} />
                              </div>
                              <div className="space-y-1.5">
                                <label className="text-xs font-medium">Harga Khusus (opsional)</label>
                                <div className="relative">
                                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">Rp</span>
                                  <input type="text" inputMode="numeric" className={`${inputClass} pl-11`} placeholder={form.price.toLocaleString('id-ID')} value={variantForm.price ? variantForm.price.toLocaleString('id-ID') : ''} onChange={(e) => { const raw = e.target.value.replace(/\D/g, ''); setVariantForm(f => ({ ...f, price: Number(raw) || 0 })) }} />
                                </div>
                              </div>
                            </div>
                            <p className="text-xs text-muted-foreground">Anda bisa menambahkan varian lain setelah produk tersimpan.</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Submit button */}
                  <div className="flex justify-end">
                    <button
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary text-primary-foreground px-6 py-2.5 text-sm font-semibold transition-all hover:bg-primary/90 shadow-md shadow-primary/10 active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
                      disabled={!form.name || form.price <= 0 || !form.categoryId || isAdding || isUploadingImage}
                      onClick={handleSubmit}
                    >
                      {isAdding ? <><Loader2 className="h-4 w-4 animate-spin" /> Menyimpan...</>
                        : isUploadingImage ? <><Loader2 className="h-4 w-4 animate-spin" /> Menunggu Gambar...</>
                          : <><Plus className="h-4 w-4" /> Simpan ke Inventaris</>}
                    </button>
                  </div>

                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}
