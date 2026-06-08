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
} from '@/components/ui';
import { format, parseISO } from 'date-fns';
import { id } from 'date-fns/locale';
import { Calendar as CalendarIcon, Plus, Trash2, Edit2, RefreshCw, X, Wallet } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import useSWR from 'swr';

const paymentMethods = ['Tunai', 'Transfer', 'QRIS', 'Debit'];

export default function ExpensesPage() {
  const { userData } = useAuth();
  const cafeId = userData?.cafe_id;

  const [startDate, setStartDate] = useState<Date>(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [endDate, setEndDate] = useState<Date>(new Date());
  const [selectedCategory, setSelectedCategory] = useState<string>('');

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

  const { data: categoriesData, error: categoriesError } = useSWR<{ data: ExpenseCategory[] }>(
    cafeId ? `/api/finance/categories?cafe_id=${cafeId}` : null,
    apiFetcher,
    { revalidateOnFocus: false }
  );

  const { data: expensesData, error: expensesError, mutate, isValidating } = useSWR<{ data: Expense[], total: number, count: number }>(
    cafeId ? `/api/finance/expenses?cafe_id=${cafeId}&start_date=${format(startDate, 'yyyy-MM-dd')}&end_date=${format(endDate, 'yyyy-MM-dd')}${selectedCategory ? `&category_id=${selectedCategory}` : ''}` : null,
    apiFetcher,
    { revalidateOnFocus: false }
  );

  const { data: summaryData } = useSWR<{ data: { totalRevenue: number } }>(
    cafeId ? `/api/finance/summary?cafe_id=${cafeId}&start_date=${format(startDate, 'yyyy-MM-dd')}&end_date=${format(endDate, 'yyyy-MM-dd')}` : null,
    apiFetcher,
    { revalidateOnFocus: false }
  );

  const categories: ExpenseCategory[] = Array.isArray(categoriesData?.data) ? categoriesData.data : [];
  const expenses = Array.isArray(expensesData?.data) ? expensesData.data : [];
  const totalExpenses = expensesData?.total || 0;
  const totalRevenue = summaryData?.data?.totalRevenue || 0;
  const netProfit = totalRevenue - totalExpenses;
  const profitMargin = totalRevenue > 0 ? Math.round((netProfit / totalRevenue) * 100) : 0;

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [expenseToDelete, setExpenseToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [amountDisplay, setAmountDisplay] = useState('');

  const formatAmountInput = (value: string) => {
    const cleanValue = value.replace(/[^\d]/g, '');
    if (cleanValue === '') return '';
    const number = parseInt(cleanValue);
    return new Intl.NumberFormat('id-ID').format(number);
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    const formattedValue = formatAmountInput(inputValue);
    setAmountDisplay(formattedValue);
    const cleanValue = inputValue.replace(/[^\d]/g, '');
    const numericValue = cleanValue === '' ? 0 : parseInt(cleanValue);
    setFormData({ ...formData, amount: numericValue });
  };

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
        body: JSON.stringify({ ...formData, cafe_id: cafeId })
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

  const handleDelete = (id: string) => {
    setExpenseToDelete(id);
  };

  const confirmDelete = async () => {
    if (!expenseToDelete) return;
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/finance/expenses/${expenseToDelete}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Failed to delete expense');
      toast.success('Pengeluaran berhasil dihapus');
      mutate();
      setExpenseToDelete(null);
    } catch {
      toast.error('Gagal menghapus pengeluaran');
    } finally {
      setIsDeleting(false);
    }
  };

  const cancelDelete = () => {
    setExpenseToDelete(null);
  };

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

  const getCategoryColor = (categoryId: string) => {
    const category = categories?.find(c => c.id === categoryId);
    return category?.color || '#6B7280';
  };

  const getCategoryName = (categoryId: string) => {
    const category = categories?.find(c => c.id === categoryId);
    return category?.name || 'Uncategorized';
  };

  const expenseCount = expensesData?.count || expenses.length;

  return (
    <AppShell>
      <div className="space-y-6 pb-16">

        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 mb-8">
          <div className="space-y-1">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Pengeluaran</h1>
            <p className="text-sm text-muted-foreground">Kelola pengeluaran operasional bisnis</p>
          </div>
          <button
            onClick={() => { resetForm(); setIsDialogOpen(true); }}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-all text-sm font-medium shadow-md shadow-primary/10 active:scale-95"
          >
            <Plus className="h-4 w-4" />
            <span>Tambah Pengeluaran</span>
          </button>
        </div>

        {/* Filters */}
        <div className="mb-6 rounded-xl sm:rounded-2xl border bg-card shadow-sm p-4 sm:p-5">
          <div className="flex flex-col md:flex-row md:justify-between gap-3">
            <div className="flex gap-2 items-center">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="flex-1 sm:w-[140px] justify-start h-9 rounded-lg">
                    <CalendarIcon className="w-4 h-4 mr-2 text-muted-foreground" />
                    {format(startDate, 'dd/MM/yyyy')}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 rounded-xl" align="start">
                  <Calendar mode="single" selected={startDate} onSelect={(date) => date && setStartDate(date)} />
                </PopoverContent>
              </Popover>
              <span className="text-muted-foreground hidden sm:inline">-</span>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="flex-1 sm:w-[140px] justify-start h-9 rounded-lg">
                    <CalendarIcon className="w-4 h-4 mr-2 text-muted-foreground" />
                    {format(endDate, 'dd/MM/yyyy')}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 rounded-xl" align="start">
                  <Calendar mode="single" selected={endDate} onSelect={(date) => date && setEndDate(date)} />
                </PopoverContent>
              </Popover>
            </div>

            <div className="flex gap-2">
              <Select value={selectedCategory || 'all'} onValueChange={(value: string) => setSelectedCategory(value === 'all' ? '' : value)}>
                <SelectTrigger className="flex-1 md:w-[180px] h-9 rounded-lg">
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
                <Button variant="ghost" size="sm" className="h-9 px-2 rounded-lg" onClick={() => setSelectedCategory('')}>
                  <X className="w-4 h-4" />
                </Button>
              )}
              <Button variant="outline" size="icon" className="h-9 w-9 flex-shrink-0 rounded-lg" onClick={() => mutate()} disabled={isValidating}>
                <RefreshCw className={cn("w-4 h-4", isValidating && "animate-spin")} />
              </Button>
            </div>
          </div>
        </div>

        {/* Error Display */}
        {(categoriesError || expensesError) && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-4 mb-6">
            <p className="text-sm text-destructive">Gagal memuat data. Periksa koneksi Anda.</p>
          </div>
        )}

        {/* Summary Card */}
        <div className="mb-6 rounded-xl sm:rounded-2xl p-4 sm:p-5 bg-card border shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">Ringkasan Keuangan</h3>
            <span className="text-xs text-muted-foreground">
              {format(startDate, 'dd MMM')} - {format(endDate, 'dd MMM')}
            </span>
          </div>
          <div className="grid grid-cols-2 md:flex md:items-center md:gap-3 gap-3">
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground font-medium mb-0.5">Pendapatan</p>
              <p className="font-semibold text-foreground text-sm truncate">{formatRupiah(totalRevenue)}</p>
            </div>
            <div className="hidden md:block w-px h-8 bg-border/60" />
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground font-medium mb-0.5">Pengeluaran</p>
              <p className="font-semibold text-foreground text-sm truncate">{formatRupiah(totalExpenses)}</p>
            </div>
            <div className="hidden md:block w-px h-8 bg-border/60" />
            <div className="col-span-2 md:col-span-1 min-w-0">
              <p className="text-xs text-muted-foreground font-medium mb-0.5">Laba/Rugi</p>
              <div className="flex items-center gap-2">
                <p className={cn("font-bold text-sm truncate", netProfit >= 0 ? 'text-emerald-600' : 'text-red-600')}>
                  {formatRupiah(netProfit)}
                </p>
                <span className={cn(
                  "text-xs font-semibold px-1.5 py-0.5 rounded shrink-0",
                  netProfit >= 0 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300'
                )}>
                  {netProfit >= 0 ? '+' : ''}{Math.abs(profitMargin)}%
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Expenses List */}
        <div className="space-y-4">

          {/* Page Info Bar */}
          <div className="text-[11px] text-muted-foreground/70 flex items-center justify-between px-1">
            <span>{expenseCount} pengeluaran . {formatRupiah(totalExpenses)}</span>
          </div>

          {/* Desktop Table */}
          <div className="hidden sm:block overflow-hidden rounded-xl sm:rounded-2xl border bg-card shadow-sm relative">
            {isValidating && (
              <div className="absolute inset-0 bg-background/60 backdrop-blur-[1px] z-10 flex items-center justify-center">
                <div className="flex items-center gap-2 bg-background border rounded-lg px-4 py-2 shadow-lg">
                  <RefreshCw className="w-5 h-5 animate-spin text-primary" />
                  <span className="text-sm font-medium">Memuat data...</span>
                </div>
              </div>
            )}
            {expenses.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
                <Wallet className="h-16 w-16 text-muted-foreground/30 mb-4 mx-auto" />
                <h3 className="text-sm font-semibold mb-1">Belum ada pengeluaran</h3>
                <p className="text-xs text-muted-foreground">Tambah pengeluaran pertama Anda</p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-muted/30">
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">Tanggal</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">Kategori</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">Deskripsi</th>
                    <th className="text-right py-3 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">Jumlah</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">Dibuat Oleh</th>
                    <th className="text-center py-3 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider w-24">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {expenses.map((expense: Expense) => (
                    <tr key={expense.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="font-medium">{format(parseISO(expense.expense_date), 'dd MMM yyyy', { locale: id })}</span>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-2.5 h-2.5 rounded-full ring-2 ring-white" style={{ backgroundColor: getCategoryColor(expense.category_id || '') }} />
                          <span className="text-xs">{getCategoryName(expense.category_id || '')}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-muted-foreground max-w-[120px] truncate">
                        {expense.description || '-'}
                      </td>
                      <td className="py-3.5 px-4 text-right font-semibold tabular-nums">
                        {formatRupiah(expense.amount)}
                      </td>
                      <td className="py-3.5 px-4 text-muted-foreground text-xs whitespace-nowrap">
                        {expense.created_by_name || '-'}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center justify-center gap-0.5">
                          <button
                            onClick={() => handleEdit(expense)}
                            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-muted hover:text-foreground transition-all text-muted-foreground active:scale-90"
                            title="Edit"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(expense.id)}
                            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-red-50 hover:text-red-600 transition-all text-muted-foreground active:scale-90"
                            title="Hapus"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Mobile Cards */}
          <div className="sm:hidden space-y-2">
            {isValidating && (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="w-5 h-5 animate-spin text-primary" />
                <span className="text-sm font-medium ml-2 text-muted-foreground">Memuat data...</span>
              </div>
            )}
            {expenses.length === 0 && !isValidating ? (
              <div className="flex flex-col items-center justify-center py-16 px-4 text-center rounded-xl border bg-card">
                <Wallet className="h-12 w-12 text-muted-foreground/30 mb-3 mx-auto" />
                <h3 className="text-sm font-semibold mb-1">Belum ada pengeluaran</h3>
                <p className="text-xs text-muted-foreground">Tambah pengeluaran pertama Anda</p>
              </div>
            ) : (
              <AnimatePresence mode="popLayout">
                {expenses.map((expense: Expense) => (
                  <motion.div
                    key={expense.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.2, ease: 'easeOut' }}
                    className="rounded-xl border bg-card shadow-sm overflow-hidden"
                  >
                    <div className="flex items-center justify-between p-3 border-b border-border/30 bg-muted/20">
                      <div className="flex items-center gap-2.5">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: getCategoryColor(expense.category_id || '') }} />
                        <span className="text-xs font-medium">{getCategoryName(expense.category_id || '')}</span>
                      </div>
                      <div className="font-bold text-sm tabular-nums">{formatRupiah(expense.amount)}</div>
                    </div>
                    <div className="p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">
                          {format(parseISO(expense.expense_date), 'dd MMM yyyy', { locale: id })}
                        </span>
                        <span className="text-xs text-muted-foreground">{expense.payment_method}</span>
                      </div>
                      {expense.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2">{expense.description}</p>
                      )}
                      <div className="flex items-center justify-between pt-1 border-t border-border/30">
                        <span className="text-xs text-muted-foreground">{expense.created_by_name || '-'}</span>
                        <div className="flex items-center gap-0.5">
                          <button
                            onClick={() => handleEdit(expense)}
                            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-muted hover:text-foreground transition-all text-muted-foreground active:scale-90"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(expense.id)}
                            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-red-50 hover:text-red-600 transition-all text-muted-foreground active:scale-90"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            )}
          </div>
        </div>
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[480px] max-w-[95vw] p-0 gap-0 overflow-hidden rounded-xl">
          <DialogHeader className="px-5 pt-5 pb-4 border-b border-border">
            <DialogTitle className="text-lg font-semibold">
              {editingExpense ? 'Edit Pengeluaran' : 'Tambah Pengeluaran'}
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              {editingExpense ? 'Perbarui detail pengeluaran operasional' : 'Catat pengeluaran operasional baru'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit}>
            <div className="px-5 py-4 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="category" className="text-sm font-medium">Kategori <span className="text-destructive">*</span></Label>
                  <Select value={formData.category_id} onValueChange={(value: string) => setFormData({ ...formData, category_id: value })}>
                    <SelectTrigger className="h-10 rounded-lg">
                      <SelectValue placeholder="Pilih kategori" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories?.map(cat => (
                        <SelectItem key={cat.id} value={cat.id}>
                          <div className="flex items-center gap-2">
                            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cat.color }} />
                            {cat.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="amount" className="text-sm font-medium">Jumlah (Rp) <span className="text-destructive">*</span></Label>
                  <Input id="amount" type="text" className="h-10 rounded-lg font-mono" value={amountDisplay} onChange={handleAmountChange} placeholder="0" required />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">Tanggal <span className="text-destructive">*</span></Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start h-10 rounded-lg font-normal">
                        <CalendarIcon className="w-4 h-4 mr-2 text-muted-foreground" />
                        {formData.expense_date ? format(parseISO(formData.expense_date), 'dd MMM yyyy', { locale: id }) : 'Pilih tanggal'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 rounded-xl" align="start">
                      <Calendar mode="single" selected={parseISO(formData.expense_date)} onSelect={(date) => date && setFormData({ ...formData, expense_date: format(date, 'yyyy-MM-dd') })} />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">Metode Pembayaran</Label>
                  <Select value={formData.payment_method} onValueChange={(value: any) => setFormData({ ...formData, payment_method: value })}>
                    <SelectTrigger className="h-10 rounded-lg"><SelectValue placeholder="Pilih metode" /></SelectTrigger>
                    <SelectContent>
                      {paymentMethods.map(method => <SelectItem key={method} value={method}>{method}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="description" className="text-sm font-medium">Deskripsi</Label>
                <Input id="description" className="h-10 rounded-lg" value={formData.description} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, description: e.target.value })} placeholder="Keterangan pengeluaran" />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="receipt_number" className="text-sm font-medium">Nomor Nota</Label>
                <Input id="receipt_number" className="h-10 rounded-lg font-mono" value={formData.receipt_number} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, receipt_number: e.target.value })} placeholder="Nomor nota/referensi" />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-border bg-muted/30">
              <button
                type="button"
                onClick={() => setIsDialogOpen(false)}
                className="px-4 py-2 rounded-lg border bg-background hover:bg-muted transition text-sm"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition text-sm font-medium flex items-center gap-2 disabled:opacity-50"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>{editingExpense ? 'Menyimpan...' : 'Menambah...'}</span>
                  </>
                ) : (
                  <span>{editingExpense ? 'Simpan Perubahan' : 'Tambah Pengeluaran'}</span>
                )}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AnimatePresence>
        {expenseToDelete && (
          <>
            <motion.div
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={cancelDelete}
            />
            <motion.div
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
            >
              <div className="w-full max-w-md bg-card border rounded-xl shadow-2xl overflow-hidden">
                <div className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="p-2.5 rounded-full bg-red-500/10 flex-shrink-0">
                      <Trash2 className="h-5 w-5 text-red-600" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg mb-1">Hapus Pengeluaran?</h3>
                      <p className="text-sm text-muted-foreground">
                        Apakah Anda yakin ingin menghapus pengeluaran ini? Tindakan ini tidak dapat dibatalkan.
                      </p>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 p-4 border-t bg-muted/20">
                  <button
                    onClick={cancelDelete}
                    disabled={isDeleting}
                    className="flex-1 px-4 py-2 rounded-lg border bg-background hover:bg-muted transition text-sm disabled:opacity-50"
                  >
                    Batal
                  </button>
                  <button
                    onClick={confirmDelete}
                    disabled={isDeleting}
                    className="flex-1 px-4 py-2 rounded-lg bg-destructive text-destructive-foreground hover:bg-destructive/90 transition text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2"
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
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </AppShell>
  );
}
