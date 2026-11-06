import { PrismaClient, AssetStatus, Condition } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as assets from './seed/assets.json';
import * as people from './seed/people.json';

const prisma = new PrismaClient();
/** Text columns: Excel sometimes stores model/serial numbers as numbers, so always convert to text. */
const t = (v: any) => (v === null || v === undefined || v === '' ? null : String(v));
const d = (s?: string | null) => (s ? new Date(s + 'T17:00:00+07:00') : null);
const addMonths = (date: Date, m: number) => {
  const x = new Date(date); const day = x.getDate(); x.setDate(1); x.setMonth(x.getMonth() + m);
  const last = new Date(x.getFullYear(), x.getMonth() + 1, 0).getDate(); x.setDate(Math.min(day, last)); return x;
};

async function main() {
  const sections = ['Project Engineer', 'Design Engineer', 'Drafter'];
  for (const name of sections) await prisma.section.upsert({ where: { name }, update: {}, create: { name } });
  const sites = ['PT. ATW Investasi Selaras', 'PT. Investasi Hijau Selaras', 'PT. Hexa Multi Energy', 'Office', 'R&D Lab', 'Warehouse', 'Project Site', 'Vendor'];
  for (const name of sites) await prisma.site.upsert({ where: { name }, update: {}, create: { name } });
  for (const p of (people as any).default ?? people) {
    await prisma.person.upsert({ where: { name: p.name }, update: {}, create: { name: p.name, email: p.email || null, section: p.section || null } });
  }

  const pw = await bcrypt.hash('mira1234', 10);
  const users = [
    { email: 'admin@mira.local', fullName: 'Admin MIRA', role: 'ADMIN' },
    { email: 'muzakki@mira.local', fullName: 'Muzakki', role: 'STOREKEEPER' },
    { email: 'engineer@mira.local', fullName: 'Rizky Budiman', role: 'ENGINEER' },
    { email: 'manager@mira.local', fullName: 'Manager', role: 'MANAGEMENT' },
  ];
  for (const u of users) await prisma.user.upsert({ where: { email: u.email }, update: {}, create: { ...u, role: u.role as any, passwordHash: pw } });

  const list: any[] = (assets as any).default ?? assets;
  for (const a of list) {
    const calDue = d(a.calDue);
    const data = {
      id: String(a.id), sku: t(a.sku), name: String(a.name), category: String(a.category), brand: t(a.brand), model: t(a.model), serialNumber: t(a.serialNumber),
      qty: Number(a.qty) || 1, storageLocation: t(a.storageLocation), pic: t(a.pic), section: t(a.section), project: t(a.project),
      status: a.status as AssetStatus, condition: a.condition as Condition,
      purchaseDate: d(a.purchaseDate), purchaseValue: a.purchaseValue ?? null, warrantyEnd: d(a.warrantyEnd),
      calRequired: !!a.calRequired || !!calDue, calDue, calIntervalMonths: 12,
      currentLocation: t(a.currentLocation), inspectionSite: t(a.inspectionSite), notes: t(a.notes),
    };
    await prisma.asset.upsert({ where: { id: a.id }, update: {}, create: data });
    if (calDue) {
      const exists = await prisma.calibration.count({ where: { assetId: a.id } });
      if (!exists) await prisma.calibration.create({ data: { assetId: a.id, calibratedAt: addMonths(calDue, -12), intervalMonths: 12, result: 'ACCEPT', nextDue: calDue, vendor: 'From master list', recordedBy: 'Import' } });
    }
  }
  await prisma.transaction.create({ data: { assetId: list[0].id, action: 'REGISTERED', note: `Imported ${list.length} assets from master list`, recordedBy: 'Import' } });
  console.log(`Seeded ${list.length} assets, ${((people as any).default ?? people).length} people, ${users.length} users`);
}
main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
