import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

// Database file path inside workspace
const DB_DIR = path.resolve(process.cwd(), 'data');
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

const DB_PATH = path.join(DB_DIR, 'fleet.sqlite');

export const db = new Database(DB_PATH);

// Enable WAL mode for high concurrency and foreign keys
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS company_settings (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      companyName TEXT NOT NULL,
      address TEXT NOT NULL,
      ico TEXT NOT NULL,
      dic TEXT NOT NULL,
      icDph TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT NOT NULL,
      currency TEXT NOT NULL DEFAULT 'EUR',
      alertDaysWarning INTEGER NOT NULL DEFAULT 30,
      alertDaysCritical INTEGER NOT NULL DEFAULT 7
    );

    CREATE TABLE IF NOT EXISTS drivers (
      id TEXT PRIMARY KEY,
      firstName TEXT NOT NULL,
      lastName TEXT NOT NULL,
      phone TEXT NOT NULL,
      email TEXT NOT NULL,
      licenseNumber TEXT NOT NULL UNIQUE,
      licenseCategory TEXT NOT NULL,
      licenseExpiryDate TEXT NOT NULL,
      assignedVehicleId TEXT,
      status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
      notes TEXT,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS vehicles (
      id TEXT PRIMARY KEY,
      brand TEXT NOT NULL,
      model TEXT NOT NULL,
      licensePlate TEXT NOT NULL UNIQUE,
      vin TEXT NOT NULL UNIQUE,
      year INTEGER NOT NULL,
      registrationDate TEXT NOT NULL,
      fuelType TEXT NOT NULL,
      tankCapacity REAL NOT NULL,
      currentMileage INTEGER NOT NULL,
      averageConsumption REAL NOT NULL,
      status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'in_service', 'out_of_service')),
      lastStkDate TEXT NOT NULL,
      nextStkDate TEXT NOT NULL,
      lastEkDate TEXT NOT NULL,
      nextEkDate TEXT NOT NULL,
      insurancePolicyNumber TEXT NOT NULL,
      insuranceExpiryDate TEXT NOT NULL,
      assignedDriverId TEXT REFERENCES drivers(id) ON DELETE SET NULL,
      notes TEXT,
      isArchived INTEGER NOT NULL DEFAULT 0,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS fuel_records (
      id TEXT PRIMARY KEY,
      vehicleId TEXT NOT NULL REFERENCES vehicles(id) ON DELETE RESTRICT,
      driverId TEXT REFERENCES drivers(id) ON DELETE SET NULL,
      date TEXT NOT NULL,
      fuelStation TEXT NOT NULL,
      fuelAmount REAL NOT NULL CHECK (fuelAmount > 0),
      pricePerLiter REAL NOT NULL CHECK (pricePerLiter > 0),
      totalPrice REAL NOT NULL CHECK (totalPrice > 0),
      mileage INTEGER NOT NULL CHECK (mileage > 0),
      fuelType TEXT NOT NULL,
      fullTank INTEGER NOT NULL DEFAULT 1,
      consumption REAL,
      notes TEXT,
      createdAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS expenses (
      id TEXT PRIMARY KEY,
      vehicleId TEXT REFERENCES vehicles(id) ON DELETE SET NULL,
      category TEXT NOT NULL CHECK (category IN ('Palivo', 'Servis', 'Opravy', 'Poistenie', 'Pneumatiky', 'Diaľničné známky', 'Parkovné', 'Ostatné')),
      date TEXT NOT NULL,
      amount REAL NOT NULL CHECK (amount > 0),
      description TEXT NOT NULL,
      supplier TEXT NOT NULL,
      invoiceNumber TEXT NOT NULL,
      sourceRef TEXT NOT NULL DEFAULT 'manual' CHECK (sourceRef IN ('manual', 'fuel', 'maintenance')),
      sourceId TEXT,
      notes TEXT,
      createdAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS maintenance (
      id TEXT PRIMARY KEY,
      vehicleId TEXT NOT NULL REFERENCES vehicles(id) ON DELETE RESTRICT,
      serviceType TEXT NOT NULL,
      date TEXT NOT NULL,
      mileage INTEGER NOT NULL CHECK (mileage >= 0),
      serviceCenter TEXT NOT NULL,
      description TEXT NOT NULL,
      cost REAL NOT NULL CHECK (cost >= 0),
      nextServiceDate TEXT,
      nextServiceMileage INTEGER,
      status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled')),
      notes TEXT,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS inspections (
      id TEXT PRIMARY KEY,
      vehicleId TEXT NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
      type TEXT NOT NULL CHECK (type IN ('STK', 'EK', 'PZP', 'Havarijné poistenie', 'Ostatné')),
      inspectionDate TEXT NOT NULL,
      expiryDate TEXT NOT NULL,
      station TEXT NOT NULL,
      protocolNumber TEXT NOT NULL,
      result TEXT NOT NULL DEFAULT 'passed' CHECK (result IN ('passed', 'failed', 'conditional')),
      notes TEXT,
      createdAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      vehicleId TEXT REFERENCES vehicles(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      severity TEXT NOT NULL CHECK (severity IN ('info', 'warning', 'critical')),
      dueDate TEXT,
      isRead INTEGER NOT NULL DEFAULT 0,
      createdAt TEXT NOT NULL
    );

    -- Performance and integrity indices
    CREATE INDEX IF NOT EXISTS idx_vehicles_plate ON vehicles(licensePlate);
    CREATE INDEX IF NOT EXISTS idx_fuel_vehicle_date ON fuel_records(vehicleId, date);
    CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date);
    CREATE INDEX IF NOT EXISTS idx_expenses_vehicle ON expenses(vehicleId);
    CREATE INDEX IF NOT EXISTS idx_maintenance_vehicle ON maintenance(vehicleId);
    CREATE INDEX IF NOT EXISTS idx_inspections_vehicle ON inspections(vehicleId);
    CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(isRead);
  `);

  // Default company settings if not exists
  const existingSettings = db.prepare('SELECT id FROM company_settings WHERE id = 1').get();
  if (!existingSettings) {
    db.prepare(`
      INSERT INTO company_settings (id, companyName, address, ico, dic, icDph, email, phone, currency, alertDaysWarning, alertDaysCritical)
      VALUES (1, 'LogiTrans s.r.o.', 'Priemyselná 12, 040 01 Košice, Slovensko', '47281903', '2023819401', 'SK2023819401', 'dispecing@logitrans.sk', '+421 55 678 1234', 'EUR', 30, 7)
    `).run();
  }
}
