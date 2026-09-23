# Raqamli Dermatolog texnik topshirig‘i tahlili

Manba: `Loyiha TZ.docx`, 1.0-versiya, 2026-yil 21-sentabr. Tahlil sanasi: 2026-yil 23-sentabr. Hujjatdagi 16 bo‘lim, FR-01–FR-12 talablari, jadvallar va qabul mezonlari to‘liq ko‘rib chiqildi.

Loyiha natijasi — teri suratini qabul qiladigan, sifatini tekshiradigan, zararlangan hududni ajratadigan, ehtimoliy kasallik guruhini va xavfni baholaydigan, o‘zbek tilida tushuntirish beradigan web-ilova. U tibbiy tashxis qo‘yuvchi mustaqil xizmat sifatida belgilanmagan. TZ ishlaydigan tadqiqot va dastlabki skrining MVP tizimini talab qiladi.

## 1. Asosiy xulosa

Bu loyihada ikkita alohida natija kerak: ishlaydigan dasturiy tizim va uning ichida ishlaydigan, ma’lumotlar bilan tekshirilgan AI model. React sahifalari, NestJS API va PostgreSQL bazasi tayyor bo‘lishi model aniqligi tasdiqlanganini anglatmaydi. Berilgan papkada TZ bor; dataset, o‘qitilgan model vaznlari, kalibrlash fayllari va test hisobotlari yo‘q.

Shu sabab master prompt faqat chiroyli interfeys yasashni emas, butun foydalanuvchi oqimi, API, saqlash, AI pipeline, testlar va ishga tushirishni talab qiladi. Model yetishmasa, buni ochiq ko‘rsatish shart: tasodifiy foiz, qo‘lda chizilgan segmentatsiya yoki uydirma aniqlik ko‘rsatkichlari bilan “tayyor” deyish mumkin emas. Bitta prompt ishni boshqarishi mumkin; yetishmayotgan dataset, hisoblash resursi va klinik validatsiyani avtomatik kafolatlamaydi.

## 2. Texnologiyalarni foydalanuvchi talabiga moslashtirish

| Qism | Tanlangan yechim | Sabab |
|---|---|---|
| Web interfeys | React, Vite, TypeScript | Foydalanuvchining bevosita talabi |
| UI | Ant Design va moslashtirilgan dizayn tokenlari | “and desgin” Ant Design sifatida talqin qilindi |
| API bilan aloqa | Axios | Yagona HTTP klient, xatolar va sessiya boshqaruvi |
| Server holati | TanStack React Query | So‘rovlar, cache, qayta yuklash va mutatsiyalar |
| Navigatsiya | React Router | SPA sahifalari va himoyalangan marshrutlar |
| Asosiy backend | Node.js, NestJS, TypeScript | Foydalanuvchining Python backend o‘rniga bergan talabi |
| Ma’lumotlar bazasi | PostgreSQL, Prisma | Aloqalar, migratsiyalar va tranzaksiyalar |
| AI servisi | Python, FastAPI, PyTorch, OpenCV | TZdagi trening, segmentatsiya va Grad-CAM uchun alohida hisoblash servisi |
| Uzoq hisoblashlar | Redis, BullMQ, NestJS worker | Tahlillarni navbatga qo‘yish va holatini kuzatish |
| Suratlar | Yopiq S3-compatible object storage | Suratlarni DB matniga yoki public papkaga joylamaslik |
| Ishga tushirish | Docker Compose, reverse proxy | Takrorlanadigan lokal va server muhiti |
| Tekshiruv | Unit, integratsiya, Playwright E2E, ML evaluation | Dastur ishlashi va model natijasini alohida tekshirish |

