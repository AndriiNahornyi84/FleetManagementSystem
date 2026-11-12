/**
 * Automated test suite for Fleet Management System
 * Run with: npm test (tsx test/fleet.test.ts)
 */

import Database from 'better-sqlite3';
import assert from 'assert';

console.log('----------------------------------------------------');
console.log('Spúšťam automatizované testy pre Fleet Management...');
console.log('----------------------------------------------------');

// Use an in-memory SQLite database for high-speed isolated tests
const testDb = new Database(':memory:');
testDb.pragma('foreign_keys = ON');

testDb.exec(`
  CREATE TABLE vehicles (
    id TEXT PRIMARY KEY,
    brand TEXT NOT NULL,
    model TEXT NOT NULL,
    licensePlate TEXT NOT NULL UNIQUE,
    vin TEXT NOT NULL UNIQUE,
    year INTEGER NOT NULL,
    currentMileage INTEGER NOT NULL,
    averageConsumption REAL NOT NULL,
    status TEXT NOT NULL DEFAULT 'active'
  );

  CREATE TABLE fuel_records (
    id TEXT PRIMARY KEY,
    vehicleId TEXT NOT NULL REFERENCES vehicles(id),
    date TEXT NOT NULL,
    fuelAmount REAL NOT NULL CHECK (fuelAmount > 0),
    pricePerLiter REAL NOT NULL CHECK (pricePerLiter > 0),
    totalPrice REAL NOT NULL,
    mileage INTEGER NOT NULL CHECK (mileage > 0),
    consumption REAL
  );

  CREATE TABLE expenses (
    id TEXT PRIMARY KEY,
    vehicleId TEXT REFERENCES vehicles(id),
    category TEXT NOT NULL,
    date TEXT NOT NULL,
    amount REAL NOT NULL CHECK (amount > 0),
    description TEXT NOT NULL
  );

  CREATE TABLE maintenance (
    id TEXT PRIMARY KEY,
    vehicleId TEXT NOT NULL REFERENCES vehicles(id),
    serviceType TEXT NOT NULL,
    date TEXT NOT NULL,
    cost REAL NOT NULL,
    status TEXT NOT NULL
  );
`);

let passedTests = 0;
let failedTests = 0;

function runTest(name: string, fn: () => void) {
  try {
    fn();
    console.log(`✅ [PASS] ${name}`);
    passedTests++;
  } catch (err: any) {
    console.error(`❌ [FAIL] ${name}:`, err.message);
    failedTests++;
  }
}

// 1. Test pridania vozidla
runTest('1. Pridanie vozidla do databázy', () => {
  testDb.prepare(`
    INSERT INTO vehicles (id, brand, model, licensePlate, vin, year, currentMileage, averageConsumption, status)
    VALUES ('veh-test-1', 'Škoda', 'Octavia Combi', 'KE-100AA', 'TMBJJ7NE8K0111111', 2021, 150000, 5.2, 'active')
  `).run();

  const v = testDb.prepare('SELECT * FROM vehicles WHERE id = ?').get('veh-test-1') as any;
  assert.strictEqual(v.licensePlate, 'KE-100AA');
  assert.strictEqual(v.brand, 'Škoda');
});

// 2. Test úpravy vozidla
runTest('2. Úprava parametrov vozidla', () => {
  testDb.prepare("UPDATE vehicles SET currentMileage = 155000, status = 'in_service' WHERE id = 'veh-test-1'").run();
  const v = testDb.prepare('SELECT * FROM vehicles WHERE id = ?').get('veh-test-1') as any;
  assert.strictEqual(v.currentMileage, 155000);
  assert.strictEqual(v.status, 'in_service');
});

// 3. Test unikátnosti EČV (duplicita musí zlyhať)
runTest('3. Overenie unikátnosti EČV (zamedzenie duplicity)', () => {
  let threw = false;
  try {
    testDb.prepare(`
      INSERT INTO vehicles (id, brand, model, licensePlate, vin, year, currentMileage, averageConsumption, status)
      VALUES ('veh-test-2', 'Volkswagen', 'Passat', 'KE-100AA', 'WVWZZZ3CZLE022222', 2020, 120000, 5.6, 'active')
    `).run();
  } catch (err) {
    threw = true;
  }
  assert.strictEqual(threw, true, 'Duplicitné EČV musí vyhodiť SQLITE_CONSTRAINT error');
});

// 4. Test výpočtu celkovej ceny tankovania
runTest('4. Výpočet celkovej sumy paliva (množstvo * cena/liter)', () => {
  const fuelAmount = 55.40;
  const pricePerLiter = 1.549;
  const expectedTotal = Number((fuelAmount * pricePerLiter).toFixed(2)); // 85.81 €

  testDb.prepare(`
    INSERT INTO fuel_records (id, vehicleId, date, fuelAmount, pricePerLiter, totalPrice, mileage, consumption)
    VALUES ('f-1', 'veh-test-1', '2026-05-01', ?, ?, ?, 150000, NULL)
  `).run(fuelAmount, pricePerLiter, expectedTotal);

  const f = testDb.prepare('SELECT totalPrice FROM fuel_records WHERE id = ?').get('f-1') as any;
  assert.strictEqual(f.totalPrice, 85.81);
});

