# Dataset holati

Haqiqiy dermatologiya training/test dataset bu repositoryga berilmagan va patient data yuklab olinmagan. Runtime foydalanuvchi suratlari avtomatik trening datasetiga ko‘chirilmaydi. Synthetic test rasmlari faqat decoding, texnik quality va wire/privacy xatti-harakatini tekshiradi; klinik accuracyga dalil emas.

TZ olti guruhni talab qiladi: shubhali pigmentli o‘zgarish, nevus, ekzema/dermatit, psoriaz, akne, zamburug‘li infeksiya. ISIC 2018 disease taskida boshqa yetti lesion klassi va dermatoskopik input bor. Shuning uchun uni nomlarini almashtirish orqali olti guruhli oddiy kamera modeli sifatida ko‘rsatish mumkin emas. [ISIC rasmiy task](https://challenge.isic-archive.com/landing/2018/47/).

ISIC dataset/image litsenziyalari bir xil emas; CC-BY-NC, CC-BY va CC-0 kabi shartlar alohida collectionda ko‘rsatiladi. Commercial va redistribution foydalanish, attribution, image huquqi va weights huquqi alohida ko‘rib chiqilsin. [ISIC dataset/litsenziya sahifasi](https://challenge.isic-archive.com/data/).

`ml/data/manifest.template.csv` provenance va grouping schema beradi. Har yozuv source URL, license, explicit license review, sha256, patient grouping, label va domainni talab qiladi. Lesion id, mask, skin-tone, age-group, kamera/site metadata mavjud bo‘lsa qayd etiladi; yo‘q ma’lumot uydirilmaydi. Split 70/15/15 patient groups bo‘yicha, class support tekshiruvi bilan. Exact duplicate/patient leakage rad etiladi. Near-duplicate va site leakage uchun qo‘shimcha audit ochiq talab bo‘lib qoladi.

Ochiq ilmiy dataset yoki trained model topilgan taqdirda ham uning mavjudligi mustaqil baholash, ruxsat va intended-use mosligini almashtirmaydi. Hozir mos olti guruhli klinik classification + segmentation bundle tasdiqlanmagan; dataset/training/held-out validation gate BLOCKED.
