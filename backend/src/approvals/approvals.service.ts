import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AssetsService } from '../assets/assets.service';
import { CreateRequestDto, RejectDto } from './approvals.dto';

/**
 * Borrow requests, for people who can't directly check assets out (Engineer, Guest).
 * A request never changes the asset by itself — approving it runs the normal
 * checkout/transfer logic, so every rule (calibration, role, no double-booking) still applies.
 */
@Injectable()
export class ApprovalsService {
  constructor(private prisma: PrismaService, private assets: AssetsService) {}

  async create(assetId: string, dto: CreateRequestDto, by: { fullName: string; email: string; role: string }) {
    const a = await this.assets.get(assetId);
    if (!['AVAILABLE', 'RESERVED', 'IN_USE', 'ON_LOAN', 'PROJECT'].includes(a.status)) {
      throw new ConflictException(`Asset is ${a.status} and can't be requested`);
    }
    if (a.calRequired && a.calDue && a.calDue < new Date()) {
      throw new ConflictException("Calibration has expired. This asset can't be requested until it's recalibrated.");
    }
    if (dto.type !== 'IN_USE' && !dto.inspectionSite) throw new BadRequestException('Inspection site is required for On Loan and Project');
    if (dto.type === 'ON_LOAN' && !dto.dueBack) throw new BadRequestException('Return date is required for On Loan');
    const existing = await this.prisma.borrowRequest.findFirst({ where: { assetId, status: 'PENDING' } });
    if (existing) throw new ConflictException('This asset already has a pending request awaiting approval.');
    const action = a.status === 'AVAILABLE' || a.status === 'RESERVED' ? 'CHECK_OUT' : 'TRANSFER';
    return this.prisma.borrowRequest.create({
      data: {
        assetId, action, loanType: dto.type as any, requestedBy: by.fullName, requestedByEmail: by.email, requesterRole: by.role,
        section: dto.section, inspectionSite: dto.inspectionSite, dueBack: dto.dueBack ? new Date(dto.dueBack) : null, note: dto.note,
      },
    });
  }

  pending() {
    return this.prisma.borrowRequest.findMany({ where: { status: 'PENDING' }, include: { asset: { select: { name: true, status: true, pic: true } } }, orderBy: { createdAt: 'asc' } });
  }
  pendingCount() {
    return this.prisma.borrowRequest.count({ where: { status: 'PENDING' } });
  }
  mine(email: string) {
    return this.prisma.borrowRequest.findMany({ where: { requestedByEmail: email }, include: { asset: { select: { name: true } } }, orderBy: { createdAt: 'desc' }, take: 50 });
  }

  async approve(id: number, by: string) {
    const r = await this.prisma.borrowRequest.findUnique({ where: { id } });
    if (!r) throw new NotFoundException('Request not found');
    if (r.status !== 'PENDING') throw new ConflictException('This request was already decided');
    try {
      await this.assets.checkout(r.assetId, {
        type: r.loanType as any, pic: r.requestedBy, picEmail: r.requestedByEmail, section: r.section || r.requesterRole,
        inspectionSite: r.inspectionSite, dueBack: r.dueBack?.toISOString(), note: r.note,
      } as any, by);
    } catch (e) {
      await this.prisma.borrowRequest.update({ where: { id }, data: { status: 'REJECTED', decidedBy: by, decidedAt: new Date(), rejectReason: `Auto-rejected: ${e.message}` } });
      throw new ConflictException(`Could not approve: ${e.message}. The request was rejected automatically.`);
    }
    return this.prisma.borrowRequest.update({ where: { id }, data: { status: 'APPROVED', decidedBy: by, decidedAt: new Date() } });
  }

  async reject(id: number, dto: RejectDto, by: string) {
    const r = await this.prisma.borrowRequest.findUnique({ where: { id } });
    if (!r) throw new NotFoundException('Request not found');
    if (r.status !== 'PENDING') throw new ConflictException('This request was already decided');
    return this.prisma.borrowRequest.update({ where: { id }, data: { status: 'REJECTED', decidedBy: by, decidedAt: new Date(), rejectReason: dto.reason } });
  }
}
