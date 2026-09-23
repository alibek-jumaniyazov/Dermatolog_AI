# Raqamli Dermatolog

O‘zbek tilidagi teri kuzatuvi va dastlabki AI izohlash web-ilovasi. React + Vite + TypeScript + Ant Design + Axios + TanStack Query, NestJS + PostgreSQL/Prisma va Python/FastAPI/OpenCV.

Ilova surat olish/yuklash, texnik sifat tekshiruvi, simptomlar, shaxsiy tarix, vaqt bo‘yicha taqqoslash, PDF va ma’lumotni o‘chirish oqimlarini birlashtiradi. OpenAI ulangan rejimda surat haqida dastlabki kuzatuv beradi; bu kalibrlangan tibbiy classifier emas. O‘qitilgan ochiq model uchun alohida, checksum bilan tekshiriladigan adapter mavjud.

## Windowsda lokal ishga tushirish

Talablar: Node.js 22.18+, pnpm 11.19, PostgreSQL 17 binarlari va Python 3.12+. `PG_BIN` va `PYTHON_BIN` kerak bo‘lsa `.env`da sozlanadi. Mavjud PostgreSQL bazasiga tegilmaydi: loyiha `.data/postgres` ichida, `127.0.0.1:55439` portida alohida cluster ishlatadi.

```powershell
pnpm install --frozen-lockfile
pnpm setup:local
pnpm setup:ml
pnpm setup:mail
pnpm start:local
```

`setup:local` mavjud `.env`ni ustidan yozmaydi. Birinchi start migratsiya va buildni bajaradi. Keyingi ishga tushirishda ham `pnpm start:local` yetarli. Kod o‘zgargandan keyin API qayta build qilinadi; frontend development server hot reload ishlatadi. PostgreSQL helper ulangan cluster aynan shu loyihaning `.data/postgres` papkasiga tegishli ekanini tekshiradi. Port band bo‘lsa boshqa clusterda baza yaratmaydi. Vite port5173 band bo‘lsa boshqa portga jimgina o‘tmaydi.

- Ilova: [localhost:5173](http://localhost:5173)
- API/OpenAPI: [localhost:3001/api/docs](http://localhost:3001/api/docs)
- Lokal xatlar: [127.0.0.1:18025](http://127.0.0.1:18025)
- Servis holati: [API readiness](http://localhost:3001/api/v1/health/ready)

Brauzerda yangi hisob yarating yoki `pnpm db:seed` orqali demo hisoblar va namunaviy tarixni qo‘shing. Demo login-parollari va qayta bajarish tartibi [DEMO_DATA.md](docs/DEMO_DATA.md)da. Seed faqat lokal development bazada ishlaydi; unda haqiqiy bemor ma’lumotlari yo‘q. Lokal password reset xati Mailpitga tushadi va tashqi emailga yuborilmaydi. `Ctrl+C` web/API/ML/mail xizmatlarini to‘xtatadi; bazani alohida `pnpm db:stop` bilan to‘xtating. Ma’lumotlar `.data`da qoladi.

Terminal yoki Codex exec sessiyasidan mustaqil Windows background ishga tushirish uchun tayyor setup/builddan so‘ng `powershell -NoProfile -File scripts/start-background.ps1` ishlating. Yashirin servislarni PID tekshiruvi bilan to‘xtatish: `powershell -NoProfile -File scripts/stop-background.ps1`. Ushbu yo‘lni ishlatayotganda bir xil portlarda `start:local`ni parallel yoqmang.

## AI rejimini tanlash

`.env`dagi `AI_PROVIDER=local` — tekshirilgan ochiq model artifactlari bilan ishlaydi. `ML_MODEL_MANIFEST` manifestga ishora qiladi. Model mavjud bo‘lmasa ilova buni ko‘rsatadi va tashxis/foiz uydirmaydi. Trening va eksport yo‘li [ML yo‘riqnomasi](ml/README.md)da.

`AI_PROVIDER=openai`, `OPENAI_API_KEY` va `OPENAI_MODEL=gpt-5.6-luna` — alohida rozilik bilan suratdagi belgilar, ehtimoliy sabablar, ularni tasdiqlash uchun yetishmayotgan ma’lumot va keyingi qadamlarni beradi. V2 past global fokus ballini avtomatik rad etmaydi; vizual tahlilga yaroqlilik alohida tekshiriladi. Asosli taxmin bo‘lsa `OBSERVATIONS_READY`, yetarli dalil bo‘lmasa `UNCERTAIN`; risk `NOT_ASSESSED` qoladi. Kasallik foizi, malignancy ehtimoli va segmentatsiya uydirilmaydi. Kalit serverdan chiqmaydi. `store:false` ishlatiladi, ammo bu provayder barcha ma’lumotni umuman saqlamaydi degan kafolat emas. [Tuzatish va tekshiruv tafsilotlari](docs/AI_REVIEW_FIX.md), [OpenAI data controls](https://developers.openai.com/api/docs/guides/your-data).

Haqiqiy klinik suratlar uchun barcha olti guruhga mos tekshirilgan weights/dataset va klinik validatsiya hozir alohida ish bo‘lib qoladi. [Model holati](docs/MODEL_CARD.md) va [qabul mezonlari](docs/ACCEPTANCE.md)ni ko‘ring.

## Tekshirish

```powershell
pnpm typecheck
pnpm lint
pnpm test
pnpm build
pnpm test:smoke
pnpm test:integration
pnpm test:privacy
pnpm db:seed
pnpm test:demo
pnpm test:demo-seed
pnpm test:e2e
pnpm test:offline
pnpm check:secrets
pnpm models:check
pnpm verify:ml
```

Integration/E2E testlar lokal server ishlayotganida bajariladi. Oddiy testlar yangi sinov hisoblarini yaratadi; demo testlar esa oldindan `pnpm db:seed` orqali to‘ldirilgan hisoblarni tekshiradi. Faqat demo brauzer oqimlari uchun `pnpm test:demo-ui`. Umumiy testlar pullik tashqi AI’ga surat yubormaydi. Windows E2E o‘rnatilgan Edge’dan foydalanadi; Linuxda `pnpm exec playwright install --with-deps chromium` kerak. ML tekshiruvi:

```powershell
services/ml/.venv/Scripts/python.exe -m pip install -r services/ml/requirements-dev.txt
services/ml/.venv/Scripts/python.exe -m pytest services/ml/tests -q
```

`verify:ml` klinik classifier/segmentatsiya/calibration gate’larini tekshiradi; oddiy AI kuzatuvi uni PASS qilmaydi. Haqiqiy bajarilgan tekshiruvlar [test hisobotida](docs/TEST_REPORT.md).

## Docker va server

`compose.yaml` PostgreSQL, Redis/BullMQ, private S3-compatible storage, API/worker, ML, web va Mailpitni ajratadi. Windows lokal rejimi private filesystem adapter va PostgreSQL durable job runner ishlatadi; u S3 yoki Redis bor deb taqdim etilmaydi. Bu muhitda Docker mavjud bo‘lmagani uchun container ishga tushirish alohida tekshiruv talab qiladi. [Deployment](docs/DEPLOYMENT.md).

Secretlarni Gitga qo‘shmang. `.env`, `.data`, datasetlar va model vaznlari ignore qilinadi. API faqat ownerga tegishli ma’lumotni qaytaradi; maxfiy suratlar static/public route orqali ochilmaydi. [Maxfiylik va retention](docs/PRIVACY_AND_RETENTION.md).
