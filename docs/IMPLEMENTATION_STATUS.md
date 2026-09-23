# Implementatsiya holati — 2026-09-23

## Ishlaydigan qism

React/Vite/TypeScript/Ant Design frontend, Axios/TanStack Query integratsiyasi, NestJS API, PostgreSQL migratsiyalari va FastAPI/OpenCV servisi yaratilgan. Mahalliy ilova real bazaga yozadi; frontend mock API ishlatmaydi. Keyingi foydalanuvchi topshirig‘i bilan [alohida belgilangan demo seed](DEMO_DATA.md) ham qo‘shildi; u haqiqiy DB/API/storage oqimida ishlaydigan sintetik fixturelardan iborat.

- Email/parol, Argon2, qisqa JWT va aylantiriladigan refresh cookie; sessiyalarni bekor qilish.
- Har tahlil uchun processing/history/research/external AI roziliklari.
- 1–5 surat, haqiqiy MIME/decode/metadata tozalash, kamera va qo‘lda ROI.
- Real fokus/yorug‘lik tekshiruvi; tekshirilmagan sifat mezonlari ochiq belgilanadi.
- Simptom/ABCDE savolnomasi, navbat va versiyalangan tahlil snapshoti.
- OpenAI Responses orqali rozilik asosida umumiy vizual kuzatuv.
- Saqlangan tarix, bitta joydagi kuzatuvlarni taqqoslash, PDF, JSON eksport.
- Owner tekshiruvi, vaqtinchalik TTL, o‘chirish navbati, private assetlar.
- Adminning texnik holat sahifasi, OpenAPI va offline yo‘riqnoma/PWA.

Mahalliy rejimda PostgreSQL durable queue va private filesystem ishlaydi. Docker konfiguratsiyasi Redis/BullMQ va S3/MinIO rejimini ajratadi.

## Hali qabul qilinmagan qism

Olti dermatologik sinfga mos o‘qitilgan ochiq model, haqiqiy avtomatik segmentatsiya, kalibrlangan xavf, klinik aniqlik, offline model hamda production deployment tasdiqlanmagan. Loader/training/evaluation/export kodlari mavjudligi model tayyorligini anglatmaydi. OpenAI modeli ochiq manbali emas; u vaqtinchalik ixtiyoriy vizual izoh provideridir. `.env`da `AI_PROVIDER=local` tanlansa, tasdiqlangan artifact yo‘qligi ochiq ko‘rsatiladi.

Klinik gate’lar [MODEL_CARD.md](MODEL_CARD.md), [ML_EVALUATION.md](ML_EVALUATION.md) va [ACCEPTANCE.md](ACCEPTANCE.md)da. Dasturiy tekshiruvlar [TEST_REPORT.md](TEST_REPORT.md)da. Hech qanday accuracy, Dice, kasallik ehtimoli yoki maska sun’iy to‘ldirilmagan.

## Mahalliy ishga tushirish

Tayyorlangan muhitda `pnpm start:local`. Windowsda yig‘ilgan versiyani fonda ochish:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/start-background.ps1
```

To‘xtatish: `scripts/stop-background.ps1`, bazani to‘xtatish: `pnpm db:stop`. Loglar `.data/logs`da. To‘liq qayta o‘rnatish ketma-ketligi [README](../README.md)da.
