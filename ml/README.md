# Ochiq model bilan tadqiqot pipeline’i

Bu papkada haqiqiy patient rasmlari yoki klinik model weights yo‘q. Dataset/weights va ulardan foydalanish huquqi bo‘lmasa full AI gate BLOCKED. ImageNet EfficientNet-B0 backbone’ni olish dermatologiya modelini olish bilan teng emas.

`data/manifest.template.csv`ni tegishli ruxsat bilan tayyorlangan ma’lumotlar uchun to‘ldiring. `patient_id` pseudonymous grouping key; kasallik labeli ekspert/manba daliliga tayansin. `license_reviewed=true` faqat huquq va foydalanish maqsadi tekshirilgandan keyin. Patient va exact duplicate leakage avtomatik tekshiriladi; near-duplicate va site leakage uchun qo‘shimcha ekspert audit zarur. Eksportlangan CSV va data Gitga kiritilmasin.

Kerakli optional dependencies: `services/ml/requirements.txt` va `ml/requirements-training.txt`. PyTorch CPU/GPU wheel manbasini rasmiy PyTorch ko‘rsatmasiga mos tanlang. Bu dependencylar ishchi kompyuterga avtomatik yuklanmagan.

Repository rootdan:

```text
python -m ml.data.prepare --input /private/dataset.csv --output /private/split.csv
python -m ml.training.train --manifest /private/split.csv --task classification --output /private/classifier.pt --pretrained
python -m ml.training.train --manifest /private/split.csv --task segmentation --output /private/segmenter.pt --pretrained
python -m ml.export.export --checkpoint /private/classifier.pt --expected-sha256 ACTUAL_SHA256 --output /private/classifier.torchscript
python -m ml.evaluation.evaluate --manifest /private/split.csv --artifact /private/classifier.torchscript --expected-sha256 ACTUAL_SHA256 --output /private/calibration.json --calibrate
python -m ml.evaluation.evaluate --manifest /private/split.csv --artifact /private/classifier.torchscript --expected-sha256 ACTUAL_SHA256 --calibration-report /private/calibration.json --output /private/evaluation.json
python -m ml.evaluation.evaluate --manifest /private/split.csv --artifact /private/segmenter.torchscript --expected-sha256 ACTUAL_SHA256 --task segmentation --output /private/segmentation-evaluation.json
```

Bu commandlarda yo‘llar namunaviy; mavjud bo‘lmagan datasetdan natija yasalmaydi. `--pretrained` faqat rasmiy umumiy ImageNet backbone’ni yuklashga aniq ruxsat beradi. Augmentation train splitida, model tanlash validation loss bilan, calibration validation splitida, yakuniy baholash test splitida. Early stopping/calibration uchun test set ishlatilmaydi.

Trening EfficientNet-B0 classifier yoki DeepLabV3/MobileNetV3 binary segmenter yaratadi. Qo‘llanadigan barcha olti label train/validation/testda mavjud bo‘lishi kerak. Segmentatsiyada haqiqiy, manba surat bilan bir koordinatadagi ekspert maskasi zarur. Resize/normalization inference bilan bir xil. Export natijasi `UNVALIDATED`; operator mustaqil hisobotni ko‘rib chiqmaguncha deployment manifest yaratilmaydi.

Evaluation global/per-class accuracy, macro F1, ROC-AUC, PR average precision, confusion matrix, ECE/Brier, patient-cluster bootstrap accuracy CI, mavjud subgroup metadata va latency beradi. Segmentation evaluator Dice o‘lchaydi. Malignancy head yo‘qligida sensitivity/specificity `null`; SUSPICIOUS_PIGMENTED score malignancy ehtimoliga aylantirilmaydi. Scriptdagi classification PASS to‘liq loyiha AI gate yoki klinik ruxsat emas.

## Local bundle manifest

Schema `services/ml/app/models.py::Manifest`da. Majburiy provenance: sourceUrl, codeLicense, weightsLicense, datasetReferences, reviewStatus=RESEARCH_VALIDATED, intendedUse=RESEARCH_ONLY, pipelineVersion, labels, supportedInputDomains, classifier spec, evaluationReportPath va uning sha256. Classifier spec: path/sha256/format/version/inputSize/mean/std. Model va hisobot yo‘llari manifest papkasi ichida qoladi. Operator hash allowlisti `ML_TRUSTED_ARTIFACT_SHA256` bilan beriladi; SHA256ning o‘zi code execution xavfsizligini isbotlamaydi.

Calibration yoqilsa report/version/temperature/artifact identity mos bo‘lishi zarur. Segmenter ulansa alohida held-out evaluation report path/checksum ham majburiy. Hisobot target domainni qoplashi kerak. Ordinary phone/clinical surat qamrovi dermatoskopik benchmark bilan almashtirilmaydi.

Grad-CAM uchun TorchScript classifier `(logits, convolutionalFeatures)` qaytaradi. ONNX eksportga `--onnx /private/model.onnx` qo‘shish mumkin; numerical parity tekshiriladi. ONNXni browser edge runtime’da tekshirish hali bajarilmagan va offline AI gate BLOCKED.
