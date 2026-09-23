import { HttpException, Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Queue, Worker } from 'bullmq';
import sharp from 'sharp';
import { PrismaService } from './prisma.service';
import { StorageService } from './storage.service';
import { MlService } from './ml.service';
import { DeletionService } from './deletion.service';
import { availableWhere } from './analyses.service';
import { buildResult } from './risk';

@Injectable()
export class JobsService implements OnModuleInit, OnModuleDestroy {
  private timer?: NodeJS.Timeout;
  private queue?: Queue;
  private worker?: Worker;
  private ticking = false;
  constructor(private readonly db: PrismaService, private readonly storage: StorageService, private readonly ml: MlService, private readonly deletion: DeletionService) {}
  async onModuleInit() {
    if (process.env.RUN_WORKER_IN_API === 'false' && process.env.WORKER_ONLY !== 'true') return;
    if (process.env.REDIS_URL) {
      const url = new URL(process.env.REDIS_URL);
      const connection = { host: url.hostname, port: Number(url.port || 6379), password: url.password || undefined, username: url.username || undefined, db: Number(url.pathname.slice(1) || 0), maxRetriesPerRequest: null, ...(url.protocol === 'rediss:' ? { tls: {} } : {}) };
      this.queue = new Queue('dermatolog-inference', { connection });
      this.worker = new Worker('dermatolog-inference', async job => { await this.process(String(job.data.jobId)); }, { connection, concurrency: 2 });
      this.worker.on('error', () => console.error(JSON.stringify({ event: 'queue_unavailable' })));
      this.queue.on('error', () => console.error(JSON.stringify({ event: 'queue_unavailable' })));
    }
    this.timer = setInterval(() => { void this.tick(); }, 1500);
    this.timer.unref();
    void this.tick();
  }
  async onModuleDestroy() { if (this.timer) clearInterval(this.timer); await this.worker?.close(); await this.queue?.close(); }
  private async tick() {
    if (this.ticking) return;
    this.ticking = true;
    try {
      await this.deletion.cleanup();
      const stale = await this.db.analysisJob.findMany({ where: { status: 'RUNNING', leasedUntil: { lt: new Date() } }, take: 20 });
      for (const job of stale) {
        // An interrupted paid external request must never be silently billed twice.
        const retry = process.env.AI_PROVIDER !== 'openai' && job.attempts < 3;
        await this.db.$transaction([
          this.db.analysisJob.updateMany({ where: { id: job.id, status: 'RUNNING', leasedUntil: { lt: new Date() } }, data: { status: retry ? 'PENDING' : 'FAILED', leasedUntil: null } }),
          this.db.analysis.updateMany({ where: { id: job.analysisId, status: 'RUNNING', deletedAt: null }, data: retry ? { status: 'QUEUED' } : { status: 'FAILED', errorCode: 'WORKER_INTERRUPTED', errorMessage: 'Tahlil jarayoni uzilgan. Zarur bo‘lsa qayta yuboring.' } }),
        ]);
      }
      const jobs = await this.db.analysisJob.findMany({ where: { status: 'PENDING' }, orderBy: { createdAt: 'asc' }, take: 10 });
      for (const job of jobs) {
        if (this.queue) await this.queue.add('analysis', { jobId: job.id }, { jobId: job.id, removeOnComplete: true, removeOnFail: true });
        else await this.process(job.id);
      }
    } catch { console.error(JSON.stringify({ event: 'worker_cycle_failed' })); }
    finally { this.ticking = false; }
  }
  async process(jobId: string) {
    const claim = await this.db.analysisJob.updateMany({ where: { id: jobId, status: 'PENDING' }, data: { status: 'RUNNING', attempts: { increment: 1 }, leasedUntil: new Date(Date.now() + 180000) } });
    if (!claim.count) return;
    const job = await this.db.analysisJob.findUniqueOrThrow({ where: { id: jobId } });
    const pendingKeys: string[] = [];
    try {
      const analysis = await this.db.analysis.findFirst({ where: { id: job.analysisId, inputRevision: job.revision, processingConsent: true, status: 'QUEUED', ...availableWhere(), user: { deletedAt: null }, case: { deletedAt: null } }, include: { images: true } });
      if (!analysis) { await this.db.analysisJob.updateMany({ where: { id: job.id }, data: { status: 'CANCELLED', leasedUntil: null } }); return; }
      await this.db.analysis.updateMany({ where: { id: analysis.id, status: 'QUEUED', deletedAt: null }, data: { status: 'RUNNING' } });
      const image = analysis.images.find(i => i.id === analysis.primaryImageId) || analysis.images[0];
      if (!image) throw new Error('IMAGE_MISSING');
      const capabilities = await this.ml.capabilities();
      const latest = await this.db.analysis.findFirst({ where: { id: analysis.id, status: 'RUNNING', processingConsent: true, ...availableWhere() } });
      if (!latest) throw new Error('CANCELLED');
      if (capabilities.externalAiRequired && !latest.externalAiConsent) throw new HttpException({ error: { code: 'EXTERNAL_AI_CONSENT_REQUIRED', message: 'Tashqi AI roziligi mavjud emas.' } }, 403);
      const bytes = await this.storage.read(image.storageKey);
      const inference = await this.ml.infer(bytes, { analysisId: analysis.id, imageId: image.id, inputRevision: job.revision, symptoms: analysis.symptoms, roi: image.roi, externalAi: latest.externalAiConsent });
      if ((inference.analysisId && inference.analysisId !== analysis.id) || (inference.imageId && inference.imageId !== image.id) || (inference.inputRevision !== undefined && inference.inputRevision !== job.revision)) throw new Error('ML_PROVENANCE_MISMATCH');
      // Request/response IDs and input SHA bind result to this exact sanitized upload.
      if (inference.normalizedImageHash !== image.sha256) throw new Error('ML_IMAGE_HASH_MISMATCH');
      const result = buildResult(inference, analysis.symptoms);
      const artifacts: { kind: string; storageKey: string; mimeType: string }[] = [];
      for (const [kind, encoded] of [['MASK', inference.segmentation.available ? inference.segmentation.maskPngBase64 : undefined], ['HEATMAP', inference.attribution.available ? inference.attribution.heatmapPngBase64 : undefined]] as const) {
        if (!encoded) continue;
        if (encoded.length > 20 * 1024 * 1024) throw new Error('ML_OVERLAY_TOO_LARGE');
        const overlay = await sharp(Buffer.from(encoded, 'base64'), { limitInputPixels: 25000000 }).png().toBuffer({ resolveWithObject: true });
        if (overlay.info.width !== image.width || overlay.info.height !== image.height) throw new Error('ML_OVERLAY_DIMENSIONS');
        const key = this.storage.key('png'); await this.storage.put(key, overlay.data, 'image/png'); pendingKeys.push(key);
        artifacts.push({ kind, storageKey: key, mimeType: 'image/png' });
      }
      const written = await this.db.$transaction(async tx => {
        await tx.$queryRaw`SELECT id FROM "Analysis" WHERE id = ${analysis.id}::uuid FOR UPDATE`;
        const current = await tx.analysis.findFirst({ where: { id: analysis.id, inputRevision: job.revision, status: 'RUNNING', processingConsent: true, ...availableWhere(), ...(capabilities.externalAiRequired ? { externalAiConsent: true } : {}) } });
        const currentJob = await tx.analysisJob.findFirst({ where: { id: job.id, status: 'RUNNING' } });
        if (!current || !currentJob) return false;
        const assetRefs: Record<string, string> = {};
        for (const artifact of artifacts) {
          const saved = await tx.artifact.create({ data: { ...artifact, analysisId: analysis.id } });
          assetRefs[artifact.kind === 'MASK' ? 'maskAssetId' : 'heatmapAssetId'] = saved.id;
        }
        await tx.analysis.update({ where: { id: analysis.id }, data: { status: 'FINISHED', completedAt: new Date(), errorCode: null, errorMessage: null, riskLevel: result.riskLevel,
          result: { ...result, ...assetRefs, primaryImageId: image.id, aggregationMethod: 'PRIMARY_IMAGE', imageResults: analysis.images.map(i => ({ imageId: i.id, inferencePerformed: i.id === image.id, reason: i.id === image.id ? 'PRIMARY_IMAGE' : 'ADDITIONAL_OBSERVATION_ONLY' })) } as Prisma.InputJsonValue } });
        await tx.analysisJob.update({ where: { id: job.id }, data: { status: 'COMPLETED', leasedUntil: null } });
        return true;
      });
      if (written) pendingKeys.length = 0;
      else await this.db.analysisJob.updateMany({ where: { id: job.id, status: 'RUNNING' }, data: { status: 'CANCELLED', leasedUntil: null } });
    } catch (error) {
      let code = 'ANALYSIS_FAILED'; let message = 'Tahlil bajarilmadi. Qayta urinib ko‘ring.';
      if (error instanceof HttpException) {
        const body = error.getResponse() as { error?: { code?: string; message?: string } };
        code = body.error?.code || code; message = body.error?.message || message;
      } else if (error instanceof Error && /^(ML_|IMAGE_|CANCELLED)/.test(error.message)) code = error.message;
      await this.db.analysis.updateMany({ where: { id: job.analysisId, inputRevision: job.revision, status: { in: ['QUEUED', 'RUNNING'] }, deletedAt: null }, data: { status: 'FAILED', errorCode: code, errorMessage: message, completedAt: new Date() } });
      await this.db.analysisJob.updateMany({ where: { id: job.id, status: 'RUNNING' }, data: { status: 'FAILED', leasedUntil: null } });
    } finally { for (const key of pendingKeys) await this.storage.remove(key).catch(() => undefined); }
  }
}
