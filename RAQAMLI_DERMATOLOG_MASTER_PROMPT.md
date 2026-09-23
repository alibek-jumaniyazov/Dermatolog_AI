# Raqamli Dermatolog loyihasini boshidan oxirigacha yaratish uchun master prompt

Sen tajribali full-stack muhandis, solution architect, ML muhandis, product designer va QA sifatida ishlaysan. Quyidagi talablar asosida **Raqamli Dermatolog** loyihasini joriy ish papkasida boshidan oxirigacha yarat, ishga tushir va tekshir. Faqat reja, maslahat, kod namunasi yoki maket berib to‘xtama. Haqiqiy fayllar, ishlaydigan frontend, backend, ma’lumotlar bazasi, AI integratsiyasi, testlar va ishga tushirish hujjatlarini tayyorla.

Bu prompt mustaqil spetsifikatsiyadir. Agar `Loyiha TZ.docx` mavjud bo‘lsa, uni ham to‘liq o‘qi. Manba TZ: “Raqamli Dermatolog”, 1.0, 2026-yil 21-sentabr. Ushbu promptdagi texnologiya tanlovi foydalanuvchining keyingi ko‘rsatmasidir: React/Vite/TypeScript/Ant Design/Axios/React Query va Node.js/NestJS/PostgreSQL. Manba faylni o‘zgartirma.

## 1. Ishlash tartibi va natija uchun javobgarlik

1. Ishni repository, mavjud fayllar, muhit, resurslar va tegishli loyiha ko‘rsatmalarini tekshirishdan boshla. Mavjud foydali ishni saqla. Loyihani texnik qarorlarga mos izchil rivojlantir.
2. Qisqa bajarish rejasi tuz va darhol kod yozishni boshla. “Davom etaymi?” deb har bosqichda to‘xtama. Oddiy implementatsiya tanlovlarini o‘zing hal qilib `docs/ASSUMPTIONS.md`da qayd et.
3. Faqat chetdan olinishi shart bo‘lgan model/dataset, huquq, credential yoki hisoblash resursi bo‘lmasa, aniq yetishmayotgan narsani bildir. Unga bog‘liq bo‘lmagan ishlarni davom ettir. Secret, tibbiy dalil va ruxsatni uydirma.
4. Har modul UI → API → DB/storage → xizmat → test zanjirida ishlasin. Frontenddagi muvaffaqiyat xabari real server amali muvaffaqiyatli tugagandan keyin chiqsin.
5. Production yo‘liga mock, random natija, hardcoded tashxis, filename-based classification, soxta progress, ishlamaydigan tugma yoki tugallanmagan asosiy TODO qo‘yma. Test fixture’lari faqat izolyatsiyalangan test rejimida ruxsat etiladi.
6. Build, typecheck, lint, zarur testlar va real ishga tushirishni o‘zing bajar; xatolarni tuzat. Ishga tushirmagan komandani “o‘tdi” deb yozma.
7. Ish davomida qisqa, mazmunli status ber. Kontekst uzilsa davom ettirish uchun `docs/IMPLEMENTATION_STATUS.md`da bajarilgan, qolgan, bloklangan ish va tekshirilgan komandalarni yangila. Bajarilmagan talabni bajarilgan deb belgilama.
8. Parallel agentlar mavjud bo‘lsa frontend, backend, ML va tekshiruvning mustaqil qismlarini taqsimla; umumiy contractlarni oldin kelishtir va integratsiyani o‘zing tekshir.
9. Pullik xizmat, yangi account yoki cloud xarajati majburiy bo‘lmasin. Lokal asosiy oqim real PostgreSQL va object storage bilan ishlasin. Tashqi deployment faqat berilgan muhit/ruxsat doirasida bajarilsin.
10. Loyihani to‘liq qabul qilish uchun quyidagi software va ML gate’lari alohida bajarilishi shart. ML model yetishmasligi yashirilmasin va mavjud bo‘lmagan AI o‘rniga soxta natija chiqarilmasin.

## 2. Mahsulot vazifasi va chegaralari

Foydalanuvchi teridagi bitta o‘zgarishning bir yoki bir nechta suratini yuklaydi yoki kamera orqali oladi. Tizim sifatni baholaydi, zararlangan hududni aniqlaydi, simptomlarni hisobga oladi, ehtimoliy kasallik guruhlarini chiqaradi, xavfni baholaydi va keyingi harakatni o‘zbek tilida tushuntiradi. Foydalanuvchi roziligi bilan tarix va vaqt bo‘yicha monitoring ishlaydi.

Tizim dastlabki skrining va tadqiqot prototipidir. U yakuniy tashxis qo‘ymaydi. Har natija ekranida va PDF’da quyidagi mazmun aniq ko‘rinsin: **“Bu natija dastlabki skrining uchun. Yakuniy tashxisni dermatolog qo‘yadi.”** Hujjatdagi cheklovlar mahsulotning o‘zida tushunarli berilsin.

Quyidagi olti guruh majburiy:

| Ichki kod | O‘zbekcha nom |
|---|---|
| SUSPICIOUS_PIGMENTED | Melanoma yoki shubhali pigmentli o‘zgarish |
| NEVUS | Nevus yoki xol |
| ECZEMA_DERMATITIS | Ekzema yoki dermatit |
| PSORIASIS | Psoriaz |
| ACNE | Akne |
| FUNGAL_INFECTION | Zamburug‘li infeksiya |

`UNCERTAIN` — sifat, ishonch yoki qo‘llanish doirasi yetarli bo‘lmagandagi alohida natija. Uni isbotsiz yettinchi o‘qitilgan kasallik sinfi deb ko‘rsatma. Model barcha olti guruhni qo‘llamasa, qo‘llamaganlarini ishlaydi deb yozma va umumiy AI qabulini yopma.

MVPga telemeditsina chat, dori yozish, to‘lov, qabul bronlash, bemorlarning ommaviy galereyasi yoki native mobil ilova qo‘shilmaydi. Web responsive bo‘ladi, PWA imkoniyatlari bo‘ladi. Dermatolog uchun hisobot foydalanuvchi tomonidan yuklab olinadi; avtomatik tashqi yuborish shart emas.

## 3. Majburiy texnologiyalar

### Frontend

- React + Vite + TypeScript, strict mode.
- Ant Design va `@ant-design/icons`; tayyor default ko‘rinishni brendga mos tokenlar va tartibli CSS Modules bilan takomillashtir. Ikkinchi katta UI kutubxonasini aralashtirma.
- React Router; himoyalangan sahifalar, route error boundary va lazy loading.
- Axios: bitta konfiguratsiyalangan client, timeout, request ID, AbortSignal, credential va typed error handling.
- TanStack React Query: server ma’lumotlari, query key factory, mutation, invalidation va tahlil statusini polling orqali olish. Patient data’ni localStorage/IndexedDB’da avtomatik persist qilma.
- Ant Design Form va backendga mos validatsiya; Zod faqat zarur client/runtime schema uchun. Bir formada bir nechta competing state tizimi bo‘lmasin.
- `react-i18next` yoki teng sodda translation arxitekturasi; to‘liq `uz-Latn` matnlar.
- `dayjs` yoki mos date utility; DB va API UTC, ekranda Asia/Tashkent.
- Zustand faqat murakkab lokal wizard holati uchun zarur bo‘lsa; API natijalarini unda takror saqlama.
- Vitest, React Testing Library, Playwright; accessibility uchun axe tekshiruvlari.

### Asosiy backend

- Qo‘llab-quvvatlanayotgan Node.js LTS + NestJS + TypeScript.
- PostgreSQL + Prisma, migration va transactionlar. Productionda destructive schema sync ishlatma.
- `class-validator`, `class-transformer`, global ValidationPipe, allowlist DTO va izchil exception format.
- OpenAPI/Swagger; undan frontend uchun types/client contract generatsiyasi yoki avtomatik contract tekshiruvi.
- Redis + BullMQ; ML ishlarini alohida NestJS worker processda bajar.
- S3-compatible private object storage; lokal Compose uchun mos ruxsatli image’ni tekshir va pin qil. Suratlar public papkada saqlanmasin.
- Auth: Argon2id password hashing, qisqa muddatli JWT access token, rotatsiyali refresh sessiyalari, RBAC va resource ownership guard.
- Helmet, explicit CORS, CSRF/Origin himoyasi, rate limiting, sanitizatsiyalangan structured logs va audit.
- PDF report uchun server-side kutubxona yoki HTML→PDF renderer; o‘zbekcha Unicode fontni bundle qil.

### ML servisi

