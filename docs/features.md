# KasirKu - Features Documentation

## 🎯 Core Features Overview

KasirKu adalah sistem Point of Sale (POS) yang komprehensif dengan berbagai fitur untuk mengelola bisnis restoran, kafe, atau retail. Setiap fitur dirancang untuk memudahkan operasional sehari-hari dan memberikan insight berharga untuk pengambilan keputusan bisnis.

---

## 💳 Point of Sale (POS)

### Fitur Utama POS

#### 1. Menu Grid Display
**Deskripsi**: Tampilan menu yang intuitif dengan grid layout untuk kemudahan navigasi.

**Fitur**:
- Grid responsif (desktop dan mobile)
- Filter berdasarkan kategori
- Quick search untuk item
- Display harga dan stok
- Indikator item dengan variants
- Gambar thumbnail untuk visual appeal

**Komponen**: `components/pos/menu-grid.tsx`

**API**: GET `/api/rest/menu?cafe_id=X`

**State**: SWR cache dengan refresh interval 30 detik

---

#### 2. Shopping Cart
**Deskripsi**: Keranjang belanja untuk mengelola item yang akan dibeli.

**Fitur**:
- Tambah/kurangi quantity
- Hapus item dari cart
- Catatan per item
- Diskon per item
- Support product variants
- Auto-calculation subtotal, tax, service charge
- Real-time stock validation
- Desktop dan mobile layout

**Komponen**: 
- `components/pos/cart.tsx` (Desktop)
- `components/pos/mobile-cart.tsx` (Mobile)

**Context**: `contexts/cart-context.tsx`

**Validasi**:
- Stok tersedia sebelum tambah ke cart
- Maximum stock per item
- Minimum quantity = 1

---

#### 3. Checkout Process
**Deskripsi**: Proses pembayaran dengan berbagai metode pembayaran.

**Fitur**:
- Multiple payment methods (Tunai, QRIS, Debit, Transfer)
- Auto-calculation tax dan service charge
- Input payment amount
- Auto-calculation change (kembalian)
- Order note (catatan pesanan)
- Loading state indicator
- Error handling dan validation

**Payment Methods**:
- **Tunai**: Cash payment
- **QRIS**: QR code payment
- **Debit**: Card payment
- **Transfer**: Bank transfer

**API**: POST `/api/rest/transactions`

**Flow**:
1. Validate cart (tidak kosong)
2. Validate stock availability
3. Create transaction record
4. Create transaction items
5. Update stock (decrement)
6. Create stock mutation record
7. Generate receipt
8. Clear cart

---

#### 4. Receipt Generation
**Deskripsi**: Generate struk pembayaran dengan format yang profesional.

**Fitur**:
- Transaction number
- Daftar item dengan quantity dan harga
- Subtotal breakdown
- Tax dan service charge
- Total amount
- Payment method dan change
- Cafe logo dan info
- Print functionality
- Download sebagai PDF (future)

**Komponen**: `app/receipt/[id]/page.tsx`

**API**: GET `/api/rest/transactions/[id]`

**Data**: Mapping snake_case ke camelCase untuk consistency

---

## 📊 Dashboard

### Fitur Dashboard

#### 1. Quick Stats
**Deskripsi**: Ringkasan metrik penting dalam satu tampilan.

**Metrics**:
- **Total Revenue Today**: Pendapatan hari ini
- **Transaction Count**: Jumlah transaksi hari ini
- **Average Transaction Value**: Rata-rata nilai transaksi
- **Weekly Revenue**: Pendapatan mingguan

**Komponen**: `components/statistik/StatCard.tsx`

**Real-time**: Refresh setiap 30 detik via SWR

---

#### 2. Recent Transactions
**Deskripsi**: Daftar transaksi terbaru untuk quick access.

**Fitur**:
- 5 transaksi terakhir
- Transaction number dan time
- Total amount
- Payment method
- Quick link ke detail

**Komponen**: `components/dashboard/RecentTransactions.tsx`

**API**: GET `/api/rest/transactions?cafe_id=X&limit=5`

---

#### 3. Weekly Revenue Chart
**Deskripsi**: Visualisasi pendapatan mingguan dalam line chart.

**Fitur**:
- 7 hari terakhir
- Revenue per hari
- Trend visualization
- Hover untuk detail

**Komponen**: `components/dashboard/WeeklySummary.tsx`

**Library**: Recharts

---

#### 4. Quick Actions
**Deskripsi**: Shortcut ke fitur penting.

**Actions**:
- New Transaction (POS)
- Add Menu Item
- Restock
- View Reports

