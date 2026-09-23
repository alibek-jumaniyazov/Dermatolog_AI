import { Controller, Get, Res } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { Public, Admin } from './common';
import { PrismaService } from './prisma.service';
import { StorageService } from './storage.service';
import { MlService } from './ml.service';

@ApiTags('Health') @Controller()
export class SystemController {
  constructor(private readonly db: PrismaService, private readonly storage: StorageService, private readonly ml: MlService) {}
  @Public() @Get('health/live') live() { return { status: 'ok' }; }
  @Public() @Get('health/ready') async ready(@Res({ passthrough: true }) res: Response) {
    const [database, storage, ml] = await Promise.allSettled([this.db.$queryRaw`SELECT 1`, this.storage.ready(), this.ml.capabilities()]);
    const ready = database.status === 'fulfilled' && storage.status === 'fulfilled';
    if (!ready) res.status(503);
    return { status: ready ? 'ok' : 'unavailable', database: database.status === 'fulfilled' ? 'ok' : 'unavailable', storage: storage.status === 'fulfilled' ? 'ok' : 'unavailable', ml: ml.status === 'fulfilled' ? ml.value.modelStatus : 'UNAVAILABLE' };
  }
  @Public() @Get('capabilities') capabilities() { return this.ml.capabilities(); }
  @Admin() @ApiBearerAuth() @Get('admin/system') async admin() {
    const [jobs, deletions, analyses, capabilities] = await Promise.all([this.db.analysisJob.groupBy({ by: ['status'], _count: { id: true } }), this.db.deletionRequest.groupBy({ by: ['status'], _count: { id: true } }), this.db.analysis.count({ where: { deletedAt: null } }), this.ml.capabilities()]);
    return { queueMode: process.env.REDIS_URL ? 'BULLMQ' : 'POSTGRES_LOCAL', jobs: jobs.map(j => ({ status: j.status, count: j._count.id })), deletions: deletions.map(d => ({ status: d.status, count: d._count.id })), activeAnalyses: analyses, capabilities, uptimeSeconds: Math.floor(process.uptime()) };
  }
  @Admin() @ApiBearerAuth() @Get('admin/models') models() { return this.ml.capabilities(); }
}
