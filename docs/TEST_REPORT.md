# Bajarilgan tekshiruvlar

Sana: 2026-09-23. Muhit: Windows, Node22.18, pnpm11.19, isolated PostgreSQL17 (`127.0.0.1:55439`), Python virtualenv, Microsoft Edge. Testlar synthetic suratlar va alohida test hisoblari bilan bajarildi.

| Tekshiruv | Natija | Dalil / chegara |
|---|---|---|
| TypeScript typecheck | PASS | API va web |
| Lint | PASS | Web ESLint; API scripti hozir TypeScript static check |
| Production build | PASS | NestJS va Vite; Vite asosiy bundle >500KB warning bor |
| Backend unit | 18 PASS | Risk abstention, symptom qoidalari, DTO/ROI/domain tekshiruvlari |
| Frontend unit | 5 PASS | Format, count, hajm upload guardlari |
| ML component | 20 PASS | Real OpenCV/decoder, auth, model yo‘qligi, consent, provider schema/refusal; network mock |
| API integration | 28 PASS | Real DB/ML/storage; ownership, MIME, consent, ROI, quality, expiry, history, delete, refresh replay |
| Privacy integration | 30 PASS | Mailpit reset/single use/session revoke; deletion receipt; DB/private bytes/report physically removed |
| Browser E2E | 4 PASS | Desktop1280 va mobile390: auth/default consent/dashboard/settings; real upload/ROI/quality/symptoms/draft/history |
| Real OpenAI smoke | PASS | Synthetic non-medical image; gpt-4o-mini; UNSUPPORTED_DOMAIN; null probability |
| Real queued AI → PDF | PASS | NestJS → PostgreSQL job → FastAPI → OpenAI → saved result → private PDF download |
| Production offline | PASS | Production build SW; origin to‘xtatilganda offline yo‘riqnoma; API cache yo‘q |
| Secret scan | PASS | Serverdagi joriy kalit/secret qiymatlari source va built frontendda yo‘q |
| Compose/bootstrap static audit | PASS | YAML, health dependencies, paths, JS syntax va private cluster ownership |
| Docker / Redis / S3 runtime | BAJARILMAGAN | Docker bu mashinada yo‘q; local DB queue/filesystem sinovi o‘rnini bosmaydi |
| Klinik evaluation / inference latency | BLOKLANGAN | Validated artifact/dataset yo‘q; metrikalar uydirilmagan |

## Qayta bajarish

`pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build`; ML uchun `services/ml/.venv/Scripts/python.exe -m pytest services/ml/tests -q`.

Xizmatlar ishlab turganda `pnpm test:smoke`, `pnpm test:integration`, `pnpm test:privacy`, `pnpm test:e2e`. Privacy testi lokal Mailpitni talab qiladi va tashqi email yubormaydi. `pnpm test:offline` alohida5179portda production previewni vaqtincha boshlaydi, so‘ng yopadi.

`scripts/live-flow.mjs` faqat `ALLOW_LIVE_AI_TEST=1` bilan tashqi AIga bitta synthetic surat yuboradi; odatiy testga kiritilmagan. `.data/evidence/live-flow.json` qaydida FINISHED / UNSUPPORTED_DOMAIN / NOT_ASSESSED / probability=null va22342bayt PDF saqlangan. Bu tibbiy to‘g‘rilik yoki olti sinf qamroviga dalil emas.

## Vizual tekshiruv

Desktop landing/dashboard, mobile dashboard va upload/draft sahifalari screenshot orqali ko‘rib chiqildi. Viewport overflow tekshiruvi o‘tdi. Real AI test hisobotining ikkala sahifasi Poppler bilan render qilindi; Unicode va tasvir o‘qiladi, matn ustma-ust tushmagan. Yakuniy TEST_ONLY PDF regressionda o‘zbekcha enumlar, Toshkent sanasi va sahifa raqami tekshirildi: 1 sahifa, 12591 bayt; ortiqcha bo‘sh sahifa yo‘q. Dalil: `.data/evidence/privacy-report-final-1.png`.

`test-results` va `playwright-report` avtomatik qayta yaratiladi va Gitga kirmaydi. `.data/evidence` synthetic dalillarni saqlaydi. Test trace’larini haqiqiy foydalanuvchi ma’lumotlari bilan yuritmaslik kerak.

## Chegaralar

