import React, { useState } from 'react';
import {
  Plus,
  Search,
  Users,
  Truck,
  Phone,
  Mail,
  CreditCard,
  Calendar,
  AlertTriangle,
  Edit2,
  Trash2,
  FileSpreadsheet
} from 'lucide-react';
import { Driver, Vehicle } from '../types/fleet.js';
import { formatDate } from '../utils/formatters.js';
import { Modal } from '../components/Modal.js';
import { exportToCsv } from '../utils/export.js';

interface DriversPageProps {
  drivers: Driver[];
  vehicles: Vehicle[];
  onRefresh: () => void;
  onShowToast: (type: 'success' | 'error' | 'warning', msg: string) => void;
  api: any;
  searchTerm?: string;
}

export function DriversPage({
  drivers,
  vehicles,
  onRefresh,
  onShowToast,
  api,
  searchTerm = ''
}: DriversPageProps) {
  const [localSearch, setLocalSearch] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingDriver, setEditingDriver] = useState<Driver | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
    licenseNumber: '',
    licenseCategory: 'B, C',
    licenseExpiryDate: '2028-12-31',
    assignedVehicleId: '',
    status: 'active' as 'active' | 'inactive',
    notes: ''
  });

  const effectiveSearch = searchTerm || localSearch;
  const filteredDrivers = drivers.filter(d => {
    const term = effectiveSearch.toLowerCase().trim();
    return (
      !term ||
      d.firstName.toLowerCase().includes(term) ||
      d.lastName.toLowerCase().includes(term) ||
      d.phone.includes(term) ||
      d.email.toLowerCase().includes(term) ||
      d.licenseNumber.toLowerCase().includes(term) ||
      (d.assignedVehiclePlate && d.assignedVehiclePlate.toLowerCase().includes(term))
    );
  });

  const openCreateModal = () => {
    setEditingDriver(null);
    setFormData({
      firstName: '',
      lastName: '',
      phone: '',
      email: '',
      licenseNumber: '',
      licenseCategory: 'B, C',
      licenseExpiryDate: '2029-06-30',
      assignedVehicleId: '',
      status: 'active',
      notes: ''
    });
    setIsFormOpen(true);
  };

  const openEditModal = (driver: Driver) => {
    setEditingDriver(driver);
    setFormData({
      firstName: driver.firstName,
      lastName: driver.lastName,
      phone: driver.phone,
      email: driver.email,
      licenseNumber: driver.licenseNumber,
      licenseCategory: driver.licenseCategory,
      licenseExpiryDate: driver.licenseExpiryDate,
      assignedVehicleId: driver.assignedVehicleId || '',
      status: driver.status,
      notes: driver.notes || ''
    });
    setIsFormOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (editingDriver) {
        await api.updateDriver(editingDriver.id, formData);
        onShowToast('success', `Vodič ${formData.firstName} ${formData.lastName} úspešne upravený.`);
      } else {
        await api.createDriver(formData);
        onShowToast('success', `Vodič ${formData.firstName} ${formData.lastName} bol pridaný.`);
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
      await api.deleteDriver(id);
      onShowToast('success', 'Vodič bol zmazaný zo systému.');
      setDeleteConfirmId(null);
      onRefresh();
    } catch (err: any) {
      onShowToast('error', err.message);
    }
  };

  const handleExportCsv = () => {
    const headers = ['Meno', 'Priezvisko', 'Telefón', 'E-mail', 'Číslo VP', 'Kategória', 'Platnosť VP', 'Priradené vozidlo', 'Stav'];
    const rows = filteredDrivers.map(d => [
      d.firstName,
      d.lastName,
      d.phone,
      d.email,
      d.licenseNumber,
      d.licenseCategory,
      d.licenseExpiryDate,
      d.assignedVehiclePlate || 'Žiadne',
      d.status === 'active' ? 'Aktívny' : 'Neaktívny'
    ]);
    exportToCsv('Vodici_LogiTrans', headers, rows);
    onShowToast('success', 'Export vodičov do CSV stiahnutý.');
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            Zoznam vodičov
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Správa vodičských oprávnení, kontaktov a priradenia k jednotlivým vozidlám flotily.
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
            <span>Pridať vodiča</span>
          </button>
        </div>
      </div>

      {/* Filter / Search */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between gap-4">
        <div className="relative w-full max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Vyhľadať vodiča podľa mena, telefónu alebo čísla VP..."
            value={effectiveSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-500 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none transition-all"
          />
        </div>
        <div className="text-xs text-slate-500 font-medium">
          Spolu: <span className="font-mono font-bold text-slate-900">{filteredDrivers.length}</span> vodičov
        </div>
      </div>

      {/* Drivers Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredDrivers.map((driver) => {
          // Check if driver license expires in less than 30 days
          const daysToExpiry = Math.ceil((new Date(driver.licenseExpiryDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
          const isExpiringSoon = daysToExpiry <= 30;

          return (
            <div
              key={driver.id}
              className="bg-white p-5 rounded-xl border border-slate-200/90 shadow-2xs flex flex-col justify-between hover:border-slate-300 transition-colors"
            >
              <div>
                {/* Header with name and status */}
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-50 border border-blue-200 flex items-center justify-center font-bold text-blue-700 text-sm">
                      {driver.firstName.charAt(0)}{driver.lastName.charAt(0)}
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">
                        {driver.firstName} {driver.lastName}
                      </h3>
                      <span className="text-[11px] font-mono text-slate-400">
                        VP: {driver.licenseNumber}
                      </span>
                    </div>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded font-medium ${
                    driver.status === 'active'
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-slate-100 text-slate-500'
                  }`}>
                    {driver.status === 'active' ? 'Aktívny' : 'Neaktívny'}
                  </span>
                </div>

                {/* Details list */}
                <div className="space-y-2 text-xs text-slate-600 mt-4 pt-3 border-t border-slate-100">
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="font-mono text-slate-800">{driver.phone}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate text-slate-700">{driver.email || '-'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>Kategórie: <span className="font-semibold text-slate-800">{driver.licenseCategory}</span></span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>Platnosť VP: <span className="font-mono">{formatDate(driver.licenseExpiryDate)}</span></span>
                    </div>
                    {isExpiringSoon && (
                      <span className="text-[10px] font-semibold text-amber-600 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        {daysToExpiry < 0 ? 'Expirovaný!' : `${daysToExpiry} dní!`}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                    <Truck className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                    <span className="text-slate-500">Vozidlo:</span>
                    {driver.assignedVehiclePlate ? (
                      <span className="font-semibold text-slate-900 font-mono">
                        {driver.assignedVehiclePlate} <span className="font-normal text-slate-500">({driver.assignedVehicleName})</span>
                      </span>
                    ) : (
                      <span className="text-slate-400 italic">Nepriradené</span>
                    )}
                  </div>
                </div>

                {driver.notes && (
                  <p className="text-[11px] text-slate-500 mt-3 p-2 rounded bg-slate-50 border border-slate-100 italic">
                    {driver.notes}
                  </p>
                )}
              </div>

              {/* Actions Footer */}
              <div className="flex items-center justify-end gap-2 pt-4 mt-4 border-t border-slate-100">
                <button
                  onClick={() => openEditModal(driver)}
                  className="flex items-center gap-1 px-2.5 py-1 text-xs text-slate-600 hover:text-amber-600 hover:bg-slate-100 rounded-lg transition-colors font-medium"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>Upraviť</span>
                </button>
                <button
                  onClick={() => setDeleteConfirmId(driver.id)}
                  className="flex items-center gap-1 px-2.5 py-1 text-xs text-slate-600 hover:text-rose-600 hover:bg-slate-100 rounded-lg transition-colors font-medium"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Zmazať</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Driver Add/Edit Modal */}
      <Modal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        title={editingDriver ? `Upraviť vodiča: ${editingDriver.firstName} ${editingDriver.lastName}` : 'Pridať nového vodiča'}
        subtitle="Zadajte osobné údaje, číslo vodičského preukazu a priraďte vozidlo."
        maxWidth="lg"
      >
        <form onSubmit={handleFormSubmit} className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-slate-700 mb-1">Meno *</label>
              <input
                type="text"
                required
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">Priezvisko *</label>
              <input
                type="text"
                required
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-slate-700 mb-1">Telefónne číslo *</label>
              <input
                type="tel"
                required
                placeholder="+421 905 123 456"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-3 py-2 font-mono border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">E-mail</label>
              <input
                type="email"
                placeholder="meno@logitrans.sk"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block font-medium text-slate-700 mb-1">Číslo VP *</label>
              <input
                type="text"
                required
                placeholder="SK-123456"
                value={formData.licenseNumber}
                onChange={(e) => setFormData({ ...formData, licenseNumber: e.target.value.toUpperCase() })}
                className="w-full px-3 py-2 font-mono border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">Kategórie *</label>
              <input
                type="text"
                required
                placeholder="B, C, C+E"
                value={formData.licenseCategory}
                onChange={(e) => setFormData({ ...formData, licenseCategory: e.target.value.toUpperCase() })}
                className="w-full px-3 py-2 font-mono border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">Platnosť VP do *</label>
              <input
                type="date"
                required
                value={formData.licenseExpiryDate}
                onChange={(e) => setFormData({ ...formData, licenseExpiryDate: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-slate-700 mb-1">Priradené vozidlo</label>
              <select
                value={formData.assignedVehicleId}
                onChange={(e) => setFormData({ ...formData, assignedVehicleId: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 bg-white"
              >
                <option value="">-- Žiadne (bez vozidla) --</option>
                {vehicles.map(v => (
                  <option key={v.id} value={v.id}>
                    {v.licensePlate} - {v.brand} {v.model}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">Stav vodiča</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 bg-white"
              >
                <option value="active">Aktívny</option>
                <option value="inactive">Neaktívny (PN / dovolenka)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block font-medium text-slate-700 mb-1">Poznámka</label>
            <textarea
              rows={2}
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Špecializácia, pridelený región, zdravotná spôsobilosť..."
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsFormOpen(false)}
              className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium"
            >
              Zrušiť
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs font-semibold disabled:opacity-50"
            >
              {submitting ? 'Ukladám...' : editingDriver ? 'Uložiť zmeny' : 'Pridať vodiča'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={deleteConfirmId !== null}
        onClose={() => setDeleteConfirmId(null)}
        title="Odstránenie vodiča"
        subtitle="Potvrďte vymazanie vodiča z firemného registra."
        maxWidth="sm"
      >
        <div className="space-y-4 text-xs">
          <p className="text-slate-600">
            Naozaj chcete zmazať tohto vodiča? Všetky vozidlá mu budú automaticky odpojené.
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
              Zmazať vodiča
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