- Python + FastAPI + PyTorch + OpenCV + Albumentations + scikit-learn; explainability uchun Captum yoki tekshirilgan ekvivalent.
- NestJS biznes backend bo‘lib qoladi. Python faqat trening/inference/segmentatsiya/quality/attribution vazifalarini bajaradi.
- ML servisi private networkda; brauzer undan bevosita foydalanmaydi. Servis tokeni browserga chiqmaydi.
- CPU rejimi ishlasin; GPU bo‘lsa optional Compose profile. Model real inference qilsin.
- ONNX/edge kerak bo‘lsa alohida export va numerical parity tekshiruvlari bo‘lsin.

### Umumiy infratuzilma

- pnpm workspace monorepo; Python dependency lock alohida.
- Docker multi-stage build, Docker Compose, reverse proxy, healthcheck va persistent volume.
- ESLint, Prettier, Python lint/type/test vositalari; mos versiyalarni tanla.
- Kutubxonalarni ko‘r-ko‘rona `latest`ga qoldirma. O‘rnatish vaqtida rasmiy hujjatlardan kompatibil stable versiyalarni aniqlab, lockfile, `engines`, runtime versiyasi va Docker image tag/digestlarini mahkamla.
- React/Ant Design, Vite/Node, Nest/Node, Prisma/Node va PyTorch/Python/CUDA mosligini tekshir. “Eng yangi” degani “o‘zaro mos” degani emas.

