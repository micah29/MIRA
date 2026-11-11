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

  // Real ATW Solar accounts. Temporary password below — change it on first login.
  const pw = await bcrypt.hash('mira1234', 10);
  const users = [
    { email: 'ahmad.setiawan@ATWSolar.com', fullName: 'Ahmad Muzakki Setiawan', role: 'STOREKEEPER' },
    { email: 'muhamad.bahthiyar@ATWSolar.com', fullName: 'Muhamad Aries B.', role: 'MANAGEMENT' },
    { email: 'moch.abdilla@ATWSolar.com', fullName: 'Moch. Rafi Damas Abdilla', role: 'ENGINEER' },
    { email: 'engineering@ATWSolar.com', fullName: 'Engineering ATW', role: 'ADMIN' },
  ];
  for (const u of users) await prisma.user.upsert({ where: { email: u.email.toLowerCase() }, update: { fullName: u.fullName, role: u.role as any }, create: { ...u, email: u.email.toLowerCase(), role: u.role as any, passwordHash: pw } });
  // The storekeeper is also a Person, so assets can show them as current holder when in the store.
  await prisma.person.upsert({ where: { name: 'Ahmad Muzakki Setiawan' }, update: { email: 'ahmad.setiawan@ATWSolar.com', section: 'Storekeeper' }, create: { name: 'Ahmad Muzakki Setiawan', email: 'ahmad.setiawan@ATWSolar.com', section: 'Storekeeper' } });

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
