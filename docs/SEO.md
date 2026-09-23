# DermatologAI: SEO va indekslash

Brend: **Raqamli Dermatolog**. Belgilangan kelajakdagi production origin: **https://dermatologai.uz**. Domen/server ishga tushirilgani yoki Google indeksiga kiritilgani ushbu konfiguratsiya bilan tasdiqlanmaydi.

## Public build sozlamalari

Workspace `.env` yoki build jarayoni muhitida:

```dotenv
VITE_SITE_URL=https://dermatologai.uz
VITE_ALLOW_INDEXING=false
```

Vite konfiguratsiyasi workspace `.env`, `.env.local`, `.env.<mode>`, `.env.<mode>.local` fayllaridan **faqat shu ikki ochiq kalitni** oladi; process muhiti ustun turadi. Backend `NODE_ENV` va maxfiy kalitlar shu yo‘l orqali browser bundle ichiga kiritilmaydi. `VITE_` prefiksi maxfiy qiymatlar uchun ishlatilmasin.

Indekslash faqat production build, yaroqli HTTPS origin va `VITE_ALLOW_INDEXING=true` birgalikda berilganda yoqiladi. Portli, credential/query/hash/pathli URL, localhost, IP va odatiy placeholder/test domenlari rad etiladi. Default, local, preview va hali tayyor bo‘lmagan deployment `false` holatida qoladi. `true`ga o‘tish qayta build talab qiladi. Stagingdagi noindex allaqachon indekslangan sahifani olib tashlash vositasi sifatida ishlatilmasin: robots orqali yopilgan sahifada crawler noindexni o‘qiy olmasligi mumkin.

```sh
pnpm --filter @derma/web typecheck
pnpm --filter @derma/web lint
pnpm --filter @derma/web test
pnpm --filter @derma/web build
pnpm --filter @derma/web test:seo
pnpm --filter @derma/web test:seo:browser
```

Build React komponentlarining o‘zini serverda statik render qiladi; alohida crawler matni yo‘q. Bu jarayon API, sessiya, foydalanuvchi surati yoki tashqi AIga murojaat qilmaydi. `sharp` workspace development dependency orqali SVG brend kartasidan 1200×630 PNG yaratadi. Build vositalari va dev dependencies serverdagi build/release jarayonida mavjud bo‘lishi kerak.

## Hosting kontrakti

| URL | `apps/web/dist` fayli | HTTP/indekslash |
|---|---|---|
| `/` | `index.html` | 200, public metadata |
| `/privacy` | `privacy/index.html` | 200, o‘z canonical/title/description |
| `/consent` | `consent/index.html` | 200, o‘z canonical/title/description |
| `/limitations` | `limitations/index.html` | 200, o‘z canonical/title/description |
| `/login`, `/register`, `/forgot-password`, `/reset-password`, `/app`, `/app/**`, `/admin` | `app-shell.html` | no-store; noindex, nofollow |
| noma’lum sahifa | `404.html` | **404**; noindex, nofollow |
| `/api/**`, private surat, eksport va PDF | backend | autentifikatsiya/ruxsat nazorati; no-store; X-Robots-Tag: noindex, nofollow |

Private yoki noma’lum URL uchun public `index.html` fallback ishlatilmasin. Public `.html` nusxalari, trailing slash, `www` va HTTP origin native Nginx konfiguratsiyasida bitta HTTPS canonical manzilga yo‘naltiriladi. Hosting private HTML va APIga `X-Robots-Tag` qo‘shadi; frontend ham private HTMLga boshlang‘ich noindex beradi. Public sahifa dastlabki HTMLida `true` build uchun noindex bo‘lmasligi kerak: uni keyin JavaScript bilan olib tashlash ishonchli emas.

Statik fayllar: `/assets/*` (Vite hashli JS/CSS), `/icon.svg`, `/manifest.webmanifest`, `/sw.js`, `/offline.html`, `/og-image.png`, `/robots.txt`, `/sitemap.xml`. `sw.js` va HTML uchun qayta tekshiriladigan cache siyosati; hashli assetlar uchun uzoq immutable cache qo‘llanadi. `seo-build.json` faqat ommaviy build origin/indexable/publicRoutes dalili; uni hostingda ochish shart emas.

