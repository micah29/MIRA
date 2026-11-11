import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles, StrictRoles } from '../auth/roles.decorator';
import { AssetsService } from './assets.service';
import { CheckinDto, CheckoutDto, CreateAssetDto, NoteDto, ReserveDto, UpdateAssetDto } from './assets.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('assets')
export class AssetsController {
  constructor(private assets: AssetsService) {}
  private by(r) { return r.user.role === 'GUEST' ? `${r.user.fullName} (guest)` : r.user.fullName; }

  @Get() list(@Query() q: any) { return this.assets.list(q); }
  @Get(':id') get(@Param('id') id: string) { return this.assets.get(id); }

  @Roles('STOREKEEPER') @Patch(':id') update(@Param('id') id: string, @Body() dto: UpdateAssetDto) { return this.assets.update(id, dto); }
  @Roles('ADMIN') @Delete(':id') remove(@Param('id') id: string) { return this.assets.remove(id); }
  @Roles('STOREKEEPER') @Post() create(@Body() dto: CreateAssetDto, @Req() r) { return this.assets.create(dto, r.user.fullName); }

  // Storekeeper/Admin check out and reassign directly. Engineers and guests must request
  // via POST /assets/:id/request instead (see ApprovalsController) and wait for approval.
  @Roles('STOREKEEPER') @Post(':id/checkout') checkout(@Param('id') id: string, @Body() dto: CheckoutDto, @Req() r) { return this.assets.checkout(id, dto, this.by(r), r.user); }
  @Roles('STOREKEEPER', 'ENGINEER', 'GUEST') @Post(':id/reserve') reserve(@Param('id') id: string, @Body() dto: ReserveDto, @Req() r) { return this.assets.reserve(id, dto, this.by(r), r.user); }
  @Roles('STOREKEEPER', 'ENGINEER') @Post(':id/cancel-reservation') cancel(@Param('id') id: string, @Req() r) { return this.assets.cancelReservation(id, r.user.fullName); }
  @Roles('STOREKEEPER', 'ENGINEER') @Post(':id/lost') lost(@Param('id') id: string, @Body() dto: NoteDto, @Req() r) { return this.assets.reportLost(id, dto.note, r.user.fullName); }

  // Storekeeper only
  @Roles('STOREKEEPER') @Post(':id/checkin') checkin(@Param('id') id: string, @Body() dto: CheckinDto, @Req() r) { return this.assets.checkin(id, dto, r.user.fullName); }
  @Roles('STOREKEEPER') @Post(':id/found') found(@Param('id') id: string, @Req() r) { return this.assets.found(id, r.user.fullName); }
  @Roles('STOREKEEPER') @Post(':id/maintenance') maintenance(@Param('id') id: string, @Body() dto: NoteDto, @Req() r) { return this.assets.toMaintenance(id, dto.note, r.user.fullName); }
  @Roles('STOREKEEPER') @Post(':id/repaired') repaired(@Param('id') id: string, @Req() r) { return this.assets.repaired(id, r.user.fullName); }
  @Roles('STOREKEEPER') @Post(':id/dispose') dispose(@Param('id') id: string, @Body() dto: NoteDto, @Req() r) { return this.assets.dispose(id, dto.note, r.user.fullName); }

  /** Deliberately Storekeeper-only — Admin does not get automatic access to this one. */
  @StrictRoles('STOREKEEPER') @Post(':id/remind') remind(@Param('id') id: string, @Req() r) { return this.assets.remind(id, r.user.fullName); }
}
