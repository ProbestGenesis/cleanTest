
## Current State Analysis

| Item | Status | Details |
|------|--------|---------|
| **Schema** | PARTIAL | PurchaseItem model exists but old Purchase fields (productId, provider, date, etc.) remain. Syntax error on line 943. |
| **Backend Actions** | OUTDATED | `createPurchase.ts`, `updatePurchaseProgress.ts` still use old structure with individual product fields instead of PurchaseItem. |
| **UI Module** | NOT STARTED | No purchase management page/components exist yet. |
| **Design Pattern** | TO FOLLOW | Will use stock page pattern: horizontal scrollable cards + tabs (tabs at bottom like stock module). |
| **Database Safety** | CRITICAL | Must not break existing data or code during migration. |

---

## Phase 1: Schema Refinement & Database Safety

### 1.1 Schema Updates (prisma/schema.prisma)

**Objective:** Clean up Purchase model by consolidating fields, fixing syntax errors, and ensuring backward compatibility.

**Changes Required:**
- Remove deprecated field: `productId` from Purchase
- Fix syntax error on line 943: `purchaseItems PurchaseItem[])` → `purchaseItems PurchaseItem[]`
- Consolidate old provider/product fields into PurchaseItem structure
- Ensure all payment tracking fields (totalAmount, amountPaid, isPaid, dueDate, paymentDate) are properly defined
- Add missing fields from createPurchase action usage (category, brand, country, unity, description, etc.) to either Purchase or PurchaseItem

**New Schema Structure:**
```
Purchase (header/transaction level):
├── id, createdAt, updatedAt
├── providerId, provider (relation)
├── authorId, author (relation)
├── status (PurchaseStatus)
├── totalAmount, amountPaid, isPaid
├── dueDate, paymentDate, invoiceNumber
├── purchaseDate
├── purchaseItems[] (relation)
├── stockEditHistorique[], providerPayment[] (relations)
└── projectId (optional)

PurchaseItem (line item level):
├── id, purchaseId, purchase (relation)
├── productId, product (optional relation)
├── productName, quantity, unitPrice, totalPrice
├── createdAt, updatedAt
└── Additional metadata (designation, category, brand, etc.)
```

**Action:** Run `bun prisma migrate dev` to generate migration and apply changes.

---

## Phase 2: Backend API Routes & Actions

### 2.1 Update Server Actions

**Files to Refactor:**
- `lib/actions/purchase/createPurchase.ts` - Use PurchaseItem structure
- `lib/actions/purchase/updatePurchaseProgress.ts` - Update purchase-level fields only
- `lib/actions/purchase/markPurchaseDelivered.ts` - Reference purchase items
- `lib/actions/purchase/confirmPurchaseOperation.ts` - Handle PurchaseItem confirmations
- `lib/actions/purchase/verifyPurchaseValidationCode.ts` - Verify with PurchaseItem structure

**Key Refactoring Points:**
- createPurchase: Create Purchase with totalAmount, then create PurchaseItems for each product
- updatePurchaseProgress: Update payment fields (amountPaid, dueDate) at Purchase level, not Product level
- Payment creation: Use ProviderPayment model with reference to Purchase
- Validation: Ensure PurchaseItem quantity matches received quantity tracking

