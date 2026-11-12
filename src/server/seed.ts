import { db } from './db.js';

export function seedDemoData(force = false) {
  const existingCount = db.prepare('SELECT COUNT(*) as count FROM vehicles').get() as { count: number };
  if (existingCount && existingCount.count > 0 && !force) {
    return { message: 'Database already seeded' };
  }

  // Clear existing tables in correct order if forced
  if (force) {
    db.exec(`
      DELETE FROM notifications;
      DELETE FROM inspections;
      DELETE FROM maintenance;
      DELETE FROM expenses;
      DELETE FROM fuel_records;
      UPDATE vehicles SET assignedDriverId = NULL;
      UPDATE drivers SET assignedVehicleId = NULL;
      DELETE FROM vehicles;
      DELETE FROM drivers;
    `);
  }

  const runTx = db.transaction(() => {
    // 1. Insert 6 Drivers
    const drivers = [
      {
        id: 'drv-1',
        firstName: 'Ján',
        lastName: 'Kováč',
        phone: '+421 905 123 456',
        email: 'jan.kovac@logitrans.sk',
        licenseNumber: 'SK-918201-A',
        licenseCategory: 'B, C, C+E',
        licenseExpiryDate: '2028-06-15',
        assignedVehicleId: 'veh-1',
        status: 'active',
        notes: 'Senior vodič pre diaľkovú vnútroštátnu prepravu. Zodpovedný prístup.'
      },
      {
        id: 'drv-2',
        firstName: 'Peter',
        lastName: 'Horváth',
        phone: '+421 911 234 567',
        email: 'peter.horvath@logitrans.sk',
        licenseNumber: 'SK-829104-B',
        licenseCategory: 'B, C',
        licenseExpiryDate: '2027-11-20',
        assignedVehicleId: 'veh-2',
        status: 'active',
        notes: 'Vodič pre manažérske a expresné zásielky Západné Slovensko.'
      },
      {
        id: 'drv-3',
        firstName: 'Michal',
        lastName: 'Varga',
        phone: '+421 908 345 678',
        email: 'michal.varga@logitrans.sk',
        licenseNumber: 'SK-748192-C',
        licenseCategory: 'B, C, C+E',
        licenseExpiryDate: '2026-12-05', // Expiring soon (< 30 days if today is around Nov/Dec)
        assignedVehicleId: 'veh-4',
        status: 'active',
        notes: 'Špecialista na dodávkové a nákladné vozidlá Transporter a Sprinter.'
      },
      {
        id: 'drv-4',
        firstName: 'Tomáš',
        lastName: 'Baláž',
        phone: '+421 903 456 789',
        email: 'tomas.balaz@logitrans.sk',
        licenseNumber: 'SK-639201-D',
        licenseCategory: 'B, C',
        licenseExpiryDate: '2029-03-10',
        assignedVehicleId: 'veh-6',
        status: 'active',
        notes: 'Preprava paletového tovaru Východné a Stredné Slovensko.'
      },
      {
        id: 'drv-5',
        firstName: 'Martin',
        lastName: 'Molnár',
        phone: '+421 917 567 890',
        email: 'martin.molnar@logitrans.sk',
        licenseNumber: 'SK-529183-E',
        licenseCategory: 'B',
        licenseExpiryDate: '2030-08-22',
        assignedVehicleId: 'veh-7',
        status: 'active',
        notes: 'Mestská distribúcia a ekologická jazda na hybridnom vozidle.'
      },
      {
        id: 'drv-6',
        firstName: 'Lukáš',
        lastName: 'Novák',
        phone: '+421 944 678 901',
        email: 'lukas.novak@logitrans.sk',
        licenseNumber: 'SK-419284-F',
        licenseCategory: 'B',
        licenseExpiryDate: '2026-11-18', // Critical expiry: less than 7 days
        assignedVehicleId: 'veh-10',
        status: 'active',
        notes: 'Mladý kuriér pre košický a prešovský región.'
      }
    ];

    const insertDriver = db.prepare(`
      INSERT INTO drivers (id, firstName, lastName, phone, email, licenseNumber, licenseCategory, licenseExpiryDate, assignedVehicleId, status, notes, createdAt, updatedAt)
      VALUES (@id, @firstName, @lastName, @phone, @email, @licenseNumber, @licenseCategory, @licenseExpiryDate, @assignedVehicleId, @status, @notes, datetime('now', '-300 days'), datetime('now'))
    `);

    for (const d of drivers) {
      insertDriver.run(d);
    }

    // 2. Insert 10 Vehicles
    const vehicles = [
      {
        id: 'veh-1',
        brand: 'Škoda',
        model: 'Octavia Combi 2.0 TDI',
        licensePlate: 'KE-412BH',
        vin: 'TMBJJ7NE8K0192841',
        year: 2019,
        registrationDate: '2019-04-12',
        fuelType: 'Nafta',
        tankCapacity: 50,
        currentMileage: 168500,
        averageConsumption: 5.2,
        status: 'active',
        lastStkDate: '2024-04-10',
        nextStkDate: '2026-11-28', // < 20 days: Warning
        lastEkDate: '2024-04-10',
        nextEkDate: '2026-11-28',
        insurancePolicyNumber: 'PZP-ALL-829104',
        insuranceExpiryDate: '2027-04-15',
        assignedDriverId: 'drv-1',
        notes: 'Dlhodobé služobné vozidlo obchodného zástupcu. Pravidelný autorizovaný servis.'
      },
      {
        id: 'veh-2',
        brand: 'Škoda',
        model: 'Superb 2.0 TDI DSG',
        licensePlate: 'BA-883TZ',
        vin: 'TMBAJ9NP2L7038192',
        year: 2021,
        registrationDate: '2021-03-20',
        fuelType: 'Nafta',
        tankCapacity: 66,
        currentMileage: 114200,
        averageConsumption: 5.8,
        status: 'active',
        lastStkDate: '2025-03-15',
        nextStkDate: '2027-03-15',
        lastEkDate: '2025-03-15',
        nextEkDate: '2027-03-15',
        insurancePolicyNumber: 'PZP-KOOP-491823',
        insuranceExpiryDate: '2027-03-20',
        assignedDriverId: 'drv-2',
        notes: 'Reprezentatívne manažérske vozidlo, výborný technický stav.'
      },
      {
        id: 'veh-3',
        brand: 'Volkswagen',
        model: 'Passat Variant 2.0 TDI',
        licensePlate: 'ZA-551AA',
        vin: 'WVWZZZ3CZLE092834',
        year: 2020,
        registrationDate: '2020-07-14',
        fuelType: 'Nafta',
        tankCapacity: 66,
        currentMileage: 142800,
        averageConsumption: 5.6,
        status: 'active',
        lastStkDate: '2024-07-02',
        nextStkDate: '2026-11-15', // < 7 days: Critical!
        lastEkDate: '2024-07-02',
        nextEkDate: '2026-11-15',
        insurancePolicyNumber: 'PZP-GEN-771928',
        insuranceExpiryDate: '2027-07-10',
        assignedDriverId: null,
        notes: 'Flotilové vozidlo pre operatívne trasy Žilina - Bratislava.'
      },
      {
        id: 'veh-4',
        brand: 'Volkswagen',
        model: 'Transporter T6 2.0 TDI',
        licensePlate: 'PO-302CY',
        vin: 'WV1ZZZ7HZLH048291',
        year: 2019,
        registrationDate: '2019-09-05',
        fuelType: 'Nafta',
        tankCapacity: 70,
        currentMileage: 215400,
        averageConsumption: 7.9,
        status: 'active',
        lastStkDate: '2023-09-01',
        nextStkDate: '2025-09-01',
        lastEkDate: '2023-09-01',
        nextEkDate: '2025-09-01',
        insurancePolicyNumber: 'PZP-ALL-992144',
        insuranceExpiryDate: '2026-11-10', // OVERDUE!
        assignedDriverId: 'drv-3',
        notes: 'Úžitková dodávka s chladiacou vstavbou, vysoké vyťaženie.'
      },
      {
        id: 'veh-5',
        brand: 'Ford',
        model: 'Transit Custom 2.0 TDCi',
        licensePlate: 'BB-719DK',
        vin: 'WF0YXXTTGYKK29184',
        year: 2020,
        registrationDate: '2020-02-18',
        fuelType: 'Nafta',
        tankCapacity: 72,
        currentMileage: 189300,
        averageConsumption: 8.4,
        status: 'in_service',
        lastStkDate: '2024-02-10',
        nextStkDate: '2026-12-15',
        lastEkDate: '2024-02-10',
        nextEkDate: '2026-12-15',
        insurancePolicyNumber: 'PZP-UNI-661928',
        insuranceExpiryDate: '2027-02-18',
        assignedDriverId: null,
        notes: 'V oprave v servise Todos Banská Bystrica - diagnostika vstrekovacieho čerpadla.'
      },
      {
        id: 'veh-6',
        brand: 'Mercedes-Benz',
        model: 'Sprinter 316 CDI L3H2',
        licensePlate: 'NR-628EP',
        vin: 'WDB9066351S892014',
        year: 2018,
        registrationDate: '2018-06-25',
        fuelType: 'Nafta',
        tankCapacity: 75,
        currentMileage: 298000,
        averageConsumption: 9.3,
        status: 'active',
        lastStkDate: '2024-06-18',
        nextStkDate: '2026-12-20',
        lastEkDate: '2024-06-18',
        nextEkDate: '2026-12-20',
        insurancePolicyNumber: 'PZP-ALL-110293',
        insuranceExpiryDate: '2027-06-25',
        assignedDriverId: 'drv-4',
        notes: 'Veľká skriňová dodávka na medzinárodné linky SK - CZ - HU.'
      },
      {
        id: 'veh-7',
        brand: 'Toyota',
        model: 'Corolla Touring Sports 1.8 Hybrid',
        licensePlate: 'TT-904FX',
        vin: 'SB1ZE3BE10E049182',
        year: 2022,
        registrationDate: '2022-05-10',
        fuelType: 'Hybrid',
        tankCapacity: 43,
        currentMileage: 62400,
        averageConsumption: 4.4,
        status: 'active',
        lastStkDate: '2022-05-10',
        nextStkDate: '2026-12-05',
        lastEkDate: '2022-05-10',
        nextEkDate: '2026-12-05',
        insurancePolicyNumber: 'PZP-KOOP-339182',
        insuranceExpiryDate: '2027-05-10',
        assignedDriverId: 'drv-5',
        notes: 'Nízkoemisné vozidlo s najnižšou spotrebou v celej flotile.'
      },
      {
        id: 'veh-8',
        brand: 'Dacia',
        model: 'Dokker Van 1.5 Blue dCi',
        licensePlate: 'TN-183GA',
        vin: 'UU10SD35G63819284',
        year: 2019,
        registrationDate: '2019-11-20',
        fuelType: 'Nafta',
        tankCapacity: 50,
        currentMileage: 154900,
        averageConsumption: 5.1,
        status: 'out_of_service',
        lastStkDate: '2023-11-15',
        nextStkDate: '2025-11-15',
        lastEkDate: '2023-11-15',
        nextEkDate: '2025-11-15',
        insurancePolicyNumber: 'PZP-GEN-220192',
        insuranceExpiryDate: '2026-11-05', // Overdue
        assignedDriverId: null,
        notes: 'Dočasne vyradené z prevádzky po poistnej udalosti (poškodenie zadnej nápravy).'
      },
      {
        id: 'veh-9',
        brand: 'Renault',
        model: 'Master Furgon 2.3 dCi',
        licensePlate: 'KE-749JJ',
        vin: 'VF1VB000559281723',
        year: 2021,
        registrationDate: '2021-08-30',
        fuelType: 'Nafta',
        tankCapacity: 80,
        currentMileage: 137600,
        averageConsumption: 8.9,
        status: 'active',
        lastStkDate: '2025-08-20',
        nextStkDate: '2027-08-20',
        lastEkDate: '2025-08-20',
        nextEkDate: '2027-08-20',
        insurancePolicyNumber: 'PZP-UNI-559102',
        insuranceExpiryDate: '2027-08-30',
        assignedDriverId: null,
        notes: 'Ťažká dodávka so sklopnou hydraulickou plošinou.'
      },
      {
        id: 'veh-10',
        brand: 'Hyundai',
        model: 'i30 Kombi 1.5 T-GDI',
        licensePlate: 'BA-331LL',
        vin: 'TMAH3812AMJ829103',
        year: 2022,
        registrationDate: '2022-10-14',
        fuelType: 'Benzín',
        tankCapacity: 50,
        currentMileage: 48500,
        averageConsumption: 6.3,
        status: 'active',
        lastStkDate: '2022-10-14',
        nextStkDate: '2026-12-10',
        lastEkDate: '2022-10-14',
        nextEkDate: '2026-12-10',
        insurancePolicyNumber: 'PZP-ALL-441092',
        insuranceExpiryDate: '2027-10-14',
        assignedDriverId: 'drv-6',
        notes: 'Kuriérske expresné vozidlo, vysoká spoľahlivosť.'
      }
    ];

    const insertVehicle = db.prepare(`
      INSERT INTO vehicles (id, brand, model, licensePlate, vin, year, registrationDate, fuelType, tankCapacity, currentMileage, averageConsumption, status, lastStkDate, nextStkDate, lastEkDate, nextEkDate, insurancePolicyNumber, insuranceExpiryDate, assignedDriverId, notes, isArchived, createdAt, updatedAt)
      VALUES (@id, @brand, @model, @licensePlate, @vin, @year, @registrationDate, @fuelType, @tankCapacity, @currentMileage, @averageConsumption, @status, @lastStkDate, @nextStkDate, @lastEkDate, @nextEkDate, @insurancePolicyNumber, @insuranceExpiryDate, @assignedDriverId, @notes, 0, datetime('now', '-365 days'), datetime('now'))
    `);

    for (const v of vehicles) {
      insertVehicle.run(v);
    }

    // 3. Insert realistic Fuel Records (50+ records spanning last 12 months with sequential mileages & correct consumption)
    const stations = [
      'Slovnaft Košice - Južná trieda',
      'OMV Prešov - Sabinovská',
      'Shell Žilina - Košická',
      'Orlen Poprad - Teplická',
      'Slovnaft Bratislava - Rožňavská',
      'Shell Zvolen - Lučenecká',
      'OMV Banská Bystrica - Zvolenská',
      'Slovnaft Ružomberok'
    ];

    const insertFuel = db.prepare(`
      INSERT INTO fuel_records (id, vehicleId, driverId, date, fuelStation, fuelAmount, pricePerLiter, totalPrice, mileage, fuelType, fullTank, consumption, notes, createdAt)
      VALUES (@id, @vehicleId, @driverId, @date, @fuelStation, @fuelAmount, @pricePerLiter, @totalPrice, @mileage, @fuelType, @fullTank, @consumption, @notes, datetime(@date || ' 10:00:00'))
    `);

    // Let's generate sequential fuel logs per vehicle over 2026
    const vehicleFuelProfiles = [
      { id: 'veh-1', startKm: 145000, endKm: 168500, fuelType: 'Nafta', baseCons: 5.2, driver: 'drv-1' },
      { id: 'veh-2', startKm: 98000, endKm: 114200, fuelType: 'Nafta', baseCons: 5.8, driver: 'drv-2' },
      { id: 'veh-3', startKm: 122000, endKm: 142800, fuelType: 'Nafta', baseCons: 5.6, driver: null },
      { id: 'veh-4', startKm: 190000, endKm: 215400, fuelType: 'Nafta', baseCons: 7.9, driver: 'drv-3' },
      { id: 'veh-6', startKm: 268000, endKm: 298000, fuelType: 'Nafta', baseCons: 9.3, driver: 'drv-4' },
      { id: 'veh-7', startKm: 46000, endKm: 62400, fuelType: 'Hybrid', baseCons: 4.4, driver: 'drv-5' },
      { id: 'veh-9', startKm: 118000, endKm: 137600, fuelType: 'Nafta', baseCons: 8.9, driver: null },
      { id: 'veh-10', startKm: 34000, endKm: 48500, fuelType: 'Benzín', baseCons: 6.3, driver: 'drv-6' }
    ];

    let fuelIdCounter = 1;
    for (const vp of vehicleFuelProfiles) {
      const steps = 7; // 7 fuel entries per vehicle across 12 months = 56 fuel records
      const kmStep = Math.round((vp.endKm - vp.startKm) / steps);
      let currKm = vp.startKm;

      for (let s = 1; s <= steps; s++) {
        const month = String(s <= 11 ? s : 11).padStart(2, '0');
        const day = String((s * 4) % 27 + 1).padStart(2, '0');
        const date = `2026-${month}-${day}`;
        const prevKm = currKm;
        const nextKm = s === steps ? vp.endKm : currKm + kmStep + Math.floor(Math.random() * 80 - 40);
        const distance = nextKm - prevKm;
        currKm = nextKm;

        // Realistic variation in consumption (+- 5%)
        const varCons = Number((vp.baseCons * (0.96 + Math.random() * 0.08)).toFixed(2));
        const fuelLiters = Number(((distance * varCons) / 100).toFixed(2));
        const pricePerL = Number((vp.fuelType === 'Benzín' ? 1.62 + Math.random() * 0.08 : 1.54 + Math.random() * 0.08).toFixed(3));
        const totalPrice = Number((fuelLiters * pricePerL).toFixed(2));
        const station = stations[(s + fuelIdCounter) % stations.length];

        insertFuel.run({
          id: `fuel-${fuelIdCounter}`,
          vehicleId: vp.id,
          driverId: vp.driver,
          date,
          fuelStation: station,
          fuelAmount: fuelLiters,
          pricePerLiter: pricePerL,
          totalPrice,
          mileage: currKm,
          fuelType: vp.fuelType,
          fullTank: 1,
          consumption: varCons,
          notes: s === steps ? 'Posledné plánované tankovanie pred technickou kontrolou.' : null
        });

        fuelIdCounter++;
      }
    }

    // 4. Insert 35+ Expense records (across diverse categories and dates)
    const expenses = [
      { id: 'exp-1', vehicleId: 'veh-1', category: 'Poistenie', date: '2026-04-15', amount: 320.00, description: 'Ročné povinné zmluvné poistenie (PZP) Allianz', supplier: 'Allianz - Slovenská poisťovňa a.s.', invoiceNumber: 'FA-2026-0819', sourceRef: 'manual' },
      { id: 'exp-2', vehicleId: 'veh-1', category: 'Pneumatiky', date: '2026-04-20', amount: 380.00, description: 'Sada letných pneumatík Continental EcoContact 6 205/55 R16', supplier: 'Pneuexpert s.r.o. Košice', invoiceNumber: 'FA-2026-0922', sourceRef: 'manual' },
      { id: 'exp-3', vehicleId: 'veh-1', category: 'Diaľničné známky', date: '2026-01-05', amount: 60.00, description: 'Ročná elektronická diaľničná známka SR 2026', supplier: 'Národná diaľničná spoločnosť, a.s.', invoiceNumber: 'EZ-2026-44182', sourceRef: 'manual' },
      
      { id: 'exp-4', vehicleId: 'veh-2', category: 'Poistenie', date: '2026-03-20', amount: 890.00, description: 'Komplexné Kasko poistenie + PZP Kooperativa', supplier: 'KOOPERATIVA poisťovňa, a.s.', invoiceNumber: 'FA-2026-0433', sourceRef: 'manual' },
      { id: 'exp-5', vehicleId: 'veh-2', category: 'Diaľničné známky', date: '2026-01-05', amount: 60.00, description: 'Ročná elektronická diaľničná známka SR 2026', supplier: 'Národná diaľničná spoločnosť, a.s.', invoiceNumber: 'EZ-2026-44183', sourceRef: 'manual' },
      { id: 'exp-6', vehicleId: 'veh-2', category: 'Parkovné', date: '2026-06-12', amount: 48.00, description: 'Parkovacie poplatky Letisko M. R. Štefánika Bratislava', supplier: 'Letisko Bratislava a.s.', invoiceNumber: 'PK-2026-0199', sourceRef: 'manual' },

      { id: 'exp-7', vehicleId: 'veh-3', category: 'Servis', date: '2026-05-18', amount: 450.00, description: 'Veľká servisná prehliadka po 120 000 km, výmena rozvodov a pumpy', supplier: 'Autocentrum Žilina s.r.o.', invoiceNumber: 'FA-2026-1182', sourceRef: 'manual' },
      { id: 'exp-8', vehicleId: 'veh-3', category: 'Diaľničné známky', date: '2026-01-05', amount: 60.00, description: 'Ročná elektronická diaľničná známka SR 2026', supplier: 'Národná diaľničná spoločnosť, a.s.', invoiceNumber: 'EZ-2026-44184', sourceRef: 'manual' },

      { id: 'exp-9', vehicleId: 'veh-4', category: 'Servis', date: '2026-02-14', amount: 680.00, description: 'Výmena spojkovej sady a zotrvačníka LUK', supplier: 'Todos Prešov s.r.o.', invoiceNumber: 'FA-2026-0291', sourceRef: 'manual' },
      { id: 'exp-10', vehicleId: 'veh-4', category: 'Pneumatiky', date: '2026-10-18', amount: 520.00, description: '4x úžitkové zimné pneumatiky Michelin Agilis 215/65 R16C', supplier: 'Mikona s.r.o. Prešov', invoiceNumber: 'FA-2026-2104', sourceRef: 'manual' },
      { id: 'exp-11', vehicleId: 'veh-4', category: 'Diaľničné známky', date: '2026-01-05', amount: 60.00, description: 'Ročná elektronická diaľničná známka SR 2026', supplier: 'Národná diaľničná spoločnosť, a.s.', invoiceNumber: 'EZ-2026-44185', sourceRef: 'manual' },

      { id: 'exp-12', vehicleId: 'veh-5', category: 'Opravy', date: '2026-10-25', amount: 1240.00, description: 'Repas vysokotlakového palivového čerpadla Bosch + vstrekovače', supplier: 'Diesel Servis Banská Bystrica', invoiceNumber: 'FA-2026-3011', sourceRef: 'manual' },
      { id: 'exp-13', vehicleId: 'veh-5', category: 'Servis', date: '2026-06-10', amount: 310.00, description: 'Pravidelný servis: motorový olej 5W-30, palivový a peľový filter', supplier: 'Todos Banská Bystrica', invoiceNumber: 'FA-2026-1890', sourceRef: 'manual' },

      { id: 'exp-14', vehicleId: 'veh-6', category: 'Servis', date: '2026-03-08', amount: 780.00, description: 'Kompletný repas predných a zadných bŕzd Brembo (kotúče, dosky, brzdová kvapalina)', supplier: 'Motor-Car Nitra s.r.o.', invoiceNumber: 'FA-2026-0744', sourceRef: 'manual' },
      { id: 'exp-15', vehicleId: 'veh-6', category: 'Pneumatiky', date: '2026-04-12', amount: 640.00, description: 'Sada zosilnených pneumatík Continental VanContact', supplier: 'Pneuvel Nitra', invoiceNumber: 'FA-2026-1002', sourceRef: 'manual' },
      { id: 'exp-16', vehicleId: 'veh-6', category: 'Poistenie', date: '2026-06-25', amount: 590.00, description: 'PZP + rozšírené poistenie prepravovaného nákladu', supplier: 'Allianz - Slovenská poisťovňa a.s.', invoiceNumber: 'FA-2026-1922', sourceRef: 'manual' },

      { id: 'exp-17', vehicleId: 'veh-7', category: 'Servis', date: '2026-05-15', amount: 280.00, description: 'Hybridný servisný test a garančná kontrola po 60 000 km', supplier: 'Toyota Trnava - AT a.s.', invoiceNumber: 'FA-2026-1411', sourceRef: 'manual' },
      { id: 'exp-18', vehicleId: 'veh-7', category: 'Diaľničné známky', date: '2026-01-05', amount: 60.00, description: 'Ročná elektronická diaľničná známka SR 2026', supplier: 'Národná diaľničná spoločnosť, a.s.', invoiceNumber: 'EZ-2026-44186', sourceRef: 'manual' },

      { id: 'exp-19', vehicleId: 'veh-8', category: 'Opravy', date: '2026-08-10', amount: 820.00, description: 'Odtiahnutie vozidla a predbežná oprava po poistnej udalosti', supplier: 'Asistencia Trenčín s.r.o.', invoiceNumber: 'FA-2026-2299', sourceRef: 'manual' },

      { id: 'exp-20', vehicleId: 'veh-9', category: 'Servis', date: '2026-07-22', amount: 490.00, description: 'Výmena oleja, revízia hydraulického čela a tlakových hadíc', supplier: 'Renault Trucks Košice', invoiceNumber: 'FA-2026-2481', sourceRef: 'manual' },
      { id: 'exp-21', vehicleId: 'veh-9', category: 'Pneumatiky', date: '2026-09-14', amount: 580.00, description: 'Zadné dvojmontáže Michelin Agilis CrossClimate', supplier: 'BestDrive Košice', invoiceNumber: 'FA-2026-2790', sourceRef: 'manual' },

      { id: 'exp-22', vehicleId: 'veh-10', category: 'Servis', date: '2026-04-18', amount: 240.00, description: 'Záručná prehliadka po 30 000 km, olejový servis Castrol EDGE', supplier: 'Hyundai Autopolis Bratislava', invoiceNumber: 'FA-2026-1109', sourceRef: 'manual' },
      { id: 'exp-23', vehicleId: 'veh-10', category: 'Diaľničné známky', date: '2026-01-05', amount: 60.00, description: 'Ročná elektronická diaľničná známka SR 2026', supplier: 'Národná diaľničná spoločnosť, a.s.', invoiceNumber: 'EZ-2026-44187', sourceRef: 'manual' },

      // Fleet-wide expenses (not tied to specific vehicle)
      { id: 'exp-24', vehicleId: null, category: 'Ostatné', date: '2026-02-01', amount: 350.00, description: 'Ročná licencia GPS monitorovacieho systému a telematiky', supplier: 'Commander Services s.r.o.', invoiceNumber: 'FA-2026-0120', sourceRef: 'manual' },
      { id: 'exp-25', vehicleId: null, category: 'Ostatné', date: '2026-05-01', amount: 180.00, description: 'Lekárničky a povinná výbava do všetkých vozidiel flotily', supplier: 'Auto-Tech s.r.o.', invoiceNumber: 'FA-2026-1219', sourceRef: 'manual' },
      { id: 'exp-26', vehicleId: null, category: 'Ostatné', date: '2026-09-01', amount: 220.00, description: 'Školenie bezpečnosti práce (BOZP) a hospodárnej jazdy pre vodičov', supplier: 'Akadémia Vzdelávania Košice', invoiceNumber: 'FA-2026-2580', sourceRef: 'manual' },
      { id: 'exp-27', vehicleId: 'veh-1', category: 'Parkovné', date: '2026-07-19', amount: 35.00, description: 'Parkovacia karta centrum Bratislava', supplier: 'BPS Park a.s.', invoiceNumber: 'PK-2026-0720', sourceRef: 'manual' },
      { id: 'exp-28', vehicleId: 'veh-3', category: 'Parkovné', date: '2026-08-04', amount: 25.00, description: 'Parkovisko Cargo Terminal Žilina', supplier: 'Žilinská parkovacia s.r.o.', invoiceNumber: 'PK-2026-0811', sourceRef: 'manual' },
      { id: 'exp-29', vehicleId: 'veh-6', category: 'Diaľničné známky', date: '2026-01-10', amount: 120.00, description: 'Rakúska ročná diaľničná známka ASFINAG', supplier: 'ASFINAG Maut Service GmbH', invoiceNumber: 'AT-2026-9912', sourceRef: 'manual' },
      { id: 'exp-30', vehicleId: 'veh-9', category: 'Diaľničné známky', date: '2026-01-10', amount: 110.00, description: 'Maďarská regionálna diaľničná známka', supplier: 'Nemzeti Útdíjfizetési Zrt.', invoiceNumber: 'HU-2026-8812', sourceRef: 'manual' },
      { id: 'exp-31', vehicleId: 'veh-7', category: 'Ostatné', date: '2026-06-20', amount: 45.00, description: 'Kompletné tepovanie a dezinfekcia interiéru ozónom', supplier: 'Autoumyváreň Trnava', invoiceNumber: 'UM-2026-0312', sourceRef: 'manual' },
      { id: 'exp-32', vehicleId: 'veh-2', category: 'Ostatné', date: '2026-08-15', amount: 75.00, description: 'Doplnenie a čistenie klimatizácie R1234yf', supplier: 'Todos Bratislava', invoiceNumber: 'FA-2026-2619', sourceRef: 'manual' }
    ];

    const insertExpense = db.prepare(`
      INSERT INTO expenses (id, vehicleId, category, date, amount, description, supplier, invoiceNumber, sourceRef, createdAt)
      VALUES (@id, @vehicleId, @category, @date, @amount, @description, @supplier, @invoiceNumber, @sourceRef, datetime(@date || ' 09:00:00'))
    `);

    for (const exp of expenses) {
      insertExpense.run(exp);
    }

    // 5. Insert 18+ Maintenance records
    const maintenanceRecords = [
      {
        id: 'maint-1',
        vehicleId: 'veh-1',
        serviceType: 'Výmena oleja',
        date: '2026-05-10',
        mileage: 150000,
        serviceCenter: 'Todos Košice s.r.o.',
        description: 'Výmena motorového oleja Shell Helix Ultra 5W-30 + olejový, vzduchový a peľový filter.',
        cost: 210.00,
        nextServiceDate: '2027-05-10',
        nextServiceMileage: 180000,
        status: 'completed',
        notes: 'Pravidelný interval 30 000 km dodržaný.'
      },
      {
        id: 'maint-2',
        vehicleId: 'veh-1',
        serviceType: 'Brzdový systém',
        date: '2026-08-14',
        mileage: 162000,
        serviceCenter: 'Todos Košice s.r.o.',
        description: 'Výmena zadných brzdových platničiek a kotúčov ATE, kontrola brzdovej kvapaliny.',
        cost: 280.00,
        nextServiceDate: null,
        nextServiceMileage: null,
        status: 'completed',
        notes: 'Brzdy v 100% stave.'
      },
      {
        id: 'maint-3',
        vehicleId: 'veh-2',
        serviceType: 'Pravidelný servis',
        date: '2026-03-12',
        mileage: 95000,
        serviceCenter: 'Danubiaservis Bratislava',
        description: 'Prehliadka po 90 000 km: výmena oleja v DSG prevodovke a motore, filtre.',
        cost: 490.00,
        nextServiceDate: '2027-03-12',
        nextServiceMileage: 125000,
        status: 'completed',
        notes: 'Bez závad, ďalšia kontrola o rok.'
      },
      {
        id: 'maint-4',
        vehicleId: 'veh-3',
        serviceType: 'Pravidelný servis',
        date: '2026-05-18',
        mileage: 125000,
        serviceCenter: 'Autocentrum Žilina',
        description: 'Kompletná výmena rozvodovej sady vrátane vodného čerpadla Contitech.',
        cost: 450.00,
        nextServiceDate: '2027-05-18',
        nextServiceMileage: 155000,
        status: 'completed',
        notes: 'Rozvody vymenené podľa predpisu výrobcu.'
      },
      {
        id: 'maint-5',
        vehicleId: 'veh-4',
        serviceType: 'Oprava motora',
        date: '2026-02-14',
        mileage: 198000,
        serviceCenter: 'Todos Prešov',
        description: 'Výmena dvojhmotového zotrvačníka a lamely spojky.',
        cost: 680.00,
        nextServiceDate: null,
        nextServiceMileage: null,
        status: 'completed',
        notes: 'Odstránené vibrácie pri voľnobehu.'
      },
      {
        id: 'maint-6',
        vehicleId: 'veh-4',
        serviceType: 'Výmena oleja',
        date: '2026-09-02',
        mileage: 210000,
        serviceCenter: 'Todos Prešov',
        description: 'Olejový servis Castrol Magnatec Diesel 5W-40, palivový filter Mann.',
        cost: 195.00,
        nextServiceDate: '2027-03-02',
        nextServiceMileage: 230000,
        status: 'completed',
        notes: 'Pre úžitkové vozidlo skrátený interval 20 000 km.'
      },
      {
        id: 'maint-7',
        vehicleId: 'veh-5',
        serviceType: 'Oprava motora',
        date: '2026-10-25',
        mileage: 189300,
        serviceCenter: 'Diesel Servis Banská Bystrica',
        description: 'Diagnostika tlakov Common-Rail, demontáž vstrekovačov, oprava čerpadla.',
        cost: 1240.00,
        nextServiceDate: null,
        nextServiceMileage: null,
        status: 'in_progress', // In progress!
        notes: 'Čaká sa na dodanie originálnych dielov Bosch z Nemecka.'
      },
      {
        id: 'maint-8',
        vehicleId: 'veh-5',
        serviceType: 'Výmena oleja',
        date: '2026-06-10',
        mileage: 175000,
        serviceCenter: 'Todos Banská Bystrica',
        description: 'Výmena oleja Motorcraft 5W-30 + filtre.',
        cost: 180.00,
        nextServiceDate: '2026-12-10',
        nextServiceMileage: 195000,
        status: 'completed',
        notes: 'Bežná údržba.'
      },
      {
        id: 'maint-9',
        vehicleId: 'veh-6',
        serviceType: 'Brzdový systém',
        date: '2026-03-08',
        mileage: 275000,
        serviceCenter: 'Motor-Car Nitra',
        description: 'Kompletná výmena brzdového obloženia, kotúčov a ručnej brzdy.',
        cost: 780.00,
        nextServiceDate: null,
        nextServiceMileage: null,
        status: 'completed',
        notes: 'Náročné podmienky s plným zaťažením.'
      },
      {
        id: 'maint-10',
        vehicleId: 'veh-6',
        serviceType: 'Výmena pneumatík',
        date: '2026-04-12',
        mileage: 280000,
        serviceCenter: 'Pneuvel Nitra',
        description: 'Prezutie na letnú sadu Continental VanContact, vyváženie kolies a geometria.',
        cost: 85.00,
        nextServiceDate: '2026-11-20',
        nextServiceMileage: 300000,
        status: 'completed',
        notes: 'Geometria v tolerancii.'
      },
      {
        id: 'maint-11',
        vehicleId: 'veh-7',
        serviceType: 'Pravidelný servis',
        date: '2026-05-15',
        mileage: 55000,
        serviceCenter: 'Toyota Trnava - AT a.s.',
        description: 'Kontrola hybridného pohonu (Hybrid Health Check), výmena motorového oleja 0W-20.',
        cost: 280.00,
        nextServiceDate: '2027-05-15',
        nextServiceMileage: 70000,
        status: 'completed',
        notes: 'Batéria v 100% kondícii so zárukou predĺženou o 1 rok.'
      },
      {
        id: 'maint-12',
        vehicleId: 'veh-9',
        serviceType: 'Pravidelný servis',
        date: '2026-07-22',
        mileage: 125000,
        serviceCenter: 'Renault Trucks Košice',
        description: 'Revízia hydrauliky Dhollandia, tlaková skúška, nový hydraulický olej.',
        cost: 350.00,
        nextServiceDate: '2027-07-22',
        nextServiceMileage: 155000,
        status: 'completed',
        notes: 'Plošina certifikovaná na 750 kg.'
      },
      {
        id: 'maint-13',
        vehicleId: 'veh-10',
        serviceType: 'Pravidelný servis',
        date: '2026-04-18',
        mileage: 35000,
        serviceCenter: 'Hyundai Autopolis Bratislava',
        description: 'Ročná prehliadka, olej Total Quartz 0W-30, dezinfekcia klímy.',
        cost: 240.00,
        nextServiceDate: '2027-04-18',
        nextServiceMileage: 50000,
        status: 'completed',
        notes: 'Vozidlo v plnej záruke výrobcu.'
      },
      {
        id: 'maint-14',
        vehicleId: 'veh-2',
        serviceType: 'Výmena filtrov',
        date: '2026-11-25',
        mileage: 115000,
        serviceCenter: 'Danubiaservis Bratislava',
        description: 'Plánovaná predzimná výmena kabínového a vzduchového filtra.',
        cost: 95.00,
        nextServiceDate: '2027-05-25',
        nextServiceMileage: 130000,
        status: 'scheduled', // Scheduled future service
        notes: 'Objednaný originálny antialergénny filter.'
      },
      {
        id: 'maint-15',
        vehicleId: 'veh-3',
        serviceType: 'Výmena batérie',
        date: '2026-11-20',
        mileage: 143000,
        serviceCenter: 'Autocentrum Žilina',
        description: 'Plánovaná výmena AGM autobatérie Varta Silver Dynamic 70Ah.',
        cost: 160.00,
        nextServiceDate: null,
        nextServiceMileage: null,
        status: 'scheduled',
        notes: 'Pôvodná batéria vykazuje slabú kapacitu pri štartovaní.'
      },
      {
        id: 'maint-16',
        vehicleId: 'veh-6',
        serviceType: 'Výmena pneumatík',
        date: '2026-11-18',
        mileage: 298500,
        serviceCenter: 'Pneuvel Nitra',
        description: 'Prezutie na zimné pneumatiky a kontrola bŕzd pred zimnou sezónou.',
        cost: 90.00,
        nextServiceDate: null,
        nextServiceMileage: null,
        status: 'scheduled',
        notes: 'Termín zarezervovaný na 8:00.'
      }
    ];

    const insertMaint = db.prepare(`
      INSERT INTO maintenance (id, vehicleId, serviceType, date, mileage, serviceCenter, description, cost, nextServiceDate, nextServiceMileage, status, notes, createdAt, updatedAt)
      VALUES (@id, @vehicleId, @serviceType, @date, @mileage, @serviceCenter, @description, @cost, @nextServiceDate, @nextServiceMileage, @status, @notes, datetime(@date || ' 08:30:00'), datetime('now'))
    `);

    for (const m of maintenanceRecords) {
      insertMaint.run(m);
    }

    // 6. Insert Inspections (STK, EK, PZP, Kasko)
    const inspections = [
      { id: 'insp-1', vehicleId: 'veh-1', type: 'STK', inspectionDate: '2024-04-10', expiryDate: '2026-11-28', station: 'STK Dekra Košice', protocolNumber: 'SK-2024-09182', result: 'passed', notes: 'Ľahké povrchové závady bez vplyvu na bezpečnosť.' },
      { id: 'insp-2', vehicleId: 'veh-1', type: 'EK', inspectionDate: '2024-04-10', expiryDate: '2026-11-28', station: 'STK Dekra Košice', protocolNumber: 'EK-2024-09182', result: 'passed', notes: 'Dymivosť a emisie v hlbokom limite.' },
      { id: 'insp-3', vehicleId: 'veh-1', type: 'PZP', inspectionDate: '2026-04-15', expiryDate: '2027-04-15', station: 'Allianz - Slovenská poisťovňa', protocolNumber: 'PZP-ALL-829104', result: 'passed', notes: 'Zmluva platná.' },

      { id: 'insp-4', vehicleId: 'veh-2', type: 'STK', inspectionDate: '2025-03-15', expiryDate: '2027-03-15', station: 'Slovdekra Bratislava', protocolNumber: 'SK-2025-11029', result: 'passed', notes: 'Bez závad.' },
      { id: 'insp-5', vehicleId: 'veh-2', type: 'EK', inspectionDate: '2025-03-15', expiryDate: '2027-03-15', station: 'Slovdekra Bratislava', protocolNumber: 'EK-2025-11029', result: 'passed', notes: 'Bez závad.' },

      { id: 'insp-6', vehicleId: 'veh-3', type: 'STK', inspectionDate: '2024-07-02', expiryDate: '2026-11-15', station: 'STK Žilina Bánová', protocolNumber: 'SK-2024-44102', result: 'passed', notes: 'Termín končí o pár dní!' },
      { id: 'insp-7', vehicleId: 'veh-3', type: 'EK', inspectionDate: '2024-07-02', expiryDate: '2026-11-15', station: 'STK Žilina Bánová', protocolNumber: 'EK-2024-44102', result: 'passed', notes: 'Termín končí o pár dní!' },

      { id: 'insp-8', vehicleId: 'veh-4', type: 'STK', inspectionDate: '2023-09-01', expiryDate: '2025-09-01', station: 'STK Prešov Širpo', protocolNumber: 'SK-2023-77182', result: 'passed', notes: 'Platné.' },
      { id: 'insp-9', vehicleId: 'veh-4', type: 'EK', inspectionDate: '2023-09-01', expiryDate: '2025-09-01', station: 'STK Prešov Širpo', protocolNumber: 'EK-2023-77182', result: 'passed', notes: 'Platné.' },
      { id: 'insp-10', vehicleId: 'veh-4', type: 'PZP', inspectionDate: '2025-11-10', expiryDate: '2026-11-10', station: 'Allianz - Slovenská poisťovňa', protocolNumber: 'PZP-ALL-992144', result: 'passed', notes: 'Platnosť vypršala pred 2 dňami!' },

      { id: 'insp-11', vehicleId: 'veh-5', type: 'STK', inspectionDate: '2024-02-10', expiryDate: '2026-12-15', station: 'STK Banská Bystrica', protocolNumber: 'SK-2024-55102', result: 'passed', notes: 'Pravidelná kontrola.' },
      { id: 'insp-12', vehicleId: 'veh-6', type: 'STK', inspectionDate: '2024-06-18', expiryDate: '2026-12-20', station: 'STK Nitra Chrenová', protocolNumber: 'SK-2024-66291', result: 'passed', notes: 'Pravidelná kontrola.' },

      { id: 'insp-13', vehicleId: 'veh-7', type: 'STK', inspectionDate: '2022-05-10', expiryDate: '2026-12-05', station: 'STK Trnava', protocolNumber: 'SK-2022-12093', result: 'passed', notes: 'Prvá 4-ročná lehota nového vozidla.' },
      { id: 'insp-14', vehicleId: 'veh-7', type: 'EK', inspectionDate: '2022-05-10', expiryDate: '2026-12-05', station: 'STK Trnava', protocolNumber: 'EK-2022-12093', result: 'passed', notes: 'Prvá 4-ročná lehota nového vozidla.' },

      { id: 'insp-15', vehicleId: 'veh-8', type: 'PZP', inspectionDate: '2025-11-05', expiryDate: '2026-11-05', station: 'Generali poisťovňa', protocolNumber: 'PZP-GEN-220192', result: 'passed', notes: 'Poistka neobnovená z dôvodu vyradenia z prevádzky.' },

      { id: 'insp-16', vehicleId: 'veh-9', type: 'STK', inspectionDate: '2025-08-20', expiryDate: '2027-08-20', station: 'STK Košice Barca', protocolNumber: 'SK-2025-88291', result: 'passed', notes: 'Platná na 2 roky.' },
      { id: 'insp-17', vehicleId: 'veh-10', type: 'STK', inspectionDate: '2022-10-14', expiryDate: '2026-12-10', station: 'STK Bratislava Petržalka', protocolNumber: 'SK-2022-99014', result: 'passed', notes: 'Blíži sa termín prvej TK.' }
    ];

    const insertInsp = db.prepare(`
      INSERT INTO inspections (id, vehicleId, type, inspectionDate, expiryDate, station, protocolNumber, result, notes, createdAt)
      VALUES (@id, @vehicleId, @type, @inspectionDate, @expiryDate, @station, @protocolNumber, @result, @notes, datetime('now'))
    `);

    for (const insp of inspections) {
      insertInsp.run(insp);
    }

    // 7. Insert Notifications (realistic system alerts)
    const notifications = [
      {
        id: 'notif-1',
        type: 'insurance_expiry',
        vehicleId: 'veh-4',
        title: 'Poistenie vypršalo: PO-302CY',
        message: 'Zmluva PZP pre Volkswagen Transporter T6 (PO-302CY) expirovala dňa 10.11.2026. Je nutné bezodkladne uzavrieť nové poistenie!',
        severity: 'critical',
        dueDate: '2026-11-10',
        isRead: 0,
        createdAt: '2026-11-10 08:00:00'
      },
      {
        id: 'notif-2',
        type: 'stk_expiry',
        vehicleId: 'veh-3',
        title: 'Kritický termín STK/EK: ZA-551AA',
        message: 'Platnosť technickej a emisnej kontroly pre Volkswagen Passat (ZA-551AA) končí o 3 dni (15.11.2026). Vozidlo je objednané na stanicu TK.',
        severity: 'critical',
        dueDate: '2026-11-15',
        isRead: 0,
        createdAt: '2026-11-08 09:30:00'
      },
      {
        id: 'notif-3',
        type: 'stk_expiry',
        vehicleId: 'veh-1',
        title: 'Blíži sa termín STK: KE-412BH',
        message: 'Technická kontrola pre Škoda Octavia (KE-412BH) končí dňa 28.11.2026 (zostáva 16 dní). Zabezpečte kontrolu v servise pred STK.',
        severity: 'warning',
        dueDate: '2026-11-28',
        isRead: 0,
        createdAt: '2026-11-01 10:00:00'
      },
      {
        id: 'notif-4',
        type: 'maintenance_due',
        vehicleId: 'veh-5',
        title: 'Vozidlo v servise: BB-719DK',
        message: 'Ford Transit Custom (BB-719DK) je v servise Diesel Servis BB na oprave vstrekovacieho systému. Predpokladaný návrat do prevádzky o 4 dni.',
        severity: 'warning',
        dueDate: '2026-11-16',
        isRead: 0,
        createdAt: '2026-10-25 14:00:00'
      },
      {
        id: 'notif-5',
        type: 'maintenance_due',
        vehicleId: 'veh-6',
        title: 'Plánovaný servis bŕzd a prezutie: NR-628EP',
        message: 'Pre Mercedes-Benz Sprinter (NR-628EP) je naplánované prezutie a servis na 18.11.2026 v Pneuvel Nitra.',
        severity: 'info',
        dueDate: '2026-11-18',
        isRead: 0,
        createdAt: '2026-11-05 11:20:00'
      },
      {
        id: 'notif-6',
        type: 'stk_expiry',
        vehicleId: 'veh-7',
        title: 'Prvá STK nového vozidla: TT-904FX',
        message: 'Toyota Corolla Touring Sports dosahuje vek 4 rokov. Prvá zákonná STK a EK je povinná do 05.12.2026.',
        severity: 'warning',
        dueDate: '2026-12-05',
        isRead: 1,
        createdAt: '2026-11-02 12:00:00'
      },
      {
        id: 'notif-7',
        type: 'stk_expiry',
        vehicleId: 'veh-10',
        title: 'Upozornenie STK: BA-331LL',
        message: 'Hyundai i30 (BA-331LL) má naplánovanú technickú a emisnú kontrolu do 10.12.2026.',
        severity: 'info',
        dueDate: '2026-12-10',
        isRead: 1,
        createdAt: '2026-10-28 15:45:00'
      },
      {
        id: 'notif-8',
        type: 'system',
        vehicleId: null,
        title: 'Sezónna príprava vozového parku',
        message: 'Prebieha plánovaná výmena pneumatík na zimné pre celú flotilu a kontrola nemrznúcich zmesí v ostrekovačoch a chladičoch.',
        severity: 'info',
        dueDate: '2026-11-20',
        isRead: 1,
        createdAt: '2026-11-01 07:00:00'
      },
      {
        id: 'notif-9',
        type: 'high_consumption',
        vehicleId: 'veh-6',
        title: 'Mierne zvýšená spotreba: NR-628EP',
        message: 'Priemerná spotreba vozidla Mercedes-Benz Sprinter v októbri vzrástla na 9.8 l/100 km v dôsledku plného vyťaženia nákladom.',
        severity: 'info',
        dueDate: null,
        isRead: 0,
        createdAt: '2026-11-03 16:10:00'
      },
      {
        id: 'notif-10',
        type: 'insurance_expiry',
        vehicleId: 'veh-8',
        title: 'Neplatná poistná zmluva: TN-183GA',
        message: 'Dacia Dokker je dočasne mimo prevádzky, poistenie PZP bolo pozastavené po poistnej udalosti.',
        severity: 'warning',
        dueDate: '2026-11-05',
        isRead: 1,
        createdAt: '2026-11-05 08:30:00'
      }
    ];

    const insertNotif = db.prepare(`
      INSERT INTO notifications (id, type, vehicleId, title, message, severity, dueDate, isRead, createdAt)
      VALUES (@id, @type, @vehicleId, @title, @message, @severity, @dueDate, @isRead, @createdAt)
    `);

    for (const notif of notifications) {
      insertNotif.run(notif);
    }
  });

  runTx();

  return { message: 'Demo data loaded successfully', vehiclesCount: 10, driversCount: 6 };
}
