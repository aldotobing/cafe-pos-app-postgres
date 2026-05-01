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
  DialogHeader,
  DialogTitle,
} from '@/components/ui';
import { format, parseISO } from 'date-fns';
import { id } from 'date-fns/locale';
import { Calendar as CalendarIcon, Plus, Trash2, Edit2, RefreshCw, Search, X, Wallet, TrendingDown, Filter, ArrowUpRight } from 'lucide-react';
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

  // Ensure categories is always an array
  const categories: ExpenseCategory[] = Array.isArray(categoriesData?.data) ? categoriesData.data : [];
  const expenses = Array.isArray(expensesData?.data) ? expensesData.data : [];
  const totalExpenses = expensesData?.total || 0;

  // Handle form submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!cafeId) return;
    
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
    }
  };

  // Handle delete
  const handleDelete = async (id: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus pengeluaran ini?')) return;
    
    try {
      const response = await fetch(`/api/finance/expenses/${id}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete expense');
      }
      
      toast.success('Pengeluaran berhasil dihapus');
      mutate();
    } catch (error) {
      toast.error('Gagal menghapus pengeluaran');
    }
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
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-primary/10 rounded-xl">
              <Wallet className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground tracking-tight">Pengeluaran</h1>
              <p className="text-sm text-muted-foreground">
                Kelola pengeluaran operasional cafe
              </p>
            </div>
          </div>
          
          <Button 
            onClick={() => { resetForm(); setIsDialogOpen(true); }}
            className="shadow-sm"
          >
            <Plus className="w-4 h-4 mr-2" />
            Tambah Pengeluaran
          </Button>
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

        {/* Summary Card */}
        <div className="relative overflow-hidden bg-gradient-to-br from-primary/5 via-primary/3 to-transparent rounded-2xl border border-primary/10 p-6">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <TrendingDown className="w-24 h-24 text-primary" />
          </div>
          <div className="relative">
            <p className="text-sm font-medium text-muted-foreground mb-1">Total Pengeluaran Periode Ini</p>
            <p className="text-4xl font-bold text-foreground tracking-tight">{formatRupiah(totalExpenses)}</p>
            <p className="text-sm text-muted-foreground mt-2">
              {format(startDate, 'dd MMM yyyy', { locale: id })} - {format(endDate, 'dd MMM yyyy', { locale: id })}
            </p>
          </div>
        </div>

        {/* Filters Card */}
        <div className="bg-card rounded-xl border border-border p-4">
          <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Filter className="w-4 h-4" />
              <span>Filter Pengeluaran</span>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
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
              
              {/* Category Filter */}
              <div className="flex gap-2 items-center">
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
              </div>
              
              {/* Refresh */}
              <Button 
                variant="outline" 
                size="icon"
                className="h-9 w-9"
                onClick={() => mutate()}
                disabled={isValidating}
              >
                <RefreshCw className={cn("w-4 h-4", isValidating && "animate-spin")} />
              </Button>
            </div>
          </div>
        </div>

        {/* Expenses Table */}
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">Tanggal</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">Kategori</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">Deskripsi</th>
                  <th className="text-right py-3 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">Jumlah</th>
                  <th className="text-center py-3 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider w-24">Aksi</th>
                </tr>
              </thead>
              <tbody>
                <AnimatePresence>
                  {expenses.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-16">
                        <div className="flex flex-col items-center justify-center text-center">
                          <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                            <Wallet className="w-8 h-8 text-muted-foreground" />
                          </div>
                          <p className="text-muted-foreground font-medium mb-1">Belum ada pengeluaran</p>
                          <p className="text-sm text-muted-foreground/70 mb-4">Tambahkan pengeluaran pertama Anda</p>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => { resetForm(); setIsDialogOpen(true); }}
                          >
                            <Plus className="w-4 h-4 mr-2" />
                            Tambah Pengeluaran
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    expenses.map((expense: Expense, index: number) => (
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
                    ))
                  )}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[480px] p-0 overflow-hidden">
          <DialogHeader className="px-6 pt-6 pb-4 border-b border-border">
            <DialogTitle className="flex items-center gap-2 text-lg">
              <div className="p-1.5 bg-primary/10 rounded-lg">
                <Wallet className="w-4 h-4 text-primary" />
              </div>
              {editingExpense ? 'Edit Pengeluaran' : 'Tambah Pengeluaran'}
            </DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
            {/* Category & Amount - 2 columns */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="category" className="text-xs font-medium">Kategori *</Label>
                <Select 
                  value={formData.category_id} 
                  onValueChange={(value: string) => setFormData({ ...formData, category_id: value })}
                >
                  <SelectTrigger className="h-10">
                    <SelectValue placeholder="Pilih kategori" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories?.map(cat => (
                      <SelectItem key={cat.id} value={cat.id}>
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-2 h-2 rounded-full" 
                            style={{ backgroundColor: cat.color }}
                          />
                          {cat.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="amount" className="text-xs font-medium">Jumlah (Rp) *</Label>
                <Input
                  id="amount"
                  type="number"
                  className="h-10"
                  value={formData.amount || ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
                  placeholder="0"
                  required
                />
              </div>
            </div>
            
            {/* Date & Payment Method - 2 columns */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="date" className="text-xs font-medium">Tanggal *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start h-10">
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
              
              <div className="space-y-2">
                <Label htmlFor="payment_method" className="text-xs font-medium">Metode Pembayaran</Label>
                <Select 
                  value={formData.payment_method} 
                  onValueChange={(value: any) => setFormData({ ...formData, payment_method: value })}
                >
                  <SelectTrigger className="h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {paymentMethods.map(method => (
                      <SelectItem key={method} value={method}>{method}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description" className="text-xs font-medium">Deskripsi</Label>
              <Input
                id="description"
                className="h-10"
                value={formData.description}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Opsional - Keterangan pengeluaran"
              />
            </div>
            
            {/* Receipt Number */}
            <div className="space-y-2">
              <Label htmlFor="receipt_number" className="text-xs font-medium">Nomor Nota</Label>
              <Input
                id="receipt_number"
                className="h-10"
                value={formData.receipt_number}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, receipt_number: e.target.value })}
                placeholder="Opsional - Nomor struk/nota"
              />
            </div>
          </form>
          
          {/* Actions */}
          <div className="flex justify-end gap-2 px-6 py-4 border-t border-border bg-muted/30">
            <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
              Batal
            </Button>
            <Button type="submit" onClick={(e) => { e.preventDefault(); handleSubmit(e as any); }}>
              {editingExpense ? 'Simpan Perubahan' : 'Tambah Pengeluaran'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
