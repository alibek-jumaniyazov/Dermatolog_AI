import { Analysis, Artifact, Case, Image } from '@prisma/client';

export type HydratedAnalysis = Analysis & { images: Image[]; case?: Case; artifacts?: Artifact[] };
export const analysisInclude = { images: { orderBy: { createdAt: 'asc' as const } }, case: true, artifacts: true };
export const caseJson = (item: Case & { _count?: { analyses: number }; analyses?: HydratedAnalysis[] }): { id: string; label: string; bodyLocation: string; createdAt: Date; updatedAt: Date; _count?: { analyses: number }; analyses?: unknown[] } => ({ id: item.id, label: item.title, bodyLocation: item.bodyLocation, createdAt: item.createdAt, updatedAt: item.updatedAt, ...(item._count ? { _count: item._count } : {}), ...(item.analyses ? { analyses: item.analyses.map(analysisJson) } : {}) });
export const consentJson = (item: Analysis) => ({ processing: item.processingConsent, history: item.historyConsent, research: item.researchConsent, externalAi: item.externalAiConsent });
export function analysisJson(item: HydratedAnalysis) {
  const terminal = ['FINISHED', 'FAILED', 'CANCELLED'].includes(item.status);
  const result = item.result as Record<string, unknown> | null;
  return {
    id: item.id, caseId: item.caseId, isDemo: item.isDemo, createdAt: item.createdAt, updatedAt: item.updatedAt, expiresAt: item.expiresAt,
    retentionMode: item.historyConsent ? 'HISTORY' : 'TEMPORARY', processingStatus: item.status,
    outcome: result?.outcome || (item.errorCode === 'IMAGE_QUALITY_REJECTED' ? 'QUALITY_REJECTED' : null),
    failureCode: item.errorCode, failureMessage: item.errorMessage,
    stage: item.status === 'RUNNING' ? 'ANALYSIS' : terminal ? null : item.status,
    case: item.case ? caseJson(item.case) : undefined,
    images: item.images.map(image => ({ id: image.id, width: image.width, height: image.height, byteSize: image.byteSize, mimeType: image.mimeType, quality: image.quality, roi: image.roi, createdAt: image.createdAt })),
    symptoms: item.symptoms, consents: consentJson(item), result,
    primaryImageId: item.primaryImageId, inputRevision: item.inputRevision, submittedAt: item.submittedAt, completedAt: item.completedAt,
  };
}
