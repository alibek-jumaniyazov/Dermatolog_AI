# Raqamli Dermatolog texnik topshirig‘i

Teri suratlarini dastlabki tahlil qilish va vaqt davomida kuzatish platformasi

**Hujjat versiyasi:** 2.0  
**Sana:** 23 sentabr 2026  
**Ilovaning joriy versiyasi:** 0.1.0  
**Hujjat auditoriyasi:** buyurtmachi, loyiha rahbari, frontend va backend dasturchilari, AI mutaxassisi, QA va infratuzilma muhandisi.

Ushbu texnik topshiriq Raqamli Dermatolog platformasining maqsadi, funksiyalari, texnologiyalari, ma’lumotlar oqimi, xavfsizligi va qabul mezonlarini belgilaydi. Hujjat amaldagi lokal ilovani rivojlantirish, production muhitiga chiqarish va keyinchalik tekshirilgan dermatologik modelni joriy etish uchun asos bo‘ladi.

**Joriy holat:** foydalanuvchi kabineti, surat yuklash, texnik sifat tekshiruvi, rozilik asosidagi tashqi AI tahlili, tarix, taqqoslash, PDF va ma’lumotlarni o‘chirish oqimlari yaratilgan. Klinik tasdiqlangan model, avtomatik segmentatsiya va production infratuzilmasini qabul qilish alohida bosqich hisoblanadi.

## 1 Loyiha maqsadi

Raqamli Dermatolog foydalanuvchiga teridagi o‘zgarishlarni surat orqali qayd etish, tasvir sifatini tekshirish, ehtimoliy holatlar haqida tushunarli dastlabki izoh olish va kuzatuvlarni bir joyda saqlash imkonini beradi. Mahsulotning asosiy foydasi — teri holatini tartibli kuzatish va dermatolog bilan maslahatlashishga tayyor ma’lumot yaratish.

Platforma suratni, foydalanuvchi belgilagan hududni va tuzilmali simptomlarni birlashtiradi. Natijada ko‘rinadigan belgilar, ehtimoliy izohlar, noaniqliklar va keyingi qadamlar o‘zbek tilida beriladi. Har bir saqlangan kuzatuv oldingi kuzatuv bilan taqqoslanishi va PDF shaklida yuklab olinishi mumkin.

Mahsulot dastlabki skrining va tadqiqot prototipi sifatida ishlaydi. Natija oynasi va PDF’da quyidagi matn ko‘rinishi shart: “Bu natija dastlabki skrining uchun. Yakuniy tashxisni dermatolog qo‘yadi.” Avtomatik dori buyurish, davolash rejimini tasdiqlash yoki suratdan yakuniy tashxis berish ushbu versiya vazifasiga kirmaydi.

### Asosiy natijalar

- Suratni qabul qilishdan natija va hisobot olishgacha bo‘lgan yaxlit foydalanuvchi oqimini ta’minlash.
- Sifatsiz yoki tahlil doirasiga kirmaydigan tasvir sababini tushunarli ko‘rsatish.
- AI javobini dalillar va cheklovlar bilan berish; mavjud bo‘lmagan aniqlik foizini yaratmaslik.
- Bitta teri o‘chog‘ining turli vaqtdagi kuzatuvlarini bog‘lash.
- Foydalanuvchiga roziliklar, saqlash, eksport va o‘chirish ustidan nazorat berish.

## 2 Qamrov va amalga oshirish holati

Talablar uch bosqichda qabul qilinadi. **A bosqich** — amaldagi dasturiy prototip va vizual AI integratsiyasi. **B bosqich** — production muhitida xavfsiz va barqaror ishlash. **C bosqich** — tekshirilgan dermatologik model hamda klinik foydalanish uchun alohida qabul.

| Imkoniyat | Joriy holat | Qabul bosqichi |
|---|---|---|
| Kabinet, surat, simptom, tarix va PDF | Lokal oqimlar yaratilgan va sinov dalillari mavjud | A |
| OpenCV texnik sifat tekshiruvi | Ishlaydi; semantik sifat to‘liq baholanmaydi | A |
| OpenAI orqali vizual taxminlar | Alohida rozilik bilan ishlaydi; klinik validatsiya yo‘q | A |
| PostgreSQL va private lokal storage | Lokal muhitda tekshirilgan | A |
| Docker, Redis, BullMQ va S3 yo‘li | Konfiguratsiya va adapterlar mavjud; runtime sinovi qolgan | B |
| HTTPS domen, backup va yuklama sinovi | Production muhitida bajarilishi kerak | B |
| Olti guruhli lokal klinik klassifikator | Mos o‘qitilgan model va baholash ma’lumotlari yetishmaydi | C |
| Segmentatsiya va haqiqiy heatmap | Trained model va ground truth talab etiladi | C |
| Kalibrlangan malignlik ehtimoli va risk | Klinik qabul mezonlari bajarilmagan | C |
| Offline AI | Joriy PWA faqat statik qobiq va offline yo‘riqnomaga ega | C |

Amaldagi mahsulot responsiv web ilovadir. Native Android yoki iOS ilovasi, shifokor kabineti, telemeditsina suhbati, to‘lov, retsept va tashqi tibbiy tizimlar bilan integratsiya boshlang‘ich qamrovga kiritilmagan. Bunday kengaytmalar alohida talab va qabul mezonlari bilan qo‘shiladi.

## 3 Foydalanuvchilar va ruxsatlar

| Rol | Vazifalar va vakolatlar | Chegara |
|---|---|---|
| Mehmon | Loyiha haqida o‘qish, maxfiylik va cheklovlarni ko‘rish, ro‘yxatdan o‘tish, kirish va parolni tiklash | Tibbiy ma’lumotlarga kira olmaydi |
| USER | O‘z suratlari, kuzatuvlari, tarixlari, hisobotlari, sessiyalari va roziliklarini boshqarish | Boshqa foydalanuvchi resurslariga kirish taqiqlanadi |
| ADMIN | Texnik holat, navbat, o‘chirish jarayoni va xavfsiz model metama’lumotlarini kuzatish | Rol bemor suratlari va natijalarini umumiy ko‘rish huquqini bermaydi |

Har bir API resursida foydalanuvchi egaligi server tomonidan tekshiriladi. Frontenddagi tugma yoki marshrutni yashirish xavfsizlik nazoratining o‘rnini bosmaydi. Shifokorga PDF yuborish joriy versiyada foydalanuvchining o‘zi yuklab olgan fayl orqali bajariladi.

## 4 Texnologiyalar va dasturlash tillari

Asosiy web kod **TypeScript** tilida yozilgan. Frontend **React** bilan, backend **NestJS** bilan qurilgan; backend **Node.js** muhitida ishlaydi. AI va tasvir sifati xizmati **Python** tilida, **FastAPI** asosida yozilgan. Tuzilmali ma’lumotlar **PostgreSQL** bazasida saqlanadi. Node.js bajarilish muhiti, NestJS esa backend framework hisoblanadi.

Quyidagi versiyalar hujjat sanasidagi repository deklaratsiyalaridir. Ular eng yangi versiya yoki kelgusida o‘zgarmas talab sifatida talqin qilinmaydi. O‘rnatish uchun lock fayllar asos bo‘ladi.

### Frontend texnologiyalari

