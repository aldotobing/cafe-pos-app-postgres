# KasirKu - Data Flow Documentation

## 🔄 Authentication Flow

### Login Flow

```
User enters credentials
    ↓
Login Form validates input
    ↓
POST /api/auth/login
    ↓
API Route validates credentials
    ↓
Database query: SELECT * FROM users WHERE email = ?
    ↓
Password verification (bcrypt)
    ↓
JWT/Session creation
    ↓
Set auth context
    ↓
Redirect to dashboard/pos
    ↓
Protected route checks auth
    ↓
Load user data and cafe settings
    ↓
Render authenticated page
```

### Google OAuth Flow

```
User clicks "Sign in with Google"
    ↓
Redirect to Google OAuth
    ↓
User grants permission
    ↓
Google redirects to callback
    ↓
POST /api/auth/google
    ↓
Verify Google token
    ↓
Check if user exists in database
    ↓
If not exists: Create new user
    ↓
Create session/JWT
    ↓
Set auth context
    ↓
Redirect to dashboard
```

### Logout Flow

```
User clicks logout
    ↓
Clear auth context
    ↓
Clear SWR cache
    ↓
Clear local storage
    ↓
Redirect to login page
```

## 🛒 Transaction Flow

### POS Transaction Flow

```
User selects menu item
    ↓
Add to cart (Context state)
    ↓
Update cart total
    ↓
User selects payment method
    ↓
User adds order note (optional)
    ↓
User clicks "Bayar & Cetak"
    ↓
Validate cart (not empty, stock available)
    ↓
Show loading state
    ↓
POST /api/rest/transactions
    ↓
API Route creates transaction record
    ↓
Database: INSERT INTO transactions
    ↓
Database: INSERT INTO transaction_items
    ↓
Database: UPDATE menu (decrease stock)
    ↓
Database: INSERT INTO stock_mutations
    ↓
Return transaction ID
    ↓
Clear cart (Context state)
    ↓
Redirect to /receipt/[id]
    ↓
Load transaction details
    ↓
Generate receipt
    ↓
Show receipt with print option
```

### Stock Validation Flow

```
User adds item to cart
    ↓
Check if item has variants
    ↓
If variants: Check variant stock
    ↓
If no variants: Check main item stock
    ↓
Validate: stock_quantity >= requested_qty
    ↓
If insufficient: Show error toast
    ↓
If sufficient: Add to cart
    ↓
Update stock badge count
```

### Receipt Generation Flow

```
User completes transaction
    ↓
Redirect to /receipt/[id]
    ↓
SWR fetch: GET /api/rest/transactions/[id]
    ↓
API Route queries transaction details
    ↓
Database: SELECT * FROM transactions WHERE id = ?
    ↓
Database: SELECT * FROM transaction_items WHERE transaction_id = ?
    ↓
Map snake_case to camelCase
    ↓
Calculate totals (subtotal, tax, service)
    ↓
Generate receipt HTML
    ↓
Show receipt in browser
    ↓
User clicks print
    ↓
Browser print dialog
```

## 📦 Stock Management Flow

### Restock Flow

```
User navigates to /stock
    ↓
Filter shows "low stock" items
    ↓
User clicks "Restock" on item
    ↓
Open RestockDialog
    ↓
User enters restock quantity
    ↓
User selects mutation type (purchase, adjustment)
    ↓
User adds notes (optional)
    ↓
User clicks "Simpan"
    ↓
POST /api/stock/mutations
    ↓
API Route validates input
    ↓
Database: UPDATE menu SET stock_quantity = stock_quantity + ?
    ↓
Database: INSERT INTO stock_mutations
    ↓
Return success
    ↓
SWR revalidate menu data
    ↓
Update stock badge count
    ↓
Close dialog
    ↓
Show success toast
```

### Stock Opname Flow

```
User navigates to /stock
    ↓
User clicks "Stock Opname"
    ↓
Open StockOpnameDialog
    ↓
Fetch current menu items
    ↓
User enters actual stock count
    ↓
System calculates difference
    ↓
User confirms opname
    ↓
POST /api/stock/mutations
    ↓
Database: UPDATE menu SET stock_quantity = ?
    ↓
Database: INSERT INTO stock_mutations (type='opname')
    ↓
Return success
    ↓
SWR revalidate menu data
    ↓
Update stock badge count
    ↓
Show success toast
```

### Stock Mutation History Flow

```
User navigates to /stock
    ↓
User clicks "Riwayat Stok"
    ↓
Toggle history view
    ↓
Fetch stock mutations
    ↓
GET /api/stock/mutations?menu_id=?
    ↓
API Route queries stock_mutations table
    ↓
Database: SELECT * FROM stock_mutations WHERE menu_id = ?
    ↓
Filter by mutation type (all, in, out, adjustment, opname)
    ↓
Display mutations in table
    ↓
Show mutation details (type, quantity, notes, created_by)
```

## 🍽️ Menu Management Flow

### Add Menu Item Flow

