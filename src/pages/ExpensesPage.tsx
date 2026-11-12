import React, { useState } from 'react';
import {
  Plus,
  Search,
  Receipt,
  FileSpreadsheet,
  Trash2,
  Calendar,
  Building,
  CreditCard,
  PieChart
} from 'lucide-react';
import { Expense, ExpenseCategory, Vehicle } from '../types/fleet.js';
import { formatCurrency, formatDate } from '../utils/formatters.js';
import { Modal } from '../components/Modal.js';
import { exportToCsv } from '../utils/export.js';
import { useI18n } from '../i18n/I18nContext.js';

interface ExpensesPageProps {
  expenses: Expense[];
  vehicles: Vehicle[];
  onRefresh: () => void;
  onShowToast: (type: 'success' | 'error' | 'warning', msg: string) => void;
  api: any;
  searchTerm?: string;
}

const CATEGORIES: ExpenseCategory[] = [
  'Servis',
  'Opravy',
  'Poistenie',
  'Pneumatiky',
  'Diaľničné známky',
  'Parkovné',
  'Palivo',
  'Ostatné'
];

export function ExpensesPage({
  expenses,
  vehicles,
  onRefresh,
  onShowToast,
  api,
  searchTerm = ''
}: ExpensesPageProps) {
  const { t } = useI18n();
  const [localSearch, setLocalSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [vehicleFilter, setVehicleFilter] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form
  const [formData, setFormData] = useState({
    vehicleId: '',
    category: 'Servis' as ExpenseCategory,
    date: new Date().toISOString().split('T')[0],
    amount: 150,
    description: '',
    supplier: '',
    invoiceNumber: ''
  });

  const effectiveSearch = searchTerm || localSearch;

  // Filtered Expenses
  const filteredExpenses = expenses.filter(e => {
    const matchesCategory = categoryFilter === 'all' || e.category === categoryFilter;
    const matchesVehicle =
      vehicleFilter === 'all' ||
      (vehicleFilter === 'fleet' ? !e.vehicleId : e.vehicleId === vehicleFilter);
    const term = effectiveSearch.toLowerCase().trim();
    const matchesSearch =
      !term ||
      e.description.toLowerCase().includes(term) ||
      e.supplier.toLowerCase().includes(term) ||
      e.invoiceNumber.toLowerCase().includes(term) ||
      (e.vehiclePlate && e.vehiclePlate.toLowerCase().includes(term));
    return matchesCategory && matchesVehicle && matchesSearch;
  });

  // Calculate Metrics
  const totalAmount = filteredExpenses.reduce((s, e) => s + e.amount, 0);
  const now = new Date();
  const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const thisMonthExpenses = filteredExpenses
    .filter(e => e.date.startsWith(currentMonthStr))
    .reduce((s, e) => s + e.amount, 0);

  const thisYearStr = String(now.getFullYear());
  const thisYearExpenses = filteredExpenses
    .filter(e => e.date.startsWith(thisYearStr))
    .reduce((s, e) => s + e.amount, 0);

  const openCreateModal = () => {
    setFormData({
      vehicleId: vehicles[0]?.id || '',
      category: 'Servis',
      date: new Date().toISOString().split('T')[0],
      amount: 120,
      description: '',
      supplier: 'Todos Košice s.r.o.',
      invoiceNumber: `FA-${Date.now().toString().slice(-6)}`
    });
    setIsModalOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.createExpense({
        ...formData,
        amount: Number(formData.amount)
      });
      onShowToast('success', 'Výdavok úspešne zaevidovaný.');
      setIsModalOpen(false);
      onRefresh();
    } catch (err: any) {
      onShowToast('error', err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.deleteExpense(id);
      onShowToast('success', 'Náklad bol zmazaný.');
      setDeleteConfirmId(null);
      onRefresh();
    } catch (err: any) {
      onShowToast('error', err.message);
    }
  };

  const handleExportCsv = () => {
    const headers = ['Dátum', 'Kategória', 'Vozidlo', 'Popis', 'Suma (€)', 'Dodávateľ', 'Číslo faktúry'];
    const rows = filteredExpenses.map(e => [
      e.date,
      e.category,
      e.vehiclePlate || 'Celá flotila',
      e.description,
      e.amount,
      e.supplier,
      e.invoiceNumber
    ]);
    exportToCsv('Naklady_LogiTrans', headers, rows);
    onShowToast('success', 'Export nákladov do CSV bol stiahnutý.');
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            {t('page.expenses.title')}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {t('page.expenses.description')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCsv}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg transition-colors shadow-2xs"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            <span>{t('page.exportCsv')}</span>
          </button>
          <button
            onClick={openCreateModal}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{t('page.addExpense')}</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-xs text-slate-500 block">Celkové náklady (filtrované)</span>
          <span className="text-xl font-bold text-slate-900 font-mono tabular-nums block mt-1">
            {formatCurrency(totalAmount)}
          </span>
          <span className="text-[11px] text-slate-400 mt-1 block">Zoznam {filteredExpenses.length} dokladov</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-xs text-slate-500 block">Náklady tento mesiac</span>
          <span className="text-xl font-bold text-blue-600 font-mono tabular-nums block mt-1">
            {formatCurrency(thisMonthExpenses)}
          </span>
          <span className="text-[11px] text-slate-400 mt-1 block">Aktuálny kalendárny mesiac</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-xs text-slate-500 block">Náklady tento rok ({thisYearStr})</span>
          <span className="text-xl font-bold text-emerald-600 font-mono tabular-nums block mt-1">
            {formatCurrency(thisYearExpenses)}
          </span>
          <span className="text-[11px] text-slate-400 mt-1 block">Ročná kumulatívna suma</span>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder={t('page.searchExpense')}
            value={effectiveSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-500 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none transition-all"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto text-xs">
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 font-medium">Kategória:</span>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none text-xs text-slate-800"
            >
              <option value="all">Všetky kategórie</option>
              {CATEGORIES.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 font-medium">Vozidlo:</span>
            <select
              value={vehicleFilter}
              onChange={(e) => setVehicleFilter(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none text-xs text-slate-800"
            >
              <option value="all">Všetky (vrátane flotilových)</option>
              <option value="fleet">Iba celá flotila (bez auta)</option>
              {vehicles.map(v => (
                <option key={v.id} value={v.id}>
                  {v.licensePlate} ({v.brand} {v.model})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Expenses Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4 font-semibold">{t('page.date')}</th>
                <th className="py-3 px-4 font-semibold">{t('page.category')}</th>
                <th className="py-3 px-4 font-semibold">{t('page.vehicle')}</th>
                <th className="py-3 px-4 font-semibold">{t('page.description')}</th>
                <th className="py-3 px-4 font-semibold">{t('page.vendorReceipt')}</th>
                <th className="py-3 px-4 font-semibold text-right">{t('page.amount')}</th>
                <th className="py-3 px-4 font-semibold text-right">{t('page.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredExpenses.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    Nenašli sa žiadne náklady pre zadaný výber.
                  </td>
                </tr>
              ) : (
                filteredExpenses.map((exp) => (
                  <tr key={exp.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-mono text-slate-700 whitespace-nowrap">
                      {formatDate(exp.date)}
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-semibold text-slate-800">
                        {exp.category}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {exp.vehiclePlate ? (
                        <div>
                          <span className="font-mono font-bold text-slate-900">{exp.vehiclePlate}</span>
                          <span className="text-[10px] text-slate-400 block">{exp.vehicleName}</span>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">Celá flotila</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-700 max-w-xs">
                      <div className="truncate font-medium">{exp.description}</div>
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      <div className="truncate max-w-[180px]">{exp.supplier}</div>
                      <div className="text-[10px] font-mono text-slate-400">{exp.invoiceNumber}</div>
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums font-bold text-slate-900">
                      {formatCurrency(exp.amount)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => setDeleteConfirmId(exp.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-slate-100 rounded transition-colors"
                        title="Zmazať doklad"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Pridať nový náklad"
        subtitle="Evidencia faktúr a účteniek za servis, poistenie, diaľničné známky či iné výdavky."
        maxWidth="lg"
      >
        <form onSubmit={handleFormSubmit} className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-slate-700 mb-1">{t('page.expenseCategory')}</label>
              <select
                required
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 bg-white"
              >
                {CATEGORIES.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">{t('page.expenseDate')}</label>
              <input
                type="date"
                required
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-slate-700 mb-1">Vozidlo (nepovinné)</label>
              <select
                value={formData.vehicleId}
                onChange={(e) => setFormData({ ...formData, vehicleId: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 bg-white"
              >
                <option value="">-- Celá flotila (réžia) --</option>
                {vehicles.map(v => (
                  <option key={v.id} value={v.id}>
                    {v.licensePlate} ({v.brand} {v.model})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">{t('page.amount')} (EUR) *</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: Number(e.target.value) })}
                className="w-full px-3 py-2 font-mono border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block font-medium text-slate-700 mb-1">{t('page.expenseDescription')}</label>
            <input
              type="text"
              required
              placeholder="napr. Výmena oleja a filtrov, Ročná PZP Allianz..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-slate-700 mb-1">{t('page.supplier')}</label>
              <input
                type="text"
                placeholder="napr. Todos Košice s.r.o."
                value={formData.supplier}
                onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">{t('page.invoice')}</label>
              <input
                type="text"
                placeholder="napr. FA-2026-0812"
                value={formData.invoiceNumber}
                onChange={(e) => setFormData({ ...formData, invoiceNumber: e.target.value })}
                className="w-full px-3 py-2 font-mono border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium"
            >
              Zrušiť
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs font-semibold disabled:opacity-50"
            >
              {submitting ? 'Ukladám...' : 'Uložiť náklad'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Modal */}
      <Modal
        isOpen={deleteConfirmId !== null}
        onClose={() => setDeleteConfirmId(null)}
        title="Vymazanie nákladu"
        subtitle="Záznam o výdavku bude odstránený."
        maxWidth="sm"
      >
        <div className="space-y-4 text-xs">
          <p className="text-slate-600">
            Naozaj chcete zmazať tento náklad? Prepočty rozpočtu flotily sa okamžite aktualizujú.
          </p>
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              onClick={() => setDeleteConfirmId(null)}
              className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg"
            >
              Zrušiť
            </button>
            <button
              onClick={() => deleteConfirmId && handleDelete(deleteConfirmId)}
              className="px-3 py-1.5 text-white bg-rose-600 hover:bg-rose-700 rounded-lg font-semibold"
            >
              Zmazať
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
