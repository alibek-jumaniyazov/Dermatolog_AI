import { Inference } from './ml.service';

export function riskFromProbability(value: number | null): 'LOW' | 'MEDIUM' | 'HIGH' | 'NOT_ASSESSED' {
  if (value === null || !Number.isFinite(value) || value < 0 || value > 1) return 'NOT_ASSESSED';
  return value >= 0.70 ? 'HIGH' : value >= 0.35 ? 'MEDIUM' : 'LOW';
}
export function buildResult(inference: Inference, symptoms: unknown) {
  const external = typeof inference.provider === 'object' ? inference.provider.name === 'openai' : inference.provider === 'openai';
  const canAssess = !external && inference.calibrationStatus === 'CALIBRATED' && inference.assessmentComplete && inference.domainStatus === 'SUPPORTED' && inference.qualityDecision !== 'REJECT' && !inference.uncertaintyReasons.length;
  const riskLevel = canAssess ? riskFromProbability(inference.malignantProbability) : 'NOT_ASSESSED';
  const answers = (symptoms || {}) as Record<string, unknown>;
  const symptomFlags = ['bleeding', 'changing', 'pain'].filter(key => answers[key] === 'YES');
  const recommendations = {
    LOW: 'Kuzatishni davom ettiring. Zarur bo‘lsa rejalashtirilgan dermatolog ko‘rigiga murojaat qiling.',
    MEDIUM: 'Yaqin vaqt ichida dermatolog bilan maslahatlashish tavsiya etiladi.',
    HIGH: 'Imkon qadar tez dermatolog ko‘rigiga murojaat qiling.',
    NOT_ASSESSED: 'Ishonchli tibbiy xulosa yetarli emas. Dermatolog bilan maslahatlashish tavsiya etiladi.',
  };
  return {
    predictions: inference.predictions, riskLevel, malignantProbability: canAssess ? inference.malignantProbability : null,
    uncertaintyReasons: inference.uncertaintyReasons, recommendation: recommendations[riskLevel] + (symptomFlags.length ? ' Qayd etgan simptomlaringizni shifokorga ayting.' : ''),
    modelVersion: inference.modelVersion, pipelineVersion: inference.pipelineVersion, provider: inference.provider || 'local',
    summary: inference.summary, observations: inference.observations || [], limitations: inference.limitations || [],
    differential: inference.differential || [], nextSteps: inference.nextSteps || [], followUpQuestions: inference.followUpQuestions || [],
    ...(inference.imageAssessment ? { imageAssessment: inference.imageAssessment } : {}),
    ...(inference.analysisMode ? { analysisMode: inference.analysisMode } : {}),
    symptomFlags, riskRuleVersion: 'prototype-v1', recommendationTemplateVersion: 'uz-v1', calibrationStatus: inference.calibrationStatus,
    disclaimer: 'Bu natija dastlabki skrining uchun. Yakuniy tashxisni dermatolog qo‘yadi.',
    outcome: inference.outcome || (riskLevel === 'NOT_ASSESSED' ? 'UNCERTAIN' : 'ASSESSED'),
    timing: inference.timing,
  };
}
