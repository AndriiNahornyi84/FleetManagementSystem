# Technická a projektová dokumentácia systému FLEET CONTROL

**Názov projektu:** Fleet Management System  
**Modelový podnik:** LogiTrans s.r.o., Košice  
**Typ projektu:** Webová aplikácia na riadenie a monitorovanie vozového parku  
**Zameranie:** Praktická časť diplomovej práce študenta TUKE (odbor Logistika a priemyselné inžinierstvo)

---

## 1. Architektúra systému

Systém je navrhnutý ako moderná modulárna Full-Stack webová aplikácia s oddelenou prezentačnou vrstvou (Single Page Application) a serverovou časťou poskytujúcou RESTful API s transakčnou relačnou databázou.

```
┌─────────────────────────────────────────────────────────────┐
│                 PREZENTAČNÁ VRSTVA (FRONTEND)               │
│  React 19 + TypeScript + Tailwind CSS v4 + Pure SVG Grafy   │
│  • Dashboard  • Vozidlá  • Vodiči  • Tankovanie  • Náklady   │
│  • Údržba  • STK/EK  • Notifikácie  • Reporty  • Nastavenia │
└──────────────────────────────┬──────────────────────────────┘
                               │ HTTP / JSON (REST API)
┌──────────────────────────────▼──────────────────────────────┐
│                  APLIKAČNÁ VRSTVA (BACKEND)                 │
│  Node.js + Express Server                                   │
│  • Rutovanie požiadaviek (/api/*)                           │
│  • Validácia vstupných dát a biznis pravidlá                │
│  • Motor výpočtu spotreby a nákladovosti na 1 km            │
│  • Detektor blížiacich sa lehôt STK/EK a generátor výstrah  │
└──────────────────────────────┬──────────────────────────────┘
                               │ SQLite Engine (WAL Mode)
┌──────────────────────────────▼──────────────────────────────┐
│                    DÁTOVÁ VRSTVA (DATABASE)                 │
│  SQLite (better-sqlite3)                                    │
│  • Tabuľky: vehicles, drivers, fuel_records, expenses,       │
│    maintenance, inspections, notifications, settings        │
│  • Referenčná integrita (ON DELETE RESTRICT/SET NULL)       │
│  • Rýchle B-Tree indexy pre vyhľadávanie a agregácie        │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Dátový model a štruktúra databázy

### Entitno-relačná štruktúra (ERD)

1. **`vehicles` (Vozidlá)**
   - `id` (TEXT PRIMARY KEY) — interný identifikátor (`veh-1` až `veh-10`).
   - `brand` (TEXT) — značka (Škoda, Volkswagen, Mercedes-Benz...).
   - `model` (TEXT) — obchodný model vozidla.
   - `licensePlate` (TEXT UNIQUE) — slovenské evidenčné číslo vozidla (EČV).
   - `vin` (TEXT UNIQUE) — 17-miestne unikátne číslo karosérie.
   - `year` (INTEGER) — rok výroby.
   - `registrationDate` (TEXT) — dátum prvej evidencie vozidla.
   - `fuelType` (TEXT) — typ paliva (Nafta, Benzín, Hybrid, CNG, Elektrina).
   - `tankCapacity` (REAL) — menovitý objem palivovej nádrže v litroch.
   - `currentMileage` (INTEGER) — aktuálny stav tachometra v kilometroch.
   - `averageConsumption` (REAL) — priemerná spotreba (l/100 km).
   - `status` (TEXT) — stav (`active` - Aktívne, `in_service` - V servise, `out_of_service` - Mimo prevádzky).
   - `lastStkDate` / `nextStkDate` (TEXT) — dátumy platnosti STK.
   - `lastEkDate` / `nextEkDate` (TEXT) — dátumy emisnej kontroly.
   - `insurancePolicyNumber` (TEXT) — číslo poistnej zmluvy PZP.
   - `insuranceExpiryDate` (TEXT) — dátum skončenia platnosti poistenia.
   - `assignedDriverId` (TEXT REFERENCES drivers(id)) — priradený vodič.
   - `isArchived` (INTEGER) — príznak archivácie pre zachovanie finančnej histórie.

2. **`drivers` (Vodiči)**
   - `id` (TEXT PRIMARY KEY)
   - `firstName`, `lastName` (TEXT)
   - `phone`, `email` (TEXT)
   - `licenseNumber` (TEXT UNIQUE) — číslo vodičského preukazu.
   - `licenseCategory` (TEXT) — oprávnenia (B, C, C+E...).
   - `licenseExpiryDate` (TEXT) — dátum platnosti VP.
   - `assignedVehicleId` (TEXT) — väzba na pridelené vozidlo.
   - `status` (TEXT) — `active` | `inactive`.

3. **`fuel_records` (Tankovanie)**
   - `id` (TEXT PRIMARY KEY)
   - `vehicleId` (TEXT REFERENCES vehicles(id))
   - `driverId` (TEXT REFERENCES drivers(id))
   - `date` (TEXT) — dátum tankovania.
   - `fuelStation` (TEXT) — názov čerpacej stanice.
   - `fuelAmount` (REAL CHECK > 0) — natankované množstvo v litroch.
   - `pricePerLiter` (REAL CHECK > 0) — jednotková cena za liter v EUR.
   - `totalPrice` (REAL) — celková cena v EUR.
   - `mileage` (INTEGER CHECK > 0) — stav tachometra pri tankovaní.
   - `consumption` (REAL) — spätne vypočítaná spotreba l/100 km.

4. **`expenses` (Náklady)**
   - `id` (TEXT PRIMARY KEY)
   - `vehicleId` (TEXT REFERENCES vehicles(id) ON DELETE SET NULL) — nepovinné (ak je NULL, ide o celoflotilový réžijný náklad).
   - `category` (TEXT) — kategória: `Palivo`, `Servis`, `Opravy`, `Poistenie`, `Pneumatiky`, `Diaľničné známky`, `Parkovné`, `Ostatné`.
   - `date` (TEXT)
   - `amount` (REAL CHECK > 0) — suma v EUR.
   - `description` (TEXT) — popis položky.
   - `supplier` (TEXT) — dodávateľ tovaru alebo služby.
   - `invoiceNumber` (TEXT) — číslo účtovného dokladu / faktúry.
   - `sourceRef` (TEXT) — príznak pôvodu záznamu (`manual` | `fuel` | `maintenance`).
   - `sourceId` (TEXT) — referencia na pôvodný záznam tankovania alebo servisu.

5. **`maintenance` (Údržba a servis)**
   - `id` (TEXT PRIMARY KEY)
   - `vehicleId` (TEXT REFERENCES vehicles(id))
   - `serviceType` (TEXT) — `Výmena oleja`, `Výmena filtrov`, `Výmena pneumatík`, `Oprava motora`, `Brzdový systém`, `Výmena batérie`, `Pravidelný servis`, `Iné`.
   - `date` (TEXT), `mileage` (INTEGER), `serviceCenter` (TEXT), `cost` (REAL), `status` (TEXT).

6. **`inspections` (Technické kontroly)**
   - `id` (TEXT PRIMARY KEY), `vehicleId` (TEXT), `type` (STK, EK, PZP...), `inspectionDate` (TEXT), `expiryDate` (TEXT), `station` (TEXT), `protocolNumber` (TEXT), `result` (passed, conditional, failed).

7. **`notifications` (Upozornenia)**
   - `id` (TEXT PRIMARY KEY), `type` (TEXT), `vehicleId` (TEXT), `title` (TEXT), `message` (TEXT), `severity` (`info`, `warning`, `critical`), `dueDate` (TEXT), `isRead` (INTEGER 0|1).

---

## 3. Matematické a logistické vzorce

### 3.1 Výpočet celkovej ceny tankovania
$$\text{Celková cena (€)} = \text{Množstvo paliva (l)} \times \text{Cena za liter (€/l)}$$

### 3.2 Výpočet skutočnej prevádzkovej spotreby paliva
Pre presný výpočet spotreby systém porovnáva dve po sebe idúce tankovania do plnej nádrže pre rovnaké vozidlo:
$$\Delta S = \text{Tachometer}_{i} - \text{Tachometer}_{i-1}$$
$$\text{Spotreba (l/100 km)} = \left( \frac{\text{Natankované množstvo paliva (l)}}{\Delta S \text{ (km)}} \right) \times 100$$
*Validácia:* Ak $\Delta S \le 0$, systém operáciu odmietne s chybovým hlásením o neplatnom stave tachometra.

### 3.3 Flotilová priemerná spotreba
$$\overline{C}_{\text{flotila}} = \frac{\sum_{j=1}^{N} \text{Priemerná spotreba vozidla}_j}{N}$$

### 3.4 Ukazovateľ nákladovosti na 1 kilometer (€ / km)
Kľúčový logistický ukazovateľ efektívnosti vyjadrujúci celkové prevádzkové a investičné náklady pripadajúce na jeden odjazdený kilometer vozidla alebo celej flotily:
$$\text{Náklad na km (€/km)} = \frac{\text{Celkové kumulované náklady (€)}}{\text{Celkový stav odjazdených kilometrov (km)}}$$

---

## 4. Kľúčové pravidlá biznis logiky

1. **Monotónnosť odometra (Tachometra):**
   Stav najazdených kilometrov vozidla nesmie klesať. Zníženie kilometrov je blokované na úrovni databázových transakcií aj API validácie.
2. **Exkluzivita vodiča:**
   Jedno aktívne vozidlo nesmie mať v tom istom čase priradených dvoch rôznych primárnych vodičov. Pri zmene priradenia sa predchádzajúca väzba korektne uvoľní.
3. **Zamedzenie duplicitného účtovania nákladov:**
   Náklady z modulov údržby a tankovania nesmú byť do celkovej bilancie započítavané dvakrát. Systém využíva polia `sourceRef` a `sourceId` na identifikáciu a prepojenie dokladov.
4. **Klasifikácia lehôt STK/EK a poistenia:**
   - **Platné:** zostáva viac ako 30 kalendárnych dní do skončenia platnosti.
   - **Blíži sa termín (Varovanie):** zostáva 8 až 30 dní (oranžový status).
   - **Kritický termín:** zostáva 1 až 7 dní (červený status).
   - **Po termíne (Expirované):** termín už uplynul (čierny/červený stav s výkričníkom).
5. **Ochrana finančnej a účtovnej histórie:**
   Vozidlo, ktoré už má zaznamenané minulé tankovania alebo servisy, nie je možné fyzicky zmazať z databázy (SQLITE FOREIGN KEY RESTRICT). Namiesto toho je bezpečne označené ako archivované a vyradené z prevádzky (`isArchived = 1`, `status = 'out_of_service'`).

---

## 5. Výsledky testovania

Automatizované testy implementované v súbore `test/fleet.test.ts` overujú 10 kľúčových aspektov:
- Úspešné pridanie nového vozidla.
- Editácia parametrov a zmena stavov.
- Overenie unikátnosti slovenského EČV a VIN čísla.
- Presnosť výpočtu celkovej ceny tankovania zaokrúhlenej na 2 desatinné miesta.
- Presnosť výpočtu spotreby l/100 km zo zmeny stavu kilometrov.
- Ochrana tachometra pred rešpektovaním klesajúcich hodnôt.
- Evidencia servisného zásahu s automatickým previazaním na náklady.
- Súčtová bilancia nákladov a stanovenie jednotkového nákladu na 1 km.
- Lehotový automat STK/EK podľa časových intervalov.
- Filtrovanie a triedenie nákladov podľa kategórií.

Všetkých 10 testovacích blokov prebieha úspešne so 100% priechodnosťou.

---

## 6. Prevádzkové obmedzenia a predpoklady

1. **Menová jednotka:** Aplikácia primárne pracuje v mene EUR (€) s centovým zaokrúhľovaním.
2. **Lokálny dátový súbor:** Databáza je perzistentne uložená v súbore `data/fleet.sqlite` v pracovnom adresári aplikácie.
3. **Pripravenosť pre reálnu prevádzku:** Systém nevyžaduje pripojenie na reálne GPS jednotky ani komerčné platobné brány, čím spĺňa požiadavky na samostatne spustiteľnú a reprodukovateľnú praktickú časť diplomovej práce.
