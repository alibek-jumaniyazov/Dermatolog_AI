import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { config } from './config';
import { PrismaService } from './prisma.service';
import { AuthGuard, AuthService } from './auth.service';
import { RateGuard } from './common';
import { AuthController, ProfileController } from './auth.controller';
import { StorageService } from './storage.service';
import { MlService } from './ml.service';
import { DeletionService } from './deletion.service';
import { AnalysesService } from './analyses.service';
import { ReportsService } from './reports.service';
import { JobsService } from './jobs.service';
import { AnalysesController, AssetsController, CasesController, PrivacyController, ProcessingConsentGuard } from './analyses.controller';
import { SystemController } from './system.controller';

@Module({
  imports: [JwtModule.register({ secret: config.jwtSecret, signOptions: { expiresIn: '10m', algorithm: 'HS256', issuer: 'raqmli-dermatolog', audience: 'dermatolog-web' }, verifyOptions: { algorithms: ['HS256'], issuer: 'raqmli-dermatolog', audience: 'dermatolog-web' } })],
  controllers: [AuthController, ProfileController, CasesController, AnalysesController, AssetsController, PrivacyController, SystemController],
  providers: [PrismaService, AuthService, StorageService, MlService, DeletionService, AnalysesService, ReportsService, JobsService, ProcessingConsentGuard,
    { provide: APP_GUARD, useClass: RateGuard }, { provide: APP_GUARD, useClass: AuthGuard }],
})
export class AppModule {}
