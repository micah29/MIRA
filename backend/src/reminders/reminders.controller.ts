import { Controller, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { RemindersService } from './reminders.service';

/** Manual triggers for testing the scheduled jobs. */
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@Controller('reminders')
export class RemindersController {
  constructor(private r: RemindersService) {}
  @Post('overdue/run') overdue() { return this.r.overdue(); }
  @Post('calibration/run') calibration() { return this.r.calibrationSummary(); }
}
