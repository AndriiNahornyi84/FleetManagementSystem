/**
 * Fleet Management System - LogiTrans s.r.o.
 * Main Application Component
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Sidebar, NavTab } from './components/Sidebar.js';
import { Header } from './components/Header.js';
import { ToastContainer, ToastMessage } from './components/Toast.js';
import { api } from './services/api.js';

// Pages
import { DashboardPage } from './pages/DashboardPage.js';
import { VehiclesPage } from './pages/VehiclesPage.js';
import { DriversPage } from './pages/DriversPage.js';
import { FuelPage } from './pages/FuelPage.js';
import { ExpensesPage } from './pages/ExpensesPage.js';
import { MaintenancePage } from './pages/MaintenancePage.js';
import { InspectionsPage } from './pages/InspectionsPage.js';
import { NotificationsPage } from './pages/NotificationsPage.js';
import { ReportsPage } from './pages/ReportsPage.js';
import { SettingsPage } from './pages/SettingsPage.js';

// Types
import {
  Vehicle,
  Driver,
  FuelRecord,
  Expense,
  Maintenance,
  Inspection,
  NotificationItem,
  CompanySettings
} from './types/fleet.js';

export default function App() {
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [globalSearch, setGlobalSearch] = useState('');
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // State
  const [dashboardData, setDashboardData] = useState<any | null>(null);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [fuelRecords, setFuelRecords] = useState<FuelRecord[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [maintenance, setMaintenance] = useState<Maintenance[]>([]);
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [settings, setSettings] = useState<CompanySettings | null>(null);
  const [loading, setLoading] = useState(true);

  // Toast Helper
  const showToast = useCallback((type: 'success' | 'error' | 'warning' | 'info', message: string) => {
    const id = Date.now().toString() + Math.random().toString().slice(2, 6);
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  }, []);

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Load all primary data
  const loadData = useCallback(async () => {
    try {
      const [dash, vehs, drvs, fuels, exps, maints, insps, notifs, sets] = await Promise.all([
        api.getDashboard(),
        api.getVehicles(),
        api.getDrivers(),
        api.getFuelRecords(),
        api.getExpenses(),
        api.getMaintenance(),
        api.getInspections(),
        api.getNotifications(),
        api.getSettings()
      ]);

      setDashboardData(dash);
      setVehicles(vehs);
      setDrivers(drvs);
      setFuelRecords(fuels);
      setExpenses(exps);
      setMaintenance(maints);
      setInspections(insps);
      setNotifications(notifs);
      setSettings(sets);
    } catch (err: any) {
      console.error('Failed to load application data:', err);
      showToast('error', `Chyba načítania údajov: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Count unread notifications
  const unreadCount = notifications.filter((n) => n.isRead === 0).length;

  const handleNavigateToVehicle = (vehicleId: string) => {
    setActiveTab('vehicles');
    setGlobalSearch(vehicles.find((v) => v.id === vehicleId)?.licensePlate || '');
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex font-sans">
      {/* Toast notifications */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      {/* Collapsible Left Sidebar */}
      <Sidebar
        activeTab={activeTab}
        onSelectTab={(tab) => {
          setActiveTab(tab);
          setGlobalSearch('');
        }}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed((prev) => !prev)}
        unreadCount={unreadCount}
      />

      {/* Main Content Area */}
      <div
        className={`flex-1 flex flex-col min-h-screen transition-all duration-300 ease-in-out ${
          isSidebarCollapsed ? 'ml-20' : 'ml-64'
        }`}
      >
        {/* Top Header */}
        <Header
          activeTab={activeTab}
          onSelectTab={setActiveTab}
          unreadCount={unreadCount}
          onExportReport={() => setActiveTab('reports')}
          globalSearch={globalSearch}
          onSearchChange={setGlobalSearch}
        />

        {/* View Routing */}
        <main className="flex-1 pb-16">
          {activeTab === 'dashboard' && (
            <DashboardPage
              data={dashboardData}
              loading={loading}
              onNavigate={setActiveTab}
              onExport={() => setActiveTab('reports')}
            />
          )}

          {activeTab === 'vehicles' && (
            <VehiclesPage
              vehicles={vehicles}
              drivers={drivers}
              onRefresh={loadData}
              onShowToast={showToast}
              api={api}
              searchTerm={globalSearch}
            />
          )}

          {activeTab === 'drivers' && (
            <DriversPage
              drivers={drivers}
              vehicles={vehicles}
              onRefresh={loadData}
              onShowToast={showToast}
              api={api}
              searchTerm={globalSearch}
            />
          )}

          {activeTab === 'fuel' && (
            <FuelPage
              fuelRecords={fuelRecords}
              vehicles={vehicles}
              drivers={drivers}
              onRefresh={loadData}
              onShowToast={showToast}
              api={api}
              searchTerm={globalSearch}
            />
          )}

          {activeTab === 'expenses' && (
            <ExpensesPage
              expenses={expenses}
              vehicles={vehicles}
              onRefresh={loadData}
              onShowToast={showToast}
              api={api}
              searchTerm={globalSearch}
            />
          )}

          {activeTab === 'maintenance' && (
            <MaintenancePage
              maintenance={maintenance}
              vehicles={vehicles}
              onRefresh={loadData}
              onShowToast={showToast}
              api={api}
              searchTerm={globalSearch}
            />
          )}

          {activeTab === 'inspections' && (
            <InspectionsPage
              inspections={inspections}
              vehicles={vehicles}
              onRefresh={loadData}
              onShowToast={showToast}
              api={api}
              searchTerm={globalSearch}
            />
          )}

          {activeTab === 'notifications' && (
            <NotificationsPage
              notifications={notifications}
              onRefresh={loadData}
              onShowToast={showToast}
              api={api}
              onNavigateToVehicle={handleNavigateToVehicle}
            />
          )}

          {activeTab === 'reports' && (
            <ReportsPage
              vehicles={vehicles}
              api={api}
              onShowToast={showToast}
            />
          )}

          {activeTab === 'settings' && (
            <SettingsPage
              settings={settings}
              onRefresh={loadData}
              onShowToast={showToast}
              api={api}
            />
          )}
        </main>
      </div>
    </div>
  );
}