**Komponen**: `components/dashboard/QuickActions.tsx`

---

## 📦 Stock Management

### Fitur Stock

#### 1. Stock Tracking
**Deskripsi**: Pelacakan stok real-time untuk semua menu items.

**Fitur**:
- Current stock quantity
- Minimum stock threshold
- Low stock alerts
- Out of stock indicators
- Stock tracking toggle per item
- Variant stock tracking

**Database Fields**:
- `stock_quantity`: Current available stock
- `min_stock`: Minimum threshold (default: 5)
- `track_stock`: Enable/disable tracking

**Alert Logic**:
- Low stock: `stock_quantity > 0 AND stock_quantity <= min_stock`
- Out of stock: `stock_quantity === 0`

---

#### 2. Stock Badge Notification
**Deskripsi**: Badge di navigation untuk menunjukkan stock alerts.

**Logic**:
- Hitung items dengan low stock
- Hitung items dengan out of stock
- Exclude items dengan variants (TODO: include variant aggregation)
- Display total count
- Animated pulse untuk attention

**Komponen**: `components/app-shell.tsx`

**Location**: Desktop dan mobile navigation

---

#### 3. Restock Management
**Deskripsi**: Tambah stok melalui restock dialog.

**Fitur**:
- Input restock quantity
- Select mutation type (purchase, adjustment)
- HPP price input (untuk COGS calculation)
- Notes untuk reference
- Auto-update stock quantity
- Create stock mutation record

**Mutation Types**:
- **purchase**: Pembelian baru
- **adjustment**: Penyesuaian manual

**Komponen**: `components/stock/restock-dialog.tsx`

**API**: POST `/api/stock/mutations`

**Flow**:
1. Validate input
2. Update `menu.stock_quantity`
3. Create `stock_mutations` record
4. Revalidate cache
5. Update badge count

---

#### 4. Stock Opname
**Deskripsi**: Physical stock count dan adjustment.

**Fitur**:
- Fetch current menu items
- Input actual count
- Auto-calculate difference
- Create opname mutation record
- Update stock to actual count

**Komponen**: `components/stock/stock-opname-dialog.tsx`

**API**: POST `/api/stock/mutations` (type='opname')

**Purpose**: Audit trail untuk stock discrepancies

---

#### 5. Stock History
**Deskripsi**: Riwayat pergerakan stok untuk audit trail.

**Fitur**:
- Filter by mutation type (all, in, out, adjustment, opname)
- Filter by date range
- Show mutation details:
  - Type (in/out/adjustment/opname)
  - Quantity change
  - Reference (purchase ID, transaction ID, etc.)
  - Notes
  - Created by
  - Timestamp
- Pagination untuk large datasets

**Komponen**: Integrated in stock page

**API**: GET `/api/stock/mutations?filters...`

**Mutation Types**:
- **in**: Stock increase (restock, purchase)
- **out**: Stock decrease (transaction)
- **adjustment**: Manual adjustment
- **opname**: Physical count adjustment

---

## 🍽️ Menu Management

### Fitur Menu

#### 1. Menu CRUD Operations
**Deskripsi**: Create, Read, Update, Delete menu items.

**Create**:
- Input nama menu
- Select category
- Set harga selling
- Set HPP (Harga Pokok Penjualan)
- Upload gambar
- Enable/disable stock tracking
- Set initial stock quantity
- Set minimum stock threshold

**Read**:
- List semua menu items
- Filter by category
- Search by name
- Sort by name, price, stock

**Update**:
- Edit semua field
- Update gambar
- Change category
- Adjust pricing
- Modify stock settings

**Delete**:
- Soft delete (deleted_at)
- Check if has transactions
- If has transactions: soft delete
- If no transactions: hard delete

**Komponen**: 
- `components/menu/add-menu-form.tsx`
- `components/menu/edit-menu-modal.tsx`
- `components/menu/delete-menu-dialog.tsx`
- `components/menu/menu-list.tsx`

**API**: 
- GET/POST `/api/rest/menu`
- PUT/DELETE `/api/rest/menu/[id]`

---

#### 2. Product Variants
**Deskripsi**: Manage product variants (size, color, etc.).

**Fitur**:
- Create variants untuk menu items
- Set variant-specific price
- Set variant-specific stock
- SKU (Stock Keeping Unit)
- Barcode untuk scanning
- Variant name (description)
- Enable/disable variants per item

**Variant Attributes System**:
- Define attributes (Size, Color, etc.)
- Define attribute values (Small, Medium, Large, Red, Blue, etc.)
- Map variants to attribute values

