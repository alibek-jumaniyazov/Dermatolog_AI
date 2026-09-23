import { describe, expect, it } from 'vitest';
import { riskFromProbability, buildResult } from '../src/risk';
import { validRoi, assertMutable } from '../src/analyses.service';
import { inferenceSchema } from '../src/ml.service';

describe('Risk boundaries do not fabricate a low risk', () => {
  it.each([[0.3499, 'LOW'], [0.35, 'MEDIUM'], [0.6999, 'MEDIUM'], [0.70, 'HIGH'], [null, 'NOT_ASSESSED'], [NaN, 'NOT_ASSESSED'], [-1, 'NOT_ASSESSED'], [1.1, 'NOT_ASSESSED']] as const)('%s -> %s', (input, expected) => expect(riskFromProbability(input)).toBe(expected));
});
describe('Immutable analysis inputs and ROI provenance', () => {
  it('accepts normalized ROI and rejects overflow/nonfinite coordinates', () => {
    expect(validRoi({ x: 0.2, y: 0.1, width: 0.8, height: 0.5 })).toBe(true);
    expect(validRoi({ x: 0.9, y: 0, width: 0.2, height: 0.2 })).toBe(false);
    expect(validRoi({ x: NaN, y: 0, width: 0.2, height: 0.2 })).toBe(false);
  });
  it.each(['QUEUED', 'RUNNING', 'FINISHED', 'FAILED', 'CANCELLED'])('locks %s snapshots', status => expect(() => assertMutable(status)).toThrow());
  it('allows only draft edits', () => expect(() => assertMutable('DRAFT')).not.toThrow());
});
describe('External result schema', () => {
  const fixture = {
    normalizedImageHash: 'test-only-sha256', modelVersion: 'TEST_ONLY', artifactSha256: null, pipelineVersion: 'TEST_ONLY',
    predictions: [{ classCode: 'ACNE', score: null, scoreType: 'NOT_CALIBRATED' }],
    malignantProbability: null, calibrationStatus: 'NOT_AVAILABLE', qualityDecision: 'WARN', qualityChecks: [], assessmentComplete: false,
    segmentation: { available: false }, attribution: { available: false }, uncertaintyReasons: ['NOT_CLINICALLY_VALIDATED'], domainStatus: 'SUPPORTED', timing: { inferenceMs: 1 }, provider: 'openai',
  };
  it('rejects unbounded confidence instead of silently displaying it', () => {
    expect(inferenceSchema.safeParse(fixture).success).toBe(true);
    const result = inferenceSchema.safeParse({ ...fixture, predictions: [{ classCode: 'ACNE', score: 101, scoreType: 'CALIBRATED_PROBABILITY' }] });
    expect(result.success).toBe(false);
  });
  it('external/general-purpose output cannot become calibrated medical risk', () => {
    const inference = inferenceSchema.parse({ ...fixture, malignantProbability: 0.1, calibrationStatus: 'CALIBRATED', assessmentComplete: true, uncertaintyReasons: [] });
    const result = buildResult(inference, { bleeding: 'YES' });
    expect(result.riskLevel).toBe('NOT_ASSESSED'); expect(result.malignantProbability).toBeNull();
    expect(result.symptomFlags).toEqual(['bleeding']); expect(result.recommendation).toContain('Dermatolog');
  });
  it('a complete calibrated local result retains high risk despite symptom answers', () => {
    const inference = inferenceSchema.parse({ ...fixture, provider: 'local', malignantProbability: 0.8, calibrationStatus: 'CALIBRATED', assessmentComplete: true, uncertaintyReasons: [], qualityDecision: 'PASS' });
    expect(buildResult(inference, { bleeding: 'NO', pain: 'NO' }).riskLevel).toBe('HIGH');
  });
  const visualDifferential = {
    differential: [{ classCode: 'OTHER', condition: 'Ko‘rib chiqiladigan boshqa holat', supportingFeatures: ['Mahalliy qizarish ko‘rinadi.'], uncertainties: ['Boshlangan vaqt noma’lum.'] }],
    nextSteps: ['O‘zgarishlar haqida qayd yuriting.'], followUpQuestions: ['Bu belgi qachondan beri bor?'],
    imageAssessment: { skinVisible: true, imageSuitable: true, reason: 'Soha ko‘rinadi, ayrim tafsilotlar surat bilan cheklangan.' },
    analysisMode: 'VISUAL_DIFFERENTIAL', outcome: 'OBSERVATIONS_READY',
  };
  it.each(['openai', { name: 'openai', model: 'TEST_ONLY', promptVersion: 'TEST_ONLY', store: false }])('retains the visual differential without trusting upstream risk (%j)', provider => {
    const inference = inferenceSchema.parse({ ...fixture, ...visualDifferential, provider, riskLevel: 'HIGH', malignantProbability: 0.99, calibrationStatus: 'CALIBRATED', assessmentComplete: true, uncertaintyReasons: [] });
    const result = buildResult(inference, { changing: 'YES' });
    expect(result.differential).toEqual(visualDifferential.differential);
    expect(result.nextSteps).toEqual(visualDifferential.nextSteps);
    expect(result.followUpQuestions).toEqual(visualDifferential.followUpQuestions);
    expect(result.imageAssessment).toEqual(visualDifferential.imageAssessment);
    expect(result.analysisMode).toBe('VISUAL_DIFFERENTIAL');
    expect(result.outcome).toBe('OBSERVATIONS_READY');
    expect(result.riskLevel).toBe('NOT_ASSESSED'); expect(result.malignantProbability).toBeNull();
    expect(result.predictions[0].score).toBeNull();
  });
  it('accepts OTHER only in the differential, keeping classifier labels strict', () => {
    expect(inferenceSchema.safeParse({ ...fixture, ...visualDifferential }).success).toBe(true);
    expect(inferenceSchema.safeParse({ ...fixture, ...visualDifferential, predictions: [{ classCode: 'OTHER', score: null, scoreType: 'NOT_CALIBRATED' }] }).success).toBe(false);
    expect(inferenceSchema.safeParse({ ...fixture, differential: [{ ...visualDifferential.differential[0], supportingFeatures: 'not-an-array' }] }).success).toBe(false);
  });
  it.each(['OBSERVATIONS_READY', 'UNCERTAIN', 'IMAGE_UNSUITABLE', 'UNSUPPORTED_DOMAIN'])('preserves %s without creating a medical risk', outcome => {
    const result = buildResult(inferenceSchema.parse({ ...fixture, ...visualDifferential, outcome }), {});
    expect(result.outcome).toBe(outcome); expect(result.riskLevel).toBe('NOT_ASSESSED');
  });
  it('keeps legacy local responses valid without inventing an image assessment', () => {
    const result = buildResult(inferenceSchema.parse({ ...fixture, provider: 'local' }), {});
    expect(result.differential).toEqual([]); expect(result.nextSteps).toEqual([]); expect(result.followUpQuestions).toEqual([]);
    expect(result.imageAssessment).toBeUndefined(); expect(result.analysisMode).toBeUndefined();
  });
});