```
User navigates to /menu
    ↓
User clicks "Tambah Menu"
    ↓
Open AddMenuForm
    ↓
User enters item details
    ↓
User selects category
    ↓
User uploads image (optional)
    ↓
User sets price and HPP
    ↓
User enables stock tracking
    ↓
User sets initial stock quantity
    ↓
User clicks "Simpan"
    ↓
POST /api/rest/menu
    ↓
API Route validates input
    ↓
Database: INSERT INTO menu
    ↓
Return new menu item
    ↓
SWR revalidate menu data
    ↓
Close form
    ↓
Show success toast
```

### Edit Menu Item Flow

```
User navigates to /menu
    ↓
User clicks "Edit" on item
    ↓
Open EditMenuModal
    ↓
Fetch current item details
    ↓
SWR: GET /api/rest/menu/[id]
    ↓
Populate form with current data
    ↓
User modifies fields
    ↓
User clicks "Simpan"
    ↓
PUT /api/rest/menu/[id]
    ↓
API Route validates input
    ↓
Database: UPDATE menu SET ...
    ↓
Trigger: UPDATE updated_at, increment version
    ↓
Return updated item
    ↓
SWR revalidate menu data
    ↓
Close modal
    ↓
Show success toast
```

### Delete Menu Item Flow

```
User navigates to /menu
    ↓
User clicks "Hapus" on item
    ↓
Open DeleteMenuDialog
    ↓
Show confirmation dialog
    ↓
User confirms deletion
    ↓
DELETE /api/rest/menu/[id]
    ↓
API Route checks if item has transactions
    ↓
If has transactions: Soft delete (deleted_at = NOW())
    ↓
If no transactions: Hard delete
    ↓
Database: DELETE FROM menu WHERE id = ?
    ↓
Return success
    ↓
SWR revalidate menu data
    ↓
Close dialog
    ↓
Show success toast
```

### Product Variants Flow

```
User navigates to /menu
    ↓
User clicks "Variants" on item
    ↓
Open ProductVariantsManager
    ↓
Fetch existing variants
    ↓
GET /api/rest/product_variants?menu_id=?
    ↓
Display variants in table
    ↓
User clicks "Tambah Variant"
    ↓
User enters variant details
    ↓
User sets variant-specific price
    ↓
User sets variant-specific stock
    ↓
POST /api/rest/product_variants
    ↓
Database: INSERT INTO product_variants
    ↓
Database: UPDATE menu SET has_variants = 1
    ↓
SWR revalidate menu data
    ↓
Update variant list
    ↓
Show success toast
```

## 📊 Reporting Flow

### Profit Report Flow

```
User navigates to /reports/profit
    ↓
User selects date range
    ↓
Quick filter buttons (Today, 7 Days, 30 Days)
    ↓
Or custom date picker
    ↓
SWR: GET /api/rest/transactions?cafe_id=X&date_from=Y&date_to=Z
    ↓
API Route queries transactions
    ↓
Database: SELECT * FROM transactions WHERE cafe_id = ? AND created_at BETWEEN ? AND ?
    ↓
Map snake_case to camelCase
    ↓
Calculate profit metrics:
    - Total revenue
    - Total COGS (HPP × quantity)
    - Gross profit
    - Profit margin
    - Category breakdown
    - Top items
    ↓
Display in charts and tables
    ↓
User can export report
    ↓
Generate PDF/Excel
```

### Statistics Flow

```
User navigates to /statistik
    ↓
User selects date range (default: last 30 days)
    ↓
SWR: GET /api/rest/transactions?cafe_id=X&date_from=Y&date_to=Z
    ↓
API Route queries transactions
    ↓
Calculate statistics:
    - Total transactions
    - Total revenue
    - Average transaction value
    - Category distribution
    - Top selling items
    - Weekly revenue trend
    ↓
Display in charts:
    - Revenue line chart
    - Category pie chart
    - Top items table
    ↓
User can filter by category
    ↓
Real-time chart updates
```

### Transaction Report Flow

```
User navigates to /transactions
    ↓
User selects date range
    ↓
User filters by payment method
    ↓
User filters by user/cashier
    ↓
SWR: GET /api/rest/transactions?filters...
    ↓
API Route applies filters
    ↓
Database: SELECT * FROM transactions WHERE ...
    ↓
Paginate results (limit=10, offset=0)
    ↓
Display transaction list
    ↓
User clicks "Load More"
    ↓
Fetch next page (offset += 10)
    ↓
Append to list
    ↓
User clicks "Export"
    ↓
Generate transaction report
    ↓
Download CSV/Excel
```

## 🔔 Notification Flow

### Push Notification Flow

```
System triggers notification event
    ↓
Check user's push subscriptions
    ↓
GET /api/push-subscriptions?user_id=?
    ↓
Database: SELECT * FROM push_subscriptions WHERE user_id = ?
    ↓
For each subscription:
    ↓
Send push notification via Web Push API
    ↓
User's browser receives notification
    ↓
Show notification toast
    ↓
User clicks notification
    ↓
Navigate to relevant page
```

### Stock Alert Flow

