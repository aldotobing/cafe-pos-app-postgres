"use client"

import Image from "next/image"
import { useState } from "react"
import { cn } from "@/lib/utils"
import { ImageIcon } from "lucide-react"

interface OptimizedImageProps {
  src: string | null | undefined
  alt: string
  width?: number
  height?: number
  fill?: boolean
  className?: string
  containerClassName?: string
  priority?: boolean
  sizes?: string
  objectFit?: "cover" | "contain" | "fill"
  placeholder?: "blur" | "empty"
  blurDataURL?: string
  fallback?: React.ReactNode
}

export function OptimizedImage({
  src,
  alt,
  width = 300,
  height = 300,
  fill = false,
  className,
  containerClassName,
  priority = false,
  sizes = "(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw",
  objectFit = "cover",
  placeholder = "empty",
  blurDataURL,
  fallback,
}: OptimizedImageProps) {
  const [error, setError] = useState(false)

  if (!src || error) {
    return (
      <div
        className={cn(
          "bg-muted flex items-center justify-center",
          fill ? "w-full h-full" : "",
          containerClassName
        )}
        style={!fill ? { width, height } : undefined}
      >
        {fallback || (
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            <ImageIcon className="w-8 h-8" />
            <span className="text-xs">{alt}</span>
          </div>
        )}
      </div>
    )
  }

  const imageProps = fill
    ? {
        fill: true,
        sizes,
        className: cn(`object-${objectFit}`, className),
      }
    : {
        width,
        height,
        className: cn(`object-${objectFit}`, className),
      }

  return (
    <div
      className={cn(
        "relative overflow-hidden",
        fill ? "w-full h-full" : "",
        containerClassName
      )}
      style={!fill ? { width, height } : undefined}
    >
      <Image
        src={src}
        alt={alt}
        {...imageProps}
        priority={priority}
        placeholder={placeholder}
        blurDataURL={blurDataURL}
        onError={() => setError(true)}
        unoptimized={false}
      />
    </div>
  )
}

// Small thumbnail version for lists
export function OptimizedThumbnail({
  src,
  alt,
  size = 48,
  className,
}: {
  src: string | null | undefined
  alt: string
  size?: number
  className?: string
}) {
  return (
    <OptimizedImage
      src={src}
      alt={alt}
      width={size}
      height={size}
      className={cn("rounded-md", className)}
      containerClassName="rounded-md shrink-0"
    />
  )
}

// Avatar/Circular version
export function OptimizedAvatar({
  src,
  alt,
  size = 40,
  className,
}: {
  src: string | null | undefined
  alt: string
  size?: number
  className?: string
}) {
  return (
    <OptimizedImage
      src={src}
      alt={alt}
      width={size}
      height={size}
      className={cn("rounded-full", className)}
      containerClassName="rounded-full shrink-0"
      fallback={
        <div className="w-full h-full bg-primary/10 flex items-center justify-center text-primary font-semibold">
          {alt?.charAt(0)?.toUpperCase() || "?"}
        </div>
      }
    />
  )
}

// Card image with fill
export function OptimizedCardImage({
  src,
  alt,
  className,
  priority = false,
  fallback,
}: {
  src: string | null | undefined
  alt: string
  className?: string
  priority?: boolean
  fallback?: React.ReactNode
}) {
  return (
    <OptimizedImage
      src={src}
      alt={alt}
      fill
      priority={priority}
      objectFit="cover"
      className={cn("transition-transform duration-300", className)}
      containerClassName="absolute inset-0"
      sizes="(max-width: 768px) 100vw, 300px"
      fallback={fallback}
    />
  )
}