| Texnologiya | Versiya | Vazifasi |
|---|---|---|
| TypeScript | 5.9.3 | TS va TSX kodlari, strict tip tekshiruvi |
| React va React DOM | 19.3.0 | Komponentlar, holat va foydalanuvchi interfeysi |
| Vite | 6.4.3 | Development server va production build |
| Ant Design | 5.29.3 | Forma, modal, jadval, kartalar va navigatsiya |
| Ant Design Icons | 6.3.4 | Interfeys ikonkalari |
| React 19 compatibility patch | 1.0.3 | Ant Design bilan muvofiqlik |
| Axios | 1.20.0 | API so‘rovlari, token refresh va private blob yuklash |
| TanStack React Query | 5.103.2 | Server ma’lumotlari, query keshi va polling |
| React Router DOM | 7.18.4 | Sahifalar va himoyalangan marshrutlar |
| HTML, CSS va JavaScript | Platforma tillari | Semantika, responsiv dizayn va service worker |

### Backend texnologiyalari

| Texnologiya | Versiya | Vazifasi |
|---|---|---|
| Node.js | Lokal runtime 22.18 | Backend va worker jarayonlarini bajarish |
| TypeScript | 5.9.3 | Backend tiplari va biznes qoidalari |
| NestJS | 11.2.5 | Modullar, controller, service va guardlar |
| Express adapter | NestJS 11.2.5 | HTTP va multipart qabul qilish |
| Prisma | 6.19.3 | ORM, schema, migratsiya va tranzaksiyalar |
| PostgreSQL | Lokal 17 | Foydalanuvchi, kuzatuv, job va audit yozuvlari |
| NestJS JWT | 11.0.1 | Access token imzolash va tekshirish |
| Argon2 | 0.45.1 | Parolni Argon2id bilan xeshlash |
| class validator va transformer | 0.14.2 va 0.5.1 | So‘rov DTOlarini tekshirish |
| Zod | 3.25.76 | ML javobining runtime sxemasini tekshirish |
| Sharp | 0.34.4 | Tasvir validatsiyasi, orientatsiya va JPEG qayta kodlash |
| PDFKit | 0.17.2 | Serverda PDF hisobot yaratish |
| Nodemailer | 7.0.10 | Parolni tiklash xatini yuborish |
| Helmet | 8.1.0 | HTTP xavfsizlik sarlavhalari |
| BullMQ | 5.58.5 | Redis mavjud muhitda navbat transporti |
| AWS SDK S3 client | 3.1138.0 | Private S3 storage adapteri |

Backend paketi Node.js uchun `>=22.18 <23 || >=24` diapazonini belgilaydi. Production uchun qo‘llab-quvvatlanadigan aniq runtime versiyasi image ichida mahkamlanadi va yangilashdan oldin tekshiriladi.

### AI xizmati va yordamchi vositalar

| Texnologiya | Versiya yoki holat | Vazifasi |
|---|---|---|
| Python | 3.12 yoki mos yangi muhit | AI servis tili |
| FastAPI va Uvicorn | 0.141.1 va 0.53.0 | Ichki HTTP API va server |
| OpenCV headless | 5.0.0.93 | Tasvirning texnik sifatini o‘lchash |
| NumPy va Pillow | 2.5.3 va 12.3.0 | Piksel hisoblari va tasvirni tayyorlash |
| Pydantic va HTTPX | 2.13.5 va 0.28.1 | Sxemalar va tashqi HTTP chaqiruvi |
| OpenAI Responses API | Amaldagi tashqi provayder | Tuzilmali vizual differensial izoh |
| TorchScript va ONNX yo‘llari | Ixtiyoriy lokal adapterlar | Tekshirilgan model artefaktini ulash; tayyor model mavjud emas |
| pnpm | 11.19.0 | Monorepo paketlarini boshqarish |
| Vitest va Playwright | 3.2.7 va 1.55.1 | Unit, komponent va brauzer sinovlari |
| Pytest | ML sinov muhiti | Python servisini tekshirish |
| ESLint | Web uchun 9.39.5 | Frontend kod qoidalari |
| Docker Compose va GitHub Actions | Konfiguratsiya mavjud | Muhitni yig‘ish va CI tekshiruvlari |

Frontendda Ant Design Form va React holat mexanizmlari ishlatiladi. Redux, Zustand, React Hook Form, Next.js va i18next joriy stack tarkibiga kirmaydi. API paketidagi `lint` buyrug‘i hozir TypeScript statik tekshiruvini bajaradi; uni alohida backend ESLint auditi deb hisoblash mumkin emas.

## 5 Tizim arxitekturasi

Platforma uch asosiy qatlamdan iborat: brauzerdagi React interfeysi, biznes qoidalarini bajaruvchi NestJS API va ichki Python AI servisi. PostgreSQL tizim holatini saqlaydi; surat va hisobotlar esa private storage orqali boshqariladi.

**Asosiy oqim:** brauzer → NestJS API → PostgreSQL va private storage → navbatdagi worker → FastAPI → tanlangan AI provayder → tekshirilgan natija → brauzer va PDF.

Frontend `/api/v1` manzili orqali ishlaydi. Development Vite proksisi so‘rovlarni lokal APIga uzatadi. AI kaliti brauzerga berilmaydi. API autentifikatsiya, egalik, rozilik, fayl chegaralari va tahlil holatini tekshirgandan keyin ichki servisga murojaat qiladi.

Navbatdagi topshiriq PostgreSQL tranzaksiyasida tahlil bilan bog‘lanadi. Lokal runner bazadan vaqtinchalik lease bilan ish oladi; Redis va BullMQ yo‘li alohida infratuzilma rejimi uchun mavjud. Worker qayta ishga tushganda tugamagan ishlarni aniqlashi, eskirgan kirish reviziyasi natijasini yozmasligi va o‘chirilgan kuzatuvni qayta tiklamasligi shart.

| Katalog | Mas’uliyat |
|---|---|
| `apps/web` | React interfeysi, routing, API klient, PWA va komponent testlari |
| `apps/api` | NestJS, Prisma, autentifikatsiya, kuzatuvlar, storage, job va PDF |
| `services/ml` | FastAPI, OpenCV, provider adapterlari va servis testlari |
| `ml` | Model artefaktlari uchun tuzilma, training va evaluation yordamchilari |
| `scripts` | Lokal ishga tushirish, seed, migratsiya va integratsiya tekshiruvlari |
| `tests/e2e` | Desktop va mobil brauzer ssenariylari |
| `docs` | API shartnomasi, model, xavfsizlik, test va deployment hujjatlari |

## 6 Asosiy foydalanuvchi ssenariysi

1. Foydalanuvchi ro‘yxatdan o‘tadi yoki tizimga kiradi.
2. Yangi teri holatini yaratadi yoki avvalgi holatni tanlaydi. Bitta holat bitta kuzatilayotgan o‘choqni ifodalaydi.
3. Suratni qayta ishlash, tarixda saqlash, tadqiqot va tashqi AI uchun alohida roziliklarni boshqaradi.
4. Bir yoki bir nechta surat yuklaydi, asosiy suratni tanlaydi va zarur bo‘lsa qiziqish hududini qo‘lda belgilaydi.
5. Tizim texnik sifatni tekshiradi. Rad etilgan surat almashtiriladi yoki olib tashlanadi; ogohlantirish bo‘lsa foydalanuvchi uni tasdiqlaydi.
6. Foydalanuvchi davomiylik va simptomlar savollariga javob beradi, yuborishdan oldin kiritilgan ma’lumotni ko‘radi.
7. So‘rov navbatga qabul qilinadi. Interfeys qayta sahifa ochilganda ham tahlil holatini serverdan tiklaydi.
8. Natija tayyor bo‘lganda foydalanuvchi dalillar, muqobil taxminlar, noaniqliklar va keyingi qadamlarni ko‘radi.
9. Rozilik bo‘lsa kuzatuv tarixda qoladi; foydalanuvchi PDF oladi, eski kuzatuv bilan taqqoslaydi yoki ma’lumotni o‘chiradi.

