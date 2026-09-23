import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { createHash } from 'node:crypto';
import sharp from 'sharp';
import { PrismaService } from './prisma.service';
import { StorageService } from './storage.service';
import { MlService, Quality } from './ml.service';
import { DeletionService } from './deletion.service';
import { AnalysisDto, CaseDto, ConsentDto, RoiDto, SubmitDto, SymptomsDto } from './dto';
import { fail } from './common';
import { analysisInclude, analysisJson, caseJson, consentJson } from './serialization';
import { config } from './config';

export function validRoi(roi: { x: number; y: number; width: number; height: number }) {
  return Object.values(roi).every(Number.isFinite) && roi.x >= 0 && roi.y >= 0 && roi.width > 0 && roi.height > 0 && roi.x + roi.width <= 1.000001 && roi.y + roi.height <= 1.000001;
}
export function availableWhere() { return { deletedAt: null, OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] }; }
export function assertMutable(status: string) { if (status !== 'DRAFT') fail(409, 'ANALYSIS_IMMUTABLE', 'Yuborilgan tahlilni o‘zgartirib bo‘lmaydi. Yangi tahlil yarating.'); }

@Injectable()
export class AnalysesService {
  constructor(private readonly db: PrismaService, private readonly storage: StorageService, private readonly ml: MlService, private readonly deletion: DeletionService) {}
  async own(userId: string, id: string) {
    const record = await this.db.analysis.findFirst({ where: { id, userId, ...availableWhere(), case: { deletedAt: null }, user: { deletedAt: null } }, include: analysisInclude });
    if (!record) fail(404, 'NOT_FOUND', 'Tahlil topilmadi yoki saqlash muddati tugagan.');
    return record;
  }
  async get(userId: string, id: string) { return analysisJson(await this.own(userId, id)); }
  async createCase(userId: string, body: CaseDto) {
    if (!body.label.trim() || !body.bodyLocation.trim()) fail(400, 'VALIDATION_ERROR', 'Kuzatuv nomi va tana joyini kiriting.');
    return caseJson(await this.db.case.create({ data: { userId, title: body.label.trim(), bodyLocation: body.bodyLocation.trim() } }));
  }
  async listCases(userId: string, query: Record<string, string> = {}) {
    const limit = Math.max(1, Math.min(100, Number(query.limit) || 50));
    if (query.cursor && !/^[a-f0-9-]{36}$/i.test(query.cursor)) fail(400, 'INVALID_CURSOR', 'Sahifa ko‘rsatkichi noto‘g‘ri.');
    const items = await this.db.case.findMany({ where: { userId, deletedAt: null }, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], take: limit + 1, ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}), include: { _count: { select: { analyses: { where: { historyConsent: true, ...availableWhere() } } } } } });
    const more = items.length > limit; if (more) items.pop();
    return { items: items.map(caseJson), nextCursor: more ? items[items.length - 1].id : null };
  }
  async getCase(userId: string, id: string) {
    const item = await this.db.case.findFirst({ where: { id, userId, deletedAt: null }, include: { analyses: { where: { historyConsent: true, ...availableWhere() }, include: analysisInclude, orderBy: { createdAt: 'desc' } } } });
    if (!item) fail(404, 'NOT_FOUND', 'Kuzatuv topilmadi.');
    return caseJson(item);
  }
  async create(userId: string, dto: AnalysisDto) {
    await this.getCase(userId, dto.caseId);
    const item = await this.db.analysis.create({ data: { userId, caseId: dto.caseId, expiresAt: new Date(Date.now() + config.tempMinutes * 60000) }, include: analysisInclude });
    return analysisJson(item);
  }
  async list(userId: string, query: Record<string, string>) {
    const limit = Math.max(1, Math.min(50, Number(query.limit) || 20));
    const createdAt: { gte?: Date; lte?: Date } = {};
    if (query.dateFrom) { createdAt.gte = new Date(query.dateFrom); if (isNaN(createdAt.gte.getTime())) fail(400, 'INVALID_DATE', 'Boshlanish sanasi noto‘g‘ri.'); }
    if (query.dateTo) { createdAt.lte = new Date(query.dateTo); if (isNaN(createdAt.lte.getTime())) fail(400, 'INVALID_DATE', 'Tugash sanasi noto‘g‘ri.'); }
    if (query.cursor && !/^[a-f0-9-]{36}$/i.test(query.cursor)) fail(400, 'INVALID_CURSOR', 'Sahifa ko‘rsatkichi noto‘g‘ri.');
    const items = await this.db.analysis.findMany({ where: { userId, historyConsent: true, ...availableWhere(), ...(query.caseId ? { caseId: query.caseId } : {}), ...(query.status ? { status: query.status } : {}), ...(query.riskLevel ? { riskLevel: query.riskLevel } : {}), createdAt },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], take: limit + 1, ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}), include: analysisInclude });
    const more = items.length > limit;
    if (more) items.pop();
    return { items: items.map(analysisJson), nextCursor: more ? items[items.length - 1].id : null };
  }
  async consents(userId: string) {
    const events = await this.db.consentEvent.findMany({ where: { analysis: { userId, ...availableWhere() } }, orderBy: { createdAt: 'desc' }, take: 100 });
    return { items: events.flatMap(event => ([['PROCESSING', event.processing], ['HISTORY_STORAGE', event.history], ['RESEARCH', event.research], ['EXTERNAL_AI', event.externalAi]] as const).map(([scope, granted]) => ({ id: `${event.id}:${scope}`, analysisId: event.analysisId, scope, granted, policyVersion: event.version, createdAt: event.createdAt }))), nextCursor: null };
  }
  async consent(userId: string, dto: ConsentDto) {
    const item = await this.own(userId, dto.analysisId);
    if (!dto.processing && (dto.history || dto.research || dto.externalAi)) fail(400, 'CONSENT_INVALID', 'Qayta ishlash roziligisiz qo‘shimcha roziliklarni yoqib bo‘lmaydi.');
    if (!dto.history && dto.research) fail(400, 'CONSENT_INVALID', 'Tadqiqotga rozilik berish uchun saqlashga ham rozilik zarur.');
    const updated = await this.db.$transaction(async tx => {
      await tx.$queryRaw`SELECT id FROM "Analysis" WHERE id = ${item.id}::uuid FOR UPDATE`;
      const current = await tx.analysis.findFirst({ where: { id: item.id, userId, ...availableWhere() } });
      if (!current) fail(404, 'NOT_FOUND', 'Tahlil mavjud emas.');
      const updated = await tx.analysis.update({ where: { id: item.id }, data: { processingConsent: dto.processing, historyConsent: dto.history, researchConsent: dto.research, externalAiConsent: dto.externalAi || false, consentVersion: dto.policyVersion, consentedAt: new Date(), expiresAt: dto.history ? null : new Date(current.createdAt.getTime() + config.tempMinutes * 60000), ...(!dto.processing || (current.externalAiConsent && !dto.externalAi && ['QUEUED', 'RUNNING'].includes(current.status)) ? { status: 'CANCELLED' } : {}) } });
      await tx.consentEvent.create({ data: { analysisId: item.id, processing: dto.processing, history: dto.history, research: dto.research, externalAi: dto.externalAi || false, version: dto.policyVersion } });
      if (dto.history) await tx.case.update({ where: { id: item.caseId }, data: { retained: true } });
      if (!dto.processing || (current.externalAiConsent && !dto.externalAi)) await tx.analysisJob.updateMany({ where: { analysisId: item.id, status: { in: ['PENDING', 'RUNNING'] } }, data: { status: 'CANCELLED' } });
      return updated;
    });
    if ((item.historyConsent && !dto.history) || (item.processingConsent && !dto.processing)) await this.deletion.request(userId, 'ANALYSIS', item.id);
    return consentJson(updated);
  }
  async upload(userId: string, id: string, files: Express.Multer.File[]) {
    const item = await this.own(userId, id); assertMutable(item.status);
    if (!item.processingConsent) fail(403, 'CONSENT_REQUIRED', 'Avval suratni qayta ishlashga rozilik bering.');
    if (!files?.length || files.length + item.images.length > 5) fail(400, 'IMAGE_LIMIT', 'Bir tahlilda 1–5 ta surat bo‘lishi mumkin.');
    if (files.reduce((sum, f) => sum + f.size, 0) + item.images.reduce((sum, i) => sum + i.byteSize, 0) > 30 * 1024 * 1024) fail(400, 'TOTAL_SIZE_LIMIT', 'Jami surat hajmi 30 MiB dan oshmasin.');
    const prepared: { storageKey: string; mimeType: string; byteSize: number; width: number; height: number; sha256: string; transform: Prisma.InputJsonValue }[] = [];
    try {
      for (const file of files) {
        if (file.size > 10 * 1024 * 1024) fail(400, 'FILE_TOO_LARGE', 'Bitta surat 10 MiB dan oshmasin.');
        let data: Buffer; let width: number; let height: number; let orientation: number;
        try {
          const image = sharp(file.buffer, { limitInputPixels: 25000000, animated: true, failOn: 'warning' });
          const meta = await image.metadata();
          const expected: Record<string, string> = { jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp' };
          if (!meta.format || !expected[meta.format] || expected[meta.format] !== file.mimetype || (meta.pages || 1) !== 1) fail(400, 'INVALID_IMAGE_FORMAT', 'Faqat haqiqiy JPEG, PNG yoki WebP surat yuboring.');
          if (!meta.width || !meta.height || Math.min(meta.width, meta.height) < 256) fail(400, 'IMAGE_TOO_SMALL', 'Suratning qisqa tomoni kamida 256 piksel bo‘lsin.');
          orientation = meta.orientation || 1;
          const normalized = await image.rotate().jpeg({ quality: 92 }).toBuffer({ resolveWithObject: true });
          data = normalized.data; width = normalized.info.width; height = normalized.info.height;
        } catch (error) { if (error && typeof error === 'object' && 'getStatus' in error) throw error; fail(400, 'INVALID_IMAGE', 'Surat buzilgan, juda katta yoki format noto‘g‘ri.'); }
        const storageKey = this.storage.key('jpg');
        await this.storage.put(storageKey, data, 'image/jpeg');
        prepared.push({ storageKey, mimeType: 'image/jpeg', byteSize: data.length, width, height, sha256: createHash('sha256').update(data).digest('hex'), transform: { originalOrientation: orientation, normalizedWidth: width, normalizedHeight: height, modelCoordinateSpace: 'normalized_0_1' } });
      }
      await this.db.$transaction(async tx => {
        await tx.$queryRaw`SELECT id FROM "Analysis" WHERE id = ${id}::uuid FOR UPDATE`;
        const current = await tx.analysis.findFirst({ where: { id, userId, ...availableWhere() }, include: { images: true } });
        if (!current || !current.processingConsent) fail(403, 'CONSENT_REQUIRED', 'Rozilik bekor qilingan yoki tahlil o‘chirilgan.');
        assertMutable(current.status);
        if (current.images.length + prepared.length > 5) fail(400, 'IMAGE_LIMIT', 'Suratlar soni oshib ketdi.');
        if (current.images.reduce((sum, i) => sum + i.byteSize, 0) + prepared.reduce((sum, i) => sum + i.byteSize, 0) > 30 * 1024 * 1024) fail(400, 'TOTAL_SIZE_LIMIT', 'Jami hajm chegaradan oshdi.');
        await tx.image.createMany({ data: prepared.map(image => ({ ...image, analysisId: id })) });
        await tx.analysis.update({ where: { id }, data: { status: 'DRAFT', errorCode: null, errorMessage: null } });
      });
    } catch (error) { for (const image of prepared) await this.storage.remove(image.storageKey).catch(() => undefined); throw error; }
    return this.get(userId, id);
  }
  async removeImage(userId: string, id: string, imageId: string) {
    await this.db.$transaction(async tx => {
      await tx.$queryRaw`SELECT id FROM "Analysis" WHERE id = ${id}::uuid FOR UPDATE`;
      const item = await tx.analysis.findFirst({ where: { id, userId, ...availableWhere() }, include: { images: true } });
      if (!item) fail(404, 'NOT_FOUND', 'Tahlil topilmadi.');
      assertMutable(item.status);
      const image = item.images.find(i => i.id === imageId);
      if (!image) fail(404, 'NOT_FOUND', 'Surat topilmadi.');
      await this.storage.remove(image.storageKey);
      await tx.image.delete({ where: { id: image.id } });
    });
    return this.get(userId, id);
  }
  async roi(userId: string, id: string, imageId: string, dto: RoiDto) {
    const roi = dto.roi === null ? null : { x: dto.x!, y: dto.y!, width: dto.width!, height: dto.height! };
    if (roi && !validRoi(roi)) fail(400, 'INVALID_ROI', 'Belgilangan hudud surat chegarasida bo‘lishi kerak.');
    await this.db.$transaction(async tx => {
      await tx.$queryRaw`SELECT id FROM "Analysis" WHERE id = ${id}::uuid FOR UPDATE`;
      const item = await tx.analysis.findFirst({ where: { id, userId, ...availableWhere() } });
      if (!item) fail(404, 'NOT_FOUND', 'Tahlil topilmadi.');
      assertMutable(item.status);
      const image = await tx.image.findFirst({ where: { id: imageId, analysisId: id } });
      if (!image) fail(404, 'NOT_FOUND', 'Surat topilmadi.');
      await tx.image.update({ where: { id: imageId }, data: { roi: roi || Prisma.DbNull } });
    });
    return this.get(userId, id);
  }
  async quality(userId: string, id: string) {
    const item = await this.own(userId, id); assertMutable(item.status);
    if (!item.processingConsent) fail(403, 'CONSENT_REQUIRED', 'Qayta ishlash uchun rozilik zarur.');
    if (!item.images.length) fail(400, 'IMAGES_REQUIRED', 'Avval surat yuklang.');
    for (const image of item.images) {
      const quality = await this.ml.quality(await this.storage.read(image.storageKey));
      const current = await this.own(userId, id);
      if (!current.processingConsent) fail(403, 'CONSENT_REQUIRED', 'Rozilik bekor qilingan.');
      assertMutable(current.status);
      await this.db.image.updateMany({ where: { id: image.id, analysis: { deletedAt: null, processingConsent: true, status: { in: ['DRAFT', 'FAILED'] } } }, data: { quality: quality as Prisma.InputJsonValue } });
    }
    return this.get(userId, id);
  }
  async symptoms(userId: string, id: string, dto: SymptomsDto) {
    await this.db.$transaction(async tx => {
      await tx.$queryRaw`SELECT id FROM "Analysis" WHERE id = ${id}::uuid FOR UPDATE`;
      const item = await tx.analysis.findFirst({ where: { id, userId, ...availableWhere() } });
      if (!item) fail(404, 'NOT_FOUND', 'Tahlil topilmadi.');
      assertMutable(item.status);
      if (!item.processingConsent) fail(403, 'CONSENT_REQUIRED', 'Qayta ishlash uchun rozilik zarur.');
      await tx.analysis.update({ where: { id }, data: { symptoms: { ...dto, questionnaireVersion: '1.0' } as Prisma.InputJsonValue } });
    });
    return this.get(userId, id);
  }
  async submit(userId: string, id: string, dto: SubmitDto, suppliedKey?: string) {
    const capabilities = await this.ml.capabilities();
    if (suppliedKey && (suppliedKey.length > 128 || !/^[A-Za-z0-9:_-]+$/.test(suppliedKey))) fail(400, 'INVALID_IDEMPOTENCY_KEY', 'So‘rov identifikatori noto‘g‘ri.');
    const bodyHash = createHash('sha256').update(JSON.stringify({ primaryImageId: dto.primaryImageId || null, acknowledgeWarnings: dto.acknowledgeWarnings || false })).digest('hex');
    await this.db.$transaction(async tx => {
      await tx.$queryRaw`SELECT id FROM "Analysis" WHERE id = ${id}::uuid FOR UPDATE`;
      const item = await tx.analysis.findFirst({ where: { id, userId, ...availableWhere() }, include: { images: true } });
      if (!item) fail(404, 'NOT_FOUND', 'Tahlil topilmadi.');
      const key = suppliedKey || `${id}:${item.inputRevision}`;
      const previous = await tx.submissionRequest.findUnique({ where: { userId_key: { userId, key } } });
      if (previous) {
        if (previous.bodyHash !== bodyHash || previous.analysisId !== id) fail(409, 'IDEMPOTENCY_CONFLICT', 'Bu so‘rov identifikatori boshqa ma’lumot uchun ishlatilgan.');
        return;
      }
      if (['QUEUED', 'RUNNING', 'FINISHED'].includes(item.status)) return;
      if (item.status !== 'FAILED') assertMutable(item.status);
      if (!item.processingConsent) fail(403, 'CONSENT_REQUIRED', 'Qayta ishlash uchun rozilik zarur.');
      if (capabilities.externalAiRequired && !item.externalAiConsent) fail(403, 'EXTERNAL_AI_CONSENT_REQUIRED', 'Surat va simptomlarni OpenAI xizmatiga yuborish uchun alohida rozilik zarur.');
      if (!item.images.length) fail(400, 'IMAGES_REQUIRED', 'Avval surat yuklang.');
      if (!item.symptoms) fail(400, 'SYMPTOMS_REQUIRED', 'Simptom savollariga javob bering.');
      const qualities = item.images.map(i => i.quality as Quality | null);
      if (qualities.some(q => !q)) fail(400, 'QUALITY_CHECK_REQUIRED', 'Avval surat sifatini tekshiring.');
      if (qualities.some(q => q?.decision === 'REJECT')) fail(400, 'IMAGE_QUALITY_REJECTED', 'Rad etilgan suratni almashtiring yoki o‘chiring.');
      if (qualities.some(q => q?.decision === 'WARN') && !dto.acknowledgeWarnings) fail(400, 'QUALITY_WARNING_ACK_REQUIRED', 'Sifat ogohlantirishlarini ko‘rib, davom etishni tasdiqlang.');
      const primaryImageId = dto.primaryImageId || item.images[0].id;
      if (!item.images.some(i => i.id === primaryImageId)) fail(400, 'INVALID_PRIMARY_IMAGE', 'Asosiy surat shu tahlilga tegishli bo‘lsin.');
      const revision = item.status === 'FAILED' ? item.inputRevision + 1 : item.inputRevision;
      await tx.analysis.update({ where: { id }, data: { status: 'QUEUED', submittedAt: new Date(), completedAt: null, inputRevision: revision, primaryImageId, errorCode: null, errorMessage: null, result: Prisma.DbNull } });
      await tx.analysisJob.upsert({ where: { analysisId_revision: { analysisId: id, revision } }, create: { analysisId: id, revision }, update: {} });
      await tx.submissionRequest.create({ data: { userId, key, bodyHash, analysisId: id } });
    });
    return this.get(userId, id);
  }
  async cancel(userId: string, id: string) {
    const item = await this.own(userId, id);
    if (item.status === 'FINISHED') fail(409, 'ALREADY_FINISHED', 'Tahlil tugagan. O‘chirish amalidan foydalaning.');
    await this.db.$transaction([this.db.analysis.updateMany({ where: { id, userId, status: { in: ['DRAFT', 'QUEUED', 'RUNNING', 'FAILED'] } }, data: { status: 'CANCELLED' } }), this.db.analysisJob.updateMany({ where: { analysisId: id }, data: { status: 'CANCELLED', leasedUntil: null } })]);
    return this.get(userId, id);
  }
  async compare(userId: string, caseId: string, leftId: string, rightId: string) {
    if (!leftId || !rightId || leftId === rightId) fail(400, 'COMPARE_INVALID', 'Ikkita turli kuzatuvni tanlang.');
    const [left, right] = await Promise.all([this.own(userId, leftId), this.own(userId, rightId)]);
    if (left.caseId !== caseId || right.caseId !== caseId || !left.historyConsent || !right.historyConsent) fail(404, 'NOT_FOUND', 'Taqqoslash uchun saqlangan bir kuzatuvga tegishli tahlillar kerak.');
    return { left: analysisJson(left), right: analysisJson(right), limitations: ['Suratning rakursi va yorug‘ligi farq qilishi mumkin.', 'Fizik masshtab va tasvirlarni moslashtirishsiz o‘sish foizi hisoblanmaydi.', 'Model versiyalari farq qilsa, ballar to‘g‘ridan-to‘g‘ri taqqoslanmaydi.'] };
  }
}
