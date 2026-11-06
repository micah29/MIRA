import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Activity log.
 * scope=mine (default): only activity that involves the signed-in person —
 *   they recorded it, gave the asset away (fromPic) or received it (toPic).
 * scope=all: everything (Admin and Storekeeper only).
 */
@UseGuards(JwtAuthGuard)
@Controller('transactions')
export class TransactionsController {
  constructor(private prisma: PrismaService) {}
  @Get()
  list(@Req() req, @Query('search') search?: string, @Query('scope') scope = 'mine', @Query('limit') limit = '100') {
    const u = req.user;
    const canSeeAll = u.role === 'ADMIN' || u.role === 'STOREKEEPER';
    const and: Prisma.TransactionWhereInput[] = [];
    if (!(canSeeAll && scope === 'all')) {
      const name = { equals: u.fullName, mode: 'insensitive' as const };
      and.push({ OR: [{ fromPic: name }, { toPic: name }, { recordedBy: { startsWith: u.fullName, mode: 'insensitive' } }] });
    }
    if (search) and.push({ OR: ['assetId', 'fromPic', 'toPic', 'section', 'inspectionSite', 'note'].map((f) => ({ [f]: { contains: search, mode: 'insensitive' } })) });
    return this.prisma.transaction.findMany({
      where: and.length ? { AND: and } : {},
      include: { asset: { select: { name: true } } },
      orderBy: { createdAt: 'desc' }, take: Math.min(+limit || 100, 500),
    });
  }
}
