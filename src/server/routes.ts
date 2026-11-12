import { Router, Request, Response } from 'express';
import { db } from './db.js';
import { seedDemoData } from './seed.js';
import crypto from 'crypto';

export const apiRouter = Router();

// Helper: Calculate days difference from today (Europe/Bratislava)
function getDaysRemaining(targetDateStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(targetDateStr);
  target.setHours(0, 0, 0, 0);
  const diffTime = target.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

// -------------------------------------------------------------
// 1. DASHBOARD & METRICS
// -------------------------------------------------------------
apiRouter.get('/dashboard', (_req: Request, res: Response) => {
  try {
    const totalVehiclesRow = db.prepare('SELECT COUNT(*) as count FROM vehicles WHERE isArchived = 0').get() as { count: number };
    const activeVehiclesRow = db.prepare("SELECT COUNT(*) as count FROM vehicles WHERE isArchived = 0 AND status = 'active'").get() as { count: number };
    const inServiceVehiclesRow = db.prepare("SELECT COUNT(*) as count FROM vehicles WHERE isArchived = 0 AND status = 'in_service'").get() as { count: number };
    const outOfServiceRow = db.prepare("SELECT COUNT(*) as count FROM vehicles WHERE isArchived = 0 AND status = 'out_of_service'").get() as { count: number };

    // Total monthly expenses for current month
    const now = new Date();
    const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const monthlyExpensesRow = db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as total FROM expenses
      WHERE date LIKE '${currentMonthStr}%'
    `).get() as { total: number };

    // Total fleet distance driven and average consumption
    const totalMileageRow = db.prepare('SELECT COALESCE(SUM(currentMileage), 0) as total FROM vehicles WHERE isArchived = 0').get() as { total: number };
    const avgConsRow = db.prepare('SELECT COALESCE(AVG(averageConsumption), 0) as avg FROM vehicles WHERE isArchived = 0').get() as { avg: number };
    const unreadNotifRow = db.prepare('SELECT COUNT(*) as count FROM notifications WHERE isRead = 0').get() as { count: number };

    // Total overall expenses to calculate cost per km
    const totalExpensesRow = db.prepare('SELECT COALESCE(SUM(amount), 0) as total FROM expenses').get() as { total: number };
    const totalFuelExpensesRow = db.prepare('SELECT COALESCE(SUM(totalPrice), 0) as total FROM fuel_records').get() as { total: number };
    const totalCombinedFleetCost = totalExpensesRow.total + totalFuelExpensesRow.total;
    const costPerKm = totalMileageRow.total > 0 ? Number((totalCombinedFleetCost / totalMileageRow.total).toFixed(3)) : 0.18;

    // Monthly expenses for last 12 months chart
    const monthlyCosts = db.prepare(`
      SELECT strftime('%Y-%m', date) as month, SUM(amount) as total
      FROM expenses
      GROUP BY month
      ORDER BY month DESC
      LIMIT 12
    `).all() as { month: string; total: number }[];

    // Add fuel cost to monthly expense aggregation so real dynamic fuel costs appear
    const monthlyFuel = db.prepare(`
      SELECT strftime('%Y-%m', date) as month, SUM(totalPrice) as total
      FROM fuel_records
      GROUP BY month
      ORDER BY month DESC
      LIMIT 12
    `).all() as { month: string; total: number }[];

    const monthMap = new Map<string, { month: string; expenses: number; fuel: number; total: number }>();
    for (const row of monthlyCosts) {
      monthMap.set(row.month, { month: row.month, expenses: Number(row.total.toFixed(2)), fuel: 0, total: Number(row.total.toFixed(2)) });
    }
    for (const f of monthlyFuel) {
      if (monthMap.has(f.month)) {
        const item = monthMap.get(f.month)!;
        item.fuel = Number(f.total.toFixed(2));
        item.total = Number((item.expenses + item.fuel).toFixed(2));
      } else {
        monthMap.set(f.month, { month: f.month, expenses: 0, fuel: Number(f.total.toFixed(2)), total: Number(f.total.toFixed(2)) });
      }
    }
    const sortedMonthlyData = Array.from(monthMap.values()).sort((a, b) => a.month.localeCompare(b.month));

    // Expenses by category
    const categoryExpenses = db.prepare(`
      SELECT category, SUM(amount) as total
      FROM expenses
      GROUP BY category
      ORDER BY total DESC
    `).all() as { category: string; total: number }[];

    // Add fuel category sum
    const totalFuelAmount = (db.prepare('SELECT COALESCE(SUM(totalPrice), 0) as total FROM fuel_records').get() as { total: number }).total;
    categoryExpenses.unshift({ category: 'Palivo', total: Number(totalFuelAmount.toFixed(2)) });

    // Vehicle mileage usage
    const vehicleUsage = db.prepare(`
      SELECT id, licensePlate, brand, model, currentMileage, averageConsumption
      FROM vehicles
      WHERE isArchived = 0
      ORDER BY currentMileage DESC
      LIMIT 10
    `).all();

    // Upcoming nearest STK/EK / inspections
    const upcomingInspections = db.prepare(`
      SELECT i.*, v.licensePlate, v.brand, v.model
      FROM inspections i
      JOIN vehicles v ON i.vehicleId = v.id
      ORDER BY i.expiryDate ASC
      LIMIT 5
    `).all().map((insp: any) => ({
      ...insp,
      daysRemaining: getDaysRemaining(insp.expiryDate)
    }));

    // Upcoming maintenance
    const upcomingMaintenance = db.prepare(`
      SELECT m.*, v.licensePlate, v.brand, v.model
      FROM maintenance m
      JOIN vehicles v ON m.vehicleId = v.id
      WHERE m.status IN ('scheduled', 'in_progress')
      ORDER BY m.date ASC
      LIMIT 5
    `).all();

    // Recent fuel records
    const recentFuel = db.prepare(`
      SELECT f.*, v.licensePlate, v.brand, v.model, d.firstName, d.lastName
      FROM fuel_records f
      JOIN vehicles v ON f.vehicleId = v.id
      LEFT JOIN drivers d ON f.driverId = d.id
      ORDER BY f.date DESC, f.createdAt DESC
      LIMIT 5
    `).all();

    // Recent notifications
    const recentNotifs = db.prepare(`
      SELECT n.*, v.licensePlate
      FROM notifications n
      LEFT JOIN vehicles v ON n.vehicleId = v.id
      ORDER BY n.createdAt DESC
      LIMIT 5
    `).all();

    res.json({
      metrics: {
        totalVehicles: totalVehiclesRow.count,
        activeVehicles: activeVehiclesRow.count,
        inServiceVehicles: inServiceVehiclesRow.count,
        outOfServiceVehicles: outOfServiceRow.count,
        totalMonthlyExpenses: Number(monthlyExpensesRow.total.toFixed(2)),
        totalDistanceDriven: totalMileageRow.total,
        fleetAverageConsumption: Number(avgConsRow.avg.toFixed(2)),
        costPerKm,
        unreadNotificationsCount: unreadNotifRow.count
      },
      charts: {
        monthlyCosts: sortedMonthlyData,
        categoryExpenses,
        vehicleUsage
      },
      widgets: {
        upcomingInspections,
        upcomingMaintenance,
        recentFuel,
        recentNotifs
      }
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// -------------------------------------------------------------
// 2. VEHICLES (CRUD + DETAILS)
// -------------------------------------------------------------
apiRouter.get('/vehicles', (req: Request, res: Response) => {
  try {
    const { search, status } = req.query;
    let query = `
      SELECT v.*, d.firstName as driverFirstName, d.lastName as driverLastName
      FROM vehicles v
      LEFT JOIN drivers d ON v.assignedDriverId = d.id
      WHERE v.isArchived = 0
    `;
    const params: any[] = [];

    if (status && status !== 'all') {
      query += ' AND v.status = ?';
      params.push(status);
    }

    if (search && typeof search === 'string' && search.trim()) {
      query += ' AND (v.licensePlate LIKE ? OR v.brand LIKE ? OR v.model LIKE ? OR v.vin LIKE ?)';
      const term = `%${search.trim()}%`;
      params.push(term, term, term, term);
    }

    query += ' ORDER BY v.brand ASC, v.model ASC';

    const vehicles = db.prepare(query).all(...params).map((v: any) => ({
      ...v,
      assignedDriverName: v.driverFirstName ? `${v.driverFirstName} ${v.driverLastName}` : null
    }));

    res.json(vehicles);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

apiRouter.get('/vehicles/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const vehicle = db.prepare(`
      SELECT v.*, d.firstName as driverFirstName, d.lastName as driverLastName
      FROM vehicles v
      LEFT JOIN drivers d ON v.assignedDriverId = d.id
      WHERE v.id = ?
    `).get(id) as any;

    if (!vehicle) {
      return res.status(404).json({ error: 'Vozidlo nebolo nájdené' });
    }

    vehicle.assignedDriverName = vehicle.driverFirstName ? `${vehicle.driverFirstName} ${vehicle.driverLastName}` : null;

    // Associated fuel records
    const fuelRecords = db.prepare(`
      SELECT f.*, d.firstName, d.lastName
      FROM fuel_records f
      LEFT JOIN drivers d ON f.driverId = d.id
      WHERE f.vehicleId = ?
      ORDER BY f.date DESC, f.mileage DESC
    `).all(id);

    // Associated maintenance records
    const maintenanceRecords = db.prepare(`
      SELECT * FROM maintenance
      WHERE vehicleId = ?
      ORDER BY date DESC
    `).all(id);

    // Associated inspections
    const inspections = db.prepare(`
      SELECT * FROM inspections
      WHERE vehicleId = ?
      ORDER BY expiryDate ASC
    `).all(id).map((insp: any) => ({
      ...insp,
      daysRemaining: getDaysRemaining(insp.expiryDate)
    }));

    // Associated expenses
    const expenses = db.prepare(`
      SELECT * FROM expenses
      WHERE vehicleId = ?
      ORDER BY date DESC
    `).all(id);

    // Vehicle specific stats
    const totalFuelCost: number = fuelRecords.reduce((sum: number, f: any) => sum + Number(f.totalPrice || 0), 0);
    const totalMaintenanceCost: number = maintenanceRecords.reduce((sum: number, m: any) => sum + Number(m.cost || 0), 0);
    const totalOtherCost: number = expenses.reduce((sum: number, e: any) => sum + Number(e.amount || 0), 0);
    const totalVehicleExpenses = Number((totalFuelCost + totalOtherCost).toFixed(2));

    res.json({
      vehicle,
      fuelRecords,
      maintenanceRecords,
      inspections,
      expenses,
      summary: {
        totalExpenses: totalVehicleExpenses,
        totalFuelCost: Number(totalFuelCost.toFixed(2)),
        totalMaintenanceCost: Number(totalMaintenanceCost.toFixed(2)),
        totalOtherCost: Number(totalOtherCost.toFixed(2)),
        fuelRecordCount: fuelRecords.length,
        maintenanceCount: maintenanceRecords.length
      }
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

apiRouter.post('/vehicles', (req: Request, res: Response) => {
  try {
    const data = req.body;

    // Validate required fields
    if (!data.brand || !data.model || !data.licensePlate || !data.vin) {
      return res.status(400).json({ error: 'Značka, model, EČV a VIN sú povinné polia!' });
    }

    // Check unique EČV and VIN
    const existingPlate = db.prepare('SELECT id FROM vehicles WHERE licensePlate = ?').get(data.licensePlate.trim().toUpperCase());
    if (existingPlate) {
      return res.status(400).json({ error: `Vozidlo s EČV ${data.licensePlate} už v systéme existuje!` });
    }

    const existingVin = db.prepare('SELECT id FROM vehicles WHERE vin = ?').get(data.vin.trim().toUpperCase());
    if (existingVin) {
      return res.status(400).json({ error: `Vozidlo s VIN ${data.vin} už v systéme existuje!` });
    }

    const mileage = Number(data.currentMileage) || 0;
    if (mileage < 0) {
      return res.status(400).json({ error: 'Stav kilometrov nemôže byť záporný!' });
    }

    const id = `veh-${crypto.randomUUID().slice(0, 8)}`;
    const nowStr = new Date().toISOString();

    db.prepare(`
      INSERT INTO vehicles (
        id, brand, model, licensePlate, vin, year, registrationDate,
        fuelType, tankCapacity, currentMileage, averageConsumption, status,
        lastStkDate, nextStkDate, lastEkDate, nextEkDate,
        insurancePolicyNumber, insuranceExpiryDate, assignedDriverId, notes,
        isArchived, createdAt, updatedAt
      ) VALUES (
        @id, @brand, @model, @licensePlate, @vin, @year, @registrationDate,
        @fuelType, @tankCapacity, @currentMileage, @averageConsumption, @status,
        @lastStkDate, @nextStkDate, @lastEkDate, @nextEkDate,
        @insurancePolicyNumber, @insuranceExpiryDate, @assignedDriverId, @notes,
        0, @createdAt, @updatedAt
      )
    `).run({
      id,
      brand: data.brand.trim(),
      model: data.model.trim(),
      licensePlate: data.licensePlate.trim().toUpperCase(),
      vin: data.vin.trim().toUpperCase(),
      year: Number(data.year) || new Date().getFullYear(),
      registrationDate: data.registrationDate || new Date().toISOString().split('T')[0],
      fuelType: data.fuelType || 'Nafta',
      tankCapacity: Number(data.tankCapacity) || 55,
      currentMileage: mileage,
      averageConsumption: Number(data.averageConsumption) || 6.0,
      status: data.status || 'active',
      lastStkDate: data.lastStkDate || '',
      nextStkDate: data.nextStkDate || '',
      lastEkDate: data.lastEkDate || '',
      nextEkDate: data.nextEkDate || '',
      insurancePolicyNumber: data.insurancePolicyNumber || '',
      insuranceExpiryDate: data.insuranceExpiryDate || '',
      assignedDriverId: data.assignedDriverId || null,
      notes: data.notes || '',
      createdAt: nowStr,
      updatedAt: nowStr
    });

    // If driver assigned, sync driver's assignedVehicleId
    if (data.assignedDriverId) {
      db.prepare('UPDATE drivers SET assignedVehicleId = ? WHERE id = ?').run(id, data.assignedDriverId);
    }

    res.status(201).json({ id, message: 'Vozidlo úspešne pridané' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

apiRouter.put('/vehicles/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const data = req.body;

    const current = db.prepare('SELECT * FROM vehicles WHERE id = ?').get(id) as any;
    if (!current) {
      return res.status(404).json({ error: 'Vozidlo nebolo nájdené' });
    }

    // Check mileage not decreasing below max recorded mileage
    const newMileage = Number(data.currentMileage);
    if (newMileage < current.currentMileage) {
      return res.status(400).json({
        error: `Stav tachometra (${newMileage} km) nemôže byť menší ako aktuálny evidovaný stav (${current.currentMileage} km)!`
      });
    }

    // Unique checks
    if (data.licensePlate && data.licensePlate.trim().toUpperCase() !== current.licensePlate) {
      const existing = db.prepare('SELECT id FROM vehicles WHERE licensePlate = ? AND id != ?').get(data.licensePlate.trim().toUpperCase(), id);
      if (existing) {
        return res.status(400).json({ error: `EČV ${data.licensePlate} už používa iné vozidlo!` });
      }
    }

    if (data.vin && data.vin.trim().toUpperCase() !== current.vin) {
      const existing = db.prepare('SELECT id FROM vehicles WHERE vin = ? AND id != ?').get(data.vin.trim().toUpperCase(), id);
      if (existing) {
        return res.status(400).json({ error: `VIN ${data.vin} už používa iné vozidlo!` });
      }
    }

    db.prepare(`
      UPDATE vehicles SET
        brand = @brand,
        model = @model,
        licensePlate = @licensePlate,
        vin = @vin,
        year = @year,
        registrationDate = @registrationDate,
        fuelType = @fuelType,
        tankCapacity = @tankCapacity,
        currentMileage = @currentMileage,
        averageConsumption = @averageConsumption,
        status = @status,
        lastStkDate = @lastStkDate,
        nextStkDate = @nextStkDate,
        lastEkDate = @lastEkDate,
        nextEkDate = @nextEkDate,
        insurancePolicyNumber = @insurancePolicyNumber,
        insuranceExpiryDate = @insuranceExpiryDate,
        assignedDriverId = @assignedDriverId,
        notes = @notes,
        updatedAt = datetime('now')
      WHERE id = @id
    `).run({
      id,
      brand: data.brand?.trim() || current.brand,
      model: data.model?.trim() || current.model,
      licensePlate: data.licensePlate?.trim().toUpperCase() || current.licensePlate,
      vin: data.vin?.trim().toUpperCase() || current.vin,
      year: Number(data.year) || current.year,
      registrationDate: data.registrationDate || current.registrationDate,
      fuelType: data.fuelType || current.fuelType,
      tankCapacity: Number(data.tankCapacity) || current.tankCapacity,
      currentMileage: newMileage || current.currentMileage,
      averageConsumption: Number(data.averageConsumption) || current.averageConsumption,
      status: data.status || current.status,
      lastStkDate: data.lastStkDate || current.lastStkDate,
      nextStkDate: data.nextStkDate || current.nextStkDate,
      lastEkDate: data.lastEkDate || current.lastEkDate,
      nextEkDate: data.nextEkDate || current.nextEkDate,
      insurancePolicyNumber: data.insurancePolicyNumber || current.insurancePolicyNumber,
      insuranceExpiryDate: data.insuranceExpiryDate || current.insuranceExpiryDate,
      assignedDriverId: data.assignedDriverId !== undefined ? data.assignedDriverId : current.assignedDriverId,
      notes: data.notes !== undefined ? data.notes : current.notes
    });

    // Update driver assignments
    if (data.assignedDriverId !== undefined) {
      db.prepare('UPDATE drivers SET assignedVehicleId = NULL WHERE assignedVehicleId = ?').run(id);
      if (data.assignedDriverId) {
        db.prepare('UPDATE drivers SET assignedVehicleId = ? WHERE id = ?').run(id, data.assignedDriverId);
      }
    }

    res.json({ message: 'Vozidlo úspešne upravené' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

apiRouter.delete('/vehicles/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    // Check if vehicle has financial or fuel history
    const fuelCount = (db.prepare('SELECT COUNT(*) as count FROM fuel_records WHERE vehicleId = ?').get(id) as { count: number }).count;
    const maintCount = (db.prepare('SELECT COUNT(*) as count FROM maintenance WHERE vehicleId = ?').get(id) as { count: number }).count;

    if (fuelCount > 0 || maintCount > 0) {
      // Safely archive rather than break financial integrity
      db.prepare("UPDATE vehicles SET isArchived = 1, status = 'out_of_service' WHERE id = ?").run(id);
      return res.json({ message: 'Vozidlo má historické záznamy, bolo bezpečne archivované a vyradené z prevádzky.' });
    }

    db.prepare('DELETE FROM inspections WHERE vehicleId = ?').run(id);
    db.prepare('DELETE FROM notifications WHERE vehicleId = ?').run(id);
    db.prepare('UPDATE drivers SET assignedVehicleId = NULL WHERE assignedVehicleId = ?').run(id);
    db.prepare('DELETE FROM vehicles WHERE id = ?').run(id);

    res.json({ message: 'Vozidlo bolo úspešne odstránené' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// -------------------------------------------------------------
// 3. DRIVERS (CRUD)
// -------------------------------------------------------------
apiRouter.get('/drivers', (_req: Request, res: Response) => {
  try {
    const drivers = db.prepare(`
      SELECT d.*, v.licensePlate as assignedVehiclePlate, v.brand as assignedVehicleBrand, v.model as assignedVehicleModel
      FROM drivers d
      LEFT JOIN vehicles v ON d.assignedVehicleId = v.id
      ORDER BY d.lastName ASC, d.firstName ASC
    `).all().map((d: any) => ({
      ...d,
      assignedVehicleName: d.assignedVehicleBrand ? `${d.assignedVehicleBrand} ${d.assignedVehicleModel}` : null
    }));
    res.json(drivers);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

apiRouter.post('/drivers', (req: Request, res: Response) => {
  try {
    const data = req.body;
    if (!data.firstName || !data.lastName || !data.phone || !data.licenseNumber) {
      return res.status(400).json({ error: 'Meno, priezvisko, telefón a číslo VP sú povinné!' });
    }

    const existingLicense = db.prepare('SELECT id FROM drivers WHERE licenseNumber = ?').get(data.licenseNumber.trim());
    if (existingLicense) {
      return res.status(400).json({ error: `Vodičský preukaz ${data.licenseNumber} je už priradený inému vodičovi!` });
    }

    // Check vehicle exclusivity if assigned
    if (data.assignedVehicleId) {
      const existingAssignee = db.prepare(`
        SELECT id, firstName, lastName FROM drivers
        WHERE assignedVehicleId = ? AND status = 'active'
      `).get(data.assignedVehicleId) as any;
      if (existingAssignee) {
        return res.status(400).json({
          error: `Vozidlu už je priradený aktívny vodič ${existingAssignee.firstName} ${existingAssignee.lastName}!`
        });
      }
    }

    const id = `drv-${crypto.randomUUID().slice(0, 8)}`;
    db.prepare(`
      INSERT INTO drivers (
        id, firstName, lastName, phone, email, licenseNumber, licenseCategory,
        licenseExpiryDate, assignedVehicleId, status, notes, createdAt, updatedAt
      ) VALUES (
        @id, @firstName, @lastName, @phone, @email, @licenseNumber, @licenseCategory,
        @licenseExpiryDate, @assignedVehicleId, @status, @notes, datetime('now'), datetime('now')
      )
    `).run({
      id,
      firstName: data.firstName.trim(),
      lastName: data.lastName.trim(),
      phone: data.phone.trim(),
      email: data.email?.trim() || '',
      licenseNumber: data.licenseNumber.trim(),
      licenseCategory: data.licenseCategory || 'B',
      licenseExpiryDate: data.licenseExpiryDate || '',
      assignedVehicleId: data.assignedVehicleId || null,
      status: data.status || 'active',
      notes: data.notes || ''
    });

    if (data.assignedVehicleId) {
      db.prepare('UPDATE vehicles SET assignedDriverId = ? WHERE id = ?').run(id, data.assignedVehicleId);
    }

    res.status(201).json({ id, message: 'Vodič úspešne pridaný' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

apiRouter.put('/drivers/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const data = req.body;
    const current = db.prepare('SELECT * FROM drivers WHERE id = ?').get(id) as any;
    if (!current) {
      return res.status(404).json({ error: 'Vodič nebol nájdený' });
    }

    if (data.licenseNumber && data.licenseNumber.trim() !== current.licenseNumber) {
      const existing = db.prepare('SELECT id FROM drivers WHERE licenseNumber = ? AND id != ?').get(data.licenseNumber.trim(), id);
      if (existing) {
        return res.status(400).json({ error: 'Číslo vodičského preukazu už patrí inému vodičovi!' });
      }
    }

    // Vehicle exclusivity check
    if (data.assignedVehicleId && data.assignedVehicleId !== current.assignedVehicleId) {
      const existingAssignee = db.prepare(`
        SELECT id, firstName, lastName FROM drivers
        WHERE assignedVehicleId = ? AND id != ? AND status = 'active'
      `).get(data.assignedVehicleId, id) as any;
      if (existingAssignee) {
        return res.status(400).json({
          error: `Vybrané vozidlo už šoféruje ${existingAssignee.firstName} ${existingAssignee.lastName}. Najskôr ho odpojte.`
        });
      }
    }

    db.prepare(`
      UPDATE drivers SET
        firstName = @firstName,
        lastName = @lastName,
        phone = @phone,
        email = @email,
        licenseNumber = @licenseNumber,
        licenseCategory = @licenseCategory,
        licenseExpiryDate = @licenseExpiryDate,
        assignedVehicleId = @assignedVehicleId,
        status = @status,
        notes = @notes,
        updatedAt = datetime('now')
      WHERE id = @id
    `).run({
      id,
      firstName: data.firstName?.trim() || current.firstName,
      lastName: data.lastName?.trim() || current.lastName,
      phone: data.phone?.trim() || current.phone,
      email: data.email?.trim() || current.email,
      licenseNumber: data.licenseNumber?.trim() || current.licenseNumber,
      licenseCategory: data.licenseCategory || current.licenseCategory,
      licenseExpiryDate: data.licenseExpiryDate || current.licenseExpiryDate,
      assignedVehicleId: data.assignedVehicleId !== undefined ? data.assignedVehicleId : current.assignedVehicleId,
      status: data.status || current.status,
      notes: data.notes !== undefined ? data.notes : current.notes
    });

    // Sync vehicle table
    if (current.assignedVehicleId && current.assignedVehicleId !== data.assignedVehicleId) {
      db.prepare('UPDATE vehicles SET assignedDriverId = NULL WHERE id = ?').run(current.assignedVehicleId);
    }
    if (data.assignedVehicleId) {
      db.prepare('UPDATE vehicles SET assignedDriverId = ? WHERE id = ?').run(id, data.assignedVehicleId);
    }

    res.json({ message: 'Údaje vodiča boli úspešne upravené' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

apiRouter.delete('/drivers/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    db.prepare('UPDATE vehicles SET assignedDriverId = NULL WHERE assignedDriverId = ?').run(id);
    db.prepare('UPDATE fuel_records SET driverId = NULL WHERE driverId = ?').run(id);
    db.prepare('DELETE FROM drivers WHERE id = ?').run(id);
    res.json({ message: 'Vodič bol úspešne zmazaný' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// -------------------------------------------------------------
// 4. FUEL RECORDS & CONSUMPTION ENGINE
// -------------------------------------------------------------
apiRouter.get('/fuel', (req: Request, res: Response) => {
  try {
    const { vehicleId, dateFrom, dateTo } = req.query;
    let query = `
      SELECT f.*, v.licensePlate as vehiclePlate, v.brand as vehicleBrand, v.model as vehicleModel,
             d.firstName as driverFirstName, d.lastName as driverLastName
      FROM fuel_records f
      JOIN vehicles v ON f.vehicleId = v.id
      LEFT JOIN drivers d ON f.driverId = d.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (vehicleId && vehicleId !== 'all') {
      query += ' AND f.vehicleId = ?';
      params.push(vehicleId);
    }
    if (dateFrom) {
      query += ' AND f.date >= ?';
      params.push(dateFrom);
    }
    if (dateTo) {
      query += ' AND f.date <= ?';
      params.push(dateTo);
    }

    query += ' ORDER BY f.date DESC, f.mileage DESC';
    const records = db.prepare(query).all(...params).map((r: any) => ({
      ...r,
      vehicleName: `${r.vehicleBrand} ${r.vehicleModel}`,
      driverName: r.driverFirstName ? `${r.driverFirstName} ${r.driverLastName}` : null
    }));

    res.json(records);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

apiRouter.post('/fuel', (req: Request, res: Response) => {
  try {
    const data = req.body;
    if (!data.vehicleId || !data.date || !data.fuelAmount || !data.pricePerLiter || !data.mileage) {
      return res.status(400).json({ error: 'Vozidlo, dátum, množstvo paliva, cena za liter a tachometer sú povinné!' });
    }

    const fuelAmount = Number(data.fuelAmount);
    const pricePerLiter = Number(data.pricePerLiter);
    const mileage = Number(data.mileage);

    if (fuelAmount <= 0) {
      return res.status(400).json({ error: 'Množstvo paliva musí byť väčšie ako 0 litrov!' });
    }
    if (pricePerLiter <= 0) {
      return res.status(400).json({ error: 'Cena za liter musí byť kladná suma!' });
    }
    if (mileage <= 0) {
      return res.status(400).json({ error: 'Stav tachometra musí byť kladné číslo!' });
    }

    const vehicle = db.prepare('SELECT * FROM vehicles WHERE id = ?').get(data.vehicleId) as any;
    if (!vehicle) {
      return res.status(404).json({ error: 'Zvolené vozidlo neexistuje' });
    }

    // Look for immediate prior fuel record for accurate consumption calculation
    const priorFuel = db.prepare(`
      SELECT * FROM fuel_records
      WHERE vehicleId = ? AND (date < ? OR (date = ? AND mileage < ?))
      ORDER BY date DESC, mileage DESC
      LIMIT 1
    `).get(data.vehicleId, data.date, data.date, mileage) as any;

    let consumption: number | null = null;
    if (priorFuel) {
      if (mileage <= priorFuel.mileage) {
        return res.status(400).json({
          error: `Chyba tachometra! Zadaný stav (${mileage} km) je menší alebo rovný predchádzajúcemu tankovaniu (${priorFuel.mileage} km zo dňa ${priorFuel.date}). Spotrebu nemožno vypočítať.`
        });
      }
      const distance = mileage - priorFuel.mileage;
      if (distance > 0) {
        consumption = Number(((fuelAmount / distance) * 100).toFixed(2));
      }
    }

    const totalPrice = Number((fuelAmount * pricePerLiter).toFixed(2));
    const id = `fuel-${crypto.randomUUID().slice(0, 8)}`;

    const runTx = db.transaction(() => {
      db.prepare(`
        INSERT INTO fuel_records (
          id, vehicleId, driverId, date, fuelStation, fuelAmount,
          pricePerLiter, totalPrice, mileage, fuelType, fullTank,
          consumption, notes, createdAt
        ) VALUES (
          @id, @vehicleId, @driverId, @date, @fuelStation, @fuelAmount,
          @pricePerLiter, @totalPrice, @mileage, @fuelType, @fullTank,
          @consumption, @notes, datetime('now')
        )
      `).run({
        id,
        vehicleId: data.vehicleId,
        driverId: data.driverId || vehicle.assignedDriverId || null,
        date: data.date,
        fuelStation: data.fuelStation?.trim() || 'Slovnaft Košice',
        fuelAmount,
        pricePerLiter,
        totalPrice,
        mileage,
        fuelType: data.fuelType || vehicle.fuelType,
        fullTank: data.fullTank === false ? 0 : 1,
        consumption,
        notes: data.notes || null
      });

      // Update vehicle current mileage if this entry is highest
      if (mileage > vehicle.currentMileage) {
        db.prepare('UPDATE vehicles SET currentMileage = ? WHERE id = ?').run(mileage, data.vehicleId);
      }

      // Update vehicle average consumption from calculated logs
      const avgRow = db.prepare(`
        SELECT AVG(consumption) as avgCons
        FROM fuel_records
        WHERE vehicleId = ? AND consumption IS NOT NULL AND consumption > 2 AND consumption < 30
      `).get(data.vehicleId) as { avgCons: number | null };

      if (avgRow && avgRow.avgCons) {
        db.prepare('UPDATE vehicles SET averageConsumption = ? WHERE id = ?').run(
          Number(avgRow.avgCons.toFixed(2)),
          data.vehicleId
        );
      }
    });

    runTx();

    res.status(201).json({ id, totalPrice, consumption, message: 'Tankovanie úspešne zaevidované' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

apiRouter.delete('/fuel/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    db.prepare('DELETE FROM fuel_records WHERE id = ?').run(id);
    res.json({ message: 'Záznam o tankovaní zmazaný' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// -------------------------------------------------------------
// 5. EXPENSES
// -------------------------------------------------------------
apiRouter.get('/expenses', (req: Request, res: Response) => {
  try {
    const { vehicleId, category, dateFrom, dateTo } = req.query;
    let query = `
      SELECT e.*, v.licensePlate as vehiclePlate, v.brand as vehicleBrand, v.model as vehicleModel
      FROM expenses e
      LEFT JOIN vehicles v ON e.vehicleId = v.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (vehicleId && vehicleId !== 'all') {
      if (vehicleId === 'fleet') {
        query += ' AND e.vehicleId IS NULL';
      } else {
        query += ' AND e.vehicleId = ?';
        params.push(vehicleId);
      }
    }
    if (category && category !== 'all') {
      query += ' AND e.category = ?';
      params.push(category);
    }
    if (dateFrom) {
      query += ' AND e.date >= ?';
      params.push(dateFrom);
    }
    if (dateTo) {
      query += ' AND e.date <= ?';
      params.push(dateTo);
    }

    query += ' ORDER BY e.date DESC, e.createdAt DESC';
    const expenses = db.prepare(query).all(...params).map((e: any) => ({
      ...e,
      vehicleName: e.vehicleBrand ? `${e.vehicleBrand} ${e.vehicleModel}` : 'Celá flotila'
    }));

    res.json(expenses);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

apiRouter.post('/expenses', (req: Request, res: Response) => {
  try {
    const data = req.body;
    if (!data.category || !data.date || !data.amount || !data.description) {
      return res.status(400).json({ error: 'Kategória, dátum, suma a popis sú povinné!' });
    }

    const amount = Number(data.amount);
    if (amount <= 0) {
      return res.status(400).json({ error: 'Suma nákladu musí byť kladné číslo!' });
    }

    const id = `exp-${crypto.randomUUID().slice(0, 8)}`;
    db.prepare(`
      INSERT INTO expenses (id, vehicleId, category, date, amount, description, supplier, invoiceNumber, sourceRef, createdAt)
      VALUES (@id, @vehicleId, @category, @date, @amount, @description, @supplier, @invoiceNumber, 'manual', datetime('now'))
    `).run({
      id,
      vehicleId: data.vehicleId || null,
      category: data.category,
      date: data.date,
      amount,
      description: data.description.trim(),
      supplier: data.supplier?.trim() || 'Dodávateľ',
      invoiceNumber: data.invoiceNumber?.trim() || `FA-${Date.now().toString().slice(-6)}`
    });

    res.status(201).json({ id, message: 'Náklad úspešne pridaný' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

apiRouter.delete('/expenses/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    db.prepare('DELETE FROM expenses WHERE id = ?').run(id);
    res.json({ message: 'Náklad zmazaný' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// -------------------------------------------------------------
// 6. MAINTENANCE & SERVICE RECORDS
// -------------------------------------------------------------
apiRouter.get('/maintenance', (req: Request, res: Response) => {
  try {
    const { vehicleId, status } = req.query;
    let query = `
      SELECT m.*, v.licensePlate as vehiclePlate, v.brand as vehicleBrand, v.model as vehicleModel
      FROM maintenance m
      JOIN vehicles v ON m.vehicleId = v.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (vehicleId && vehicleId !== 'all') {
      query += ' AND m.vehicleId = ?';
      params.push(vehicleId);
    }
    if (status && status !== 'all') {
      query += ' AND m.status = ?';
      params.push(status);
    }

    query += ' ORDER BY m.date DESC';
    const maintenance = db.prepare(query).all(...params).map((m: any) => ({
      ...m,
      vehicleName: `${m.vehicleBrand} ${m.vehicleModel}`
    }));

    res.json(maintenance);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

apiRouter.post('/maintenance', (req: Request, res: Response) => {
  try {
    const data = req.body;
    if (!data.vehicleId || !data.serviceType || !data.date || !data.serviceCenter || !data.description) {
      return res.status(400).json({ error: 'Vozidlo, typ servisu, dátum, servisné stredisko a popis sú povinné!' });
    }

    const cost = Number(data.cost) || 0;
    if (cost < 0) {
      return res.status(400).json({ error: 'Cena nemôže byť záporná!' });
    }

    const id = `maint-${crypto.randomUUID().slice(0, 8)}`;
    const status = data.status || 'completed';

    const runTx = db.transaction(() => {
      db.prepare(`
        INSERT INTO maintenance (
          id, vehicleId, serviceType, date, mileage, serviceCenter,
          description, cost, nextServiceDate, nextServiceMileage, status, notes,
          createdAt, updatedAt
        ) VALUES (
          @id, @vehicleId, @serviceType, @date, @mileage, @serviceCenter,
          @description, @cost, @nextServiceDate, @nextServiceMileage, @status, @notes,
          datetime('now'), datetime('now')
        )
      `).run({
        id,
        vehicleId: data.vehicleId,
        serviceType: data.serviceType,
        date: data.date,
        mileage: Number(data.mileage) || 0,
        serviceCenter: data.serviceCenter.trim(),
        description: data.description.trim(),
        cost,
        nextServiceDate: data.nextServiceDate || null,
        nextServiceMileage: Number(data.nextServiceMileage) || null,
        status,
        notes: data.notes || null
      });

      // If status is in_progress, update vehicle status to in_service
      if (status === 'in_progress') {
        db.prepare("UPDATE vehicles SET status = 'in_service' WHERE id = ?").run(data.vehicleId);
      } else if (status === 'completed') {
        // If vehicle was in_service, return to active
        const curr = db.prepare('SELECT status FROM vehicles WHERE id = ?').get(data.vehicleId) as any;
        if (curr && curr.status === 'in_service') {
          db.prepare("UPDATE vehicles SET status = 'active' WHERE id = ?").run(data.vehicleId);
        }
      }

      // Add corresponding expense record linked to maintenance
      if (cost > 0) {
        db.prepare(`
          INSERT INTO expenses (id, vehicleId, category, date, amount, description, supplier, invoiceNumber, sourceRef, sourceId, createdAt)
          VALUES (@id, @vehicleId, 'Servis', @date, @amount, @description, @supplier, @invoiceNumber, 'maintenance', @sourceId, datetime('now'))
        `).run({
          id: `exp-m-${id}`,
          vehicleId: data.vehicleId,
          date: data.date,
          amount: cost,
          description: `Servis: ${data.serviceType} - ${data.description.slice(0, 40)}`,
          supplier: data.serviceCenter,
          invoiceNumber: `SRV-${id.slice(-6)}`,
          sourceId: id
        });
      }
    });

    runTx();

    res.status(201).json({ id, message: 'Servisný záznam úspešne uložený' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

apiRouter.delete('/maintenance/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    db.prepare('DELETE FROM expenses WHERE sourceId = ?').run(id);
    db.prepare('DELETE FROM maintenance WHERE id = ?').run(id);
    res.json({ message: 'Záznam údržby bol zmazaný' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// -------------------------------------------------------------
// 7. INSPECTIONS (STK / EK / POISTENIE)
// -------------------------------------------------------------
apiRouter.get('/inspections', (req: Request, res: Response) => {
  try {
    const { vehicleId, type } = req.query;
    let query = `
      SELECT i.*, v.licensePlate as vehiclePlate, v.brand as vehicleBrand, v.model as vehicleModel
      FROM inspections i
      JOIN vehicles v ON i.vehicleId = v.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (vehicleId && vehicleId !== 'all') {
      query += ' AND i.vehicleId = ?';
      params.push(vehicleId);
    }
    if (type && type !== 'all') {
      query += ' AND i.type = ?';
      params.push(type);
    }

    query += ' ORDER BY i.expiryDate ASC';
    const inspections = db.prepare(query).all(...params).map((insp: any) => {
      const days = getDaysRemaining(insp.expiryDate);
      let grade: 'valid' | 'expiring_soon' | 'critical' | 'expired' = 'valid';
      if (days < 0) {
        grade = 'expired';
      } else if (days <= 7) {
        grade = 'critical';
      } else if (days <= 30) {
        grade = 'expiring_soon';
      }
      return {
        ...insp,
        daysRemaining: days,
        statusGrade: grade,
        vehicleName: `${insp.vehicleBrand} ${insp.vehicleModel}`
      };
    });

    res.json(inspections);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

apiRouter.post('/inspections', (req: Request, res: Response) => {
  try {
    const data = req.body;
    if (!data.vehicleId || !data.type || !data.expiryDate || !data.protocolNumber) {
      return res.status(400).json({ error: 'Vozidlo, typ, dátum expirácie a číslo protokolu sú povinné!' });
    }

    const id = `insp-${crypto.randomUUID().slice(0, 8)}`;
    db.prepare(`
      INSERT INTO inspections (id, vehicleId, type, inspectionDate, expiryDate, station, protocolNumber, result, notes, createdAt)
      VALUES (@id, @vehicleId, @type, @inspectionDate, @expiryDate, @station, @protocolNumber, @result, @notes, datetime('now'))
    `).run({
      id,
      vehicleId: data.vehicleId,
      type: data.type,
      inspectionDate: data.inspectionDate || new Date().toISOString().split('T')[0],
      expiryDate: data.expiryDate,
      station: data.station?.trim() || 'STK Stanica',
      protocolNumber: data.protocolNumber.trim(),
      result: data.result || 'passed',
      notes: data.notes || null
    });

    // Update vehicle's nextStkDate or nextEkDate
    if (data.type === 'STK') {
      db.prepare('UPDATE vehicles SET nextStkDate = ?, lastStkDate = ? WHERE id = ?').run(data.expiryDate, data.inspectionDate || '', data.vehicleId);
    } else if (data.type === 'EK') {
      db.prepare('UPDATE vehicles SET nextEkDate = ?, lastEkDate = ? WHERE id = ?').run(data.expiryDate, data.inspectionDate || '', data.vehicleId);
    }

    res.status(201).json({ id, message: 'Technická kontrola zaevidovaná' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

apiRouter.delete('/inspections/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    db.prepare('DELETE FROM inspections WHERE id = ?').run(id);
    res.json({ message: 'Záznam kontroly zmazaný' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// -------------------------------------------------------------
// 8. NOTIFICATIONS & ALERTS
// -------------------------------------------------------------
apiRouter.get('/notifications', (_req: Request, res: Response) => {
  try {
    const notifications = db.prepare(`
      SELECT n.*, v.licensePlate as vehiclePlate, v.brand as vehicleBrand, v.model as vehicleModel
      FROM notifications n
      LEFT JOIN vehicles v ON n.vehicleId = v.id
      ORDER BY n.isRead ASC, n.createdAt DESC
    `).all();
    res.json(notifications);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

apiRouter.put('/notifications/:id/read', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    db.prepare('UPDATE notifications SET isRead = 1 WHERE id = ?').run(id);
    res.json({ message: 'Upozornenie označené ako prečítané' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

apiRouter.post('/notifications/read-all', (_req: Request, res: Response) => {
  try {
    db.prepare('UPDATE notifications SET isRead = 1').run();
    res.json({ message: 'Všetky upozornenia boli označené ako prečítané' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

apiRouter.delete('/notifications/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    db.prepare('DELETE FROM notifications WHERE id = ?').run(id);
    res.json({ message: 'Upozornenie odstránené' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// -------------------------------------------------------------
// 9. REPORTS & ADVANCED ANALYTICS
// -------------------------------------------------------------
apiRouter.get('/reports', (req: Request, res: Response) => {
  try {
    const { vehicleId, dateFrom, dateTo, category } = req.query;

    let expenseQuery = `
      SELECT e.*, v.licensePlate, v.brand, v.model
      FROM expenses e
      LEFT JOIN vehicles v ON e.vehicleId = v.id
      WHERE 1=1
    `;
    let fuelQuery = `
      SELECT f.*, v.licensePlate, v.brand, v.model
      FROM fuel_records f
      JOIN vehicles v ON f.vehicleId = v.id
      WHERE 1=1
    `;
    const expenseParams: any[] = [];
    const fuelParams: any[] = [];

    if (vehicleId && vehicleId !== 'all') {
      expenseQuery += ' AND e.vehicleId = ?';
      expenseParams.push(vehicleId);
      fuelQuery += ' AND f.vehicleId = ?';
      fuelParams.push(vehicleId);
    }
    if (category && category !== 'all' && category !== 'Palivo') {
      expenseQuery += ' AND e.category = ?';
      expenseParams.push(category);
    }
    if (dateFrom) {
      expenseQuery += ' AND e.date >= ?';
      expenseParams.push(dateFrom);
      fuelQuery += ' AND f.date >= ?';
      fuelParams.push(dateFrom);
    }
    if (dateTo) {
      expenseQuery += ' AND e.date <= ?';
      expenseParams.push(dateTo);
      fuelQuery += ' AND f.date <= ?';
      fuelParams.push(dateTo);
    }

    const expenses = db.prepare(expenseQuery).all(...expenseParams) as any[];
    const fuelRecords = (category && category !== 'all' && category !== 'Palivo')
      ? []
      : db.prepare(fuelQuery).all(...fuelParams) as any[];

    // Calculate aggregated metrics
    const totalExpensesSum = expenses.reduce((s, e) => s + e.amount, 0);
    const totalFuelSum = fuelRecords.reduce((s, f) => s + f.totalPrice, 0);
    const totalCombinedCost = Number((totalExpensesSum + totalFuelSum).toFixed(2));
    const totalLiters = fuelRecords.reduce((s, f) => s + f.fuelAmount, 0);

    // Costs per vehicle breakdown
    const vehicleCostMap = new Map<string, { plate: string; brandModel: string; totalCost: number; fuelCost: number; otherCost: number; km: number }>();
    const allVehicles = db.prepare('SELECT id, licensePlate, brand, model, currentMileage FROM vehicles WHERE isArchived = 0').all() as any[];
    for (const v of allVehicles) {
      vehicleCostMap.set(v.id, {
        plate: v.licensePlate,
        brandModel: `${v.brand} ${v.model}`,
        totalCost: 0,
        fuelCost: 0,
        otherCost: 0,
        km: v.currentMileage
      });
    }

    for (const e of expenses) {
      if (e.vehicleId && vehicleCostMap.has(e.vehicleId)) {
        const item = vehicleCostMap.get(e.vehicleId)!;
        item.otherCost += e.amount;
        item.totalCost += e.amount;
      }
    }
    for (const f of fuelRecords) {
      if (vehicleCostMap.has(f.vehicleId)) {
        const item = vehicleCostMap.get(f.vehicleId)!;
        item.fuelCost += f.totalPrice;
        item.totalCost += f.totalPrice;
      }
    }

    const vehicleCostList = Array.from(vehicleCostMap.values())
      .filter(v => vehicleId === 'all' || !vehicleId || v.plate === (allVehicles.find(av => av.id === vehicleId)?.licensePlate))
      .map(v => ({
        ...v,
        totalCost: Number(v.totalCost.toFixed(2)),
        fuelCost: Number(v.fuelCost.toFixed(2)),
        otherCost: Number(v.otherCost.toFixed(2)),
        costPerKm: v.km > 0 ? Number((v.totalCost / v.km).toFixed(3)) : 0
      }));

    // Category breakdown
    const categoryTotals: Record<string, number> = {
      Palivo: Number(totalFuelSum.toFixed(2))
    };
    for (const e of expenses) {
      categoryTotals[e.category] = Number(((categoryTotals[e.category] || 0) + e.amount).toFixed(2));
    }

    const categoryList = Object.entries(categoryTotals)
      .map(([cat, total]) => ({ category: cat, total }))
      .sort((a, b) => b.total - a.total);

    // Consumption comparison
    const consumptionList = allVehicles.map(v => {
      const vFuel = fuelRecords.filter(f => f.vehicleId === v.id && f.consumption);
      const avgC = vFuel.length > 0
        ? Number((vFuel.reduce((s, f) => s + f.consumption, 0) / vFuel.length).toFixed(2))
        : 0;
      return {
        id: v.id,
        plate: v.licensePlate,
        name: `${v.brand} ${v.model}`,
        averageConsumption: avgC || 5.5,
        totalKm: v.currentMileage
      };
    });

    res.json({
      summary: {
        totalCost: totalCombinedCost,
        totalFuelCost: Number(totalFuelSum.toFixed(2)),
        totalOtherCost: Number(totalExpensesSum.toFixed(2)),
        totalLiters: Number(totalLiters.toFixed(2)),
        expenseCount: expenses.length + fuelRecords.length
      },
      byVehicle: vehicleCostList,
      byCategory: categoryList,
      consumption: consumptionList,
      rawExpenses: expenses,
      rawFuel: fuelRecords
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// -------------------------------------------------------------
// 10. SETTINGS & DEMO RESTORE
// -------------------------------------------------------------
apiRouter.get('/settings', (_req: Request, res: Response) => {
  try {
    const settings = db.prepare('SELECT * FROM company_settings WHERE id = 1').get();
    res.json(settings);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

apiRouter.put('/settings', (req: Request, res: Response) => {
  try {
    const data = req.body;
    db.prepare(`
      UPDATE company_settings SET
        companyName = @companyName,
        address = @address,
        ico = @ico,
        dic = @dic,
        icDph = @icDph,
        email = @email,
        phone = @phone,
        currency = @currency,
        alertDaysWarning = @alertDaysWarning,
        alertDaysCritical = @alertDaysCritical
      WHERE id = 1
    `).run({
      companyName: data.companyName?.trim() || 'LogiTrans s.r.o.',
      address: data.address?.trim() || '',
      ico: data.ico?.trim() || '',
      dic: data.dic?.trim() || '',
      icDph: data.icDph?.trim() || '',
      email: data.email?.trim() || '',
      phone: data.phone?.trim() || '',
      currency: data.currency || 'EUR',
      alertDaysWarning: Number(data.alertDaysWarning) || 30,
      alertDaysCritical: Number(data.alertDaysCritical) || 7
    });

    res.json({ message: 'Nastavenia boli úspešne uložené' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

apiRouter.post('/settings/restore-demo', (_req: Request, res: Response) => {
  try {
    const result = seedDemoData(true);
    res.json({ message: 'Demonštračné údaje boli úspešne obnovené', details: result });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});