Jismoniy telefon kamerasi, iOS/Safari, production TLS/SMTP/backup restore, katta yuklama, provider uzilishi vaqtida uzoq muddatli queue sinovi va real klinik model hali sinovdan o‘tmagan. UI’dagi kamera ruxsati fallback kodi mavjud, real kamera hardware sinovi da’vo qilinmaydi. PWA offline model ishlatmaydi. Build warningni yashirish o‘rniga kelgusida bundle profilingga qoldirildi.

CI workflow kodlari mavjud; GitHubda masofaviy run bu sessiyada bajarilmadi.

## Demo seed tekshiruvi — 2026-09-23

Lokal bazaga 3 demo hisob, 8 kuzatuv joyi, 17 tahlil va 17 private JPEG yozuvi yuklandi. Suratlar kod yordamida yaratilgan sintetik illustratsiyalar, natijalar ochiq DEMO belgili ssenariylardir. Tashqi AI chaqirilmadi.

- API va seed TypeScript tekshiruvi, API/Web build, Web lint hamda 23 API/Web unit testi o‘tdi.
- Seed qayta bajarilganda yangi surat/yozuv yaratilmagani, mavjud demo va oddiy foydalanuvchi ma’lumotlari saqlangani tekshirildi. Production va tashqi DB uchun seed bloklandi.
- `pnpm test:demo`: 118 tekshiruv o‘tdi — uchala login, rollar, tarix, private suratlar, hisoblararo ruxsatlar, taqqoslash va haqiqiy PDF yuklash.
- `pnpm test:demo-ui`: desktop va mobil uchun 4/4 test o‘tdi — kabinet, tarix, natija, PDF, taqqoslash va administrator sahifasi. Brauzer xatosi va gorizontal overflow aniqlanmadi; screenshotlar ko‘rib chiqildi.
- `.data/evidence/demo-report.pdf` ikki sahifasi Poppler bilan render qilinib tekshirildi: o‘zbekcha matn, DEMO belgisi, rasm va sahifa raqamlari o‘qiladi; matn ustma-ust tushmagan.
- Server secretlari source va frontend build ichida yo‘qligi qayta tekshirildi.

CI ichiga demo seed, takroriy seed tekshiruvi, API demo tekshiruvi va demo browser testlari kiritildi. Masofaviy CI bu sessiyada ishga tushirilmagan.

## Vizual AI tahlili v2 — 2026-09-23

False blur rejection tuzatildi; qo‘shimcha differential maydonlari backend, UI va PDF bo‘ylab tekshirildi. Joriy model: accountda mavjud `gpt-5.6-luna`, low reasoning. Asos va qayta bajarish tartibi: [AI_REVIEW_FIX.md](AI_REVIEW_FIX.md).

| Tekshiruv | Natija |
|---|---|
| API build/typecheck va unit | PASS, 28 test |
| Frontend typecheck/lint/build va unit | PASS, 13 test; mavjud Vite bundle-size warning |
| ML component | 48 PASS; ikki upstream deprecation warning |
| API integration regression | 28 PASS; tashqi AI chaqirilmagan |
| Demo API regression | 118 PASS; tashqi AI chaqirilmagan |
| User ruxsat bergan surat, to‘liq live oqim | FINISHED / OBSERVATIONS_READY; yetakchi vizual ehtimol FUNGAL_INFECTION |
| Synthetic non-skin live nazorat | UNSUPPORTED_DOMAIN, null probability |
| Saqlangan live natija browser playback | Desktop/mobile PASS; yangi inference chaqirilmagan |
| Haqiqiy live PDF | 3 sahifa, 48775 bayt; render va body/footer geometry PASS |
| Secret scan | 220 source/build faylda server secretlari yo‘q |

Asl 600×450 surat global fokus balli 19.1779, API normalizatsiyasidan so‘ng 17.9478; v2 ikkisini ham WARN deb qaytardi. Eski qoida `<25` bo‘lgani uchun REJECT qilgan. Modelga diagnostik fayl nomi yoki userning kasallik yorlig‘i yuborilmadi. Tashqi model natijasi yakuniy tashxis yoki kalibrlangan kasallik ehtimoli emas.

Live dalillar `.data/evidence/visual-review.json`, `visual-review.pdf`, `visual-review-ui-desktop.png`, `visual-review-ui-mobile.png`. PDF ikkinchi sahifa yakuniy matni bilan footer orasida 45 pt bo‘shliq tekshirildi. Browser qayta screenshot olish bosqichida bitta transport/cleanup timeout kuzatildi; cleanup asl xatoni yashirmasligi uchun 5s bilan chegaralandi va mobile qayta tekshiruv PASS bo‘ldi. Masofaviy CI va keng klinik dataset baholashi bajarilmadi.
