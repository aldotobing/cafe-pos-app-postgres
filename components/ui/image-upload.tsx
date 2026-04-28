"use client"

import { useState, useRef, useEffect } from "react"
import { ImagePlus, X, Loader2, Upload, Check } from "lucide-react"
import Image from "next/image"
import { toast } from "sonner"

interface ImageUploadProps {
  value?: string
  onChange: (url: string) => void
  onUploadingChange?: (isUploading: boolean) => void
  label?: string
  folder?: "menu" | "cafe"
  disabled?: boolean
}

const MAX_DIMENSION = 800
const JPEG_QUALITY = 0.7
const PNG_QUALITY = 0.6

// Compress image client-side using Canvas API
async function compressImage(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new window.Image()
    img.onload = () => {
      const canvas = document.createElement("canvas")
      let { width, height } = img

      // Resize if exceeds max dimension
      if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
        if (width > height) {
          height = Math.round((height * MAX_DIMENSION) / width)
          width = MAX_DIMENSION
        } else {
          width = Math.round((width * MAX_DIMENSION) / height)
          height = MAX_DIMENSION
        }
      }

      canvas.width = width
      canvas.height = height

      const ctx = canvas.getContext("2d")
      if (!ctx) {
        reject(new Error("Canvas context not available"))
        return
      }

      ctx.drawImage(img, 0, 0, width, height)

      // Convert to compressed blob
      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob)
          else reject(new Error("Compression failed"))
        },
        file.type === "image/png" ? "image/png" : "image/jpeg",
        file.type === "image/png" ? PNG_QUALITY : JPEG_QUALITY
      )
    }
    img.onerror = () => reject(new Error("Failed to load image"))
    img.src = URL.createObjectURL(file)
  })
}

export function ImageUpload({ value, onChange, onUploadingChange, label = "Gambar Barang", folder = "menu", disabled = false }: ImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [preview, setPreview] = useState<string | null>(value || null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Sync preview with value prop
  useEffect(() => {
    setPreview(value || null)
  }, [value])

  // Cleanup object URLs on unmount
  useEffect(() => {
    return () => {
      if (preview && preview.startsWith('blob:')) {
        URL.revokeObjectURL(preview)
      }
    }
  }, [preview])

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (disabled) return
    const file = e.target.files?.[0]
    if (!file) return

    // Validate before upload
    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"]
    if (!allowedTypes.includes(file.type)) {
      toast.error("Format file tidak didukung. Gunakan JPEG, PNG, WebP, atau GIF")
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Ukuran file terlalu besar. Maksimal 5MB")
      return
    }

    setIsUploading(true)
    onUploadingChange?.(true)
    try {
      // Compress client-side before sending
      const compressedBlob = await compressImage(file)
      const compressedFile = new File([compressedBlob], file.name, {
        type: compressedBlob.type,
      })

      // Set preview with compressed image
      const localUrl = URL.createObjectURL(compressedFile)
      setPreview(localUrl)

      // Upload compressed file to server
      const response = await fetch("/api/upload/image", {
        method: "POST",
        body: (() => {
          const fd = new FormData()
          fd.append("file", compressedFile)
          fd.append("folder", folder)
          return fd
        })(),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Upload gagal")
      }

      const data = await response.json()
      onChange(data.url)
      setShowSuccess(true)
      setTimeout(() => setShowSuccess(false), 2000)
    } catch (error: any) {
      toast.error(error.message || "Gagal mengupload gambar")
      setPreview(value || null) // Revert to previous value on error
    } finally {
      setIsUploading(false)
      onUploadingChange?.(false)
    }
  }

  const handleRemove = async () => {
    if (disabled) return
    const urlToDelete = value // The previously saved URL
    setPreview(null)
    onChange("")
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }

    if (urlToDelete) {
      try {
        await fetch('/api/upload/delete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: urlToDelete }),
        })
      } catch (error) {
        console.error("Failed to delete image from R2:", error)
      }
    }
  }

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">{label}</label>

      {preview ? (
        <div className="relative aspect-square w-full max-w-[200px] rounded-lg border overflow-hidden bg-muted group">
          <img
            src={preview}
            alt="Preview"
            className="w-full h-full object-cover"
          />

          {/* Success checkmark - brief flash */}
          {showSuccess && (
            <div className="absolute inset-0 bg-primary/20 flex items-center justify-center z-20 animate-in fade-in">
              <div className="p-3 rounded-full bg-primary shadow-lg">
                <Check className="h-8 w-8 text-primary-foreground" />
              </div>
            </div>
          )}

          {/* Overlay buttons - hidden when disabled */}
          {!disabled && (
            <div className="absolute inset-0 bg-background/20 md:bg-background/60 md:opacity-0 md:group-hover:opacity-100 opacity-100 transition-opacity flex items-center justify-center gap-2 pointer-events-none z-10">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="p-2 rounded-full bg-background/90 hover:bg-background text-foreground transition disabled:opacity-50 pointer-events-auto shadow-sm"
              >
                {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              </button>
              <button
                type="button"
                onClick={handleRemove}
                disabled={isUploading}
                className="p-2 rounded-full bg-background/90 hover:bg-background text-foreground transition disabled:opacity-50 pointer-events-auto shadow-sm"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* Uploading indicator */}
          {isUploading && (
            <div className="absolute bottom-0 left-0 right-0 px-2 py-1 bg-background/80 backdrop-blur-sm text-muted-foreground text-[10px] flex items-center justify-center gap-1">
              <Loader2 className="h-3 w-3 animate-spin" />
              Mengupload...
            </div>
          )}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading || disabled}
          className="aspect-square w-full max-w-[200px] rounded-lg border-2 border-dashed border-muted-foreground/30 hover:border-primary/50 bg-muted/30 hover:bg-muted/50 transition flex flex-col items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isUploading ? (
            <Loader2 className="h-8 w-8 text-muted-foreground animate-spin" />
          ) : (
            <>
              <ImagePlus className="h-8 w-8 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Upload Gambar</span>
            </>
          )}
        </button>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        onChange={handleFileChange}
        className="hidden"
        disabled={isUploading || disabled}
      />

      <p className="text-[10px] text-muted-foreground">
        Format: JPEG, PNG, WebP, GIF. Maks: 5MB.
      </p>
    </div>
  )
}
