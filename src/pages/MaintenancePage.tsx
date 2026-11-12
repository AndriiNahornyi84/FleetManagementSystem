import React, { useState } from 'react';
import {
  Plus,
  Search,
  Wrench,
  Calendar,
  CheckCircle,
  Clock,
  AlertTriangle,
  FileSpreadsheet,
  Trash2
} from 'lucide-react';
import { Maintenance, MaintenanceType, MaintenanceStatus, Vehicle } from '../types/fleet.js';
import {
  formatCurrency,
  formatKm,
  formatDate,
  getMaintenanceStatusBadge
} from '../utils/formatters.js';
import { Modal } from '../components/Modal.js';
import { exportToCsv } from '../utils/export.js';
import { useI18n } from '../i18n/I18nContext.js';

interface MaintenancePageProps {
  maintenance: Maintenance[];
  vehicles: Vehicle[];
  onRefresh: () => void;
  onShowToast: (type: 'success' | 'error' | 'warning', msg: string) => void;
  api: any;
  searchTerm?: string;
}

const SERVICE_TYPES: MaintenanceType[] = [
  'Výmena oleja',
  'Výmena filtrov',
  'Výmena pneumatík',
  'Oprava motora',
  'Brzdový systém',
  'Výmena batérie',
  'Pravidelný servis',
  'Iné'
];