Tashqi AIga rozilik bermagan foydalanuvchi surat sifatini tekshirishi va qoralama bilan ishlashi mumkin. Shu provayder faol bo‘lganida tashqi AI tahlili uchun alohida rozilik talab qilinadi.

## 7 Funksional talablar

### Asl topshiriq talablarining izchilligi

FR identifikatorlari dastlabki topshiriq bilan bog‘lanishni saqlaydi. “Talab” deb belgilangan band mavjud imkoniyat deb qabul qilinmaydi.

| ID | Talab | Joriy qamrov va yakuniy qabul |
|---|---|---|
| FR 01 | Surat yuklash | Galereya, fayl tanlash va kamera; 1–5 surat; asosiy surat tanlanadi |
| FR 02 | Format va sifat nazorati | Texnik tekshiruv mavjud; teri, masofa va to‘silish bo‘yicha to‘liq model C bosqichda |
| FR 03 | Zararlangan hudud segmentatsiyasi | Qo‘lda ROI mavjud; avtomatik maska C bosqich talabi |
| FR 04 | Boshlang‘ich guruhlar bo‘yicha tahlil | Hozir vizual taxmin; olti guruhli tekshirilgan classifier C bosqich talabi |
| FR 05 | Ishonchni ifodalash | Kalibrlangan ehtimol bo‘lmasa foiz chiqarilmaydi; `NOT_CALIBRATED` saqlanadi |
| FR 06 | Xavf darajasi | Hozir `NOT_ASSESSED`; LOW, MEDIUM va HIGH faqat tekshirilgan risk modelida |
| FR 07 | Vizual tushuntirish | Surat va ROI mavjud; haqiqiy maska va heatmap C bosqich talabi |
| FR 08 | Simptomlar savolnomasi | Davomiylik, simptomlar va ABCDE savollari, noma’lum javob varianti |
| FR 09 | Tushunarli keyingi qadamlar | O‘zbekcha izoh, cheklovlar va mutaxassisga murojaat yo‘nalishi |
| FR 10 | Kuzatuvlar tarixi | Faqat tarix roziligi bor kuzatuvlar; filtr va paginatsiya |
| FR 11 | Vaqt bo‘yicha taqqoslash | Bir foydalanuvchining ayni holatga tegishli ikki kuzatuvi |
| FR 12 | Ma’lumotlarni o‘chirish | Darhol kirishni yopish, keyin nazorat qilinadigan fizik tozalash |

### Hisob va sessiya boshqaruvi

ACC 01: foydalanuvchi ism, email va kamida 10 belgili parol bilan ro‘yxatdan o‘tadi. Email yagona bo‘ladi; parol ochiq shaklda saqlanmaydi. Kirishdagi xato email mavjudligini oshkor qilmasligi kerak.

ACC 02: access token qisqa muddatli bo‘ladi va frontend xotirasida saqlanadi. Refresh token HttpOnly cookie orqali yuradi; bazada uning xeshi saqlanadi. Sessiya yangilanganda token almashtiriladi. Chiqish va sessiyani bekor qilishdan keyin server eski sessiyaga kirishni bermaydi.

ACC 03: parolni tiklash uchun bir marta ishlatiladigan, muddati 30 daqiqalik havola yuboriladi. Parol o‘zgarganda avvalgi sessiyalar bekor qilinadi. Productionda haqiqiy SMTP xizmati talab qilinadi.

### Surat va kuzatuv boshqaruvi

IMG 01: JPEG, PNG va WebP qabul qilinadi. Har fayl 10 MiB, bir tahlildagi jami fayllar 30 MiB, tasvir 25 megapikseldan oshmasligi kerak. Eng qisqa tomon kamida 256 piksel bo‘ladi. Animatsiya, buzilgan fayl va aniqlangan format bilan MIME mos kelmasligi rad etiladi.

IMG 02: server tasvir orientatsiyasini to‘g‘rilaydi va JPEG sifat 92 bilan qayta kodlaydi. EXIF va GPS metama’lumotlari olib tashlanadi. Original fayl nomi saqlash manzili sifatida ishlatilmaydi.

IMG 03: foydalanuvchi suratni 90 darajaga aylantirishi, olib tashlashi, asosiy suratni almashtirishi va normallashtirilgan koordinatalarda ROI belgilashi mumkin. Qo‘lda chizilgan ROI AI segmentatsiyasi sifatida ko‘rsatilmaydi.

IMG 04: joriy inference faqat asosiy surat asosida bajariladi. Qolgan suratlar kuzatuv materialidir. Interfeys va hisobot barcha suratlar birgalikda AI tomonidan baholangani haqida da’vo qilmasligi kerak.

OBS 01: tahlil qoralamasi URL orqali tiklanadi; hali serverga yuklanmagan fayllar faqat brauzer xotirasida qoladi. Yuborishda yagona `Idempotency-Key` beriladi; ayni kalit bilan takroriy so‘rov yangi pullik ish yaratmasligi kerak.

OBS 02: DRAFT kirishlari tahrirlanadi; yuborilgan tahlil kirishlari o‘zgarmaydi. FAILED tahlil qayta yuborilganda reviziya oshadi. Worker faqat ayni reviziya uchun yaroqli natijani saqlaydi. Cancel yoki delete qilingan tahlil keyinchalik kelgan provider javobi bilan qayta faollashtirilmaydi.

### Savolnoma va natija

SYM 01: savolnoma davomiylik, qichishish, og‘riq, qonash, o‘zgarish, assimetriya, chegara, rang va ixtiyoriy diametrni oladi. Javoblar YES, NO yoki UNKNOWN kabi nazorat qilinadigan qiymatlardir. Savolnoma versiyasi saqlanadi; erkin izoh alohida maydondir.

RES 01: natija asosiy ehtimoliy holat, ko‘rinadigan dalillar, muqobil izohlar, noaniqliklar, savollar va keyingi qadamlarni ko‘rsatadi. Tizim texnik xatoni tibbiy natija sifatida bermaydi. Bo‘sh ehtimol `0%` ko‘rinishiga aylantirilmaydi.

RES 02: bir holat ichidagi ikki saqlangan kuzatuv vaqt tartibida taqqoslanadi. Bir xil fizik masshtab va tekshirilgan o‘lchov bo‘lmasa o‘sish foizi yoki millimetrdagi avtomatik o‘zgarish hisoblanmaydi.

RES 03: PDF faqat serverdagi tegishli yakunlangan natijadan yaratiladi. Unda kuzatuv sanasi, tanlangan surat, simptomlar, tahlil, cheklovlar va mavjud model yoki pipeline ma’lumoti bo‘ladi. PDF private endpoint orqali egasiga beriladi. DEMO natija hisobotda ham aniq belgilanadi.

