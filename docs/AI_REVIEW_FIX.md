# Surat tahlili tuzatishi — 2026-09-23

Foydalanuvchi yuborgan 600×450 surat avval AI’ga yetib bormagan: global Laplacian variance 19.1779 bo‘lib, eski `<25` qoidasi uni REJECT qilgan. API qayta encode qilgan suratda ham 17.9478 chiqdi. Surat teksturasi kam bo‘lishi xiralik yoki tasvir yaroqsizligining isboti emas.

## O‘zgargan xatti-harakat

- `opencv-quality-v2` past fokus balliga WARN beradi. Bo‘sh/bir xil rangli va haddan tashqari qorong‘i/yorug‘ tasvirlar rad etiladi. WARN tasdiqlangach vision tahlil ishlaydi; suratdagi tafsilot yetarli bo‘lmasa model buni alohida bildiradi.
- `skin-differential-v2` prompti ko‘rinadigan morfologiyadan kelib chiqib eng ko‘pi 3 ta asoslangan ehtimol, dalil, noaniqlik, tasdiqlash qadamlari va savollarni qaytaradi. Kategoriya `OTHER` ham mavjud; har suratni olti guruhdan biriga majburan kiritmaydi.
- `gpt-4o-mini` bilan sinovda noto‘g‘ri atamalar va sifatsiz o‘zbekcha izohlar kuzatildi. Mavjud account model ro‘yxatidagi `gpt-5.6-luna` sinovdan o‘tkazilib joriy `.env` va defaultga qo‘yildi. Low reasoning va 6000 output-token chegarasi ishlatiladi; avtomatik pullik retry yoki yashirin fallback yo‘q. Bu bitta misoldagi natija, klinik benchmark emas.
- High-detail original tasvir va, belgilangan bo‘lsa, foydalanuvchi ROI kesmasi yuboriladi. Fayl nomi, userning taxminiy tashxisi, identifikatsiya va erkin matnli izohlari providerga yuborilmaydi. EXIF/GPS olib tashlanadi, `store:false` ishlatiladi.
- Natija ekranida asosiy ehtimol, dalillar, alternativalar, aniqlashtiruvchi savollar va keyingi qadamlar bor. PDF ham shu ma’lumotlarni o‘z ichiga oladi. Eski/demo natijalar bilan moslik saqlangan.

## Haqiqiy sinov

User ruxsat bergan surat shu ilova oqimi orqali yuborildi: upload → real quality WARN → consent → PostgreSQL job → FastAPI → OpenAI → saved result → private PDF. Modelga filename yoki “zamburug‘” javobi berilmadi. Yangi modelning natijasi `FINISHED / OBSERVATIONS_READY`, yetakchi ehtimol `FUNGAL_INFECTION`, matni “Yuzaki dermatofit zamburug‘i (tinea faciei ehtimoli)”. Ekzema/kontakt dermatit kabi alternativalar, aniqlashtirish va tekshiruv chegaralari ham berildi. Kasallik foizi null, risk NOT_ASSESSED.

Keyingi synthetic checkerboard nazorat sinovi `UNSUPPORTED_DOMAIN` qaytardi, kasallik foizi yaratilmagan. Suratga doim bir xil kasallik javobi yozib qo‘yilmagan.

48 ML testi, 28 backend unit testi, 13 frontend testi, 28 API integration va 118 demo API tekshiruvi o‘tdi. Live natijaning desktop/mobile playback’i ham tekshirildi. Dalillar private, Gitdan tashqaridagi `.data/evidence` ichida; user surati repository fixture yoki trening datasetiga qo‘shilmadi. Eski mini-model bilan shu vazifada yaratilgan tekshiruv yozuvi ilovadan tozalandi; yangi tekshiruv demo hisobda saqlandi.

## Qayta tekshirish

Oddiy unit testlar tashqi AI chaqirmaydi:

```powershell
services/ml/.venv/Scripts/python.exe -m pytest services/ml/tests -q
pnpm test
```

Faqat yuborishga ruxsat berilgan surat bilan live sinov (provider xarajati bor):

```powershell
$env:ALLOW_LIVE_AI_TEST='1'
node scripts/verify-visual-review.mjs 'C:/path/to/authorized-photo.jpg'
```

Oldindan saqlangan natijani AI’ga qayta yubormasdan UI tekshiruvi:

```powershell
$env:TEST_REVIEW_ID='saved-analysis-uuid'
pnpm exec playwright test tests/e2e/visual-review.spec.ts
```

Eski draftdagi REJECT uchun sifat tekshiruvini qayta bosing. Yakunlangan eski natijalar o‘zgartirilmaydi; yangi prompt uchun yangi tahlil yarating.

## Chegara va manbalar

Bu model klinik tasdiqlangan dermatologik diagnostika tizimi emas. Halqasimon toshma zamburug‘ga mos kelishi mumkin, ammo o‘xshash holatlar ham bor; tashxisni ko‘rik va zarur tekshiruv aniqlashtiradi. Bir surat muvaffaqiyati boshqa kasalliklardagi aniqlikni isbotlamaydi.

- [OpenAI Images and vision](https://developers.openai.com/api/docs/guides/images-vision): tasvir detail sozlamasi va umumiy vision cheklovlari.
- [GPT-5.6 Luna](https://developers.openai.com/api/docs/models/gpt-5.6-luna): Responses, image input, structured output va reasoning parametrlari.
- [AAD ringworm overview](https://www.aad.org/public/diseases/a-z/ringworm-overview): halqasimon chekka va boshqa ko‘rinishlar.
- [CDC ringworm basics](https://www.cdc.gov/ringworm/about/): boshqa teri holatlari bilan o‘xshashlik va diagnostik tekshiruv.
