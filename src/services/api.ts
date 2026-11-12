/**
 * API client for communicating with Express backend
 */

export const api = {
  // Dashboard
  async getDashboard() {
    const res = await fetch('/api/dashboard');
    if (!res.ok) throw new Error((await res.json()).error || 'Chyba načítania dashboardu');
    return res.json();
  },

  // Vehicles
  async getVehicles(params?: { search?: string; status?: string }) {
    const q = new URLSearchParams();
    if (params?.search) q.append('search', params.search);
    if (params?.status) q.append('status', params.status);
    const res = await fetch(`/api/vehicles?${q.toString()}`);
    if (!res.ok) throw new Error((await res.json()).error || 'Chyba načítania vozidiel');
    return res.json();
  },

  async getVehicleDetails(id: string) {
    const res = await fetch(`/api/vehicles/${id}`);
    if (!res.ok) throw new Error((await res.json()).error || 'Chyba načítania detailov vozidla');
    return res.json();
  },

  async createVehicle(data: any) {
    const res = await fetch('/api/vehicles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error((await res.json()).error || 'Chyba pridania vozidla');
    return res.json();
  },

  async updateVehicle(id: string, data: any) {
    const res = await fetch(`/api/vehicles/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error((await res.json()).error || 'Chyba úpravy vozidla');
    return res.json();
  },

  async deleteVehicle(id: string) {
    const res = await fetch(`/api/vehicles/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error((await res.json()).error || 'Chyba vymazania vozidla');
    return res.json();
  },

  // Drivers
  async getDrivers() {
    const res = await fetch('/api/drivers');
    if (!res.ok) throw new Error((await res.json()).error || 'Chyba načítania vodičov');
    return res.json();
  },

  async createDriver(data: any) {
    const res = await fetch('/api/drivers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error((await res.json()).error || 'Chyba pridania vodiča');
    return res.json();
  },

  async updateDriver(id: string, data: any) {
    const res = await fetch(`/api/drivers/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error((await res.json()).error || 'Chyba úpravy vodiča');
    return res.json();
  },

  async deleteDriver(id: string) {
    const res = await fetch(`/api/drivers/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error((await res.json()).error || 'Chyba vymazania vodiča');
    return res.json();
  },

  // Fuel Records
  async getFuelRecords(params?: { vehicleId?: string; dateFrom?: string; dateTo?: string }) {
    const q = new URLSearchParams();
    if (params?.vehicleId) q.append('vehicleId', params.vehicleId);
    if (params?.dateFrom) q.append('dateFrom', params.dateFrom);
    if (params?.dateTo) q.append('dateTo', params.dateTo);
    const res = await fetch(`/api/fuel?${q.toString()}`);
    if (!res.ok) throw new Error((await res.json()).error || 'Chyba načítania tankovaní');
    return res.json();
  },

  async createFuelRecord(data: any) {
    const res = await fetch('/api/fuel', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error((await res.json()).error || 'Chyba pridania tankovania');
    return res.json();
  },

  async deleteFuelRecord(id: string) {
    const res = await fetch(`/api/fuel/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error((await res.json()).error || 'Chyba vymazania záznamu');
    return res.json();
  },

  // Expenses
  async getExpenses(params?: { vehicleId?: string; category?: string; dateFrom?: string; dateTo?: string }) {
    const q = new URLSearchParams();
    if (params?.vehicleId) q.append('vehicleId', params.vehicleId);
    if (params?.category) q.append('category', params.category);
    if (params?.dateFrom) q.append('dateFrom', params.dateFrom);
    if (params?.dateTo) q.append('dateTo', params.dateTo);
    const res = await fetch(`/api/expenses?${q.toString()}`);
    if (!res.ok) throw new Error((await res.json()).error || 'Chyba načítania nákladov');
    return res.json();
  },

  async createExpense(data: any) {
    const res = await fetch('/api/expenses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error((await res.json()).error || 'Chyba pridania nákladu');
    return res.json();
  },

  async deleteExpense(id: string) {
    const res = await fetch(`/api/expenses/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error((await res.json()).error || 'Chyba vymazania nákladu');
    return res.json();
  },

  // Maintenance
  async getMaintenance(params?: { vehicleId?: string; status?: string }) {
    const q = new URLSearchParams();
    if (params?.vehicleId) q.append('vehicleId', params.vehicleId);
    if (params?.status) q.append('status', params.status);
    const res = await fetch(`/api/maintenance?${q.toString()}`);
    if (!res.ok) throw new Error((await res.json()).error || 'Chyba načítania servisu');
    return res.json();
  },

  async createMaintenance(data: any) {
    const res = await fetch('/api/maintenance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error((await res.json()).error || 'Chyba pridania servisu');
    return res.json();
  },

  async deleteMaintenance(id: string) {
    const res = await fetch(`/api/maintenance/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error((await res.json()).error || 'Chyba vymazania servisu');
    return res.json();
  },

  // Inspections
  async getInspections(params?: { vehicleId?: string; type?: string }) {
    const q = new URLSearchParams();
    if (params?.vehicleId) q.append('vehicleId', params.vehicleId);
    if (params?.type) q.append('type', params.type);
    const res = await fetch(`/api/inspections?${q.toString()}`);
    if (!res.ok) throw new Error((await res.json()).error || 'Chyba načítania kontrol');
    return res.json();
  },

  async createInspection(data: any) {
    const res = await fetch('/api/inspections', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error((await res.json()).error || 'Chyba evidencie kontroly');
    return res.json();
  },

  async deleteInspection(id: string) {
    const res = await fetch(`/api/inspections/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error((await res.json()).error || 'Chyba vymazania kontroly');
    return res.json();
  },

  // Notifications
  async getNotifications() {
    const res = await fetch('/api/notifications');
    if (!res.ok) throw new Error((await res.json()).error || 'Chyba načítania upozornení');
    return res.json();
  },

  async markNotificationRead(id: string) {
    const res = await fetch(`/api/notifications/${id}/read`, { method: 'PUT' });
    return res.json();
  },

  async markAllNotificationsRead() {
    const res = await fetch('/api/notifications/read-all', { method: 'POST' });
    return res.json();
  },

  async deleteNotification(id: string) {
    const res = await fetch(`/api/notifications/${id}`, { method: 'DELETE' });
    return res.json();
  },

  // Reports
  async getReports(params?: { vehicleId?: string; dateFrom?: string; dateTo?: string; category?: string }) {
    const q = new URLSearchParams();
    if (params?.vehicleId) q.append('vehicleId', params.vehicleId);
    if (params?.dateFrom) q.append('dateFrom', params.dateFrom);
    if (params?.dateTo) q.append('dateTo', params.dateTo);
    if (params?.category) q.append('category', params.category);
    const res = await fetch(`/api/reports?${q.toString()}`);
    if (!res.ok) throw new Error((await res.json()).error || 'Chyba načítania reportov');
    return res.json();
  },

  // Settings
  async getSettings() {
    const res = await fetch('/api/settings');
    if (!res.ok) throw new Error((await res.json()).error || 'Chyba načítania nastavení');
    return res.json();
  },

  async updateSettings(data: any) {
    const res = await fetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error((await res.json()).error || 'Chyba uloženia nastavení');
    return res.json();
  },

  async restoreDemoData() {
    const res = await fetch('/api/settings/restore-demo', { method: 'POST' });
    if (!res.ok) throw new Error((await res.json()).error || 'Chyba obnovenia dát');
    return res.json();
  }
};
