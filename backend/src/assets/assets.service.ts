import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { AssetStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { CheckinDto, CheckoutDto, CreateAssetDto, ReserveDto, UpdateAssetDto } from './assets.dto';

const OUT: AssetStatus[] = ['IN_USE', 'ON_LOAN', 'PROJECT'];
const PREFIX: Record<string, string> = { Measuring: 'TLS', Testing: 'TLS', Electrical: 'TLS', Mechanical: 'TLS', RnD: 'RND', 'IT/Communication': 'IT', Safety: 'SRV', Other: 'SRV' };

@Injectable()
export class AssetsService {
  constructor(private prisma: PrismaService, private mail: MailService) {}

  private get store() {
    return { name: process.env.STOREKEEPER_NAME || 'Storekeeper', section: process.env.STOREKEEPER_SECTION || null, email: process.env.STOREKEEPER_EMAIL || null };
  }

  /** Holder email: People list first, then login accounts (Users) with the same full name. */
  async emailFor(name?: string | null): Promise<string | null> {
    if (!name) return null;
    const person = await this.prisma.person.findFirst({ where: { name: { equals: name, mode: 'insensitive' } } });
    if (person?.email) return person.email;
    const user = await this.prisma.user.findFirst({ where: { fullName: { equals: name, mode: 'insensitive' }, active: true } });
    return user?.email || null;
  }

  list(q: { search?: string; status?: string; category?: string; section?: string; attention?: string }) {
    const where: Prisma.AssetWhereInput = {};
    if (q.status) where.status = { in: q.status.split(',') as AssetStatus[] };
    else where.status = { not: 'DISPOSED' };
    if (q.category) where.category = { in: q.category.split(',') };
    if (q.section) where.section = { in: q.section.split(',') };
    if (q.search) {
      const s = q.search;
      where.OR = ['id', 'name', 'pic', 'section', 'inspectionSite', 'storageLocation', 'brand', 'model', 'serialNumber']
        .map((f) => ({ [f]: { contains: s, mode: 'insensitive' } }));
    }
    if (q.attention === 'overdue') Object.assign(where, { status: 'ON_LOAN', dueBack: { lt: new Date() } });
    if (q.attention === 'damaged') where.condition = { in: ['DAMAGED', 'BROKEN'] };
    if (q.attention === 'calibration') Object.assign(where, { calRequired: true, calDue: { lte: new Date(Date.now() + 30 * 864e5) } });
    return this.prisma.asset.findMany({
      where, orderBy: { id: 'asc' },
      include: { borrowRequests: { where: { status: 'PENDING' }, take: 1, select: { id: true } } },
    });
  }

  async get(id: string) {
    const a = await this.prisma.asset.findUnique({
      where: { id },
      include: {
        transactions: { orderBy: { createdAt: 'desc' }, take: 20 },
        calibrations: { orderBy: { calibratedAt: 'desc' }, take: 10 },
        borrowRequests: { where: { status: 'PENDING' }, take: 1, orderBy: { createdAt: 'desc' } },
      },
    });
    if (!a) throw new NotFoundException(`No asset with ID ${id}`);
    return a;
  }

  async create(dto: CreateAssetDto, by: string) {
    const prefix = `ENG-${PREFIX[dto.category] || 'SRV'}-`;
    const last = await this.prisma.asset.findMany({ where: { id: { startsWith: prefix } }, select: { id: true } });
    const next = Math.max(0, ...last.map((x) => parseInt(x.id.slice(prefix.length)) || 0)) + 1;
    const id = prefix + String(next).padStart(3, '0');
    const s = this.store;
    return this.prisma.$transaction(async (tx) => {
      const asset = await tx.asset.create({
        data: {
          ...dto, id,
          purchaseDate: dto.purchaseDate ? new Date(dto.purchaseDate) : null,
          warrantyEnd: dto.warrantyEnd ? new Date(dto.warrantyEnd) : null,
          calDue: dto.calDue ? new Date(dto.calDue) : null,
          calRequired: dto.calRequired ?? !!dto.calDue,
          calIntervalMonths: dto.calIntervalMonths || 12,
          condition: 'NEW', status: 'AVAILABLE',
          pic: s.name, section: s.section, picEmail: s.email, currentLocation: dto.storageLocation },
      });
      await tx.transaction.create({ data: { assetId: id, action: 'REGISTERED', toPic: s.name, note: `Stored at ${dto.storageLocation || '-'}`, recordedBy: by } });
      return asset;
    });
  }

  /** Edit asset details. The AssetID never changes (it is printed on the QR label). */
  async update(id: string, dto: UpdateAssetDto) {
    await this.get(id);
    const d = (v?: string) => (v === undefined ? undefined : v ? new Date(v) : null);
    return this.prisma.asset.update({
      where: { id },
      data: { ...dto, purchaseDate: d(dto.purchaseDate), warrantyEnd: d(dto.warrantyEnd), calDue: d(dto.calDue) },
    });
  }

  /**
   * Permanently delete an asset registered by mistake.
   * Blocked once the asset has real movement history (check-out, transfer, check-in, lost):
   * those assets must be disposed instead, so the audit trail is kept.
   */
  async remove(id: string) {
    const a = await this.get(id);
    if (OUT.includes(a.status)) throw new ConflictException('This asset is currently out. Check it in first.');
    const moves = await this.prisma.transaction.count({ where: { assetId: id, action: { in: ['CHECK_OUT', 'TRANSFER', 'CHECK_IN', 'LOST', 'FOUND'] } } });
    if (moves > 0) throw new ConflictException('This asset has movement history, so it can\'t be deleted. Use Dispose instead to keep the record.');
    await this.prisma.asset.delete({ where: { id } }); // transactions and calibrations are removed by cascade
    return { deleted: id };
  }

  /** Update only if the status is still what the user saw, so two people can't take the same tool. */
  private async guardedUpdate(tx: Prisma.TransactionClient, id: string, expected: AssetStatus, data: Prisma.AssetUpdateManyMutationInput) {
    const r = await tx.asset.updateMany({ where: { id, status: expected }, data });
    if (r.count === 0) throw new ConflictException('This asset was just updated by someone else. Refresh and try again.');
  }

  async checkout(id: string, dto: CheckoutDto, by: string, user?: { role: string; fullName: string; email: string }) {
    const a = await this.get(id);
    if (user?.role === 'GUEST') {
      // Guests can only borrow (On Loan) for themselves, from the store
      if (a.status !== 'AVAILABLE' && a.status !== 'RESERVED') throw new ConflictException('This asset is not available right now.');
      dto = { ...dto, type: 'ON_LOAN', pic: user.fullName, picEmail: user.email, section: dto.section?.trim() || 'Guest' };
    }
    if (!['AVAILABLE', 'RESERVED', ...OUT].includes(a.status)) throw new ConflictException(`Asset is ${a.status} and can't be checked out`);
    if (a.calRequired && a.calDue && a.calDue < new Date()) throw new ConflictException('Calibration has expired. Record a new calibration first.');
    if (dto.type !== 'IN_USE' && !dto.inspectionSite) throw new BadRequestException('Inspection site is required for On Loan and Project');
    let dueBack: Date | null = null;
    if (dto.type === 'ON_LOAN') {
      if (!dto.dueBack) throw new BadRequestException('Return date is required for On Loan');
      dueBack = new Date(dto.dueBack);
      if (dueBack <= new Date()) throw new BadRequestException('Return date must be in the future');
    }
    const picEmail = dto.picEmail || (await this.emailFor(dto.pic));
    const action = a.status === 'AVAILABLE' || a.status === 'RESERVED' ? 'CHECK_OUT' : 'TRANSFER';
    const place = dto.inspectionSite || a.storageLocation;
    return this.prisma.$transaction(async (tx) => {
      await this.guardedUpdate(tx, id, a.status, {
        status: dto.type, pic: dto.pic, picEmail, section: dto.section, inspectionSite: dto.inspectionSite || a.inspectionSite,
        currentLocation: place, checkedOutAt: new Date(), dueBack, reservedFor: null, reservedSection: null,
      });
      await tx.transaction.create({ data: { assetId: id, action, loanType: dto.type, fromPic: a.pic, toPic: dto.pic, section: dto.section, inspectionSite: place, dueBack, note: dto.note, recordedBy: by } });
      return tx.asset.findUnique({ where: { id } });
    });
  }

  async checkin(id: string, dto: CheckinDto, by: string) {
    const a = await this.get(id);
    if (!OUT.includes(a.status)) throw new ConflictException('Only assets that are In Use, On Loan or Project can be checked in');
    const ok = ['NEW', 'GOOD', 'FAIR'].includes(dto.condition);
    const late = a.status === 'ON_LOAN' && a.dueBack && a.dueBack < new Date();
    const s = this.store;
    const result = await this.prisma.$transaction(async (tx) => {
      await tx.transaction.create({ data: { assetId: id, action: 'CHECK_IN', fromPic: a.pic, toPic: s.name, section: a.section, inspectionSite: a.inspectionSite, condition: dto.condition, note: [late ? 'Returned late' : '', dto.note].filter(Boolean).join('. ') || null, recordedBy: by } });
      await this.guardedUpdate(tx, id, a.status, {
        status: ok ? 'AVAILABLE' : 'MAINTENANCE', condition: dto.condition, currentLocation: ok ? a.storageLocation : 'Maintenance workshop',
        pic: s.name, picEmail: s.email, section: s.section, checkedOutAt: null, dueBack: null,
      });
      return tx.asset.findUnique({ where: { id } });
    });
    if (!ok) this.mail.notifyStorekeeper(`[MIRA] ${id} returned ${dto.condition.toLowerCase()}`, `<p><b>${a.name} (${id})</b> was returned <b>${dto.condition}</b> by ${a.pic || '-'} (${a.section || '-'}), last used at ${a.inspectionSite || '-'}.</p><p>Note: ${dto.note || '-'}</p>`);
    return result;
  }

  async reserve(id: string, dto: ReserveDto, by: string, user?: { role: string; fullName: string }) {
    const a = await this.get(id);
    if (user?.role === 'GUEST') dto = { ...dto, person: user.fullName, section: dto.section || 'Guest' };
    if (a.status !== 'AVAILABLE') throw new ConflictException('Only available assets can be reserved');
    return this.simple(id, a.status, { status: 'RESERVED', reservedFor: dto.person, reservedSection: dto.section }, { action: 'RESERVE', toPic: dto.person, section: dto.section, note: dto.note }, by);
  }
  async cancelReservation(id: string, by: string) {
    const a = await this.get(id);
    if (a.status !== 'RESERVED') throw new ConflictException('Asset is not reserved');
    return this.simple(id, a.status, { status: 'AVAILABLE', reservedFor: null, reservedSection: null }, { action: 'CANCEL_RESERVATION', toPic: a.reservedFor }, by);
  }
  async reportLost(id: string, note: string, by: string) {
    const a = await this.get(id);
    if (!OUT.includes(a.status)) throw new ConflictException('Only assets that are out can be reported lost');
    const r = await this.simple(id, a.status, { status: 'LOST', currentLocation: 'Unknown', dueBack: null }, { action: 'LOST', fromPic: a.pic, section: a.section, inspectionSite: a.inspectionSite, note }, by);
    this.mail.notifyStorekeeper(`[MIRA] ${id} reported lost`, `<p><b>${a.name} (${id})</b> was reported lost. Last holder: ${a.pic || '-'} (${a.section || '-'}), last site: ${a.inspectionSite || '-'}.</p>`);
    return r;
  }
  async found(id: string, by: string) {
    const a = await this.get(id);
    if (a.status !== 'LOST') throw new ConflictException('Asset is not lost');
    const s = this.store;
    return this.simple(id, a.status, { status: 'AVAILABLE', currentLocation: a.storageLocation, pic: s.name, picEmail: s.email, section: s.section }, { action: 'FOUND', toPic: s.name }, by);
  }
  async toMaintenance(id: string, note: string, by: string) {
    const a = await this.get(id);
    if (a.status !== 'AVAILABLE') throw new ConflictException('Only available assets can be sent to maintenance');
    return this.simple(id, a.status, { status: 'MAINTENANCE', currentLocation: 'Maintenance workshop' }, { action: 'MAINTENANCE', note }, by);
  }
  async repaired(id: string, by: string) {
    const a = await this.get(id);
    if (a.status !== 'MAINTENANCE') throw new ConflictException('Asset is not in maintenance');
    const s = this.store;
    return this.simple(id, a.status, { status: 'AVAILABLE', condition: 'GOOD', currentLocation: a.storageLocation, pic: s.name, picEmail: s.email, section: s.section }, { action: 'REPAIRED' }, by);
  }
  async dispose(id: string, note: string, by: string) {
    const a = await this.get(id);
    if (a.status !== 'MAINTENANCE' && a.status !== 'AVAILABLE') throw new ConflictException('Only assets in the store or in maintenance can be disposed');
    return this.simple(id, a.status, { status: 'DISPOSED', currentLocation: 'Disposed' }, { action: 'DISPOSED', note }, by);
  }
  async remind(id: string, by: string) {
    const a = await this.get(id);
    if (a.status !== 'ON_LOAN') throw new ConflictException('Reminders are only for On Loan assets');
    const to = a.picEmail || (await this.emailFor(a.pic));
    if (!to) throw new BadRequestException(`No email found for ${a.pic || 'the holder'}. Add their email in People (or create a user with the same full name), then try again.`);
    if (to !== a.picEmail) await this.prisma.asset.update({ where: { id }, data: { picEmail: to } });
    await this.mail.send(to, `[MIRA] Please return ${a.name} (${a.id})`, `<p>${a.name} (${a.id}) was due back on ${a.dueBack?.toLocaleString('en-GB', { timeZone: 'Asia/Jakarta' })}. Please return it to the tool store or ask for a new return date.</p>`, this.store.email || undefined);
    return this.prisma.transaction.create({ data: { assetId: id, action: 'REMINDER', toPic: a.pic, section: a.section, inspectionSite: a.inspectionSite, note: 'Manual reminder', recordedBy: by } });
  }

  private simple(id: string, expected: AssetStatus, data: Prisma.AssetUpdateManyMutationInput, txData: Omit<Prisma.TransactionUncheckedCreateInput, 'assetId'>, by: string) {
    return this.prisma.$transaction(async (tx) => {
      await this.guardedUpdate(tx, id, expected, data);
      await tx.transaction.create({ data: { ...txData, assetId: id, recordedBy: by } });
      return tx.asset.findUnique({ where: { id } });
    });
  }
}
