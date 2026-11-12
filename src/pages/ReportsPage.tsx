import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  Download,
  Printer,
  Calendar,
  Filter,
  Truck,
  TrendingDown,
  DollarSign,
  Gauge,
  FileSpreadsheet
} from 'lucide-react';
import {
  formatCurrency,
  formatKm,
  formatConsumption,
  formatDate
} from '../utils/formatters.js';
import { exportToCsv, printReport } from '../utils/export.js';
import { CostStructureChart } from '../components/charts/Charts.js';
import { Vehicle } from '../types/fleet.js';

interface ReportsPageProps {
  vehicles: Vehicle[];
  api: any;
  onShowToast: (type: 'success' | 'error' | 'warning', msg: string) => void;
}

export function ReportsPage({ vehicles, api, onShowToast }: ReportsPageProps) {
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState<any | null>(null);

  // Filters
  const [dateFrom, setDateFrom] = useState('2026-01-01');
  const [dateTo, setDateTo] = useState(new Date().toISOString().split('T')[0]);
  const [selectedVehicle, setSelectedVehicle] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');

  const fetchReports = async () => {
    setLoading(true);
    try {
      const data = await api.getReports({
        vehicleId: selectedVehicle,
        dateFrom,
        dateTo,
        category: selectedCategory
      });
      setReportData(data);
    } catch (err: any) {
      onShowToast('error', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [selectedVehicle, selectedCategory, dateFrom, dateTo]);

  const handleExportCsv = () => {
    if (!reportData) return;
    const headers = ['Vozidlo (EČV)', 'Model', 'Tachometer (km)', 'Palivové náklady (€)', 'Ostatné náklady (€)', 'Celkové náklady (€)', 'Náklad na km (€/km)'];
    const rows = (reportData.byVehicle || []).map((v: any) => [
      v.plate,
      v.brandModel,
      v.km,
      v.fuelCost,
      v.otherCost,
      v.totalCost,
      v.costPerKm.toFixed(3)
    ]);
    exportToCsv('Suhrnny_report_LogiTrans', headers, rows);
    onShowToast('success', 'Kompletný analytický report stiahnutý vo formáte CSV.');
  };

  const handlePrint = () => {
    printReport();
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            Štatistiky a analytické reporty
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Komplexné vyhodnotenie nákladovosti, efektívnosti vozidiel a spotreby pre manažment podniku.
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
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-xs"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Tlačiť / Export do PDF</span>
          </button>
        </div>
      </div>

      {/* Printable Report Header (Visible when printing) */}
      <div className="hidden print:block mb-6 pb-4 border-b border-slate-300">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-xl font-bold text-slate-900">LogiTrans s.r.o. Košice</h2>
            <p className="text-xs text-slate-600">IČO: 47281903 · Priemyselná 12, 040 01 Košice</p>
            <h3 className="text-sm font-semibold text-slate-800 mt-2">Manažérsky výkaz prevádzky a nákladovosti flotily</h3>
          </div>
          <div className="text-right text-xs text-slate-600">
            <div>Dátum vygenerovania: <span className="font-mono">{new Date().toLocaleDateString('sk-SK')}</span></div>
            <div>Sledované obdobie: <span className="font-mono">{formatDate(dateFrom)} – {formatDate(dateTo)}</span></div>
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="no-print bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-wrap items-center gap-4 text-xs">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-slate-400" />
          <span className="font-medium text-slate-600">Obdobie od:</span>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="font-medium text-slate-600">do:</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="font-medium text-slate-600">Vozidlo:</span>
          <select
            value={selectedVehicle}
            onChange={(e) => setSelectedVehicle(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none bg-white text-slate-800"
          >
            <option value="all">Celý vozový park</option>
            {vehicles.map(v => (
              <option key={v.id} value={v.id}>
                {v.licensePlate} ({v.brand} {v.model})
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <span className="font-medium text-slate-600">Kategória:</span>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none bg-white text-slate-800"
          >
            <option value="all">Všetky výdavky</option>
            <option value="Palivo">Iba palivo</option>
            <option value="Servis">Iba servis</option>
            <option value="Opravy">Iba opravy</option>
            <option value="Poistenie">Iba poistenie</option>
            <option value="Pneumatiky">Iba pneumatiky</option>
            <option value="Diaľničné známky">Iba diaľničné známky</option>
          </select>
        </div>
      </div>

      {loading || !reportData ? (
        <div className="p-12 text-center text-slate-400 text-xs">Prepočítavam analytické reporty...</div>
      ) : (
        <div className="space-y-6">
          {/* Summary KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs print:border-slate-300">
              <span className="text-xs text-slate-500 block">Celkové náklady v období</span>
              <span className="text-xl font-bold text-slate-900 font-mono tabular-nums block mt-1">
                {formatCurrency(reportData.summary.totalCost)}
              </span>
              <span className="text-[11px] text-slate-400 mt-1 block">Palivo + servis + poistenie</span>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs print:border-slate-300">
              <span className="text-xs text-slate-500 block">Výdavky na palivo</span>
              <span className="text-xl font-bold text-blue-600 font-mono tabular-nums block mt-1">
                {formatCurrency(reportData.summary.totalFuelCost)}
              </span>
              <span className="text-[11px] text-slate-400 mt-1 block">Spolu {reportData.summary.totalLiters} litrov</span>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs print:border-slate-300">
              <span className="text-xs text-slate-500 block">Ostatné a servisné náklady</span>
              <span className="text-xl font-bold text-emerald-600 font-mono tabular-nums block mt-1">
                {formatCurrency(reportData.summary.totalOtherCost)}
              </span>
              <span className="text-[11px] text-slate-400 mt-1 block">Pneumatiky, opravy, poistky</span>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs print:border-slate-300">
              <span className="text-xs text-slate-500 block">Celkový počet dokladov</span>
              <span className="text-xl font-bold text-purple-600 font-mono tabular-nums block mt-1">
                {reportData.summary.expenseCount}
              </span>
              <span className="text-[11px] text-slate-400 mt-1 block">Zaúčtované položky</span>
            </div>
          </div>

          {/* Breakdown by vehicle efficiency table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden print:border-slate-300">
            <div className="p-4 border-b border-slate-200 bg-slate-50/60">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                Porovnanie nákladovosti a efektívnosti vozidiel (€ / km)
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="py-3 px-4 font-semibold">Vozidlo</th>
                    <th className="py-3 px-4 font-semibold text-right">Stav tachometra</th>
                    <th className="py-3 px-4 font-semibold text-right">Palivo (€)</th>
                    <th className="py-3 px-4 font-semibold text-right">Servis & Ostatné (€)</th>
                    <th className="py-3 px-4 font-semibold text-right">Celkové náklady (€)</th>
                    <th className="py-3 px-4 font-semibold text-right">Náklad na 1 km (€/km)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {reportData.byVehicle.map((v: any) => (
                    <tr key={v.plate} className="hover:bg-slate-50/80">
                      <td className="py-3 px-4">
                        <span className="font-mono font-bold text-slate-900 block">{v.plate}</span>
                        <span className="text-slate-500 text-[11px]">{v.brandModel}</span>
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-700">
                        {formatKm(v.km)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums text-blue-700 font-medium">
                        {formatCurrency(v.fuelCost)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-700">
                        {formatCurrency(v.otherCost)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums font-bold text-slate-900">
                        {formatCurrency(v.totalCost)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums font-semibold text-emerald-600">
                        {v.costPerKm.toFixed(3)} €/km
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Visual Breakdown by Category */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs print:border-slate-300">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide mb-4">
              Rozdelenie nákladov podľa kategórií v sledovanom období
            </h3>
            <CostStructureChart data={reportData.byCategory} />
          </div>

          {/* Printable signature section */}
          <div className="hidden print:flex justify-between items-end pt-12 mt-8 text-xs text-slate-700">
            <div>
              <div className="border-t border-slate-400 w-48 pt-1 text-center font-medium">
                Spracoval dispečer
              </div>
            </div>
            <div>
              <div className="border-t border-slate-400 w-48 pt-1 text-center font-medium">
                Schválil konateľ spoločnosti
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