**Komponen**: 
- `components/menu/product-variants-manager.tsx`
- `components/menu/variant-attributes-manager.tsx`

**API**: 
- GET/POST `/api/rest/product_variants`
- PUT/DELETE `/api/rest/product_variants/[id]`
- GET/POST `/api/rest/variant_attributes`
- GET/POST `/api/rest/variant_attribute_values`

---

#### 3. Category Management
**Deskripsi**: Organize menu items into categories.

**Fitur**:
- Create categories
- Edit category name
- Set category icon
- Set category color
- Sort order (display sequence)
- Enable/disable categories
- Delete categories (check if used)

**Komponen**: `app/categories/page.tsx`

**API**: 
- GET/POST `/api/categories`
- PUT/DELETE `/api/categories/[id]`

**Default Categories**:
- Makanan
- Minuman
- Snack
- Dessert
- Lainnya

---

#### 4. Menu Detail View
**Deskripsi**: Detail view untuk menu item.

**Fitur**:
- Show all item information
- HPP dan margin calculation
- Stock status
- Variant list (jika ada)
- Stock mutation history
- Transaction history (future)

**Komponen**: `components/menu/menu-detail-modal.tsx`

**API**: GET `/api/rest/menu/[id]`

---

## 💰 Transaction Management

### Fitur Transactions

#### 1. Transaction History
**Deskripsi**: Daftar semua transaksi dengan filter dan pagination.

**Fitur**:
- List semua transactions
- Filter by date range
- Filter by payment method
- Filter by user/cashier
- Search by transaction number
- Pagination (10 items per page)
- Load more functionality
- Export to CSV/Excel

**Komponen**: `app/transactions/page.tsx`

**API**: GET `/api/rest/transactions?filters...`

**Pagination**:
- `limit`: Number of results (default: 10)
- `offset`: Pagination offset
- `hasMore`: Boolean for load more button

---

#### 2. Transaction Detail
**Deskripsi**: Detail lengkap untuk satu transaksi.

**Fitur**:
- Transaction information
- Line items dengan quantity dan price
- Tax dan service charge breakdown
- Payment method dan change
- Cashier information
- Timestamp
- Re-print receipt
- Void transaction (future)

**Komponen**: Integrated in transactions page

**API**: GET `/api/rest/transactions/[id]`

---

#### 3. Transaction Report
**Deskripsi**: Generate transaction report untuk export.

**Fitur**:
- Export to CSV
- Export to Excel
- Filter by date range
- Filter by payment method
- Filter by cashier
- Include/exclude line items

**API**: GET `/api/rest/transactions?export=true`

---

## 📈 Reports & Analytics

### Fitur Reports

#### 1. Profit Report
**Deskripsi**: Analisis profit berdasarkan HPP vs selling price.

**Metrics**:
- Total revenue
- Total COGS (Cost of Goods Sold)
- Gross profit
- Profit margin percentage
- Category-wise profit breakdown
- Top profitable items
- Least profitable items

**Calculation**:
```
COGS = Σ (item_quantity × item_hpp_price)
Gross Profit = Total Revenue - COGS
Profit Margin = (Gross Profit / Total Revenue) × 100
```

**Komponen**: `app/reports/profit/page.tsx`

**API**: GET `/api/rest/transactions?date_range=...`

**Date Filters**:
- Today
- Last 7 days
- Last 30 days
- Custom range

---

#### 2. Statistics Dashboard
**Deskripsi**: Dashboard analitik dengan charts dan tables.

**Charts**:
- Revenue trend (line chart)
- Category distribution (pie chart)
- Daily sales comparison (bar chart)

**Tables**:
- Top selling items
- Category performance
- Payment method distribution

**Metrics**:
- Total transactions
- Total revenue
- Average transaction value
- Peak hours (future)
- Customer demographics (future)

**Komponen**: `app/statistik/page.tsx`

**Sub-components**:
- `components/statistik/StatCard.tsx`
- `components/statistik/CategoryDistribution.tsx`
- `components/statistik/TopItemsTable.tsx`

**Library**: Recharts untuk charts

---

#### 3. Financial Report
**Deskripsi**: Laporan keuangan lengkap.

**Report Types**:
- Daily sales summary
- Monthly sales summary
- Profit & loss statement
- Tax report
- Payment method analysis

**API**: GET `/api/reports/financial?type=daily/monthly`

---

## ⚙️ Settings & Configuration

### Fitur Settings

#### 1. General Settings
**Deskripsi**: Pengaturan umum untuk cafe.

**Settings**:
- Cafe name
- Address
- Phone number
- Logo upload
- Business hours (future)

