import { describe, expect, it } from 'vitest';
import { statusText, uncertaintyMessages, uncertaintyText } from './text';

describe('Patient-facing AI explanation', () => {
  it('distinguishes useful visual observations from an unsuitable image', () => {
    expect(statusText.OBSERVATIONS_READY).toBe('AI tahlili tayyor');
    expect(statusText.IMAGE_UNSUITABLE).toBe('Surat yetarlicha aniq emas');
    expect(statusText.UNCERTAIN).toBe('Noaniq natija');
  });
  it('translates reasons supplied by the current providers without leaking raw codes', () => {
    const reasons = uncertaintyMessages(['GENERAL_PURPOSE_VISION_NOT_CLINICALLY_VALIDATED', 'NO_CALIBRATED_DISEASE_PROBABILITY', 'QUALITY_ASSESSMENT_INCOMPLETE', 'USER_ROI_ANNOTATION_ONLY_FULL_IMAGE_ANALYZED']);
    expect(reasons).toHaveLength(4);
    expect(reasons.join(' ')).not.toMatch(/[A-Z]{3,}_[A-Z_]+/);
    expect(reasons.join(' ')).toContain('AI butun suratni baholadi');
  });
  it('keeps meaningful Uzbek explanations supplied by the API', () => {
    const explanation = 'Suratdagi yorug‘lik ranglarni baholashga xalaqit beradi.';
    expect(uncertaintyText(explanation)).toBe(explanation);
  });
  it('explains ROI context cropping and insufficient image detail without raw codes', () => {
    expect(uncertaintyText('USER_ROI_CONTEXT_CROP_ANALYZED')).toContain('yaqinlashtirilgan qismini');
    expect(uncertaintyText('IMAGE_DETAILS_INSUFFICIENT')).toContain('Yorug‘lik va fokusni');
  });
  it('replaces unknown machine codes and deduplicates repeated generic limitations', () => {
    expect(uncertaintyMessages(['', 'NEW_UNSUPPORTED_INTERNAL_REASON', 'ANOTHER_INTERNAL_REASON', '  '])).toEqual(['Bu xulosani faqat surat asosida to‘liq tasdiqlab bo‘lmaydi.']);
  });
});