NestJS asosiy biznes backend bo‘lib qoladi. Python faqat ichki ML servisi uchun ishlatiladi; frontend unga to‘g‘ridan-to‘g‘ri ulanmaydi. Bu foydalanuvchi so‘ragan stack va TZdagi AI kutubxonalarini birlashtirish bo‘yicha arxitektura qaroridir. NestJS TypeScript va Node.js asosida ishlaydi; Prisma va BullMQ uchun rasmiy integratsiya yo‘riqnomalari mavjud. [NestJS](https://docs.nestjs.com/first-steps), [Prisma](https://docs.nestjs.com/recipes/prisma), [BullMQ](https://docs.nestjs.com/techniques/queues).

Kutubxona versiyalari implementatsiya vaqtida moslik bo‘yicha tekshiriladi va lockfile bilan mahkamlanadi. Vite hamda Nest CLI uchun Node talablarini birgalikda hisobga olish kerak. [Vite](https://vite.dev/guide/), [Node.js relizlari](https://nodejs.org/en/about/previous-releases). React Query server holatini boshqarish uchun qo‘llanadi; tibbiy ma’lumotlarni browser diskiga doimiy cache qilish talab qilinmaydi. [TanStack Query](https://tanstack.com/query/latest/docs/framework/react/overview).

## 3. Funksional talablarning qamrovi

| ID | TZ talabi | Amalga oshirish va qabul dalili |
|---|---|---|
| FR-01 | Surat yuklash | Galereya, kamera, bir nechta surat; real multipart upload; browser va API testi |
| FR-02 | Format, hajm va sifat | Fayl signaturasi va dekodlash; blur va yoritish; boshqa sifat tekshiruvlarining haqiqiy imkoniyatlari; rad etish sababi |
| FR-03 | Segmentatsiya | Haqiqiy model maskasi; foydalanuvchi ROI belgisi alohida; geometrik tekshiruv va Dice |
| FR-04 | Tasniflash | Olti guruh va noaniq holat; model label mapping; haqiqiy inference testi |
| FR-05 | Ishonch darajasi | Model score yoki kalibrlangan ehtimolning turi ochiq; uydirma interval bo‘lmaydi |
| FR-06 | Xavf | Past/o‘rta/yuqori, hisoblab bo‘lmasa baholanmadi; sifat va simptomlarni inobatga olish |
| FR-07 | Vizual izoh | Maska, kontur va mavjud bo‘lsa haqiqiy heatmap; original koordinatalar bilan moslik |
| FR-08 | Simptom savollari | Versiyalangan savolnoma, ABCDE, bilmayman javobi, backend validatsiyasi |
| FR-09 | Dermatologga yo‘naltirish | Xavf va noaniqlikka mos o‘zbekcha matn; tasdiqlangan matn shablonlari |
| FR-10 | Tahlillar tarixi | Rozilik asosida saqlash, pagination, filtr, har yozuvda owner tekshiruvi |
| FR-11 | Vaqt bo‘yicha taqqoslash | Bitta teri o‘chog‘i bo‘yicha eski va yangi suratlar; sana va surat sharoiti hisobga olinadi |
| FR-12 | Ma’lumotni o‘chirish | DB, object storage, report, queue, browser cache va backup lifecycle; end-to-end o‘chirish testi |

Boshlang‘ich guruhlar: melanoma yoki shubhali pigmentli o‘zgarish; nevus/xol; ekzema/dermatit; psoriaz; akne; zamburug‘li infeksiya. “Noaniq holat” alohida klinik kasallik sifatida emas, model ishonchi, sifat yoki qo‘llanish doirasi yetarli bo‘lmagan natija sifatida yuritiladi.

## 4. TZdagi ochiq masalalar va qabul qilingan texnik taxminlar

Quyidagi qarorlar asl TZdagi tayyor faktlar emas. Ular master promptni bajariladigan spetsifikatsiyaga aylantirish uchun belgilangan boshlang‘ich defaultlardir.

| Ochiq masala | Default yoki yechim |
|---|---|
| Web yoki mobil | Responsive web va PWA; alohida native ilova bu promptga kirmaydi |
| Foydalanuvchi identifikatsiyasi | Email/parol, sessiya, profil; tahlillarni egasiga bog‘lash |
| Rollar | USER va texnik ADMIN; admin bemor suratlarini avtomatik ko‘ra olmaydi |
| Bir nechta surat nimani anglatadi | Bir case — bir teri o‘chog‘i; 1–5 surat bitta kuzatuvga tegishli |
| Format va hajm | JPEG/PNG/WebP, har biri 10 MiB gacha, jami 30 MiB, 25 MP gacha; serverda tekshirish |
| Rozilik turlari | Qayta ishlash, tarixga saqlash va tadqiqotda qayta ishlatish alohida; tadqiqot roziligi default o‘chiq |
| Tarixga saqlamasdan tahlil | Vaqtinchalik qayta ishlashga rozilik; natijaga kirish 60 daqiqa; fizik tozalash va backup muddatlari alohida ko‘rsatiladi |
| Tarixga saqlash | Faqat alohida rozilik bilan; saqlash siyosati UI’da ko‘rsatiladi |
| Joylashuv va birliklar | UI uz-Latn; DB UTC; ko‘rsatishda Asia/Tashkent; mm faqat ishonchli o‘lchov manbasi bo‘lsa |
| Risk algoritmi | TZdagi 0.35 va 0.70 prototip chegaralari versiyalanadi; klinik validatsiya sifatida talqin qilinmaydi |
| Bir nechta surat ehtimolini birlashtirish | O‘zboshimcha o‘rtacha olinmaydi; model manifestidagi validatsiyalangan usul ishlatiladi |
| AI model berilmagan | Mos, ruxsatli artifactni topish yoki dataset bilan trening; aks holda ochiq bloklovchi holat |
| Offline | App shell va suratga olish yo‘riqnomasi ishlaydi; to‘liq offline inference uchun alohida tekshirilgan edge artifact kerak |
| Hosting va domen | Lokal Compose va tayyor deployment hujjati; real server mavjud bo‘lsa deploy va smoke test |
| Tibbiy matnni tasdiqlovchi mutaxassis | Hozir berilmagan; prototip matni versiyalanadi, klinik release uchun ekspert ko‘rigi zarur |

## 5. ML bo‘yicha hal qiluvchi aniqliklar

### Dataset qamrovi

ISIC 2018 klassifikatsiya tanlovida melanoma, nevus, bazal hujayrali karsinoma, aktinik keratoz/Bowen, benign keratoz, dermatofibroma va tomir o‘zgarishlari ko‘rsatilgan. Bu ro‘yxat TZdagi ekzema, psoriaz, akne va zamburug‘li infeksiya guruhlarini qamrab olmaydi. Shuning uchun “ISIC bilan o‘qitildi” degan jumla ushbu loyihadagi barcha olti guruh ishlashiga dalil bo‘la olmaydi. [ISIC 2018 vazifasi](https://challenge.isic-archive.com/landing/2018/47/).

ISIC kolleksiyalaridagi litsenziyalar bir xil emas; ayrimlari notijorat shartiga ega. Har dataset va model vazni uchun foydalanish shartlari alohida tekshiriladi. [ISIC ma’lumotlar sahifasi](https://challenge.isic-archive.com/data/).

Telefon kamerasi surati bilan dermatoskopik tasvirni avtomatik teng deb qabul qilish mumkin emas. Modelning qo‘llanish sohasi, kirish turi, bemor darajasidagi train/test ajratilishi va tashqi sinovi yozilishi kerak. Bu loyiha uchun oddiy klinik suratlar bo‘yicha dalil bo‘lmasa, telefon suratidagi natija klinik tasdiqlangan deb ko‘rsatilmaydi.

### Ehtimol va xavf

Eng yuqori class score, bemorda kasallik bo‘lish ehtimoli va malignancy ehtimoli uchta turli tushuncha. “Melanoma yoki shubhali pigmentli o‘zgarish” guruhining score’ini avtomatik malignancy ehtimoli deb olish yetarli emas. Risk formulasi uchun kalibrlangan, aniq ta’riflangan signal zarur.

Sifatsiz surat, qo‘llanish doirasidan tashqari tasvir yoki mavjud bo‘lmagan model “past xavf”ga aylantirilmaydi. Natija “baholab bo‘lmadi” bo‘lib chiqadi. Texnik xatolik, past sifat va noaniq model natijasi foydalanuvchiga tushunarli, bir-biridan farqli holatlardir.

### Vizual izoh

Foydalanuvchi belgilagan ROI — segmentatsiya modelining natijasi emas. Segmentatsiya maskasi — Grad-CAM emas. Grad-CAM — o‘smaning aniq chegarasi yoki tashxisning isboti emas. Interfeys va hisobotda har bir qatlamning manbasi va vazifasi aniq yoziladi.

### Metrikalar

TZ maqsadlari: Accuracy ≥ 0.85; xavfli holatlar Sensitivity ≥ 0.90; Specificity ≥ 0.80; Macro-F1 ≥ 0.80; ROC-AUC/PR-AUC ≥ 0.85; Dice ≥ 0.85; inference ≤ 3 soniya. Bular mavjud natijalar emas.

70/15/15 ajratish bemor darajasida bajariladi. Test to‘plami bilan threshold tanlanmaydi. Hisobotda sinf sonlari, sample soni, bemorlar soni, subgroup natijalari, interval hisoblash usuli, hardware, warm/cold inference va p50/p95 ko‘rsatiladi. ROC-AUC va PR-AUC alohida hisoblanadi; bittasining yaxshi chiqishi ikkinchisining o‘rniga yozilmaydi. Segmentatsiya ground truth’i bo‘lmasa Dice tasdiqlanmagan deb qoladi.

## 6. Qo‘shimcha funksiyalarni qamrab olish

TZdagi kreativ funksiyalar master promptdan chiqarib tashlanmagan:

- ABCDE savolnoma va izoh; A/B/C uchun o‘lchangan, taxminiy va foydalanuvchi kiritgan ma’lumotlar farqlanadi; D uchun o‘lchovsiz millimetr uydirilmaydi; E bir o‘choqning vaqt davomida o‘zgarishi bilan bog‘lanadi.
- Vaqt bo‘yicha yonma-yon va slider taqqoslash; mos kelmagan masshtabdan klinik o‘sish foizi chiqarilmaydi.
- Bir nechta ehtimoliy natija; ular bitta modelning alternativalari bo‘lsa, mustaqil shifokor “ikkinchi fikri” sifatida reklama qilinmaydi.
- O‘zbekcha tushuntirish va simptomga mos savollar.
- PWA offline imkoniyatlari va edge inference uchun alohida bajarilish sharti; app shell ishlashi to‘liq offline AI deb ko‘rsatilmaydi.
- Dermatolog bilan bo‘lishish uchun yuklab olinadigan PDF; foydalanuvchi topshirig‘isiz tashqi manzilga yuborilmaydi.
- Tanlov demo ssenariysi, pitch matni, texnik hisobot va model xatolari tahlili.

## 7. Maxfiylik va ma’lumot hayot sikli

Rozilik bir dona umumiy checkbox bilan yopilmaydi. Suratni qayta ishlash, uzoq saqlash va treningda qayta ishlatish alohida maqsadlar hisoblanadi. EXIF/GPS olib tashlanadi, lekin bu surat to‘liq anonim bo‘ldi degani emas.

Suratlar public URL bilan ochilmaydi. API har bir case, surat, natija va PDF uchun egani tekshiradi. Log, analytics, exception tracker va navbat payloadlariga suratning o‘zi, simptomlar va parollar yozilmaydi. O‘chirish vaqtida worker natijani qayta yaratib qo‘ymasligi uchun deletion holati tekshiriladi.

MVP uchun taklif etilgan texnik siyosat: foydalanuvchi o‘chirganda kirish darhol yopiladi, aktiv saqlashdagi nusxalar 24 soat ichida tozalanadi, backup nusxalari ko‘pi bilan 30 kunlik lifecycle orqali chiqadi. Vaqtinchalik tahlilda 60 daqiqa natijaga kirish muddati; bu barcha fizik nusxalar 60 daqiqada yo‘qolishini anglatmaydi. Vaqtinchalik suratlar bucket’i backup/versioningga kirmaydi, umumiy DB/WAL nusxalari esa 30 kunlik chegaraga bo‘ysunadi; bu farq oldindan rozilik matnida yoziladi. Bu qonuniy majburiyat bayoni emas, implementatsiya defaulti; haqiqiy hosting siyosatiga mos va tekshiriladigan qilib belgilanadi. Restore jarayoni o‘chirilgan yoki muddati tugagan ma’lumotlarni qayta jonlantirmasligi kerak.

## 8. Tayyorlikni to‘g‘ri baholash

| Tayyorlik turi | Zarur dalil |
|---|---|
| Dastur ishlaydi | Toza muhitda build/start, DB migratsiyasi, real API/storage, browser E2E |
| AI pipeline ishlaydi | Haqiqiy artifact, checksum, label mapping, inference va segmentatsiya dalili |
| Model TZ maqsadiga yetdi | Ajratilgan test datasetidagi qayta hisoblanadigan metrikalar |
| Klinik foydalanishga tayyor | Tegishli ekspert tekshiruvi, qo‘llanish doirasiga mos validatsiya va release qarori |

Master promptdagi “tayyor” mezoni bajarilgan ishni fayl, endpoint, test va hisobot bilan isbotlashga asoslangan. Faqat sahifalar ochilishi, synthetic seed natijalari yoki test fixture’lari to‘liq AI qabul mezonini bajarmaydi.

## 9. Promptdan foydalanish

`RAQAMLI_DERMATOLOG_MASTER_PROMPT.md` faylining butun mazmuni bitta prompt sifatida beriladi. Unda loyiha talablari takror yozilgan, shuning uchun mazmunni tushunish uchun ushbu tahlil fayliga qaram emas. Prompt kod yozish, terminal ishlatish va browserda tekshirish imkoniyatiga ega agentga mo‘ljallangan.

Mavjud bo‘lsa, original TZ, ruxsatli dataset manzili, model vaznlari, model litsenziyasi va serverga ulanish ma’lumotlari qo‘shimcha kontekst bo‘lib xizmat qiladi. Secretlarni prompt yoki Git’ga yozish o‘rniga muhitning secret boshqaruvi orqali berish kerak.