### 2.2 Create New API Routes (app/api/)

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/purchases` | GET | List purchases with filters (provider, status, date range) |
| `/api/purchases` | POST | Create new purchase |
| `/api/purchases/[id]` | GET | Get purchase details with items |
| `/api/purchases/[id]` | PUT | Update purchase (status, payment) |
| `/api/purchases/[id]` | DELETE | Delete purchase (soft delete/cancel) |
| `/api/purchases/[id]/items` | GET | Get purchase items |
| `/api/purchases/[id]/items` | POST | Add item to purchase |
| `/api/purchases/[id]/items/[itemId]` | PUT | Update purchase item |
| `/api/purchases/[id]/items/[itemId]` | DELETE | Remove purchase item |
| `/api/providers/[id]/kpis` | GET | Get supplier KPIs (on-time delivery, total spend, etc.) |
| `/api/purchases/[id]/payment` | POST | Record payment for purchase |
| `/api/purchases/alerts/due-dates` | GET | Get pending payment alerts |

---

## Phase 3: Frontend Components & Pages

### 3.1 Component Structure

```
components/purchases/
├── PurchaseOverview.tsx          // Summary cards row
├── PurchaseTabs.tsx               // Main tabs container
├── PurchaseList.tsx               // Tab: List view with table/filters
├── PurchaseDetail.tsx             // Tab: Detail view with items
├── PurchaseForm.tsx               // Tab: Create/Edit form
├── PurchasePayment.tsx            // Tab: Payment management
├── SupplierKPIs.tsx               // Tab: KPI dashboard
├── AlertsDashboard.tsx            // Tab: Due date alerts
├── cards/
│   ├── StatsCard.tsx              // Reusable metric card
│   ├── PurchaseCard.tsx           // Single purchase summary
│   └── AlertCard.tsx              // Due date alert card
└── forms/
    ├── CreatePurchaseForm.tsx     // Multi-step form
    └── PaymentForm.tsx            // Record payment form
```

### 3.2 Layout Pattern (Inspired by Stock Module)

```
┌─────────────────────────────────────────────────┐
│  CORPORATE HEADER                                │
├─────────────────────────────────────────────────┤
│                                                  │
│  📊 Stats Row (Scrollable Cards)                 │
│  ┌─────────┬─────────┬─────────┬─────────┐     │
│  │ Total $ │ Pending │ Paid %  │ Alerts  │ >>> │
│  └─────────┴─────────┴─────────┴─────────┘     │
│                                                  │
│  ┌──────────────────────────────────────────┐  │
│  │ [Inventory] [History] [Payments] [KPIs]  │  │
│  │ [Alerts]                                 │  │ ← Tabs at bottom
│  ├──────────────────────────────────────────┤  │
│  │ TAB CONTENT                              │  │
│  │                                          │  │
│  └──────────────────────────────────────────┘  │
│                                                  │
└─────────────────────────────────────────────────┘
```

### 3.3 Tabs Content

| Tab | Purpose | Components |
|-----|---------|------------|
| **List** | View all purchases with filtering/sorting | DataTable, Filters, Pagination |
| **Details** | View single purchase with line items | PurchaseDetail, ItemsTable, Status |
| **Forms** | Create/Edit purchases | Multi-step form, Item selector |
| **Payments** | Record & track payments | PaymentForm, PaymentHistory |
| **KPIs** | Supplier performance metrics | Charts (Recharts), Metrics |
| **Alerts** | Due payment dates | Alert cards, Priority sorting |

---

## Phase 4: Design Tokens & Styling

### 4.1 Corporate Design Elements

**Color Palette:**
- Primary: Professional blue (#2563EB or similar)
- Success: Green (#10B981)
- Warning: Amber (#F59E0B)
- Danger: Red (#EF4444)
- Neutral: Gray scales

**Typography:**
- Headings: Bold, consistent sizing
- Body: Clean, readable sans-serif
- Numbers/Metrics: Monospace for clarity

**Components Styling:**
- Cards: Subtle shadow, rounded corners (shadcn defaults)
- Buttons: Consistent padding, clear focus states
- Tables: Zebra striping, hover effects
- Status badges: Color-coded (CONFIRMED=blue, DELIVERED=green, PAYMENT_DONE=green)

### 4.2 Design Tokens Location
- Update or create `globals.css` with Tailwind v4 layers
- Add custom utilities for metric displays
- Use shadcn theme variables

---

## Phase 5: Data Fetching & State Management

### 5.1 TanStack Query Hooks

| Hook | Purpose |
|------|---------|
| `usePurchases()` | Fetch paginated purchases list |
| `usePurchaseDetail(id)` | Fetch single purchase with items |
| `useProviderKPIs(providerId)` | Fetch supplier KPIs |
| `useDuePaymentAlerts()` | Fetch pending payment alerts |
| `useCreatePurchase()` | Mutation for creating purchase |
| `useUpdatePurchase(id)` | Mutation for updating purchase |
| `useRecordPayment(purchaseId)` | Mutation for recording payment |

### 5.2 Zustand Store (if needed)
- Filter/sort state for purchase list
- Form state for multi-step purchase creation
- Selected purchase for detail view

---

## Phase 6: Validation & Data Integrity

### 6.1 Zod Schemas Update

**Required Schemas:**
- `PurchaseSchema` - Updated for new structure
- `PurchaseItemSchema` - New schema for line items
- `PaymentSchema` - For recording payments
- `ProviderSchema` - For supplier info

### 6.2 Business Logic Validations
- PurchaseItem quantity must be > 0
- Total amount = sum of (quantity × unitPrice) across items
- amountPaid ≤ totalAmount
- dueDate must be future date for pending purchases

---

## Phase 7: KPIs & Metrics Calculation

### 7.1 Supplier KPI Metrics

```
For each Provider:
├── Total Purchases (count)
├── Total Spent (sum of totalAmount)
├── Average Purchase Value
├── Payment Performance
│   ├── On-Time Rate (%)
│   └── Average Payment Delay (days)
├── Delivery Performance
│   ├── On-Time Delivery Rate (%)
│   └── Average Delivery Time
└── Product Quality
    ├── Return Rate (%)
    └── Issue Count
