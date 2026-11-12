import React, { useState } from 'react';
import { formatCurrency, formatKm } from '../../utils/formatters.js';
import { useI18n } from '../../i18n/I18nContext.js';

// -------------------------------------------------------------
// 1. MONTHLY COSTS BAR CHART (Mesačné náklady)
// -------------------------------------------------------------
interface MonthlyCostItem {
  month: string;
  total: number;
  expenses?: number;
  fuel?: number;
}

export function MonthlyCostChart({ data }: { data: MonthlyCostItem[] }) {
  const { t } = useI18n();
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  if (!data || data.length === 0) {
    return <div className="h-64 flex items-center justify-center text-slate-400 text-sm">{t('chart.noPeriodData')}</div>;
  }

  const maxVal = Math.max(...data.map(d => d.total), 100);
  const chartHeight = 200;

  return (
    <div className="w-full">
      <div className="relative h-56 flex items-end gap-2 pt-6 pb-2 px-1 border-b border-slate-200">
        {data.map((item, idx) => {
          const barHeight = Math.max(12, (item.total / maxVal) * chartHeight);
          const isHovered = hoveredIdx === idx;
          const monthLabel = item.month.slice(5) + '/' + item.month.slice(2, 4);

          return (
            <div
              key={item.month}
              className="flex-1 flex flex-col items-center group relative h-full justify-end cursor-pointer"
              onMouseEnter={() => setHoveredIdx(idx)}
              onMouseLeave={() => setHoveredIdx(null)}
            >
              {/* Tooltip */}
              {isHovered && (
                <div className="absolute -top-12 z-20 bg-slate-900 text-white text-xs px-2.5 py-1.5 rounded shadow-lg whitespace-nowrap pointer-events-none transition-all">
                  <div className="font-semibold">{item.month}</div>
                  <div className="text-emerald-400 font-mono tabular-nums">{formatCurrency(item.total)}</div>
                </div>
              )}

              <div
                className={`w-full rounded-t transition-all duration-200 ${
                  isHovered ? 'bg-blue-600' : 'bg-slate-700 hover:bg-blue-500'
                }`}
                style={{ height: `${barHeight}px` }}
              />
              <span className="text-[11px] text-slate-500 mt-2 font-mono whitespace-nowrap">
                {monthLabel}
              </span>
            </div>
          );
        })}
      </div>
      <div className="flex items-center justify-between text-xs text-slate-400 mt-2">
        <span>0 €</span>
        <span>Max: {formatCurrency(maxVal)}</span>
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// 2. EXPENSE STRUCTURE DONUT CHART (Štruktúra nákladov)
// -------------------------------------------------------------
interface CategoryItem {
  category: string;
  total: number;
}

const CATEGORY_COLORS = [
  '#2563EB', // Blue (Palivo)
  '#10B981', // Emerald (Servis)
  '#F59E0B', // Amber (Opravy)
  '#6366F1', // Indigo (Poistenie)
  '#EC4899', // Pink (Pneumatiky)
  '#8B5CF6', // Purple (Diaľničné známky)
  '#14B8A6', // Teal (Parkovné)
  '#64748B'  // Slate (Ostatné)
];

export function CostStructureChart({ data }: { data: CategoryItem[] }) {
  const { t } = useI18n();
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const totalSum = data.reduce((s, d) => s + d.total, 0);
  if (totalSum === 0) {
    return <div className="h-64 flex items-center justify-center text-slate-400 text-sm">{t('chart.noExpenses')}</div>;
  }

  // Generate SVG arcs
  let accumulatedAngle = 0;
  const radius = 68;
  const cx = 100;
  const cy = 100;
  const strokeWidth = 24;

  const slices = data.map((item, idx) => {
    const fraction = item.total / totalSum;
    const angle = fraction * 360;
    const startAngle = accumulatedAngle;
    accumulatedAngle += angle;

    const startRad = (startAngle - 90) * (Math.PI / 180);
    const endRad = (accumulatedAngle - 90) * (Math.PI / 180);

    const x1 = cx + radius * Math.cos(startRad);
    const y1 = cy + radius * Math.sin(startRad);
    const x2 = cx + radius * Math.cos(endRad);
    const y2 = cy + radius * Math.sin(endRad);

    const largeArcFlag = angle > 180 ? 1 : 0;
    const pathData = `M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`;

    return {
      item,
      color: CATEGORY_COLORS[idx % CATEGORY_COLORS.length],
      pathData,
      fraction
    };
  });

  return (
    <div className="flex flex-col sm:flex-row items-center gap-6">
      <div className="relative w-48 h-48 shrink-0">
        <svg viewBox="0 0 200 200" className="w-full h-full transform -rotate-90">
          {slices.map((slice, idx) => (
            <path
              key={slice.item.category}
              d={slice.pathData}
              fill="none"
              stroke={slice.color}
              strokeWidth={hoveredIdx === idx ? strokeWidth + 4 : strokeWidth}
              className="transition-all duration-200 cursor-pointer"
              onMouseEnter={() => setHoveredIdx(idx)}
              onMouseLeave={() => setHoveredIdx(null)}
            />
          ))}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-xs text-slate-400">{t('chart.total')}</span>
          <span className="text-sm font-bold text-slate-800 font-mono tabular-nums">
            {formatCurrency(totalSum)}
          </span>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs w-full">
        {data.map((item, idx) => {
          const color = CATEGORY_COLORS[idx % CATEGORY_COLORS.length];
          const pct = ((item.total / totalSum) * 100).toFixed(1);
          return (
            <div
              key={item.category}
              className={`flex items-center justify-between p-1.5 rounded transition-colors cursor-pointer ${
                hoveredIdx === idx ? 'bg-slate-100 font-semibold' : 'hover:bg-slate-50'
              }`}
              onMouseEnter={() => setHoveredIdx(idx)}
              onMouseLeave={() => setHoveredIdx(null)}
            >
              <div className="flex items-center gap-2 truncate">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                <span className="truncate text-slate-700">{item.category}</span>
              </div>
              <div className="flex items-center gap-2 font-mono tabular-nums text-slate-600">
                <span>{pct}%</span>
                <span className="font-medium text-slate-900">{formatCurrency(item.total)}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// 3. VEHICLE USAGE & MILEAGE COMPARISON (Využitie vozidiel)
// -------------------------------------------------------------
interface VehicleUsageItem {
  id: string;
  licensePlate: string;
  brand: string;
  model: string;
  currentMileage: number;
}

export function VehicleMileageChart({ data }: { data: VehicleUsageItem[] }) {
  const maxMileage = Math.max(...data.map(d => d.currentMileage), 1);

  return (
    <div className="space-y-3">
      {data.slice(0, 7).map((veh) => {
        const percent = Math.min(100, Math.round((veh.currentMileage / maxMileage) * 100));
        return (
          <div key={veh.id} className="text-xs">
            <div className="flex items-center justify-between mb-1">
              <span className="font-medium text-slate-800 truncate">
                {veh.brand} {veh.model} <span className="text-slate-400 font-mono">({veh.licensePlate})</span>
              </span>
              <span className="font-mono tabular-nums text-slate-700 font-medium">
                {formatKm(veh.currentMileage)}
              </span>
            </div>
            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-600 rounded-full transition-all duration-500"
                style={{ width: `${percent}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// -------------------------------------------------------------
// 4. FUEL CONSUMPTION COMPARISON (Spotreba paliva)
// -------------------------------------------------------------
interface ConsumptionItem {
  id: string;
  plate: string;
  name: string;
  averageConsumption: number;
}

export function ConsumptionBarChart({ data }: { data: ConsumptionItem[] }) {
  const maxConsumption = Math.max(...data.map(d => d.averageConsumption), 10);

  return (
    <div className="space-y-3">
      {data.map((item) => {
        const percent = Math.min(100, Math.round((item.averageConsumption / maxConsumption) * 100));
        const isHigh = item.averageConsumption > 8.0;
        const isLow = item.averageConsumption < 5.0;

        return (
          <div key={item.id} className="text-xs">
            <div className="flex items-center justify-between mb-1">
              <span className="font-medium text-slate-800 truncate">
                {item.name} <span className="text-slate-400 font-mono">({item.plate})</span>
              </span>
              <span className={`font-mono tabular-nums font-semibold ${
                isHigh ? 'text-amber-600' : isLow ? 'text-emerald-600' : 'text-slate-700'
              }`}>
                {item.averageConsumption.toFixed(1)} l/100 km
              </span>
            </div>
            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  isHigh ? 'bg-amber-500' : isLow ? 'bg-emerald-500' : 'bg-blue-600'
                }`}
                style={{ width: `${percent}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