## 8 Frontend talablari

Frontend React SPA bo‘lib, asosiy foydalanuvchi tili o‘zbek lotin yozuvidir. Dizayn Ant Design komponentlari va loyihaning umumiy CSS uslublariga asoslanadi. Desktopda sidebar, kichik ekranlarda Drawer navigatsiyasi qo‘llanadi. Holatlar rang bilan birga matn orqali tushuntiriladi.

| Sahifa guruhi | Tarkib |
|---|---|
| Ochiq sahifalar | Bosh sahifa, kirish, ro‘yxatdan o‘tish, parol tiklash, maxfiylik, rozilik va cheklovlar |
| Shaxsiy kabinet | Dashboard, yangi kuzatuv, tahlil jarayoni va natija |
| Kuzatuvlar | Tarix, alohida holat, ikki kuzatuvni taqqoslash |
| Boshqaruv | Profil, sessiyalar, roziliklar, eksport va o‘chirish |
| Texnik administrator | Tizim holati va model imkoniyatlari |
| Yordamchi holatlar | 404, xato, bo‘sh ro‘yxat, loading va offline yo‘riqnoma |

React Router marshrutlarni, `React.lazy` va `Suspense` sahifalarni yuklashni boshqaradi. Axios yagona API klientidir. Bir vaqtning o‘zida faqat bitta refresh bajariladi; sessiya tugasa token va query keshi tozalanadi. React Query server holatini boshqaradi; joriy `staleTime` 20 soniya. QUEUED va RUNNING holatlarida natija har 2 soniyada so‘raladi, terminal holatda polling to‘xtaydi.

Private tasvirlar autentifikatsiyalangan blob orqali olinadi. Vaqtinchalik object URL foydalanish tugaganda bekor qilinadi. Tibbiy natijalar, suratlar va tokenlar localStorage yoki service worker keshida saqlanmasligi kerak.

PWA manifest va production service worker mavjud. Offline holatda ilova yo‘riqnoma ko‘rsatadi; server tahlili va to‘liq kabinet internetsiz ishlamaydi. Hozir tashqi Google Fonts ishlatiladi; productionda fontlarni lokal joylashtirish va tashqi tarmoq bog‘liqligini kamaytirish ko‘zda tutiladi.

B bosqich qabulida 360, 768, 1024 va 1440 piksel kengliklarda asosiy oqimlar tekshiriladi. Klaviatura bilan boshqarish, fokus tartibi, formadagi xatolar, screen reader nomlari va kontrast audit qilinadi. ROI uchun klaviatura muqobili talab etiladi. Joriy kod to‘liq accessibility muvofiqligi tasdig‘i hisoblanmaydi.

## 9 Backend va API talablari

NestJS backend autentifikatsiya, foydalanuvchi profili, holatlar, tahlillar, roziliklar, storage, hisobot, navbat, deletion va texnik admin modullarini boshqaradi. Biznes qoidalari service qatlamida, kirish tekshiruvi DTO va guardlarda bajariladi.

API prefiksi `/api/v1`. JSON javoblari bevosita obyekt bo‘ladi. Ro‘yxat shakli `{items, nextCursor}`; sanalar ISO 8601 UTC formatida uzatiladi. Frontend foydalanuvchiga sana va vaqtni tushunarli mahalliy ko‘rinishda beradi.

Xato shakli `{error: {code, message, details?, requestId?}}`. `message` foydalanuvchiga tushunarli, `code` esa dasturiy ishlov berish uchun barqaror bo‘ladi. So‘rov identifikatori diagnostika uchun uzatiladi; maxfiy ma’lumot xato matniga kiritilmaydi.

| Yo‘nalish | Asosiy endpointlar | Vazifa |
|---|---|---|
| Auth | `POST /auth/register`, `/auth/login`, `/auth/refresh`, `/auth/logout` | Kirish va sessiya |
| Recovery | `POST /auth/forgot-password`, `/auth/reset-password` | Parolni tiklash |
| Profil | `GET/PATCH /me`, `GET /me/sessions` | Profil va sessiyalar |
| Holat | `POST/GET /cases`, `GET/DELETE /cases/:id` | Bitta teri o‘chog‘i kuzatuvlari |
| Tahlil | `POST/GET /analyses`, `GET/DELETE /analyses/:id` | Qoralama, tarix va natija |
| Surat | `POST /analyses/:id/images`, `PATCH .../images/:imageId/roi` | Yuklash va ROI |
| Tayyorlash | `POST .../quality-check`, `PUT .../symptoms` | Sifat va simptomlar |
| Ishga tushirish | `POST .../submit`, `POST .../cancel` | Navbat va bekor qilish |
| Rozilik | `POST/GET /me/consents` | Versiyalangan roziliklar |
| Taqqoslash | `GET /cases/:id/compare` | Bir holatning ikki kuzatuvi |
| Fayllar | `GET /assets/:id/content`, `GET /reports/:id/download` | Private surat va PDF |
| Hisobot | `POST /analyses/:id/report` | PDF yaratish |
| Ma’lumot nazorati | `POST /me/export`, `DELETE /me/data`, `DELETE /me` | JSON eksport va o‘chirish |
| Deletion | `GET /deletions/:id` | Tozalash so‘rovi holati |
| Texnik holat | `GET /health/live`, `/health/ready`, `/capabilities` | Mavjudlik va imkoniyatlar |
| Administrator | `GET /admin/system`, `/admin/models` | Cheklangan operatsion ma’lumot |

Jadvalda `...` tahlil endpointlari uchun `/analyses/:id` prefiksini bildiradi. To‘liq wire format va maydonlar `docs/API_CONTRACT.md`da yuritiladi. Eksport joriy versiyada profil, holatlar, history rozilikli tahlillar va mavjud tahlillarning oxirgi 100 rozilik hodisasini oladigan JSON faylidir. Vaqtinchalik tahlillar va fayl baytlari kirmaydi. To‘liq rozilik tarixi va suratlarni o‘z ichiga olgan eksport keyingi talab sifatida belgilanadi.

Submit muvaffaqiyatli qabul qilinsa HTTP 202 qaytariladi. 400 validatsiya, 401 autentifikatsiya, 403 ruxsat, 404 topilmagan resurs, 409 holat yoki idempotency ziddiyati, 413 hajm, 429 rate limit va 503 xizmat tayyor emasligini bildiradi. Aniq kod har bir endpoint kontrakti va xato holati bilan tekshiriladi.

## 10 Ma’lumotlar modeli

PostgreSQL asosiy holat manbai hisoblanadi. Prisma sxemasi va versiyalangan migratsiyalar ma’lumotlar tuzilishini boshqaradi. Binary suratlar bazaga yozilmaydi; private storage kaliti va metama’lumotlari saqlanadi. Storage ichki yo‘li frontend javobida oshkor qilinmaydi.

