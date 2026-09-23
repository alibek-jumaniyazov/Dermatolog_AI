# Qabul holati

Holat sanasi: 2026-09-23. Loyiha **lokal ishlaydigan dastur va rozilik asosidagi OpenAI vizual kuzatuvi** sifatida tekshirilgan. **Asl TZdagi barcha klinik AI mezonlari bajarilgan loyiha** deb qabul qilinmaydi.

## 1. Dasturiy tayyorlik

| Gate | Holat | Dalil va amaliy chegara |
|---|---|---|
| JS/TS build, typecheck, lint | **PASS** | Root tekshiruvlari hamda web strict TypeScript/ESLint. Aniq command/output: [TEST_REPORT.md](TEST_REPORT.md). |
| Unit/component mantiq | **PASS** | Backend 18, frontend 5, ML service 20 test o‘tgan. Frontend file count/type/size chegaralari; backend xavf/consent/schema; ML texnik sifat, auth, no-model va external consent tekshiruvlari. Bu sonlar klinik metrikalar emas. |
| Mahalliy real API/PostgreSQL/storage | **PASS** | 28 API integration tekshiruvi: auth, owner isolation, rozilik, haqiqiy upload/quality/ROI/symptoms, history, export, expiry, deletion access block, refresh rotation. [integration-test.mjs](../scripts/integration-test.mjs). |
| Browser: register → dashboard → sozlamalar | **PASS** | Desktop/mobile Playwright suite jami **4/4 test o‘tgan**; asosiy oqim [app.spec.ts](../tests/e2e/app.spec.ts)da. Yakuniy exit va screenshotlar [TEST_REPORT.md](TEST_REPORT.md)da. |
| Browser: consent → upload → ROI → quality → symptoms | **PASS** | Shu 4/4 suite tarkibida haqiqiy backend bilan desktop/mobile tekshiruv. Tashqi AI roziligi berilmaganida AI submit bloklanishi va sifat qoralamasini ko‘rish sinovdan o‘tgan. [upload.spec.ts](../tests/e2e/upload.spec.ts). |
| Production PWA offline fallback va API cache izolyatsiyasi | **PASS — cheklangan offline imkoniyat** | Production origin to‘xtatilganda offline yo‘riqnoma ochildi; API response’lari cache’da yo‘q. `.data/evidence/offline.png`. Bu offline AI emas. |
| Haqiqiy OpenAI → durable job → result → PDF | **PASS — integratsiya** | Synthetic tasvir bilan haqiqiy Responses API chaqiruvi, job va PDF ishladi. Javob `UNSUPPORTED_DOMAIN`, risk `NOT_ASSESSED`; kasallik yoki probability uydirilmagan. [live-flow.mjs](../scripts/live-flow.mjs), [live-ai-smoke.py](../scripts/live-ai-smoke.py), `.data/evidence/live-ai-smoke.json`. |
| Barcha salbiy browser/device/accessibility holatlari | **QISMAN** | Loading/error/offline/permission fallback UI mavjud; tekshirilgan oqimlarda clipping va page error kuzatilmagan. Real kamera ruxsatlari, barcha 360/768/1024/1440 o‘lchamlar va to‘liq accessibility audit bitta o‘tgan testga tenglashtirilmaydi. |
| Password recovery va lokal fizik deletion | **PASS** | 30 privacy integration tekshiruvi: haqiqiy lokal Mailpit xati, bir martalik reset, eski sessiyalarni bekor qilish, deletion receipt, DB/private bytes/report cleanup. [privacy-integration.mjs](../scripts/privacy-integration.mjs). |
| Compare va barcha mutation race’lari | **QISMAN** | Implementatsiya va guardlar mavjud. Ikki tarixni browserda compare qilish, parallel delete/retry/restart matritsasi uchun qo‘shimcha integration dalili zarur. |
| Production deletion/backup lifecycle | **QISMAN** | Lokal fizik cleanup va darhol kirishni yopish tekshirildi. Production backup restore, object version purge va 24 soat/30 kun siyosati yakuniy infratuzilmada tekshirilishi kerak. |
| Docker/S3/Redis ishlab chiqarish muhiti | **TEKSHIRILMAGAN** | Compose/adapters yozilgan. Ushbu muhitda Docker Engine yo‘q. Lokal private filesystem/PostgreSQL runner dalili container integratsiyasi deb ko‘rsatilmaydi. |
| Haqiqiy domen/TLS va tashqi deployment | **BLOKLANGAN** | Server/domen berilmagan. Lokal URL ishlashi tashqi production deployment degani emas. |