**Komponen**: `components/settings/general-settings.tsx`

**API**: GET/PUT `/api/cafe_settings/[id]`

---

#### 2. Tax & Service Charge
**Deskripsi**: Pengaturan pajak dan service charge.

**Settings**:
- Tax percentage (default: 10%)
- Service charge percentage (default: 5%)
- Currency (default: IDR)

**Calculation**:
```
Tax = Subtotal × (tax_percent / 100)
Service = Subtotal × (service_percent / 100)
Total = Subtotal + Tax + Service
```

**Komponen**: `components/settings/tax-calculation-settings.tsx`

---

#### 3. Notification Settings
**Deskripsi**: Pengaturan notifikasi push.

**Settings**:
- Enable/disable push notifications
- Low stock alerts
- Daily sales summary (future)
- Transaction alerts (future)

**Komponen**: `components/settings/notification-settings.tsx`

**API**: GET/PUT `/api/cafe_settings/[id]`

---

#### 4. Cashier Management
**Deskripsi**: Manajemen akun kasir.

**Fitur**:
- Create cashier accounts
- List all cashiers
- Activate/deactivate cashiers
- Reset cashier passwords
- View cashier activity (future)

**Komponen**: `components/settings/cashier-management.tsx`

**API**: POST `/api/create-cashier`

---

## 👥 User Management

### Fitur Users

#### 1. Authentication
**Deskripsi**: Sistem autentikasi user.

**Methods**:
- Email & password
- Google OAuth

**Flow**:
1. User enters credentials
2. API validates
3. Create session/JWT
4. Redirect to dashboard/pos
5. Set auth context

**API**: 
- POST `/api/auth/login`
- POST `/api/auth/google`
- POST `/api/auth/signup`
- POST `/api/auth/logout`

---

#### 2. Role-Based Access Control (RBAC)
**Deskripsi**: Kontrol akses berdasarkan peran user.

**Roles**:
- **Superadmin**: Full system access
  - Manage all cafes
  - Manage all users
  - System settings
  - View all data

- **Admin**: Cafe management access
  - Manage menu
  - Manage stock
  - View reports
  - Manage cashiers
  - Cafe settings

- **Cashier**: POS access only
  - Process transactions
  - View transaction history
  - View stock (read-only)

**Enforcement**:
- Route-level protection
- API-level authorization
- UI component hiding based on role

---

#### 3. User Approval Workflow
**Deskripsi**: Approval process untuk new users.

**Flow**:
1. User signs up
2. Status: `is_approved = false`
3. Redirect to pending approval page
4. Superadmin approves user
5. Status: `is_approved = true`
6. User can access system

**Komponen**: `app/pending-approval/page.tsx`

---

## 🔔 Notifications

### Fitur Notifications

#### 1. Push Notifications
**Deskripsi**: Web push notifications untuk alerts.

**Use Cases**:
- Low stock alerts
- Daily sales summary
- Transaction alerts (future)
- System announcements (future)

**Implementation**:
- Web Push API
- Service Worker registration
- Subscription management
- Payload encryption

**API**: 
- POST `/api/push-subscriptions`
- DELETE `/api/push-subscriptions/[id]`

---

#### 2. In-App Notifications
**Deskripsi**: Toast notifications untuk user feedback.

**Library**: Sonner

**Types**:
- Success (green)
- Error (red)
- Warning (yellow)
- Info (blue)

**Usage**:
- Operation success
- Validation errors
- API errors
- Stock alerts

---

## 🎨 UI/UX Features

### Responsive Design
**Deskripsi**: Optimal experience di semua device sizes.

**Breakpoints**:
- Mobile: 0-768px
- Tablet: 768-1024px
- Desktop: 1024px+

**Adaptive Components**:
- POS: Side-by-side (desktop), stacked (mobile)
- Cart: Panel (desktop), sticky bottom (mobile)
- Navigation: Sidebar (desktop), bottom bar (mobile)

---

### Dark Mode
**Deskripsi**: Theme switcher untuk dark/light mode.

**Implementation**:
- next-themes library
- System preference detection
- Manual toggle
- Persisted in localStorage

**Komponen**: `components/theme-toggle.tsx`

---

### Animations
**Deskripsi**: Smooth animations untuk better UX.

**Library**: Framer Motion

**Animations**:
- Page transitions
- Card hover effects
- Loading skeletons
- Modal open/close
- Toast notifications

---

### Loading States
**Deskripsi**: Loading indicators untuk async operations.

**Components**:
- Skeleton screens
- Spinner buttons
- Progress indicators
- Loading overlays

