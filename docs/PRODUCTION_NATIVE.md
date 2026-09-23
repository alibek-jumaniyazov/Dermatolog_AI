# Dermatolog AI — Docker’siz native server runbook

**Holat: deployment tayyorgarligi; live deploy emas.** `dermatologai.uz` kelajakdagi nom, server/DNS hali yo‘q. Quyidagi host amallari faqat operator haqiqiy serverni tanlaganidan keyin bajariladi. Ushbu ish davomida OS paketlari o‘rnatilmadi, masofaviy kirish, DNS yoki sertifikat olish bajarilmadi.

## Arxitektura

Internet80/443 → Nginx → React static build yoki loopback NestJS3001. API → native PostgreSQL5432, Redis6379, private storage va loopback FastAPI8001. Alohida systemd worker inference/deletion ishlarini bajaradi. Application portlaridan faqat80/443 public; SSH operator IP/tarmog‘i bilan cheklanadi. DB/Redis/API/ML loopback’ga bind qilinadi va firewall’da tashqariga chiqarilmaydi.

Bu bitta native host shabloni. Multi-host uchun shared S3 va alohida queue/rate-limit/backup sinovlari kerak. HA, autoscaling, klinik model tayyorligi yoki load SLA tasdiqlanmagan.

## Host va filesystem

Ubuntu24.04LTS yoki mos systemd Linux, Node22.18+ (API engines diapazonida), pnpm11.19.0, Python3.12, PostgreSQL17 server/client, Redis, Nginx va Certbot talab etiladi. Rasmiy paket manbalaridan foydalaning; script OS install qilmaydi. Patch versiyalari va xavfsizlik yangilanishlari release protokolida qayd etiladi.4vCPU/8GBRAM boshlang‘ich sig‘im taklifi, benchmark emas.

| Yo‘l | Egasi/rejim | Vazifa |
|---|---|---|
| `/opt/dermatologai/releases/<id>` | Root/operator; service faqat o‘qiydi | Har release kodi/build |
| `/opt/dermatologai/current` | Root symlink | Faol release |
| `/etc/dermatologai` | root0700 | Env va keylar |
| `/var/lib/dermatologai` | root0755 | Nginx o‘qiy oladigan maintenance ota katalogi |
| `/var/lib/dermatologai/storage` | dermatologai0700 | Private fayllar |
| `/var/backups/dermatologai` | root0700 | Shifrlangan backup/ledger |
| `/var/lib/letsencrypt` | Nginx o‘qiy oladi | ACME webroot |

`dermatologai` system user login shell’siz bo‘ladi. Release’ga yozish huquqi berilmaydi. Nginx `www-data` storage user guruhiga qo‘shilmaydi. Parent0755 faqat maintenance markerini ko‘rish uchun; suratlar ichki0700 katalogda qoladi. Host disk encryption alohida sozlanadi.

PostgreSQL uchun alohida `dermatologai` login/DB, SCRAM-SHA-256, loopback listener. App roli superuser/CREATEDB huquqiga ega bo‘lmasin, o‘z schema migratsiyasini bajara olsin. Native Redis loopback, protected mode, alohida kuchli parol, AOF va `maxmemory-policy noeviction` bilan ishlasin. Disk/memory sig‘imini kuzating; queue ma’lumotlarini LRU bilan o‘chirmang.

## Konfiguratsiya va secretlar

`.env.production.example`dan root0600 `/etc/dermatologai/source.env` yarating. Secretlar mustaqil tasodifiy qiymatlar; URL parollarini percent-encode qiling yoki64hex belgidan foydalaning. Qiymatlarni terminal output/history, Git yoki VITE prefiksli kalitga yozmang. Production API repository `.env`ni avtomatik o‘qimaydi.

```sh
sudo node scripts/production-preflight.mjs --env /etc/dermatologai/source.env
sudo node scripts/production-split-env.mjs --env /etc/dermatologai/source.env --apply
```

Preflight qiymatlarni chop qilmaydi. Split script `app.env` va `ml.env`ni exclusive-create qiladi; mavjud fayl ustidan yozmaydi. Rotatsiyada yangi fayllarni tayyorlab nazorat bilan almashtiring. Qisman oldingi urinish qolsa operator tekshiradi, avtomatik o‘chirish yo‘q. Deployment haqiqiy app/ml fayllar source bilan mosligini yana tekshiradi.

API/worker muhitiga OpenAI kaliti berilmaydi; ML muhiti DB/SMTP secretlarini olmaydi. `AI_PROVIDER=openai`, `OPENAI_MODEL=gpt-5.6-luna` explicit; bu umumiy vizual izoh, klinik classifier emas. Local model rejimi uchun tekshirilgan manifest/hash va mos ONNX/Torch runtime alohida talab qilinadi.

SMTP587: `SMTP_REQUIRE_TLS=true`, `SMTP_SECURE=false`; SMTP465: `SMTP_SECURE=true`. Haqiqiy SMTP, yuboruvchi domen, SPF/DKIM/DMARC va reset xati yetib borishi host qabulida tekshiriladi. Mailpit production’da ishlatilmaydi.

