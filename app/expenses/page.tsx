'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { AppShell } from '@/components/app-shell';
import { formatRupiah } from '@/lib/format';
import { Expense, ExpenseCategory, ExpenseFormData } from '@/types/finance';
import { apiFetcher } from '@/lib/swr-config';
import {
  Button,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Calendar,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui';
import { format, parseISO } from 'date-fns';
import { id } from 'date-fns/locale';
import { Calendar as CalendarIcon, Plus, Trash2, Edit2, RefreshCw, Search, X, Wallet, TrendingDown, Filter, ArrowUpRight, ArrowDownRight, TrendingUp, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import useSWR from 'swr';

const paymentMethods = ['Tunai', 'Transfer', 'QRIS', 'Debit'];

export default function ExpensesPage() {
  const { userData } = useAuth();
  const cafeId = userData?.cafe_id;
  
  // State for filters
  const [startDate, setStartDate] = useState<Date>(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [endDate, setEndDate] = useState<Date>(new Date());
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  
  // State for form
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [formData, setFormData] = useState<ExpenseFormData>({
    category_id: '',
    amount: 0,
    description: '',
    expense_date: format(new Date(), 'yyyy-MM-dd'),
    receipt_number: '',
    payment_method: 'Tunai'
  });

  // Fetch categories
  const { data: categoriesData, error: categoriesError } = useSWR<{ data: ExpenseCategory[] }>(
    cafeId ? `/api/finance/categories?cafe_id=${cafeId}` : null,
    apiFetcher,
    { revalidateOnFocus: false }
  );

  // Fetch expenses
  const { data: expensesData, error: expensesError, mutate, isValidating } = useSWR<{ data: Expense[], total: number, count: number }>(
    cafeId ? `/api/finance/expenses?cafe_id=${cafeId}&start_date=${format(startDate, 'yyyy-MM-dd')}&end_date=${format(endDate, 'yyyy-MM-dd')}${selectedCategory ? `&category_id=${selectedCategory}` : ''}` : null,
    apiFetcher,
    { revalidateOnFocus: false }
  );

  // Fetch revenue for comparison
  const { data: summaryData } = useSWR<{ data: { totalRevenue: number } }>(
    cafeId ? `/api/finance/summary?cafe_id=${cafeId}&start_date=${format(startDate, 'yyyy-MM-dd')}&end_date=${format(endDate, 'yyyy-MM-dd')}` : null,
    apiFetcher,
    { revalidateOnFocus: false }
  );

  // Ensure categories is always an array
  const categories: ExpenseCategory[] = Array.isArray(categoriesData?.data) ? categoriesData.data : [];
  const expenses = Array.isArray(expensesData?.data) ? expensesData.data : [];
  const totalExpenses = expensesData?.total || 0;
  const totalRevenue = summaryData?.data?.totalRevenue || 0;
  const netProfit = totalRevenue - totalExpenses;
  const profitMargin = totalRevenue > 0 ? Math.round((netProfit / totalRevenue) * 100) : 0;

  // Handle form submit
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [expenseToDelete, setExpenseToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [amountDisplay, setAmountDisplay] = useState('');
  
  // Format amount to Indonesian Rupiah
  const formatAmountInput = (value: string) => {
    // Remove all non-digit characters
    const cleanValue = value.replace(/[^\d]/g, '');
    
    if (cleanValue === '') {
      return '';
    }
    
    // Convert to number and format
    const number = parseInt(cleanValue);
    return new Intl.NumberFormat('id-ID').format(number);
  };
  
  // Handle amount input change
  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    const formattedValue = formatAmountInput(inputValue);
    
    // Update display
    setAmountDisplay(formattedValue);
    
    // Update form data with numeric value
    const cleanValue = inputValue.replace(/[^\d]/g, '');
    const numericValue = cleanValue === '' ? 0 : parseInt(cleanValue);
    setFormData({ ...formData, amount: numericValue });
  };
  
  // Initialize amount display when editing
  useEffect(() => {
    if (editingExpense?.amount) {
      setAmountDisplay(new Intl.NumberFormat('id-ID').format(editingExpense.amount));
    } else {
      setAmountDisplay('');
    }
  }, [editingExpense, isDialogOpen]);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!cafeId) return;
    
    setIsSubmitting(true);
    
    try {
      const url = editingExpense 
        ? `/api/finance/expenses/${editingExpense.id}`
        : '/api/finance/expenses';
      
      const method = editingExpense ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          cafe_id: cafeId
        })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save expense');
      }
      
      toast.success(editingExpense ? 'Pengeluaran berhasil diperbarui' : 'Pengeluaran berhasil ditambahkan');
      setIsDialogOpen(false);
      resetForm();
      mutate();
    } catch (error: any) {
      toast.error(error.message || 'Terjadi kesalahan');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle delete
  const handleDelete = async (id: string) => {
    setExpenseToDelete(id);
    setDeleteDialogOpen(true);
  };
  
  const confirmDelete = async () => {
    if (!expenseToDelete) return;
    
    setIsDeleting(true);
    
    try {
      const response = await fetch(`/api/finance/expenses/${expenseToDelete}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete expense');
      }
      
      toast.success('Pengeluaran berhasil dihapus');
      mutate();
      setDeleteDialogOpen(false);
      setExpenseToDelete(null);
    } catch (error) {
      toast.error('Gagal menghapus pengeluaran');
    } finally {
      setIsDeleting(false);
    }
  };
  
  const cancelDelete = () => {
    setDeleteDialogOpen(false);
    setExpenseToDelete(null);
  };

  // Handle edit
  const handleEdit = (expense: Expense) => {
    setEditingExpense(expense);
    setFormData({
      category_id: expense.category_id || '',
      amount: expense.amount,
      description: expense.description || '',
      expense_date: expense.expense_date,
      receipt_number: expense.receipt_number || '',
      payment_method: expense.payment_method
    });
    setIsDialogOpen(true);
  };

  // Reset form
  const resetForm = () => {
    setEditingExpense(null);
    setFormData({
      category_id: '',
      amount: 0,
      description: '',
      expense_date: format(new Date(), 'yyyy-MM-dd'),
      receipt_number: '',
      payment_method: 'Tunai'
    });
  };

  // Get category color
  const getCategoryColor = (categoryId: string) => {
    const category = categories?.find(c => c.id === categoryId);
    return category?.color || '#6B7280';
  };

  // Get category name
  const getCategoryName = (categoryId: string) => {
    const category = categories?.find(c => c.id === categoryId);
    return category?.name || 'Uncategorized';
  };

  return (
    <AppShell>
      <div className="space-y-6 p-4 sm:p-6 lg:p-8 pb-16">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">Pengeluaran</h1>
            <p className="text-sm text-muted-foreground">
              Kelola pengeluaran operasional bisnis
            </p>
          </div>
          
          <Button 
            onClick={() => { resetForm(); setIsDialogOpen(true); }}
            className="shadow-sm w-full md:w-auto"
          >
            <Plus className="w-4 h-4 mr-2" />
            Tambah Pengeluaran
          </Button>
        </div>

        {/* Filters Card - Desktop Optimized */}
        <div className="bg-card rounded-xl border border-border p-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Filter className="w-4 h-4" />
              <span>Filter Pengeluaran</span>
              {isValidating && (
                <RefreshCw className="w-3 h-3 animate-spin text-primary ml-2" />
              )}
            </div>
            
            <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
              {/* Date Range */}
              <div className="flex gap-2 items-center">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-[140px] justify-start h-9">
                      <CalendarIcon className="w-4 h-4 mr-2 text-muted-foreground" />
                      {format(startDate, 'dd/MM/yyyy')}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={startDate}
                      onSelect={(date) => date && setStartDate(date)}
                    />
                  </PopoverContent>
                </Popover>
                
                <span className="text-muted-foreground">-</span>
                
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-[140px] justify-start h-9">
                      <CalendarIcon className="w-4 h-4 mr-2 text-muted-foreground" />
                      {format(endDate, 'dd/MM/yyyy')}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={endDate}
                      onSelect={(date) => date && setEndDate(date)}
                    />
                  </PopoverContent>
                </Popover>
              </div>
              
              {/* Category Filter & Refresh */}
              <div className="flex gap-2">
                <Select value={selectedCategory || 'all'} onValueChange={(value: string) => setSelectedCategory(value === 'all' ? '' : value)}>
                  <SelectTrigger className="w-[180px] h-9">
                    <SelectValue placeholder="Semua Kategori" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Kategori</SelectItem>
                    {categories?.map(cat => (
                      <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                {selectedCategory && (
                  <Button variant="ghost" size="sm" className="h-9 px-2" onClick={() => setSelectedCategory('')}>
                    <X className="w-4 h-4" />
                  </Button>
                )}
                
                <Button 
                  variant="outline" 
                  size="icon"
                  className="h-9 w-9 flex-shrink-0"
                  onClick={() => mutate()}
                  disabled={isValidating}
                >
                  <RefreshCw className={cn("w-4 h-4", isValidating && "animate-spin")} />
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Error Display */}
        {(categoriesError || expensesError) && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-4">
            <p className="text-sm text-destructive">
              Error: {categoriesError?.message || expensesError?.message || 'Failed to load data'}
            </p>
            <Button 
              variant="outline" 
              size="sm" 
              className="mt-2"
              onClick={() => { mutate(); window.location.reload(); }}
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Retry
            </Button>
          </div>
        )}

        {/* Summary Card - Mobile Optimized */}
        <div className="bg-card rounded-xl border border-border shadow-subtle p-4">
          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs sm:text-sm font-semibold uppercase tracking-wider text-muted-foreground/70">
              Ringkasan Keuangan
            </h3>
            <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-md flex items-center justify-center bg-chart-2/10">
              <TrendingDown className="w-3 h-3 sm:w-4 sm:h-4 text-chart-2 opacity-70" />
            </div>
          </div>
          
          {/* Date Range */}
          <p className="text-xs text-muted-foreground mb-3">
            {format(startDate, 'dd MMM')} - {format(endDate, 'dd MMM yyyy')}
          </p>
          
          {/* Revenue vs Expenses Comparison */}
          <div className="grid grid-cols-2 gap-2 sm:gap-3 mb-3">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground font-medium">Pendapatan</p>
              <p className="font-bold text-foreground leading-tight text-base sm:text-lg">
                {formatRupiah(totalRevenue)}
              </p>
            </div>
            
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground font-medium">Pengeluaran</p>
              <p className="font-bold text-foreground leading-tight text-base sm:text-lg">
                {formatRupiah(totalExpenses)}
              </p>
            </div>
          </div>
          
          {/* Divider */}
          <div className="h-px bg-border/60 my-3" />
          
          {/* Net Profit with Indicator */}
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground font-medium">Laba/Rugi</p>
              <p className={cn(
                "font-bold leading-tight text-lg sm:text-xl",
                netProfit >= 0 ? 'text-emerald-600' : 'text-red-600'
              )}>
                {formatRupiah(netProfit)}
              </p>
            </div>
            
            <div className={cn(
              "flex items-center gap-1.5 px-2 py-1 sm:px-2.5 sm:py-1.5 rounded-lg text-xs font-semibold",
              netProfit >= 0 
                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' 
                : 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300'
            )}>
              {netProfit >= 0 ? (
                <ArrowUpRight className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              ) : (
                <ArrowDownRight className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              )}
              <span>{Math.abs(profitMargin)}%</span>
            </div>
          </div>
        </div>

        {/* Expenses Table - Mobile Optimized */}
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          {/* Mobile Card View */}
          <div className="md:hidden">
            {expenses.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground">
                <div className="flex flex-col items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center">
                    <Wallet className="w-6 h-6 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="font-medium">Belum ada pengeluaran</p>
                    <p className="text-sm text-muted-foreground">Tambah pengeluaran pertama Anda</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="divide-y divide-border/50">
                <AnimatePresence>
                  {expenses.map((expense: Expense, index: number) => (
                    <motion.div
                      key={expense.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ delay: index * 0.03 }}
                      className="p-4 hover:bg-muted/30 transition-colors"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-2 h-2 rounded-full ring-2 ring-white" 
                            style={{ backgroundColor: getCategoryColor(expense.category_id || '') }}
                          />
                          <span className="text-sm font-medium">{getCategoryName(expense.category_id || '')}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button 
                            variant="ghost" 
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-foreground"
                            onClick={() => handleEdit(expense)}
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                            onClick={() => handleDelete(expense.id)}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {expense.description || '-'}
                        </p>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">
                            {format(parseISO(expense.expense_date), 'dd MMM yyyy', { locale: id })}
                          </span>
                          <span className="text-sm font-semibold text-foreground">
                            {formatRupiah(expense.amount)}
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>
          
          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">Tanggal</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">Kategori</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">Deskripsi</th>
                  <th className="text-right py-3 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">Jumlah</th>
                  <th className="text-center py-3 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {expenses.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-muted-foreground">
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center">
                          <Wallet className="w-6 h-6 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="font-medium">Belum ada pengeluaran</p>
                          <p className="text-sm text-muted-foreground">Tambah pengeluaran pertama Anda</p>
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : (
                  <AnimatePresence>
                    {expenses.map((expense: Expense, index: number) => (
                      <motion.tr
                        key={expense.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ delay: index * 0.03 }}
                        className="border-b border-border/50 hover:bg-muted/30 transition-colors"
                      >
                        <td className="py-3.5 px-4 text-sm whitespace-nowrap">
                          {format(parseISO(expense.expense_date), 'dd MMM yyyy', { locale: id })}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2.5">
                            <div 
                              className="w-2.5 h-2.5 rounded-full ring-2 ring-white" 
                              style={{ backgroundColor: getCategoryColor(expense.category_id || '') }}
                            />
                            <span className="text-sm font-medium">{getCategoryName(expense.category_id || '')}</span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-sm text-muted-foreground max-w-xs truncate">
                          {expense.description || '-'}
                        </td>
                        <td className="py-3.5 px-4 text-sm font-semibold text-right tabular-nums">
                          {formatRupiah(expense.amount)}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex items-center justify-center gap-0.5">
                            <Button 
                              variant="ghost" 
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-foreground"
                              onClick={() => handleEdit(expense)}
                            >
                              <Edit2 className="w-4 h-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                              onClick={() => handleDelete(expense.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </td>
                      </motion.tr>
                    ))}
                </AnimatePresence>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[500px] max-w-[95vw] p-0 overflow-hidden">
          <DialogHeader className="px-4 pt-4 pb-3 border-b border-border">
            <DialogTitle className="text-lg font-semibold">
              {editingExpense ? 'Edit Pengeluaran' : 'Tambah Pengeluaran'}
            </DialogTitle>
            <DialogDescription>
              {editingExpense ? 'Perbarui data pengeluaran yang ada' : 'Tambah pengeluaran operasional baru'}
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="px-4 py-3 space-y-3">
            {/* Primary Fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label htmlFor="category" className="text-sm font-medium text-foreground mb-2 block">
                  Kategori <span className="text-destructive">*</span>
                </Label>
                <Select 
                  value={formData.category_id} 
                  onValueChange={(value: string) => setFormData({ ...formData, category_id: value })}
                >
                  <SelectTrigger className="h-10 border-input bg-background">
                    <SelectValue placeholder="Pilih kategori" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories?.map(cat => (
                      <SelectItem key={cat.id} value={cat.id}>
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-2.5 h-2.5 rounded-full ring-2 ring-background" 
                            style={{ backgroundColor: cat.color }}
                          />
                          <span className="font-medium">{cat.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="amount" className="text-sm font-medium text-foreground mb-2 block">
                  Jumlah (Rp) <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="amount"
                  type="text"
                  className="h-10 border-input bg-background font-mono"
                  value={amountDisplay}
                  onChange={handleAmountChange}
                  placeholder="0"
                  required
                />
              </div>
            </div>
            
            {/* Secondary Fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label htmlFor="date" className="text-sm font-medium text-foreground mb-2 block">
                  Tanggal <span className="text-destructive">*</span>
                </Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start h-10 border-input bg-background font-normal">
                      <CalendarIcon className="w-4 h-4 mr-2 text-muted-foreground" />
                      {formData.expense_date ? format(parseISO(formData.expense_date), 'dd MMM yyyy', { locale: id }) : 'Pilih tanggal'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={parseISO(formData.expense_date)}
                      onSelect={(date) => date && setFormData({ ...formData, expense_date: format(date, 'yyyy-MM-dd') })}
                    />
                  </PopoverContent>
                </Popover>
              </div>
              
              <div>
                <Label htmlFor="payment_method" className="text-sm font-medium text-foreground mb-2 block">
                  Metode Pembayaran
                </Label>
                <Select 
                  value={formData.payment_method} 
                  onValueChange={(value: any) => setFormData({ ...formData, payment_method: value })}
                >
                  <SelectTrigger className="h-10 border-input bg-background">
                    <SelectValue placeholder="Pilih metode" />
                  </SelectTrigger>
                  <SelectContent>
                    {paymentMethods.map(method => (
                      <SelectItem key={method} value={method} className="font-medium">{method}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            {/* Optional Fields - Collapsed */}
            <details className="space-y-3">
              <summary className="text-sm font-medium text-muted-foreground cursor-pointer hover:text-foreground">
                + Opsional (Deskripsi & Nota)
              </summary>
              <div className="space-y-3">
                <div>
                  <Label htmlFor="description" className="text-sm font-medium text-foreground mb-2 block">
                    Deskripsi
                  </Label>
                  <Input
                    id="description"
                    className="h-10 border-input bg-background"
                    value={formData.description}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Keterangan (opsional)"
                  />
                </div>
                
                <div>
                  <Label htmlFor="receipt_number" className="text-sm font-medium text-foreground mb-2 block">
                    Nomor Nota
                  </Label>
                  <Input
                    id="receipt_number"
                    className="h-10 border-input bg-background font-mono"
                    value={formData.receipt_number}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, receipt_number: e.target.value })}
                    placeholder="Nomor nota (opsional)"
                  />
                </div>
              </div>
            </details>
          </form>
          
          {/* Actions */}
          <div className="grid grid-cols-2 gap-2 px-4 py-3 border-t border-border bg-muted/30">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setIsDialogOpen(false)}
              className="h-9 px-3 text-sm"
            >
              Batal
            </Button>
            <Button 
              type="submit" 
              onClick={(e) => { e.preventDefault(); handleSubmit(e as any); }}
              className="h-9 px-4 text-sm"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  {editingExpense ? 'Menyimpan...' : 'Menambah...'}
                </>
              ) : (
                <>
                  {editingExpense ? 'Simpan' : 'Tambah'}
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="p-0">
          <AlertDialogHeader className="px-4 pt-4 pb-3">
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              Hapus Pengeluaran
            </AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin menghapus pengeluaran ini? Tindakan ini tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex gap-2 px-4 py-3 border-t">
            <button
              onClick={cancelDelete}
              disabled={isDeleting}
              className="flex-1 px-4 py-2 rounded-lg border border-input bg-transparent hover:bg-accent hover:text-accent-foreground transition text-sm disabled:opacity-50"
            >
              Batal
            </button>
            <button
              onClick={confirmDelete}
              disabled={isDeleting}
              className="flex-1 px-4 py-2 rounded-lg bg-destructive text-destructive-foreground hover:bg-destructive/90 transition text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isDeleting ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span>Menghapus...</span>
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4" />
                  <span>Hapus</span>
                </>
              )}
            </button>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </AppShell>
  );
}
