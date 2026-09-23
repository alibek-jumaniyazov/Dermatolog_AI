import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import { config } from './config';
import { fail } from './common';

export const classCodes = ['SUSPICIOUS_PIGMENTED', 'NEVUS', 'ECZEMA_DERMATITIS', 'PSORIASIS', 'ACNE', 'FUNGAL_INFECTION'] as const;
const qualityCheck = z.object({ code: z.string(), status: z.enum(['PASS', 'WARN', 'REJECT', 'NOT_ASSESSED']), value: z.number().finite().optional(), message: z.string() });
export const qualitySchema = z.object({ decision: z.enum(['PASS', 'WARN', 'REJECT']), assessmentComplete: z.boolean(), checks: z.array(qualityCheck), width: z.number().optional(), height: z.number().optional(), sha256: z.string().optional() });
export const differentialSchema = z.object({
  classCode: z.enum([...classCodes, 'OTHER']),
  condition: z.string().trim().min(1),
  supportingFeatures: z.array(z.string()),
  uncertainties: z.array(z.string()),
});
export const inferenceSchema = z.object({
  analysisId: z.string().optional(), imageId: z.string().optional(), inputRevision: z.number().optional(), normalizedImageHash: z.string(),
  modelVersion: z.string(), artifactSha256: z.string().nullable(), pipelineVersion: z.string(),
  predictions: z.array(z.object({ classCode: z.enum(classCodes), score: z.number().finite().min(0).max(1).nullable(), scoreType: z.enum(['CALIBRATED_PROBABILITY', 'UNCALIBRATED_SCORE', 'NOT_CALIBRATED']) })),
  malignantProbability: z.number().finite().min(0).max(1).nullable(), calibrationStatus: z.enum(['NOT_AVAILABLE', 'CALIBRATED']),
  qualityDecision: z.enum(['PASS', 'WARN', 'REJECT']), qualityChecks: z.array(qualityCheck), assessmentComplete: z.boolean(),
  segmentation: z.object({ available: z.boolean(), reason: z.string().optional(), maskPngBase64: z.string().optional(), source: z.string().optional(), modelVersion: z.string().optional() }),
  attribution: z.object({ available: z.boolean(), reason: z.string().optional(), heatmapPngBase64: z.string().optional(), targetClass: z.string().optional(), method: z.string().optional() }),
  uncertaintyReasons: z.array(z.string()), domainStatus: z.enum(['SUPPORTED', 'UNSUPPORTED']),
  timing: z.object({ inferenceMs: z.number().finite().nonnegative() }),
  outcome: z.string().optional(), riskLevel: z.string().optional(), summary: z.string().optional(),
  observations: z.array(z.string()).optional(), limitations: z.array(z.string()).optional(),
  differential: z.array(differentialSchema).optional(),
  nextSteps: z.array(z.string()).optional(), followUpQuestions: z.array(z.string()).optional(),
  imageAssessment: z.object({ skinVisible: z.boolean(), imageSuitable: z.boolean(), reason: z.string() }).optional(),
  analysisMode: z.literal('VISUAL_DIFFERENTIAL').optional(),
  provider: z.union([z.string(), z.object({ name: z.string(), model: z.string().optional(), promptVersion: z.string().optional(), store: z.boolean().optional() })]).optional(),
});
export type Inference = z.infer<typeof inferenceSchema>;
export type Quality = z.infer<typeof qualitySchema>;

@Injectable()
export class MlService {
  async capabilities() {
    try {
      const response = await fetch(`${config.mlUrl}/capabilities`, { headers: { 'X-Service-Token': config.mlToken }, signal: AbortSignal.timeout(5000) });
      if (!response.ok) throw new Error('Unavailable');
      const data = await response.json() as Record<string, unknown>;
      const provider = data.provider === 'openai' || process.env.AI_PROVIDER === 'openai' ? 'openai' : 'local';
      return { classification: data.classification === true, segmentation: data.segmentation === true, quality: data.quality !== false, offlineInference: false,
        modelStatus: data.modelStatus === 'READY' ? 'READY' : 'MODEL_NOT_READY',
        message: typeof data.message === 'string' ? data.message : 'Tasdiqlangan model ulanmagan. Diagnostik xulosa chiqarilmaydi.',
        classes: Array.isArray(data.classes) ? data.classes : [], smtp: !!process.env.SMTP_HOST, provider,
        externalAiRequired: provider === 'openai', aiReview: data.aiReview === true };
    } catch {
      return { classification: false, segmentation: false, quality: false, offlineInference: false, modelStatus: 'UNAVAILABLE', message: 'Tahlil xizmati bilan aloqa yo‘q.', classes: [], smtp: !!process.env.SMTP_HOST, provider: process.env.AI_PROVIDER === 'openai' ? 'openai' : 'local', externalAiRequired: process.env.AI_PROVIDER === 'openai', aiReview: false };
    }
  }
  async quality(data: Buffer) {
    const form = new FormData();
    form.append('image', new Blob([new Uint8Array(data)], { type: 'image/jpeg' }), 'image.jpg');
    return qualitySchema.parse(await this.request('/quality', form, 20000));
  }
  async infer(data: Buffer, fields: { analysisId: string; imageId: string; inputRevision: number; symptoms: unknown; roi: unknown; externalAi: boolean }) {
    const form = new FormData();
    form.append('image', new Blob([new Uint8Array(data)], { type: 'image/jpeg' }), 'image.jpg');
    form.append('analysisId', fields.analysisId); form.append('imageId', fields.imageId); form.append('inputRevision', String(fields.inputRevision));
    form.append('symptomsJson', JSON.stringify(fields.symptoms)); form.append('roiJson', JSON.stringify(fields.roi)); form.append('inputDomain', 'clinical');
    form.append('external_consent', String(fields.externalAi));
    const parsed = inferenceSchema.safeParse(await this.request('/infer', form, 100000));
    if (!parsed.success) fail(502, 'ML_INVALID_RESPONSE', 'Tahlil xizmati mos bo‘lmagan javob qaytardi.');
    return parsed.data;
  }
  private async request(path: string, body: FormData, timeout: number) {
    let response: globalThis.Response;
    try { response = await fetch(config.mlUrl + path, { method: 'POST', headers: { 'X-Service-Token': config.mlToken }, body, signal: AbortSignal.timeout(timeout) }); }
    catch (error) { fail(503, (error as Error).name === 'TimeoutError' ? 'ML_TIMEOUT' : 'ML_UNAVAILABLE', 'Tahlil xizmati hozir javob bermayapti.'); }
    const data = await response.json().catch(() => ({})) as { error?: { code?: string; message?: string } };
    if (!response.ok) fail(response.status, data.error?.code || 'ML_ERROR', data.error?.message || 'Tahlil bajarilmadi.');
    return data;
  }
}