| Entity | Asosiy ma’lumot va bog‘lanish |
|---|---|
| User | Email, ism, parol xeshi, rol, demo belgisi va o‘chirish holati |
| Session | User, refresh token xeshi, muddat va bekor qilish vaqti |
| ResetToken | User, bir martalik token xeshi, muddat va ishlatilish vaqti |
| Case | User, sarlavha, tana sohasi va shu holat tahlillari |
| Analysis | User, Case, status, input revision, roziliklar, simptom va natija JSON |
| Image | Analysis, storage key, MIME, o‘lcham, SHA256, transform, ROI va sifat |
| ConsentEvent | Analysis, rozilik turlari, siyosat versiyasi va vaqt |
| Artifact | Analysis, hisobot yoki boshqa artefakt turi, private storage key |
| SubmissionRequest | User, idempotency key, body hash va Analysis |
| AnalysisJob | Analysis, reviziya, status, urinishlar va lease muddati |
| DeletionRequest | User, scope, target, storage ro‘yxati, status va retry ma’lumoti |
| AuditEvent | Amal turi, bajaruvchi identifikatori, nishon va vaqt |

User bir nechta Case va Analysisga, Case esa bir nechta Analysisga ega. Analysis bir nechta Image, ConsentEvent va Artifact bilan bog‘lanadi. `(analysisId, revision)` job uchun, `(userId, key)` esa submission uchun yagona bo‘ladi. Email va storage kalitlari ham yagona qiymat sifatida nazorat qilinadi.

User tarixi, saqlash muddati va job lease bo‘yicha indekslar tezkor qidiruvga xizmat qiladi. Schema o‘zgarishi migratsiya, eski natijalar bilan muvofiqlik va rollback yoki forward fix rejasi bilan birga topshiriladi.

## 11 AI tahlili va surat sifati

### Amaldagi vizual tahlil

Joriy sozlamada OpenAI Responses API ishlatiladi. Standart model `gpt-5.6-luna`, reasoning `low`, maksimal chiqish hajmi 6000 token. Prompt versiyasi `skin-differential-v2`, pipeline versiyasi `openai-visual-review-v2`. Ushbu model tashqi umumiy vizual model bo‘lib, open-source dermatologik model deb taqdim etilmaydi.

Providerga metama’lumotlari olib tashlangan, uzun tomoni 2048 pikseldan oshmaydigan JPEG sifat 90 va yuqori tasvir tafsiloti bilan yuboriladi. Qo‘lda belgilangan ROI kamida 64 × 64 piksel bo‘lsa, butun surat bilan birga shu hududning kesmasi ham yuboriladi. Suratning qolgan qismi klinik kontekst uchun saqlanadi.

Providerga faqat tayyorlangan surat va ruxsat etilgan simptom qiymatlari beriladi. Ism, email, ichki ID, original fayl nomi, erkin izoh va foydalanuvchi yozgan tashxis providerga uzatilmaydi. Natija ko‘pi bilan uchta vizual taxminni ularning ko‘rinadigan dalillari va noaniqliklari bilan qaytaradi.

Tashqi AI roziligi API, worker va ML qatlamlarida tekshiriladi. Provayderlar orasida yashirin fallback va avtomatik pullik qayta urinish bo‘lmaydi. Model nomi yoki prompt o‘zgarganda eski natija qayta yozilmaydi; yangi tahlil alohida ishga tushiriladi.

### Texnik sifat nazorati

`opencv-quality-v2` fokus tafsiloti, yorug‘lik va tasvir mazmunining texnik mavjudligini o‘lchaydi. Global Laplacian dispersiyasi 60 dan past bo‘lishi yolg‘iz o‘zi rad etishga sabab emas: bunday tasvir WARN oladi. Deyarli bir xil rangli tasvir yoki piksellarning 85 foizidan ko‘pi haddan tashqari qorong‘i yoki yorug‘ bo‘lsa REJECT beriladi. Bu chegaralar klinik aniqlik ko‘rsatkichlari emas.

| Qaror | Foydalanuvchi oqimi |
|---|---|
| PASS | Bajarilgan texnik tekshiruvlar bo‘yicha davom etish mumkin |
| WARN | Kamchilik tushuntiriladi; davom etish uchun aniq tasdiq olinadi |
| REJECT | Tahlil yuborilmaydi; surat almashtiriladi yoki olib tashlanadi |
| NOT_ASSESSED | Alohida tekshiruv bajarilmagan; bu PASS bilan teng emas |

Teri ko‘rinishi, o‘choqning to‘silishi va masofa bo‘yicha to‘liq sifat modeli mavjud emas. Shuning uchun `assessmentComplete:false` qaytishi mumkin. Joriy texnik PASS to‘liq dermatologik yaroqlilikni anglatmaydi.

**Keyingi qabul talabi:** baholash to‘liq bo‘lmasa umumiy holat kamida WARN bo‘lishi; sifat algoritmi versiyasi va klinik tekshiruv holati API orqali saqlanishi kerak. Bu ikki band joriy implementatsiyada hali to‘liq yopilmagan.

### Natija tuzilmasi

Natijada `imageAssessment`, tartiblangan `differential`, `observations`, `summary`, `limitations`, `nextSteps` va `followUpQuestions` maydonlari mavjud bo‘lishi mumkin. Har bir taxmin guruh kodi, holat nomi, dalillar va noaniqliklardan iborat bo‘ladi. Tartib vizual moslikni bildiradi; kalibrlangan ehtimolni bildirmaydi.

| Outcome | Ma’nosi |
|---|---|
| OBSERVATIONS_READY | Mos tasvirda asoslangan vizual taxminlar mavjud |
| UNCERTAIN | Mos tasvir mavjud, ammo xulosa uchun asos yetarli emas |
| IMAGE_UNSUITABLE | Teri ko‘rinadi, lekin kerakli tafsilot yetarli emas |
| UNSUPPORTED_DOMAIN | Tasvir teri tahlili doirasiga kirmaydi |

Texnik jarayon statuslari: DRAFT, QUEUED, RUNNING, FINISHED, FAILED va CANCELLED. FINISHED ish bajarilganini bildiradi, tashxis tasdiqlanganini bildirmaydi. Tarmoq uzilishi yoki model mavjud emasligi FAILED bo‘ladi va yuqoridagi mazmuniy outcome bilan almashtirilmaydi.

Tashqi vizual tahlilda `score:null`, `scoreType:NOT_CALIBRATED`, `malignantProbability:null`, `riskLevel:NOT_ASSESSED` saqlanadi. Sun’iy foiz, tasodifiy xavf darajasi, soxta maska yoki heatmap yaratilmaydi.

## 12 Lokal model va klinik qabul talablari

Loyihaning ochiq modeldan foydalanish yo‘nalishi keyingi AI bosqichidir. Lokal loader va yordamchi skriptlarning mavjudligi tayyor yoki validatsiyadan o‘tgan model borligini anglatmaydi. Model yo‘q yoki yaroqsiz bo‘lsa xizmat `MODEL_NOT_READY` qaytaradi.

| Kod | Maqsadli guruh |
|---|---|
| SUSPICIOUS_PIGMENTED | Shubhali pigmentli o‘zgarish |
| NEVUS | Nevus yoki xol |
| ECZEMA_DERMATITIS | Ekzema yoki dermatit |
| PSORIASIS | Psoriaz |
| ACNE | Akne |
| FUNGAL_INFECTION | Zamburug‘li infeksiya |

Noaniqlik va tahlil doirasidan tashqaridagi tasvir alohida boshqariladi. Vizual differensialdagi `OTHER` qiymati legacy olti sinfli prediction ro‘yxatiga qo‘shilmaydi. “Shubhali pigmentli o‘zgarish” sinfi malignlik tashxisiga avtomatik tenglashtirilmaydi.

