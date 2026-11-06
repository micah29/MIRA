import { Body, Controller, Get, Param, Post, Query, Req, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { mkdirSync } from 'fs';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CalibrationsService } from './calibrations.service';

const dir = `${process.env.UPLOAD_DIR || 'uploads'}/certificates`;
mkdirSync(dir, { recursive: true });

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller()
export class CalibrationsController {
  constructor(private cal: CalibrationsService) {}

  @Get('calibrations') all() { return this.cal.all(); }
  @Get('calibrations/due') due(@Query('days') days?: string) { return this.cal.due(days ? +days : 30); }

  /** multipart/form-data: calibratedAt, intervalMonths, vendor, certificateNo, result, file (optional PDF/image) */
  @Roles('STOREKEEPER')
  @Post('assets/:id/calibrations')
  @UseInterceptors(FileInterceptor('file', {
    storage: diskStorage({ destination: dir, filename: (req, f, cb) => cb(null, `${req.params.id}-${Date.now()}${extname(f.originalname)}`) }),
    limits: { fileSize: 10 * 1024 * 1024 },
  }))
  record(@Param('id') id: string, @Body() body: any, @UploadedFile() file: Express.Multer.File, @Req() r) {
    return this.cal.record(id, body, file ? `certificates/${file.filename}` : null, r.user.fullName);
  }
}