Native storage faqat explicit `ALLOW_LOCAL_STORAGE_IN_PRODUCTION=true` va `/var/lib/dermatologai/storage` bilan. API Linux0700 rejimini tekshiradi. S3 ixtiyoriy; private bucket, eng kam ruxsatli credential va TLS/private endpoint alohida tekshiriladi. Bu runbook backup scripti **local storage uchun**; S3 backup/restore alohida operator rejasi talab qiladi.

## Build va systemd

Build oddiy deploy foydalanuvchisi bilan yangi release’da: frozen pnpm install, Prisma generate, API/Web typecheck/test/build va shu release ichida Python venv+requirements. Venv’ni boshqa yo‘ldan ko‘chirmang. Frontend buildga faqat `VITE_SITE_URL=https://dermatologai.uz`, `VITE_ALLOW_INDEXING=false` bering. Build artifactlari `apps/web/dist`, `apps/api/dist`; public HTML, app-shell,404 vaSEO fayllar saqlansin.

`infra/native/dermatologai-{api,worker,ml}.service` va health service/timer → `/etc/systemd/system`. `journald-dermatologai.conf` → `/etc/systemd/journald@dermatologai.conf`. `systemd-analyze verify` va daemon-reload bajaring. ExecStart `/usr/bin/node` va release `.venv/bin/python`ni kutadi; haqiqiy host yo‘llari mos bo‘lsin.

Xizmatlar non-root, ProtectSystem, NoNewPrivileges, resurs chegaralari bilan. API ichki worker’i o‘chiq; alohida worker150s graceful stop bilan. Tashqi request uzilishi avtomatik pullik retry qilmaydi. Health timer localhost DB/storage/Redis readiness va ML `inferenceAvailable`ni tekshiradi, tashqi providerga inference yubormaydi. Kalit to‘g‘riligi, quota/provider connectivity alohida explicit sinov talab qiladi. Alert routing operator monitoringiga ulanishi kerak.

Journald namespace100MB, fayl10MB, retention7kun. Nginx access log o‘chiq. Error log uchun distro logrotate yoki berilgan `nginx-logrotate.conf`dan bittasi ishlatiladi; bir faylni ikki marta sozlamang. Disk, deletion FAILED, stale/pending job, provider xatosi va latency monitoringga kiradi.

## DNS, TLS va SEO

DNSA/AAAA real serverga yo‘naltirilmaguncha deploy/sertifikat olishni boshlamang; AAAA faqatIPv6 tayyor bo‘lsa. `www` alohida sozlanmagan. Avval `nginx.http.conf`ni o‘rnating: ACME’dan tashqari503. Rasmiy hostga mos Certbot o‘rnatishidan keyin:

```sh
sudo certbot certonly --webroot -w /var/lib/letsencrypt -d dermatologai.uz
```

Sertifikat mavjud bo‘lgach `nginx-security.conf` → `/etc/nginx/snippets/dermatologai-security.conf`; `nginx.https.conf` → sayt konfiguratsiyasi. `nginx -t` keyin reload. Renewal timer, muvaffaqiyatli renewdan keyin Nginx reload hook va `certbot renew --dry-run` bilan isbot kerak. Unknown hostlar default deny bo‘lsin; boshqa sayt konfiguratsiyalarini o‘zgartirmang.

Nginx public prerenderlarni beradi; app/auth/admin/API noindex/no-store. Noma’lum URL haqiqiy404, serviceworker no-cache, privateblob route owner-only API’dan o‘tadi. Client X-Forwarded-For ustidan remote_addr yoziladi, API faqat loopback proxyga ishonadi. CDN keyin qo‘shilsa trusted-proxy qoidasi qayta ko‘rib chiqiladi.

Hozir indexingfalse. Domen, legal/public content, canonical/sitemap, robots,404 va mobil oqimlar tasdiqlangandan keyingina public build `VITE_ALLOW_INDEXING=true` bilan qayta yig‘iladi. Server mavjud bo‘lmagan hozirgi bosqichda yoqilmaydi.

## Release va rollback

Prebuilt release, app/ml env, Nginx/unitlar, DB tayyor bo‘lsin. Script paket install qilmaydi. Birinchi deploy’da `User` jadvali yo‘qligi tekshiriladi; mavjud bazada COMPLETE backup talab qilinadi:

```sh
sudo node scripts/production-deploy.mjs --release /opt/dermatologai/releases/RELEASE_ID --first-deploy --migration-reviewed --activate
# Keyingi release: --first-deploy o‘rniga --backup /var/backups/dermatologai/snapshot-TIMESTAMP
```

Script config/artifactlarni tekshiradi, maintenance yoqadi, API/worker’ni to‘xtatadi, yangi release’dan migrate deploy, current atomik symlink, xizmat restart va readiness/capability tekshiruvini bajaradi. Muvaffaqiyatda maintenance o‘chadi. Xatoda maintenance qoladi; avtomatik DB rollback yo‘q. So‘ng HTTPS/cookie/login/reset/ownership/upload/delete/SEO smoke kerak; pullik AI test alohida ruxsat bilan.

