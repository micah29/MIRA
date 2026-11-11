import { Module } from '@nestjs/common';
import { ApprovalsController } from './approvals.controller';
import { ApprovalsService } from './approvals.service';
import { AssetsModule } from '../assets/assets.module';
@Module({ imports: [AssetsModule], controllers: [ApprovalsController], providers: [ApprovalsService] })
export class ApprovalsModule {}