**Dasturiy xulosa:** asosiy lokal vertikal oqim ishlaydi va sinovdan o‘tgan. Yuqoridagi qisman yoki tekshirilmagan bandlar borligi uchun barcha production software qabul mezonlari to‘liq yopilgan deb aytilmaydi.

## 2. AI va model tayyorligi

| Gate | Holat | Nima yetishmaydi yoki nima tekshirildi |
|---|---|---|
| Haqiqiy fokus/yorug‘lik o‘lchovlari | **PASS — texnik qism** | OpenCV hisoblari, blur/dark reject va zararli kirish chegaralari service testlarida tekshirildi. |
| Teri/zararlangan joy, masofa, to‘silish quality modeli | **BLOKLANGAN** | Mos trained artifact va domain bo‘yicha baholash yo‘q. `NOT_ASSESSED` natijasi halol saqlanadi. |
| Ochiq, trained olti sinfli dermatologik classifier | **BLOKLANGAN** | Litsenziyasi, labels/domain qamrovi va checksum tekshirilgan mos weights hamda held-out dataset zarur. Loader/training skriptlari trained model hisoblanmaydi. |
| Avtomatik segmentatsiya va haqiqiy heatmap | **BLOKLANGAN** | Mos segmentation/attribution artifactlari va ground-truth maskalar zarur. Qo‘lda ROI ushbu bandni bajarmaydi. |
| Malignancy head va kalibrlangan risk | **BLOKLANGAN** | Malignant target ta’rifi, kalibrlangan signal, validation/test dalili zarur. OpenAI javobi uchun risk `NOT_ASSESSED`. |
| Accuracy ≥0.85, sensitivity ≥0.90, specificity ≥0.80, Macro-F1 ≥0.80, ROC-AUC/PR-AUC ≥0.85 | **BLOKLANGAN / O‘LCHANMAGAN** | Bemor darajasida ajratilgan mos test dataset va haqiqiy trained classifier yo‘q. API ulanishi ushbu metrikalarni isbotlamaydi. |
| Dice ≥0.85 va klinik inference ≤3 soniya | **BLOKLANGAN / O‘LCHANMAGAN** | Real segmentation ground truth va belgilangan hardware’da benchmark kerak. OpenAI network javob vaqti bu gate o‘rniga qo‘yilmaydi. |
| OpenAI umumiy vizual kuzatuvi | **PASS — integratsiya** | Alohida external AI roziligi, server-only credential, structured response va null score ishlaydi. OpenAI open-source model emas va klinik tasdiqlangan classifier sifatida taqdim etilmaydi. |

To‘liq model qabulini yopish uchun [MODEL_CARD.md](MODEL_CARD.md), [DATASET_CARD.md](DATASET_CARD.md), [ML_EVALUATION.md](ML_EVALUATION.md)dagi yetishmayotgan artifact/evaluation dalillari kerak. `pnpm verify:ml`ning model yo‘qligida nonzero qaytishi kutilgan fail-closed holatdir.

## 3. Qo‘shimcha TZ qamrovi

- **Bajarilgan dasturiy imkoniyatlar:** ABCDE savolnoma, o‘zbekcha matnlar, bir case bo‘yicha tarix/compare UI/API, faqat provider qaytargan muqobil guruhlar, private PDF, eksport, demo ssenariy, pitch va texnik hisobot.
- **Tekshirilgan cheklangan offline imkoniyat:** PWA static resources va offline yo‘riqnoma origin o‘chirilgan holda sinovdan o‘tdi. API response’lari service worker cache’ida yo‘q; tibbiy suratlar, tokenlar va natijalar avtomatik disk cache’iga yozilmaydi.
- **Bloklangan:** to‘liq offline/edge AI. Mos litsenziyali edge artifact, preprocessing/output parity, qurilma memory/latency sinovi kerak.

## 4. Klinik release

**BLOKLANGAN.** Klinik ekspert tasdig‘i, intended-use bo‘yicha klinik validatsiya va release qarori olinmagan. Amaldagi holat — **tadqiqot va dastlabki skrining prototipi**. Software testlari, chiroyli UI yoki muvaffaqiyatli OpenAI chaqiruvi bu holatni o‘zgartirmaydi.

Natija oynasi va PDF’dagi matn: “Bu natija dastlabki skrining uchun. Yakuniy tashxisni dermatolog qo‘yadi.”

To‘liq talab–fayl–dalil xaritasi: [TRACEABILITY.md](TRACEABILITY.md). Test natijalarining oxirgi tasdiqlangan hisobi: [TEST_REPORT.md](TEST_REPORT.md).