Rollback faqat eski kod yangi schema bilan mos bo‘lsa maintenance+stop, current’ni oldingi releasega almashtirish, restart/readiness, so‘ng maintenance off. Destruktiv migratsiyada forward-fix yoki isolated restore kerak; live DB ustiga avtomatik restore qilinmaydi.

## Shifrlangan backup

Root0600 `/etc/dermatologai/backup.env` ichida alohida `BACKUP_KEY_HEX`64hex. Kalit snapshotdan boshqa off-host escrow’da ham saqlanadi; yo‘qolsa restore imkonsiz. AES256-GCM autentifikatsiyalangan encryption, backup papka0700/fayl0600.

```sh
sudo touch /var/lib/dermatologai/maintenance
sudo systemctl stop dermatologai-api dermatologai-worker
sudo node scripts/production-backup.mjs --execute
```

Script stop holatini tekshiradi. Root→postgres yangi clone yaratadi; **faqat clone**dan temporary/expired/deleted/demo, sessions/reset/queue yozuvlari chiqariladi. Saqlangan history DB va faqat referenced private fayllar shifrlanadi. Live DB o‘zgarmaydi. Incomplete papkada COMPLETE yo‘q. Faqat muvaffaqiyatli yaratilgan clone finally o‘chiriladi; cleanup xatosi operatorga beriladi. Bu maintenance talab qiluvchi offline backup, hot/PITR emas.

Xizmatlar avtomatik ochilmaydi: operator start, localhost readiness tekshiruvi, keyin maintenance markerini olib tashlaydi. Marker turganda health timer skip qiladi.

```sh
# O‘chirish hodisalarini eski snapshotga qayta qo‘llash uchun; maintenance talab qilmaydi:
sudo node scripts/production-backup.mjs --execute --ledger-only
```

Ledger read-only so‘rov bilan olinib shifrlanadi. Backup+latest ledger off-host nusxalanadi. Retention≤30kun; scheduling, off-host transport va retention rotation operator tomonidan sozlanadi, bu scriptlar avtomatik upload/delete qilmaydi. Eng yangi ledger bo‘lmasa eski snapshot publicga ochilmaydi. Key/DNS/secret fayllari medical snapshot tarkibiga kirmaydi.

## Izolyatsiyalangan restore

Root0600 restore.env: DATABASE_URL **yangi** `dermatologai_restore_<id>` DB, STORAGE_PATH **yangi** `/var/lib/dermatologai/restore/<id>/storage`. DB roli mavjud, database/target katalog oldindan yaratilmagan bo‘lsin. Ledger snapshotdan yangi yoki teng va oxirgi24soat ichida eksport qilingan bo‘lsin.

```sh
sudo node scripts/production-restore.mjs --env /etc/dermatologai/restore.env --snapshot /var/backups/dermatologai/snapshot-TIMESTAMP --ledger /var/backups/dermatologai/ledger-RECENT.enc --confirm-isolated
```

GCM/hash tekshiriladi, yangi bazaga transactional restore qilinadi, latest deletion/expiry/consent qoidalari qo‘llanadi, sessions bekor qilinadi va qolgan referenced objectlar ochiladi. Replay qilingan deletion tombstone’lar restored DB’da saqlanadi, keyingi ledgerdan yo‘qolmaydi. Eski MEDICAL_DATA hodisasidan keyin yaratilgan yangi Case o‘sha eski hodisa bilan o‘chirilmaydi. Plaintext dump faqat0700 `/var/tmp/dermatologai-restore-*` scratch’da, finally tozalanadi; host disk encryption talab. Xatoda isolated partial DB/storage qoladi; live data almashtirilmaydi, xizmat/traffic yoqilmaydi.

Promotiondan oldin haqiqiy restore drill: row/object soni, owner-only image/PDF, account isolation, consent/history, deletion replay, session revoke. Ledger yetishmasa yoki eski bo‘lsa script ochishni rad etadi; operator recovery/maxfiylik qarori alohida hujjatlashtiriladi.

## Qabul chegaralari va manbalar

Windowsda template/static va synthetic crypto regression PASS. **Hali bajarilmagan:** native Linux/systemd, Nginx syntax/TLS/renewal, Redis restart, SMTP delivery, PG17 clone/dump/restore, latest ledger replay’ning realDB sinovi, firewall, off-host backup, yuklama va alert. Ular server tanlanganda qabul gate’lari. Synthetic testlar klinik yoki production ishlash dalili emas.

Sintaksis rasmiy manbalari: [Nginx core](https://nginx.org/en/docs/http/ngx_http_core_module.html), [systemd execution](https://github.com/systemd/systemd/blob/main/man/systemd.exec.xml), [Certbot webroot/renewal](https://eff-certbot.readthedocs.io/en/latest/using.html), [PostgreSQL17 pg_dump](https://www.postgresql.org/docs/17/app-pgdump.html), [PostgreSQL17 pg_restore](https://www.postgresql.org/docs/17/app-pgrestore.html). Rasmiy hujjat hostda bajarilgan sinov o‘rnini bosmaydi.