**Komponen**: `components/skeletons/`

---

## 🔐 Security Features

### Multi-Tenant Isolation
**Deskripsi**: Data separation antar cafe.

**Implementation**:
- Cafe-based data filtering
- User-cafe relationship
- API authorization checks
- Future: Row-Level Security (RLS)

---

### Audit Trail
**Deskripsi**: Tracking semua perubahan data.

**Implementation**:
- Version control pada semua tables
- Updated_at triggers
- Stock mutations complete history
- Transaction logs

---

### Data Validation
**Deskripsi**: Input validation untuk security.

**Validation**:
- Email format validation
- Password strength requirements
- Numeric field validation
- Required field validation
- SQL injection prevention

---

## 📱 PWA Features

### Progressive Web App
**Deskripsi**: Installable web app dengan offline capabilities.

**Features**:
- Install prompt
- Offline fallback (basic)
- App manifest
- Service worker registration
- Splash screen

**Komponen**:
- `components/pwa-register.tsx`
- `components/pwa-install-prompt.tsx`

---

## 🚀 Performance Features

### SWR Caching
**Deskripsi**: Client-side caching untuk performance.

**Strategy**:
- Deduplication interval: 60 detik
- Revalidate on focus: false
- Revalidate on reconnect: true
- Keep previous data: true

**Configurations**:
- Default config
- Transaction config (15s refresh)
- Static data config (5 min cache)

---

### Image Optimization
**Deskripsi**: Optimized image loading.

**Implementation**:
- Next.js Image component
- Lazy loading
- Responsive images
- WebP format
- CDN delivery (Vercel)

---

## 🔧 Developer Features

### Type Safety
**Deskripsi**: Full TypeScript coverage.

**Benefits**:
- Compile-time error checking
- Better IDE support
- Self-documenting code
- Refactoring safety

---

### Component Reusability
**Deskripsi**: Reusable component library.

**Library**: shadcn/ui

**Components**:
- Button, Input, Select
- Dialog, Modal, Sheet
- Table, Card, Badge
- Form components
- Data display components

---

### Error Handling
**Deskripsi**: Comprehensive error handling.

**Implementation**:
- Try-catch blocks
- Error boundaries
- User-friendly error messages
- Error logging
- Retry logic with exponential backoff

---

## 🎯 Future Features (Planned)

### Advanced Features
1. **Multi-Location Support**: Manage multiple cafe locations
2. **Advanced Analytics**: Trend forecasting, customer insights
3. **Integration**: Payment gateway, accounting software
4. **Mobile Apps**: Native iOS and Android applications
5. **Customer Management**: Customer profiles, loyalty programs
6. **Inventory Forecasting**: Predict stock needs
7. **Supplier Management**: Manage suppliers and purchase orders
8. **Staff Scheduling**: Employee scheduling and time tracking
9. **Advanced Reporting**: Custom report builder
10. **API Ecosystem**: Third-party integrations via API

---

## 📊 Feature Metrics

### Usage Metrics
- **POS Usage**: Transactions per day
- **Stock Management**: Stock updates per day
- **Menu Updates**: Menu changes per week
- **Report Generation**: Reports generated per month

### Performance Metrics
- **Transaction Speed**: Time from cart to receipt
- **Page Load Time**: Page load performance
- **API Response Time**: API endpoint performance
- **Cache Hit Rate**: SWR cache effectiveness

---

## 🎨 Feature Accessibility

### Accessibility Features
- Keyboard navigation
- Screen reader support
- High contrast mode (future)
- Font size adjustment (future)
- Color blind friendly (current)

---

## 🌐 Localization

### Current Support
- **Language**: Indonesian (primary)
- **Currency**: IDR (Indonesian Rupiah)
- **Timezone**: WIB (UTC+7)
- **Date Format**: Indonesian locale

### Future Support
- Multi-language support
- Multi-currency support
- Timezone selection

---

## 🎯 Conclusion

KasirKu menyediakan fitur komprehensif untuk sistem POS modern. Dari operasional dasar (POS, stock, menu) hingga analisis lanjutan (reports, statistics), setiap fitur dirancang untuk memudahkan pengelolaan bisnis dan memberikan insight berharga. Architecture yang modular dan scalable memungkinkan penambahan fitur baru tanpa mengganggu sistem yang sudah ada.

Fokus utama adalah:
1. **User Experience**: Intuitive, fast, responsive
2. **Data Integrity**: Accurate tracking, audit trail
3. **Performance**: Fast operations, efficient caching
4. **Scalability**: Multi-tenant, role-based access
5. **Reliability**: Error handling, data backup
