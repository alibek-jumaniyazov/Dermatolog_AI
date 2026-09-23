import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { Result } from '../lib/types';
import ResultReview from './ResultReview';

const base: Result = {
  predictions: [{ classCode: 'FUNGAL_INFECTION', score: null, scoreType: 'NOT_CALIBRATED' }],
  riskLevel: 'NOT_ASSESSED', malignantProbability: null,
  uncertaintyReasons: ['NO_CALIBRATED_DISEASE_PROBABILITY'],
  recommendation: 'Dermatolog bilan maslahatlashing.', modelVersion: 'test-only', provider: 'openai',
};
const reviewed: Result = {
  ...base, analysisMode: 'VISUAL_DIFFERENTIAL',
  imageAssessment: { skinVisible: true, imageSuitable: true, reason: 'Hudud va chegaralari ko‘rinadi.' },
  differential: [
    { classCode: 'FUNGAL_INFECTION', condition: 'Halqasimon toshma ehtimoli', supportingFeatures: ['Chekka qismi aniqroq ko‘rinadi.'], uncertainties: ['Tekshiruvsiz sababini tasdiqlab bo‘lmaydi.'] },
    { classCode: 'ECZEMA_DERMATITIS', condition: 'Dermatitga o‘xshash o‘zgarish', supportingFeatures: ['Qizarish kuzatiladi.'], uncertainties: ['Qichishish haqida ma’lumot yetishmaydi.'] },
  ],
  nextSteps: ['Bir xil yorug‘likda yangi surat oling.'],
  followUpQuestions: ['Qachondan beri mavjud?'],
  limitations: ['Suratdan sababini aniq ajratib bo‘lmaydi.'],
};

describe('Visual review presentation', () => {
  it('shows reasoned differentials, next actions and questions without duplicate prediction UI', () => {
    const html = renderToStaticMarkup(<ResultReview result={reviewed}/>);
    for (const phrase of ['Halqasimon toshma ehtimoli', 'Chekka qismi aniqroq', 'Dermatitga o‘xshash o‘zgarish', 'Bir xil yorug‘likda yangi surat oling.', 'Qachondan beri mavjud?']) expect(html).toContain(phrase);
    expect(html).not.toContain('legacy-predictions');
    expect(html).not.toContain('NO_CALIBRATED_DISEASE_PROBABILITY');
    expect(html).not.toContain('ant-progress');
  });
  it('does not present a differential as usable when the image is unsuitable', () => {
    const html = renderToStaticMarkup(<ResultReview result={{ ...reviewed, imageAssessment: { skinVisible: false, imageSuitable: false, reason: 'Teri hududi ko‘rinmaydi.' } }}/>);
    expect(html).toContain('Suratni yaxshilash kerak');
    expect(html).not.toContain('Halqasimon toshma ehtimoli');
    expect(html).not.toContain('legacy-predictions');
  });
  it('keeps old demo outputs labeled and never turns demo scores into percentages', () => {
    const html = renderToStaticMarkup(<ResultReview result={{ ...base, predictions: [{ classCode: 'NEVUS', score: 0.85, scoreType: 'CALIBRATED_PROBABILITY' }] }} isDemo/>);
    expect(html).toContain('Demo kuzatuv natijasi');
    expect(html).toContain('DEMO');
    expect(html).toContain('legacy-predictions');
    expect(html).not.toContain('85%');
    expect(html).not.toContain('ant-progress');
  });
});