Vite preview production server emas. Unda barcha javoblarda `X-Robots-Tag: noindex` va shu public/private/404 HTML ajratilishi mavjud.

## Metadata va mazmun

To‘rtta public sahifa JavaScriptsiz ham asosiy mazmunni beradi. Har birida o‘zbekcha noyob title/description, HTTPS canonical, Open Graph/Twitter tavsifi, ijtimoiy karta va `lang=uz` bor. Canonical tracking query va fragmentlarni olmaydi. React Router navigatsiyasi metadata elementlarini almashtiradi; dublikat canonical qoldirmaydi. Kabinet/reset URLlari, tokenlar yoki surat identifikatorlari public metadata/sitemapga yozilmaydi.

Landing JSON-LD: `WebSite` va `SoftwareApplication`. Mavjud dastur imkoniyatlarigina tavsiflanadi; soxta rating, shifokor maqomi, tashkilot akkreditatsiyasi, narx, klinik aniqlik yoki kafolat kiritilmagan. Bu belgilash Google rich result olish kafolati yoki barcha SoftwareApplication rich-result maydonlari to‘ldirilgan degani emas.

Sitemap opt-in productionda faqat to‘rtta canonical public URLni oladi; disabled buildda URLsiz bo‘ladi. Sun’iy `lastmod`, chastota yoki ustuvorlik raqamlari yaratilmaydi. Production robots API crawlingni cheklaydi, ammo private HTMLdagi noindexni crawler ko‘rishi uchun auth/app yo‘llarini alohida Disallow qilmaydi. **Robots va noindex xavfsizlik nazorati emas** — tibbiy ma’lumotni backend autentifikatsiya/ruxsat nazorati himoya qiladi.

Service worker faqat offline yo‘riqnoma, ikonka va cheklangan statik JS/CSS/font assetlarini keshlaydi. API, tibbiy suratlar, tarix va natijalar keshlanmaydi; no-store/private javob va HTML fallback statik asset keshiga kirmaydi. Offline AI mavjud emas.

## Deploymentdan keyingi qabul

1. DNS va TLSni real serverda tekshiring; HTTP/www/trailing-slash canonical redirectlari, noma’lum 404 va private noindex/no-store javoblarini tekshiring.
2. Public sahifalarni JavaScriptsiz oching. Sahifaning dastlabki HTMLi, canonical, title, description, JSON-LD, OG PNG va sitemapni tekshiring. Public origin HTTPS va production host bilan bir xil bo‘lsin.
3. Tayyorlik tasdiqlangach indekslashni explicit yoqing va qayta build/deploy qiling. Search Console domain propertyni haqiqiy domen egasi DNS orqali tasdiqlaydi; `/sitemap.xml`ni yuboradi.
4. URL Inspection orqali to‘rtta public URL, Rich Results Test orqali structured data, PageSpeed Insights orqali real hostingdagi ko‘rsatkichlarni tekshiring. Bu tashqi xizmatlarga submission ushbu lokal ishda bajarilmagan.
5. Monitoringda crawl/404 xatolari va Search Console holatini kuzating. Indekslash muddati, trafik yoki qidiruvdagi o‘rin kafolatlanmaydi. Hozir tashqi Google Fonts va asosiy JavaScript chunkini keyingi performance auditida o‘lchash kerak; to‘liq WCAG va production Core Web Vitals sertifikati yo‘q.

## Tekshirilgan rasmiy asoslar

- [Google: JavaScript SEO](https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics) — public prerender, canonical va dastlabki noindex xulqi.
- [Google: robots.txt chegaralari](https://developers.google.com/search/docs/crawling-indexing/robots/intro) — robots maxfiylik yoki autentifikatsiya vositasi emas.
- [Google: sitemap yaratish](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap) — canonical public URLlar.
- [Google: structured data siyosati](https://developers.google.com/search/docs/appearance/structured-data/sd-policies) — ko‘rinadigan haqiqiy mazmunga mos belgilash.

Rasmiy hujjatlar ushbu o‘zgartirish davomida tekshirildi. Indeksga kiritish va rich resultni yakuniy qidiruv tizimi hal qiladi.
