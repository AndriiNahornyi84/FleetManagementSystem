import React from 'react';
import { Download, Bell, Search, ShieldAlert } from 'lucide-react';
import { NavTab } from './Sidebar.js';
import { Language, useI18n } from '../i18n/I18nContext.js';

interface HeaderProps {
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  unreadCount: number;
  onExportReport: () => void;
  globalSearch: string;
  onSearchChange: (val: string) => void;
}

export function Header({
  activeTab,
  onSelectTab,
  unreadCount,
  onExportReport,
  globalSearch,
  onSearchChange
}: HeaderProps) {
  const { language, setLanguage, t, locale } = useI18n();
  const tabTitles: Record<NavTab, string> = {
    dashboard: t('nav.dashboard'), vehicles: t('nav.vehicles'), drivers: t('nav.drivers'),
    fuel: t('nav.fuel'), expenses: t('nav.expenses'), maintenance: t('nav.maintenance'),
    inspections: t('nav.inspections'), notifications: t('nav.notifications'), reports: t('nav.reports'), settings: t('nav.settings')
  };

  const todayStr = new Intl.DateTimeFormat(locale, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }).format(new Date());

  const capitalizedDate = todayStr.charAt(0).toUpperCase() + todayStr.slice(1);

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-xs border-b border-slate-200 h-16 flex items-center justify-between px-6 gap-6">
      {/* Zone 1: Breadcrumb Trail */}
      <div className="flex items-center gap-2 text-xs text-slate-500 whitespace-nowrap shrink-0">
        <span className="font-medium text-slate-400">LogiTrans s.r.o.</span>
        <span className="text-slate-300">/</span>
        <span className="font-semibold text-slate-900">{tabTitles[activeTab]}</span>
      </div>

      {/* Zone 2: Date & Global quick search */}
      <div className="hidden md:flex items-center gap-4 flex-1 max-w-md mx-auto">
        <div className="relative w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder={t('header.search')}
            value={globalSearch}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-100/80 hover:bg-slate-100 focus:bg-white border border-transparent focus:border-blue-500 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none transition-all"
          />
        </div>
      </div>

      {/* Zone 3: Slovak Date, Notification Bell & Export CTA */}
      <div className="flex items-center gap-2 shrink-0">
        <span className="hidden xl:inline text-xs text-slate-500 font-medium">
          {capitalizedDate}
        </span>

        {/* Notifications Shortcut */}
        <button
          onClick={() => onSelectTab('notifications')}
          className="relative p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
          title={t('header.notifications')}
        >
          <Bell className="w-4 h-4" />
          {unreadCount > 0 && (
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500" />
          )}
        </button>

        <div className="flex items-center rounded-lg border border-slate-200 bg-slate-50 p-0.5" aria-label={t('header.language')}>
          {(['sk', 'en', 'uk'] as Language[]).map((code) => (
            <button key={code} type="button" onClick={() => setLanguage(code)} aria-pressed={language === code}
              className={`px-2 py-1 text-[10px] font-semibold rounded-md transition-colors ${language === code ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>
              {code === 'uk' ? 'UA' : code.toUpperCase()}
            </button>
          ))}
        </div>

        {/* Export Report CTA */}
        <button
          onClick={onExportReport}
          className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-lg transition-colors shadow-xs shrink-0 whitespace-nowrap"
        >
          <Download className="w-3.5 h-3.5" />
          <span>{t('header.export')}</span>
        </button>
      </div>
    </header>
  );
}
