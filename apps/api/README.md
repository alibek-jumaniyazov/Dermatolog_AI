# NestJS API

API `/api/v1`, standart port `3001`. Root `.env` ishlatiladi; `.env.example` qiymatlarini joriy lokal setup yaratadi. API PostgreSQL bo‘lmasa ishga tushmaydi. `JWT_SECRET` kamida 32 belgili noyob secret bo‘lishi shart.

```powershell
pnpm --filter @rd/api db:generate
node scripts/migrate.mjs
pnpm --filter @rd/api dev
pnpm --filter @rd/api typecheck
pnpm --filter @rd/api test
```

Production build: `pnpm --filter @rd/api build`, so‘ng `pnpm --filter @rd/api start`. `EXPORT_OPENAPI=true` startupda `apps/api/openapi.json` yozadi. Swagger `/api/docs`. HTTP DTOlari allowlist asosida validatsiya qilinadi; canonical response maydonlari root `docs/API_CONTRACT.md`da.

## Ishlov berish va saqlash

Redis sozlangan muhitda BullMQ ishlaydi. Windows lokal muhitida `REDIS_URL` bo‘sh bo‘lsa PostgreSQL `AnalysisJob` jadvali va davriy recovery ishlaydi. Bu lokal adapter; Redis ishlayotgandek ko‘rsatilmaydi. DB transaction bir vaqtda submission va durable job yozadi; Redis faqat shu IDni tashiydi. Joblar restartdan keyin qayta olinadi. `RUN_WORKER_IN_API=false` HTTP processda worker’ni o‘chiradi; alohida `pnpm --filter @rd/api worker` ishga tushiriladi. Worker lease 180 soniya. Uzilgan lokal model ishi 3 urinishgacha tiklanadi; pullik tashqi so‘rov avtomatik takror yuborilmaydi va `WORKER_INTERRUPTED` bo‘ladi.

`STORAGE_DRIVER=local` development uchun `.data/storage`dagi private nusxalarni ishlatadi. API faqat owner avtorizatsiyasidan keyin bytes qaytaradi. Production uchun `STORAGE_DRIVER=s3`, `S3_ENDPOINT`, `S3_REGION`, `S3_BUCKET`, `S3_ACCESS_KEY`, `S3_SECRET_KEY` kerak. Bucket oldindan private holatda yaratiladi. `S3_ENCRYPTION=AES256` provider qo‘llasa at-rest encryption headerini yoqadi. Lokal diskni OS darajasida shifrlash alohida infratuzilma mas’uliyati.

Surat serverda magic/decoder/format/MIME tekshiruvidan o‘tadi, 25MP limitda ochiladi, orientation normalizatsiyasi va EXIFsiz JPEG qayta encoding bajariladi. Asl raw fayl diskka yozilmaydi. ROI normalizatsiyalangan surat koordinatalarida 0..1. Klinik sifat uchun ML servisning haqiqiy checklari ishlatiladi; bajarilmagan tekshiruv PASS bo‘lmaydi.

Temporary TTL `createdAt + TEMP_RETENTION_MINUTES`; rozilikni qayta bosish vaqtni uzaytirmaydi. Historyga saqlash, research va tashqi AI alohida roziliklar. OpenAI provider’ga faqat EXTERNAL_AI roziligi borligi submission va yuborish oldidan qayta tekshirilgach bytes yuboriladi. Barcha provider javoblari schema, ID/revision va aynan yuborilgan bytes SHA256 bilan tekshiriladi. Suratlarning birinchisi yoki tanlangan primary image tahlil qilinadi; qo‘shimcha rakurslarda inferens bajarilgani da’vo qilinmaydi.

## O‘chirish

O‘chirish so‘rovi avval kirishni darhol yopadi va worker natijasi yozilishini bloklaydi. `DeletionRequest` private object keysni durable holda ushlab, retry bilan storage va DBni tozalaydi. Foydalanuvchi scope’lari: analysis, case, medical data, account. Account o‘chirish joriy parolni talab qiladi va sessiyalarni darhol bekor qiladi. Storage o‘chirish xatosida so‘rov `FAILED` bo‘lib qoladi, `COMPLETED` deb ko‘rsatilmaydi.

Worker expired temporary tahlillarni, hech historyga saqlanmagan bo‘sh case’larni va bir soatdan eski havolasiz private obyektlarni tozalaydi. Crashdan qolgan obyektlar orphan sweep bilan olinadi. DB backupdagi data va tashqi provider retentionini bu API bevosita o‘chira olmaydi: root deployment/retention siyosati va restore paytidagi deletion ledger replay talab qilinadi. Auditda simptom/surat/parol/token bo‘lmaydi; 30 kunlik minimal texnik hodisalar.

## Autentifikatsiya va PDF

Argon2id, 10 daqiqalik JWT, HttpOnly SameSite Strict refresh cookie; refresh rotation va reuse detection. Mutatsiyada browser Origin tekshiriladi. Reverse proxy trust faqat loopback. Lokal limiter process xotirasida; ko‘p replica production uchun shared edge/Redis limiter talab qilinadi.

SMTP sozlanganda real password reset emaili yuboriladi. SMTP sozlanmagan bo‘lsa `EMAIL_NOT_CONFIGURED` beriladi; token logga chiqarilmaydi. Mailpit faqat development uchun.

PDF finished immutable natijadan yaratiladi, private saqlanadi va ownerga beriladi. `assets/fonts/NotoSans-Regular.ttf` Noto loyihasidan, SIL Open Font License bilan bundle qilingan; litsenziya yonida. Texnik failed natijaga diagnostik PDF yasalmaydi. AI ko‘rib chiqishi noaniq bo‘lsa hisobotda shu holat va tibbiy cheklov ko‘rsatiladi.

## Model cheklovi

OpenAI umumiy vision ko‘rib chiqishi olti sinfli klinik klassifikator o‘rnini bosmaydi. Uning score’i null, risk `NOT_ASSESSED`; shifokor ko‘rigi tavsiyasi qoladi. Tasdiqlangan lokal artifact yo‘q bo‘lsa `MODEL_NOT_READY`. O‘lchanmagan metrikalar va maskalar uydirilmaydi.
