import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PrismaService } from '../prisma/prisma.service';

@UseGuards(JwtAuthGuard)
@Controller('lookups')
export class LookupsController {
  constructor(private prisma: PrismaService) {}
  @Get()
  async all() {
    const [sections, sites, people] = await Promise.all([
      this.prisma.section.findMany({ orderBy: { name: 'asc' } }),
      this.prisma.site.findMany({ where: { active: true }, orderBy: { name: 'asc' } }),
      this.prisma.person.findMany({ where: { active: true }, orderBy: { name: 'asc' }, select: { name: true, section: true } }), // no emails to the browser
    ]);
    return { sections, sites, people, storekeeper: process.env.STOREKEEPER_NAME || 'Storekeeper' };
  }
}
