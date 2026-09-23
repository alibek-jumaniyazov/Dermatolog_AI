# Ishga tushirish

Lokal tartib README’da. Yangi `setup:local` alohida Compose uchun ham tasodifiy `POSTGRES_PASSWORD` va `S3_SECRET_KEY` yaratadi. Avvalgi `.env` saqlanadi: unda `POSTGRES_PASSWORD`, `S3_ACCESS_KEY`, `S3_SECRET_KEY` bo‘lmasa o‘zingiz qo‘shing. Compose PostgreSQL paroli URI ichida ishlatiladi; hex kabi URI-safe qiymat tanlang. Docker Engine o‘rnatilgan serverda development Compose faqat localhost8080ga bind qilingan; lokal tekshiruv uchun:

```sh
docker compose config --quiet
docker compose up --build -d
docker compose ps
```

Compose o‘zining `COMPOSE_APP_ORIGIN` (default `http://localhost:8080`) va `COMPOSE_NODE_ENV` (default `development`) qiymatlarini API/worker uchun qo‘llaydi. Lokal launcher esa avvalgidek `APP_ORIGIN`/`NODE_ENV`ni ishlatadi. API container ichida `HOST=0.0.0.0`; tashqariga faqat web localhost8080 ochilgan. Migratsiya va private bucket init muvaffaqiyatli tugamasdan API/worker boshlanmaydi; ML readiness model yo‘qligida ham real quality servis ishlashini tekshiradi. Web API healthni kutadi.

Production oldidan `COMPOSE_APP_ORIGIN` haqiqiy HTTPS domain va `COMPOSE_NODE_ENV=production` bo‘lsin. Reverse proxy TLSni terminatsiya qilsin va secure cookie to‘g‘ri uzatilsin. DB/Redis/S3 admin/ML portlarini internetga ochmang. Secretsni deployment secret managerdan bering. Mailpitni production override faylida SMTPga almashtiring; Mailpit inbox portini yopiq qoldiring.

Model bundle `ml/artifacts`dan read-only `/workspace/ml/artifacts`ga mount qilinadi. Operator tekshirgan hashlar `ML_TRUSTED_ARTIFACT_SHA256` orqali beriladi. Default ML image quality va OpenAI adapterini o‘rnatadi; local ONNX/TorchScript runtime uchun tegishli optional requirementlar bilan alohida image qurish zarur. Runtime yoki model yo‘qligida servis MODEL_NOT_READY beradi; trained model ishlab turibdi deb ko‘rsatilmaydi.

Migratsiya bir martalik `migrate` xizmati bilan bajariladi. Har release oldidan DB va history-storage backup yarating. Avvalgi application image/tagni saqlang. Destructive migration bo‘lsa alohida forward-fix yoki tekshirilgan restore rejasi zarur; eski kodga qaytish bazani avtomatik qaytarmaydi.

Backup va restore alohida test bazada tekshirilsin. Restore’da deletion requestlari va muddati tugagan temporary tahlillar qayta ishlanmasdan public trafik ochilmasin. S3 object versioning yoqilsa delete marker bilan cheklanmasdan version purge siyosati kerak. Temp objectlar backupdan chiqarilsin. Retention siyosati30kunni oshirmasin.

Monitoring: health/readiness, DB/storage sig‘imi, queue lease/retry, FAILED deletion, ML provider error va latency. Log rotation va container resource limitlari server quvvatiga moslansin. Ushbu ish muhitida Docker yo‘q: Compose/container sinovi bajarilgan deb hisoblanmaydi.

Windows lokal background launcher: `powershell -NoProfile -File scripts/start-background.ps1`; to‘xtatish uchun `scripts/stop-background.ps1`. Ular foreground `pnpm start:local`ga muqobil: bir xil portlarda ikkala rejimni birga boshlamang. Background launcher container/server deployment emas.

CI `.github/workflows/ci.yaml`da PostgreSQL service, tasodifiy test auth/ML secretlari, `AI_PROVIDER=local` va bo‘sh OpenAI key bilan API/ML/webni ishga tushiradi. 90 soniyalik readiness chegarasidan so‘ng integration runner va Chromium desktop/mobile uchun `tests/e2e/app.spec.ts` bajariladi. OpenAIga bog‘liq upload E2E CI’dan ataylab chiqarilgan; pullik provider chaqirilmaydi. Har yakunda servislar to‘xtatiladi, failure holatida tanlangan log va browser dalillari yuklanadi. Workflow YAML statik tekshirilgan; remote GitHub Actions run bu ish muhitida bajarilmadi.
