import React, { useState } from 'react';
import {
  Plus,
  Search,
  Fuel,
  Droplets,
  DollarSign,
  TrendingDown,
  FileSpreadsheet,
  Trash2,
  Calendar,
  AlertCircle
} from 'lucide-react';
import { FuelRecord, Vehicle, Driver } from '../types/fleet.js';
import {
  formatCurrency,
  formatKm,
  formatConsumption,
  formatDate
} from '../utils/formatters.js';
import { Modal } from '../components/Modal.js';
import { exportToCsv } from '../utils/export.js';
import { useI18n } from '../i18n/I18nContext.js';

interface FuelPageProps {
  fuelRecords: FuelRecord[];
  vehicles: Vehicle[];
  drivers: Driver[];
  onRefresh: () => void;
  onShowToast: (type: 'success' | 'error' | 'warning', msg: string) => void;
  api: any;
  searchTerm?: string;
}

export function FuelPage({
  fuelRecords,
  vehicles,
  drivers,
  onRefresh,
  onShowToast,
  api,
  searchTerm = ''
}: FuelPageProps) {
  const { t } = useI18n();
  const [localSearch, setLocalSearch] = useState('');
  const [selectedVehicleId, setSelectedVehicleId] = useState('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    vehicleId: '',
    driverId: '',
    date: new Date().toISOString().split('T')[0],
    fuelStation: 'Slovnaft Košice - Južná trieda',
    fuelAmount: 50,
    pricePerLiter: 1.55,
    mileage: 0,
    fuelType: 'Nafta',
    fullTank: true,
    notes: ''
  });

  const effectiveSearch = searchTerm || localSearch;

  // Filtered Fuel Records
  const filteredRecords = fuelRecords.filter(f => {
    const matchesVehicle = selectedVehicleId === 'all' || f.vehicleId === selectedVehicleId;
    const term = effectiveSearch.toLowerCase().trim();
    const matchesSearch =
      !term ||
      (f.vehiclePlate && f.vehiclePlate.toLowerCase().includes(term)) ||
      (f.vehicleName && f.vehicleName.toLowerCase().includes(term)) ||
      f.fuelStation.toLowerCase().includes(term) ||
      (f.driverName && f.driverName.toLowerCase().includes(term));
    return matchesVehicle && matchesSearch;
  });

  // Aggregated KPIs
  const totalLiters = filteredRecords.reduce((sum, f) => sum + f.fuelAmount, 0);
  const totalCost = filteredRecords.reduce((sum, f) => sum + f.totalPrice, 0);
  const avgPricePerLiter = totalLiters > 0 ? totalCost / totalLiters : 1.55;
  const validConsumptionRecords = filteredRecords.filter(f => f.consumption && f.consumption > 0);
  const avgFleetConsumption = validConsumptionRecords.length > 0
    ? validConsumptionRecords.reduce((sum, f) => sum + (f.consumption || 0), 0) / validConsumptionRecords.length
    : 6.2;

  const openCreateModal = () => {
    const defaultVehicle = vehicles[0];
    setFormData({
      vehicleId: defaultVehicle ? defaultVehicle.id : '',
      driverId: defaultVehicle?.assignedDriverId || '',
      date: new Date().toISOString().split('T')[0],
      fuelStation: 'Slovnaft Košice - Južná trieda',
      fuelAmount: 50,
      pricePerLiter: 1.559,
      mileage: defaultVehicle ? defaultVehicle.currentMileage + 450 : 150000,
      fuelType: (defaultVehicle?.fuelType as any) || 'Nafta',
      fullTank: true,
      notes: ''
    });
    setIsModalOpen(true);
  };

  const handleVehicleChange = (vId: string) => {
    const veh = vehicles.find(v => v.id === vId);
    if (veh) {
      setFormData(prev => ({
        ...prev,
        vehicleId: vId,
        driverId: veh.assignedDriverId || '',
        fuelType: veh.fuelType,
        mileage: veh.currentMileage + 350
      }));
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await api.createFuelRecord({
        ...formData,
        fuelAmount: Number(formData.fuelAmount),
        pricePerLiter: Number(formData.pricePerLiter),
        mileage: Number(formData.mileage)
      });
      onShowToast(
        'success',
        `Tankovanie zaevidované. Vypočítaná spotreba: ${res.consumption ? `${res.consumption} l/100 km` : 'zatiaľ neurčená'}`
      );
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
      await api.deleteFuelRecord(id);
      onShowToast('success', 'Záznam o tankovaní bol zmazaný.');
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
      'Vodič',
      'Čerpacia stanica',
      'Množstvo (l)',
      'Cena za liter (€)',
      'Celková suma (€)',
      'Tachometer (km)',
      'Palivo',
      'Spotreba (l/100km)'
    ];
    const rows = filteredRecords.map(f => [
      f.date,
      f.vehiclePlate || '',
      f.vehicleName || '',
      f.driverName || 'Nezadaný',
      f.fuelStation,
      f.fuelAmount,
      f.pricePerLiter,
      f.totalPrice,
      f.mileage,
      f.fuelType,
      f.consumption ? f.consumption.toFixed(2) : ''
    ]);
    exportToCsv('Tankovanie_LogiTrans', headers, rows);
    onShowToast('success', 'Export tankovania do CSV bol úspešne stiahnutý.');
  };

  // Preview calculated total price in form
  const computedTotal = (Number(formData.fuelAmount) || 0) * (Number(formData.pricePerLiter) || 0);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            {t('page.fuel.title')}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {t('page.fuel.description')}
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
            <span>{t('page.addFuel')}</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-xs text-slate-500 block">Celkový objem paliva</span>
          <span className="text-xl font-bold text-slate-900 font-mono tabular-nums block mt-1">
            {new Intl.NumberFormat('sk-SK', { maximumFractionDigits: 1 }).format(totalLiters)} l
          </span>
          <span className="text-[11px] text-slate-400 mt-1 block">Zaznamenané tankovania</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-xs text-slate-500 block">Celkové výdavky na palivo</span>
          <span className="text-xl font-bold text-slate-900 font-mono tabular-nums block mt-1">
            {formatCurrency(totalCost)}
          </span>
          <span className="text-[11px] text-slate-400 mt-1 block">Náklad na pohonné hmoty</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-xs text-slate-500 block">Priemerná cena za liter</span>
          <span className="text-xl font-bold text-slate-900 font-mono tabular-nums block mt-1">
            {avgPricePerLiter.toFixed(3)} €/l
          </span>
          <span className="text-[11px] text-slate-400 mt-1 block">Vážený priemer</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-xs text-slate-500 block">Priemerná spotreba flotily</span>
          <span className="text-xl font-bold text-blue-600 font-mono tabular-nums block mt-1">
            {avgFleetConsumption.toFixed(2)} l/100 km
          </span>
          <span className="text-[11px] text-slate-400 mt-1 block">Z po sebe idúcich jázd</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder={t('page.searchFuel')}
            value={effectiveSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-500 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none transition-all"
          />
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto text-xs">
          <span className="text-slate-500 font-medium shrink-0">{t('page.vehicle')}:</span>
          <select
            value={selectedVehicleId}
            onChange={(e) => setSelectedVehicleId(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 text-xs text-slate-800"
          >
            <option value="all">Všetky vozidlá flotily</option>
            {vehicles.map(v => (
              <option key={v.id} value={v.id}>
                {v.licensePlate} ({v.brand} {v.model})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Fuel Records Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4 font-semibold">{t('page.date')}</th>
                <th className="py-3 px-4 font-semibold">{t('page.vehicle')}</th>
                <th className="py-3 px-4 font-semibold">{t('page.station')}</th>
                <th className="py-3 px-4 font-semibold text-right">{t('page.volume')}</th>
                <th className="py-3 px-4 font-semibold text-right">{t('page.pricePerLiter')}</th>
                <th className="py-3 px-4 font-semibold text-right">{t('page.totalPrice')}</th>
                <th className="py-3 px-4 font-semibold text-right">{t('page.odometer')}</th>
                <th className="py-3 px-4 font-semibold text-right">{t('page.consumption')}</th>
                <th className="py-3 px-4 font-semibold text-right">{t('page.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    Nenašli sa žiadne záznamy o tankovaní.
                  </td>
                </tr>
              ) : (
                filteredRecords.map((f) => (
                  <tr key={f.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-mono text-slate-700 whitespace-nowrap">
                      {formatDate(f.date)}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-mono font-bold text-slate-900">
                        {f.vehiclePlate}
                      </div>
                      <div className="text-[11px] text-slate-500 truncate max-w-[150px]">
                        {f.vehicleName}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-700">
                      <div className="truncate max-w-[200px]">{f.fuelStation}</div>
                      {f.driverName && (
                        <div className="text-[10px] text-slate-400">Vodič: {f.driverName}</div>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-800 font-medium">
                      {f.fuelAmount.toFixed(1)} l
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-600">
                      {f.pricePerLiter.toFixed(3)} €
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums font-bold text-slate-900">
                      {formatCurrency(f.totalPrice)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-800">
                      {formatKm(f.mileage)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums font-semibold whitespace-nowrap">
                      {f.consumption ? (
                        <span className={f.consumption > 8.5 ? 'text-amber-600' : 'text-emerald-600'}>
                          {f.consumption.toFixed(2)} l/100km
                        </span>
                      ) : (
                        <span className="text-slate-400 font-normal italic">1. záznam</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => setDeleteConfirmId(f.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-slate-100 rounded transition-colors"
                        title="Zmazať záznam"
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

      {/* Add Fuel Record Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Zaevidovať nové tankovanie"
        subtitle="Zadajte údaje z bločku alebo karty. Systém automaticky overí tachometer a prepočíta spotrebu."
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
              <label className="block font-medium text-slate-700 mb-1">{t('page.fuelDate')}</label>
              <input
                type="date"
                required
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block font-medium text-slate-700 mb-1">{t('page.fuelStation')}</label>
            <input
              type="text"
              required
              placeholder="napr. Slovnaft Košice - Južná trieda"
              value={formData.fuelStation}
              onChange={(e) => setFormData({ ...formData, fuelStation: e.target.value })}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block font-medium text-slate-700 mb-1">{t('page.fuelVolume')}</label>
              <input
                type="number"
                step="0.01"
                min="0.1"
                required
                value={formData.fuelAmount}
                onChange={(e) => setFormData({ ...formData, fuelAmount: Number(e.target.value) })}
                className="w-full px-3 py-2 font-mono border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">{t('page.priceLiter')}</label>
              <input
                type="number"
                step="0.001"
                min="0.01"
                required
                value={formData.pricePerLiter}
                onChange={(e) => setFormData({ ...formData, pricePerLiter: Number(e.target.value) })}
                className="w-full px-3 py-2 font-mono border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">Stav tachometra (km) *</label>
              <input
                type="number"
                min="1"
                required
                value={formData.mileage}
                onChange={(e) => setFormData({ ...formData, mileage: Number(e.target.value) })}
                className="w-full px-3 py-2 font-mono border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* Computed preview */}
          <div className="p-3 rounded-lg bg-blue-50/70 border border-blue-200 flex items-center justify-between">
            <span className="text-slate-700 font-medium">Vypočítaná celková suma:</span>
            <span className="text-base font-bold text-blue-900 font-mono tabular-nums">
              {formatCurrency(computedTotal)}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="fullTankCheckbox"
              checked={formData.fullTank}
              onChange={(e) => setFormData({ ...formData, fullTank: e.target.checked })}
              className="rounded text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="fullTankCheckbox" className="text-slate-700">
              Tankované do plnej nádrže (nevyhnutné pre presný výpočet spotreby)
            </label>
          </div>

          <div>
            <label className="block font-medium text-slate-700 mb-1">{t('page.fuelNote')}</label>
            <input
              type="text"
              placeholder="Číslo bločku, palivová karta DKV/Slovnaft..."
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500"
            />
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
              {submitting ? 'Zaznamenávam...' : 'Uložiť tankovanie'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <Modal
        isOpen={deleteConfirmId !== null}
        onClose={() => setDeleteConfirmId(null)}
        title="Vymazanie záznamu tankovania"
        subtitle="Záznam bude natrvalo odstránený."
        maxWidth="sm"
      >
        <div className="space-y-4 text-xs">
          <p className="text-slate-600">
            Naozaj chcete vymazať tento záznam tankovania? Spotreba súvisiacich jázd sa automaticky prepočíta.
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
