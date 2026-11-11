import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  /** Counts records (not Qty), so the totals always match the number of assets. */
  async summary() {
    const now = new Date();
    const soon = new Date(Date.now() + 30 * 864e5);
    const [byStatus, byCategory, total, damaged, overdue, calSoon, calExpired, outBySection, bySite, nextCalibrations, overdueList, expiredList, pendingApprovals] = await Promise.all([
      this.prisma.asset.groupBy({ by: ['status'], _count: true }),
      this.prisma.asset.groupBy({ by: ['category'], where: { status: { not: 'DISPOSED' } }, _count: true }),
      this.prisma.asset.count(),
      this.prisma.asset.count({ where: { condition: { in: ['DAMAGED', 'BROKEN'] }, status: { not: 'DISPOSED' } } }),
      this.prisma.asset.count({ where: { status: 'ON_LOAN', dueBack: { lt: now } } }),
      this.prisma.asset.count({ where: { calRequired: true, status: { not: 'DISPOSED' }, calDue: { gte: now, lte: soon } } }),
      this.prisma.asset.count({ where: { calRequired: true, status: { not: 'DISPOSED' }, calDue: { lt: now } } }),
      this.prisma.asset.groupBy({ by: ['section'], where: { status: { in: ['IN_USE', 'ON_LOAN', 'PROJECT'] } }, _count: true }),
      this.prisma.asset.groupBy({ by: ['inspectionSite'], where: { status: { in: ['ON_LOAN', 'PROJECT'] } }, _count: true }),
      this.prisma.asset.findMany({ where: { calDue: { not: null }, status: { not: 'DISPOSED' } }, orderBy: { calDue: 'asc' }, take: 5 }),
      this.prisma.asset.findMany({ where: { status: 'ON_LOAN', dueBack: { lt: now } }, orderBy: { dueBack: 'asc' } }),
      this.prisma.asset.findMany({ where: { calRequired: true, status: { not: 'DISPOSED' }, calDue: { lt: now } } }),
      this.prisma.borrowRequest.count({ where: { status: 'PENDING' } }),
    ]);
    const status = Object.fromEntries(byStatus.map((s) => [s.status, s._count]));
    return {
      total, damaged, overdue, calibrationDue: calSoon + calExpired, calibrationExpired: calExpired, pendingApprovals, status,
      byCategory: byCategory.map((c) => ({ name: c.category, count: c._count })).sort((a, b) => b.count - a.count),
      bySection: outBySection.map((s) => ({ name: s.section || 'Not recorded', count: s._count })).sort((a, b) => b.count - a.count),
      bySite: bySite.map((s) => ({ name: s.inspectionSite || 'Not recorded', count: s._count })).sort((a, b) => b.count - a.count),
      nextCalibrations, overdueList, expiredList,
    };
  }
}
