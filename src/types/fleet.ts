/**
 * Fleet Management System - LogiTrans s.r.o.
 * Shared TypeScript definitions
 */

export type VehicleStatus = 'active' | 'in_service' | 'out_of_service';
export type FuelType = 'Nafta' | 'Benzín' | 'Hybrid' | 'CNG' | 'Elektrina';

export interface Vehicle {
  id: string;
  brand: string;
  model: string;
  licensePlate: string; // EČV
  vin: string;
  year: number;
  registrationDate: string; // YYYY-MM-DD
  fuelType: FuelType;
  tankCapacity: number; // liters
  currentMileage: number; // km
  averageConsumption: number; // l/100 km (catalog or computed)
  status: VehicleStatus;
  lastStkDate: string;
  nextStkDate: string;
  lastEkDate: string;
  nextEkDate: string;
  insurancePolicyNumber: string;
  insuranceExpiryDate: string;
  assignedDriverId?: string | null;
  assignedDriverName?: string | null;
  notes?: string | null;
  isArchived?: number;
  createdAt?: string;
  updatedAt?: string;
}

export type DriverStatus = 'active' | 'inactive';

export interface Driver {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  licenseNumber: string;
  licenseCategory: string; // e.g., 'B, C, C+E'
  licenseExpiryDate: string;
  assignedVehicleId?: string | null;
  assignedVehiclePlate?: string | null;
  assignedVehicleName?: string | null;
  status: DriverStatus;
  notes?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface FuelRecord {
  id: string;
  vehicleId: string;
  vehiclePlate?: string;
  vehicleName?: string;
  driverId?: string | null;
  driverName?: string | null;
  date: string; // YYYY-MM-DD
  fuelStation: string;
  fuelAmount: number; // liters
  pricePerLiter: number; // EUR
  totalPrice: number; // EUR
  mileage: number; // km
  fuelType: FuelType;
  fullTank: number; // 1 or 0
  previousMileage?: number | null;
  distanceDriven?: number | null;
  consumption?: number | null; // calculated l/100 km
  notes?: string | null;
  createdAt?: string;
}

export type ExpenseCategory =
  | 'Palivo'
  | 'Servis'
  | 'Opravy'
  | 'Poistenie'
  | 'Pneumatiky'
  | 'Diaľničné známky'
  | 'Parkovné'
  | 'Ostatné';

export interface Expense {
  id: string;
  vehicleId?: string | null;
  vehiclePlate?: string | null;
  vehicleName?: string | null;
  category: ExpenseCategory;
  date: string; // YYYY-MM-DD
  amount: number; // EUR
  description: string;
  supplier: string;
  invoiceNumber: string;
  sourceRef?: 'manual' | 'fuel' | 'maintenance';
  sourceId?: string | null;
  notes?: string | null;
  createdAt?: string;
}

export type MaintenanceType =
  | 'Výmena oleja'
  | 'Výmena filtrov'
  | 'Výmena pneumatík'
  | 'Oprava motora'
  | 'Brzdový systém'
  | 'Výmena batérie'
  | 'Pravidelný servis'
  | 'Iné';

export type MaintenanceStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled';

export interface Maintenance {
  id: string;
  vehicleId: string;
  vehiclePlate?: string;
  vehicleName?: string;
  serviceType: MaintenanceType;
  date: string; // YYYY-MM-DD
  mileage: number;
  serviceCenter: string;
  description: string;
  cost: number;
  nextServiceDate?: string | null;
  nextServiceMileage?: number | null;
  status: MaintenanceStatus;
  notes?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export type InspectionType = 'STK' | 'EK' | 'PZP' | 'Havarijné poistenie' | 'Ostatné';
export type InspectionResult = 'passed' | 'failed' | 'conditional';

export interface Inspection {
  id: string;
  vehicleId: string;
  vehiclePlate?: string;
  vehicleName?: string;
  type: InspectionType;
  inspectionDate: string;
  expiryDate: string;
  station: string;
  protocolNumber: string;
  result: InspectionResult;
  notes?: string | null;
  daysRemaining?: number;
  statusGrade?: 'valid' | 'expiring_soon' | 'critical' | 'expired';
  createdAt?: string;
}

export type NotificationSeverity = 'info' | 'warning' | 'critical';
export type NotificationType =
  | 'stk_expiry'
  | 'ek_expiry'
  | 'insurance_expiry'
  | 'maintenance_due'
  | 'high_consumption'
  | 'system';

export interface NotificationItem {
  id: string;
  type: NotificationType;
  vehicleId?: string | null;
  vehiclePlate?: string | null;
  title: string;
  message: string;
  severity: NotificationSeverity;
  dueDate?: string | null;
  isRead: number; // 0 or 1
  createdAt: string;
}

export interface CompanySettings {
  companyName: string;
  address: string;
  ico: string;
  dic: string;
  icDph: string;
  email: string;
  phone: string;
  currency: string;
  alertDaysWarning: number;
  alertDaysCritical: number;
}

export interface DashboardMetrics {
  totalVehicles: number;
  activeVehicles: number;
  inServiceVehicles: number;
  outOfServiceVehicles: number;
  totalMonthlyExpenses: number;
  totalDistanceDriven: number;
  fleetAverageConsumption: number;
  costPerKm: number;
  unreadNotificationsCount: number;
}
