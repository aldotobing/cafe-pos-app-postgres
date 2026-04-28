"use client"

import { AppShell } from "../../components/app-shell"
import { useEffect } from "react"
import { MenuGrid } from "../../components/pos/menu-grid"
import { CartPanel } from "../../components/pos/cart"
import { MobileCart } from "../../components/pos/mobile-cart"
import { POSSkeleton } from "../../components/skeletons"
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';

export default function Page() {
  const { user, userData, loading } = useAuth();
  const router = useRouter();
  useEffect(() => {
    // Check authentication - redirect if not logged in
    if (!loading && (!user || !userData)) {
      router.push('/login');
      return;
    }

    // Check approval status for regular admin users
    if (!loading && user && userData) {
      if (!userData.is_approved && userData.role !== 'superadmin') {
        // Redirect to pending approval page
        router.push('/pending-approval');
        return;
      }

      // For cashier users, ensure they're assigned to a cafe
      if (userData.role === 'cashier' && !userData.cafe_id) {
        router.push('/login'); // Cashier not assigned to any cafe
        return;
      }

      // For admin users who don't have a cafe assigned, redirect to create cafe
      if (userData.role === 'admin' && !userData.cafe_id) {
        router.push('/create-cafe');
        return;
      }
    }
  }, [user, userData, loading, router]);

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 }
  };

  const loadingVariants = {
    hidden: { opacity: 0, scale: 0.9 },
    visible: { opacity: 1, scale: 1 }
  };

  const layoutVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  // Show loading state while checking auth
  if (loading) {
    return <POSSkeleton />;
  }

  return (
    <AppShell>
      {/* On mobile, cart is at the bottom as a sticky panel; on desktop, menu is on the left and cart on the right with independent scrolling */}
      <motion.div
        className="flex flex-col-reverse h-[calc(100vh-180px)] md:flex md:flex-row gap-4"
        variants={layoutVariants}
        initial="hidden"
        animate="visible"
        transition={{ duration: 0.1, ease: "easeOut" }}
      >
        <motion.div
          className="md:w-7/12 h-full overflow-auto scrollbar-custom"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.02, duration: 0.1, ease: "easeOut" }}
        >
          <MenuGrid />
        </motion.div>
        <motion.div
          className="sticky bottom-0 z-20 bg-background md:static md:z-auto md:bottom-auto md:w-5/12 md:h-full"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.04, duration: 0.1, ease: "easeOut" }}
        >
          {/* Show desktop cart only on medium and larger screens */}
          <div className="hidden md:block h-full rounded-xl border overflow-hidden">
            <CartPanel />
          </div>
        </motion.div>
      </motion.div>
      {/* Mobile cart component - only visible on mobile */}
      <div className="md:hidden">
        <MobileCart />
      </div>
    </AppShell>
  )
}