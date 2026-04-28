"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Plus, Package, FolderOpen, Loader2, DollarSign, Pencil, TrendingUp, Layers, Tag, Barcode, ChevronDown, ChevronUp, AlertCircle } from "lucide-react"
import { ImageUpload } from "@/components/ui/image-upload"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { formatRupiah } from "@/lib/utils"
import { useAuth } from "@/lib/auth-context"
import { useMenu, useCategories } from "@/hooks/use-cafe-data"
import { menuApi } from "@/lib/api"

export function AddMenuForm({ formVariants }: { formVariants: any }) {
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
  const [attributes, setAttributes] = useState<any[]>([])
  const [attributeValues, setAttributeValues] = useState<any[]>([])
  const [selectedAttributeValues, setSelectedAttributeValues] = useState<Record<string, string>>({})

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

  // Load attributes for variant creation
  const loadAttributes = async () => {
    try {
      const response = await fetch(`/api/rest/variant_attributes?cafe_id=${cafeId}`)
      const data = await response.json()
      
      // Handle different response formats
      const attributesList = Array.isArray(data) ? data : (data.data || data.results || [])
      setAttributes(attributesList)
      
      // Load values for each attribute
      const allValues: any[] = []
      for (const attr of attributesList) {
        const valuesRes = await fetch(`/api/rest/variant_attribute_values?attribute_id=${attr.id}`)
        const valuesData = await valuesRes.json()
        const valuesList = Array.isArray(valuesData) ? valuesData : (valuesData.data || valuesData.results || [])
        allValues.push(...valuesList)
      }
      setAttributeValues(allValues)
    } catch (error) {
      console.error('Failed to load attributes:', error)
    }
  }

  return (
    <motion.div
      className="w-full my-6 space-y-6"
      variants={formVariants}
      initial="hidden"
      animate="visible"
      transition={{ delay: 0.1, duration: 0.5, ease: "easeOut" }}
    >
      <div className="space-y-6">
        {/* Section: Basic Information */}
        <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
          <div className="border-b bg-muted/40 px-4 sm:px-6 py-4">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Package className="h-4 w-4 text-primary" />
              Informasi Dasar
            </h3>
          </div>
          
          <div className="p-4 sm:p-6 space-y-6 sm:space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-y-2 gap-x-6">
              <label className="md:col-span-3 text-sm font-medium text-foreground pt-0 md:pt-2">Nama Produk <span className="text-destructive">*</span></label>
              <div className="md:col-span-9">
                <input
                  type="text"
                  className="w-full max-w-lg rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary placeholder:text-muted-foreground"
                  placeholder="Contoh: Kaus Polos / Nasi Goreng"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-y-2 gap-x-6">
              <label className="md:col-span-3 text-sm font-medium text-foreground pt-0 md:pt-2">Kategori Produk <span className="text-destructive">*</span></label>
              <div className="md:col-span-9 flex flex-wrap sm:flex-nowrap items-center gap-3">
                {categories.length === 0 ? (
                  <button
                    type="button"
                    onClick={() => router.push('/categories')}
                    className="inline-flex items-center gap-2 text-sm text-primary hover:text-primary/80 transition-colors bg-primary/10 px-4 py-2 rounded-md"
                  >
                    <Plus className="h-4 w-4" /> Tambah Kategori
                  </button>
                ) : (
                  <>
                    <select
                      className="w-full sm:max-w-[240px] rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
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
                      className="text-xs font-semibold text-primary hover:text-primary/80 transition-colors flex items-center gap-1 bg-primary/5 px-2.5 py-1.5 rounded"
                    >
                      <FolderOpen className="h-3 w-3" /> Kelola
                    </button>
                  </>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-y-2 gap-x-6">
              <div className="md:col-span-3 pt-0 md:pt-2">
                <label className="text-sm font-medium text-foreground">Foto Produk</label>
                <p className="text-xs text-muted-foreground mt-1 pr-4">Pilih foto yang jelas dengan pencahayaan baik. (Opsional)</p>
              </div>
              <div className="md:col-span-9">
                <div className="max-w-[240px]">
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
          <div className="border-b bg-muted/40 px-4 sm:px-6 py-4">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-emerald-600 dark:text-emerald-500" />
              Harga & Margin Profit
            </h3>
          </div>

          <div className="p-4 sm:p-6 space-y-6 sm:space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-y-2 gap-x-6">
              <div className="md:col-span-3 pt-0 md:pt-2">
                <label className="text-sm font-medium text-foreground">Harga Modal (HPP)</label>
                <p className="text-xs text-muted-foreground mt-1 pr-4">Total modal atau biaya pokok untuk 1 item.</p>
              </div>
              <div className="md:col-span-9 relative w-full sm:max-w-[280px]">
                <span className="absolute left-3 top-2.5 text-sm text-muted-foreground">Rp</span>
                <input
                  type="text"
                  inputMode="numeric"
                  className="w-full rounded-md border border-input bg-background pl-9 pr-3 py-2 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
                  value={form.hppPrice ? form.hppPrice.toLocaleString('id-ID') : ''}
                  onChange={(e) => {
                    const raw = e.target.value.replace(/\D/g, '');
                    setForm((f) => ({ ...f, hppPrice: Number(raw) || 0 }));
                  }}
                  placeholder="0"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-y-2 gap-x-6">
              <label className="md:col-span-3 text-sm font-medium text-foreground pt-0 md:pt-2">Target Keuntungan</label>
              <div className="md:col-span-9 flex flex-col sm:flex-row sm:flex-wrap items-start sm:items-center gap-3">
                <div className="relative w-full sm:max-w-[140px]">
                  <input
                    type="number"
                    className="w-full rounded-md border border-input bg-background pl-3 pr-8 py-2 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
                    value={form.marginPercent || ''}
                    min={0}
                    max={999}
                    onChange={(e) => setForm((f) => ({ ...f, marginPercent: Number(e.target.value) || 0 }))}
                  />
                  <div className="absolute right-3 top-2.5 text-sm text-muted-foreground">%</div>
                </div>
                
                <div className="flex bg-muted/50 rounded-md p-1 border">
                  {[25, 50, 100].map((margin) => (
                    <button
                      key={margin}
                      type="button"
                      onClick={() => {
                        setIsPriceManual(false);
                        setForm((f) => ({ ...f, marginPercent: margin }));
                      }}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-sm transition-all ${
                        form.marginPercent === margin && !isPriceManual
                          ? 'bg-background shadow font-bold text-foreground'
                          : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
                      }`}
                    >
                      {margin}%
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-y-2 gap-x-6">
              <label className="md:col-span-3 text-sm font-medium text-foreground pt-0 md:pt-2">Harga Jual Final</label>
              <div className="md:col-span-9">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-3">
                  <div className="relative w-full sm:max-w-[280px]">
                    {isPriceManual ? (
                      <>
                        <span className="absolute left-3 top-2.5 text-sm text-muted-foreground">Rp</span>
                        <input
                          type="text"
                          inputMode="numeric"
                          className="w-full rounded-md border border-input bg-background pl-9 pr-3 py-2 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
                          value={form.price ? form.price.toLocaleString('id-ID') : ''}
                          placeholder="0"
                          onChange={(e) => {
                            const raw = e.target.value.replace(/\D/g, '');
                            setForm((f) => ({ ...f, price: Number(raw) || 0 }));
                          }}
                        />
                      </>
                    ) : (
                      <div className="w-full rounded-md border border-transparent bg-muted/30 px-3 py-2 text-base font-semibold tracking-tight text-foreground shadow-sm">
                        {form.price > 0 ? formatRupiah(form.price) : 'Rp 0'}
                      </div>
                    )}
                  </div>
                  
                  <button
                    type="button"
                    onClick={() => setIsPriceManual(!isPriceManual)}
                    className={`inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-xs font-semibold transition-colors shrink-0 shadow-sm border ${
                      isPriceManual 
                        ? 'bg-primary/10 text-primary border-primary/20 hover:bg-primary/20' 
                        : 'bg-background text-muted-foreground border-input hover:text-foreground hover:bg-muted/50'
                    }`}
                  >
                     <Pencil className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">{isPriceManual ? 'Set ke Auto' : 'Edit Harga'}</span>
                  </button>
                </div>
                
                {form.hppPrice > 0 && form.price > form.hppPrice && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    Estimasi untung kotor: <span className="font-medium text-emerald-600 dark:text-emerald-500">+{formatRupiah(form.price - form.hppPrice)}</span> per item
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Section: Configuration & Stock */}
        <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
          <div className="border-b bg-muted/40 px-4 sm:px-6 py-4">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-blue-600 dark:text-blue-500" />
              Sistem & Visibilitas
            </h3>
          </div>

          <div className="p-4 sm:p-6 space-y-6 sm:space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-y-2 gap-x-6">
              <label className="md:col-span-3 text-sm font-medium text-foreground pt-1">Tersedia di POS</label>
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
                    className="block w-11 h-6 bg-muted border border-transparent peer-checked:border-primary rounded-full peer-checked:bg-primary cursor-pointer transition-colors shadow-inner"
                  ></label>
                  <div className="absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform pointer-events-none peer-checked:translate-x-5 shadow-sm"></div>
                </div>
                <span className="text-sm text-muted-foreground">Aktifkan agar dapat dipilih oleh kasir saat transaksi</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-y-2 gap-x-6">
              <label className="md:col-span-3 text-sm font-medium text-foreground pt-1">Track Stok</label>
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
                    className="block w-11 h-6 bg-muted border border-transparent peer-checked:border-primary rounded-full peer-checked:bg-primary cursor-pointer transition-colors shadow-inner"
                  ></label>
                  <div className="absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform pointer-events-none peer-checked:translate-x-5 shadow-sm"></div>
                </div>
                <span className="text-sm text-muted-foreground">Otomatis kurangi stok saat barang terjual</span>
              </div>
            </div>

            {form.trackStock && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-12 gap-y-2 gap-x-6 mt-4">
                  <label className="md:col-span-3 text-sm font-medium text-foreground pt-0 md:pt-2">Stok Tersedia</label>
                  <div className="md:col-span-9">
                    <input
                      type="number"
                      className="w-full sm:max-w-[240px] rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
                      value={form.stockQuantity || ''}
                      min={0}
                      placeholder="0"
                      onChange={(e) => setForm((f) => ({ ...f, stockQuantity: Number(e.target.value) || 0 }))}
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-12 gap-y-2 gap-x-6">
                  <div className="md:col-span-3 pt-0 md:pt-2">
                    <label className="text-sm font-medium text-foreground">Minimum Stok</label>
                  </div>
                  <div className="md:col-span-9">
                    <input
                      type="number"
                      className="w-full sm:max-w-[240px] rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-amber-500"
                      value={form.minStock || ''}
                      min={0}
                      placeholder="5"
                      onChange={(e) => setForm((f) => ({ ...f, minStock: Number(e.target.value) || 5 }))}
                    />
                    <p className="text-xs text-muted-foreground mt-1">Peringatan stok menipis akan muncul bila stok mencapai angka ini.</p>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Section: Variants */}
        <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
          <div className="border-b bg-muted/40 px-4 sm:px-6 py-4">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Layers className="h-4 w-4 text-purple-600" />
              Varian Produk
            </h3>
          </div>

          <div className="p-4 sm:p-6 space-y-6">
            {/* Toggle Has Variants */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-y-2 gap-x-6">
              <label className="md:col-span-3 text-sm font-medium text-foreground pt-1">Produk Memiliki Varian</label>
              <div className="md:col-span-9 flex items-center gap-3">
                <div className="relative shrink-0">
                  <input
                    type="checkbox"
                    checked={form.hasVariants}
                    onChange={(e) => {
                      setForm(f => ({ ...f, hasVariants: e.target.checked }))
                      if (e.target.checked) {
                        loadAttributes()
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
                    className="block w-11 h-6 bg-muted border border-transparent peer-checked:border-primary rounded-full peer-checked:bg-primary cursor-pointer transition-colors shadow-inner"
                  ></label>
                  <div className="absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform pointer-events-none peer-checked:translate-x-5 shadow-sm"></div>
                </div>
                <span className="text-sm text-muted-foreground">
                  Aktifkan jika produk memiliki varian (ukuran, warna, model)
                </span>
              </div>
            </div>

            {/* Variant Creation Form */}
            {form.hasVariants && (
              <div className="mt-4 p-4 rounded-lg bg-purple-50/50 dark:bg-purple-900/10 border border-purple-200 dark:border-purple-800/30">
                <button
                  onClick={() => setShowVariantForm(!showVariantForm)}
                  className="w-full flex items-center justify-between text-sm font-medium text-purple-700 dark:text-purple-300"
                >
                  <span className="flex items-center gap-2">
                    <Plus className="h-4 w-4" />
                    Tambah Varian Pertama (Opsional)
                  </span>
                  {showVariantForm ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>

                {showVariantForm && (
                  <div className="mt-4 space-y-4">
                    {/* Attribute Selection */}
                    {attributes.length > 0 ? (
                      <div className="grid grid-cols-2 gap-3">
                        {attributes.map((attr) => {
                          const values = attributeValues.filter((v: any) => v.attribute_id === attr.id)
                          return (
                            <div key={attr.id}>
                              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                                {attr.name}
                              </label>
                              <select
                                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
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
                            </div>
                          )
                        })}
                      </div>
                    ) : (
                      <div className="p-3 rounded-md bg-amber-500/10 text-amber-700 text-sm flex items-start gap-2">
                        <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                        <div>
                          <p>Belum ada atribut varian</p>
                          <p className="text-xs mt-1">
                            Expand "Atribut Varian" section di atas untuk menambahkan atribut (Warna, Ukuran, dll.)
                          </p>
                        </div>
                      </div>
                    )}

                    {/* SKU & Barcode */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-medium text-muted-foreground mb-1.5 block flex items-center gap-1">
                          <Tag className="h-3 w-3" /> SKU
                        </label>
                        <input
                          type="text"
                          className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                          placeholder="Contoh: KP-RED-M"
                          value={variantForm.sku}
                          onChange={(e) => setVariantForm(f => ({ ...f, sku: e.target.value }))}
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-muted-foreground mb-1.5 block flex items-center gap-1">
                          <Barcode className="h-3 w-3" /> Barcode
                        </label>
                        <input
                          type="text"
                          className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                          placeholder="Scan atau ketik"
                          value={variantForm.barcode}
                          onChange={(e) => setVariantForm(f => ({ ...f, barcode: e.target.value }))}
                        />
                      </div>
                    </div>

                    {/* Stock & Price Override */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                          Stok Varian
                        </label>
                        <input
                          type="number"
                          className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                          placeholder="0"
                          value={variantForm.stockQuantity || ''}
                          onChange={(e) => setVariantForm(f => ({ ...f, stockQuantity: Number(e.target.value) || 0 }))}
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                          Harga Khusus (kosong = pakai harga dasar)
                        </label>
                        <div className="relative">
                          <span className="absolute left-3 top-2 text-xs text-muted-foreground">Rp</span>
                          <input
                            type="text"
                            inputMode="numeric"
                            className="w-full rounded-md border bg-background pl-8 pr-3 py-2 text-sm"
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

                    <p className="text-xs text-muted-foreground">
                      * Anda bisa menambahkan varian lain setelah produk tersimpan
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="pt-6 pb-2 sm:flex sm:justify-end">
        <button
          className="w-full sm:w-auto inline-flex items-center justify-center rounded-lg bg-primary text-primary-foreground px-8 py-3 text-sm font-semibold shadow-md transition-all hover:bg-primary/90 hover:shadow-lg hover:-translate-y-0.5 disabled:opacity-50 disabled:pointer-events-none disabled:transform-none gap-2"
          disabled={!form.name || form.price <= 0 || !form.categoryId || isAdding || isUploadingImage}
          onClick={async () => {
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

              // If has variants and variant form is filled, create the first variant
              let createdVariantId: string | null = null;
              if (form.hasVariants && newMenuItem?.id && Object.keys(selectedAttributeValues).length > 0) {
                const selectedValueIds = Object.values(selectedAttributeValues).filter(Boolean)
                const variantName = attributeValues
                  .filter((v: any) => selectedValueIds.includes(v.id))
                  .map((v: any) => v.value)
                  .join(" - ")

                if (variantName) {
                  const variantResponse = await fetch('/api/rest/product_variants', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      menu_id: newMenuItem.id,
                      sku: variantForm.sku || null,
                      barcode: variantForm.barcode || null,
                      variant_name: variantName,
                      price: variantForm.price || null,
                      hpp_price: form.hppPrice,
                      stock_quantity: variantForm.stockQuantity,
                      track_stock: form.trackStock,
                      attribute_value_ids: selectedValueIds
                    })
                  });
                  
                  const variantData = await variantResponse.json();
                  createdVariantId = variantData.data?.id || variantData.id;
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
