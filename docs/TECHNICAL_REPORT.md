# Texnik hisobot

## Maqsad va arxitektura

TZdagi mobilga mos teri kuzatuvi oqimi foydalanuvchi tanlagan React + NestJS stackida amalga oshirildi. ML alohida Python servis bo‘lib, faqat backend orqali service token bilan chaqiriladi. Asl TZ va master prompt o‘zgartirilmadi. Talablarning amaldagi qamrovi [TRACEABILITY](TRACEABILITY.md)da.

Frontend sahifalarni lazy-load qiladi, access tokenni xotirada saqlaydi, React Query cache’ini logout/o‘chirishda tozalaydi. Tibbiy ma’lumot IndexedDB/localStoragega yozilmaydi. Service worker API va tibbiy fayllarni cache qilmaydi; offline sahifa lokal inference va’da qilmaydi.

Backend DTO validatsiyasi, owner tekshiruvi, allowed-origin nazorati va per-IP rate limitni qo‘llaydi. Argon2 parol hash, refresh hash/rotation/reuse nazorati bor. Reset token bir marta ishlatiladi. Lokal xat Mailpitga yuboriladi; tashqi pochta provayderi sozlanmagan.

## Surat va tahlil yaxlitligi

Surat serverda dekodlanadi, format/piksel/hajm tekshiriladi, orientatsiya tuzatiladi va metadata olib tashlanadi. Private saqlashdagi aynan shu bytes SHA256 bilan bog‘lanadi. Qo‘lda ROI haqiqiy model maskasi deb ko‘rsatilmaydi. Quality fokusi va ekspozitsiya o‘lchovlari klinik tasniflashdan ajratiladi.

Submission uchun idempotency key/body hash saqlanadi. Mutatsiyalar va submit DB row lock bilan seriallanadi. Ishga tushgan tahlilga tegishli surat/simptom/ROI o‘zgarmaydi. Worker consent, TTL, deletion va input revision/hashni qayta tekshiradi. Qo‘shimcha suratlar bo‘lsa asosiy surat ochiq tanlanadi; hisoblanmagan multi-image confidence birlashtirilmaydi.

## AI rejimlari

Local adapter trusted artifact checksum, manifest, preprocessing, label mapping va calibration/evaluationni talab qiladi. Uning olti sinfli weights fayli hozir mavjud emas. PyTorch trening/split/evaluation/export skriptlari kelgusi model ishiga tayyorlangan, real trening bajarilmagan.

OpenAI adapteri alohida tashqi AI roziligi bilan umumiy kuzatuv beradi. Faqat sanitizatsiya qilingan surat va enumlardan iborat simptom konteksti yuboriladi; identifikatorlar va erkin izohlar yuborilmaydi. Strict structured output/store:false ishlatiladi. Javobdagi probability va risk klinik natija sifatida qabul qilinmaydi: score=null, risk=NOT_ASSESSED; noaniq yoki domain mos kelmaydigan outcome. Bu yopiq model olti sinfli ochiq model talabi o‘rnini bosmaydi.

## Maxfiylik va o‘chirish

History roziligisiz tahlil tarix ro‘yxatiga kirmaydi; yaratilgan paytdan boshlab 60 daqiqalik kirish muddati bor. Muddati tugagan yoki o‘chirish so‘ralgan ma’lumotga kirish darhol yopiladi, fizik tozalash worker orqali bajariladi. Hech qachon tarixga saqlanmagan bo‘sh case ham TTL cleanupga kiradi. Saqlangan boshqa tahlilga ega case saqlanadi.

Tombstone va deletion receipt orqali storage/DB/navbat tozalash kuzatiladi. Worker tugayotganida ham o‘chirilgan tahlil natijasini qayta tiklay olmaydi. Client yuklab olgan PDF nusxasi server nazoratidan tashqarida. Lokal backup yaratilmaydi; production backup retention konfiguratsiyasi va restore auditi deploymentdan oldin tekshirilishi kerak.

## Natija va chegaralar

Real PostgreSQL/API/FastAPI/OpenAI/PDF oqimi synthetic, tibbiy bo‘lmagan surat bilan bajarildi. Bu ulanish dalili; klinik validatsiya dalili emas. Release uchun ekspert ko‘rigi, mo‘ljallangan kamera domenidagi dataset, sinflar/subguruhlar bo‘yicha mustaqil evaluation, real Docker/Redis/S3/TLS sinovi va yuklama/backup sinovi qoladi. To‘liq dalillar [TEST_REPORT](TEST_REPORT.md)da.
