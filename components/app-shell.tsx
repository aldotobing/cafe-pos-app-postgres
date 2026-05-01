"use client"

import type React from "react"
import Link from "next/link"
import { usePathname, useSearchParams } from "next/navigation"
import { LayoutGrid, Settings, ShoppingCart, History, TrendingUp, BarChart3, Package, FolderOpen, ShoppingBag, Warehouse, ShieldCheck, Users, Building2 } from "lucide-react"
import { cn } from "../lib/utils"
import { useCafeSettings, useMenu } from "../hooks/use-cafe-data"
import { useAuth } from "../lib/auth-context"
import { Toaster } from "sonner"
import { Clock } from "./clock"
import { UserDropdown } from "./user-dropdown"
import { useEffect, useRef } from "react"
import { ThemeToggle } from "./theme-toggle"
import { StatusIndicator, useStatusIndicator } from "./status-indicator"

type LinkItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  hiddenForRoles?: string[];
};

const links: LinkItem[] = [
  { href: "/dashboard", label: "Dasbor", icon: LayoutGrid },
  { href: "/pos", label: "POS", icon: ShoppingCart },
  { href: "/menu", label: "Barang", icon: ShoppingBag },
  { href: "/transactions", label: "Transaksi", icon: History },
  { href: "/stock", label: "Stok", icon: Warehouse },
  { href: "/categories", label: "Kategori", icon: FolderOpen },
  { href: "/reports/profit", label: "Laba", icon: BarChart3, hiddenForRoles: ['cashier'] },
  { href: "/statistik", label: "Statistik", icon: TrendingUp, hiddenForRoles: ['cashier'] },
]

const superadminLinks: LinkItem[] = [
  { href: "/superadmin", label: "Platform", icon: ShieldCheck },
  { href: "/superadmin/users", label: "Pengguna", icon: Users },
  { href: "/superadmin/cafes", label: "Cafe", icon: Building2 },
]

