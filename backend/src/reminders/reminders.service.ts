import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';

const fmt = (d: Date) => d.toLocaleString('en-GB', { timeZone: 'Asia/Jakarta', day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

@Injectable()
export class RemindersService {
  private log = new Logger('Reminders');
  constructor(private prisma: PrismaService, private mail: MailService) {}

  /** Every day 08:00 WIB: email each holder of an overdue On Loan asset (copy to storekeeper) and log it. */
  @Cron('0 8 * * *', { timeZone: 'Asia/Jakarta' })
  async overdue() {
    const list = await this.prisma.asset.findMany({ where: { status: 'ON_LOAN', dueBack: { lt: new Date() } } });
    for (const a of list) {
      let to = a.picEmail;
      if (!to && a.pic) {
        const p = await this.prisma.person.findFirst({ where: { name: { equals: a.pic, mode: 'insensitive' } } });
        const u = p?.email ? null : await this.prisma.user.findFirst({ where: { fullName: { equals: a.pic, mode: 'insensitive' }, active: true } });
        to = p?.email || u?.email || null;
      }
      if (!to) { this.log.warn(`${a.id}: no email for holder "${a.pic || '-'}", reminder skipped`); continue; }
      await this.mail.send(to, `[MIRA] Overdue: ${a.name} (${a.id})`,
        `<p>Hi ${a.pic || ''},</p><p><b>${a.name} (${a.id})</b> was due back on <b>${fmt(a.dueBack)}</b> (site: ${a.inspectionSite || '-'}).</p><p>Please return it to the tool store or reply with a new return date.</p>`,
        process.env.STOREKEEPER_EMAIL || undefined);
      await this.prisma.transaction.create({ data: { assetId: a.id, action: 'REMINDER', toPic: a.pic, section: a.section, inspectionSite: a.inspectionSite, note: 'Daily overdue reminder', recordedBy: 'MIRA scheduler' } });
    }
    this.log.log(`Overdue reminders sent: ${list.length}`);
    return { sent: list.length };
  }

  /** Every Monday 08:00 WIB: one summary of calibrations due within 30 days or expired. */
  @Cron('0 8 * * 1', { timeZone: 'Asia/Jakarta' })
  async calibrationSummary() {
    const list = await this.prisma.asset.findMany({
      where: { calRequired: true, status: { not: 'DISPOSED' }, calDue: { lte: new Date(Date.now() + 30 * 864e5) } }, orderBy: { calDue: 'asc' },
    });
    if (list.length) {
      const rows = list.map((a) => `<tr><td>${a.id}</td><td>${a.name}</td><td>${a.calDue ? fmt(a.calDue).split(',')[0] : '-'}</td><td>${a.currentLocation || '-'}</td></tr>`).join('');
      await this.mail.send((process.env.CALIBRATION_REPORT_TO || process.env.STOREKEEPER_EMAIL || '').split(',').map((s) => s.trim()),
        `[MIRA] ${list.length} calibration(s) due in the next 30 days`,
        `<table border="1" cellpadding="6" cellspacing="0"><tr><th>AssetID</th><th>Asset</th><th>Due</th><th>Location</th></tr>${rows}</table>`);
    }
    this.log.log(`Calibration summary: ${list.length} asset(s)`);
    return { assets: list.length };
  }
}
