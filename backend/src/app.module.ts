import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { MailModule } from './mail/mail.module';
import { AssetsModule } from './assets/assets.module';
import { CalibrationsModule } from './calibrations/calibrations.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { RemindersModule } from './reminders/reminders.module';
import { LookupsModule } from './lookups/lookups.module';
import { UsersModule } from './users/users.module';
import { TransactionsModule } from './transactions/transactions.module';
import { ApprovalsModule } from './approvals/approvals.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    PrismaModule, AuthModule, MailModule, AssetsModule, CalibrationsModule,
    DashboardModule, RemindersModule, LookupsModule, UsersModule, TransactionsModule, ApprovalsModule,
  ],
})
export class AppModule {}
