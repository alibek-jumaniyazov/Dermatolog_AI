# Qayta ishga tushirish va SEO hisoboti

Sana: 2026-09-23. Loyiha: `C:\Users\Lokaydo\Desktop\Loyiha 1\Dermatolog_AI`.

## Natija

Loyiha yangi papkadan ishlayapti: <http://localhost:5173>. API3001, ML8001, alohida PostgreSQL55439 va lokal Mailpit18025/11025 ishga tushirildi. Docker ishlatilmadi. `START.cmd` setup/migratsiya/build/readiness bosqichlarini bajaradi; `STOP.cmd` shu loyihaning ilova servislarini to‘xtatadi. PostgreSQLni alohida `pnpm db:stop` bilan to‘xtatish mumkin.

Oldingi papkaga bog‘langan pnpm havolalari qayta o‘rnatildi. Eski cluster to‘xtatilgach PostgreSQL, private storage va lokal yordamchi vositalar yangi `.data`ga nusxalandi. Dastlabki4 hisob,23 tahlil va23 surat yozuvi saqlangani tekshirildi. Storage’dagi27 faylning SHA-256 qiymatlari eski nusxa bilan bir xil. PostgreSQL `data_directory` yangi loyiha papkasiga tegishli. Uchta migratsiya qo‘llangan, pending migratsiya yo‘q. Eski `.data` nusxasi o‘chirilmagan. Integratsiya testlari keyinchalik alohida sinov hisoblarini yaratadi.

## SEO

Kelajakdagi origin `https://dermatologai.uz`. Domen/DNS/server egaligi yoki jonli deploy tasdiqlanmagan. Yakuniy buildda `VITE_ALLOW_INDEXING=false`.

- `/`, `/privacy`, `/consent`, `/limitations` sahifalari JavaScriptsiz mazmunli statik HTML beradi.
- Sahifaga mos title/description/canonical, OG/Twitter va1200×630 social karta, haqqoniy JSON-LD qo‘shildi.
- Auth, kabinet, admin, reset va404 uchun boshlang‘ich HTML ham `noindex`; private/API javoblar `no-store`.
- Robots/sitemap indekslash rejimiga mos yaratiladi. Yo‘q URL uchun Nginx haqiqiy404 qaytarishga sozlangan.
- Service worker API, shaxsiy javoblar va HTMLni offline keshga saqlamaydi.
- JavaScriptsiz, SPA navigatsiyasi, desktop1280px va mobil390px tekshirildi.

Yo‘riqnoma: [SEO.md](SEO.md).

## Production tayyorgarligi

Native Linux uchun Nginx, systemd API/worker/ML, PostgreSQL, Redis, private storage, HTTPS va SMTP konfiguratsiya shablonlari tayyorlandi. Production konfiguratsiyasi placeholder/zaif secret, noto‘g‘ri origin yoki yetishmayotgan muhim sozlamalarda ishga tushmaydi. API’da cheklangan trusted proxy, umumiy Redis rate limiter, xavfsiz HTTP headerlar, request chegaralari va graceful shutdown mavjud.

Release aktivatsiyasi runtime env va AI readiness imkoniyatlarini tekshiradi. Shifrlangan backup va alohida yangi bazaga restore skriptlari bor; restore o‘chirish hodisalarini qayta qo‘llaydi va ularni keyingi backup uchun saqlaydi. Windowsdagi tekshiruvlar haqiqiy Linux backup/restore sinovi o‘rnini bosmaydi.

Sharp, Nodemailer va zaif transitive paketlar yangilandi; lockfile saqlandi. `pnpm audit --prod` yakunida ma’lum zaifliklar: **0**. Bu butun tizimning xavfsizligiga kafolat emas. CI Docker xizmatiga bog‘liq bo‘lmagan alohida native PostgreSQLdan foydalanishga moslandi; YAML lokal tekshirildi, masofaviy GitHub Actions bu ish davomida bajarilmadi.

## Bajarilgan tekshiruvlar

| Tekshiruv | Natija |
|---|---|
| To‘liq stop → start, Prisma generate/migrate, API/Web build | PASS |
| API unit testlari |71/71 PASS |
| Frontend unit testlari |24/24 PASS |
| API/frontend typecheck va lint | PASS |
| API integratsiya tekshiruvlari |28 PASS |
| Maxfiylik/reset/session/deletion integratsiyasi |30 PASS |
| Demo API, owner isolation, PDF va taqqoslash |118 PASS |
| Desktop va mobil haqiqiy brauzer oqimlari |6/6 PASS |
| SEO indexing=true va false build/artifact/browser tekshiruvi | PASS; yakuniy rejim false |
| Production template/statik konfiguratsiya | PASS |
| AES-GCM synthetic roundtrip, tamper va noto‘g‘ri kalit | PASS |
| Source/build ichida lokal server secretlari yo‘qligi | PASS |
| Production dependency audit |0 ma’lum zaiflik |

Birinchi brauzer urinishida oldingi API testlari bilan bir xil IPdan qisqa vaqtda ko‘p auth so‘rovi yuborilgani sababli2 test429 oldi. Limit oynasi yangilangach bir xil productionga taalluqli bo‘lmagan lokal standart limitlar bilan barcha6 test o‘tdi. CI testlari bitta IPni ulashgani uchun alohida yuqoriroq test limiti berilgan; API’ning odatiy va production limitlari pasaytirilmagan. Oddiy testlarda pullik tashqi AI chaqiruvi yoki tashqi email yuborilishi bajarilmadi.

## Server ochilganda tekshiriladigan ishlar

Server hali berilmagani sababli DNS/TLS, Nginx/systemd runtime, Redis bilan restart/shutdown, real SMTP, Linux PostgreSQL clone/restore, off-host backup va alerting amalda sinalmagan. Ularning tartibi [PRODUCTION_NATIVE.md](PRODUCTION_NATIVE.md)da.

Real qurilma/tarmoqdagi Core Web Vitals, yuklama sinovi va Search Console qabul tekshiruvi ham serverda bajariladi. Hozirgi Vite build asosiy JS chunk uchun taxminan1.02MB (gzip321KB) ogohlantiradi; tashqi Google Fonts ishlatiladi. Bu hisobot Lighthouse100 yoki qidiruvdagi o‘rin kafolatini da’vo qilmaydi. Klinik model validatsiyasi ushbu SEO/deployment ishiga kirmaydi.