export const AppShell = ({ children }: { children: React.ReactNode }) => {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const urlCafeId = searchParams.get('cafe_id')
  const { userData, signOutUser, signingOut, error, clearError } = useAuth()
  
  const isSuperadmin = userData?.role === 'superadmin'
  const cafeId = (isSuperadmin && urlCafeId) ? Number(urlCafeId) : userData?.cafe_id
  
  const { settings } = useCafeSettings(cafeId)
  const { menu } = useMenu(cafeId)

  // Use superadmin navigation if user is superadmin
  // If superadmin is viewing a specific cafe, show cafe links with the cafe_id preserved
  const isImpersonating = isSuperadmin && !!urlCafeId
  
  const currentLinks = isImpersonating 
    ? [
        { href: "/superadmin/cafes", label: "Kembali", icon: Building2 },
        ...links.map(l => ({ ...l, href: `${l.href}?cafe_id=${urlCafeId}` }))
      ]
    : isSuperadmin 
      ? superadminLinks 
      : links

  const mobileNavRef = useRef<HTMLDivElement>(null)
  const isRestoringScroll = useRef(false)
  useEffect(() => {
    if (mobileNavRef.current) {
      const savedScroll = sessionStorage.getItem('mobileNavScroll')
      if (savedScroll && !isRestoringScroll.current) {
        isRestoringScroll.current = true
        mobileNavRef.current.scrollLeft = parseInt(savedScroll, 10)
      }
    }
  }, [])

  // Save scroll position when pathname changes
  useEffect(() => {
    if (mobileNavRef.current) {
      sessionStorage.setItem('mobileNavScroll', mobileNavRef.current.scrollLeft.toString())
      isRestoringScroll.current = false
    }
  }, [pathname])

  // Status indicator hook
  const { status } = useStatusIndicator();

  // Calculate low stock count for badge
  // For items with variants, check variant stock levels; for items without, check item stock
  const lowStockCount = menu.reduce((count, m) => {
    if (!m.trackStock) return count;
    
    // If item has variants, check each variant
    if (m.hasVariants && m.productVariants && m.productVariants.length > 0) {
      const variantLowStock = m.productVariants.filter((v: any) => 
        v.track_stock !== false && 
        v.stock_quantity !== undefined && 
        v.stock_quantity > 0 && 
        v.stock_quantity <= (v.min_stock || m.minStock || 5)
      ).length;
      return count + variantLowStock;
    }
    
    // For items without variants, check item stock
    if (m.stockQuantity !== undefined && m.stockQuantity > 0 && m.stockQuantity <= (m.minStock || 5)) {
      return count + 1;
    }
    return count;
  }, 0);
  
  const outOfStockCount = menu.reduce((count, m) => {
    if (!m.trackStock) return count;
    
    // If item has variants, check each variant
    if (m.hasVariants && m.productVariants && m.productVariants.length > 0) {
      const variantOutOfStock = m.productVariants.filter((v: any) => 
        v.track_stock !== false && 
        v.stock_quantity === 0
      ).length;
      return count + variantOutOfStock;
    }
    
    // For items without variants, check item stock
    if (m.stockQuantity === 0) {
      return count + 1;
    }
    return count;
  }, 0);
  
  const stockAlertCount = lowStockCount + outOfStockCount;

  return (
    <div className="min-h-dvh flex flex-col bg-background">
      {/* HEADER */}
      <header className="sticky top-0 z-30 border-b border-border/50 bg-background/95 backdrop-blur-xl shadow-sm">
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 max-w-7xl mx-auto w-full">
          {/* LEFT: LOGO + NAME */}
          <Link href={isSuperadmin ? "/superadmin" : "/dashboard"} className="flex items-center gap-2.5 min-w-0 group">
            {isSuperadmin ? (
              <>
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 to-blue-600 text-white text-sm font-semibold shadow-lg">
                  SA
                </span>
                <div className="flex flex-col leading-tight min-w-0">
                  <span className="font-semibold text-sm truncate max-w-[140px] sm:max-w-[200px]">
                    Superadmin
                  </span>
                  <span className="text-xs text-muted-foreground/80 truncate max-w-[140px] sm:max-w-[200px]">
                    Platform Management
                  </span>
                </div>
              </>
            ) : (
              <>
                {settings?.logoUrl ? (
                  <img
                    src={settings.logoUrl}
                    alt={settings.name || "Logo"}
                    className="h-9 w-9 rounded-lg object-cover border border-border/50 bg-muted transition-transform group-hover:scale-105"
                  />
                ) : (
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground text-sm font-semibold">
                    KS
                  </span>
                )}
                <div className="flex flex-col leading-tight min-w-0">
                  <span className="font-semibold text-sm truncate max-w-[140px] sm:max-w-[200px]">
                    {settings?.name || "KasirKu POS"}
                  </span>
                  {(settings?.address || settings?.tagline) && (
                    <span className="text-xs text-muted-foreground/80 truncate max-w-[140px] sm:max-w-[200px]">
                      {settings?.address || settings?.tagline}
                    </span>
                  )}
                </div>
              </>
            )}
          </Link>

          {/* RIGHT: THEME TOGGLE + CLOCK + USER */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Status Indicator */}
            <div className="hidden sm:block">
              <StatusIndicator status={status} pulse size="md" />
            </div>

            {/* Theme Toggle */}
            <ThemeToggle />

            {/* Clock */}
            <div className="hidden lg:block">
              <Clock />
            </div>

            {/* Divider */}
            <div className="hidden sm:block w-px h-6 bg-border/60 mx-1" />

            {/* User dropdown */}
            <UserDropdown
              fullName={userData?.full_name || userData?.email || "User"}
              email={userData?.email || "Email"}
              avatarUrl={userData?.avatar_url}
              role={userData?.role || "Role"}
              onLogout={signOutUser}
              signingOut={signingOut}
              error={error}
              onClearError={clearError}
            />
          </div>
        </div>

        {/* NAV: DESKTOP */}
        <nav className="hidden md:flex items-center justify-center border-t border-border/40 bg-muted/30">
          <div className="flex items-center gap-1 px-3 py-2">
            {currentLinks.map((l) => {
              const isActive = pathname === l.href.split('?')[0]
              const Icon = l.icon
              const showBadge = l.href.startsWith('/stock') && stockAlertCount > 0;

              return (
                <Link
                  key={l.href}
                  href={l.href}
                  className={cn(
                    "group inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200 whitespace-nowrap relative",
                    isActive
                      ? "bg-background text-primary shadow-sm"
                      : "text-muted-foreground hover:text-foreground hover:bg-background/50"
                  )}
                >
                  <Icon
                    className={cn(
                      "h-4 w-4 shrink-0 transition-transform duration-200",
                      isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                    )}
                    strokeWidth={isActive ? 2.5 : 2}
                  />
                  <span className={cn("tracking-tight", isActive && "font-semibold")}>{l.label}</span>
                  {showBadge && (
                    <span className="absolute -top-0.5 -right-0.5 h-4 min-w-[1rem] rounded-full bg-destructive text-destructive-foreground text-[9px] font-semibold flex items-center justify-center px-1 shadow-sm">
                      {stockAlertCount > 9 ? '9+' : stockAlertCount}
                    </span>
                  )}
                </Link>
              )
            })}
          </div>
        </nav>

        {/* NAV MOBILE */}
        <nav className="md:hidden bg-muted/30 border-t border-border/40">
          <div ref={mobileNavRef} className="flex overflow-x-auto scrollbar-hide px-2 py-1.5 gap-0.5">
            {currentLinks.map((l, index) => {
              const isActive = pathname === l.href.split('?')[0]
              const Icon = l.icon

              const handleNavClick = () => {
                if (mobileNavRef.current) {
                  const linkElement = mobileNavRef.current.children[index] as HTMLElement
                  if (linkElement) {
                    const container = mobileNavRef.current
                    const containerRect = container.getBoundingClientRect()
                    const linkRect = linkElement.getBoundingClientRect()

                    const isLeftHidden = linkRect.left < containerRect.left
                    const isRightHidden = linkRect.right > containerRect.right
                    const rightDiff = linkRect.right - containerRect.right
                    const leftDiff = linkRect.left - containerRect.left
                    let scrollAmount = 0

                    if (isRightHidden) {
                      scrollAmount = rightDiff
                    } else if (isLeftHidden) {
                      scrollAmount = leftDiff
                    }

                    if (scrollAmount !== 0) {
                      container.scrollTo({
                        left: container.scrollLeft + scrollAmount,
                        behavior: 'smooth',
                      })
                      sessionStorage.setItem('mobileNavScroll', (container.scrollLeft + scrollAmount).toString())
                    } else {
                      sessionStorage.setItem('mobileNavScroll', container.scrollLeft.toString())
                    }
                  }
                }
              }

              const showBadge = l.href.startsWith('/stock') && stockAlertCount > 0;

              return (
                <Link
                  key={l.href}
                  href={l.href}
                  onClick={handleNavClick}
                  className={cn(
                    "relative flex flex-col items-center justify-center rounded-md py-1.5 px-2 flex-shrink-0 transition-all duration-200 min-w-[60px]",
                    isActive
                      ? "bg-background text-primary shadow-sm"
                      : "text-muted-foreground/80 hover:text-foreground hover:bg-background/40"
                  )}
                >
                  <span className="relative">
                    <Icon
                      className={cn(
                        "h-[18px] w-[18px] mb-0.5 transition-all",
                        isActive ? "stroke-[2.5px]" : "stroke-[2px]"
                      )}
                    />
                    {showBadge && (
                      <span className="absolute -top-0.5 -right-0.5 h-3 w-3 rounded-full bg-destructive text-destructive-foreground text-[7px] font-semibold flex items-center justify-center">
                        {stockAlertCount > 9 ? '9' : stockAlertCount}
                      </span>
                    )}
                  </span>
                  <span className={cn(
                    "text-[10px] leading-none tracking-tight",
                    isActive ? "font-semibold" : "font-medium"
                  )}>{l.label}</span>
                </Link>
              )
            })}
          </div>
        </nav>
      </header>

      {/* MAIN */}
      <main className="w-full px-4 sm:px-6 py-4 sm:py-6">{children}</main>
    </div>
  )
}