```

### 7.2 Dashboard Metrics
- Total Purchase Budget (Month/Year)
- Outstanding Payments (overdue + due soon)
- Top Suppliers (by spend)
- Payment Status Breakdown (Pie chart)
- Spending Trend (Line chart)

---

## Implementation Sequence

```
1. Schema Fix (30 min)
   ↓
2. Database Migration (15 min)
   ↓
3. Server Actions Refactor (2 hrs)
   ↓
4. API Routes (1.5 hrs)
   ↓
5. Zod Schemas (45 min)
   ↓
6. UI Components (3 hrs)
   ├── Overview cards
   ├── Tabs structure
   ├── List/Detail views
   └── Forms
   ↓
7. Data Hooks & TanStack Query (1.5 hrs)
   ↓
8. KPI Calculations & Charts (1.5 hrs)
   ↓
9. Styling & Polish (1 hr)
   ↓
10. Testing & Edge Cases (1 hr)
```

---

## Definition of Done

- [ ] Prisma schema updated with PurchaseItem structure, no productId on Purchase
- [ ] Database migration applied successfully without data loss
- [ ] All purchase server actions refactored to use PurchaseItem
- [ ] API routes created and tested for CRUD operations
- [ ] UI page with tabs pattern implemented (following stock module)
- [ ] Corporate design applied consistently across all components
- [ ] TanStack Query hooks for all data fetching scenarios
- [ ] KPI calculations working and displayed on dashboard
- [ ] Payment tracking functionality operational
- [ ] Due date alerts system functional
- [ ] All validations in place (Zod schemas)
- [ ] No existing functionality broken
- [ ] Code follows project conventions and patterns

---
# To-dos (10)
- [ ] **Schema Fix**: Update prisma/schema.prisma - remove productId from Purchase, fix syntax error, define clear PurchaseItem structure
- [ ] **Database Migration**: Run bun prisma migrate dev to apply changes safely
- [ ] **Server Actions Refactor**: Update createPurchase, updatePurchaseProgress, markPurchaseDelivered to use PurchaseItem
- [ ] **API Routes**: Create /api/purchases endpoints for CRUD, payments, KPIs, and alerts
- [ ] **Zod Schemas**: Define PurchaseSchema, PurchaseItemSchema, PaymentSchema with validation
- [ ] **Frontend Components**: Build PurchaseOverview cards, PurchaseTabs container, tab-based views (List/Detail/Payments/KPIs/Alerts)
- [ ] **TanStack Query Hooks**: Implement data fetching hooks (usePurchases, usePurchaseDetail, useProviderKPIs, etc.)
- [ ] **KPI Dashboard**: Create metrics calculation, Recharts visualizations for supplier performance
- [ ] **Styling**: Apply corporate design, Tailwind v4 utilities, consistent theming
- [ ] **Testing & Validation**: Verify data integrity, test all workflows, ensure backward compatibility