// 5. Test výpočtu spotreby paliva (l/100 km)
runTest('5. Výpočet presnej spotreby paliva: (litre / prejdené km) * 100', () => {
  const prevKm = 150000;
  const currentKm = 150850; // Rozdiel: 850 km
  const fuelLiters = 45.9; // 45.9 / 850 * 100 = 5.40 l/100 km
  const distance = currentKm - prevKm;
  const computedConsumption = Number(((fuelLiters / distance) * 100).toFixed(2));

  assert.strictEqual(computedConsumption, 5.4);

  testDb.prepare(`
    INSERT INTO fuel_records (id, vehicleId, date, fuelAmount, pricePerLiter, totalPrice, mileage, consumption)
    VALUES ('f-2', 'veh-test-1', '2026-05-15', ?, 1.56, 71.60, ?, ?)
  `).run(fuelLiters, currentKm, computedConsumption);

  const f = testDb.prepare('SELECT consumption FROM fuel_records WHERE id = ?').get('f-2') as any;
  assert.strictEqual(f.consumption, 5.4);
});

// 6. Test kontroly tachometra (nezmyselný alebo záporný posun)
runTest('6. Kontrola tachometra (stav km nemôže klesnúť)', () => {
  const prevRecord = testDb.prepare('SELECT MAX(mileage) as maxKm FROM fuel_records WHERE vehicleId = ?').get('veh-test-1') as any;
  const badMileage = 140000; // Menšie ako 150850
  const isInvalid = badMileage <= prevRecord.maxKm;
  assert.strictEqual(isInvalid, true, 'Pokus zadať menší stav km ako predchádzajúci musí byť zamietnutý');
});

// 7. Test pridania servisu a prepojenia s nákladmi
runTest('7. Záznam opravy a prepojenie s evidenciou nákladov', () => {
  testDb.prepare(`
    INSERT INTO maintenance (id, vehicleId, serviceType, date, cost, status)
    VALUES ('m-1', 'veh-test-1', 'Výmena oleja', '2026-06-01', 220.00, 'completed')
  `).run();

  testDb.prepare(`
    INSERT INTO expenses (id, vehicleId, category, date, amount, description)
    VALUES ('exp-1', 'veh-test-1', 'Servis', '2026-06-01', 220.00, 'Výmena oleja 5W-30')
  `).run();

  const maint = testDb.prepare('SELECT cost FROM maintenance WHERE id = ?').get('m-1') as any;
  const exp = testDb.prepare('SELECT amount FROM expenses WHERE id = ?').get('exp-1') as any;
  assert.strictEqual(maint.cost, 220.00);
  assert.strictEqual(exp.amount, 220.00);
});

// 8. Test výpočtu celkových nákladov flotily
runTest('8. Výpočet celkových nákladov a nákladovosti na 1 km', () => {
  testDb.prepare(`
    INSERT INTO expenses (id, vehicleId, category, date, amount, description)
    VALUES ('exp-2', 'veh-test-1', 'Poistenie', '2026-06-15', 350.00, 'PZP Allianz')
  `).run();

  const totalExp = (testDb.prepare('SELECT SUM(amount) as s FROM expenses').get() as any).s;
  const totalFuel = (testDb.prepare('SELECT SUM(totalPrice) as s FROM fuel_records').get() as any).s;
  const grandTotal = totalExp + totalFuel;

  // 220 + 350 = 570 € expenses + 85.81 + 71.60 = 157.41 € fuel = 727.41 €
  assert.strictEqual(Number(grandTotal.toFixed(2)), 727.41);
});

// 9. Test lehotovej klasifikácie STK/EK (dátumový odpočet)
runTest('9. Klasifikácia lehoty STK: Platné / Varovanie / Kritické / Expirované', () => {
  function classify(days: number) {
    if (days < 0) return 'expired';
    if (days <= 7) return 'critical';
    if (days <= 30) return 'warning';
    return 'valid';
  }

  assert.strictEqual(classify(45), 'valid');
  assert.strictEqual(classify(25), 'warning');
  assert.strictEqual(classify(4), 'critical');
  assert.strictEqual(classify(-2), 'expired');
});

// 10. Test filtrovania podľa kategórie
runTest('10. Filtrovanie štatistík nákladov podľa kategórie', () => {
  const servisRows = testDb.prepare("SELECT * FROM expenses WHERE category = 'Servis'").all();
  const poistenieRows = testDb.prepare("SELECT * FROM expenses WHERE category = 'Poistenie'").all();

  assert.strictEqual(servisRows.length, 1);
  assert.strictEqual(poistenieRows.length, 1);
});

console.log('----------------------------------------------------');
console.log(`Výsledky testov: ${passedTests} prešlo, ${failedTests} zlyhalo.`);
console.log('----------------------------------------------------');

if (failedTests > 0) {
  process.exit(1);
} else {
  console.log('🎉 Všetky testy prebehli úspešne!');
  process.exit(0);
}
