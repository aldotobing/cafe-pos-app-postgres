# KasirKu - Architecture Overview

## 🏗️ System Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Client Layer                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   Desktop    │  │   Mobile     │  │   Tablet     │          │
│  │   Browser    │  │   Browser    │  │   Browser    │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ HTTPS
                              │
┌─────────────────────────────────────────────────────────────────┐
│                      Application Layer                           │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │              Next.js 16 (App Router)                      │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐      │  │
│  │  │   Pages     │  │ Components  │  │   Hooks     │      │  │
│  │  │  (app/*)    │  │ (components)│  │  (hooks/*)  │      │  │
│  │  └─────────────┘  └─────────────┘  └─────────────┘      │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐      │  │
│  │  │   API       │  │   Context   │  │   Utils     │      │  │
│  │  │ (app/api/*) │  │ (contexts/*)│  │  (lib/*)    │      │  │
│  │  └─────────────┘  └─────────────┘  └─────────────┘      │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ REST API
                              │
┌─────────────────────────────────────────────────────────────────┐
│                       Data Layer                                  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                    Supabase (PostgreSQL)                     │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐      │  │
│  │  │   Tables    │  │   Indexes   │  │  Triggers   │      │  │
│  │  │  (10+ tables)│  │ (15+ indexes)│  │ (4 triggers) │      │  │
│  │  └─────────────┘  └─────────────┘  └─────────────┘      │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐      │  │
│  │  │    Views    │  │ Functions   │  │  RLS Policies│      │  │
│  │  │  (1 view)   │  │  (RPC)      │  │  (security) │      │  │
│  │  └─────────────┘  └─────────────┘  └─────────────┘      │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

## 🎯 Technology Stack

### Frontend Stack
- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: TailwindCSS + shadcn/ui
- **State Management**: React Context + SWR
- **Animations**: Framer Motion
- **Forms**: React Hook Form
- **Icons**: Lucide React
- **Notifications**: Sonner (Toast)
- **Charts**: Recharts

### Backend Stack
- **Runtime**: Node.js (Next.js Server)
- **API**: REST API (Next.js API Routes)
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Custom Auth + Google OAuth
- **File Upload**: Supabase Storage
- **Caching**: SWR (Client-side caching)

### Infrastructure
- **Hosting**: Vercel (Frontend)
- **Database**: Supabase (PostgreSQL)
- **Storage**: Supabase Storage
- **CDN**: Vercel Edge Network
- **SSL/TLS**: Automatic (Vercel + Supabase)

## 📁 Project Structure

```
kasirku/
├── app/                          # Next.js App Router
│   ├── (auth)/                   # Auth routes
│   │   ├── login/
│   │   └── signup/
│   ├── dashboard/                # Dashboard page
│   ├── pos/                      # POS system
│   ├── stock/                    # Stock management
│   ├── menu/                     # Menu management
│   ├── transactions/             # Transaction history
│   ├── reports/                  # Reports
│   │   └── profit/
│   ├── statistik/                # Statistics
│   ├── categories/               # Category management
│   ├── settings/                 # Settings
│   ├── receipt/                  # Receipt generation
│   ├── api/                      # API routes
│   │   ├── rest/                 # REST API endpoints
│   │   ├── auth/                 # Authentication
│   │   ├── stock/                # Stock operations
│   │   └── cafe_settings/        # Settings API
│   ├── layout.tsx                # Root layout
│   └── page.tsx                  # Landing page
├── components/                   # React components
│   ├── app-shell.tsx             # Main app shell
│   ├── pos/                      # POS components
│   ├── menu/                     # Menu components
│   ├── stock/                    # Stock components
│   ├── dashboard/                # Dashboard components
│   ├── settings/                 # Settings components
│   ├── statistik/                # Statistics components
│   └── ui/                       # shadcn/ui components
├── hooks/                        # Custom React hooks
│   ├── use-cafe-data.ts          # Data fetching hooks
│   └── use-swr.ts                # SWR hooks
├── lib/                          # Utility libraries
│   ├── api.ts                    # API client
│   ├── auth-context.ts           # Auth context
│   ├── swr-config.ts             # SWR configuration
│   ├── format.ts                 # Formatting utilities
│   └── utils.ts                  # General utilities
├── contexts/                     # React contexts
│   └── cart-context.ts           # Shopping cart context
├── types/                        # TypeScript types
│   └── types.ts                  # Shared types
├── migrations/                   # Database migrations
│   ├── 0001_sync_architecture.sql
│   ├── 0002_sync_indexes.sql
│   └── ...
├── schema.sql                    # Database schema
├── docs/                         # Documentation
└── public/                       # Static assets
```

## 🔧 Component Architecture

### Component Hierarchy

```
AppShell (Root Component)
├── Header
│   ├── Logo
│   ├── Navigation
│   ├── Stock Badge
│   └── User Dropdown
├── Main Content
│   ├── Dashboard Page
│   │   ├── DashboardHeader
│   │   ├── QuickActions
│   │   ├── RecentTransactions
│   │   └── WeeklySummary
│   ├── POS Page
│   │   ├── MenuGrid
│   │   ├── CartPanel (Desktop)
│   │   └── MobileCart (Mobile)
│   ├── Stock Page
│   │   ├── StockList
│   │   ├── RestockDialog
│   │   └── StockOpnameDialog
│   ├── Menu Page
│   │   ├── AddMenuForm
│   │   ├── MenuList
│   │   ├── EditMenuModal
│   │   └── ProductVariantsManager
│   └── Transactions Page
│       ├── TransactionList
│       └── TransactionFilters
└── Footer
```

### Component Patterns

1. **Page Components** - Route-level components in `app/`
2. **Feature Components** - Business logic components in `components/`
3. **UI Components** - Reusable UI components in `components/ui/`
4. **Layout Components** - Layout wrappers in `components/`
5. **Shared Components** - Cross-feature components

## 🔄 Data Flow Architecture

### Client-Side Data Flow

```
User Action → Component → Context/State → API Call → SWR Cache → UI Update
     ↓            ↓           ↓              ↓          ↓          ↓
   Click     useState   Context      fetch()     Cache    re-render
```

### Server-Side Data Flow

```
API Request → API Route → Validation → Database → Response → Client
      ↓            ↓          ↓           ↓          ↓          ↓
    fetch()   route.ts   schema check  Supabase   JSON     SWR update
```

### State Management Architecture

1. **Global State** - React Context (Auth, Cart)
2. **Server State** - SWR (Menu, Transactions, Settings)
3. **Local State** - useState (Form inputs, UI state)
4. **URL State** - URL params (Filters, pagination)

## 🔐 Security Architecture

### Authentication Flow

```
User → Login Form → API Auth Route → Database → JWT/Session → Context → Protected Routes
  ↓         ↓              ↓            ↓          ↓           ↓          ↓
Input   Validation     Verify Creds  Check User  Create Token  Set Auth  Redirect
```

### Authorization Architecture

1. **Role-Based Access Control (RBAC)**
   - Superadmin: Full system access
   - Admin: Cafe management access
   - Cashier: POS access only

2. **Multi-Tenant Isolation**
   - Cafe-based data separation
   - User-cafe relationship enforcement
   - Row-Level Security (RLS) policies

3. **API Security**
   - Request validation
   - SQL injection prevention
   - XSS protection
   - CSRF protection

## 📊 Data Architecture

### Database Schema Architecture

```
Cafes (Multi-tenant root)
├── Users (Multi-role users)
│   ├── Cafe Settings (Configuration)
│   ├── Menu (Products)
│   │   ├── Product Variants (SKU/Barcode)
│   │   └── Categories (Classification)
│   ├── Transactions (Sales)
│   │   └── Transaction Items (Line items)
│   ├── Stock Mutations (Inventory tracking)
│   └── Push Subscriptions (Notifications)
```

### Data Relationships

1. **One-to-Many**
   - Cafe → Users
   - Cafe → Menu
   - Cafe → Transactions
   - Menu → Product Variants
   - Menu → Stock Mutations

2. **Many-to-One**
   - Users → Cafe
   - Menu → Category
   - Transactions → Cafe
   - Transaction Items → Transactions

3. **Many-to-Many** (via junction tables)
   - Menu ↔ Attributes (via variant_attribute_mappings)

## 🚀 Performance Architecture

### Caching Strategy

1. **Client-Side Caching** - SWR with deduplication
2. **API Response Caching** - Next.js API route caching
3. **Database Caching** - Supabase query caching
4. **Static Asset Caching** - Vercel CDN

### Optimization Strategies

1. **Code Splitting** - Next.js automatic code splitting
2. **Lazy Loading** - Component lazy loading
3. **Image Optimization** - Next.js Image component
4. **Bundle Optimization** - Tree shaking, minification

### Database Optimization

1. **Indexing Strategy** - Covering indexes for common queries
2. **Query Optimization** - Efficient SQL queries
3. **Connection Pooling** - Supabase connection pooling
4. **Materialized Views** - Pre-computed aggregations

## 🔄 Sync Architecture

### Data Synchronization

```
Client → SWR Cache → API → Database → Triggers → Version Control → Sync API → Client
  ↓         ↓          ↓      ↓          ↓              ↓              ↓
Action   Cache Hit   Fetch  Update     Update Timestamp  Check Version  Revalidate
```

### Sync Mechanism

1. **Optimistic Updates** - UI updates immediately
2. **Background Sync** - SWR revalidation
3. **Conflict Resolution** - Version-based conflict detection
4. **Error Recovery** - Automatic retry with exponential backoff

## 📱 Responsive Architecture

### Breakpoint Strategy

```css
/* Mobile First Approach */
Mobile: 0-768px
Tablet: 768-1024px
Desktop: 1024px+
```

### Adaptive Components

1. **Desktop Layout** - Side-by-side menu and cart
2. **Mobile Layout** - Stacked layout with sticky cart
3. **Responsive Components** - Adaptive UI based on screen size
4. **Touch Optimization** - Mobile-friendly interactions

## 🔌 Integration Architecture

### External Integrations

1. **Authentication** - Google OAuth
2. **Storage** - Supabase Storage
3. **Notifications** - Web Push API
4. **Analytics** - Vercel Analytics

### API Integration Points

1. **Supabase Client** - Direct database access
2. **REST API** - Custom API routes
3. **RPC Functions** - Database functions
4. **Realtime Subscriptions** - Real-time updates

## 🛠️ Development Architecture

### Development Workflow

```
Development → Testing → Deployment → Monitoring
     ↓           ↓          ↓           ↓
Local Dev  Unit Tests  Vercel    Analytics
```

### Code Organization

1. **Feature-Based** - Components organized by feature
2. **Type-Safe** - Full TypeScript coverage
3. **DRY Principles** - Reusable components and utilities
4. **Separation of Concerns** - Clear boundaries between layers

## 📈 Scalability Architecture

### Horizontal Scaling

1. **Serverless Architecture** - Auto-scaling with Vercel
2. **Database Scaling** - Supabase auto-scaling
3. **CDN Distribution** - Global edge network
4. **Load Balancing** - Automatic load distribution

### Vertical Scaling

1. **Database Optimization** - Query optimization, indexing
2. **Code Optimization** - Performance profiling
3. **Resource Optimization** - Memory and CPU efficiency
4. **Caching Layers** - Multi-level caching strategy

## 🔍 Monitoring Architecture

### Application Monitoring

1. **Performance Monitoring** - Vercel Analytics
2. **Error Tracking** - Console logging
3. **User Analytics** - Usage tracking
4. **System Health** - Uptime monitoring

### Database Monitoring

1. **Query Performance** - Slow query logging
2. **Connection Monitoring** - Connection pool metrics
3. **Storage Monitoring** - Database size tracking
4. **Backup Monitoring** - Backup verification

## 🎨 UI/UX Architecture

### Design System

1. **Component Library** - shadcn/ui components
2. **Design Tokens** - TailwindCSS configuration
3. **Icon System** - Lucide React icons
4. **Color Palette** - Consistent color scheme

### User Experience

1. **Progressive Enhancement** - Core features first
2. **Graceful Degradation** - Fallback for older browsers
3. **Accessibility** - WCAG compliance
4. **Performance** - Fast load times, smooth interactions

## 🔧 Maintenance Architecture

### Code Maintenance

1. **Type Safety** - TypeScript for compile-time checks
2. **Linting** - ESLint for code quality
3. **Formatting** - Prettier for code consistency
4. **Documentation** - Inline code comments

### System Maintenance

1. **Database Migrations** - Version-controlled schema changes
2. **Dependency Updates** - Regular package updates
3. **Security Patches** - Prompt security updates
4. **Backup Strategy** - Automated backups with retention

## 🎯 Conclusion

KasirKu architecture is designed for scalability, maintainability, and performance. The modular component structure, clear separation of concerns, and modern tech stack provide a solid foundation for growth and evolution. The multi-tenant architecture with proper security measures ensures data isolation and compliance while maintaining excellent user experience across all devices.
