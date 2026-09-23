import { afterEach, describe, expect, it, vi } from 'vitest';
import PDFDocument from 'pdfkit';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { ReportsService } from '../src/reports.service';
import type { PrismaService } from '../src/prisma.service';
import type { StorageService } from '../src/storage.service';
import type { AnalysesService } from '../src/analyses.service';
import { projectRoot } from '../src/config';

afterEach(() => vi.restoreAllMocks());

async function renderFixture(result: Record<string, unknown>, isDemo = false) {
  const analysisId = 'fe71a4c4-99f4-45ef-b37a-2291d944a683';
  const own = vi.fn().mockResolvedValue({ id: analysisId, status: 'FINISHED', isDemo, result, artifacts: [], images: [], primaryImageId: null, createdAt: new Date('2026-09-23T00:00:00Z'), case: { title: 'TEST_ONLY', bodyLocation: 'TEST_ONLY' }, symptoms: null });
  const tx = { $queryRaw: vi.fn().mockResolvedValue([]), analysis: { findFirst: vi.fn().mockResolvedValue({ id: analysisId }) }, artifact: { findUnique: vi.fn().mockResolvedValue(null), create: vi.fn().mockResolvedValue({ id: 'test-report-id' }) } };
  const db = { $transaction: async (operation: (client: typeof tx) => unknown) => operation(tx) };
  let bytes: Buffer | undefined;
  const storage = { key: () => 'test-only-report.pdf', put: vi.fn(async (_key: string, data: Buffer) => { bytes = data; }), remove: vi.fn(), read: vi.fn() };
  const text = vi.spyOn(PDFDocument.prototype, 'text');
  const service = new ReportsService(db as unknown as PrismaService, storage as unknown as StorageService, { own } as unknown as AnalysesService);
  const response = await service.create('test-only-user', analysisId);
  return { response, bytes: bytes!, text: text.mock.calls.map(call => String(call[0])).join('\n') };
}

describe('PDF visual differential regression (no database or external provider)', () => {
  const base = { predictions: [], riskLevel: 'NOT_ASSESSED', malignantProbability: null, outcome: 'UNCERTAIN', modelVersion: 'TEST_ONLY', summary: 'Faqat test uchun berilgan xulosa.', recommendation: 'Dermatolog bilan maslahatlashish tavsiya etiladi.' };
  it('renders differential details and follow-up guidance into a real PDF', async () => {
    const result = await renderFixture({ ...base, outcome: 'OBSERVATIONS_READY', analysisMode: 'VISUAL_DIFFERENTIAL',
      imageAssessment: { skinVisible: true, imageSuitable: true, reason: 'Tasvirning ko‘rinadigan sohasi yetarli.' },
      differential: [{ classCode: 'OTHER', condition: 'Boshqa holat ehtimoli', supportingFeatures: ['Qizarish tasvirlangan.'], uncertainties: ['Surat alomat sababini tasdiqlamaydi.'] }],
      nextSteps: ['Belgilar vaqtini qayd eting.'], followUpQuestions: ['Qachondan beri kuzatilgan?'],
    });
    expect(result.response).toEqual({ id: 'test-report-id', status: 'READY' });
    expect(result.bytes.subarray(0, 5).toString()).toBe('%PDF-');
    for (const expected of ['Ko‘rib chiqiladigan ehtimoliy holatlar', '1. Boshqa holat ehtimoli', 'Qizarish tasvirlangan.', 'Surat alomat sababini tasdiqlamaydi.', 'Keyingi qadamlar', 'Belgilar vaqtini qayd eting.', 'Aniqlashtirish uchun savollar', 'Qachondan beri kuzatilgan?', 'Teri ko‘rinadi: Ha', 'Vizual tahlilga mos: Ha']) expect(result.text).toContain(expected);
    expect(result.text).not.toContain('undefined'); expect(result.text).not.toContain('NaN');
    expect(result.text).not.toContain('Ehtimoliy guruh aniqlanmagan.');
    if (process.env.WRITE_PDF_TEST_EVIDENCE === 'true') {
      const directory = resolve(projectRoot(), '.data/evidence');
      await mkdir(directory, { recursive: true });
      await writeFile(resolve(directory, 'differential-report-test-only.pdf'), result.bytes);
    }
  });
  it('still renders old demo snapshots without optional differential fields', async () => {
    const result = await renderFixture({ ...base, provider: 'demo', isDemo: true }, true);
    expect(result.bytes.subarray(0, 5).toString()).toBe('%PDF-');
    expect(result.text).toContain('DEMO'); expect(result.text).not.toContain('Ko‘rib chiqiladigan ehtimoliy holatlar');
    expect(result.text).not.toContain('undefined');
  });
});
