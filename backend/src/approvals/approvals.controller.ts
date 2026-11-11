import { Body, Controller, Get, Param, ParseIntPipe, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { ApprovalsService } from './approvals.service';
import { CreateRequestDto, RejectDto } from './approvals.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller()
export class ApprovalsController {
  constructor(private approvals: ApprovalsService) {}

  /** Engineer or Guest asks to borrow an asset; Storekeeper/Admin approve directly via checkout instead. */
  @Roles('ENGINEER', 'GUEST')
  @Post('assets/:id/request')
  create(@Param('id') id: string, @Body() dto: CreateRequestDto, @Req() r) {
    return this.approvals.create(id, dto, { fullName: r.user.fullName, email: r.user.email, role: r.user.role });
  }

  @Roles('ADMIN', 'STOREKEEPER') @Get('approvals') pending() { return this.approvals.pending(); }
  @Roles('ADMIN', 'STOREKEEPER') @Get('approvals/pending-count') async count() { return { count: await this.approvals.pendingCount() }; }
  @Get('approvals/mine') mine(@Req() r) { return this.approvals.mine(r.user.email); }

  @Roles('ADMIN', 'STOREKEEPER') @Post('approvals/:id/approve') approve(@Param('id', ParseIntPipe) id: number, @Req() r) { return this.approvals.approve(id, r.user.fullName); }
  @Roles('ADMIN', 'STOREKEEPER') @Post('approvals/:id/reject') reject(@Param('id', ParseIntPipe) id: number, @Body() dto: RejectDto, @Req() r) { return this.approvals.reject(id, dto, r.user.fullName); }
}
