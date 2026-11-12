import React, { useState } from 'react';
import {
  Plus,
  Search,
  Filter,
  Eye,
  Edit2,
  Trash2,
  Truck,
  Fuel,
  Wrench,
  ShieldCheck,
  Calendar,
  AlertCircle,
  FileSpreadsheet,
  CheckCircle,
  Clock
} from 'lucide-react';
import { Vehicle } from '../types/fleet.js';
import {
  formatCurrency,
  formatKm,
  formatConsumption,
  formatDate,
  getVehicleStatusBadge
} from '../utils/formatters.js';
import { Modal } from '../components/Modal.js';
import { exportToCsv } from '../utils/export.js';

interface VehiclesPageProps {
  vehicles: Vehicle[];
  drivers: any[];
  onRefresh: () => void;
  onShowToast: (type: 'success' | 'error' | 'warning', msg: string) => void;
  api: any;
  searchTerm?: string;
}

export function VehiclesPage({
  vehicles,
  drivers,
  onRefresh,
  onShowToast,
  api,
  searchTerm = ''
}: VehiclesPageProps) {
  const [localSearch, setLocalSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [vehicleDetails, setVehicleDetails] = useState<any | null>(null);
  const [detailTab, setDetailTab] = useState<'overview' | 'fuel' | 'maintenance' | 'inspections' | 'expenses'>('overview');

  // Modal forms
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form inputs state
  const [formData, setFormData] = useState({
    brand: '',
    model: '',
    licensePlate: '',
    vin: '',
    year: new Date().getFullYear(),
    registrationDate: new Date().toISOString().split('T')[0],
    fuelType: 'Nafta',
    tankCapacity: 55,
    currentMileage: 0,
    averageConsumption: 6.0,
    status: 'active',
    lastStkDate: '',
    nextStkDate: '',
    lastEkDate: '',
    nextEkDate: '',
    insurancePolicyNumber: '',
    insuranceExpiryDate: '',
    assignedDriverId: '',
    notes: ''
  });

  const effectiveSearch = searchTerm || localSearch;

  // Filtered vehicles
  const filteredVehicles = vehicles.filter(v => {
    const matchesStatus = statusFilter === 'all' || v.status === statusFilter;
    const term = effectiveSearch.toLowerCase().trim();
    const matchesSearch =
      !term ||
      v.licensePlate.toLowerCase().includes(term) ||
      v.brand.toLowerCase().includes(term) ||
      v.model.toLowerCase().includes(term) ||
      v.vin.toLowerCase().includes(term) ||
      (v.assignedDriverName && v.assignedDriverName.toLowerCase().includes(term));
    return matchesStatus && matchesSearch;
  });

  const openCreateModal = () => {
    setEditingVehicle(null);
    setFormData({
      brand: '',
      model: '',
      licensePlate: '',
      vin: '',
      year: new Date().getFullYear(),
      registrationDate: new Date().toISOString().split('T')[0],
      fuelType: 'Nafta',
      tankCapacity: 55,
      currentMileage: 0,
      averageConsumption: 6.0,
      status: 'active',
      lastStkDate: '',
      nextStkDate: '',
      lastEkDate: '',
      nextEkDate: '',
      insurancePolicyNumber: '',
      insuranceExpiryDate: '',
      assignedDriverId: '',
      notes: ''
    });
    setIsFormOpen(true);
  };

  const openEditModal = (veh: Vehicle) => {
    setEditingVehicle(veh);
    setFormData({
      brand: veh.brand,
      model: veh.model,
      licensePlate: veh.licensePlate,
      vin: veh.vin,
      year: veh.year,
      registrationDate: veh.registrationDate,
      fuelType: veh.fuelType,
      tankCapacity: veh.tankCapacity,
      currentMileage: veh.currentMileage,
      averageConsumption: veh.averageConsumption,
      status: veh.status,
      lastStkDate: veh.lastStkDate || '',
      nextStkDate: veh.nextStkDate || '',
      lastEkDate: veh.lastEkDate || '',
      nextEkDate: veh.nextEkDate || '',
      insurancePolicyNumber: veh.insurancePolicyNumber || '',
      insuranceExpiryDate: veh.insuranceExpiryDate || '',
      assignedDriverId: veh.assignedDriverId || '',
      notes: veh.notes || ''
    });
    setIsFormOpen(true);
  };

  const openDetailModal = async (veh: Vehicle) => {
    setSelectedVehicle(veh);
    setIsDetailOpen(true);
    setDetailTab('overview');
    try {
      const details = await api.getVehicleDetails(veh.id);
      setVehicleDetails(details);
    } catch (err: any) {
      onShowToast('error', err.message);
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (editingVehicle) {
        await api.updateVehicle(editingVehicle.id, formData);
        onShowToast('success', `Vozidlo ${formData.licensePlate} úspešne upravené.`);
      } else {
        await api.createVehicle(formData);
        onShowToast('success', `Vozidlo ${formData.licensePlate} úspešne pridané do flotily.`);
      }
      setIsFormOpen(false);
      onRefresh();
    } catch (err: any) {
      onShowToast('error', err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await api.deleteVehicle(id);
      onShowToast('success', res.message || 'Vozidlo odstránené.');
      setDeleteConfirmId(null);
      onRefresh();
    } catch (err: any) {
      onShowToast('error', err.message);
    }
  };

  const handleExportCsv = () => {
    const headers = [
      'EČV',
      'Značka',
      'Model',
      'VIN',
      'Rok',
      'Palivo',
      'Stav km',
      'Spotreba (l/100km)',
      'Stav',
      'Vodič',
      'STK do',
      'EK do'
    ];
    const rows = filteredVehicles.map(v => [
      v.licensePlate,
      v.brand,
      v.model,
      v.vin,
      v.year,
      v.fuelType,
      v.currentMileage,
      v.averageConsumption,
      v.status,
      v.assignedDriverName || 'Nepriradený',
      v.nextStkDate,
      v.nextEkDate
    ]);
    exportToCsv('Vozidla_LogiTrans', headers, rows);
    onShowToast('success', 'Export vozidiel do CSV bol stiahnutý.');
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            Evidencia vozidiel
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Kompletná správa vozového parku, technických parametrov, stavu tachometrov a vodičov.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCsv}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg transition-colors shadow-2xs"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            <span>Exportovať CSV</span>
          </button>
          <button
            onClick={openCreateModal}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Pridať vozidlo</span>
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2 w-full sm:w-auto flex-1 max-w-md">
          <div className="relative w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Filtrovať podľa EČV, značky, VIN alebo vodiča..."
              value={effectiveSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-500 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none transition-all"
            />
          </div>
        </div>

        {/* Status Filter Segmented Control */}
        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg self-start sm:self-auto text-xs">
          {[
            { id: 'all', label: 'Všetky' },
            { id: 'active', label: 'Aktívne' },
            { id: 'in_service', label: 'V servise' },
            { id: 'out_of_service', label: 'Mimo prevádzky' }
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setStatusFilter(f.id)}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                statusFilter === f.id
                  ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Vehicles Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4 font-semibold">EČV / Značka</th>
                <th className="py-3 px-4 font-semibold">Rok / VIN</th>
                <th className="py-3 px-4 font-semibold">Palivo</th>
                <th className="py-3 px-4 font-semibold text-right">Tachometer</th>
                <th className="py-3 px-4 font-semibold text-right">Spotreba</th>
                <th className="py-3 px-4 font-semibold">Vodič</th>
                <th className="py-3 px-4 font-semibold text-center">Stav</th>
                <th className="py-3 px-4 font-semibold text-right">Akcie</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredVehicles.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    Nenašli sa žiadne vozidlá zodpovedajúce zadaným kritériám.
                  </td>
                </tr>
              ) : (
                filteredVehicles.map((veh) => {
                  const statusBadge = getVehicleStatusBadge(veh.status);
                  return (
                    <tr
                      key={veh.id}
                      className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                      onClick={() => openDetailModal(veh)}
                    >
                      <td className="py-3 px-4">
                        <div className="font-mono font-bold text-slate-900 text-xs">
                          {veh.licensePlate}
                        </div>
                        <div className="text-slate-500 text-[11px]">
                          {veh.brand} {veh.model}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-slate-800">{veh.year}</div>
                        <div className="font-mono text-[10px] text-slate-400 truncate max-w-[120px]">
                          {veh.vin}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-slate-700">
                        {veh.fuelType}
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-900 font-medium">
                        {formatKm(veh.currentMileage)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-700">
                        {veh.averageConsumption.toFixed(1)} l/100km
                      </td>
                      <td className="py-3 px-4">
                        {veh.assignedDriverName ? (
                          <span className="text-slate-800 font-medium">
                            {veh.assignedDriverName}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">Nepriradený</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-medium ${statusBadge.bg} ${statusBadge.text}`}>
                          {statusBadge.label}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => openDetailModal(veh)}
                            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-slate-100 rounded transition-colors"
                            title="Zobraziť detaily"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => openEditModal(veh)}
                            className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-slate-100 rounded transition-colors"
                            title="Upraviť"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setDeleteConfirmId(veh.id)}
                            className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-slate-100 rounded transition-colors"
                            title="Zmazať"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Create / Edit Vehicle */}
      <Modal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        title={editingVehicle ? `Upraviť vozidlo: ${editingVehicle.licensePlate}` : 'Pridať nové vozidlo do flotily'}
        subtitle="Zadajte technické údaje, registračné informácie a priradeného vodiča."
        maxWidth="2xl"
      >
        <form onSubmit={handleFormSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-medium text-slate-700 mb-1">Značka *</label>
              <input
                type="text"
                required
                placeholder="napr. Škoda"
                value={formData.brand}
                onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">Model *</label>
              <input
                type="text"
                required
                placeholder="napr. Octavia Combi 2.0 TDI"
                value={formData.model}
                onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">EČV (ŠPZ) *</label>
              <input
                type="text"
                required
                placeholder="napr. KE-123AB"
                value={formData.licensePlate}
                onChange={(e) => setFormData({ ...formData, licensePlate: e.target.value.toUpperCase() })}
                className="w-full px-3 py-2 font-mono uppercase border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">VIN číslo (17 znakov) *</label>
              <input
                type="text"
                required
                placeholder="napr. TMBJJ7NE8K0192841"
                value={formData.vin}
                onChange={(e) => setFormData({ ...formData, vin: e.target.value.toUpperCase() })}
                className="w-full px-3 py-2 font-mono uppercase border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">Rok výroby</label>
              <input
                type="number"
                min="1990"
                max={new Date().getFullYear() + 1}
                value={formData.year}
                onChange={(e) => setFormData({ ...formData, year: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">Dátum 1. registrácie</label>
              <input
                type="date"
                value={formData.registrationDate}
                onChange={(e) => setFormData({ ...formData, registrationDate: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">Typ paliva</label>
              <select
                value={formData.fuelType}
                onChange={(e) => setFormData({ ...formData, fuelType: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 bg-white"
              >
                <option value="Nafta">Nafta</option>
                <option value="Benzín">Benzín</option>
                <option value="Hybrid">Hybrid</option>
                <option value="CNG">CNG</option>
                <option value="Elektrina">Elektrina</option>
              </select>
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">Objem nádrže (l)</label>
              <input
                type="number"
                min="10"
                max="500"
                value={formData.tankCapacity}
                onChange={(e) => setFormData({ ...formData, tankCapacity: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">Aktuálny stav tachometra (km) *</label>
              <input
                type="number"
                min="0"
                required
                value={formData.currentMileage}
                onChange={(e) => setFormData({ ...formData, currentMileage: Number(e.target.value) })}
                className="w-full px-3 py-2 font-mono border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">Priemerná spotreba (l/100 km)</label>
              <input
                type="number"
                step="0.1"
                min="1"
                max="40"
                value={formData.averageConsumption}
                onChange={(e) => setFormData({ ...formData, averageConsumption: Number(e.target.value) })}
                className="w-full px-3 py-2 font-mono border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">Prevádzkový stav</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 bg-white"
              >
                <option value="active">Aktívne (v prevádzke)</option>
                <option value="in_service">V servise (údržba/oprava)</option>
                <option value="out_of_service">Mimo prevádzky (odstavené)</option>
              </select>
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">Priradený vodič</label>
              <select
                value={formData.assignedDriverId}
                onChange={(e) => setFormData({ ...formData, assignedDriverId: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 bg-white"
              >
                <option value="">-- Bez priradeného vodiča --</option>
                {drivers.map(d => (
                  <option key={d.id} value={d.id}>
                    {d.firstName} {d.lastName} ({d.licenseCategory})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">Platnosť STK do</label>
              <input
                type="date"
                value={formData.nextStkDate}
                onChange={(e) => setFormData({ ...formData, nextStkDate: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">Platnosť EK do</label>
              <input
                type="date"
                value={formData.nextEkDate}
                onChange={(e) => setFormData({ ...formData, nextEkDate: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block font-medium text-slate-700 mb-1">Poznámka a výbava</label>
              <textarea
                rows={2}
                placeholder="Výbava, stav pneumatík, špecifiká vozidla..."
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsFormOpen(false)}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Zrušiť
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-xs disabled:opacity-50"
            >
              {submitting ? 'Ukladám...' : editingVehicle ? 'Uložiť zmeny' : 'Pridať vozidlo'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Vehicle Detail View /vehicles/[id] */}
      <Modal
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        title={selectedVehicle ? `${selectedVehicle.brand} ${selectedVehicle.model} (${selectedVehicle.licensePlate})` : 'Detail vozidla'}
        subtitle={selectedVehicle ? `VIN: ${selectedVehicle.vin} · Rok: ${selectedVehicle.year} · ${selectedVehicle.fuelType}` : ''}
        maxWidth="3xl"
      >
        {selectedVehicle && (
          <div className="space-y-4">
            {/* Tabs Header */}
            <div className="flex items-center gap-1 border-b border-slate-200 text-xs">
              {[
                { id: 'overview', label: 'Prehľad a parametre' },
                { id: 'fuel', label: 'História tankovania' },
                { id: 'maintenance', label: 'Servis a opravy' },
                { id: 'inspections', label: 'STK a poistenie' },
                { id: 'expenses', label: 'Náklady' }
              ].map((t) => (
                <button
                  key={t.id}
                  onClick={() => setDetailTab(t.id as any)}
                  className={`px-3 py-2 font-medium border-b-2 transition-all ${
                    detailTab === t.id
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* Tab: Overview */}
            {detailTab === 'overview' && (
              <div className="space-y-4 text-xs">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                    <span className="text-slate-400 block">Stav tachometra</span>
                    <span className="font-bold text-slate-900 text-sm font-mono tabular-nums">
                      {formatKm(selectedVehicle.currentMileage)}
                    </span>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                    <span className="text-slate-400 block">Priemerná spotreba</span>
                    <span className="font-bold text-slate-900 text-sm font-mono tabular-nums">
                      {formatConsumption(selectedVehicle.averageConsumption)}
                    </span>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                    <span className="text-slate-400 block">Celkové náklady</span>
                    <span className="font-bold text-emerald-600 text-sm font-mono tabular-nums">
                      {vehicleDetails ? formatCurrency(vehicleDetails.summary.totalExpenses) : '...'}
                    </span>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                    <span className="text-slate-400 block">Vodič</span>
                    <span className="font-semibold text-slate-800 truncate block">
                      {selectedVehicle.assignedDriverName || 'Nepriradený'}
                    </span>
                  </div>
                </div>

                <div className="p-4 rounded-xl border border-slate-200 space-y-2 bg-slate-50/50">
                  <h4 className="font-semibold text-slate-900">Technické a zákonné lehoty:</h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    <div>
                      <span className="text-slate-400">Nasledujúca STK:</span>
                      <div className="font-mono font-medium">{formatDate(selectedVehicle.nextStkDate)}</div>
                    </div>
                    <div>
                      <span className="text-slate-400">Nasledujúca EK:</span>
                      <div className="font-mono font-medium">{formatDate(selectedVehicle.nextEkDate)}</div>
                    </div>
                    <div>
                      <span className="text-slate-400">Poistná zmluva:</span>
                      <div className="font-mono font-medium">{selectedVehicle.insurancePolicyNumber || '-'}</div>
                    </div>
                  </div>
                  {selectedVehicle.notes && (
                    <div className="pt-2 border-t border-slate-200 mt-2">
                      <span className="text-slate-400 block mb-0.5">Poznámka k vozidlu:</span>
                      <p className="text-slate-700 italic">{selectedVehicle.notes}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Tab: Fuel History */}
            {detailTab === 'fuel' && (
              <div className="max-h-72 overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 sticky top-0">
                    <tr>
                      <th className="py-2 px-3">Dátum</th>
                      <th className="py-2 px-3">Čerpačka</th>
                      <th className="py-2 px-3 text-right">Litre</th>
                      <th className="py-2 px-3 text-right">Cena</th>
                      <th className="py-2 px-3 text-right">Tachometer</th>
                      <th className="py-2 px-3 text-right">Spotreba</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {vehicleDetails?.fuelRecords.map((f: any) => (
                      <tr key={f.id} className="hover:bg-slate-50">
                        <td className="py-2 px-3 font-mono">{formatDate(f.date)}</td>
                        <td className="py-2 px-3">{f.fuelStation}</td>
                        <td className="py-2 px-3 text-right font-mono">{f.fuelAmount.toFixed(1)} l</td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">{formatCurrency(f.totalPrice)}</td>
                        <td className="py-2 px-3 text-right font-mono">{formatKm(f.mileage)}</td>
                        <td className="py-2 px-3 text-right font-mono text-emerald-600 font-medium">
                          {f.consumption ? `${f.consumption.toFixed(1)} l/100km` : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Tab: Maintenance History */}
            {detailTab === 'maintenance' && (
              <div className="max-h-72 overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 sticky top-0">
                    <tr>
                      <th className="py-2 px-3">Dátum</th>
                      <th className="py-2 px-3">Typ servisu</th>
                      <th className="py-2 px-3">Servisné stredisko</th>
                      <th className="py-2 px-3 text-right">Cena</th>
                      <th className="py-2 px-3 text-center">Stav</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {vehicleDetails?.maintenanceRecords.map((m: any) => (
                      <tr key={m.id} className="hover:bg-slate-50">
                        <td className="py-2 px-3 font-mono">{formatDate(m.date)}</td>
                        <td className="py-2 px-3 font-semibold text-slate-800">{m.serviceType}</td>
                        <td className="py-2 px-3 text-slate-600">{m.serviceCenter}</td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">{formatCurrency(m.cost)}</td>
                        <td className="py-2 px-3 text-center">
                          <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-100 text-slate-700">
                            {m.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Tab: Inspections */}
            {detailTab === 'inspections' && (
              <div className="max-h-72 overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 sticky top-0">
                    <tr>
                      <th className="py-2 px-3">Typ</th>
                      <th className="py-2 px-3">Vykonané</th>
                      <th className="py-2 px-3">Platnosť do</th>
                      <th className="py-2 px-3">Stanica / Poisťovňa</th>
                      <th className="py-2 px-3">Protokol</th>
                      <th className="py-2 px-3 text-center">Zostáva</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {vehicleDetails?.inspections.map((i: any) => (
                      <tr key={i.id} className="hover:bg-slate-50">
                        <td className="py-2 px-3 font-bold text-slate-800">{i.type}</td>
                        <td className="py-2 px-3 font-mono">{formatDate(i.inspectionDate)}</td>
                        <td className="py-2 px-3 font-mono font-semibold">{formatDate(i.expiryDate)}</td>
                        <td className="py-2 px-3">{i.station}</td>
                        <td className="py-2 px-3 font-mono text-[11px]">{i.protocolNumber}</td>
                        <td className="py-2 px-3 text-center">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                            i.daysRemaining < 0
                              ? 'bg-rose-100 text-rose-700'
                              : i.daysRemaining <= 30
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-emerald-100 text-emerald-700'
                          }`}>
                            {i.daysRemaining < 0 ? 'Expirované' : `${i.daysRemaining} dní`}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Tab: Expenses */}
            {detailTab === 'expenses' && (
              <div className="max-h-72 overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 sticky top-0">
                    <tr>
                      <th className="py-2 px-3">Dátum</th>
                      <th className="py-2 px-3">Kategória</th>
                      <th className="py-2 px-3">Popis</th>
                      <th className="py-2 px-3">Dodávateľ</th>
                      <th className="py-2 px-3 text-right">Suma</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {vehicleDetails?.expenses.map((e: any) => (
                      <tr key={e.id} className="hover:bg-slate-50">
                        <td className="py-2 px-3 font-mono">{formatDate(e.date)}</td>
                        <td className="py-2 px-3 font-medium text-slate-800">{e.category}</td>
                        <td className="py-2 px-3 text-slate-600 truncate max-w-xs">{e.description}</td>
                        <td className="py-2 px-3 text-slate-500">{e.supplier}</td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">{formatCurrency(e.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Confirmation Modal for Delete */}
      <Modal
        isOpen={deleteConfirmId !== null}
        onClose={() => setDeleteConfirmId(null)}
        title="Potvrdenie odstránenia vozidla"
        subtitle="Ak má vozidlo finančné záznamy alebo tankovania, bude bezpečne archivované."
        maxWidth="sm"
      >
        <div className="space-y-4 text-xs">
          <p className="text-slate-600">
            Naozaj chcete odstrániť alebo vyradiť toto vozidlo z prevádzky? Historické finančné údaje zostanú zachované v súlade s predpismi.
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
              className="px-3 py-1.5 text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-xs font-semibold"
            >
              Potvrdiť vymazanie
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