Tekshirish uchun rasmiy boshlang‘ich manbalar: [Vite](https://vite.dev/guide/), [Ant Design](https://ant.design/docs/react/getting-started/), [TanStack Query](https://tanstack.com/query/latest/docs/framework/react/overview), [NestJS](https://docs.nestjs.com/first-steps), [NestJS va Prisma](https://docs.nestjs.com/recipes/prisma), [NestJS queues](https://docs.nestjs.com/techniques/queues). Versiya talablarini bajarish vaqtida qayta tekshir.

## 4. Arxitektura va fayllar

Quyidagi yoki shu darajada tartibli tuzilmani yarat:

```text
apps/
  web/                 React SPA
  api/                 NestJS HTTP API
  worker/              NestJS BullMQ worker
services/
  ml/                  FastAPI inference va model loading
ml/
  data/                manifest va schema; raw patient data Gitga kirmaydi
  training/            quality, segmentation, classification treningi
  evaluation/          metrikalar, calibration, subgroup va benchmark
  export/              artifact/ONNX eksporti
packages/
  api-client/          generated frontend contract
  shared/              xavfsiz umumiy enum va schemalar
infra/
  docker/
  proxy/
scripts/
tests/
  e2e/
  fixtures/            litsenziyasi aniq synthetic yoki ruxsatli test data
docs/
```

Frontend → NestJS API → PostgreSQL/private storage. API job yaratadi, worker ML servisga tekshirilgan tasvirni uzatadi, natijani saqlaydi. Frontend real job statusini API orqali oladi. Redisdagi job payload faqat identifikatorlar va texnik metadata bo‘lsin; suratning o‘zi yoki simptom matni emas.

Backendni Auth, Users, Consent, Cases, Uploads, Analyses, InferenceGateway, Risk, Reports, Deletion, Audit, Health va Admin modullariga ajrat. Controller yupqa, biznes qoidalari service/use-case’da bo‘lsin. Frontendda features bo‘yicha ajrat; bitta ulkan component yoki service yozma.

DB transaction bilan job enqueue orasidagi uzilishni outbox yoki teng ishonchli reconciliation bilan hal qil. Worker restart bo‘lsa ish yo‘qolmasin. Retry duplicate natija va duplicate report yaratmasin. `analysisId + inputRevision` asosida idempotent processing bo‘lsin.

## 5. Foydalanuvchi oqimi

1. Foydalanuvchi mahsulot vazifasi va cheklovini ko‘radi, ro‘yxatdan o‘tadi yoki kiradi.
2. “Yangi tahlil”da yangi teri o‘chog‘i/case ochadi yoki avvalgi case’ni tanlaydi. Bir case bitta anatomik joydagi kuzatuvga tegishli.
3. Serverga surat yuborishdan oldin qayta ishlash roziligini beradi. Tarixga saqlash va tadqiqot uchun rozilik alohida.
4. Kamera yoki galereyadan 1–5 surat tanlaydi. Bitta tahlildagi suratlar bir joyning rakurslari ekanini tasdiqlaydi.
5. Preview, aylantirish/orientationni to‘g‘rilash va ixtiyoriy ROI belgilash ishlaydi. ROI bekor qilinishi/qayta chizilishi mumkin.
6. Har surat serverda format, hajm, xavfsiz dekodlash va sifat bo‘yicha tekshiriladi. Rad etilgan surat uchun aniq qayta olish ko‘rsatmasi chiqadi.
7. Foydalanuvchi simptom va ABCDE savollariga javob beradi; bilmayman javobi ham mavjud.
8. Tahlilni boshlaydi. Real bosqichlar ko‘rinadi: navbatda, sifat tekshiruvi, hududni aniqlash, tasniflash, natijani tayyorlash. O‘lchanmaydigan progress uchun uydirma foiz qo‘yma.
9. Natijada ehtimoliy guruhlar, model ishonchi, sifat, xavf yoki baholab bo‘lmaslik sababi, vizual qatlamlar va tavsiya ko‘rinadi.
10. Rozilik bo‘lsa tarixga saqlanadi; keyinchalik xuddi shu case’ga yangi kuzatuv qo‘shilib taqqoslanadi.
11. Foydalanuvchi PDF hisobotni yuklab oladi yoki bitta tahlilni/case’ni/barcha ma’lumotini o‘chiradi.

Har qadamda loading, empty, validation error, timeout, offline, forbidden va retry holatlari bo‘lsin. Texnik uzilish natijani tibbiy “past xavf”ga aylantirmasin.

## 6. Sahifalar va dizayn

Quyidagi sahifalarni to‘liq ishlat:

- `/` — qisqa mahsulot tavsifi, qanday ishlashi, cheklov va asosiy CTA.
- `/login`, `/register`, `/forgot-password`, `/reset-password` — real auth oqimlari.
- `/app` — faqat foydalanuvchining haqiqiy ma’lumotlariga tayangan dashboard, yangi tahlil, so‘nggi kuzatuvlar, bo‘sh holat.
- `/app/analyses/new` — bosqichma-bosqich tahlil wizard.
- `/app/analyses/:id` — processing va natija; refreshdan keyin mavjud holat tiklanadi.
- `/app/history` — sana, risk, case va status bo‘yicha filter/sort/pagination.
- `/app/cases/:id` — bir o‘choq timeline’i va yangi kuzatuv.
- `/app/cases/:id/compare` — ruxsatli ikkita kuzatuvni yonma-yon va slider bilan taqqoslash.
- `/app/settings` — profil, sessiyalar, consent boshqaruvi, data export va o‘chirish.
- `/privacy`, `/consent`, `/limitations` — haqiqiy implementatsiya siyosati bilan mos matn.
- `/admin` — servis salomatligi, queue va model versiyalari, anonim agregat texnik metrikalar; bemor suratlari galereyasi emas.
- 404 va kutilmagan xatolik sahifalari.

Dizayn professional tibbiy servisga mos: oq/och kulrang asos, to‘q ko‘k matn, teal asosiy rang, xavf uchun semantik ranglar. Masalan brand `#0F766E`, text `#0F172A`, background `#F8FAFC`; kontrastni tekshirib moslashtir. Ant Design `ConfigProvider` tokenlarini markazlashtir. 8px spacing tizimi, aniq tipografiya, yaxshi whitespace, responsive grid, 44px atrofidagi qulay touch targetlar va ko‘rinadigan keyboard focus bo‘lsin.

360, 768, 1024 va 1440px o‘lchamlarda tekshir. Riskni faqat rang bilan ifodalama: matn va ikonka ham bo‘lsin. Chart yoki progress aniq ma’lumot bersin. Keraksiz animatsiya, bezakli gradientlar va soxta statistikalar bo‘lmasin. `prefers-reduced-motion`ga rioya qil.

Kamera ruxsati rad etilsa galereya fallback’i bo‘lsin. `getUserMedia` uchun HTTPS/localhost talabini deploymentda hisobga ol; kamerani component yopilganda to‘xtat. File input mobil capture’ni qo‘llasin. UI’da mixed language, lorem ipsum, “coming soon” yoki ishlamaydigan link qoldirma.

## 7. Upload va sifat tekshiruvi

Quyidagi raqamlar TZda berilmagan implementatsion defaultlar bo‘lib, konfiguratsiya orqali o‘zgartiriladi:

- JPEG, PNG, WebP; bitta surat ≤10 MiB, jami ≤30 MiB, 1–5 fayl.
- Dekodlangan tasvir ≤25 megapiksel; eng qisqa tomon kamida 256px. Bu texnik chegaralar klinik sifat kafolati emas.
- SVG, animated format, buzilgan fayl, MIME/signatura nomuvofiqligi, katta decompression payload rad etiladi. HEIC tanlansa tushunarli konvertatsiya ko‘rsatmasi; uni jim yo‘qotma.
- Client validatsiyasi bilan cheklanma. Server upload stream hajmini limitlaydi, magic bytes, decoder va pixel limitni tekshiradi.
- Server orientatsiyani normalizatsiya qiladi, tasvirni xavfsiz qayta encode qiladi va EXIF/GPSni olib tashlaydi. Default serverda faqat shu sanitizatsiyalangan asosiy nusxa saqlanadi; kelgan raw fayl dekodlashdan keyin tozalanadi. UI’dagi “Asosiy surat” shu nusxa bo‘ladi. Storage key tasodifiy va patient ismini oshkor qilmaydigan bo‘lsin.
- Original→normalized→model koordinata transformlarini saqla; ROI, maska, heatmap va crop bir-biriga mos bo‘lsin.

Quality natijasi har surat uchun `PASS | WARN | REJECT` va reason code’larni qaytarsin. Har check alohida `PASS | WARN | REJECT | NOT_ASSESSED` holatiga ega. Blur va exposure haqiqatan hisoblanadi. Teri/zararlangan joy ko‘rinishi, masofa va to‘silish uchun mos model yoki validatsiyalangan usul kerak; implement qilinmagan check’ni `passed` deb qaytarma. Zarur check bajarilmasa `assessmentComplete: false`, umumiy holat kamida WARN va ushbu talab qabuli ochiq bo‘lsin. Modelning intended-use’i uchun zarur sifat signali yetishmasa klinik riskni hisoblama.

Sifatsiz surat uchun: **“Aniqroq natija uchun yorug‘ joyda, fokuslangan va zararlangan joy ko‘rinadigan surat oling.”** Sababga mos qo‘shimcha ko‘rsatma ber. Thresholdlarni turli kamera/teri rangida tekshirmasdan klinik ishonchli deb e’lon qilma.

Multi-image submissionda foydalanuvchi qolgan yaroqli suratlar bilan davom etishni aniq tanlaydi yoki rad etilganlarini almashtiradi; birortasini jim e’tiborsiz qoldirma. Bir tahlildagi tasvirlar submissiondan so‘ng immutable bo‘ladi; almashtirish yangi revision/tahlil yaratadi.

## 8. Simptomlar, ABCDE va tavsiya

Versiyalangan, sodda o‘zbekcha savolnoma yarat: qachondan beri borligi, vaqt davomida o‘zgarish, qichishish, og‘riq, qonash, rang/chegara o‘zgarishi, foydalanuvchi bilsa diametr, anatomik joy va shunga tegishli izoh. Har zarur savolda “Bilmayman” varianti mavjud bo‘lsin. Keraksiz shaxsiy ma’lumot yig‘ma.

ABCDE ko‘rinishi:

- A — assimetriya;
- B — chegaralar;
- C — ranglar;
- D — diametr;
- E — vaqt davomida o‘zgarish.

O‘lchangan model feature’i, foydalanuvchi javobi va tushuntiruvchi ta’limiy matn alohida belgilanadi. Fizik scale bo‘lmasa pikselni millimetrga aylantirma. ABCDE’ni barcha kasallik guruhlari uchun tasdiqlangan universal diagnostika deb ko‘rsatma.

Savolnoma natijaga ulanadi: risk qatlamiga typed input sifatida kiradi, qaysi qoida ishlagani saqlanadi. Tibbiy mutaxassis tasdiqlamagan simptom mapping’ini klinik qoida deb uydirma. Prototipda simptomlar ko‘rib chiqishni talab qiluvchi flag va tavsiya matniga ta’sir qilishi mumkin, lekin model riskini o‘zboshimcha pasaytirmaydi; aniq qoida va cheklovlar hujjatlanadi.

Tavsiyalar serverdagi versiyalangan template’lardan keladi. Erkin LLM matniga tibbiy tashxis/davolashni topshirma. Dori nomi, doza yoki o‘zicha davolanish ko‘rsatmasi yaratma. Yuqori xavf va noaniq holatda dermatologga murojaat qilish tavsiyasi bo‘lishi shart.

## 9. Haqiqiy AI va model artifactlari

Pipeline: surat → sifat nazorati → zararlangan hudud → preprocessing → klassifikatsiya → xavf bahosi → vizual tushuntirish → tavsiya.

### Modelni tayyorlash

Avval mavjud repository va berilgan resurslardan trained quality, segmentation va classification artifactlarini qidir. Har birining litsenziya, manba, input domain va class mapping’ini tekshir. Mos ochiq artifactdan foydalanish mumkin, lekin link/nom borligi yetarli emas: yuklab ol, checksum tekshir, modelni yukla va haqiqiy inference bajar.

Tayyor artifact yetarli bo‘lmasa qonuniy datasetlar bilan takrorlanadigan trening/evaluation/export pipeline yarat va mavjud resurslar bilan ishga tushir. Modelni noldan samarali o‘qitish imkoni bo‘lmasa transfer learning ishlat. Faqat trening skripti yozish yoki untrained/random weights saqlashni “model tayyor” deb ko‘rsatma.

ISIC 2018 sinflari bu loyihadagi barcha kasallik guruhlariga teng emas. Ekzema/dermatit, psoriaz, akne va zamburug‘li infeksiya uchun haqiqiy mos labels/data/artifact kerak. Bir datasetdagi sinfni shunchaki boshqa nomga o‘girib yetishmayotgan sinfni yasama. Telefon klinik surati bilan dermatoskopiya domainini farqla. Manba: [ISIC 2018 task 3](https://challenge.isic-archive.com/landing/2018/47/); litsenziyalarni [ISIC dataset sahifasi](https://challenge.isic-archive.com/data/) va har artifactning o‘z manbasidan tekshir.

Mahsulotning asosiy kirishi oddiy kamera bilan olingan klinik suratdir. Shu domain va barcha olti guruhga mos held-out evaluation bo‘lmasa telefon orqali tahlil qamrovi BLOCKED hisoblanadi; dermatoskopik test metrikalari uning o‘rnini bosmaydi.

Mos arxitektura tanla: quality uchun MobileNet/CNN yoki validatsiyalangan o‘lchovlar; segmentatsiya uchun U-Net/U-Net++/DeepLabV3+; classification uchun EfficientNet/ResNet/ConvNeXt/MobileNetV3. Barcha variantlarni birdan implement qilish shart emas; tanlov tezlik, resurs va test natijasi bilan asoslanadi.

Har artifact manifestida kamida quyidagilar bo‘lsin:

```text
modelId, modelVersion, task, artifactSha256, artifactFormat
sourceUrl, codeLicense, weightsLicense, datasetReferences
labelSchemaVersion, labels, supportedInputDomains, intendedUse
inputShape, normalization, preprocessingVersion
segmentationThreshold, abstentionThresholds
calibrationVersion, calibrationStatus, malignantTargetDefinition
evaluationReportId, createdAt, trainingCommit
```

Hash/label/schema/preprocessing mos kelmasa servis fail-closed bo‘lsin. Pickle yoki model weights ishonchsiz manbadan ko‘r-ko‘rona yuklanmasin. Patient suratlari tashqi generativ model yoki uchinchi tomon API’siga yashirin yuborilmasin.

Quality, segmentation, classification va calibration alohida artifact bo‘lsa har birining versiya/hashini `pipelineVersion` bilan bog‘langan bundle manifestga yoz. Response va saqlangan result `pipelineVersion` hamda task bo‘yicha artifact mapping’iga murojaat qilsin; bitta classification hash bilan butun pipeline provenance’ini almashtirma.

### Yetishmayotgan model

Artifact, ruxsat, dataset yoki GPU yetishmasa, shu muammoni aniq hujjatlashtir va qolgan tizimni tugat. Real inference endpoint `MODEL_NOT_READY` yoki `UNSUPPORTED_DOMAIN` qaytarsin. Foydalanuvchiga tahlil hozir bajarilmasligi tushunarli chiqsin.

Bu holatda **AI qabul mezoni bajarilmagan** hisoblanadi. Real surat uchun random/hardcoded class, foiz, malignant probability, maska yoki heatmap chiqarish qat’iyan man etiladi. Test/mock provider production build yoki real user flow’dan yoqilmasin. Lokal demo kerak bo‘lsa faqat alohida synthetic fixture ssenariysi, doimiy “Demo ma’lumoti” belgisi va hech qanday real tashxis da’vosiz bo‘lsin.

### Inference shartnomasi

ML servis faqat ichki autentifikatsiyalangan so‘rovni qabul qilsin. NestJS tasdiqlangan bytes yoki private internal reference uzatsin; foydalanuvchi bergan ixtiyoriy URL’ni ML yuklamasin. Request schema, maksimal bytes, timeout, cancellation va response schema tekshiriladi.

Response kamida quyidagilarni ajratsin:

```text
requestId, analysisId, inputRevision, pipelineVersion, artifactsByTask
modelVersion, artifactSha256
imageResults[]:
  imageId, normalizedImageHash, qualityChecks[], qualityDecision
  inferencePerformed, inferenceStatus, assessmentComplete
  predictions[]?: { classCode, score, scoreType }
  malignantProbability: number | null
  malignantTargetDefinition, calibrationStatus, calibrationVersion
  segmentation: { available, artifactRef, transform, source }
  attribution: { available, artifactRef, targetClass, method, transform }
  uncertaintyReasons[], domainStatus
aggregationMethod, selectedPrimaryImageId
aggregateMalignantProbability: number | null
aggregateCalibrationStatus, aggregationValidationRef, timing
```

Maska yoki heatmap kelmasa `available: false` va reason bo‘lsin. Contractdagi probability/score `0..1` diapazonida, finite va label mapping’ga mos tekshirilsin. Softmax modelda yig‘indi tekshirilsin; multi-label model bo‘lsa bunday shartni majburlama. Noto‘g‘ri response terminal error bo‘lsin, jim default natija emas.

Multi-image aggregation faqat manifestda ko‘rsatilgan usul bilan ishlasin. Validatsiyalangan aggregation yo‘q bo‘lsa, sifat va foydalanuvchi tanlovi asosida oldindan belgilangan primary image’da inference qil va qolganlarini qo‘shimcha kuzatuv sifatida ko‘rsat. Qolgan rasmlar uchun `inferencePerformed: false`, predictions yo‘q va overlay `available: false` bo‘lsin; ulardan risk chiqarma. Score’larni o‘zboshimcha o‘rtachalama. Aggregate probability faqat validatsiyalangan usulda to‘ldiriladi; primary-image rejimida uning o‘rniga aniq primary image probability ishlatiladi. Rasmiy qamrov va qabul mezoniga bu cheklov yozilsin.

## 10. Ishonch, xavf va noaniqlik

`classScore`, `modelConfidence`, `malignantProbability` va `riskLevel`ni bir qiymat sifatida ishlatma. Softmax score klinik diagnozning to‘g‘rilik kafolati emas. Ekranda “Model ishonchi” deb yoz; kalibrlanmagan bo‘lsa shu holatini tushuntir. Statistik asos bo‘lmasa confidence interval to‘qima.

TZdagi prototip risk chegaralari:

| Shart | Daraja | TZdagi tavsiya mazmuni |
|---|---|---|
| p < 0.35 | LOW — Past | Kuzatish va zarur bo‘lsa rejalashtirilgan ko‘rik |
| 0.35 ≤ p < 0.70 | MEDIUM — O‘rta | Yaqin vaqt ichida dermatolog bilan maslahatlashish |
| p ≥ 0.70 | HIGH — Yuqori | Imkon qadar tez dermatolog ko‘rigi |

Bu yerda p — **aniq ta’riflangan malignant target uchun kalibrlangan model chiqishi**. SUSPICIOUS_PIGMENTED score’ini tekshiruvsiz p sifatida ishlatma. Malignancy chiqishi bo‘lmasa `malignantProbability: null` bo‘lsin. Riskni hisoblashga yetarli asos bo‘lmasa `riskLevel: NOT_ASSESSED` bo‘lsin; bu “past” emas.

Risk service quality, model validity, supported domain va simptomlarni tekshiradi. `riskRuleVersion`, `riskReasons`, `symptomFlags`, `recommendationTemplateVersion` natijada saqlanadi. Clinical review’dan o‘tmagan qoidalar prototip sifatida belgilanadi. Qoidalar serverda hisoblanadi; frontend riskni qayta ixtiro qilmaydi.

Tibbiy baho berilmasligi turli holatlarda yuz beradi: `QUALITY_REJECTED` — surat inference’dan oldin sifatsiz deb rad etilgan; `UNSUPPORTED_DOMAIN` — modelga mos kirish turi emas; `UNCERTAIN` — inference bajarilgan, lekin OOD/abstention mezoni, yetarli bo‘lmagan ishonch yoki risk uchun asos yetishmasligi sababli xulosa chiqarilmagan. `FAILED` texnik xatodir. Kerakli model umuman yo‘q bo‘lsa `FAILED/MODEL_NOT_READY`, inference response sxemasi buzilgan bo‘lsa `FAILED/INVALID_MODEL_RESPONSE` ishlat. OOD aniqlashning o‘zi ham xatosiz deb ko‘rsatilmasin. Ushbu holatlar UI va testlarda farqlansin.

Confidence pastligi hech qachon yuqori signalni “past xavf”ga o‘girmasin. Barcha natijalarda cheklov va dermatologga murojaat yo‘riqnomasi holatga mos chiqsin. Chegaralar unit testda 0.3499, 0.35, 0.6999, 0.70 va null/NaN bilan tekshirilsin.

## 11. Segmentatsiya va tushuntiriladigan natija

FR-03 uchun haqiqiy segmentation model maskasi kerak. Qo‘lda chizilgan ROI faqat foydalanuvchi belgilashi sifatida saqlanadi va shunday nomlanadi. Qo‘lda ROI mavjudligi avtomatik segmentatsiya testini yopmaydi.

Result viewer sanitizatsiyalangan asosiy surat, segmentation mask/contour va model e’tibor heatmap qatlamlarini alohida yoqib-o‘chirsin. Opacity slider, zoom/pan, keyboard boshqaruv va mobile ko‘rinish ishlasin. Har overlay aynan shu surat/model/input revisiondan kelganini tekshir.

Grad-CAM faqat haqiqiy model activation/gradientlaridan hisoblanadi. Uning manbasi va target classi ko‘rsatiladi. U chegaraning ground truth’i yoki tashxis isboti sifatida taqdim etilmasin. Model bunga mos bo‘lmasa mavjud haqiqiy maska/kontur FR-07ni qoplashi mumkin, lekin `Grad-CAM mavjud` deb yozma.

Server saqlagan natijalar model yangilanganda o‘z-o‘zidan o‘zgarmasin. Yangi model bilan qayta tahlil yangi yozuv va model versiyasini yaratsin.

## 12. Ma’lumotlar modeli va holatlar

Prisma schema’da kamida quyidagi entity va invariantlarni yarat. Nomi biroz o‘zgarishi mumkin, lekin munosabat va maqsad saqlansin:

| Entity | Zarur mazmun |
|---|---|
| User | UUID, normalized unique email, passwordHash, role, locale, createdAt, deletion holati |
| AuthSession | userId, hashed refresh secret, expiry, rotation/revocation, device metadata minimumi |
| PasswordResetToken | faqat hash, expiry, usedAt; bir martalik |
| ConsentEvent | userId, scope, scopeTarget, analysisId zarur bo‘lsa, granted/revoked, policyVersion, timestamp; o‘zgartirilmas event |
| Case | userId, label, bodyLocation, retentionMode, createdAt, deletion holati |
| Analysis | caseId, ownerId, inputRevision, retentionMode, expiresAt, processingStatus, outcome, questionnaireVersion, consent snapshot/event references, pipeline/model/risk versiyalari, submittedAt/completedAt |
| ImageAsset | analysisId, ownerId, storageKey, kind, MIME, dimensions, byteSize, hash, transform, expiresAt |
| SymptomAnswer | analysisId, questionCode/version, typed answer; schema-valid JSON ham mumkin |
| AnalysisResult | analysisId, predictions, confidence turi, nullable malignantProbability, riskLevel, reasons, uncertainty, provenance |
| ModelVersion | manifest metadata, checksum, capability va evaluation reference |
| Report | analysisId, private storageKey, generatedAt, expiresAt, reportVersion |
| DeletionRequest | userId/scope, state, requestedAt, completedAt, retry info |
| AuditEvent | minimal actor/action/resource/result/time; patient content yoki secret yo‘q |
| OutboxEvent | durable job dispatch, deduplication key, state, retry |

Foreign key, unique constraint, zarur index va migrationlar bo‘lsin. `ownerId`ni clientdan ishonib olma; auth principal’dan hosil qil. Case, Analysis va ImageAsset egalari mosligi biznes qatlamida ham tekshirilsin. Faqat UUID ishlatish authorization o‘rnini bosmaydi.

Retention har Analysis darajasida mustaqil aniqlanadi. Saqlangan Case yangi tahlil uchun rozilikni avtomatik bermaydi. Vaqtinchalik Analysis expiry’si o‘sha Case’dagi avval saqlangan boshqa Analysis’larni o‘chirmasin. Vaqtinchalik, bo‘sh qolgan Case tozalanadi; saqlangan Case timeline’ida vaqtinchalik tahlil ko‘rinmaydi.

Asosiy indekslar: owner+createdAt, case+createdAt, status+updatedAt, expiresAt, outbox state, session expiry. History pagination cheklangan va stabil bo‘lsin. Keraksiz soft-delete nusxalarida tibbiy payload abadiy qolmasin.

Processing status va outcome’ni ajrat:

```text
processingStatus:
  DRAFT → QUEUED → RUNNING → FINISHED
  faol holatlardan → CANCELLED yoki FAILED

outcome (faqat FINISHED holatida):
  COMPLETED | QUALITY_REJECTED | UNCERTAIN | UNSUPPORTED_DOMAIN

failureCode (faqat FAILED holatida):
  MODEL_NOT_READY | ML_TIMEOUT | INVALID_MODEL_RESPONSE | STORAGE_ERROR | INTERNAL_ERROR

riskLevel:
  LOW | MEDIUM | HIGH | NOT_ASSESSED
```

Invalid transition’lar rad etilsin. Queue retry ichki `attempt` bo‘lib yuritilsin; terminal tahlilni qayta yuritish yangi analysis/revision orqali bo‘lsin. Deletion holati har qanday processing statusdan ustun turadi. Parallel submit/cancel/delete, timeout va worker restart uchun atomik guardlar bo‘lsin.

## 13. API shartnomasi

API prefix `/api/v1`. OpenAPI hujjati haqiqiy controller/schema bilan birga yangilansin. Quyidagi yoki ekvivalent endpointlar ishlasin:

| Method va path | Vazifa |
|---|---|
| POST `/auth/register` | Ro‘yxatdan o‘tish |
| POST `/auth/login` | Kirish |
| POST `/auth/refresh` | Sessiya rotatsiyasi |
| POST `/auth/logout` | Joriy sessiyani tugatish |
| POST `/auth/forgot-password` | Recovery, account enumeration’siz |
| POST `/auth/reset-password` | Bir martalik token bilan reset |
| GET `/me` | Profil |
| PATCH `/me` | Ruxsatli profil maydonlari |
| GET `/me/sessions` | Sessiyalar |
| DELETE `/me/sessions/:id` | O‘z sessiyasini bekor qilish |
| GET `/me/consents` | Amaldagi consent holati va policy versiyasi |
| POST `/me/consents` | Rozilik berish yoki qaytarish eventi |
| POST `/cases` | Case yaratish |
| GET `/cases` | O‘z case’lari |
| GET `/cases/:id` | Case/timeline |
| DELETE `/cases/:id` | Case va bog‘liq ma’lumotni o‘chirish so‘rovi |
| POST `/analyses` | Case ichida draft analysis |
| POST `/analyses/:id/images` | Streamed multipart upload |
| DELETE `/analyses/:id/images/:imageId` | Submissiondan oldingi suratni olib tashlash |
| PATCH `/analyses/:id/images/:imageId/roi` | Draftdagi normalized ROI |
| PUT `/analyses/:id/symptoms` | Validatsiyalangan javoblar |
| POST `/analyses/:id/quality-check` | Haqiqiy precheck, consent va model capability bilan |
| POST `/analyses/:id/submit` | Immutable snapshot, idempotent queue, HTTP 202 |
| GET `/analyses` | Tarix va query filterlar |
| GET `/analyses/:id` | Real processing status/natija |
| POST `/analyses/:id/cancel` | Bekor qilish |
| DELETE `/analyses/:id` | Bitta tahlilni o‘chirish |
| GET `/assets/:id/content` | Owner tekshiruvi bilan private image/mask/heatmap stream |
| GET `/cases/:id/compare?left=...&right=...` | Bir owner/case kuzatuvlari |
| POST `/analyses/:id/report` | Idempotent PDF tayyorlash |
| GET `/reports/:id/download` | Private PDF download |
| POST `/me/export` | Foydalanuvchi ma’lumot eksporti |
| DELETE `/me/data` | Profilni saqlab, tahlil/case/suratlar va bog‘liq tibbiy datani o‘chirish |
| DELETE `/me` | Hisob va barcha bog‘liq ma’lumotni o‘chirish |
| GET `/deletions/:id` | O‘z o‘chirish so‘rovining holati |
| GET `/health/live`, `/health/ready` | Process va dependency readiness |
| GET `/capabilities` | Mavjud model vazifalari/domains/offline imkoniyati; secretsiz |
| GET `/admin/system` | Admin uchun minimal servis va queue metadata |
| GET `/admin/models` | Admin uchun model/evaluation metadata |

Hisob o‘chirishga recent re-authentication talab qil. Hisob sessiyasi bekor qilingach deletion status uchun cheklangan, tasodifiy, qisqa muddatli receipt token yoki autentifikatsiyaga bog‘liq bo‘lmagan tasdiq sahifasini xavfsiz loyihala; o‘chirilgan account sessiyasini yashirin faol qoldirma.

Success response documented schema bilan, listlarda `{items, nextCursor}` yoki izchil pagination bilan qaytsin. Error format:

```json
{
  "error": {
    "code": "IMAGE_QUALITY_REJECTED",
    "message": "Surat yetarlicha aniq emas.",
    "details": [{ "field": "image", "reason": "BLUR" }],
    "requestId": "..."
  }
}
```

400/401/403/404/409/413/415/422/429/503 holatlarining ma’nosi izchil bo‘lsin. Boshqa owner resursi uchun mavjudlikni oshkor qilmaydigan 404 ishlatish mumkin. Raw stacktrace, SQL, internal path va secretni clientga yuborma.

Axios’da bir vaqtning o‘zida bir dona refresh ishlasin; parallel 401 requestlar tartibli kutadi, cheksiz refresh loop bo‘lmaydi. Upload/submit/delete avtomatik takrorlanishi duplicate yaratmasin. POST submit uchun `Idempotency-Key` va payload hash tekshirilsin: bir key/bir payload bir natija, bir key/boshqa payload conflict.

React Query polling terminal holatda va unmountda to‘xtasin; backoff, offline/reconnect va AbortSignal ishlasin. Polling medical response’larni service worker cache’iga yozmasin. Logout va account switchda memory query cache ham tozalansin.

## 14. Auth, rozilik va maxfiylik

### Auth

Access tokenni browser memory’da saqla, localStorage’da emas. Refresh token `HttpOnly`, productionda `Secure`, `SameSite` mos cookie’da saqlanadi; server faqat hashni saqlaydi. Rotation/reuse detection, logout/revoke va expiry real ishlasin. Cookie ishlatadigan mutation/refresh oqimlarida CSRF token yoki tekshirilgan Origin/CSRF himoyasi bo‘lsin; CORSning o‘zi yetarli deb hisoblama.

Parolni loglama. Login/reset endpointlarini limitla. Reset token hash va qisqa expiry bilan bir martalik bo‘lsin. Reset email lokal muhitda Mailpit orqali real yetkazilib tekshirilsin, productionda SMTP config kerak. SMTP yo‘q bo‘lsa yuborildi deb yolg‘on aytma. Admin seed faqat development profilida va muhit orqali berilgan parol bilan; productionda default credential bo‘lmasin.

USER o‘z resurslarini boshqaradi. ADMIN texnik holat va anonim agregatlarni ko‘radi. Role tekshiruvi medical image’ga universal kirish bermasin. Patient data uchun har endpoint owner/scope’ni tekshiradi.

### Rozilik

Uchta alohida scope bo‘lsin:

1. `PROCESSING` — hozirgi tahlil uchun vaqtinchalik upload va qayta ishlash; yuborishdan oldin zarur.
2. `HISTORY_STORAGE` — tarix/monitoring uchun saqlash; ixtiyoriy, oldindan belgilanmagan.
3. `RESEARCH_REUSE` — kelajakdagi dataset/treningda foydalanish; ixtiyoriy, default false, asosiy xizmatni ishlatishga shart emas.

PolicyVersion va timestamp bilan grant/revoke yoziladi. PROCESSING grant konkret `analysisId`ga bog‘lanadi va uploaddan oldin tasdiqlanadi; oldingi tahlil granti yangi tahlilni avtomatik ruxsatli qilmaydi. HISTORY_STORAGE har tahlilda aniq tanlanadi va Analysis consent snapshot’iga yoziladi. Har bir revoke’ning scope’i bitta tahlilmi yoki tegishli barcha tahlillarmi UI va API’da ochiq ko‘rsatiladi. Client checkbox’iga ishonib qolma; server amaldagi rozilikni tekshiradi. Processing roziligi qaytarilsa tegishli queued/running ishlar to‘xtatiladi. History roziligi qaytarilishi tegishli saqlangan tahlillarni o‘chirishni boshlashi aniq UI’da tushuntirilsin. Research roziligi qaytarilsa kelajakdagi reuse darhol to‘xtasin. Oldin trained model weights’dan individual contribution avtomatik olib tashlandi degan isbotsiz va’da berma.

Research consent mavjud bo‘lsa ham MVP patient suratlarini avtomatik training datasetga ko‘chirmasin; buning uchun alohida ko‘rib chiqilgan, auditable pipeline zarur. Hozirgi trening ruxsatli alohida dataset bilan ishlasin.

### Saqlash

History roziligi bo‘lmasa `expiresAt = draftCreatedAt + 60 min` natijaga kirishning mantiqiy TTL’i bo‘lsin. Tahlil tugagach foydalanuvchi shu vaqtgacha natijani ko‘rishi va yuklab olishi mumkin; aniq expiry ekranda ko‘rsatiladi. TTL yetganda barcha tegishli medical resurslarga kirish yopiladi, faol job bekor qilinadi va fizik o‘chirish darhol navbatga qo‘yiladi. Aktiv nusxalar §15dagi ko‘pi bilan 24 soatlik muddatda tozalanadi; 60 daqiqa barcha fizik/backup nusxalar allaqachon yo‘qoldi degani emas. Ushbu farq upload roziligida tushunarli yoziladi.

Default: vaqtinchalik object storage bucket’da versioning va backup o‘chiq. Vaqtinchalik medical DB yozuvlari umumiy PostgreSQL WAL/backuplariga tushishi mumkinligi va ularning ko‘pi bilan 30 kunlik alohida retentioni consent/policy’da oshkor qilinadi; bu nusxalar qayta tahlil yoki tadqiqot uchun ishlatilmaydi. Restore’dan oldin expiry/deletion ledger qo‘llanadi. “Umuman saqlanmaydi” deb va’da berma; UI’da “Tarixga saqlanmaydi, vaqtinchalik qayta ishlanadi” deb yoz. Orphan upload va draftlar restartdan keyin ham cleanup qilinadi. Qo‘shimcha monitoring faqat HISTORY_STORAGE roziligi berilgan tahlillarda ishlaydi.

History roziligi bo‘lsa ma’lumot o‘chirilguncha yoki konfiguratsiyadagi maksimal retention muddatigacha saqlanadi; haqiqiy muddat policy UI’da ko‘rsatiladi. Sensitiv assetlar va API response’lar `Cache-Control: no-store` bilan berilsin. Browser object URL’lari revoke qilinsin.

EXIF/GPSni olib tashlash to‘liq anonymization emas. Foydalanuvchi ismi storage key, job name, log va model input fayl nomiga kirmasin. HTTPS tashqi trafik uchun majburiy; managed serverda DB/object storage/backup shifrlanishini sozla yoki aniq infratuzilma talabini yoz. `.env`, dataset, patient upload, raw model output va secrets Git’ga kirmasin.

## 15. O‘chirishni oxirigacha amalga oshirish

Faqat DBda `deletedAt` qo‘yish FR-12ni bajarmaydi. O‘chirish operatsiyasi quyidagilarni qamrasin:

- normalized/original saqlangan suratlar, thumbnails, crop va vaqtinchalik uploadlar;
- segmentatsiya maskalari, konturlar, heatmaplar;
- simptom javoblari, analysis resultlar, comparison artefaktlari, report/export fayllari;
- queued/running joblar, outbox eventlar va Redisdagi tegishli payload/cache;
- tegishli DBdagi tibbiy yozuvlar va frontend memory cache;
- account o‘chirilsa sessiyalar, reset tokenlar va shaxsiy profil.

O‘chirish so‘rovini qabul qilganda kirishni darhol yop. Worker natija yozishdan oldin owner/case/analysis deletion holatini tekshirsin; o‘chirilgan ma’lumotni qayta yaratmasin. Storage va DB uchun idempotent cleanup, retry va status yurit. So‘rovlar oqimidan mustaqil davriy cleanup worker orphan obyektlarni tozalasin. Xato bo‘lsa o‘chirish tugadi deb ko‘rsatma.

Texnik default: faol nusxalar 24 soat ichida, backup nusxalari 30 kungacha lifecycle’da tozalanadi. Lokal testda bu jarayonni tezlashtiriladigan soat/TTL bilan isbotla. Deploymentda boshqa muddat talab qilinsa policy va config birga o‘zgaradi. Backup restore’dan keyin deletion tombstone/ledger qayta qo‘llanib, o‘chirilgan ma’lumotlar qayta ochilmasin. Audit minimal, payloadsiz va cheklangan retention bilan bo‘lsin.

Tashqi yuklab olingan PDF foydalanuvchi qurilmasida qolishi mumkinligini “serverdagi nusxa o‘chirildi” ma’nosidan ajrat. O‘chirish UI’si bitta tahlil, case, barcha medical data va account uchun aniq scope’ni ko‘rsatsin.

## 16. Tarix, monitoring va hisobot

Tarix real bazadan keladi; filter/sort/pagination serverda ishlaydi. Bir case ichida kuzatuvlar vaqt bo‘yicha tartiblanadi. Ikki user yoki ikki boshqa case suratlari taqqoslashga qo‘shilmasin.

Compare sahifasida sana, sifat, anatomik joy, model versiyasi va surat olish sharoiti ko‘rsatiladi. Original rasmlar yonma-yon/slider, mos bo‘lsa maska overlay, foydalanuvchi yozgan simptom o‘zgarishlari ko‘rinadi. Qayd etilmagan ma’lumot “yo‘q” deb ko‘rsatiladi.

Haqiqiy registration/scale yo‘q bo‘lsa suratning kattaroq ko‘rinishidan “kasallik 25% o‘sdi” degan xulosa chiqarmagin. Pixel area o‘zgarishi clinical progression deb talqin qilinmasin. Model versiyasi o‘zgargan bo‘lsa score’lar to‘g‘ridan-to‘g‘ri teng emasligi ko‘rsatiladi. ABCDE E qismi shu kuzatuvlar bilan bog‘lansin.

“Ikkinchi fikr” funksiyasi mos modeldan top ehtimoliy guruhlar va tushuntirishni ko‘rsatsin. Bir modelning top-3 taxminini mustaqil uchta shifokor xulosasi deb taqdim etma. Qo‘llamagan sinflar yoki yetishmagan score’lar to‘ldirilmasin.

PDF hisobot kamida: foydalanuvchi rozilik bilan kiritgan identifikatsiya minimumi, analysis/case raqami, sana, surat va haqiqiy overlay, sifat, simptomlar, ehtimoliy guruhlar, confidence turi, risk/noaniqlik, tavsiya, model/rule versiyasi va yakuniy tashxis emasligi. Texnik muvaffaqiyatsizlik uchun diagnostik natija ko‘rinishidagi report yaratma. PDF va UI ma’lumotlari bir xil immutable snapshotdan olinadi.

PDF’da o‘zbekcha harflar buzilmasin, matn kesilmasin, page break va surat hajmi tekshirilsin. Report private, owner-only va tegishli retentionga ega. Download ishlasin, generatsiya xatosi aniq chiqsin. Email/Telegram/shifokorga tashqi yuborish alohida topshiriqsiz amalga oshirilmasin.

## 17. Kam internet va offline rejim

PWA manifest, ikonka, app shell, offline sahifa va surat olish yo‘riqnomasini yarat. Service worker statik resurslarni cache qiladi. Suratlar, auth response, tarix, medical API response, PDF va tokenlarni avtomatik cache qilma. Default offline rejimda maxfiy suratlarning diskka yozilishi bo‘lmasin; joriy draft faqat memory’da turishi mumkin va sahifa yopilsa yo‘qolishi tushuntirilsin.

Internet qaytsa foydalanuvchi rozilik holatini qayta tekshirib “Yuborish”ni bosadi; yashirin background upload bo‘lmasin. Network error va qayta ulanish ishlasin.

TZdagi **to‘liq offline/edge AI** uchun mos, ruxsatli ONNX/edge model mavjud bo‘lsa web worker ichida ishga tushir, backend modeli bilan preprocessing/output parity, memory va latency’ni tekshir. Model download hajmi, versiyasi, hash va device capability’ni ko‘rsat. Patient bytes qurilmadan chiqmasin.

Mos edge artifact bo‘lmasa app shell tayyorligini offline diagnostika deb ko‘rsatma. `docs/ACCEPTANCE.md`da offline inference’ni aniq BLOCKED deb qoldir; artifact, eksport yoki resurs talabi yozilsin. To‘liq TZ qamrovi haqidagi yakuniy da’vo bu cheklovni yashirmasin.

## 18. Dataset, trening va ML baholash

Dataset manifestida source, collection/version, image label, patient grouping key, lesion key mavjud bo‘lsa, mask reference, domain, ruxsat/litsenziya va attribution saqlansin. Patient identity minimumi ishlatilsin; privacy ma’lumotlari Gitga kirmasin. Dataset/model litsenziyasi tijorat foydalanishga avtomatik ruxsat bermaydi.

70% train / 15% validation / 15% test split bemor darajasida bo‘lsin. Bir bemor yoki duplicate/near-duplicate tasvir turli splitga tushmasin. Patient ID mavjud bo‘lmasa bemor darajasida leakage yo‘q deb da’vo qilma; grouping metodini va qolgan cheklovni yoz.

Teri ranglari, yosh guruhlari, kamera/yorug‘lik va input domain xilma-xilligi dataset metadata doirasida hisobga olinsin. Metadata yo‘q bo‘lsa uydirilmasin. Augmentation faqat train’da; validation/test preprocessing deterministik. Class imbalance yondashuvi va seedlar qayd etilsin. Test set threshold, hyperparameter yoki calibration tanlashga ishlatilmasin.

Trening commandlari, configlar, checkpoint, reproducibility metadata, calibration va export mavjud bo‘lsin. Model artifacti saqlash yo‘li va checksum’i yozilsin. Katta raw dataset yoki weights’ni Git history’ga qo‘shma; download/import skripti ruxsat shartlariga rioya qilsin.

TZning maqsad metrikalari:

| Metrika | Maqsad |
|---|---|
| Accuracy | ≥0.85 |
| Xavfli holatlar sensitivity/recall | ≥0.90 |
| Specificity | ≥0.80 |
| Macro-F1 | ≥0.80 |
| ROC-AUC va PR-AUC | Har biri alohida; TZdagi ≥0.85 maqsadiga nisbatan |
| Segmentation Dice | ≥0.85 |
| Inference latency | ≤3 soniya |

Hisobotda real o‘lchangan qiymat, support, confusion matrix, per-class va aggregate natija, malignant target ta’rifi, calibration ECE/Brier, subgroup kesimlari, abstention coverage va xatolar tahlili bo‘lsin. Faqat ishonchli subsetdagi accuracy’ni umumiy accuracy deb ko‘rsatma. Ishonch intervallarini bemor grouping’ga mos usul bilan hisobla va usulini yoz.

Dice faqat mos ground-truth maskali held-out testda o‘lchanadi. Latency uchun hardware, input shape, batch size, warm/cold, n, p50/p95/max ko‘rsatiladi. Boshlang‘ich performance talqini: belgilangan qurilmada warm single-image inference p95 ≤3s; bu TZdagi noaniq latency mezonining hujjatlashtirilgan defaultidir. Upload/queue/quality/report bilan end-to-end kutish alohida o‘lchanadi. Bir nechta surat 3 soniyada tugaydi deb o‘lchovsiz va’da berma.

Maqsadga erishilmasa real qiymatni yoz va ML gate’ni FAIL/BLOCKED holatida qoldir. Natijalar ustiga TZdagi maqsad sonlarini ko‘chirib “o‘tdi” demagin. Klinik tayyorlik bu metrikalar bilan avtomatik tasdiqlanmaydi.

## 19. Test va sifat talablari

Unit testlarni real biznes xatolarini tutadigan joylarga yoz: risk boundary, input schema, ownership, consent/retention, transition, idempotency va deletion guard. UI implementation’ni satrma-satr takrorlaydigan behuda testlarga vaqt sarflama.

Integratsiya testlar real test PostgreSQL, Redis va object storage bilan ishlasin. Test konfiguratsiyasi production DB/storage’ga ulanolmasin. Tibbiy test rasmlari ruxsatli yoki synthetic bo‘lsin.

Majburiy ssenariylar:

1. Ro‘yxatdan o‘tish → kirish → password reset → logout → revoked refresh token rad etilishi.
2. Processing roziligisiz upload va submit serverda rad etilishi.
3. Yaroqli, buzilgan, MIME spoofing, kattalik/piksel limiti va noto‘g‘ri formatlar.
4. Xira/qorong‘i surat rad etilishi yoki tegishli warning; qo‘llanmagan quality check noto‘g‘ri PASS bo‘lmasligi.
5. ROI va overlay turli orientation/crop/resize holatlarida to‘g‘ri kelishi.
6. To‘liq oqim: consent → upload → symptoms → real job → result → history → same-case compare → PDF → delete.
7. Quality-rejected, uncertain, unsupported domain, model missing va ML timeout uchun farqli, tushunarli UI.
8. Barcha olti guruh uchun haqiqiy model smoke/evaluation coverage; fixture testi klinik/model qamroviga dalil bo‘lmasligi.
9. Boshqa user ID’si orqali case, analysis, image, compare, report, export va deletion statusiga kira olmaslik.
10. Parallel submit bir marta ishlashi, worker restartdan tiklanish, timeout/retry duplicate yaratmasligi.
11. Saqlash roziligisiz tahlil tarixda yo‘qligi; TTL cleanup service restartdan keyin ham ishlashi.
12. Tahlil davomida deletion/consent revoke natijani qayta yaratmasligi; storage va DB tozalanishi.
13. Research consent default false va asosiy xizmat uchun majburiy emasligi.
14. Offline tibbiy data caching yo‘qligi, logoutdan keyin cache tozalanishi, camera permission fallback’i.
15. Multi-image uchun har surat natijasi va qo‘llangan aggregation/primary-image qoidasi ochiq ko‘rinishi.
16. 360px mobile va desktop’da form, modal, table, overlay va PDF ko‘rish/yuklash ishlashi.

Frontend E2E uchun deterministic ML test provider ishlatilishi mumkin, lekin u faqat test build/networkda bo‘lsin va `TEST_ONLY` sifatida aniq ajratilsin. Alohida real artifact bilan live inference smoke va held-out evaluation bo‘lishi shart. Mock bilan o‘tgan E2E haqiqiy model qabulini bajarmaydi.

Browser console xatolari, uzilgan network requestlar, o‘zbekcha matnlar, tab order, keyboard focus va ARIA label’larni tekshir. Upload, natija, compare, privacy va delete ekranlarini screenshot orqali ko‘rib, clipping/overflow’ni tuzat.

## 20. Ishga tushirish va deployment

Toza muhitda README’dagi ko‘rsatmalar bilan takrorlanadigan lokal ishga tushirish bo‘lsin. Docker Compose kamida web/proxy, api, worker, ml, postgres, redis va private object storage xizmatlarini boshqarsin; Mailpit dev profile’da bo‘lsin. GPU va edge qo‘shimcha profillar bo‘lishi mumkin.

Quyidagi root komandalarni haqiqatan implement qil yoki ekvivalentlarini izchil nomla:

```text
pnpm setup:local          env/init/preflight; mavjud envni ustidan yozmaydi
pnpm dev                 lokal development
pnpm build               barcha JS/TS artifactlari
pnpm lint
pnpm typecheck
pnpm test
pnpm test:integration
pnpm test:e2e
pnpm test:smoke
pnpm db:migrate
pnpm db:seed              faqat ruxsatli development data
pnpm models:check         artifact manifest/hash/capability
pnpm verify              software tekshiruvlari
pnpm verify:ml           haqiqiy model/evaluation gate; model yo‘q bo‘lsa nonzero
```

Asosiy boshlash yo‘li: prerequisite tekshirish → `.env.example`dan xavfsiz local env yaratish → `docker compose up --build -d` → migration/init xizmatlari → readiness → smoke. Shu yo‘lni toza local volumes bilan amalda tekshir. Barcha persistent volume’larni o‘chiradigan command avtomatik setupga kirmasin.

`.env.example`da nomlar va izohlar bo‘lsin: `DATABASE_URL`, `REDIS_URL`, `APP_ORIGIN`, auth secretlar, storage endpoint/bucket/credentials, `ML_SERVICE_URL`, ichki servis tokeni, model manifest path, retention/limitlar va SMTP parametrlari. Real secret yozma. Local setup unique secret yaratishi mumkin; productionda development secret/credential bo‘lsa startup rad etilsin. Frontend `VITE_*` env’lariga maxfiy qiymat tushmasin.

Nginx yoki mos proxy SPA fallback, `/api` proxy, body limit, API timeout, HTTPS terminatsiya va security headerlarni boshqarsin. DB/Redis/storage admin/ML portlari internetga ochilmasin. Local host mapping zarur bo‘lsa localhost’ga bind qil. Upload timeout bilan ML job timeoutni aralashtirma.

Health endpointlari secretsiz bo‘lsin. API core readiness va ML capability farqlansin: model yo‘q bo‘lsa auth/history ishlashi mumkin, lekin tahlil unavailable deb chiqadi. `/capabilities` foydalanuvchiga mavjud imkoniyatni to‘g‘ri aytsin. Disk to‘lishi, queue backlog, failed deletion va ML unavailable kuzatiladigan bo‘lsin.

CI pipeline frozen-lockfile install → lint → typecheck → unit/integration → build → browser smoke yo‘lini bajarsin. Real model testlari artifact mavjud bo‘ladigan alohida jobda ishlasin; missing artifactni yashirin pass/skip bilan umumiy AI muvaffaqiyati deb belgilama.

Production uchun deployment runbook: TLS, domain, secret rotation, migration tartibi, DB/storage backup va restore testi, deletion ledger replay, resource limit, restart policy, log rotation, rollback va monitoring. Berilgan server bo‘lsa konfiguratsiyani qo‘llab haqiqiy URL’da smoke test qil. Server/domain/credential berilmasa lokal ishlashni tekshir va serverga deploy bo‘lganini da’vo qilma.

## 21. Bajarish ketma-ketligi

Quyidagi tartib yo‘riqnoma; ishni har banddan keyin to‘xtatma:

1. Manbani o‘qish, muhit audit, talab–test matriksi va taxminlar.
2. Monorepo, dependency pin, Compose, DB schema/migration va OpenAPI contract.
3. Auth, ownership, rozilik, private storage va deletion asoslari.
4. Ant Design theme, sahifalar, auth UI va typed API client.
5. Case, upload, ROI, quality va simptom wizardining ishlaydigan vertikal oqimi.
6. Model/dataset audit, ML service, real model integration yoki training; risk/explainability.
7. Durable queue, processing holatlari, natija ekrani.
8. Tarix, compare, ABCDE, alternativ guruhlar, PDF va data export.
9. Privacy/retention cleanup, offline/edge yo‘li, admin texnik monitoring.
10. Testlar, browser QA, toza setup tekshiruvi, ML evaluation, xatolarni tuzatish.
11. Deployment, hujjatlar, demo ssenariysi, pitch matni va yakuniy dalilli hisobot.

Mumkin joyda ML artifact audit/treningni boshqa implementatsiya bilan parallel olib bor; uni eng oxirida aniqlanadigan noma’lum masala qilib qoldirma.

## 22. Topshiriladigan fayllar

- To‘liq ishlaydigan manba kod, package/lockfilelar, env namuna, Dockerfile va Compose.
- PostgreSQL migrationlar va dev-only seed.
- OpenAPI specification va typed frontend integration.
- Trening/evaluation/export skriptlari, model manifestlar, haqiqiy artifact import yo‘li va litsenziya ma’lumotlari.
- `README.md` — nima ishlaydi, setup, URL/portlar, real komandalar, model holati, troubleshooting.
- `docs/ARCHITECTURE.md` — komponentlar, data flow, xavfsizlik chegaralari.
- `docs/ASSUMPTIONS.md` — TZda yo‘q defaultlar va qarorlar.
- `docs/TRACEABILITY.md` — FR-01–FR-12 va barcha qo‘shimcha talab → UI/API/fayl → test → dalil.
- `docs/ACCEPTANCE.md` — software, ML, offline va clinical readiness’ning alohida PASS/FAIL/BLOCKED holati.
- `docs/PRIVACY_AND_RETENTION.md` — rozilik, storage, deletion, backup, log va offline siyosati.
- `docs/MODEL_CARD.md` — intended use, domains, data/label qamrovi, cheklovlar, calibration va versiyalar.
- `docs/DATASET_CARD.md` — manba, litsenziya, split, leakage, subgroup va cheklovlar.
- `docs/ML_EVALUATION.md` — real metrikalar, hardware, xatolar tahlili va qayta hisoblash.
- `docs/TEST_REPORT.md` — bajarilgan komandalar, natijalar va haqiqiy tekshiruv dalillari.
- `docs/DEPLOYMENT.md` — lokal/server deploy, backup/restore va rollback.
- `docs/DEMO_SCENARIO.md` — tanlov uchun 3–5 daqiqalik ishlaydigan namoyish.
- `docs/PITCH.md` — muammo, yechim, ishlaydigan imkoniyatlar, dalillar, cheklovlar va keyingi bosqich bo‘yicha qisqa matn; uydirma bozor/statistika emas.
- `docs/TECHNICAL_REPORT.md` — TZga mos umumiy texnik hisobot.
- `docs/IMPLEMENTATION_STATUS.md` — tugallanmagan yoki bloklangan ishning aniq joriy holati.

Hujjatlarni keraksiz takror bilan to‘ldirma; tegishli faylga link ber. Texnik dokumentatsiya va yakuniy hisobot o‘zbekcha, kod identifikatorlari inglizcha bo‘lsin. Asosiy UI ham o‘zbekcha.

## 23. Yakuniy qabul mezonlari

Quyidagilarni tekshirmasdan “loyiha to‘liq tayyor” deb yakunlama:

**Software gate:** toza setup; real auth/session; rozilik; file upload/validation; queue; real DB/storage; barcha sahifalar va API; tarix; compare; PDF; privacy/deletion; salbiy holatlar; test/build/typecheck; browser QA; deploy yoki aniq lokal ishga tushirish dalili.

**AI gate:** haqiqiy trained artifactlar; kerakli quality tekshiruvlari; haqiqiy segmentation; barcha olti guruh va abstention qamrovi; tekshirilgan output/calibration/risk; haqiqiy vizual izoh; held-out test metrikalari va latency; xatolar/cheklovlar; litsenziya va dataset provenance.

**Qo‘shimcha TZ gate:** ABCDE, monitoring, alternativ ehtimollar, o‘zbekcha savollar, hisobot, offline/edge imkoniyati, demo/pitch/texnik hisobot. Offline app shell va offline inference holatini alohida ko‘rsat.

**Klinik release gate:** dastur yoki model testi klinik ruxsat o‘rnini bosmaydi. Ekspert tasdig‘i va intended-use validatsiyasi yo‘q bo‘lsa holat “Tadqiqot/skrining prototipi” bo‘lib qoladi. Uni oddiy feature flag yoqish bilan klinik tasdiqlangan deb ko‘rsatma.

FR matriksining mazmuni:

| ID | Qabul talabi |
|---|---|
| FR-01 | Galereya/kamera/multi-image va real upload |
| FR-02 | Format, hajm va texnik sifat nazorati |
| FR-03 | Haqiqiy avtomatik segmentatsiya |
| FR-04 | Belgilangan guruhlar bo‘yicha real classification |
| FR-05 | Halol, izohlangan model ishonchi |
| FR-06 | Asoslangan past/o‘rta/yuqori risk va baholab bo‘lmaslik holati |
| FR-07 | Haqiqiy heatmap, kontur yoki maska bilan izoh |
| FR-08 | Natijaga ulangan simptom savollari |
| FR-09 | Zarur/noaniq/yuqori holatda dermatolog tavsiyasi |
| FR-10 | Owner-only, rozilikka mos real tarix |
| FR-11 | Bir case bo‘yicha vaqtli taqqoslash |
| FR-12 | Shaxsiy va tibbiy ma’lumotni oxirigacha o‘chirish |

Har bir gate uchun dalil yo‘li, test nomi va haqiqiy natija yoz. “Kod yozildi”, “UI bor” yoki “test fixture natija berdi” ML acceptance o‘rnini bosmaydi.

## 24. Yakuniy javob formati

Ish tugaganda o‘zbek tilida qisqa va aniq yoz:

1. Nimalar haqiqatan tayyor va qayerda ishga tushgan — lokal/real URLni farqlab.
2. Ishga tushirish komandasi, kerakli env/model resurslari va asosiy hujjatlarga link.
3. Bajarilgan testlar/build va o‘lchangan ML metrikalari; o‘lchanmaganlarini alohida.
4. Qolgan bloklar bo‘lsa, aynan qaysi talab, nima yetishmayapti, qanday artifact/resurs bilan yopiladi.
5. Software, AI va klinik tayyorlik holati alohida.

Kod fayllarini yaratmasdan uzun kod listing bilan javobni almashtirma. Muhim blokni chiroyli yakuniy matn ichida yashirma. Kerakli resurslar mavjud bo‘lsa ishlaydigan natijagacha davom et.

**Hozir repository va resurslarni tekshirishdan boshla, so‘ng implementatsiyani davom ettir.**
