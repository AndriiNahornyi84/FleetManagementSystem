let formatLocale = 'sk-SK';

export function setFormatLocale(locale: string) {
  formatLocale = locale;
}

/**
 * Slovak formatting utilities (Europe/Bratislava locale, EUR currency, DD.MM.YYYY dates)
 */

export function formatCurrency(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || isNaN(amount)) return '0,00 €';
  return new Intl.NumberFormat(formatLocale, {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
}

export function formatKm(km: number | null | undefined): string {
  if (km === null || km === undefined || isNaN(km)) return '0 km';
  return `${new Intl.NumberFormat(formatLocale).format(km)} km`;
}

export function formatConsumption(lPer100Km: number | null | undefined): string {
  if (lPer100Km === null || lPer100Km === undefined || isNaN(lPer100Km)) return '- l/100 km';
  return `${new Intl.NumberFormat(formatLocale, { minimumFractionDigits: 1, maximumFractionDigits: 2 }).format(lPer100Km)} l/100 km`;
}

export function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return '-';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return new Intl.DateTimeFormat(formatLocale, { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' }).format(d);
  } catch {
    return dateString;
  }
}

export function formatDateTime(isoString: string | null | undefined): string {
  if (!isoString) return '-';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    return d.toLocaleString(formatLocale, {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return isoString;
  }
}

export function getVehicleStatusBadge(status: string): { label: string; bg: string; text: string } {
  switch (status) {
    case 'active':
      return { label: 'Aktívne', bg: 'bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800', text: 'text-emerald-700 dark:text-emerald-300' };
    case 'in_service':
      return { label: 'V servise', bg: 'bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800', text: 'text-amber-700 dark:text-amber-300' };
    case 'out_of_service':
      return { label: 'Mimo prevádzky', bg: 'bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800', text: 'text-rose-700 dark:text-rose-300' };
    default:
      return { label: status, bg: 'bg-slate-100', text: 'text-slate-700' };
  }
}

export function getMaintenanceStatusBadge(status: string): { label: string; bg: string; text: string } {
  switch (status) {
    case 'completed':
      return { label: 'Dokončené', bg: 'bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200', text: 'text-emerald-700 dark:text-emerald-300' };
    case 'in_progress':
      return { label: 'Prebieha', bg: 'bg-blue-50 dark:bg-blue-950/40 border border-blue-200', text: 'text-blue-700 dark:text-blue-300' };
    case 'scheduled':
      return { label: 'Naplánované', bg: 'bg-amber-50 dark:bg-amber-950/40 border border-amber-200', text: 'text-amber-700 dark:text-amber-300' };
    case 'cancelled':
      return { label: 'Zrušené', bg: 'bg-slate-100 border border-slate-200', text: 'text-slate-500' };
    default:
      return { label: status, bg: 'bg-slate-100', text: 'text-slate-700' };
  }
}

export function getInspectionGrade(daysRemaining: number): { label: string; grade: 'valid' | 'expiring_soon' | 'critical' | 'expired'; color: string; badgeClass: string } {
  if (daysRemaining < 0) {
    return {
      label: 'Po termíne',
      grade: 'expired',
      color: '#DC2626',
      badgeClass: 'bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800'
    };
  }
  if (daysRemaining <= 7) {
    return {
      label: 'Kritický termín (do 7 dní)',
      grade: 'critical',
      color: '#DC2626',
      badgeClass: 'bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800'
    };
  }
  if (daysRemaining <= 30) {
    return {
      label: 'Blíži sa termín (do 30 dní)',
      grade: 'expiring_soon',
      color: '#D97706',
      badgeClass: 'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800'
    };
  }
  return {
    label: 'Platné',
    grade: 'valid',
    color: '#16A34A',
    badgeClass: 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
  };
}