Model artefakti manbasi, litsenziyasi, SHA256 xeshi, operator allowlisti, label mapping, preprocessing va output sxemasi bilan topshiriladi. TorchScript yoki ONNX uchun mos runtime alohida o‘rnatiladi. Model fayllari o‘qish rejimida ulanadi; yaroqsiz artefakt ishga tushirilmaydi.

Datasetda tasvir kelib chiqishi, foydalanish huquqi, yorliq sifati, takrorlarni aniqlash va bemor identifikatori asosida ajratish hujjatlashtiriladi. Reja: training 70%, validation 15%, test 15%. Bir bemorning tasvirlari turli qismlarga tushmasligi kerak. Threshold va kalibrlash test to‘plamiga qarab tanlanmaydi.

Baholash maqsadli foydalanish sharoiti, turli teri ranglari, yosh guruhlari, qurilmalar va tasvir sharoitlarini qamrab oladi. Sinf kesimidagi natijalar, xato tahlili, noaniqlik va imkon qadar ishonch intervallari beriladi. Segmentatsiya uchun ekspert tekshirgan ground truth maskalar kerak.

| Metrika | Qabul maqsadi | O‘lchash talabi |
|---|---|---|
| Accuracy | Kamida 0.85 | Belgilangan olti guruh uchun mustaqil test |
| Malignlik sensitivity | Kamida 0.90 | Oldindan belgilangan malign target va threshold |
| Specificity | Kamida 0.80 | Xuddi shu binary target va threshold |
| Macro F1 | Kamida 0.80 | Har bir sinf natijasi bilan birga |
| ROC AUC va PR AUC | Har biri kamida 0.85 | Target va averaging usuli aniq ko‘rsatiladi |
| Dice | Kamida 0.85 | Haqiqiy maska va ground truth taqqoslanadi |
| Inference p95 | Ko‘pi bilan 3 soniya | Kelishilgan qurilmada warm single image benchmark |

Ushbu raqamlar **maqsadli talablar**, erishilgan natijalar emas. Uch soniyalik inference chegarasiga upload, navbat, tashqi tarmoq va PDF yaratish kirmaydi. Hozirgi tashqi AI javob vaqtini shu klinik model benchmarki o‘rnida ko‘rsatish mumkin emas.

LOW, MEDIUM va HIGH chegaralari validatsiya va mutaxassis qarori bilan belgilanadi. Dastlabki hujjatdagi 0.35 va 0.70 prototip thresholdlari klinik tasdiqsiz ishga tushirilmaydi. To‘liq klinik release uchun model mezonlaridan tashqari intended use bo‘yicha mutaxassis tekshiruvi va hujjatlashtirilgan qabul qarori kerak.

## 13 Maxfiylik va xavfsizlik

Har tahlilga suratni qayta ishlash, tarixda saqlash, tadqiqot va tashqi AI uchun alohida roziliklar yoziladi. Qo‘shimcha roziliklar processing roziligini, research esa history roziligini ham talab qiladi. Rozilik versiyasi va vaqti saqlanadi. Tadqiqot va tashqi AI roziligi sukut bo‘yicha o‘chiq bo‘ladi. Foydalanuvchi suratlari avtomatik ravishda training to‘plamiga qo‘shilmaydi.

Production trafik HTTPS orqali yurishi kerak. Refresh cookie HttpOnly, SameSite Strict va productionda Secure bo‘ladi. O‘zgartiruvchi brauzer so‘rovlarida Origin tekshiriladi; CORS ruxsat etilgan originlar bilan cheklanadi. Access token frontend xotirasida, refresh token xeshi bazada saqlanadi.

ML servisi private tarmoqda va service token bilan ishlaydi. PostgreSQL, Redis, S3 boshqaruv paneli va ML portlari internetga ochilmaydi. Surat, natija va hisobot endpointlari `no-store` siyosatida ishlaydi. Loglarda surat mazmuni, parol, token, API kaliti va simptomlarning to‘liq matni bo‘lmasligi kerak.

EXIF tozalash suratning o‘zidagi yuz yoki boshqa identifikatsiya belgilarini anonimlashtirmaydi. Provider so‘rovida `store:false` ishlatiladi, ammo bu uchinchi tomonning barcha saqlash jarayonlari uchun nol retention kafolati emas. Productiondan oldin provayder sozlamalari, ma’lumot uzatish shartlari va foydalanuvchiga beriladigan matn tekshiriladi.

API va boshqa xizmat kalitlari frontend build, repository yoki hujjatga qo‘shilmaydi. Lokal `.env` ignore qilinadi; production secret manager orqali boshqariladi. Maxfiy kalit oshkor bo‘lsa uni almashtirish va bog‘liq kirishlarni tekshirish operatsion tartibning bir qismi bo‘ladi.

Joriy rate limiter process xotirasida ishlaydi. Ko‘p nusxali production uchun umumiy rate limit storage, trusted proxy sozlamasi va auth, upload hamda AI endpointlari uchun alohida limitlar talab qilinadi. Disk va backup shifrlashi ham production infratuzilmasida alohida sozlanadi va tekshiriladi.

## 14 Saqlash eksport va o‘chirish

| Ma’lumot rejimi | Siyosat | Holat |
|---|---|---|
| Vaqtinchalik kuzatuv | Qoralama yaratilgandan 60 daqiqa; tarixga kirmaydi | Lokal implementatsiya mavjud |
| Tarixdagi kuzatuv | Foydalanuvchi o‘chirguncha yoki rozilikni bekor qilguncha | Maksimal umumiy muddat hozir belgilanmagan |
| O‘chirish so‘rovi | Resursga kirish darhol yopiladi | Lokal oqim tekshirilgan |
| Aktiv nusxalar | Worker orqali 24 soat ichida fizik tozalash maqsadi | Production monitoring va sinov kerak |
| Backup | Ko‘pi bilan 30 kunlik retention talabi | Lokal defaultda backup yoqilmagan |
| Yuklab olingan fayl | Foydalanuvchi qurilmasidagi nusxa | Server uni masofadan o‘chira olmaydi |

History roziligi bekor qilinsa tegishli saqlangan kuzatuv o‘chirish oqimiga o‘tadi. Processing roziligi bekor qilinsa qayta ishlash to‘xtatiladi va tahlil o‘chirish oqimiga yuboriladi. Tashqi AI roziligi bekor qilinsa faol tashqi tahlil to‘xtatiladi. O‘chirish jobi surat, hisobot, mavjud maska yoki heatmap va bog‘liq yozuvlarni izchil tozalaydi. Xato holati ko‘rinadigan bo‘ladi va cheklangan qayta urinish bilan boshqariladi.

Foydalanuvchi alohida tahlilni, holatni, barcha tibbiy ma’lumotni yoki butun akkauntni o‘chira oladi. Akkaunt o‘chirish sessiyalarni bekor qiladi. Server foydalanuvchiga deletion receipt va uning PENDING, RUNNING, COMPLETED yoki FAILED holatini beradi.

