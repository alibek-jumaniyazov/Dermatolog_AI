# Ishga tushirish va kelajakdagi joylashtirish

Joriy loyiha `Dermatolog_AI` papkasidan native Windows xizmatlari bilan ishlaydi. Foydalanuvchi Docker ishlatmaslikni belgilagan. Yangi production Docker oqimi yaratilmagan; avvalgi development Docker fayllari tarixiy muvofiqlik uchun qolgan.

`dermatologai.uz` hozir loyiha nomi va kelajakdagi canonical origin sifatida ishlatiladi. Domen egaligi, DNS, server, TLS yoki internetga deploy bajarilgani tasdiqlanmagan. `VITE_ALLOW_INDEXING=false` holatida public sahifalar ham qidiruv indeksiga ochilmaydi.

## Lokal Windows

README’dagi `pnpm setup:local`, `pnpm db:migrate`, `pnpm start:local` ketma-ketligi ishlatiladi. Kerak bo‘lsa `pnpm db:seed` faqat development demo ma’lumotlarini yaratadi. `scripts/start-background.ps1` va `scripts/stop-background.ps1` foreground launcherga muqobil; bir xil portlarda ikkalasini birga boshlamang.

Lokal portlar: web5173, API3001, ML8001, ajratilgan PostgreSQL55439, Mailpit SMTP11025/UI18025. Lokal ishlash production Nginx/systemd/Redis/TLS/SMTP sinovidan o‘tganini anglatmaydi.

## Kelajakdagi Linux server

Native Ubuntu/Linux konfiguratsiyasi, systemd, Nginx, migratsiya, shifrlangan backup va izolyatsiyalangan restore tartibi [PRODUCTION_NATIVE.md](PRODUCTION_NATIVE.md)da. `.env.production.example` tayyor server konfiguratsiyasi emas: haqiqiy secret va SMTP sozlamalarisiz preflight rad etadi.

Mahalliy, maxfiy ma’lumot o‘qimaydigan tekshiruvlar:

```sh
node scripts/production-preflight.mjs --template
node scripts/production-static-test.mjs
node scripts/production-backup-test.mjs
```

Template, statik regression va synthetic AES-GCM roundtrip/tamper/wrong-key testlari o‘tdi. Haqiqiy Linux/systemd/Nginx, native PostgreSQL clone/restore, Redis, TLS/SMTP yoki public domain sinovi bajarilmadi. Pullik AI chaqiruvi oddiy CI yoki deploy healthcheck’ga kiritilmagan.
