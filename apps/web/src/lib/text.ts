export const statusText: Record<string, string> = { DRAFT: 'Qoralama', QUEUED: 'Navbatda', RUNNING: 'Tahlil qilinmoqda', FINISHED: 'Yakunlangan', FAILED: 'Bajarilmadi', CANCELLED: 'Bekor qilingan', COMPLETED: 'Tayyor', ASSESSED: 'Natija tayyor', OBSERVATIONS_READY: 'AI tahlili tayyor', IMAGE_UNSUITABLE: 'Surat yetarlicha aniq emas', QUALITY_REJECTED: 'Surat yaroqsiz', UNCERTAIN: 'Noaniq natija', UNSUPPORTED_DOMAIN: 'Surat turi mos emas', PENDING: 'Kutilmoqda', READY: 'Tayyor', MODEL_NOT_READY: 'Model ulanmagan', UNAVAILABLE: 'Vaqtincha mavjud emas', LOW: 'Past xavf', MEDIUM: 'O‘rta xavf', HIGH: 'Yuqori xavf', NOT_ASSESSED: 'Xavf baholanmagan', PASS: 'Mos', WARN: 'E’tibor talab qiladi', REJECT: 'Qayta surat kerak', QUALITY: 'Surat sifati', SEGMENTATION: 'Hududni aniqlash', CLASSIFICATION: 'Tasniflash', RESULT: 'Natijani tayyorlash', NOT_ASSESSED_CHECK: 'Tekshirilmagan' };
export const diseaseNames: Record<string, string> = { SUSPICIOUS_PIGMENTED: 'Shubhali pigmentli o‘zgarish', NEVUS: 'Nevus / xol', ECZEMA_DERMATITIS: 'Ekzema / dermatit', PSORIASIS: 'Psoriaz', ACNE: 'Akne', FUNGAL_INFECTION: 'Zamburug‘li infeksiya' };
export const disclaimer = 'Bu natija dastlabki skrining uchun. Yakuniy tashxisni dermatolog qo‘yadi.';
export const date = (value?: string | null) => value ? new Intl.DateTimeFormat('uz-UZ', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Tashkent' }).format(new Date(value)) : '—';
export const isActive = (status: string) => ['QUEUED', 'RUNNING'].includes(status);

const uncertaintyLabels: Record<string, string> = {
  GENERAL_PURPOSE_VISION_NOT_CLINICALLY_VALIDATED: 'Bu AI kuzatuvi klinik tasdiqlangan dermatologik tashxis emas.',
  NO_CALIBRATED_DISEASE_PROBABILITY: 'Surat asosida kasallik ehtimolini ishonchli foizda hisoblab bo‘lmaydi.',
  QUALITY_ASSESSMENT_INCOMPLETE: 'Suratning barcha sifat mezonlari to‘liq tekshirilmagan.',
  UNSUPPORTED_IMAGE: 'Ushbu tasvir teridagi holatni baholash uchun mos kelmadi.',
  UNSUPPORTED_DOMAIN: 'Ushbu surat turi modelning qo‘llanish doirasiga kirmaydi.',
  IMAGE_UNSUITABLE: 'Aniqroq, yaxshi yoritilgan va fokuslangan surat kerak.',
  NO_SKIN_VISIBLE: 'Suratda teri hududi yetarlicha aniq ko‘rinmaydi.',
  SKIN_NOT_VISIBLE: 'Suratda teri hududi yetarlicha aniq ko‘rinmaydi.',
  LOW_MODEL_CONFIDENCE: 'Model ko‘rinayotgan belgilarni bir holatga yetarli ishonch bilan bog‘lay olmadi.',
  UNCALIBRATED_MODEL: 'Model bahosi kasallikning tasdiqlangan ehtimoli sifatida talqin qilinmaydi.',
  USER_ROI_ANNOTATION_ONLY_FULL_IMAGE_ANALYZED: 'Belgilagan hududingiz izoh sifatida saqlandi; AI butun suratni baholadi.',
  USER_ROI_CONTEXT_CROP_ANALYZED: 'AI butun suratni va siz belgilagan hududning yaqinlashtirilgan qismini birgalikda ko‘rib chiqdi.',
  IMAGE_DETAILS_INSUFFICIENT: 'Belgilarni farqlash uchun suratda yetarli tafsilot ko‘rinmayapti. Yorug‘lik va fokusni yaxshilab qayta surat oling.',
  NO_VALIDATED_MALIGNANCY_HEAD: 'Ushbu tahlilda malignlik xavfi uchun tekshirilgan model mavjud emas.',
  VISUAL_REVIEW_ONLY: 'Baholash faqat ko‘rinayotgan belgilar asosida; ko‘rik va tibbiy tarix hisobga olinmagan.',
  CLINICAL_EXAM_REQUIRED: 'Taxminni tasdiqlash uchun dermatolog ko‘rigi kerak.',
  MISSING_CLINICAL_CONTEXT: 'Simptomlar va holatning davomiyligi haqidagi ma’lumotlar yetarli emas.',
  DEMO_DATA_NOT_MEDICAL_RESULT: 'Bu namuna ma’lumoti; tibbiy xulosa emas.',
};

export function uncertaintyText(value: string): string {
  const text = value.trim();
  if (!text) return '';
  if (uncertaintyLabels[text]) return uncertaintyLabels[text];
  // Never expose an internal machine code as patient-facing guidance.
  if (/^[A-Z][A-Z0-9_]*(?:[:\s-]+[A-Z0-9_]+)*$/.test(text)) return 'Bu xulosani faqat surat asosida to‘liq tasdiqlab bo‘lmaydi.';
  return text;
}

export function uncertaintyMessages(values: string[] = []): string[] {
  return [...new Set(values.map(uncertaintyText).filter(Boolean))];
}
