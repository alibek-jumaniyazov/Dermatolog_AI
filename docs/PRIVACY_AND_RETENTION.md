# Maxfiylik va saqlash

Har tahlilga alohida processing, history, research va tashqi AI roziligi yoziladi. Research default o‘chiq; foydalanuvchi suratlari avtomatik treningga qo‘shilmaydi. OpenAI’ga uzatish alohida tasdiqsiz bajarilmaydi.

History roziligi yo‘q tahlil draft yaratilgandan 60 daqiqagacha ko‘riladi, tarixga kirmaydi. Muddat tugashi kirishni yopadi va cleanupni boshlaydi. History tanlansa o‘chirilguncha saqlanadi. O‘chirish so‘rovi kirishni darhol yopadi; aktiv nusxalar 24 soatlik texnik maqsad ichida tozalanishi uchun worker ishlashi zarur. Uning xatolari admin monitoringda ko‘riladi.

Lokal defaultda avtomatik backup yoqilmagan. Serverda backup qo‘shilsa 30 kundan oshmaydigan retention, vaqtinchalik objectlarni backupdan chiqarish va restore oldidan deletion/expiry tekshiruvi sozlanishi kerak. Bu sozlanmagan muhit uchun bajarilgan kafolat sifatida ko‘rsatilmaydi.

OpenAI so‘rovlarida `store:false`. Bu OpenAI data controls’dagi alohida log/retention siyosatlarini bekor qilmaydi; [provayder shartlari](https://developers.openai.com/api/docs/guides/your-data)ni hisobga olish zarur. Foydalanuvchi yuklab olgan hisobot uning qurilmasidan masofadan o‘chirilmaydi.

EXIF/GPS olib tashlanadi. Bu rasm to‘liq anonim degani emas. Medical API va assetlar no-store, service worker faqat app shellni cache qiladi. Default analytics yoki patient payload loglash yo‘q.
