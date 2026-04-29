"use client"

import type React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { LayoutGrid, Settings, ShoppingCart, History, TrendingUp, BarChart3, Package, FolderOpen, ShoppingBag, Warehouse, ShieldCheck } from "lucide-react"
import { cn } from "../lib/utils"
import { useCafeSettings, useMenu } from "../hooks/use-cafe-data"
import { useAuth } from "../lib/auth-context"
import { Toaster } from "sonner"
import { Clock } from "./clock"
import { UserDropdown } from "./user-dropdown"
import { useEffect, useRef } from "react"
import { ThemeToggle } from "./theme-toggle"

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

export const AppShell = ({ children }: { children: React.ReactNode }) => {
  const pathname = usePathname()
  const { userData, signOutUser, signingOut, error, clearError } = useAuth()
  const { settings } = useCafeSettings(userData?.cafe_id)
  const { menu } = useMenu(userData?.cafe_id)

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
      <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="flex items-center justify-between px-4 py-3 max-w-7xl mx-auto w-full">
          {/* LEFT: LOGO + NAME */}
          <Link href="/dashboard" className="flex items-center gap-3 min-w-0">
            {settings?.logoUrl ? (
              <img
                src={settings.logoUrl}
                alt={settings.name || "Logo"}
                className="h-8 w-8 rounded-md object-cover border border-border bg-muted"
              />
            ) : (
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground text-sm font-semibold">
                KS
              </span>
            )}
            <div className="flex flex-col leading-tight min-w-0">
              <span className="font-semibold text-sm truncate max-w-[140px] sm:max-w-[180px]">
                {settings?.name || "KasirKu POS"}
              </span>
              {settings?.address && (
                <span className="text-xs text-muted-foreground truncate max-w-[140px] sm:max-w-[180px]">
                  {settings?.address}
                </span>
              )}
              {settings?.tagline && !settings?.address && (
                <span className="text-xs text-muted-foreground truncate max-w-[140px] sm:max-w-[180px]">
                  {settings?.tagline}
                </span>
              )}
            </div>
          </Link>

          {/* RIGHT: THEME TOGGLE + CLOCK + USER */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Theme Toggle */}
            <ThemeToggle />

            {/* Clock */}
            <div className="hidden lg:block">
              <Clock />
            </div>

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
        <nav className="hidden md:flex items-center justify-center border-t border-border/50 bg-background/50">
          <div className="flex items-center gap-1 px-4 py-2">
            {[
              ...links.filter(l => !l.hiddenForRoles?.includes(userData?.role || '')),
              ...(userData?.role === 'superadmin' ? [{ href: "/superadmin/user-management", label: "Superadmin", icon: ShieldCheck }] : [])
            ].map((l) => {
              const isActive = pathname === l.href
              const Icon = l.icon
              const showBadge = l.href === '/stock' && stockAlertCount > 0;

              return (
                <Link
                  key={l.href}
                  href={l.href}
                  className={cn(
                    "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap relative",
                    isActive
                      ? "bg-primary/15 text-primary"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" strokeWidth={1.75} />
                  <span>{l.label}</span>
                  {showBadge && (
                    <span className="absolute -top-1 -right-1 h-4 min-w-[1rem] rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center px-1 shadow-sm">
                      {stockAlertCount > 9 ? '9+' : stockAlertCount}
                    </span>
                  )}
                </Link>
              )
            })}
          </div>
        </nav>

        {/* NAV MOBILE */}
        <nav className="md:hidden bg-background/50 border-t border-border/50">
          <div ref={mobileNavRef} className="flex overflow-x-auto scrollbar-hide px-4 py-2 gap-1.5">
            {[
              ...links.filter(l => !l.hiddenForRoles?.includes(userData?.role || '')),
              ...(userData?.role === 'superadmin' ? [{ href: "/superadmin/user-management", label: "Superadmin", icon: ShieldCheck }] : [])
            ].map((l, index) => {
              const isActive = pathname === l.href
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

              const showBadge = l.href === '/stock' && stockAlertCount > 0;

              return (
                <Link
                  key={l.href}
                  href={l.href}
                  onClick={handleNavClick}
                  className={cn(
                    "relative flex flex-col items-center justify-center rounded-xl py-2 flex-shrink-0 transition-all duration-200",
                    "w-[calc((100vw-56px)/5)]",
                    isActive
                      ? "bg-primary/15 text-primary"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <span className="relative">
                    <Icon className="h-5 w-5 mb-0.5" strokeWidth={1.75} />
                    {showBadge && (
                      <span className="absolute -top-1.5 -right-1.5 h-3.5 w-3.5 rounded-full bg-red-500 text-white text-[8px] font-bold flex items-center justify-center">
                        {stockAlertCount > 9 ? '9+' : stockAlertCount}
                      </span>
                    )}
                  </span>
                  <span className="text-[10px] font-medium text-center leading-tight truncate">{l.label}</span>
                </Link>
              )
            })}
          </div>
        </nav>
      </header>

      {/* MAIN */}
      <main className="w-full px-4 py-4 sm:py-6">{children}</main>
    </div>
  )
}
