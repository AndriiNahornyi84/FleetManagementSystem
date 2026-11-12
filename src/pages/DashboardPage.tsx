import React from 'react';
import {
  Truck,
  CheckCircle,
  Wrench,
  Receipt,
  Gauge,
  Droplets,
  Calendar,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  ShieldCheck
} from 'lucide-react';
import {
  formatCurrency,
  formatKm,
  formatConsumption,
  formatDate,
  getInspectionGrade,
  getMaintenanceStatusBadge
} from '../utils/formatters.js';
import {
  MonthlyCostChart,
  CostStructureChart,
  VehicleMileageChart,
  ConsumptionBarChart
} from '../components/charts/Charts.js';
import { NavTab } from '../components/Sidebar.js';

interface DashboardProps {
  data: any;
  loading: boolean;
  onNavigate: (tab: NavTab) => void;
  onExport: () => void;
}

export function DashboardPage({ data, loading, onNavigate, onExport }: DashboardProps) {
  if (loading || !data) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[500px]">
        <div className="flex flex-col items-center gap-3 text-slate-400">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-medium">Načítavam údaje o flotile...</span>
        </div>
      </div>
    );
  }

  const { metrics, charts, widgets } = data;

  const statCards = [
    {
      title: 'Celkový počet vozidiel',
      value: metrics.totalVehicles,
      sub: `${metrics.outOfServiceVehicles} mimo prevádzky`,
      icon: Truck,
      color: 'text-blue-600 bg-blue-50'
    },
    {
      title: 'Aktívne vozidlá',
      value: metrics.activeVehicles,
      sub: `${Math.round((metrics.activeVehicles / (metrics.totalVehicles || 1)) * 100)}% flotily v prevádzke`,
      icon: CheckCircle,
      color: 'text-emerald-600 bg-emerald-50'
    },
    {
      title: 'Vozidlá v servise',
      value: metrics.inServiceVehicles,
      sub: metrics.inServiceVehicles > 0 ? 'Prebieha údržba' : 'Žiadne v servise',
      icon: Wrench,
      color: metrics.inServiceVehicles > 0 ? 'text-amber-600 bg-amber-50' : 'text-slate-500 bg-slate-50'
    },
    {
      title: 'Náklady tento mesiac',
      value: formatCurrency(metrics.totalMonthlyExpenses),
      sub: `Náklad na km: ${metrics.costPerKm.toFixed(3)} €/km`,
      icon: Receipt,
      color: 'text-indigo-600 bg-indigo-50'
    },
    {
      title: 'Najazdené kilometre',
      value: formatKm(metrics.totalDistanceDriven),
      sub: 'Celkový stav tachometrov',
      icon: Gauge,
      color: 'text-purple-600 bg-purple-50'
    },
    {
      title: 'Priemerná spotreba',
      value: formatConsumption(metrics.fleetAverageConsumption),
      sub: 'Vypočítané z reálnych jázd',
      icon: Droplets,
      color: 'text-teal-600 bg-teal-50'
    }
  ];

  // Consumption data for chart
  const consumptionChartData = (charts.vehicleUsage || []).map((v: any) => ({
    id: v.id,
    plate: v.licensePlate,
    name: `${v.brand} ${v.model}`,
    averageConsumption: v.averageConsumption || 5.8
  }));

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Banner / Welcome */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            Prehľad vozového parku
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Vitajte v riadiacom systéme logistického parku LogiTrans s.r.o. Košice.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => onNavigate('inspections')}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg transition-colors shadow-2xs"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
            <span>Kontrola STK/EK</span>
          </button>
        </div>
      </div>

      {/* 6 Key Statistic Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {statCards.map((card, i) => {
          const Icon = card.icon;
          return (
            <div
              key={i}
              className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs flex flex-col justify-between hover:border-slate-300 transition-colors"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-medium text-slate-500 leading-tight">
                  {card.title}
                </span>
                <div className={`p-1.5 rounded-lg ${card.color}`}>
                  <Icon className="w-4 h-4" />
                </div>
              </div>
              <div>
                <div className="text-lg font-bold text-slate-900 font-mono tabular-nums tracking-tight">
                  {card.value}
                </div>
                <div className="text-[10px] text-slate-400 mt-1 truncate">
                  {card.sub}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* 4 Analytics Charts in 2x2 Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Mesačné náklady */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Mesačné náklady</h3>
              <p className="text-xs text-slate-400">Vývoj celkových nákladov za posledných 12 mesiacov</p>
            </div>
            <button
              onClick={() => onNavigate('reports')}
              className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
            >
              <span>Viac</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          <MonthlyCostChart data={charts.monthlyCosts || []} />
        </div>

        {/* Chart 2: Štruktúra nákladov */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Štruktúra nákladov</h3>
              <p className="text-xs text-slate-400">Rozdelenie podľa kategórií (palivo, servis, poistenie...)</p>
            </div>
            <button
              onClick={() => onNavigate('expenses')}
              className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
            >
              <span>Detail</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          <CostStructureChart data={charts.categoryExpenses || []} />
        </div>

        {/* Chart 3: Využitie vozidiel (najazdené km) */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Využitie vozidiel</h3>
              <p className="text-xs text-slate-400">Porovnanie stavu kilometrov kľúčových vozidiel</p>
            </div>
            <button
              onClick={() => onNavigate('vehicles')}
              className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
            >
              <span>Vozidlá</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          <VehicleMileageChart data={charts.vehicleUsage || []} />
        </div>

        {/* Chart 4: Spotreba paliva */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Spotreba paliva (l/100 km)</h3>
              <p className="text-xs text-slate-400">Priemerná spotreba vozidiel podľa reálnych tankovaní</p>
            </div>
            <button
              onClick={() => onNavigate('fuel')}
              className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
            >
              <span>Tankovanie</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          <ConsumptionBarChart data={consumptionChartData.slice(0, 6)} />
        </div>
      </div>

      {/* 4 Bottom Operational Blocks */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Block 1: Najbližšie technické kontroly */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-semibold text-slate-900 uppercase tracking-wide">
                Najbližšie STK / EK
              </h4>
              <button
                onClick={() => onNavigate('inspections')}
                className="text-[11px] text-blue-600 hover:underline"
              >
                Všetky
              </button>
            </div>
            <div className="space-y-2">
              {(widgets.upcomingInspections || []).slice(0, 4).map((insp: any) => {
                const grade = getInspectionGrade(insp.daysRemaining);
                return (
                  <div
                    key={insp.id}
                    className="p-2 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="font-semibold text-slate-800">
                        {insp.licensePlate} <span className="font-normal text-slate-500">· {insp.type}</span>
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        Do: {formatDate(insp.expiryDate)}
                      </div>
                    </div>
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded ${grade.badgeClass}`}>
                      {insp.daysRemaining < 0
                        ? 'Expirované'
                        : `${insp.daysRemaining} dní`}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Block 2: Nadchádzajúca údržba */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-semibold text-slate-900 uppercase tracking-wide">
                Nadchádzajúci servis
              </h4>
              <button
                onClick={() => onNavigate('maintenance')}
                className="text-[11px] text-blue-600 hover:underline"
              >
                Všetky
              </button>
            </div>
            <div className="space-y-2">
              {(widgets.upcomingMaintenance || []).slice(0, 4).map((m: any) => {
                const badge = getMaintenanceStatusBadge(m.status);
                return (
                  <div
                    key={m.id}
                    className="p-2 rounded-lg bg-slate-50 border border-slate-100 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-800">{m.licensePlate}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${badge.bg} ${badge.text}`}>
                        {badge.label}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-600 truncate mt-0.5">{m.serviceType}</div>
                    <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                      Dátum: {formatDate(m.date)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Block 3: Posledné tankovania */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-semibold text-slate-900 uppercase tracking-wide">
                Posledné tankovania
              </h4>
              <button
                onClick={() => onNavigate('fuel')}
                className="text-[11px] text-blue-600 hover:underline"
              >
                Všetky
              </button>
            </div>
            <div className="space-y-2">
              {(widgets.recentFuel || []).slice(0, 4).map((f: any) => (
                <div
                  key={f.id}
                  className="p-2 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-between text-xs"
                >
                  <div className="truncate mr-2">
                    <div className="font-semibold text-slate-800 truncate">
                      {f.licensePlate}
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono">
                      {formatDate(f.date)} · {f.fuelAmount.toFixed(1)} l
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-bold text-slate-900 font-mono tabular-nums">
                      {formatCurrency(f.totalPrice)}
                    </div>
                    {f.consumption && (
                      <div className="text-[10px] text-slate-500 font-mono">
                        {f.consumption.toFixed(1)} l/100km
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Block 4: Najnovšie upozornenia */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-semibold text-slate-900 uppercase tracking-wide">
                Najnovšie upozornenia
              </h4>
              <button
                onClick={() => onNavigate('notifications')}
                className="text-[11px] text-blue-600 hover:underline"
              >
                Všetky
              </button>
            </div>
            <div className="space-y-2">
              {(widgets.recentNotifs || []).slice(0, 3).map((n: any) => (
                <div
                  key={n.id}
                  className={`p-2 rounded-lg border text-xs cursor-pointer hover:bg-slate-50 transition-colors ${
                    n.severity === 'critical'
                      ? 'border-rose-200 bg-rose-50/50'
                      : n.severity === 'warning'
                      ? 'border-amber-200 bg-amber-50/50'
                      : 'border-slate-100 bg-slate-50'
                  }`}
                  onClick={() => onNavigate('notifications')}
                >
                  <div className="flex items-center gap-1.5 font-semibold text-slate-800 truncate">
                    <AlertTriangle className={`w-3.5 h-3.5 shrink-0 ${
                      n.severity === 'critical' ? 'text-rose-600' : n.severity === 'warning' ? 'text-amber-600' : 'text-blue-600'
                    }`} />
                    <span className="truncate">{n.title}</span>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                    {n.message}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
