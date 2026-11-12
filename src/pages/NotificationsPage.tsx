import React, { useState } from 'react';
import {
  Bell,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Info,
  Trash2,
  CheckCheck,
  ExternalLink,
  Filter
} from 'lucide-react';
import { NotificationItem, NotificationSeverity } from '../types/fleet.js';
import { formatDate } from '../utils/formatters.js';
import { NavTab } from '../components/Sidebar.js';

interface NotificationsPageProps {
  notifications: NotificationItem[];
  onRefresh: () => void;
  onShowToast: (type: 'success' | 'error' | 'warning', msg: string) => void;
  api: any;
  onNavigateToVehicle: (vehicleId: string) => void;
}

export function NotificationsPage({
  notifications,
  onRefresh,
  onShowToast,
  api,
  onNavigateToVehicle
}: NotificationsPageProps) {
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [readFilter, setReadFilter] = useState<'all' | 'unread' | 'read'>('all');

  const filtered = notifications.filter(n => {
    const matchesSeverity = severityFilter === 'all' || n.severity === severityFilter;
    const matchesRead =
      readFilter === 'all' ||
      (readFilter === 'unread' && n.isRead === 0) ||
      (readFilter === 'read' && n.isRead === 1);
    return matchesSeverity && matchesRead;
  });

  const unreadCount = notifications.filter(n => n.isRead === 0).length;

  const handleMarkRead = async (id: string) => {
    try {
      await api.markNotificationRead(id);
      onRefresh();
    } catch (err: any) {
      onShowToast('error', err.message);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.markAllNotificationsRead();
      onShowToast('success', 'Všetky upozornenia boli označené ako prečítané.');
      onRefresh();
    } catch (err: any) {
      onShowToast('error', err.message);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.deleteNotification(id);
      onShowToast('success', 'Upozornenie odstránené.');
      onRefresh();
    } catch (err: any) {
      onShowToast('error', err.message);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            Centrum upozornení
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Automatické notifikácie generované na základe termínov STK/EK, poistiek, servisu a spotreby.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg transition-colors shadow-2xs"
            >
              <CheckCheck className="w-3.5 h-3.5 text-blue-600" />
              <span>Označiť všetky ako prečítané</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-4">
        {/* Read / Unread Tabs */}
        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg text-xs">
          {[
            { id: 'all', label: 'Všetky' },
            { id: 'unread', label: `Neprečítané (${unreadCount})` },
            { id: 'read', label: 'Prečítané' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setReadFilter(tab.id as any)}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                readFilter === tab.id
                  ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Severity Filter */}
        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-500 font-medium">Závažnosť:</span>
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none text-xs text-slate-800"
          >
            <option value="all">Všetky úrovne</option>
            <option value="critical">Kritické (červené)</option>
            <option value="warning">Varovania (oranžové)</option>
            <option value="info">Informačné (modré)</option>
          </select>
        </div>
      </div>

      {/* Notifications List */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="bg-white p-12 text-center rounded-xl border border-slate-200 text-slate-400 text-xs">
            Žiadne upozornenia v tejto kategórii. Všetky prevádzkové parametre sú v poriadku.
          </div>
        ) : (
          filtered.map((item) => {
            const severityStyles = {
              critical: {
                border: 'border-rose-200 bg-rose-50/40',
                icon: <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />,
                badge: 'bg-rose-100 text-rose-700'
              },
              warning: {
                border: 'border-amber-200 bg-amber-50/40',
                icon: <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />,
                badge: 'bg-amber-100 text-amber-700'
              },
              info: {
                border: 'border-blue-100 bg-blue-50/30',
                icon: <Info className="w-5 h-5 text-blue-600 shrink-0" />,
                badge: 'bg-blue-100 text-blue-700'
              }
            }[item.severity];

            return (
              <div
                key={item.id}
                className={`p-4 rounded-xl border transition-all ${
                  item.isRead === 0 ? 'shadow-2xs bg-white' : 'bg-slate-50/60 border-slate-200 opacity-80'
                } ${severityStyles.border}`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    {severityStyles.icon}
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs font-bold text-slate-900">
                          {item.title}
                        </h4>
                        {item.isRead === 0 && (
                          <span className="w-2 h-2 rounded-full bg-blue-600" title="Nové" />
                        )}
                        {item.vehiclePlate && (
                          <span className="font-mono text-[10px] font-semibold text-slate-600 px-1.5 py-0.5 rounded bg-slate-100">
                            {item.vehiclePlate}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-700 mt-1 leading-relaxed">
                        {item.message}
                      </p>
                      {item.dueDate && (
                        <div className="text-[10px] text-slate-400 font-mono mt-1.5">
                          Termín lehoty: {formatDate(item.dueDate)}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    {item.vehicleId && (
                      <button
                        onClick={() => onNavigateToVehicle(item.vehicleId!)}
                        className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-slate-100 rounded transition-colors text-xs flex items-center gap-1 font-medium"
                        title="Zobraziť vozidlo"
                      >
                        <ExternalLink className="w-4 h-4" />
                        <span className="hidden sm:inline">Vozidlo</span>
                      </button>
                    )}

                    {item.isRead === 0 ? (
                      <button
                        onClick={() => handleMarkRead(item.id)}
                        className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-slate-100 rounded transition-colors"
                        title="Označiť ako prečítané"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                      </button>
                    ) : null}

                    <button
                      onClick={() => handleDelete(item.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-slate-100 rounded transition-colors"
                      title="Zmazať"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
