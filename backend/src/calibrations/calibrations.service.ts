import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { addMonths } from '../common/dates';

export interface RecordCalibrationInput {
  calibratedAt: string; intervalMonths: number; vendor?: string; certificateNo?: string; result: 'ACCEPT' | 'REJECT';
}

@Injectable()
export class CalibrationsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Records a calibration and updates the asset in ONE database transaction:
   * ACCEPT -> nextDue = calibratedAt + intervalMonths, written to asset.calDue automatically.
   * REJECT -> due date is not renewed; an asset in the store moves to MAINTENANCE.
   */
  async record(assetId: string, input: RecordCalibrationInput, file: string | null, by: string) {
    const asset = await this.prisma.asset.findUnique({ where: { id: assetId } });
    if (!asset) throw new NotFoundException(`No asset with ID ${assetId}`);
    const calibratedAt = new Date(input.calibratedAt);
    if (isNaN(+calibratedAt)) throw new BadRequestException('Invalid calibration date');
    if (calibratedAt > new Date()) throw new BadRequestException('Calibration date cannot be in the future');
    const interval = Number(input.intervalMonths) || asset.calIntervalMonths || 12;
    const accepted = input.result === 'ACCEPT';
    const nextDue = accepted ? addMonths(calibratedAt, interval) : null;

    return this.prisma.$transaction(async (tx) => {
      const cal = await tx.calibration.create({
        data: { assetId, calibratedAt, intervalMonths: interval, vendor: input.vendor, certificateNo: input.certificateNo, certificateFile: file, result: input.result, nextDue, recordedBy: by },
      });
      if (accepted) {
        await tx.asset.update({ where: { id: assetId }, data: { calDue: nextDue, calRequired: true, calIntervalMonths: interval } });
      } else if (asset.status === 'AVAILABLE' || asset.status === 'RESERVED') {
        await tx.asset.update({ where: { id: assetId }, data: { status: 'MAINTENANCE', currentLocation: 'Maintenance workshop' } });
      }
      await tx.transaction.create({
        data: { assetId, action: accepted ? 'CALIBRATION' : 'CALIBRATION_REJECTED', recordedBy: by,
          note: accepted ? `Calibrated ${calibratedAt.toISOString().slice(0, 10)}${input.vendor ? ' by ' + input.vendor : ''}. Next due ${nextDue.toISOString().slice(0, 10)}` : `Failed calibration ${calibratedAt.toISOString().slice(0, 10)}` },
      });
      return { calibration: cal, asset: await tx.asset.findUnique({ where: { id: assetId } }) };
    });
  }

  /** Assets with calibration due within `days` days (or expired, or required without a date). */
  due(days = 30) {
    return this.prisma.asset.findMany({
      where: { status: { not: 'DISPOSED' }, calRequired: true, OR: [{ calDue: null }, { calDue: { lte: new Date(Date.now() + days * 864e5) } }] },
      orderBy: { calDue: 'asc' },
    });
  }

  all() {
    return this.prisma.asset.findMany({
      where: { status: { not: 'DISPOSED' }, OR: [{ calRequired: true }, { calDue: { not: null } }] },
      include: { calibrations: { orderBy: { calibratedAt: 'desc' }, take: 1 } },
      orderBy: { calDue: 'asc' },
    });
  }
}
