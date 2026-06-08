export interface PromoRule {
  id: string
  name: string
  type: 'percent' | 'flat'
  value: number
  minSubtotal: number
  maxDiscount: number | null
  appliesTo: 'all' | 'categories' | 'specific_items'
  targetItemIds: string[]
  targetCategoryIds: string[]
  isActive: boolean
}

interface CartItemForPromo {
  menuId: string
  name: string
  categoryId?: string
  price: number
  qty: number
  discount?: number
}

interface PromoMatchResult {
  promo: PromoRule | null
  discountAmount: number
  label: string
}

export function findBestPromo(
  cart: CartItemForPromo[],
  subtotal: number,
  promotions: PromoRule[]
): PromoMatchResult {
  if (!cart.length || !promotions.length) {
    return { promo: null, discountAmount: 0, label: '' }
  }

  const activePromos = promotions.filter(p => p.isActive)
  if (!activePromos.length) {
    return { promo: null, discountAmount: 0, label: '' }
  }

  let bestMatch: { promo: PromoRule; discountAmount: number } | null = null

  for (const promo of activePromos) {
    if (promo.minSubtotal > 0 && subtotal < promo.minSubtotal) continue

    let applicable = false

    if (promo.appliesTo === 'all') {
      applicable = true
    } else if (promo.appliesTo === 'categories') {
      const cartCategoryIds = new Set(
        cart
          .map(item => item.categoryId)
          .filter(Boolean) as string[]
      )
      applicable = promo.targetCategoryIds.length === 0 ||
        promo.targetCategoryIds.some(id => cartCategoryIds.has(id))
    } else if (promo.appliesTo === 'specific_items') {
      const cartMenuItemIds = new Set(cart.map(item => item.menuId))
      applicable = promo.targetItemIds.length === 0 ||
        promo.targetItemIds.some(id => cartMenuItemIds.has(id))
    }

    if (!applicable) continue

    let discountAmount: number
    if (promo.type === 'percent') {
      discountAmount = Math.round(subtotal * promo.value / 100)
      if (promo.maxDiscount && discountAmount > promo.maxDiscount) {
        discountAmount = promo.maxDiscount
      }
    } else {
      discountAmount = promo.value
    }

    if (discountAmount <= 0) continue

    if (!bestMatch || discountAmount > bestMatch.discountAmount) {
      bestMatch = { promo, discountAmount }
    }
  }

  if (!bestMatch) {
    return { promo: null, discountAmount: 0, label: '' }
  }

  return {
    promo: bestMatch.promo,
    discountAmount: bestMatch.discountAmount,
    label: bestMatch.promo.name,
  }
}