Production backup tiklanganda o‘chirish va expiry talablari qayta qo‘llanmasdan foydalanuvchi trafigi ochilmaydi. S3 versioning yoqilsa eski versiyalarni ham tozalash siyosati bo‘ladi. Vaqtinchalik objectlar backupdan chiqariladi. History ma’lumotlari uchun yakuniy retention siyosati B bosqich qabulidan oldin tasdiqlanadi.

## 15 Tezlik va barqarorlik talablari

Quyidagi ko‘rsatkichlar production qabul sinovi uchun boshlang‘ich texnik maqsadlardir. Ular joriy lokal benchmark yoki amaldagi SLA sifatida ko‘rsatilmaydi. Sinov apparati, ma’lumot hajmi va tarmoq profili protokolda qayd etiladi.

| ID | Talab | Tekshirish usuli |
|---|---|---|
| NFR 01 | Oddiy CRUD API p95 ≤1 soniya | 50 faol sessiya va jami 10 so‘rov soniya bilan 15 daqiqalik sinov; AI va fayl uzatishdan tashqari |
| NFR 02 | Yuqoridagi sinovda kutilmagan 5xx ulushi <1% | Auth va biznes sababli rad javoblari alohida hisoblanadi |
| NFR 03 | Takroriy submit bir xil jobga bog‘lanadi | Parallel va qayta yuborilgan idempotency so‘rovlari |
| NFR 04 | Worker uzilishi ishni yo‘qotmaydi | Restart va lease tugashi bilan recovery sinovi |
| NFR 05 | Delete va consent revoke natija yozishni to‘xtatadi | Provider javobi kechikayotgan paytdagi race sinovi |
| NFR 06 | Asosiy UI oqimlari tor ekranda ishlaydi | 360, 768, 1024 va 1440 piksel, klaviatura va ekran o‘qish auditi |
| NFR 07 | Backupdan tiklash isbotlanadi | Izolyatsiyalangan muhitda restore va deletion replay |

Joriy tashqi provider timeouti 75 soniya, ulanish timeouti 10 soniya, API → ML timeouti 100 soniya, job lease 180 soniya. Bular yuqori darajadagi kafolatlangan javob vaqti emas; so‘rovni boshqarish chegaralaridir. Provider sekinlashsa foydalanuvchi jarayon va xato sababini ko‘radi.

Production availability maqsadi, RPO, RTO, foydalanuvchi kvotasi, AI xarajat chegarasi va storage quvvati rejalashtirilgan trafik hamda infratuzilma asosida B bosqichda belgilanadi. Ularni sinovsiz “cheksiz foydalanuvchi” yoki “doimiy mavjudlik” sifatida e’lon qilish mumkin emas.

## 16 Muhitlar va joylashtirish

| Xizmat | Lokal manzil yoki port | Production talabi |
|---|---|---|
| Web | `http://localhost:5173` | HTTPS domen va statik build |
| NestJS API | `127.0.0.1:3001/api/v1` | Reverse proxy ortida |
| FastAPI | `127.0.0.1:8001` | Private servis va service token |
| PostgreSQL | `127.0.0.1:55439` | Private ulanish, backup va monitoring |
| Mailpit | UI 18025, SMTP 11025 | Haqiqiy SMTP bilan almashtiriladi |
| Storage | Private lokal katalog | Private S3 yoki mos obyekt storage |
| Navbat | PostgreSQL durable runner | Redis va BullMQ yo‘li runtime sinovidan o‘tadi |

Lokal muhit `pnpm setup:local`, `pnpm db:migrate`, kerak bo‘lsa `pnpm db:seed` va `pnpm start:local` orqali tayyorlanadi. Windows uchun background start va stop skriptlari ham mavjud. Bir xil portlarda foreground va background launcher bir vaqtda boshlanmaydi.

Compose xizmatlari migratsiya, private storage tayyorlash, API, worker, ML va webni bog‘laydi. Default konfiguratsiya development uchun; productionda haqiqiy HTTPS origin va production rejimi beriladi. Model bundle read only ulanadi. Lokal ishlash Docker, Redis yoki S3 konfiguratsiyasi runtime sinovidan o‘tganini anglatmaydi.

Har release oldidan migratsiya tekshiriladi, bazaning mos backupi olinadi va oldingi application image saqlanadi. Destruktiv schema o‘zgarishida kodni orqaga qaytarishning o‘zi yetarli bo‘lmaydi; forward fix yoki tekshirilgan restore rejasi talab qilinadi.

CI typecheck, frontend lint, unit, build va izolyatsiyalangan API hamda brauzer sinovlarini bajarishi kerak. Joriy GitHub Actions konfiguratsiyasi mavjud; remote run dalili alohida olinadi. Oddiy CI haqiqiy bemor suratlarini tashqi AIga yubormaydi va pullik providerga bog‘lanmaydi.

Monitoring API readiness, DB va storage sig‘imi, job muddati va retry, deletion FAILED holati, provider xatosi va latency ko‘rsatkichlarini qamrab oladi. Log rotation, resurs chegaralari va ogohlantirish manzillari production runbookda belgilanadi.

## 17 Demo ma’lumotlari

Development seed qayta ishga tushirilganda yetishmagan demo obyektlarni yaratadi, mavjud holat va tahlil tahrirlarini saqlaydi; belgilangan demo hisoblarning parollarini tiklaydi. Hozirgi seedda 3 foydalanuvchi, 8 holat, 17 tahlil va 17 sintetik private surat bor. DRAFT, FINISHED, FAILED va CANCELLED kabi holatlar interfeysni ko‘rsatish uchun berilgan.

Demo yozuvlar server boshqaradigan `isDemo` belgisi bilan ajratiladi. Sintetik natijalarda haqiqiy AI ishlagani, klinik ehtimol yoki kalibrlangan risk da’vo qilinmaydi. UI va PDF’da DEMO belgisi saqlanadi. Public DTO orqali foydalanuvchi o‘z yozuviga demo imtiyozi bera olmaydi.

Seed faqat ruxsat etilgan lokal development muhitida ishlaydi. Productionda demo hisob bilan autentifikatsiya bloklanadi. Login rekvizitlari alohida development yo‘riqnomasida boshqariladi va ushbu texnik topshiriq ichiga kiritilmaydi.

## 18 Testlash va qabul mezonlari

Qabul uch mustaqil qarordan iborat: A bosqichda lokal dasturiy oqim, B bosqichda production ekspluatatsiyasi, C bosqichda model va klinik foydalanish. Bir bosqichdagi PASS boshqa bosqichni avtomatik yopmaydi.

