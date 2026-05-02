"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Plus, Package, FolderOpen, Loader2, DollarSign, Pencil, TrendingUp, Layers, Tag, Barcode, ChevronDown, ChevronUp, AlertCircle } from "lucide-react"
import { ImageUpload } from "@/components/ui/image-upload"
import { BarcodePreview } from "@/components/ui/barcode-preview"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { formatRupiah } from "@/lib/utils"
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
  const [loadingCategories, setLoadingCategories] = useState(false)
  const [isPriceManual, setIsPriceManual] = useState(false)
  
  const [isAdding, setIsAdding] = useState(false)
  const [isUploadingImage, setIsUploadingImage] = useState(false)

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
  
  // Variant creation state
  const [showVariantForm, setShowVariantForm] = useState(false)
  const [variantForm, setVariantForm] = useState({
    sku: "",
    barcode: "",
    stockQuantity: 0,
    price: 0,
  })
  // Use initial attributes passed from parent (shared state)
  const attributes = initialAttributes
  const attributeValues = initialAttributeValues
  const [selectedAttributeValues, setSelectedAttributeValues] = useState<Record<string, string>>({})
  
  // State for selecting which attributes are relevant to this product
  const [selectedProductAttributes, setSelectedProductAttributes] = useState<Set<string>>(new Set())
  
  // Initialize selected attributes when attributes change
  useEffect(() => {
    if (attributes.length > 0 && selectedProductAttributes.size === 0) {
      // Default: select all attributes for new products
      setSelectedProductAttributes(new Set(attributes.map(a => a.id)))
    }
  }, [attributes, selectedProductAttributes.size])

  // Update local state when props change (fix for attribute sync issue)
  useEffect(() => {
    // Clear selected values for attributes that no longer exist
    setSelectedAttributeValues(prev => {
      const updated = { ...prev }
      const currentAttributeIds = new Set(attributes.map(a => a.id))
      
      // Remove values for deleted attributes
      Object.keys(updated).forEach(attrId => {
        if (!currentAttributeIds.has(attrId)) {
          delete updated[attrId]
        }
      })
      
      return updated
    })
    
    // Update selected product attributes
    setSelectedProductAttributes(prev => {
      const currentAttributeIds = new Set(attributes.map(a => a.id))
      // Remove selections for deleted attributes
      const updated = new Set(Array.from(prev).filter(id => currentAttributeIds.has(id)))
      return updated
    })
  }, [attributes])

  useEffect(() => {
    if (!categoriesLoading && categories.length > 0 && !form.category) {
      setForm(f => ({ ...f, category: categories[0].name, categoryId: categories[0].id }))
    }
  }, [categories, categoriesLoading, form.category])

  useEffect(() => {
    if (!isPriceManual && form.hppPrice > 0) {
      const calculatedPrice = Math.round(form.hppPrice * (1 + form.marginPercent / 100));
      setForm(f => ({ ...f, price: calculatedPrice }));
    } else if (!form.hppPrice) {
      setForm(f => ({ ...f, price: 0 }));
    }
  }, [form.hppPrice, form.marginPercent, isPriceManual]);

  useEffect(() => {
    if (isPriceManual && form.hppPrice > 0 && form.price > 0) {
      const calculatedMargin = ((form.price - form.hppPrice) / form.hppPrice) * 100;
      setForm(f => ({ ...f, marginPercent: Math.round(calculatedMargin * 10) / 10 }));
    }
  }, [form.hppPrice, form.price, isPriceManual]);

  // Helper function to abbreviate text for SKU
  const abbreviate = (text: string): string => {
    const words = text.trim().toUpperCase().split(/\s+/)
    if (words.length === 1) {
      // Single word: take first 3 characters
      return words[0].slice(0, 3)
    } else {
      // Multiple words: take first letter of each word (max 3 letters)
      return words.slice(0, 3).map(w => w[0]).join('')
    }
  }

  const generateSKU = () => {
    // Generate SKU based on product name + abbreviated attributes
    const productName = form.name?.trim() || ""
    const timestamp = Date.now().toString(36).toUpperCase().slice(-3)

    // Get selected attribute value names and abbreviate them
    const selectedValueIds = Object.values(selectedAttributeValues).filter(Boolean)
    const selectedAttrAbbrs = attributeValues
      .filter((v: any) => selectedValueIds.includes(v.id))
      .map((v: any) => abbreviate(v.value))
      .join("-")

    let prefix: string
    if (productName) {
      // Take first 2 characters of first 2 words
      prefix = productName
        .split(/\s+/)
        .slice(0, 2)
        .map(w => w.slice(0, 2).toUpperCase())
        .join('')
        .slice(0, 4)
    } else {
      prefix = "VAR"
    }

    // Combine: PRODUCT-ABBREVIATEDATTRS-TIMESTAMP
    const attrPart = selectedAttrAbbrs ? `-${selectedAttrAbbrs}` : ""
    const generatedCode = `${prefix}${attrPart}-${timestamp}`
    setVariantForm(prev => ({ ...prev, sku: generatedCode, barcode: generatedCode }))
  }

  return (
    <motion.div
      className="w-full my-4 sm:my-6 space-y-4 sm:space-y-5"
      variants={formVariants}
      initial="hidden"
      animate="visible"
      transition={{ delay: 0.1, duration: 0.5, ease: "easeOut" }}
    >
      <div className="space-y-4 sm:space-y-5">
        {/* Section: Basic Information */}
        <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
          <button 
            className="w-full border-b bg-muted/50 px-5 py-4 flex items-center justify-between text-left hover:bg-muted/60 transition-colors"
            onClick={() => {/* Future: collapsible */}}
          >
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Package className="h-4 w-4 text-primary" />
              Informasi Dasar
            </h3>
          </button>
          
          <div className="p-4 sm:p-5 space-y-4 sm:space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
              <label className="md:col-span-3 text-sm font-medium text-foreground pt-2.5">Nama Produk <span className="text-destructive">*</span></label>
              <div className="md:col-span-9">
                <input
                  type="text"
                  className="w-full rounded-lg border border-input bg-background px-4 py-2.5 text-sm shadow-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary placeholder:text-muted-foreground"
                  placeholder="Contoh: Kaus Polos / Nasi Goreng"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
              <label className="md:col-span-3 text-sm font-medium text-foreground pt-2.5">Kategori Produk <span className="text-destructive">*</span></label>
              <div className="md:col-span-9 flex flex-wrap items-center gap-2">
                {categories.length === 0 ? (
                  <button
                    type="button"
                    onClick={() => router.push('/categories')}
                    className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:text-primary/80 transition-colors bg-primary/10 px-4 py-2.5 rounded-lg"
                  >
                    <Plus className="h-4 w-4" /> Tambah Kategori
                  </button>
                ) : (
                  <>
                    <select
                      className="w-full sm:w-auto sm:max-w-[280px] rounded-lg border border-input bg-background px-4 py-2.5 text-sm shadow-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary"
                      value={form.categoryId}
                      onChange={(e) => {
                        const selectedCat = categories.find(c => c.id === e.target.value);
                        setForm((f) => ({
                          ...f,
                          categoryId: e.target.value,
                          category: selectedCat?.name || (selectedCat?.id && String(selectedCat.id)) || ''
                        }));
                      }}
                    >
                      {categories.map(cat => (
                        <option key={cat.id} value={cat.id}>
                          {cat.icon} {cat.name}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => router.push('/categories')}
                      className="text-xs font-medium text-primary hover:text-primary/80 transition-colors flex items-center gap-1.5 bg-primary/5 px-3 py-2.5 rounded-lg"
                    >
                      <FolderOpen className="h-3.5 w-3.5" /> Kelola
                    </button>
                  </>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
              <div className="md:col-span-3 pt-2.5">
                <label className="text-sm font-medium text-foreground block">Foto Produk</label>
                <p className="text-xs text-muted-foreground leading-relaxed mt-1 hidden md:block">Pilih foto yang jelas dengan pencahayaan baik. (Opsional)</p>
              </div>
              <div className="md:col-span-9">
                <p className="text-xs text-muted-foreground leading-relaxed mb-2 md:hidden">Pilih foto yang jelas dengan pencahayaan baik. (Opsional)</p>
                <div className="w-full sm:max-w-[280px]">
                  <ImageUpload
                    value={form.imageUrl}
                    onChange={(url) => setForm(f => ({ ...f, imageUrl: url }))}
                    onUploadingChange={setIsUploadingImage}
                    disabled={isAdding}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Section: Pricing */}
        <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
          <div className="border-b bg-muted/50 px-5 py-4">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-emerald-600 dark:text-emerald-500" />
              Harga & Margin Profit
            </h3>
          </div>

          <div className="p-4 sm:p-5 space-y-4 sm:space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
              <div className="md:col-span-3 pt-2.5">
                <label className="text-sm font-medium text-foreground block">Harga Modal (HPP)</label>
                <p className="text-xs text-muted-foreground leading-relaxed mt-1 hidden md:block">Total modal atau biaya pokok untuk 1 item.</p>
              </div>
              <div className="md:col-span-9">
                <p className="text-xs text-muted-foreground leading-relaxed mb-2 md:hidden">Total modal atau biaya pokok untuk 1 item.</p>
                <div className="relative w-full sm:max-w-[280px]">
                  <span className="absolute left-4 top-2.5 text-sm text-muted-foreground font-medium">Rp</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    className="w-full rounded-lg border border-input bg-background pl-11 pr-4 py-2.5 text-sm shadow-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary"
                    value={form.hppPrice ? form.hppPrice.toLocaleString('id-ID') : ''}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/\D/g, '');
                      setForm((f) => ({ ...f, hppPrice: Number(raw) || 0 }));
                    }}
                    placeholder="0"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
              <label className="md:col-span-3 text-sm font-medium text-foreground pt-2.5">Target Keuntungan</label>
              <div className="md:col-span-9 flex flex-col sm:flex-row sm:flex-wrap items-start sm:items-center gap-3">
                <div className="relative w-full sm:w-auto sm:max-w-[160px]">
                  <input
                    type="text"
                    inputMode="numeric"
                    className="w-full rounded-lg border border-input bg-background pl-4 pr-10 py-2.5 text-sm shadow-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary"
                    value={form.marginPercent || ''}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/\D/g, '');
                      setForm((f) => ({ ...f, marginPercent: Math.min(999, Number(raw) || 0) }));
                    }}
                  />
                  <div className="absolute right-4 top-2.5 text-sm text-muted-foreground font-medium">%</div>
                </div>
                
                <div className="flex bg-muted/50 rounded-lg p-1 border w-full sm:w-auto">
                  {[25, 50, 100].map((margin) => (
                    <button
                      key={margin}
                      type="button"
                      onClick={() => {
                        setIsPriceManual(false);
                        setForm((f) => ({ ...f, marginPercent: margin }));
                      }}
                      className={`flex-1 sm:flex-none px-4 py-2 text-xs font-medium rounded-md transition-all ${
                        form.marginPercent === margin && !isPriceManual
                          ? 'bg-background shadow-sm font-semibold text-foreground'
                          : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
                      }`}
                    >
                      {margin}%
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
              <label className="md:col-span-3 text-sm font-medium text-foreground pt-2.5">Harga Jual Final</label>
              <div className="md:col-span-9">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                  <div className="relative w-full sm:w-auto sm:max-w-[280px]">
                    {isPriceManual ? (
                      <>
                        <span className="absolute left-4 top-2.5 text-sm text-muted-foreground font-medium">Rp</span>
                        <input
                          type="text"
                          inputMode="numeric"
                          className="w-full rounded-lg border border-input bg-background pl-11 pr-4 py-2.5 text-sm shadow-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary"
                          value={form.price ? form.price.toLocaleString('id-ID') : ''}
                          placeholder="0"
                          onChange={(e) => {
                            const raw = e.target.value.replace(/\D/g, '');
                            setForm((f) => ({ ...f, price: Number(raw) || 0 }));
                          }}
                        />
                      </>
                    ) : (
                      <div className="w-full rounded-lg border border-transparent bg-muted/30 px-4 py-2.5 text-base font-semibold tracking-tight text-foreground shadow-sm">
                        {form.price > 0 ? formatRupiah(form.price) : 'Rp 0'}
                      </div>
                    )}
                  </div>
                  
                  <button
                    type="button"
                    onClick={() => setIsPriceManual(!isPriceManual)}
                    className={`inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-xs font-medium transition-colors shrink-0 shadow-sm border w-full sm:w-auto ${
                      isPriceManual 
                        ? 'bg-primary/10 text-primary border-primary/20 hover:bg-primary/20' 
                        : 'bg-background text-muted-foreground border-input hover:text-foreground hover:bg-muted/50'
                    }`}
                  >
                     <Pencil className="h-3.5 w-3.5" />
                    {isPriceManual ? 'Set ke Auto' : 'Edit Harga'}
                  </button>
                </div>
                
                {form.hppPrice > 0 && form.price > form.hppPrice && (
                  <p className="text-xs text-muted-foreground leading-relaxed mt-2">
                    Estimasi untung kotor: <span className="font-medium text-emerald-600 dark:text-emerald-500">+{formatRupiah(form.price - form.hppPrice)}</span> per item
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Section: Configuration & Stock */}
        <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
          <div className="border-b bg-muted/50 px-5 py-4">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-blue-600 dark:text-blue-500" />
              Sistem & Visibilitas
            </h3>
          </div>

          <div className="p-4 sm:p-5 space-y-4 sm:space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
              <label className="md:col-span-3 text-sm font-medium text-foreground pt-2.5">Tersedia di POS</label>
              <div className="md:col-span-9 flex items-center gap-3">
                <div className="relative shrink-0">
                  <input
                    type="checkbox"
                    checked={form.available}
                    onChange={(e) => setForm((f) => ({ ...f, available: e.target.checked }))}
                    className="sr-only peer"
                    id="available-toggle"
                  />
                  <label 
                    htmlFor="available-toggle"
                    className="block w-11 h-6 bg-muted border border-muted peer-checked:border-primary rounded-full peer-checked:bg-primary cursor-pointer transition-all duration-200 shadow-sm"
                  ></label>
                  <div className="absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform duration-200 pointer-events-none peer-checked:translate-x-5 shadow-sm"></div>
                </div>
                <span className="text-sm text-muted-foreground leading-relaxed">Aktifkan agar dapat dipilih oleh kasir saat transaksi</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
              <label className="md:col-span-3 text-sm font-medium text-foreground pt-2.5">Track Stok</label>
              <div className="md:col-span-9 flex items-center gap-3">
                <div className="relative shrink-0">
                  <input
                    type="checkbox"
                    checked={form.trackStock}
                    onChange={(e) => setForm((f) => ({ ...f, trackStock: e.target.checked }))}
                    className="sr-only peer"
                    id="track-toggle"
                  />
                  <label 
                    htmlFor="track-toggle"
                    className="block w-11 h-6 bg-muted border border-muted peer-checked:border-primary rounded-full peer-checked:bg-primary cursor-pointer transition-all duration-200 shadow-sm"
                  ></label>
                  <div className="absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform duration-200 pointer-events-none peer-checked:translate-x-5 shadow-sm"></div>
                </div>
                <span className="text-sm text-muted-foreground leading-relaxed">Otomatis kurangi stok saat barang terjual</span>
              </div>
            </div>

            {form.trackStock && (
              <div className="mt-4 p-4 rounded-lg bg-muted/30 border border-muted/50 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                  <label className="md:col-span-3 text-sm font-medium text-foreground pt-2.5">
                    Stok Tersedia
                    {form.hasVariants && (
                      <span className="block text-xs font-normal text-muted-foreground mt-1">
                        (Dikelola di varian)
                      </span>
                    )}
                  </label>
                  <div className="md:col-span-9">
                    <input
                      type="text"
                      inputMode="numeric"
                      disabled={form.hasVariants}
                      className="w-full sm:max-w-[200px] rounded-lg border border-input bg-background px-4 py-2.5 text-sm shadow-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary disabled:bg-muted/50 disabled:cursor-not-allowed disabled:text-muted-foreground"
                      value={form.hasVariants ? 'Dikelola di varian' : (form.stockQuantity || '')}
                      placeholder="0"
                      onChange={(e) => {
                        const raw = e.target.value.replace(/\D/g, '');
                        setForm((f) => ({ ...f, stockQuantity: Number(raw) || 0 }));
                      }}
                    />
                    {form.hasVariants && (
                      <p className="text-xs text-muted-foreground mt-1.5">
                        Stok akan dihitung dari stok varian yang ditambahkan di bawah
                      </p>
                    )}
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                  <div className="md:col-span-3 pt-2.5">
                    <label className="text-sm font-medium text-foreground block">Minimum Stok</label>
                  </div>
                  <div className="md:col-span-9">
                    <input
                      type="text"
                      inputMode="numeric"
                      className="w-full sm:max-w-[200px] rounded-lg border border-input bg-background px-4 py-2.5 text-sm shadow-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/20 focus-visible:border-amber-500"
                      value={form.minStock || ''}
                      placeholder="5"
                      onChange={(e) => {
                        const raw = e.target.value.replace(/\D/g, '');
                        setForm((f) => ({ ...f, minStock: Number(raw) || 5 }));
                      }}
                    />
                    <p className="text-xs text-muted-foreground leading-relaxed mt-1">Peringatan stok menipis akan muncul bila stok mencapai angka ini.</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Section: Variants */}
        <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
          <div className="border-b bg-muted/50 px-5 py-4">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Layers className="h-4 w-4 text-purple-600" />
              Varian Produk
            </h3>
          </div>

          <div className="p-4 sm:p-5 space-y-4 sm:space-y-5">
            {/* Toggle Has Variants */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
              <label className="md:col-span-3 text-sm font-medium text-foreground pt-2.5">Produk Memiliki Varian</label>
              <div className="md:col-span-9 flex items-center gap-3">
                <div className="relative shrink-0">
                  <input
                    type="checkbox"
                    checked={form.hasVariants}
                    onChange={(e) => {
                      setForm(f => ({ ...f, hasVariants: e.target.checked }))
                      if (e.target.checked) {
                        setShowVariantForm(true)
                      } else {
                        setShowVariantForm(false)
                      }
                    }}
                    className="sr-only peer"
                    id="variants-toggle"
                  />
                  <label 
                    htmlFor="variants-toggle"
                    className="block w-11 h-6 bg-muted border border-muted peer-checked:border-primary rounded-full peer-checked:bg-primary cursor-pointer transition-all duration-200 shadow-sm"
                  ></label>
                  <div className="absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform duration-200 pointer-events-none peer-checked:translate-x-5 shadow-sm"></div>
                </div>
                <span className="text-sm text-muted-foreground leading-relaxed">Aktifkan jika produk memiliki varian (ukuran, warna, model)</span>
              </div>
            </div>

            {/* Variant Creation Form */}
            {form.hasVariants && (
              <div className="mt-4 p-4 rounded-lg bg-muted/30 border border-border">
                <button
                  onClick={() => setShowVariantForm(!showVariantForm)}
                  className="w-full flex items-center justify-between text-sm font-medium text-foreground hover:text-primary transition-colors py-2"
                >
                  <span className="flex items-center gap-2">
                    <Plus className="h-4 w-4" />
                    Tambah Varian Pertama (Opsional)
                  </span>
                  {showVariantForm ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>

                {showVariantForm && (
                  <div className="mt-4 space-y-4">
                    {/* Product Attributes Selection - Checkboxes */}
                    {attributes.length > 0 && (
                      <div className="p-3 rounded-lg border border-border">
                        <label className="text-xs font-medium text-foreground mb-2 block">
                          Pilih Atribut untuk Produk Ini:
                        </label>
                        <div className="flex flex-wrap gap-2">
                          {attributes.map((attr) => (
                            <label
                              key={attr.id}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-input cursor-pointer hover:bg-muted transition-colors text-sm"
                            >
                              <input
                                type="checkbox"
                                checked={selectedProductAttributes.has(attr.id)}
                                onChange={(e) => {
                                  const newSet = new Set(selectedProductAttributes)
                                  if (e.target.checked) {
                                    newSet.add(attr.id)
                                  } else {
                                    newSet.delete(attr.id)
                                    // Clear selected value for this attribute
                                    setSelectedAttributeValues(prev => {
                                      const newValues = { ...prev }
                                      delete newValues[attr.id]
                                      return newValues
                                    })
                                  }
                                  setSelectedProductAttributes(newSet)
                                }}
                                className="rounded border-input"
                              />
                              <span className="text-xs">{attr.name}</span>
                            </label>
                          ))}
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">
                          Centang atribut yang relevan untuk produk ini (contoh: Warna, Ukuran)
                        </p>
                      </div>
                    )}

                    {/* Attribute Value Selection - Only for selected attributes */}
                    {attributes.length > 0 && selectedProductAttributes.size > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {attributes
                          .filter(attr => selectedProductAttributes.has(attr.id))
                          .map((attr) => {
                            const values = attributeValues.filter((v: any) => v.attributeId === attr.id)
                            return (
                              <div key={attr.id}>
                                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                                  {attr.name} <span className="text-destructive">*</span>
                                </label>
                                {values.length > 0 ? (
                                  <select
                                    className="w-full rounded-lg border border-input bg-background px-4 py-2.5 text-sm shadow-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary"
                                    value={selectedAttributeValues[attr.id] || ""}
                                    onChange={(e) => setSelectedAttributeValues(prev => ({
                                      ...prev,
                                      [attr.id]: e.target.value
                                    }))}
                                  >
                                    <option value="">Pilih {attr.name}</option>
                                    {values.map((val: any) => (
                                      <option key={val.id} value={val.id}>
                                        {val.value}
                                      </option>
                                    ))}
                                  </select>
                                ) : (
                                  <div className="p-3 rounded-lg bg-amber-500/10 text-amber-700 dark:text-amber-300 text-sm">
                                    <p className="font-medium">Belum ada nilai untuk {attr.name}</p>
                                    <p className="text-xs mt-1">
                                      Tambahkan nilai atribut di section "Atribut Varian" di atas
                                    </p>
                                  </div>
                                )}
                              </div>
                            )
                          })}
                      </div>
                    ) : attributes.length > 0 && selectedProductAttributes.size === 0 ? (
                      <div className="p-3 rounded-lg bg-amber-500/10 text-amber-700 dark:text-amber-300 text-sm flex items-start gap-2">
                        <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-medium">Pilih minimal satu atribut</p>
                          <p className="text-xs mt-1 leading-relaxed">
                            Centang atribut yang ingin digunakan untuk varian produk ini
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="p-3 rounded-lg bg-amber-500/10 text-amber-700 dark:text-amber-300 text-sm flex items-start gap-2">
                        <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-medium">Belum ada atribut varian</p>
                          <p className="text-xs mt-1 leading-relaxed">
                            Expand "Atribut Varian" section di bawah untuk menambahkan atribut (Warna, Ukuran, dll.)
                          </p>
                        </div>
                      </div>
                    )}

                    {/* SKU & Barcode */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-medium text-muted-foreground mb-1.5 block flex items-center gap-1.5">
                          <Tag className="h-3 w-3" /> SKU
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            className="flex-1 rounded-lg border border-input bg-background px-4 py-2.5 text-sm shadow-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary"
                            placeholder="Contoh: KP-RED-M"
                            value={variantForm.sku}
                            onChange={(e) => setVariantForm(f => ({ ...f, sku: e.target.value }))}
                          />
                          <button
                            type="button"
                            onClick={generateSKU}
                            className="px-3 py-1 text-xs bg-muted rounded-lg hover:bg-muted/70 transition border border-input"
                          >
                            Auto
                          </button>
                        </div>
                      </div>
                      <div>
                        <label className="text-xs font-medium text-muted-foreground mb-1.5 block flex items-center gap-1.5">
                          <Barcode className="h-3 w-3" /> Barcode
                        </label>
                        <input
                          type="text"
                          className="w-full rounded-lg border border-input bg-background px-4 py-2.5 text-sm shadow-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary"
                          placeholder="Scan atau ketik"
                          value={variantForm.barcode}
                          onChange={(e) => setVariantForm(f => ({ ...f, barcode: e.target.value }))}
                        />
                        <BarcodePreview value={variantForm.barcode} />
                      </div>
                    </div>

                    {/* Stock & Price Override */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                          Stok Varian
                        </label>
                        <input
                          type="text"
                          inputMode="numeric"
                          className="w-full rounded-lg border border-input bg-background px-4 py-2.5 text-sm shadow-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary"
                          placeholder="0"
                          value={variantForm.stockQuantity || ''}
                          onChange={(e) => {
                            const raw = e.target.value.replace(/\D/g, '');
                            setVariantForm(f => ({ ...f, stockQuantity: Number(raw) || 0 }));
                          }}
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                          Harga Khusus (kosong = pakai harga dasar)
                        </label>
                        <div className="relative">
                          <span className="absolute left-4 top-2.5 text-xs text-muted-foreground font-medium">Rp</span>
                          <input
                            type="text"
                            inputMode="numeric"
                            className="w-full rounded-lg border border-input bg-background pl-10 pr-4 py-2.5 text-sm shadow-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary"
                            placeholder={form.price.toLocaleString('id-ID')}
                            value={variantForm.price ? variantForm.price.toLocaleString('id-ID') : ''}
                            onChange={(e) => {
                              const raw = e.target.value.replace(/\D/g, '')
                              setVariantForm(f => ({ ...f, price: Number(raw) || 0 }))
                            }}
                          />
                        </div>
                      </div>
                    </div>

                    <p className="text-xs text-muted-foreground leading-relaxed">
                      * Anda bisa menambahkan varian lain setelah produk tersimpan
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="pt-6 pb-2 sm:flex sm:justify-end sticky bottom-0 bg-background/95 backdrop-blur-sm border-t pt-4 pb-4 -mx-4 px-4 sm:mx-0 sm:px-0 sm:border-0 sm:bg-transparent sm:backdrop-blur-none sm:sticky-0">
        <button
          className="w-full sm:w-auto inline-flex items-center justify-center rounded-lg bg-primary text-primary-foreground px-8 py-3 text-sm font-semibold shadow-md transition-all hover:bg-primary/90 hover:shadow-lg hover:-translate-y-0.5 active:scale-95 disabled:opacity-50 disabled:pointer-events-none disabled:transform-none disabled:shadow-none disabled:active:scale-100 disabled:hover:translate-y-0 gap-2"
          disabled={!form.name || form.price <= 0 || !form.categoryId || isAdding || isUploadingImage}
          onClick={async () => {
            // Validate variant selection before submitting
            if (form.hasVariants) {
              const hasSelectedAttributes = selectedProductAttributes.size > 0;
              const hasSelectedValues = Object.values(selectedAttributeValues).filter(Boolean).length > 0;
              
              if (hasSelectedAttributes && !hasSelectedValues) {
                toast.error("Silakan pilih nilai untuk atribut varian yang dipilih");
                return;
              }
            }
            
            setIsAdding(true);
            try {
              // First create the menu item
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

              console.log('Created menu item:', newMenuItem);
              console.log('Menu item ID:', newMenuItem?.id);
              console.log('Menu item cafe_id:', newMenuItem?.cafe_id);
              console.log('Current cafeId:', cafeId);
              console.log('User data:', userData);

              // If has variants, create the first variant
              let createdVariantId: string | null = null;
              if (form.hasVariants && newMenuItem?.id) {
                const selectedValueIds = Object.values(selectedAttributeValues).filter(Boolean)
                
                // Use cafe_id from created menu item or fallback to current cafeId
                const variantCafeId = newMenuItem.cafe_id || cafeId;
                
                // Build variant name from selected attributes or use default
                let variantName: string
                if (selectedValueIds.length > 0) {
                  variantName = attributeValues
                    .filter((v: any) => selectedValueIds.includes(v.id))
                    .map((v: any) => v.value)
                    .join(" - ")
                } else {
                  // No attributes selected - create default variant
                  variantName = "Default"
                }

                console.log('Creating variant with cafe_id:', variantCafeId, 'menu_id:', newMenuItem.id);
                
                const variantResponse = await fetch(`/api/rest/product_variants?cafe_id=${variantCafeId}`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    menu_id: newMenuItem.id,
                    cafe_id: variantCafeId,
                    sku: variantForm.sku || null,
                    barcode: variantForm.barcode || null,
                    variant_name: variantName,
                    price: variantForm.price || null,
                    hpp_price: form.hppPrice,
                    stock_quantity: 0, // Let the trigger handle stock from mutation
                    track_stock: form.trackStock,
                    attribute_value_ids: selectedValueIds.length > 0 ? selectedValueIds : undefined
                  })
                });
                
                const variantData = await variantResponse.json();
                createdVariantId = variantData.data?.id || variantData.id;
                
                if (!createdVariantId) {
                  console.error('Failed to create variant:', variantData);
                  toast.error('Gagal membuat varian produk');
                }
              }

              // Record initial stock mutation for variant if stock > 0
              if (createdVariantId && variantForm.stockQuantity > 0 && form.trackStock) {
                try {
                  await fetch('/api/stock/mutations', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      menuId: newMenuItem.id,
                      variantId: createdVariantId,
                      cafeId: cafeId,
                      type: 'in',
                      quantity: variantForm.stockQuantity,
                      hppPrice: form.hppPrice,
                      referenceType: 'initial_stock',
                      notes: `Stok awal pembuatan varian dari form tambah produk`,
                    }),
                  });
                } catch (mutationErr) {
                  console.error('Failed to record variant stock mutation:', mutationErr);
                }
              }

              // Refresh menu data
              mutateMenu();

              toast.success('Produk berhasil ditambahkan ke inventaris');
              setForm({ name: "", category: categories[0]?.name || "", categoryId: categories[0]?.id || "", hppPrice: 0, marginPercent: 30, price: 0, stockQuantity: 0, minStock: 5, trackStock: true, available: true, imageUrl: "", hasVariants: false })
              setVariantForm({ sku: "", barcode: "", stockQuantity: 0, price: 0 })
              setSelectedAttributeValues({})
              setSelectedProductAttributes(new Set())
              setShowVariantForm(false)
            } catch (error) {
              toast.error('Gagal menambahkan produk. Silakan coba lagi.');
            } finally {
              setIsAdding(false);
            }
          }}
        >
          {isAdding ? (
            <><Loader2 className="h-5 w-5 animate-spin" /> Menyimpan...</>
          ) : isUploadingImage ? (
            <><Loader2 className="h-5 w-5 animate-spin" /> Menungggu Gambar...</>
          ) : (
            <><Plus className="h-5 w-5" /> Simpan ke Inventaris</>
          )}
        </button>
      </div>
    </motion.div>
  )
}
