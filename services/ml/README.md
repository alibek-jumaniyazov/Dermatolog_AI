# ML xizmati

NestJS faqat ichki `X-Service-Token` bilan ushbu servisga murojaat qiladi. Tibbiy surat, simptom, API kalit yoki raw upstream javob logga yozilmaydi. Servisda foydalanuvchi ma’lumotlarini doimiy saqlash yo‘q; saqlash va o‘chirish NestJS mas’uliyati.

Windows, repository ildizidan:

```powershell
services/ml/.venv/Scripts/python.exe -m pip install -r services/ml/requirements-dev.txt
services/ml/.venv/Scripts/python.exe -m uvicorn app.main:app --app-dir services/ml --host 127.0.0.1 --port 8001 --no-access-log
services/ml/.venv/Scripts/python.exe -m pytest services/ml/tests -q
```

Root launcher `.env`ni process environmentga yuklaydi. Servis `.env` matnini o‘zi o‘qimaydi yoki nusxalamaydi. Dependency direct pins `requirements.txt`, Windows test muhitining barcha resolved versiyalari `requirements.lock.txt`da. Linux/CI platformaga mos wheel’larni o‘rnatadi. PyTorch/ONNX optional runtime; asosiy quality/OpenAI yo‘li ularni talab qilmaydi.

## Konfiguratsiya

| O‘zgaruvchi | Ma’nosi |
|---|---|
| `ML_SERVICE_TOKEN` | Majburiy private service credential; bo‘sh bo‘lsa protected endpointlar yopiq |
| `AI_PROVIDER` | `local` (default) yoki `openai`; avtomatik fallback yo‘q |
| `OPENAI_API_KEY` | Faqat server secret environment |
| `OPENAI_MODEL` | Default `gpt-5.6-luna`, low reasoning; account/model ruxsati alohida tekshiriladi |
| `ML_MODEL_MANIFEST` | Operator tekshirgan local artifact bundle manifesti |
| `ML_TRUSTED_ARTIFACT_SHA256` | Vergul bilan ajratilgan operator ishonchli deb belgilagan artifact hashlar; checksumning o‘zi ishonchni isbotlamaydi |
| `ML_INFERENCE_TIMEOUT_SECONDS` | Lokal inference javob timeouti, default 30s |

CPU thread inference timeouti underlying native hisobni majburan o‘ldirmaydi. Productionda worker/container memory/CPU limitlari va supervisor restart siyosati kerak. OpenAI HTTP timeout 50s; transport xatolari secret yoki upstream body’ni chiqarmaydi.

## HTTP shartnomasi

`GET /health` va `/health/live`: `{status:"ok",service:"ml"}`. `GET /health/ready`: `{status:"ready",qualityAvailable:true,inferenceAvailable:boolean}`. Quality ishlayotgan holatda model yo‘qligi process readinessni buzmaydi.

Protected `GET /capabilities`: `{provider,classification,segmentation,quality,offlineInference,aiReview,externalAiRequired,modelStatus,classes,message,details}`. OpenAI rejimida `classification:false`, `segmentation:false`; API kaliti configured bo‘lsa `aiReview:true`. Bu API credential hali ishlashini yoki klinik tayyorlikni tasdiqlamaydi. `details.inference.connectivityVerified:false`.

Protected `POST /quality`, multipart `image`: `{decision:"PASS"|"WARN"|"REJECT",assessmentComplete:false,checks:[{code,status,value?,message}],width,height,sha256,methodVersion,clinicalValidation:false}`. `sha256` — servisga kelgan fayl bytes hash’i. Blur/exposure haqiqatan OpenCV bilan hisoblanadi; teri/o‘choq, masofa va to‘silish `NOT_ASSESSED`. PASS faqat texnik tekshiruvga tegishli.

Protected `POST /infer`: multipart `image`; optional `analysisId`, `imageId`, `inputRevision=1`, `inputDomain=clinical`, `symptomsJson={}`, `roiJson=null`, `external_consent=false`. ROI normalized `{x,y,width,height}` ichida 0..1. U foydalanuvchi annotatsiyasi: butun surat tahlil qilinadi, ROI avtomatik maska sifatida ko‘rsatilmaydi. Symptom JSON schema backendda tekshiriladi. OpenAIga faqat duration va YES/NO/UNKNOWN javobli itching/pain/bleeding/changing/asymmetry/border/color self-reported context sifatida uzatiladi; free-form notes, identifikatsiya va o‘lchovlar yuborilmaydi. Model/risk biznes qoidalari backend mas’uliyati.

Common response: `{analysisId,imageId,inputRevision,normalizedImageHash,modelVersion,artifactSha256,pipelineVersion,predictions,malignantProbability,calibrationStatus,qualityDecision,qualityChecks,assessmentComplete,segmentation,attribution,uncertaintyReasons,domainStatus,timing}`.

OpenAI response yana `{outcome,riskLevel,summary,observations,limitations,provider}` beradi. `predictions[].score=null`, `scoreType="NOT_CALIBRATED"`, `malignantProbability=null`, `riskLevel="NOT_ASSESSED"`. Yaroqli teri surati ham `outcome="UNCERTAIN"`; model teri/yaroqlilikni tasdiqlamasa `UNSUPPORTED_DOMAIN` va bo‘sh predictions. General-purpose model tekshiruvi xatosiz emas. Maska/heatmap mavjud emas. Bu descriptive observation, tibbiy tashxis emas.

OpenAI so‘rovi oldidan `external_consent=true` majburiy. Qayta encode qilingan, metadatasiz, uzun tomoni ko‘pi bilan 1024px JPEG rasm va allowlisted enum simptom konteksti yuboriladi. User/case/analysis ID va free-form notes yuborilmaydi. Requests `store:false`, stateless Responses API, strict JSON Schema; yashirin retry va boshqa providerga fallback yo‘q. `store:false` tashqi provayderda zero retention kafolati emas.

Local response: tekshirilgan classifier outputi `UNCALIBRATED_SCORE` yoki `CALIBRATED_PROBABILITY`; nullable malignant probability. Calibration diagnosis aniqligi kafolati emas. Maska faqat haqiqiy segmenter bo‘lsa PNG base64; Grad-CAM faqat classifierning convolutional activations va gradientlaridan olinadi. Backend ushbu artifactlarni private asset sifatida saqlashi va base64ni UI responsega ko‘r-ko‘rona ko‘chirmasligi kerak.

Xatolar: `{error:{code,message}}`. Missing/unverified model `503 MODEL_NOT_READY`; service auth `401`; external consent `403 EXTERNAL_AI_CONSENT_REQUIRED`; input/ROI `422`; image size `413`; MIME `415`; unsupported local domain `422 UNSUPPORTED_DOMAIN`; invalid model output `502`; timeout `504`. Upstream OpenAI auth/limit/errors ham sanitized texnik failure; ular kasallik natijasi emas.

## Tekshirilgan holat

Haqiqiy local dermatologiya weights taqdim etilmagan. `python -m ml.check` kutilgan nonzero bilan AI gate bloklanganligini ko‘rsatadi. Synthetic rasmlar bilan quality, auth, input limits, no-model, consent va mock HTTP schema testlari mavjud. Real bemor suratlari bu testlarda ishlatilmaydi. Training/evaluation/export yo‘llari mavjud, lekin haqiqiy dataset bo‘lmagani sababli ushbu loyiha uchun training/metrikalar bajarildi deb ko‘rsatilmaydi.