export function MaintenancePage({
  maintenance,
  vehicles,
  onRefresh,
  onShowToast,
  api,
  searchTerm = ''
}: MaintenancePageProps) {
  const { t } = useI18n();
  const [localSearch, setLocalSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [vehicleFilter, setVehicleFilter] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form
  const [formData, setFormData] = useState({
    vehicleId: '',
    serviceType: 'Výmena oleja' as MaintenanceType,
    date: new Date().toISOString().split('T')[0],
    mileage: 0,
    serviceCenter: 'Todos Košice s.r.o.',
    description: '',
    cost: 180,
    nextServiceDate: '',
    nextServiceMileage: 0,
    status: 'completed' as MaintenanceStatus,
    notes: ''
  });

  const effectiveSearch = searchTerm || localSearch;

  const filteredList = maintenance.filter(m => {
    const matchesStatus = statusFilter === 'all' || m.status === statusFilter;
    const matchesVehicle = vehicleFilter === 'all' || m.vehicleId === vehicleFilter;
    const term = effectiveSearch.toLowerCase().trim();
    const matchesSearch =
      !term ||
      (m.vehiclePlate && m.vehiclePlate.toLowerCase().includes(term)) ||
      (m.vehicleName && m.vehicleName.toLowerCase().includes(term)) ||
      m.serviceType.toLowerCase().includes(term) ||
      m.serviceCenter.toLowerCase().includes(term) ||
      m.description.toLowerCase().includes(term);
    return matchesStatus && matchesVehicle && matchesSearch;
  });

  const openCreateModal = () => {
    const v = vehicles[0];
    setFormData({
      vehicleId: v ? v.id : '',
      serviceType: 'Výmena oleja',
      date: new Date().toISOString().split('T')[0],
      mileage: v ? v.currentMileage : 150000,
      serviceCenter: 'Todos Košice s.r.o.',
      description: '',
      cost: 180,
      nextServiceDate: '',
      nextServiceMileage: v ? v.currentMileage + 30000 : 180000,
      status: 'completed',
      notes: ''
    });
    setIsModalOpen(true);
  };

  const handleVehicleChange = (vId: string) => {
    const v = vehicles.find(veh => veh.id === vId);
    if (v) {
      setFormData(prev => ({
        ...prev,
        vehicleId: vId,
        mileage: v.currentMileage,
        nextServiceMileage: v.currentMileage + 30000
      }));
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.createMaintenance({
        ...formData,
        cost: Number(formData.cost) || 0,
        mileage: Number(formData.mileage) || 0,
        nextServiceMileage: Number(formData.nextServiceMileage) || null
      });
      onShowToast('success', 'Servisný záznam úspešne uložený a zaevidovaný do nákladov.');
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
      await api.deleteMaintenance(id);
      onShowToast('success', 'Záznam údržby bol odstránený.');
      setDeleteConfirmId(null);
      onRefresh();
    } catch (err: any) {
      onShowToast('error', err.message);
    }
  };

  const handleExportCsv = () => {
    const headers = [
      'Dátum',
      'EČV',
      'Vozidlo',
      'Typ servisu',
      'Tachometer (km)',
      'Servisné stredisko',
      'Popis',
      'Cena (€)',
      'Stav',
      'Ďalší servis (dátum)',
      'Ďalší servis (km)'
    ];
    const rows = filteredList.map(m => [
      m.date,
      m.vehiclePlate || '',
      m.vehicleName || '',
      m.serviceType,
      m.mileage,
      m.serviceCenter,
      m.description,
      m.cost,
      m.status,
      m.nextServiceDate || '',
      m.nextServiceMileage || ''
    ]);
    exportToCsv('Udrzba_LogiTrans', headers, rows);
    onShowToast('success', 'Export servisných záznamov do CSV stiahnutý.');
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            {t('page.maintenance.title')}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {t('page.maintenance.description')}
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
            <span>{t('page.addMaintenance')}</span>
          </button>
        </div>
      </div>

      {/* Filter and Search */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder={t('page.searchMaintenance')}
            value={effectiveSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-500 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none transition-all"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto text-xs">
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 font-medium">{t('page.status')}:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none text-xs text-slate-800"
            >
              <option value="all">{t('common.all')}</option>
              <option value="scheduled">{t('status.scheduled')}</option>
              <option value="in_progress">{t('status.in_progress')}</option>
              <option value="completed">{t('status.completed')}</option>
              <option value="cancelled">{t('status.cancelled')}</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 font-medium">Vozidlo:</span>
            <select
              value={vehicleFilter}
              onChange={(e) => setVehicleFilter(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none text-xs text-slate-800"
            >
              <option value="all">Všetky vozidlá</option>
              {vehicles.map(v => (
                <option key={v.id} value={v.id}>
                  {v.licensePlate} ({v.brand} {v.model})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Maintenance Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4 font-semibold">{t('page.date')}</th>
                <th className="py-3 px-4 font-semibold">{t('page.vehicle')}</th>
                <th className="py-3 px-4 font-semibold">{t('page.serviceType')}</th>
                <th className="py-3 px-4 font-semibold">{t('page.center')}</th>
                <th className="py-3 px-4 font-semibold">{t('page.workDescription')}</th>
                <th className="py-3 px-4 font-semibold text-right">{t('page.odometer')}</th>
                <th className="py-3 px-4 font-semibold text-right">{t('page.amount')}</th>
                <th className="py-3 px-4 font-semibold text-center">{t('page.status')}</th>
                <th className="py-3 px-4 font-semibold text-right">{t('page.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredList.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    Nenašli sa žiadne servisné záznamy.
                  </td>
                </tr>
              ) : (
                filteredList.map((m) => {
                  const badge = getMaintenanceStatusBadge(m.status);
                  return (
                    <tr key={m.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-mono text-slate-700 whitespace-nowrap">
                        {formatDate(m.date)}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-mono font-bold text-slate-900">
                          {m.vehiclePlate}
                        </div>
                        <div className="text-[10px] text-slate-400 truncate max-w-[140px]">
                          {m.vehicleName}
                        </div>
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-800">
                        {m.serviceType}
                      </td>
                      <td className="py-3 px-4 text-slate-600 truncate max-w-[150px]">
                        {m.serviceCenter}
                      </td>
                      <td className="py-3 px-4 text-slate-600 max-w-xs">
                        <div className="truncate font-medium">{m.description}</div>
                        {m.nextServiceDate && (
                          <div className="text-[10px] text-slate-400 mt-0.5 font-mono">
                            Ďalší termín: {formatDate(m.nextServiceDate)}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-800">
                        {formatKm(m.mileage)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums font-bold text-slate-900">
                        {formatCurrency(m.cost)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-medium ${badge.bg} ${badge.text}`}>
                          {t(`status.${m.status}` as 'status.completed' | 'status.scheduled' | 'status.in_progress' | 'status.cancelled')}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => setDeleteConfirmId(m.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-slate-100 rounded transition-colors"
                          title="Zmazať servis"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Create Maintenance */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Zaevidovať servisný úkon"
        subtitle="Záznam o oprave, prehliadke alebo výmene dielov sa automaticky prepojí s nákladmi."
        maxWidth="lg"
      >
        <form onSubmit={handleFormSubmit} className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-slate-700 mb-1">Vozidlo *</label>
              <select
                required
                value={formData.vehicleId}
                onChange={(e) => handleVehicleChange(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 bg-white"
              >
                {vehicles.map(v => (
                  <option key={v.id} value={v.id}>
                    {v.licensePlate} ({v.brand} {v.model})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">Typ servisu *</label>
              <select
                required
                value={formData.serviceType}
                onChange={(e) => setFormData({ ...formData, serviceType: e.target.value as any })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 bg-white"
              >
                {SERVICE_TYPES.map(st => (
                  <option key={st} value={st}>{st}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block font-medium text-slate-700 mb-1">{t('page.serviceDate')}</label>
              <input
                type="date"
                required
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">Tachometer (km) *</label>
              <input
                type="number"
                min="0"
                required
                value={formData.mileage}
                onChange={(e) => setFormData({ ...formData, mileage: Number(e.target.value) })}
                className="w-full px-3 py-2 font-mono border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">Cena s DPH (€) *</label>
              <input
                type="number"
                step="0.01"
                min="0"
                required
                value={formData.cost}
                onChange={(e) => setFormData({ ...formData, cost: Number(e.target.value) })}
                className="w-full px-3 py-2 font-mono border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div>
              <label className="block font-medium text-slate-700 mb-1">{t('page.serviceCenter')}</label>
            <input
              type="text"
              required
              placeholder="napr. Todos Košice, Motor-Car Prešov..."
              value={formData.serviceCenter}
              onChange={(e) => setFormData({ ...formData, serviceCenter: e.target.value })}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block font-medium text-slate-700 mb-1">{t('page.workDetails')}</label>
            <textarea
              rows={2}
              required
              placeholder="Rozsah servisu, použité náhradné diely, čísla dielov..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-slate-700 mb-1">Plánovaný ďalší servis (dátum)</label>
              <input
                type="date"
                value={formData.nextServiceDate}
                onChange={(e) => setFormData({ ...formData, nextServiceDate: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">{t('page.serviceStatus')}</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 bg-white"
              >
                <option value="completed">Dokončené (hotové)</option>
                <option value="in_progress">Prebieha (vozidlo v servise)</option>
                <option value="scheduled">Naplánované (objednaný termín)</option>
              </select>
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
              {submitting ? 'Ukladám...' : 'Zaevidovať servis'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <Modal
        isOpen={deleteConfirmId !== null}
        onClose={() => setDeleteConfirmId(null)}
        title="Vymazanie servisného záznamu"
        subtitle="Záznam bude odstránený aj z prepojených nákladov."
        maxWidth="sm"
      >
        <div className="space-y-4 text-xs">
          <p className="text-slate-600">
            Naozaj chcete zmazať tento záznam servisu? Príslušná položka v evidencii nákladov bude taktiež vymazaná.
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
