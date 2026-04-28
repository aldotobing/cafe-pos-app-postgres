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

  // Calculate low stock count for badge (including variants)
  const stockAlerts = menu.map(m => {
    if (!m.trackStock) return { lowStock: false, outOfStock: false, name: m.name, stock: m.stockQuantity, hasVariants: m.hasVariants };
    
    // If has variants, don't count based on main stock since variants manage their own stock
    // Items with variants should be excluded from badge calculation for now
    // TODO: Fetch variants data and calculate total stock from all variants
    if (m.hasVariants) {
      return {
        lowStock: false,
        outOfStock: false,
        name: m.name,
        stock: m.stockQuantity || 0,
        minStock: m.minStock || 5,
        hasVariants: m.hasVariants,
        excluded: true
      };
    }
    
    // For items without variants, use main stock
    const stock = m.stockQuantity || 0;
    const minStock = m.minStock || 5;
    return {
      lowStock: stock > 0 && stock <= minStock,
      outOfStock: stock === 0,
      name: m.name,
      stock,
      minStock,
      hasVariants: m.hasVariants,
      excluded: false
    };
  });
  
  const lowStockCount = stockAlerts.filter(alert => alert.lowStock).length;
  const outOfStockCount = stockAlerts.filter(alert => alert.outOfStock).length;
  const stockAlertCount = lowStockCount + outOfStockCount;

  
  return (
    <div className="min-h-dvh flex flex-col bg-background">
      {/* HEADER */}
      <header className="sticky top-0 z-30 border-b border-border/60 bg-background/80 backdrop-blur-xl">
        <div className="flex items-center justify-between px-4 py-4 max-w-7xl mx-auto w-full">
          {/* LEFT: LOGO + NAME */}
          <Link href="/dashboard" className="flex items-center gap-4 min-w-0 group">
            {settings?.logoUrl ? (
              <img
                src={settings.logoUrl}
                alt={settings.name || "Logo"}
                className="h-10 w-10 rounded-xl object-cover border border-border bg-muted shadow-sm transition-transform group-hover:scale-105"
              />
            ) : (
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground text-base font-bold shadow-md shadow-primary/20 transition-transform group-hover:scale-105">
                {settings?.name?.substring(0, 2).toUpperCase() || "KS"}
              </span>
            )}
            <div className="flex flex-col leading-tight min-w-0">
              <span className="font-bold text-[15px] tracking-tight truncate max-w-[140px] sm:max-w-[200px]">
                {settings?.name || "KasirKu POS"}
              </span>
              {settings?.address && (
                <span className="text-xs text-muted-foreground/80 truncate max-w-[140px] sm:max-w-[200px] font-medium">
                  {settings?.address}
                </span>
              )}
              {settings?.tagline && !settings?.address && (
                <span className="text-xs text-muted-foreground/80 truncate max-w-[140px] sm:max-w-[200px] font-medium">
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
        <nav className="hidden md:flex items-center justify-center border-t border-border/50 bg-background/40 backdrop-blur-md">
          <div className="flex items-center gap-1.5 px-6 py-2.5">
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
                    "inline-flex items-center gap-2 px-4 py-2 rounded-xl text-[14px] font-semibold transition-all duration-200 whitespace-nowrap relative group",
                    isActive
                      ? "bg-primary text-primary-foreground shadow-md shadow-primary/20 scale-[1.02]"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/80 hover:scale-[1.02]"
                  )}
                >
                  <Icon className={cn(
                    "h-[18px] w-[18px] shrink-0 transition-transform duration-200",
                    isActive ? "scale-110" : "group-hover:scale-110"
                  )} strokeWidth={isActive ? 2 : 1.75} />
                  <span>{l.label}</span>
                  {showBadge && (
                    <span className={cn(
                      "absolute -top-1.5 -right-1.5 h-5 min-w-[1.25rem] rounded-full text-white text-[10px] font-bold flex items-center justify-center px-1.5 shadow-lg ring-2 ring-background animate-pulse",
                      isActive ? "bg-red-500" : "bg-red-600"
                    )}>
                      {stockAlertCount > 9 ? '9+' : stockAlertCount}
                    </span>
                  )}
                </Link>
              )
            })}
          </div>
        </nav>

        {/* NAV MOBILE */}
        <nav className="md:hidden bg-background/60 backdrop-blur-xl border-t border-border/50">
          <div ref={mobileNavRef} className="flex overflow-x-auto scrollbar-hide px-4 py-3 gap-2">
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
                    "relative flex flex-col items-center justify-center rounded-2xl py-2.5 px-3 flex-shrink-0 transition-all duration-300",
                    "min-w-[76px]",
                    isActive
                      ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25 scale-105"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                  )}
                >
                  <span className="relative">
                    <Icon className={cn(
                      "h-6 w-6 mb-1 transition-transform duration-300",
                      isActive ? "scale-110" : ""
                    )} strokeWidth={isActive ? 2 : 1.75} />
                    {showBadge && (
                      <span className={cn(
                        "absolute -top-2 -right-2 h-4.5 w-4.5 rounded-full text-white text-[9px] font-bold flex items-center justify-center ring-2 ring-background shadow-sm",
                        isActive ? "bg-red-500" : "bg-red-600"
                      )}>
                        {stockAlertCount > 9 ? '9+' : stockAlertCount}
                      </span>
                    )}
                  </span>
                  <span className={cn(
                    "text-[11px] font-bold text-center leading-none tracking-tight",
                    isActive ? "text-primary-foreground" : "text-muted-foreground"
                  )}>{l.label}</span>
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
