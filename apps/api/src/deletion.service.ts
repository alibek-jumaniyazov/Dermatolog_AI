import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { StorageService } from './storage.service';
import { fail } from './common';
import { config } from './config';

type Scope = 'ANALYSIS' | 'CASE' | 'MEDICAL_DATA' | 'ACCOUNT';
@Injectable()
export class DeletionService {
  private lastOrphanSweep = 0;
  constructor(private readonly db: PrismaService, private readonly storage: StorageService) {}
  async request(userId: string, scope: Scope, targetId?: string) {
    return this.db.$transaction(async tx => {
      if (scope === 'ANALYSIS' && !await tx.analysis.findFirst({ where: { id: targetId, userId, deletedAt: null } })) fail(404, 'NOT_FOUND', 'Tahlil topilmadi.');
      if (scope === 'CASE' && !await tx.case.findFirst({ where: { id: targetId, userId, deletedAt: null } })) fail(404, 'NOT_FOUND', 'Kuzatuv topilmadi.');
      const where = { userId, ...(scope === 'ANALYSIS' ? { id: targetId } : {}), ...(scope === 'CASE' ? { caseId: targetId } : {}) };
      const now = new Date();
      // Mark first: uploads/results recheck this flag under their transaction before writing.
      await tx.analysis.updateMany({ where, data: { deletedAt: now, processingConsent: false, externalAiConsent: false, status: 'CANCELLED' } });
      const analyses = await tx.analysis.findMany({ where, include: { images: true, artifacts: true } });
      const ids = analyses.map(a => a.id);
      await tx.analysisJob.updateMany({ where: { analysisId: { in: ids } }, data: { status: 'CANCELLED', leasedUntil: null } });
      if (scope === 'CASE') await tx.case.updateMany({ where: { id: targetId, userId }, data: { deletedAt: now } });
      if (scope === 'MEDICAL_DATA' || scope === 'ACCOUNT') await tx.case.updateMany({ where: { userId }, data: { deletedAt: now } });
      if (scope === 'ACCOUNT') {
        await tx.user.update({ where: { id: userId }, data: { deletedAt: now } });
        await tx.session.updateMany({ where: { userId }, data: { revokedAt: now } });
        await tx.resetToken.deleteMany({ where: { userId } });
      }
      const storageKeys = analyses.flatMap(a => [...a.images.map(i => i.storageKey), ...a.artifacts.map(i => i.storageKey)]);
      const deletion = await tx.deletionRequest.create({ data: { userId, scope, targetId, storageKeys } });
      await tx.auditEvent.create({ data: { actorId: userId, action: 'DELETION_REQUESTED', targetId: deletion.id } });
      return { id: deletion.id, status: deletion.status };
    });
  }
  async status(userId: string, id: string) {
    const item = await this.db.deletionRequest.findFirst({ where: { id, userId }, select: { id: true, status: true, createdAt: true, completedAt: true } });
    if (!item) fail(404, 'NOT_FOUND', 'O‘chirish so‘rovi topilmadi.');
    return item;
  }
  async cleanup() {
    const expired = await this.db.analysis.findMany({ where: { deletedAt: null, expiresAt: { lte: new Date() } }, select: { id: true, userId: true }, take: 20 });
    for (const item of expired) await this.request(item.userId, 'ANALYSIS', item.id).catch(() => undefined);
    const requests = await this.db.deletionRequest.findMany({ where: { status: { in: ['PENDING', 'RUNNING', 'FAILED'] }, attempts: { lt: 20 } }, orderBy: { createdAt: 'asc' }, take: 20 });
    for (const item of requests) {
      try {
        await this.db.deletionRequest.update({ where: { id: item.id }, data: { status: 'RUNNING', attempts: { increment: 1 } } });
        for (const key of item.storageKeys as string[]) await this.storage.remove(key);
        await this.db.$transaction(async tx => {
          const where = { userId: item.userId, deletedAt: { not: null }, ...(item.scope === 'ANALYSIS' ? { id: item.targetId! } : {}), ...(item.scope === 'CASE' ? { caseId: item.targetId! } : {}) };
          await tx.analysis.deleteMany({ where });
          if (item.scope === 'CASE') await tx.case.deleteMany({ where: { id: item.targetId!, userId: item.userId, deletedAt: { not: null } } });
          if (item.scope === 'MEDICAL_DATA' || item.scope === 'ACCOUNT') await tx.case.deleteMany({ where: { userId: item.userId, deletedAt: { not: null } } });
          if (item.scope === 'ACCOUNT') {
            await tx.auditEvent.deleteMany({ where: { actorId: item.userId } });
            await tx.user.deleteMany({ where: { id: item.userId, deletedAt: { not: null } } });
          }
          await tx.deletionRequest.update({ where: { id: item.id }, data: { status: 'COMPLETED', completedAt: new Date(), lastError: null, storageKeys: [] } });
        });
      } catch {
        await this.db.deletionRequest.update({ where: { id: item.id }, data: { status: 'FAILED', lastError: 'CLEANUP_RETRY_REQUIRED' } }).catch(() => undefined);
      }
    }
    await this.db.auditEvent.deleteMany({ where: { createdAt: { lt: new Date(Date.now() - 30 * 86400000) } } });
    await this.db.resetToken.deleteMany({ where: { expiresAt: { lt: new Date() } } });
    await this.db.case.deleteMany({ where: { retained: false, createdAt: { lt: new Date(Date.now() - config.tempMinutes * 60000) }, analyses: { none: {} } } });
    if (Date.now() - this.lastOrphanSweep > 5 * 60000) {
      this.lastOrphanSweep = Date.now();
      // A one-hour grace period prevents racing an upload/report currently committing.
      for await (const keys of this.storage.staleKeys(new Date(Date.now() - 3600000))) {
        const [images, artifacts] = await Promise.all([
          this.db.image.findMany({ where: { storageKey: { in: keys } }, select: { storageKey: true } }),
          this.db.artifact.findMany({ where: { storageKey: { in: keys } }, select: { storageKey: true } }),
        ]);
        const referenced = new Set([...images, ...artifacts].map(item => item.storageKey));
        for (const key of keys) if (!referenced.has(key)) await this.storage.remove(key);
      }
    }
  }
}
