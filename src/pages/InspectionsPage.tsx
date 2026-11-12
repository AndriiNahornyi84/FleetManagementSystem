import React, { useState } from 'react';
import {
  Plus,
  Search,
  ShieldCheck,
  AlertTriangle,
  Clock,
  CheckCircle2,
  XCircle,
  FileSpreadsheet,
  Trash2,
  Calendar
} from 'lucide-react';
import { Inspection, InspectionType, InspectionResult, Vehicle } from '../types/fleet.js';
import { formatDate, getInspectionGrade } from '../utils/formatters.js';
import { Modal } from '../components/Modal.js';
import { exportToCsv } from '../utils/export.js';

interface InspectionsPageProps {
  inspections: Inspection[];
  vehicles: Vehicle[];
  onRefresh: () => void;
  onShowToast: (type: 'success' | 'error' | 'warning', msg: string) => void;
  api: any;
  searchTerm?: string;
}

export function InspectionsPage({
  inspections,
  vehicles,
  onRefresh,
  onShowToast,
  api,
  searchTerm = ''
}: InspectionsPageProps) {
  const [localSearch, setLocalSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    vehicleId: '',
    type: 'STK' as InspectionType,
    inspectionDate: new Date().toISOString().split('T')[0],
    expiryDate: new Date(Date.now() + 730 * 24 * 3600 * 1000).toISOString().split('T')[0], // +2 years default
    station: 'STK Dekra Košice',
    protocolNumber: '',
    result: 'passed' as InspectionResult,
    notes: ''
  });

  const effectiveSearch = searchTerm || localSearch;

  // Filtered Inspections
  const filteredList = inspections.filter(i => {
    const matchesType = typeFilter === 'all' || i.type === typeFilter;
    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'expired' && (i.daysRemaining || 0) < 0) ||
      (statusFilter === 'critical' && (i.daysRemaining || 0) >= 0 && (i.daysRemaining || 0) <= 7) ||
      (statusFilter === 'warning' && (i.daysRemaining || 0) > 7 && (i.daysRemaining || 0) <= 30) ||
      (statusFilter === 'valid' && (i.daysRemaining || 0) > 30);

    const term = effectiveSearch.toLowerCase().trim();
    const matchesSearch =
      !term ||
      (i.vehiclePlate && i.vehiclePlate.toLowerCase().includes(term)) ||
      (i.vehicleName && i.vehicleName.toLowerCase().includes(term)) ||
      i.station.toLowerCase().includes(term) ||
      i.protocolNumber.toLowerCase().includes(term);

    return matchesType && matchesStatus && matchesSearch;
  });

  // KPI Metrics
  const expiredCount = inspections.filter(i => (i.daysRemaining || 0) < 0).length;
  const criticalCount = inspections.filter(i => (i.daysRemaining || 0) >= 0 && (i.daysRemaining || 0) <= 7).length;
  const warningCount = inspections.filter(i => (i.daysRemaining || 0) > 7 && (i.daysRemaining || 0) <= 30).length;
  const validCount = inspections.filter(i => (i.daysRemaining || 0) > 30).length;

  const openCreateModal = () => {
    const v = vehicles[0];
    setFormData({
      vehicleId: v ? v.id : '',
      type: 'STK',
      inspectionDate: new Date().toISOString().split('T')[0],
      expiryDate: new Date(Date.now() + 730 * 24 * 3600 * 1000).toISOString().split('T')[0],
      station: 'STK Dekra Košice',
      protocolNumber: `SK-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`,
      result: 'passed',
      notes: ''
    });
    setIsModalOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.createInspection(formData);
      onShowToast('success', `Technická kontrola (${formData.type}) úspešne zaevidovaná.`);
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
      await api.deleteInspection(id);
      onShowToast('success', 'Záznam kontroly bol zmazaný.');
      setDeleteConfirmId(null);
      onRefresh();
    } catch (err: any) {
      onShowToast('error', err.message);
    }
  };

  const handleExportCsv = () => {
    const headers = [
      'Vozidlo (EČV)',
      'Model',
      'Typ kontroly',
      'Dátum kontroly',
      'Platnosť do',
      'Zostáva dní',
      'Stanica / Poisťovňa',
      'Číslo protokolu',
      'Výsledok'
    ];
    const rows = filteredList.map(i => [
      i.vehiclePlate || '',
      i.vehicleName || '',
      i.type,
      i.inspectionDate,
      i.expiryDate,
      i.daysRemaining !== undefined ? i.daysRemaining : '',
      i.station,
      i.protocolNumber,
      i.result === 'passed' ? 'Vyhovujúce' : 'Nevyhovujúce'
    ]);
    exportToCsv('Technicke_kontroly_LogiTrans', headers, rows);
    onShowToast('success', 'Export technických kontrol do CSV bol stiahnutý.');
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            Technické kontroly a lehoty
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Automatické sledovanie platnosti STK, emisných kontrol (EK), PZP a havarijného poistenia.
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
            <span>Zaevidovať kontrolu</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500">Platné kontroly</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <span className="text-xl font-bold text-slate-900 font-mono tabular-nums block mt-1">
            {validCount}
          </span>
          <span className="text-[11px] text-slate-400 mt-1 block">&gt; 30 dní do expirácie</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500">Blíži sa termín</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <span className="text-xl font-bold text-amber-600 font-mono tabular-nums block mt-1">
            {warningCount}
          </span>
          <span className="text-[11px] text-slate-400 mt-1 block">8 až 30 dní zostáva</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500">Kritický termín</span>
            <AlertTriangle className="w-4 h-4 text-rose-500" />
          </div>
          <span className="text-xl font-bold text-rose-600 font-mono tabular-nums block mt-1">
            {criticalCount}
          </span>
          <span className="text-[11px] text-slate-400 mt-1 block">Do 7 dní do skončenia</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500">Expirované lehoty</span>
            <XCircle className="w-4 h-4 text-rose-600" />
          </div>
          <span className="text-xl font-bold text-rose-700 font-mono tabular-nums block mt-1">
            {expiredCount}
          </span>
          <span className="text-[11px] text-rose-500 mt-1 block font-medium">Nutné okamžite vyriešiť!</span>
        </div>
      </div>

      {/* Filter and Search */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Hľadať podľa EČV, stanice alebo protokolu..."
            value={effectiveSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-500 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none transition-all"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto text-xs">
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 font-medium">Typ:</span>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none text-xs text-slate-800"
            >
              <option value="all">Všetky typy</option>
              <option value="STK">STK</option>
              <option value="EK">EK</option>
              <option value="PZP">PZP</option>
              <option value="Havarijné poistenie">Havarijné</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 font-medium">Stav:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none text-xs text-slate-800"
            >
              <option value="all">Všetky lehoty</option>
              <option value="valid">Platné (&gt; 30 dní)</option>
              <option value="warning">Blíži sa termín (&lt; 30 dní)</option>
              <option value="critical">Kritické (&lt; 7 dní)</option>
              <option value="expired">Expirované</option>
            </select>
          </div>
        </div>
      </div>

      {/* Inspections Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4 font-semibold">Vozidlo</th>
                <th className="py-3 px-4 font-semibold">Typ kontroly</th>
                <th className="py-3 px-4 font-semibold">Dátum kontroly</th>
                <th className="py-3 px-4 font-semibold">Platnosť do</th>
                <th className="py-3 px-4 font-semibold">Stanica TK / Poisťovňa</th>
                <th className="py-3 px-4 font-semibold">Protokol / Zmluva</th>
                <th className="py-3 px-4 font-semibold text-center">Zostáva</th>
                <th className="py-3 px-4 font-semibold text-right">Akcie</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredList.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    Nenašli sa žiadne kontroly zodpovedajúce filtru.
                  </td>
                </tr>
              ) : (
                filteredList.map((insp) => {
                  const grade = getInspectionGrade(insp.daysRemaining || 0);
                  return (
                    <tr key={insp.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-mono font-bold text-slate-900">
                          {insp.vehiclePlate}
                        </div>
                        <div className="text-[10px] text-slate-400 truncate max-w-[150px]">
                          {insp.vehicleName}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-bold text-slate-800 text-xs px-2 py-0.5 rounded bg-slate-100">
                          {insp.type}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-700 whitespace-nowrap">
                        {formatDate(insp.inspectionDate)}
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-slate-900 whitespace-nowrap">
                        {formatDate(insp.expiryDate)}
                      </td>
                      <td className="py-3 px-4 text-slate-700 truncate max-w-[180px]">
                        {insp.station}
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px] text-slate-500">
                        {insp.protocolNumber}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`inline-block px-2.5 py-0.5 rounded text-[11px] font-semibold whitespace-nowrap ${grade.badgeClass}`}>
                          {insp.daysRemaining !== undefined && (
                            insp.daysRemaining < 0
                              ? `Expirované (${Math.abs(insp.daysRemaining)} d)`
                              : `${insp.daysRemaining} dní`
                          )}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => setDeleteConfirmId(insp.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-slate-100 rounded transition-colors"
                          title="Zmazať kontrolu"
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

      {/* Add Inspection Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Zaevidovať technickú kontrolu / poistenie"
        subtitle="Zadajte údaje z protokolu STK, emisnej kontroly alebo novej poistnej zmluvy."
        maxWidth="lg"
      >
        <form onSubmit={handleFormSubmit} className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-slate-700 mb-1">Vozidlo *</label>
              <select
                required
                value={formData.vehicleId}
                onChange={(e) => setFormData({ ...formData, vehicleId: e.target.value })}
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
              <label className="block font-medium text-slate-700 mb-1">Typ kontroly / poistenia *</label>
              <select
                required
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 bg-white"
              >
                <option value="STK">STK (Technická kontrola)</option>
                <option value="EK">EK (Emisná kontrola)</option>
                <option value="PZP">PZP (Zákonné poistenie)</option>
                <option value="Havarijné poistenie">Havarijné poistenie</option>
                <option value="Ostatné">Ostatné</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-slate-700 mb-1">Dátum vykonania kontroly *</label>
              <input
                type="date"
                required
                value={formData.inspectionDate}
                onChange={(e) => setFormData({ ...formData, inspectionDate: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">Platnosť do (exspirácia) *</label>
              <input
                type="date"
                required
                value={formData.expiryDate}
                onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 font-semibold"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-slate-700 mb-1">Stanica TK / Poisťovňa *</label>
              <input
                type="text"
                required
                placeholder="napr. STK Dekra Košice, Allianz a.s."
                value={formData.station}
                onChange={(e) => setFormData({ ...formData, station: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">Číslo protokolu / zmluvy *</label>
              <input
                type="text"
                required
                placeholder="napr. SK-2026-99182"
                value={formData.protocolNumber}
                onChange={(e) => setFormData({ ...formData, protocolNumber: e.target.value.toUpperCase() })}
                className="w-full px-3 py-2 font-mono uppercase border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-slate-700 mb-1">Výsledok kontroly</label>
              <select
                value={formData.result}
                onChange={(e) => setFormData({ ...formData, result: e.target.value as any })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 bg-white"
              >
                <option value="passed">Vyhovujúce (spôsobilé)</option>
                <option value="conditional">Dočasne spôsobilé</option>
                <option value="failed">Nespôsobilé (nevyhovujúce)</option>
              </select>
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">Poznámka z protokolu</label>
              <input
                type="text"
                placeholder="Zistené ľahké závady, poznámky..."
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500"
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
              {submitting ? 'Ukladám...' : 'Zaevidovať kontrolu'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <Modal
        isOpen={deleteConfirmId !== null}
        onClose={() => setDeleteConfirmId(null)}
        title="Vymazanie záznamu kontroly"
        subtitle="Záznam o STK alebo poistení bude odstránený."
        maxWidth="sm"
      >
        <div className="space-y-4 text-xs">
          <p className="text-slate-600">
            Naozaj chcete zmazať tento záznam technickej kontroly?
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
