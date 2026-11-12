import React from 'react';
import {
  LayoutDashboard,
  Truck,
  Users,
  Fuel,
  Receipt,
  Wrench,
  ShieldCheck,
  Bell,
  BarChart3,
  Settings,
  ChevronLeft,
  ChevronRight,
  ShieldAlert
} from 'lucide-react';
import { useI18n } from '../i18n/I18nContext.js';

export type NavTab =
  | 'dashboard'
  | 'vehicles'
  | 'drivers'
  | 'fuel'
  | 'expenses'
  | 'maintenance'
  | 'inspections'
  | 'notifications'
  | 'reports'
  | 'settings';

interface SidebarProps {
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  unreadCount: number;
}

export function Sidebar({
  activeTab,
  onSelectTab,
  isCollapsed,
  onToggleCollapse,
  unreadCount
}: SidebarProps) {
  const { t } = useI18n();
  const navItems = [
    { id: 'dashboard' as NavTab, label: t('nav.dashboard'), icon: LayoutDashboard },
    { id: 'vehicles' as NavTab, label: t('nav.vehicles'), icon: Truck },
    { id: 'drivers' as NavTab, label: t('nav.drivers'), icon: Users },
    { id: 'fuel' as NavTab, label: t('nav.fuel'), icon: Fuel },
    { id: 'expenses' as NavTab, label: t('nav.expenses'), icon: Receipt },
    { id: 'maintenance' as NavTab, label: t('nav.maintenance'), icon: Wrench },
    { id: 'inspections' as NavTab, label: t('nav.inspections'), icon: ShieldCheck },
    {
      id: 'notifications' as NavTab,
      label: t('nav.notifications'),
      icon: Bell,
      badge: unreadCount > 0 ? unreadCount : undefined
    },
    { id: 'reports' as NavTab, label: t('nav.reports'), icon: BarChart3 },
    { id: 'settings' as NavTab, label: t('nav.settings'), icon: Settings }
  ];

  return (
    <aside
      className={`fixed top-0 bottom-0 left-0 z-40 bg-slate-900 text-slate-300 flex flex-col transition-all duration-300 ease-in-out border-r border-slate-800 ${
        isCollapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* Brand Header */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-slate-800/80">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center shrink-0 shadow-md">
            <Truck className="w-5 h-5 text-white" />
          </div>
          {!isCollapsed && (
            <div className="truncate">
              <span className="text-sm font-bold tracking-tight text-white block">
                FLEET CONTROL
              </span>
              <span className="text-[11px] text-slate-400 font-medium block truncate">
                LogiTrans s.r.o.
              </span>
            </div>
          )}
        </div>
        <button
          onClick={onToggleCollapse}
          className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors ml-auto"
          title={isCollapsed ? t('sidebar.expand') : t('sidebar.collapse')}
        >
          {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-all ${
                isActive
                  ? 'bg-blue-600 text-white shadow-xs font-semibold'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/70'
              } ${isCollapsed ? 'justify-center px-0' : ''}`}
              title={isCollapsed ? item.label : undefined}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {!isCollapsed && (
                <span className="truncate flex-1 text-left">{item.label}</span>
              )}
              {!isCollapsed && item.badge !== undefined && (
                <span className="px-1.5 py-0.5 text-[10px] font-mono font-bold rounded-full bg-rose-500 text-white tabular-nums">
                  {item.badge}
                </span>
              )}
              {isCollapsed && item.badge !== undefined && (
                <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-rose-500" />
              )}
            </button>
          );
        })}
      </nav>

      {/* User profile / dispatcher footer */}
      <div className="p-3 border-t border-slate-800/80 bg-slate-950/40">
        <div className={`flex items-center gap-3 ${isCollapsed ? 'justify-center' : ''}`}>
          <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center font-bold text-xs text-white shrink-0">
            MŠ
          </div>
          {!isCollapsed && (
            <div className="truncate text-xs">
              <div className="font-semibold text-white truncate">Miroslav Štefánik</div>
              <div className="text-[10px] text-slate-400 truncate">{t('sidebar.dispatcher')}</div>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
