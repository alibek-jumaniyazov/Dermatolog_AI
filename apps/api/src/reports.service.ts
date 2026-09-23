import { Injectable } from '@nestjs/common';
import PDFDocument from 'pdfkit';
import { resolve } from 'node:path';
import { PrismaService } from './prisma.service';
import { StorageService } from './storage.service';
import { AnalysesService, availableWhere } from './analyses.service';
import { fail } from './common';
import { projectRoot } from './config';
import type { Inference } from './ml.service';

const labels: Record<string, string> = { SUSPICIOUS_PIGMENTED: 'Shubhali pigmentli o‘zgarish', NEVUS: 'Nevus yoki xol', ECZEMA_DERMATITIS: 'Ekzema yoki dermatit', PSORIASIS: 'Psoriaz', ACNE: 'Akne', FUNGAL_INFECTION: 'Zamburug‘li infeksiya', LOW: 'Past', MEDIUM: 'O‘rta', HIGH: 'Yuqori', NOT_ASSESSED: 'Baholanmagan' };

@Injectable()
export class ReportsService {
  constructor(private readonly db: PrismaService, private readonly storage: StorageService, private readonly analyses: AnalysesService) {}
  async create(userId: string, analysisId: string) {
    const analysis = await this.analyses.own(userId, analysisId);
    if (analysis.status !== 'FINISHED' || !analysis.result) fail(409, 'REPORT_NOT_READY', 'Hisobot faqat yakunlangan natija uchun yaratiladi.');
    const existing = analysis.artifacts?.find(a => a.kind === 'REPORT');
    if (existing) return { id: existing.id, status: 'READY' };
    const result = analysis.result as Record<string, unknown>;
    const doc = new PDFDocument({ size: 'A4', bufferPages: true, margins: { top: 42, bottom: 52, left: 46, right: 46 }, info: { Title: `${analysis.isDemo ? 'DEMO — ' : ''}Raqamli Dermatolog — kuzatuv hisoboti`, Author: 'Raqamli Dermatolog' } });
    const chunks: Buffer[] = [];
    const finished = new Promise<Buffer>((resolveBuffer, reject) => { doc.on('data', (chunk: Buffer) => chunks.push(chunk)); doc.on('end', () => resolveBuffer(Buffer.concat(chunks))); doc.on('error', reject); });
    doc.font(resolve(projectRoot(), 'apps/api/assets/fonts/NotoSans-Regular.ttf'));
    doc.fontSize(20).fillColor('#0F766E').text('Raqamli Dermatolog');
    doc.moveDown(0.3).fontSize(12).fillColor('#0F172A').text('Kuzatuv va dastlabki ko‘rib chiqish hisoboti');
    if (analysis.isDemo) doc.moveDown(0.4).fontSize(12).fillColor('#9A3412').text('DEMO — sun’iy sinov ma’lumoti. Haqiqiy bemor yoki AI xulosasi emas.');
    doc.moveDown().fontSize(10).fillColor('#9A3412').text('Bu natija dastlabki skrining uchun. Yakuniy tashxisni dermatolog qo‘yadi.');
    const row = (label: string, value: unknown) => { doc.moveDown(0.4).fillColor('#334155').fontSize(10).text(`${label}: ${String(value ?? 'Qayd etilmagan')}`); };
    row('Tahlil raqami', analysis.id); row('Kuzatuv', analysis.case?.title); row('Anatomik joy', analysis.case?.bodyLocation);
    row('Sana', new Intl.DateTimeFormat('uz-Latn-UZ', { timeZone: 'Asia/Tashkent', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(analysis.createdAt) + ' (Toshkent vaqti)'); row('Xavf darajasi', labels[String(result.riskLevel)] || 'Baholanmagan');
    row('Model', result.modelVersion); row('Jarayon versiyasi', result.pipelineVersion);
    const image = analysis.images.find(i => i.id === analysis.primaryImageId) || analysis.images[0];
    if (image) {
      doc.moveDown().fontSize(12).fillColor('#0F172A').text('Asosiy surat');
      const imageBytes = await this.storage.read(image.storageKey);
      if (doc.y > 490) doc.addPage();
      const top = doc.y + 8; doc.image(imageBytes, 46, top, { fit: [260, 210] }); doc.y = top + 220;
      const quality = image.quality as { decision?: string; assessmentComplete?: boolean } | null;
      row('Surat sifati', quality?.decision); row('Sifat tekshiruvi to‘liq', quality?.assessmentComplete ? 'Ha' : 'Yo‘q');
    }
    const textBlock = (title: string, text: string) => { if (doc.y > 640) doc.addPage(); doc.moveDown().fontSize(12).fillColor('#0F766E').text(title); doc.moveDown(0.3).fontSize(10).fillColor('#334155').text(text, { lineGap: 3 }); };
    textBlock('Xulosa', String(result.summary || 'Model natijasi noaniqlik va qo‘llanish cheklovlari bilan birga ko‘rib chiqiladi.'));
    const imageAssessment = result.imageAssessment as Inference['imageAssessment'];
    if (imageAssessment) textBlock('Suratni ko‘rib chiqish', `Teri ko‘rinadi: ${imageAssessment.skinVisible ? 'Ha' : 'Yo‘q'}\nVizual tahlilga mos: ${imageAssessment.imageSuitable ? 'Ha' : 'Yo‘q'}\nIzoh: ${imageAssessment.reason}`);
    const differential = result.differential as Inference['differential'];
    if (differential?.length) {
      textBlock('Ko‘rib chiqiladigan ehtimoliy holatlar', 'Quyidagi taxminlar suratdagi belgilarni tushuntirish uchun berilgan. Ular tasdiqlangan tashxis yoki kasallik ehtimolining foizi emas.');
      for (const [index, item] of differential.entries()) {
        textBlock(`${index + 1}. ${item.condition}`, [
          `Guruh: ${item.classCode === 'OTHER' ? 'Boshqa ehtimoliy holat' : labels[item.classCode] || item.classCode}`,
          'Mos kelishi mumkin bo‘lgan belgilar:',
          ...(item.supportingFeatures.length ? item.supportingFeatures.map(feature => `- ${feature}`) : ['- Yetarli belgi qayd etilmagan.']),
          'Noaniqliklar va tekshirish talab qiladigan jihatlar:',
          ...(item.uncertainties.length ? item.uncertainties.map(uncertainty => `- ${uncertainty}`) : ['- Faqat surat asosida tasdiqlab bo‘lmaydi.']),
        ].join('\n'));
      }
    }
    const predictions = result.predictions as { classCode: string; score: number | null; scoreType: string }[] || [];
    if (!differential?.length) textBlock(analysis.isDemo ? 'Demo ssenariysidagi guruhlar — tashxis emas' : 'Ehtimoliy guruhlar', predictions.length ? predictions.map(p => `${labels[p.classCode] || p.classCode}: ${p.score === null ? 'Ishonch foizi hisoblanmagan' : `${(p.score * 100).toFixed(1)}% — model balli (${p.scoreType})`}`).join('\n') : 'Ehtimoliy guruh aniqlanmagan. Bu holat xavfsizlikni tasdiqlamaydi.');
    const symptoms = analysis.symptoms as Record<string, unknown> | null;
    const symptomLabels: Record<string, string> = { duration: 'Qachondan beri', itching: 'Qichishish', pain: 'Og‘riq', bleeding: 'Qonash', changing: 'Vaqt davomida o‘zgarish', asymmetry: 'Assimmetriya', border: 'Chegara o‘zgarishi', color: 'Rang o‘zgarishi', diameterMm: 'Diametr (mm)', notes: 'Izoh' };
    const answerLabels: Record<string, string> = { YES: 'Ha', NO: 'Yo‘q', UNKNOWN: 'Bilmayman', DAYS: 'Kunlar', WEEKS: 'Haftalar', MONTHS: 'Oylar', YEARS: 'Yillar' };
    if (symptoms) textBlock('Foydalanuvchi kiritgan simptomlar', Object.entries(symptoms).filter(([key]) => key !== 'questionnaireVersion').map(([key, value]) => `${symptomLabels[key] || key}: ${answerLabels[String(value)] || value || 'Qayd etilmagan'}`).join('\n'));
    textBlock('Tavsiya', String(result.recommendation || 'Dermatolog bilan maslahatlashish tavsiya etiladi.'));
    const nextSteps = result.nextSteps as Inference['nextSteps'];
    if (nextSteps?.length) textBlock('Keyingi qadamlar', nextSteps.map((step, index) => `${index + 1}. ${step}`).join('\n'));
    const followUpQuestions = result.followUpQuestions as Inference['followUpQuestions'];
    if (followUpQuestions?.length) textBlock('Aniqlashtirish uchun savollar', followUpQuestions.map((question, index) => `${index + 1}. ${question}`).join('\n'));
    const observations = result.observations as string[] || []; if (observations.length) textBlock('Kuzatilgan belgilar', observations.join('\n'));
    const limitations = result.limitations as string[] || [];
    textBlock('Cheklovlar', ['Tasvir asosidagi natija shifokor tashxisini almashtirmaydi.', ...limitations].join('\n'));
    for (const artifact of analysis.artifacts?.filter(a => ['MASK', 'HEATMAP'].includes(a.kind)) || []) {
      const bytes = await this.storage.read(artifact.storageKey);
      doc.addPage(); doc.fontSize(14).fillColor('#0F766E').text(artifact.kind === 'MASK' ? 'Model segmentatsiyasi' : 'Model e’tibor xaritasi');
      doc.image(bytes, 46, 90, { fit: [480, 520] });
    }
    const pages = doc.bufferedPageRange();
    for (let page = pages.start; page < pages.start + pages.count; page++) {
      doc.switchToPage(page);
      const bottomMargin = doc.page.margins.bottom;
      doc.page.margins.bottom = 0;
      doc.fontSize(8).fillColor('#64748B').text(`Raqamli Dermatolog · ${analysis.isDemo ? 'DEMO · ' : ''}Yakuniy tashxis emas · ${page + 1} / ${pages.count}`, 46, doc.page.height - 38, { width: doc.page.width - 92, align: 'center', lineBreak: false });
      doc.page.margins.bottom = bottomMargin;
    }
    doc.end(); const buffer = await finished;
    const key = this.storage.key('pdf'); await this.storage.put(key, buffer, 'application/pdf');
    try {
      return await this.db.$transaction(async tx => {
        await tx.$queryRaw`SELECT id FROM "Analysis" WHERE id = ${analysisId}::uuid FOR UPDATE`;
        const current = await tx.analysis.findFirst({ where: { id: analysisId, userId, status: 'FINISHED', ...availableWhere() } });
        if (!current) fail(404, 'NOT_FOUND', 'Tahlil o‘chirilgan yoki muddati tugagan.');
        const existing = await tx.artifact.findUnique({ where: { analysisId_kind: { analysisId, kind: 'REPORT' } } });
        if (existing) { await this.storage.remove(key); return { id: existing.id, status: 'READY' }; }
        const saved = await tx.artifact.create({ data: { analysisId, kind: 'REPORT', storageKey: key, mimeType: 'application/pdf' } });
        return { id: saved.id, status: 'READY' };
      });
    } catch (error) { await this.storage.remove(key).catch(() => undefined); throw error; }
  }
  async asset(userId: string, id: string, reportOnly = false) {
    const where = { userId, ...availableWhere(), case: { deletedAt: null }, user: { deletedAt: null } };
    const asset = reportOnly ? null : await this.db.image.findFirst({ where: { id, analysis: where } });
    const artifact = asset ? null : await this.db.artifact.findFirst({ where: { id, ...(reportOnly ? { kind: 'REPORT' } : {}), analysis: where } });
    const target = asset || artifact;
    if (!target) fail(404, 'NOT_FOUND', 'Fayl topilmadi.');
    return { bytes: await this.storage.read(target.storageKey), mimeType: target.mimeType };
  }
}
