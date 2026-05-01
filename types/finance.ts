/**
 * Types for Financial Management (Expenses & Revenue Targets)
 */

// Expense Category
export interface ExpenseCategory {
    id: string;
    cafe_id: number;
    name: string;
    color: string;
    description?: string;
    is_active: boolean;
    sort_order: number;
    created_at: string;
    updated_at: string;
    deleted_at?: string;
    version: number;
}

// Expense
export interface Expense {
    id: string;
    cafe_id: number;
    category_id?: string;
    category?: ExpenseCategory; // Joined data
    
    // Financial
    amount: number;
    description?: string;
    
    // Date & Reference
    expense_date: string;
    receipt_number?: string;
    receipt_url?: string;
    
    // Payment
    payment_method: 'Tunai' | 'QRIS' | 'Debit' | 'Transfer';
    
    // Metadata
    created_by?: string;
    created_by_name?: string; // Denormalized creator name
    created_at: string;
    updated_at: string;
    deleted_at?: string;
    version: number;
}

// Revenue Target
export interface RevenueTarget {
    id: string;
    cafe_id: number;
    
    // Target Period
    target_date?: string;
    target_month: number;
    target_year: number;
    
    // Target Values
    daily_target: number;
    monthly_target: number;
    
    // Additional Info
    notes?: string;
    is_active: boolean;
    
    // Metadata
    created_by?: string;
    created_at: string;
    updated_at: string;
    deleted_at?: string;
    version: number;
}

// Expense Summary (for dashboard)
export interface ExpenseSummary {
    category_id: string;
    category_name: string;
    category_color?: string;
    total_amount: number;
    transaction_count: number;
    percentage: number;
}

// Financial Metrics (for statistics)
export interface FinancialMetrics {
    // Revenue
    totalRevenue: number;
    targetRevenue: number;
    targetAchievement: number; // percentage
    targetGap: number;
    
    // Costs
    totalCOGS: number; // Cost of Goods Sold (from menu.hpp_price)
    totalExpenses: number;
    expensesByCategory: ExpenseSummary[];
    
    // Profit
    grossProfit: number; // Revenue - COGS
    netProfit: number; // Revenue - COGS - Expenses
    netProfitMargin: number; // percentage
    
    // Cash Flow
    cashIn: number;
    cashOut: number;
    netCashFlow: number;
}

// Target vs Actual comparison
export interface TargetComparison {
    date: string;
    actual: number;
    target: number;
    achievement: number; // percentage
    status: 'achieved' | 'below' | 'exceeded';
}

// Cash Flow Item
export interface CashFlowItem {
    date: string;
    cashIn: number; // Revenue
    cashOut: number; // Expenses + COGS
    netFlow: number;
    balance: number; // Running balance
}

// Expense Form Data (for creating/editing)
export interface ExpenseFormData {
    category_id: string;
    amount: number;
    description?: string;
    expense_date: string;
    receipt_number?: string;
    receipt_url?: string;
    payment_method: 'Tunai' | 'QRIS' | 'Debit' | 'Transfer';
}

// Revenue Target Form Data
export interface RevenueTargetFormData {
    target_month: number;
    target_year: number;
    daily_target?: number;
    monthly_target: number;
    notes?: string;
}