| ID | Qabul ssenariysi | Zarur natija |
|---|---|---|
| AC 01 | Register, login, refresh, logout va reset | Sessiya xavfsiz yangilanadi; ishlatilgan reset token qayta ishlamaydi |
| AC 02 | Ikki foydalanuvchi resurslari | Boshqaning surat, natija, case va PDFiga kirish rad etiladi |
| AC 03 | Upload chegaralari | Noto‘g‘ri MIME, format, hajm, count va piksel chegarasi rad etiladi |
| AC 04 | Sifat tekshiruvi | Past tekstura yolg‘iz o‘zi REJECT bo‘lmaydi; yaroqsiz tasvir rad etiladi |
| AC 05 | Rozilik oqimi | Processing roziligisiz upload, external roziliksiz tashqi inference bajarilmaydi |
| AC 06 | Submit va job | Takroriy so‘rov dublikat ish yaratmaydi; terminal status to‘g‘ri ko‘rsatiladi |
| AC 07 | Noaniq yoki begona tasvir | Mos outcome; uydirma tashxis, foiz yoki risk yo‘q |
| AC 08 | Natija va PDF | Bir xil saqlangan natija, cheklov va demo belgisi; private download |
| AC 09 | History va compare | Faqat saqlashga rozilik berilgan va ayni egaga tegishli kuzatuvlar |
| AC 10 | Expiry va delete | Kirish darhol yopiladi; worker fizik nusxalarni tozalaydi |
| AC 11 | UI va PWA | Desktop va mobil oqim, tushunarli xato, API keshga tushmasligi |
| AC 12 | Restart va parallel amallar | Worker recovery, lease, delete va consent race holatlari |
| AC 13 | Production | TLS, SMTP, private storage, Redis, backup restore va yuklama dalillari |
| AC 14 | Klinik model | Mustaqil test, kerakli metrikalar, model va dataset kartalari, ekspert qabuli |

### Mavjud sinov dalillari

23 sentabr 2026 kungi v2 hisobotida 48 ML, 28 backend unit va 13 frontend unit tekshiruvi qayd etilgan. Shuningdek, 28 API integration va 118 demo API tekshiruvi o‘tgan. Oldingi privacy to‘plamida 30 tekshiruv, demo brauzer to‘plamida 4 ssenariy qayd etilgan. Natija ko‘rinishi desktop va mobil rejimda, PDF esa vizual tekshirilgan.

Bu sonlar alohida test to‘plamlarining dalilidir; ularni yagona klinik aniqlik ko‘rsatkichiga yoki takrorlanmaydigan testlar umumiy soniga aylantirish mumkin emas. Bitta suratda mos taxmin chiqishi diagnostik ishonchlilikni tasdiqlamaydi.

Docker, Redis va S3 runtime, masofaviy CI, fizik iOS va kamera ruxsatlari, keng accessibility auditi, katta yuklama va klinik metrikalar to‘liq tasdiqlanmagan. Yakuniy qabul protokolida test versiyasi, muhit, sana, natija, dalil va ochiq kamchiliklar qayd etiladi.

## 19 Ish bosqichlari va topshiriladigan natijalar

| Bosqich | Topshiriladigan natija | Chiqish sharti |
|---|---|---|
| 1 Talab va kontrakt | Mazkur TZ, user flow, data model va API kontrakt | Qamrov va ochiq qarorlar kelishilgan |
| 2 Lokal dasturiy mahsulot | Web, API, DB, private storage, auth, rozilik va kuzatuvlar | A bosqich ssenariylari va kamchiliklar ro‘yxati |
| 3 Vizual AI integratsiyasi | Quality, provider, navbat, natija va PDF | Musbat va salbiy nazorat, uydirma ko‘rsatkichsiz natija |
| 4 Production tayyorlash | TLS, SMTP, secrets, monitoring, backup va CI | B bosqich qabul dalillari |
| 5 Klinik model | Litsenziyalangan artefakt, dataset, evaluation, maska va risk | C bosqich metrikalari va ekspert qarori |
| 6 Keyingi kengaytmalar | Offline model yoki yangi integratsiya | Har biri uchun alohida scope va qabul |

Ish muddati va xarajat infratuzilma, jamoa va dataset holatiga qarab alohida rejalashtiriladi. Ushbu hujjat bajarilmagan bosqichlar uchun sanasiz tayyorlik va’dasi bermaydi.

Yakuniy topshirish paketi source code, dependency lock fayllari, Prisma migratsiyalari, maxfiy qiymatlarsiz konfiguratsiya namunasi, seed, testlar, ishga tushirish qo‘llanmasi, API kontrakti, maxfiylik siyosati, test hisoboti va deployment runbookdan iborat bo‘ladi. Model joriy etilganda model kartasi, dataset kartasi va evaluation artefaktlari ham paketga qo‘shiladi.

## 20 Release oldidan yopiladigan masalalar

- Production domen, server quvvati, hudud, storage va haqiqiy SMTP provayderini tanlash.
- History retention muddati, backup jadvali, RPO va RTOni tasdiqlash.
- Umumiy rate limiter, AI kvota va xarajat chegaralarini joriy etish.
- To‘liq bo‘lmagan sifat bahosini WARN bilan ifodalash va sifat versiyasini API orqali saqlash.
- Docker, Redis, S3, backup restore, worker restart va parallel mutation matritsasini sinash.
- ROI klaviatura boshqaruvi, accessibility va haqiqiy mobil kamera oqimini tekshirish.
- Ochiq dermatologik model manbasi, litsenziyasi, maqsadli dataset va ekspert baholash tartibini belgilash.
- Klinik foydalanish talablarini mas’ul mutaxassislar bilan tekshirish va alohida release qarorini hujjatlashtirish.

## 21 Hujjatlar va atamalar

Mazkur TZ dastlabki `Loyiha TZ.docx`ning 1.0 talablari va amaldagi kodni birlashtiradi. Texnologik aniqlik uchun `apps/web/package.json`, `apps/api/package.json`, `services/ml/requirements.txt` va `apps/api/prisma/schema.prisma` asos bo‘ladi. Implementatsiya o‘zgarganda TZ, API kontrakti va qabul dalillari ham birga yangilanadi.

| Hujjat | Vazifasi |
|---|---|
| `README.md` | Loyihani lokal tayyorlash va ishga tushirish |
| `docs/API_CONTRACT.md` | Endpoint, maydon, status va xato shartnomalari |
| `docs/ARCHITECTURE.md` | Servislar va ma’lumot oqimi |
| `docs/DEPLOYMENT.md` | Muhit, Compose, migratsiya va release tartibi |
| `docs/PRIVACY_AND_RETENTION.md` | Rozilik, saqlash va o‘chirish siyosati |
| `docs/TEST_REPORT.md` | Sanalangan dasturiy sinov dalillari |
| `docs/AI_REVIEW_FIX.md` | Vizual tahlil v2 va sifat tuzatishlari |
| `docs/MODEL_CARD.md` | Model imkoniyatlari va cheklovlari |
| `docs/DATASET_CARD.md` | Dataset kelib chiqishi va foydalanish shartlari |
| `docs/ML_EVALUATION.md` | Model baholash tartibi va yetishmayotgan dalillar |
| `docs/DEMO_DATA.md` | Development demo va seed yo‘riqnomasi |

**TZ** — texnik topshiriq. **MVP** — boshlang‘ich ishlaydigan mahsulot. **Case** — bitta teri o‘chog‘i bo‘yicha kuzatuvlar to‘plami. **Analysis** — ma’lum vaqtda yaratilgan bitta kuzatuv va uning tahlili. **ROI** — foydalanuvchi belgilagan qiziqish hududi. **Differensial taxmin** — bir-biriga o‘xshash ko‘rinishi mumkin bo‘lgan holatlarning dastlabki ro‘yxati. **Lease** — workerning ishni vaqtincha egallash muddati. **Idempotency** — bir so‘rov takrorlanganda bir xil amalni qayta yaratmaslik. **p95** — kuzatuvlarning 95 foizi sig‘adigan vaqt chegarasi. **RPO** — tiklashda yo‘qotilishi mumkin bo‘lgan ma’lumot davri. **RTO** — xizmatni tiklash uchun belgilangan vaqt.
