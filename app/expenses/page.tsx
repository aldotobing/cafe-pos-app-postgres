'use client';

import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/lib/auth-context';
import { AppShell } from '@/components/app-shell';
import { formatRupiah } from '@/lib/format';
import { Expense, ExpenseCategory, ExpenseFormData } from '@/types/finance';
import { apiFetcher } from '@/lib/swr-config';
import { fetchClient, FetchError } from '@/lib/fetch-client';
import { ExpenseSkeleton } from '@/components/skeletons';
import {
  Button, Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
  Calendar, Popover, PopoverContent, PopoverTrigger,
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '@/components/ui';
import { format, parseISO } from 'date-fns';
import { id } from 'date-fns/locale';
import { Calendar as CalendarIcon, Plus, Trash2, Edit2, RefreshCw, RotateCcw, X, Wallet } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import useSWR from 'swr';

const paymentMethods = ['Tunai', 'Transfer', 'QRIS', 'Debit'];

function CategoryBreakdown({ expenses, categories, total }: { expenses: Expense[]; categories: ExpenseCategory[]; total: number }) {
  const breakdown = useMemo(() => {
    const map: Record<string, { name: string; color: string; amount: number }> = {}
    expenses.forEach(e => {
      const id = e.category_id || 'uncategorized'
      if (!map[id]) {
        const cat = categories.find(c => c.id === id)
        map[id] = { name: cat?.name || 'Lainnya', color: cat?.color || '#6B7280', amount: 0 }
      }
      map[id].amount += e.amount
    })
    return Object.values(map).sort((a, b) => b.amount - a.amount)
  }, [expenses, categories])

  if (breakdown.length === 0) return null

  return (
    <div className="rounded-xl border bg-card shadow-sm p-4 md:p-5">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70 mb-4">Pengeluaran per Kategori</h3>
      <div className="space-y-2.5">
        {breakdown.map((item) => {
          const pct = total > 0 ? Math.round((item.amount / total) * 100) : 0
          return (
            <div key={item.name} className="flex items-center gap-3">
              <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
              <span className="text-xs w-24 shrink-0 truncate">{item.name}</span>
              <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.max(pct, 2)}%`, backgroundColor: item.color }}
                />
              </div>
              <span className="text-xs font-medium tabular-nums w-20 text-right shrink-0">{formatRupiah(item.amount)}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function ExpensesPage() {
  const { userData } = useAuth();
  const cafeId = userData?.cafe_id;
  const isAdmin = userData?.role === 'admin' || userData?.role === 'superadmin';

  const [startDate, setStartDate] = useState<Date>(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [endDate, setEndDate] = useState<Date>(new Date());
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [isEditingTarget, setIsEditingTarget] = useState(false);
  const [targetInput, setTargetInput] = useState('');
  const [isSavingTarget, setIsSavingTarget] = useState(false);
  const [shouldCopyTarget, setShouldCopyTarget] = useState(false);
  const [formData, setFormData] = useState<ExpenseFormData>({
    category_id: '', amount: 0, description: '', expense_date: format(new Date(), 'yyyy-MM-dd'),
    receipt_number: '', payment_method: 'Tunai'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [expenseToDelete, setExpenseToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [amountDisplay, setAmountDisplay] = useState('');
  const [startOpen, setStartOpen] = useState(false);
  const [endOpen, setEndOpen] = useState(false);
  const [expenseDateOpen, setExpenseDateOpen] = useState(false);

  const { data: categoriesData, error: categoriesError } = useSWR<{ data: ExpenseCategory[] }>(
    cafeId ? `/api/finance/categories?cafe_id=${cafeId}` : null, apiFetcher, { revalidateOnFocus: false }
  );

  const { data: expensesData, error: expensesError, mutate, isValidating } = useSWR<{ data: Expense[], total: number, count: number }>(
    cafeId ? `/api/finance/expenses?cafe_id=${cafeId}&start_date=${format(startDate, 'yyyy-MM-dd')}&end_date=${format(endDate, 'yyyy-MM-dd')}${selectedCategory ? `&category_id=${selectedCategory}` : ''}` : null,
    apiFetcher, { revalidateOnFocus: false }
  );

  const { data: summaryData, mutate: mutateSummary } = useSWR<{ data: { totalRevenue: number; targetRevenue: number; targetAchievement: number; targetGap: number } }>(
    cafeId ? `/api/finance/summary?cafe_id=${cafeId}&start_date=${format(startDate, 'yyyy-MM-dd')}&end_date=${format(endDate, 'yyyy-MM-dd')}` : null,
    apiFetcher, { revalidateOnFocus: false }
  );

  const { data: targetsData, mutate: mutateTargets } = useSWR<{ data: Array<{ id: string; monthly_target: number; target_month: number; target_year: number }> }>(
    cafeId ? `/api/finance/targets?cafe_id=${cafeId}&year=${startDate.getFullYear()}&month=${startDate.getMonth() + 1}` : null,
    apiFetcher, { revalidateOnFocus: false }
  );

  const categories: ExpenseCategory[] = Array.isArray(categoriesData?.data) ? categoriesData.data : [];
  const expenses = Array.isArray(expensesData?.data) ? expensesData.data : [];
  const totalExpenses = expensesData?.total || 0;
  const totalRevenue = summaryData?.data?.totalRevenue || 0;
  const targetRevenue = summaryData?.data?.targetRevenue || 0;
  const targetAchievement = summaryData?.data?.targetAchievement || 0;
  const targetGap = summaryData?.data?.targetGap || 0;
  const netProfit = totalRevenue - totalExpenses;
  const profitMargin = totalRevenue > 0 ? Math.round((netProfit / totalRevenue) * 100) : 0;
  const expenseCount = expensesData?.count || expenses.length;

  const isLoading = !categoriesData && !categoriesError && !expensesData && !expensesError;

  useEffect(() => {
    if (editingExpense?.amount) {
      setAmountDisplay(new Intl.NumberFormat('id-ID').format(editingExpense.amount));
    } else if (!editingExpense) {
      setAmountDisplay('');
    }
  }, [editingExpense, isDialogOpen]);

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/[^\d]/g, '');
    const num = raw === '' ? 0 : parseInt(raw);
    setAmountDisplay(raw === '' ? '' : new Intl.NumberFormat('id-ID').format(num));
    setFormData(prev => ({ ...prev, amount: num }));
  };

  const handleSaveTarget = async () => {
    if (!cafeId) return;
    const target = parseInt(targetInput.replace(/[^\d]/g, ''));
    if (!target || target <= 0) { toast.error('Masukkan target yang valid'); return; }
    setIsSavingTarget(true);
    try {
      const currentMonth = startDate.getMonth() + 1;
      const currentYear = startDate.getFullYear();
      await fetchClient('/api/finance/targets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cafe_id: cafeId, target_month: currentMonth, target_year: currentYear, monthly_target: target }),
      });

      if (shouldCopyTarget) {
        const nextMonth = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 1)
        await fetchClient('/api/finance/targets', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ cafe_id: cafeId, target_month: nextMonth.getMonth() + 1, target_year: nextMonth.getFullYear(), monthly_target: target }),
        })
        toast.success(`Target disalin ke ${format(nextMonth, 'MMMM yyyy', { locale: id })}`)
      }

      setIsEditingTarget(false);
      setShouldCopyTarget(false);
      mutateTargets();
      mutateSummary();
      mutate();
    } catch (error: any) {
      toast.error(error instanceof FetchError ? error.message : 'Gagal menyimpan target');
    } finally {
      setIsSavingTarget(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cafeId) return;
    setIsSubmitting(true);
    try {
      const url = editingExpense ? `/api/finance/expenses/${editingExpense.id}` : '/api/finance/expenses';
      const method = editingExpense ? 'PUT' : 'POST';
      await fetchClient(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, cafe_id: cafeId })
      });
      toast.success(editingExpense ? 'Pengeluaran berhasil diperbarui' : 'Pengeluaran berhasil ditambahkan');
      setIsDialogOpen(false);
      resetForm();
      mutate();
    } catch (error: any) {
      const msg = error instanceof FetchError ? error.message : (error.message || 'Terjadi kesalahan');
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = (id: string) => setExpenseToDelete(id);

  const confirmDelete = async () => {
    if (!expenseToDelete) return;
    setIsDeleting(true);
    try {
      await fetchClient(`/api/finance/expenses/${expenseToDelete}`, { method: 'DELETE' });
      toast.success('Pengeluaran berhasil dihapus');
      mutate();
      setExpenseToDelete(null);
    } catch (error: any) {
      const msg = error instanceof FetchError ? error.message : 'Gagal menghapus pengeluaran';
      toast.error(msg);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleEdit = (expense: Expense) => {
    setEditingExpense(expense);
    setFormData({
      category_id: expense.category_id || '', amount: expense.amount,
      description: expense.description || '', expense_date: expense.expense_date,
      receipt_number: expense.receipt_number || '', payment_method: expense.payment_method
    });
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setEditingExpense(null);
    setFormData({
      category_id: '', amount: 0, description: '',
      expense_date: format(new Date(), 'yyyy-MM-dd'), receipt_number: '', payment_method: 'Tunai'
    });
  };

  const getCategoryColor = (categoryId: string) => categories?.find(c => c.id === categoryId)?.color || '#6B7280';
  const getCategoryName = (categoryId: string) => categories?.find(c => c.id === categoryId)?.name || 'Uncategorized';

  if (isLoading) return <ExpenseSkeleton />;

  return (
    <AppShell>
      <motion.div
        className="space-y-4 md:space-y-5"
        initial="hidden"
        animate="visible"
        variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.06 } } }}
      >
        {/* Header */}
        <motion.div
          variants={{ hidden: { opacity: 0, y: -8 }, visible: { opacity: 1, y: 0 } }}
          className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
        >
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Pengeluaran</h1>
            <p className="text-sm text-muted-foreground">Kelola pengeluaran operasional bisnis</p>
          </div>
          <button
            onClick={() => { resetForm(); setIsDialogOpen(true); }}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-all text-sm font-medium active:scale-95"
          >
            <Plus className="h-4 w-4" />
            <span>Tambah Pengeluaran</span>
          </button>
        </motion.div>

        {/* Error */}
        {(categoriesError || expensesError) && (
          <div className="rounded-xl border border-destructive/20 bg-destructive/10 p-4">
            <p className="text-sm text-destructive">Gagal memuat data. Periksa koneksi Anda.</p>
          </div>
        )}

        {/* Filters */}
        <motion.div
          variants={{ hidden: { opacity: 0, y: 4 }, visible: { opacity: 1, y: 0 } }}
          className="rounded-xl border bg-card shadow-sm p-4"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Periode */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold uppercase text-muted-foreground px-1">Periode</label>
              <div className="flex gap-2 items-center">
                <Popover open={startOpen} onOpenChange={setStartOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="flex-1 justify-start h-9 rounded-lg text-sm font-normal">
                      <CalendarIcon className="w-4 h-4 mr-1.5 text-muted-foreground shrink-0" />
                      {format(startDate, 'dd/MM/yyyy')}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 rounded-xl" align="start">
                    <Calendar mode="single" selected={startDate} onSelect={(date) => { if (date) { setStartDate(date); setStartOpen(false); } }} />
                  </PopoverContent>
                </Popover>
                <span className="text-muted-foreground text-sm">—</span>
                <Popover open={endOpen} onOpenChange={setEndOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="flex-1 justify-start h-9 rounded-lg text-sm font-normal">
                      <CalendarIcon className="w-4 h-4 mr-1.5 text-muted-foreground shrink-0" />
                      {format(endDate, 'dd/MM/yyyy')}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 rounded-xl" align="start">
                    <Calendar mode="single" selected={endDate} onSelect={(date) => { if (date) { setEndDate(date); setEndOpen(false); } }} />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {/* Kategori */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold uppercase text-muted-foreground px-1">Kategori</label>
              <div className="flex gap-2">
                <Select value={selectedCategory || 'all'} onValueChange={(v) => setSelectedCategory(v === 'all' ? '' : v)}>
                  <SelectTrigger className="flex-1 h-9 rounded-lg">
                    <SelectValue placeholder="Semua Kategori" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Kategori</SelectItem>
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
                {selectedCategory && (
                  <Button variant="ghost" size="icon" className="h-9 w-9 rounded-lg shrink-0" onClick={() => setSelectedCategory('')}>
                    <X className="w-4 h-4" />
                  </Button>
                )}
                <Button variant="outline" size="icon" className="h-9 w-9 rounded-lg shrink-0" onClick={() => mutate()} disabled={isValidating}>
                  <RefreshCw className={cn("w-4 h-4", isValidating && "animate-spin")} />
                </Button>
              </div>
            </div>
          </div>

          {/* Reset */}
          <div className="flex items-center gap-2 pt-3 mt-3 border-t border-dashed">
            <Button
              variant="ghost"
              className="flex-1 sm:flex-none px-4 h-9 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground"
              onClick={() => {
                setStartDate(new Date(new Date().getFullYear(), new Date().getMonth(), 1))
                setEndDate(new Date())
                setSelectedCategory('')
              }}
            >
              <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
              Reset Filter
            </Button>
          </div>
        </motion.div>

        {/* Summary Card */}
        <motion.div
          variants={{ hidden: { opacity: 0, y: 4 }, visible: { opacity: 1, y: 0 } }}
          className="rounded-xl border bg-card shadow-sm p-4 md:p-5"
        >
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">Ringkasan Keuangan</h3>
            <span className="text-xs text-muted-foreground">
              {format(startDate, 'dd MMM')} - {format(endDate, 'dd MMM')}
            </span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
            <div>
              <p className="text-xs text-muted-foreground font-medium mb-0.5">Pendapatan</p>
              <p className="font-semibold text-sm md:text-base tabular-nums">{formatRupiah(totalRevenue)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium mb-0.5">Pengeluaran</p>
              <p className="font-semibold text-sm md:text-base tabular-nums">{formatRupiah(totalExpenses)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium mb-0.5">Laba/Rugi</p>
              <p className={cn("font-bold text-sm md:text-base tabular-nums", netProfit >= 0 ? 'text-emerald-600' : 'text-red-600')}>
                {formatRupiah(netProfit)}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium mb-0.5">Margin</p>
              <span className={cn(
                "inline-flex text-xs font-semibold px-2 py-0.5 rounded",
                netProfit >= 0 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300'
              )}>
                {netProfit >= 0 ? '+' : ''}{Math.abs(profitMargin)}%
              </span>
            </div>
          </div>
        </motion.div>

        {/* Target Revenue */}
        <motion.div
          variants={{ hidden: { opacity: 0, y: 4 }, visible: { opacity: 1, y: 0 } }}
          className="rounded-xl border bg-card shadow-sm p-4 md:p-5"
        >
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">Target Pendapatan</h3>
              <p className="text-xs text-muted-foreground mt-0.5">{format(startDate, 'MMMM yyyy', { locale: id })}</p>
            </div>
            {isAdmin && (
              <button
                onClick={() => {
                  setTargetInput(targetsData?.data?.[0]?.monthly_target ? new Intl.NumberFormat('id-ID').format(targetsData.data[0].monthly_target) : '')
                  setIsEditingTarget(true)
                }}
                className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                <Plus className="h-3 w-3" />
                {targetRevenue > 0 ? 'Ubah' : 'Atur Target'}
              </button>
            )}
          </div>

          {targetRevenue > 0 ? (
            <div className="space-y-3">
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">Pencapaian</p>
                  <p className="text-lg font-bold tabular-nums">{targetAchievement}%</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground mb-0.5">Target</p>
                  <p className="text-sm font-semibold tabular-nums">{formatRupiah(targetRevenue)}</p>
                </div>
              </div>
              <div className="h-2.5 bg-muted rounded-full overflow-hidden">
                <div
                  className={cn("h-full rounded-full transition-all duration-700", targetAchievement >= 100 ? 'bg-emerald-500' : targetAchievement >= 70 ? 'bg-amber-500' : 'bg-red-500')}
                  style={{ width: `${Math.min(targetAchievement, 100)}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                {targetAchievement >= 100
                  ? 'Target tercapai! 🎉'
                  : `Kurang ${formatRupiah(Math.abs(targetGap))} lagi`}
              </p>
            </div>
          ) : (
            <div className="py-4 text-center text-sm text-muted-foreground">
              {isAdmin ? 'Atur target untuk mulai melacak pencapaian.' : 'Belum ada target untuk bulan ini.'}
            </div>
          )}
        </motion.div>

        {/* Target Dialog */}
        <Dialog open={isEditingTarget} onOpenChange={setIsEditingTarget}>
          <DialogContent className="sm:max-w-[400px] p-0 gap-0 overflow-hidden rounded-xl">
            <DialogHeader className="px-5 pt-5 pb-4 border-b border-border">
              <DialogTitle className="text-lg font-semibold">Target Pendapatan</DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground">
                {format(startDate, 'MMMM yyyy', { locale: id })}
              </DialogDescription>
            </DialogHeader>
            <div className="px-5 py-4 space-y-4">
              <div className="space-y-1.5">
                <Label className="text-sm">Target Bulanan (Rp)</Label>
                <Input
                  className="h-10 rounded-lg font-mono text-base"
                  value={targetInput}
                  onChange={(e) => {
                    const raw = e.target.value.replace(/[^\d]/g, '');
                    setTargetInput(raw === '' ? '' : new Intl.NumberFormat('id-ID').format(parseInt(raw)));
                  }}
                  placeholder="0"
                  autoFocus
                />
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={shouldCopyTarget}
                  onChange={(e) => setShouldCopyTarget(e.target.checked)}
                  className="rounded border-border h-4 w-4"
                />
                <span className="text-xs">Salin juga ke {format(new Date(startDate.getFullYear(), startDate.getMonth() + 1, 1), 'MMMM yyyy', { locale: id })}</span>
              </label>
            </div>
            <div className="flex items-center justify-end gap-3 px-5 py-3 border-t border-border bg-muted/30">
              <button onClick={() => setIsEditingTarget(false)} className="px-4 py-2 rounded-lg border bg-background hover:bg-muted transition text-sm">Batal</button>
              <button onClick={handleSaveTarget} disabled={isSavingTarget} className="px-5 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition text-sm font-medium disabled:opacity-50">
                {isSavingTarget ? 'Menyimpan...' : 'Simpan'}
              </button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Category Breakdown */}
        <motion.div variants={{ hidden: { opacity: 0, y: 4 }, visible: { opacity: 1, y: 0 } }}>
          <CategoryBreakdown expenses={expenses} categories={categories} total={totalExpenses} />
        </motion.div>

        {/* Expenses List */}
        <motion.div variants={{ hidden: { opacity: 0, y: 4 }, visible: { opacity: 1, y: 0 } }}>
        <div className="space-y-1">
          <div className="text-xs text-muted-foreground/70 px-1 mb-2">
            {expenseCount} pengeluaran · {formatRupiah(totalExpenses)}
          </div>

          {/* Desktop Table */}
          <div className="hidden sm:block overflow-hidden rounded-xl border bg-card shadow-sm relative">
            {isValidating && (
              <div className="absolute inset-0 bg-background/60 backdrop-blur-[1px] z-10 flex items-center justify-center">
                <div className="flex items-center gap-2 bg-background border rounded-lg px-4 py-2 shadow-lg">
                  <RefreshCw className="w-4 h-4 animate-spin text-primary" />
                  <span className="text-sm font-medium">Memuat...</span>
                </div>
              </div>
            )}
            {expenses.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
                <Wallet className="h-14 w-14 text-muted-foreground/20 mb-3" />
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
                    <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider hidden lg:table-cell">Dibuat Oleh</th>
                    <th className="text-center py-3 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider w-24">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {expenses.map((expense: Expense) => (
                    <tr key={expense.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="font-medium">{format(parseISO(expense.expense_date), 'dd MMM yyyy', { locale: id })}</span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: getCategoryColor(expense.category_id || '') }} />
                          <span className="text-xs">{getCategoryName(expense.category_id || '')}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-muted-foreground max-w-[140px] truncate">{expense.description || '-'}</td>
                      <td className="py-3 px-4 text-right font-semibold tabular-nums">{formatRupiah(expense.amount)}</td>
                      <td className="py-3 px-4 text-muted-foreground text-xs hidden lg:table-cell">{expense.created_by_name || '-'}</td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-center gap-1">
                          <button onClick={() => handleEdit(expense)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-muted transition-all text-muted-foreground active:scale-90" title="Edit">
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button onClick={() => handleDelete(expense.id)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-red-50 hover:text-red-600 transition-all text-muted-foreground active:scale-90" title="Hapus">
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
            {!isValidating && expenses.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 px-4 text-center rounded-xl border bg-card">
                <Wallet className="h-12 w-12 text-muted-foreground/20 mb-3" />
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
                    transition={{ duration: 0.15 }}
                    className="rounded-xl border bg-card shadow-sm overflow-hidden"
                  >
                    <div className="flex items-center justify-between p-3 border-b border-border/30 bg-muted/20">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: getCategoryColor(expense.category_id || '') }} />
                        <span className="text-xs font-medium">{getCategoryName(expense.category_id || '')}</span>
                      </div>
                      <div className="font-bold text-sm tabular-nums">{formatRupiah(expense.amount)}</div>
                    </div>
                    <div className="p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">{format(parseISO(expense.expense_date), 'dd MMM yyyy', { locale: id })}</span>
                        <span className="text-xs text-muted-foreground">{expense.payment_method}</span>
                      </div>
                      {expense.description && <p className="text-xs text-muted-foreground line-clamp-2">{expense.description}</p>}
                      <div className="flex items-center justify-between pt-1 border-t border-border/30">
                        <span className="text-xs text-muted-foreground">{expense.created_by_name || '-'}</span>
                        <div className="flex items-center gap-1">
                          <button onClick={() => handleEdit(expense)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-muted transition-all text-muted-foreground active:scale-90">
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button onClick={() => handleDelete(expense.id)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-red-50 hover:text-red-600 transition-all text-muted-foreground active:scale-90">
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
        </motion.div>

      {/* Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[480px] max-w-[95vw] p-0 gap-0 overflow-hidden rounded-xl">
          <DialogHeader className="px-5 pt-5 pb-4 border-b border-border">
            <DialogTitle className="text-lg font-semibold">{editingExpense ? 'Edit Pengeluaran' : 'Tambah Pengeluaran'}</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              {editingExpense ? 'Perbarui detail pengeluaran operasional' : 'Catat pengeluaran operasional baru'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="px-5 py-4 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="category" className="text-sm">Kategori <span className="text-destructive">*</span></Label>
                  <Select value={formData.category_id} onValueChange={(v) => setFormData(prev => ({ ...prev, category_id: v }))}>
                    <SelectTrigger className="h-10 rounded-lg"><SelectValue placeholder="Pilih kategori" /></SelectTrigger>
                    <SelectContent>
                      {categories?.map(cat => (
                        <SelectItem key={cat.id} value={cat.id}>
                          <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cat.color }} />{cat.name}</div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm">Jumlah (Rp) <span className="text-destructive">*</span></Label>
                  <Input className="h-10 rounded-lg font-mono" value={amountDisplay} onChange={handleAmountChange} placeholder="0" required />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-sm">Tanggal <span className="text-destructive">*</span></Label>
                  <Popover open={expenseDateOpen} onOpenChange={setExpenseDateOpen}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start h-10 rounded-lg font-normal">
                        <CalendarIcon className="w-4 h-4 mr-2 text-muted-foreground" />
                        {formData.expense_date ? format(parseISO(formData.expense_date), 'dd MMM yyyy', { locale: id }) : 'Pilih tanggal'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 rounded-xl" align="start">
                      <Calendar mode="single" selected={parseISO(formData.expense_date)} onSelect={(date) => { if (date) { setFormData(prev => ({ ...prev, expense_date: format(date, 'yyyy-MM-dd') })); setExpenseDateOpen(false); } }} />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm">Metode Pembayaran</Label>
                  <Select value={formData.payment_method} onValueChange={(v: any) => setFormData(prev => ({ ...prev, payment_method: v }))}>
                    <SelectTrigger className="h-10 rounded-lg"><SelectValue /></SelectTrigger>
                    <SelectContent>{paymentMethods.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">Deskripsi</Label>
                <Input className="h-10 rounded-lg" value={formData.description} onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))} placeholder="Keterangan pengeluaran" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">Nomor Nota</Label>
                <Input className="h-10 rounded-lg font-mono" value={formData.receipt_number} onChange={(e) => setFormData(prev => ({ ...prev, receipt_number: e.target.value }))} placeholder="Nomor nota/referensi" />
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 px-5 py-3 border-t border-border bg-muted/30">
              <button type="button" onClick={() => setIsDialogOpen(false)} className="px-4 py-2 rounded-lg border bg-background hover:bg-muted transition text-sm">Batal</button>
              <button type="submit" disabled={isSubmitting} className="px-5 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition text-sm font-medium flex items-center gap-2 disabled:opacity-50">
                {isSubmitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : null}
                {isSubmitting ? 'Menyimpan...' : editingExpense ? 'Simpan Perubahan' : 'Tambah Pengeluaran'}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AnimatePresence>
        {expenseToDelete && (
          <>
            <motion.div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setExpenseToDelete(null)} />
            <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}>
              <div className="w-full max-w-md bg-card border rounded-xl shadow-2xl overflow-hidden">
                <div className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="p-2.5 rounded-full bg-red-500/10 flex-shrink-0"><Trash2 className="h-5 w-5 text-red-600" /></div>
                    <div>
                      <h3 className="font-semibold text-lg mb-1">Hapus Pengeluaran?</h3>
                      <p className="text-sm text-muted-foreground">Tindakan ini tidak dapat dibatalkan.</p>
                    </div>
                  </div>
                </div>
                <div className="flex gap-3 p-4 border-t bg-muted/20">
                  <button onClick={() => setExpenseToDelete(null)} disabled={isDeleting} className="flex-1 px-4 py-2 rounded-lg border bg-background hover:bg-muted transition text-sm disabled:opacity-50">Batal</button>
                  <button onClick={confirmDelete} disabled={isDeleting} className="flex-1 px-4 py-2 rounded-lg bg-destructive text-destructive-foreground hover:bg-destructive/90 transition text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2">
                    {isDeleting ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                    {isDeleting ? 'Menghapus...' : 'Hapus'}
                  </button>
                </div>
              </div>
            </motion.div>
              </>
        )}
      </AnimatePresence>
      </motion.div>
    </AppShell>
  )
}
