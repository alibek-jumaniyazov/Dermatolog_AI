# Model holati va cheklovlari

Mahsulot hozir dastlabki tadqiqot prototipi. Ikki provider qat’iy ajratilgan; ular orasida yashirin fallback yo‘q.

| Qism | Haqiqiy holat |
|---|---|
| OpenCV blur/exposure | Haqiqiy o‘lchov; klinik validation yo‘q |
| Skin/lesion visibility, distance, occlusion | NOT_ASSESSED; maxsus model ulanmagan |
| OpenAI `gpt-5.6-luna` | Alohida rozilik bilan vizual belgilar, ehtimoliy sabablar va tekshirish qadamlarini qaytaradi; low reasoning |
| Local olti guruhli klinik classifier | Trained artifact/dataset yo‘q, MODEL_NOT_READY |
| Local avtomatik segmentatsiya | Artifact yo‘q; maska yasalmaydi |
| Grad-CAM | Haqiqiy gradient framework mavjud; artifact bo‘lmagani uchun unavailable |
| Calibrated malignancy/risk | Mavjud emas; probability null va risk NOT_ASSESSED |
| Offline/edge inference | Tekshirilgan edge artifact yo‘q |

OpenAI umumiy model; shu olti dermatologiya guruhida klinik tekshirilgan classifier deb taqdim etilmaydi. `openai-visual-review-v2` va `skin-differential-v2` prompti suratga mos eng ko‘pi 3 ta taxmin, ularning ko‘rinadigan dalillari, noaniqliklari, tekshirish qadamlari va aniqlashtiruvchi savollarni qaytaradi. Olti guruhga sig‘magan taxmin `OTHER` bilan ajratiladi. Har hypothesis score=null; raqamli probability, risk, malignancy, segmentation yoki heatmap chiqarilmaydi. Asoslangan taxmin mavjud bo‘lsa `OBSERVATIONS_READY`, bo‘lmasa `UNCERTAIN`; teri surati tafsilotlari yetarli bo‘lmasa `IMAGE_UNSUITABLE`, non-skin bo‘lsa `UNSUPPORTED_DOMAIN`. `OBSERVATIONS_READY` tashxis tasdiqlangani emas. Modelning visibility va differential hukmi ham xato qilishi mumkin.

`opencv-quality-v2`: global Laplacian pastligi tasvir teksturasiga ham bog‘liq, shu sabab faqat WARN. Deyarli bir xil rangli (har RGB kanal bo‘yicha spatial range ≤2), haddan tashqari qorong‘i yoki yorug‘ suratlar REJECT bo‘lib qoladi. Bu qoida klinik sifat modelini almashtirmaydi. WARN yuborishdan oldin foydalanuvchi tasdig‘ini talab qiladi; keyin vision model ko‘rinadigan tafsilotlarni alohida baholaydi.

Tasvirlar high detail bilan, EXIF/GPSsiz qayta encode qilinadi; katta suratlar 2048×2048 chegarasida proporsional kichrayadi. Foydalanuvchi ROI belgilasa va kesma kamida 64×64 bo‘lsa, asl surat bilan birga haqiqiy ROI kesmasi ham yuboriladi. Bu avtomatik segmentatsiya emas. Original fayl nomi va taxmin qilinayotgan tashxis modelga uzatilmaydi.

OpenAI Responses API strict structured output shaklni nazorat qiladi; tibbiy haqiqatni tasdiqlamaydi. Model source closed: API ishlatish open-source clinical model borligini anglatmaydi. Key faqat server secret env’da. `external_consent=true` backend va ML servisda talab qilinadi. Surat qayta encode qilinadi va metadata olib tashlanadi; JPEG pixels va allowlisted duration/YES-NO-UNKNOWN simptom konteksti yuboriladi. Free-form notes, identifikatsiya va o‘lchovlar uzatilmaydi. Request store=false, lekin bu zero data retention kafolati emas. Foydalanuvchi policy’si OpenAI tashqi provayderi va uning data controls’ini tushuntirishi kerak.

Local framework faqat explicitly allowlisted/hash-verified TorchScript/ONNX artifactni qabul qiladi. Hash, label, preprocessing, calibration, evaluation report va domainlar tekshiriladi. TorchScript fayli ishonchsiz manbadan yuklanmaydi. Har pipeline classifier/segmenter/calibration versiyalarini ajratadi. Tegishli model bo‘lmasa soxta natija o‘rniga texnik holat qaytariladi.

Asosiy maqsadli input — oddiy kamera bilan olingan klinik teri surati. Dermatoskopik testdagi ko‘rsatkichlar ushbu input uchun avtomatik dalil emas. Barcha olti guruh va intended-domain bo‘yicha held-out/external evaluation, ekspert review, kalibrlash va farqli skin-tone/camera subgroup audit tugamaguncha AI/clinical gate yopilmaydi.

Rasmiy manbalar:

- [GPT-5.6 Luna model](https://developers.openai.com/api/docs/models/gpt-5.6-luna) — image input, structured outputs va reasoning imkoniyati.
- [Structured outputs](https://developers.openai.com/api/docs/guides/structured-outputs) — strict schema va refusal handling.
- [Images and vision](https://developers.openai.com/api/docs/guides/images-vision) — vizual model cheklovlari; tibbiy maslahat sifatida ishlatilmaydi.
- [OpenAI data controls](https://developers.openai.com/api/docs/guides/your-data) — store=false barcha retention turini yo‘q qilmaydi.
- [Captum Grad-CAM](https://captum.ai/api/layer.html) — model gradient/activation attribution, segmentatsiya ground truth’i emas.
- [Calibration original paper](https://proceedings.mlr.press/v70/guo17a.html) — raw softmax confidence kalibrlangan ehtimol bilan teng emas.