```
Stock quantity drops below min_stock
    ↓
Trigger: AFTER UPDATE ON menu
    ↓
Check: stock_quantity <= min_stock
    ↓
If true: Generate alert event
    ↓
Check cafe settings for notifications
    ↓
If enabled: Send push notification
    ↓
Update stock badge count
    ↓
Show low stock alert in UI
```

## 🔐 Authorization Flow

### Route Protection Flow

```
User navigates to protected route
    ↓
useAuth hook checks authentication
    ↓
If not authenticated:
    ↓
Redirect to /login
    ↓
If authenticated:
    ↓
Check user approval status
    ↓
If not approved:
    ↓
Redirect to /pending-approval
    ↓
If approved:
    ↓
Check user role
    ↓
If cashier: Check cafe_id assignment
    ↓
If no cafe_id: Redirect to /login
    ↓
If admin: Check cafe_id assignment
    ↓
If no cafe_id: Redirect to /create-cafe
    ↓
If cafe_id exists: Allow access
    ↓
Load cafe-specific data
    ↓
Render protected page
```

### Data Access Control Flow

```
User requests data (e.g., transactions)
    ↓
useTransactions hook with cafe_id
    ↓
SWR: GET /api/rest/transactions?cafe_id=X
    ↓
API Route checks user's cafe_id
    ↓
Compare with requested cafe_id
    ↓
If mismatch: Return 403 Forbidden
    ↓
If match: Query database
    ↓
Database: SELECT * FROM transactions WHERE cafe_id = ?
    ↓
Apply RLS policies (if implemented)
    ↓
Return filtered data
    ↓
User sees only their cafe's data
```

## 🔄 Sync Flow

### Data Synchronization Flow

```
Client requests data
    ↓
SWR checks cache
    ↓
If cache hit and fresh:
    ↓
Return cached data
    ↓
If cache miss or stale:
    ↓
Fetch from API
    ↓
API Route queries database
    ↓
Database returns data with version
    ↓
Compare with cached version
    ↓
If version changed: Update cache
    ↓
If version same: Keep cache
    ↓
Return data to client
    ↓
Update UI
```

### Background Sync Flow

```
User makes changes (e.g., update menu item)
    ↓
Optimistic update: Update UI immediately
    ↓
API call: PUT /api/rest/menu/[id]
    ↓
Database: UPDATE menu SET ...
    ↓
Trigger: Increment version
    ↓
Return updated data
    ↓
SWR revalidate cache
    ↓
Update other clients via sync
    ↓
Consistent state across all clients
```

## 🎨 UI State Flow

### Component State Flow

```
Component mounts
    ↓
useEffect runs
    ↓
Fetch initial data
    ↓
Set loading state
    ↓
Data arrives
    ↓
Set data state
    ↓
Clear loading state
    ↓
Render component with data
    ↓
User interacts
    ↓
Update local state
    ↓
Re-render component
    ↓
API call (if needed)
    ↓
Update server state
    ↓
SWR revalidates
    ↓
Update component state
    ↓
Re-render with new data
```

### Form State Flow

```
User opens form
    ↓
Initialize form state (default values)
    ↓
User enters data
    ↓
Form validation (on change)
    ↓
Update form state
    ↓
User submits form
    ↓
Form validation (on submit)
    ↓
If invalid: Show errors
    ↓
If valid: Submit to API
    ↓
API processes request
    ↓
Return response
    ↓
If success: Clear form, show success
    ↓
If error: Show error, keep form data
```

## 📱 Responsive Flow

### Desktop to Mobile Flow

```
User on desktop (>1024px)
    ↓
Render desktop layout
    ↓
Side-by-side: Menu grid + Cart panel
    ↓
User resizes window to mobile (<768px)
    ↓
React re-renders
    ↓
Switch to mobile layout
    ↓
Stacked: Menu grid + Mobile cart (sticky bottom)
    ↓
Hide desktop cart panel
    ↓
Show mobile cart button
    ↓
User opens mobile cart
    ↓
Slide-up cart panel
    ↓
Same functionality, different layout
```

## 🔧 Error Handling Flow

### API Error Flow

```
User action triggers API call
    ↓
API call fails
    ↓
Catch error in try/catch
    ↓
Log error details
    ↓
Show user-friendly error message
    ↓
Offer retry option
    ↓
If retry: Re-attempt API call
    ↓
If cancel: Keep current state
    ↓
SWR error boundary catches error
    ↓
Show fallback UI
    ↓
Allow recovery action
```

### Database Error Flow

```
API Route attempts database operation
    ↓
Database operation fails
    ↓
Catch database error
    ↓
Log error with context
    ↓
Return appropriate HTTP status:
    - 400: Bad request (validation error)
    - 404: Not found
    - 409: Conflict (duplicate)
    - 500: Server error
    ↓
Client receives error response
    ↓
SWR onError callback
    ↓
Show error toast
    ↓
Keep UI in consistent state
```

## 🎯 Conclusion

Data flows in KasirKu are designed for reliability, performance, and user experience. The separation of concerns, proper error handling, and optimistic updates ensure smooth user interactions while maintaining data consistency. The SWR caching strategy reduces API calls and provides responsive UI, while the multi-layer validation ensures data integrity throughout the application.
