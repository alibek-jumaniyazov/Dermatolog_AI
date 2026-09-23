# Demo ma’lumotlar va hisoblar

Bu hisoblar lokal development ko‘rgazmasi uchun umumiy sinov hisoblaridir. Ismlar, tarix, simptomlar va yakunlangan natijalar xayoliy ssenariylar; rasmlar kod yordamida chizilgan DEMO belgili sintetik illustratsiyalar. Ular bemor surati, haqiqiy model inference yoki klinik validatsiya emas.

| Hisob | Login | Parol | Maqsad |
|---|---|---|---|
| Aziz Karimov (Demo) | `demo@dermatolog.test` | `Demo2026!Teri` | Asosiy to‘ldirilgan kabinet, tarix, natijalar va taqqoslash |
| Demo Administrator | `admin@dermatolog.test` | `Admin2026!Teri` | Shaxsiy kabinet va texnik servis boshqaruvi |
| Madina Usmonova (Demo) | `madina@dermatolog.test` | `Madina2026!Teri` | Ikkinchi mustaqil foydalanuvchi kabineti |

Kirish: [http://localhost:5173/login](http://localhost:5173/login).

## Seed

Loyiha ildizida, tayyorlangan `.env` va lokal PostgreSQL bilan:

```powershell
pnpm db:start
pnpm db:migrate
pnpm db:seed
```

Server schema o‘zgarganidan keyin API build/restart qilinadi (`pnpm start:local` yoki README’dagi background tartib). Demo rasmlari repository ichida mavjud; ularni qayta chizish uchun `pnpm demo:assets`.

Seed qat’iy IDlardan foydalanadi. Mavjud demo yozuvlarni yangidan nusxalamaydi, tahrirlangan simptom/izoh/tarixni qayta yozmaydi, boshqa foydalanuvchilar ma’lumotlarini o‘chirmaydi. Demo hisob parollari yuqoridagi ma’lum qiymatlarga qayta o‘rnatiladi. Mavjud email boshqa yoki demo bo‘lmagan hisobga tegishli bo‘lsa, seed shu hisobni egallamaydi va xato beradi. O‘chirilgan demo fixturelar seed qayta bajarilganda tiklanishi mumkin; bu development ko‘rgazmasi uchun mo‘ljallangan.

Seed avtomatik production startiga qo‘shilmagan. Production yoki tashqi DB hostida ishlamaydi; demo hisoblar production loginida bloklanadi. O‘zingizning haqiqiy ma’lumotlaringiz uchun alohida shaxsiy hisob yarating.

## To‘ldirilgan oqimlar

- Asosiy hisob: 4 kuzatuv joyida 12 tahlil — 6 yakunlangan, 2 qoralama, 2 bajarilmagan, 2 bekor qilingan.
- Madina: 2 kuzatuv joyida 3 tahlil — 2 yakunlangan, 1 qoralama.
- Administrator: 2 kuzatuv joyida 2 tahlil — 1 yakunlangan, 1 qoralama.
- Bir joydagi turli sanalar taqqoslash va timeline’ni to‘ldiradi. Natijalarni odatdagi private PDF endpointi orqali yuklab olish mumkin; PDF ham DEMO deb belgilanadi.
- Jami 3 hisob, 8 joy, 17 tahlil. Queue’da soxta bajarilayotgan ishlar yaratilmaydi.

Processing/history roziliklari demo fixture uchun belgilanadi; research va externalAI o‘chiq. Seed tashqi AI yoki email xizmatini chaqirmaydi. Texnik rasm sifati lokal OpenCV xizmati mavjud bo‘lsa real o‘lchanadi, mavjud bo‘lmasa tekshirilmagan holatda qoladi. Tibbiy natija, probability va riskga tasdiqlanmagan raqam kiritilmaydi; DEMO belgisi ma’lumot manbasini ajratadi.

Tekshirish: xizmatlar ishlab turganda `pnpm test:demo` va `pnpm test:demo-ui`. Seed takrorlanmasligini tekshirish: birinchi seed’dan so‘ng `pnpm test:demo-seed`. Bu tekshiruvlar demo loginlar, private assetlar, ownership, PDF va taqqoslashni ishlatadi; tashqi AI’ga murojaat qilmaydi. Barcha browser testlarini `pnpm test:e2e` orqali ishlatishdan oldin demo seed ham tayyor bo‘lishi kerak.
