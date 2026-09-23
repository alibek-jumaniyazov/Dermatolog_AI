# ML baholash holati

Haqiqiy klinik trained artifact va tegishli dataset mavjud emas. Quyidagi sonlar o‘lchov emas; TZ maqsadlari. Haqiqiy qiymatlar ataylab bo‘sh qoldirilgan.

| Metrika | TZ maqsadi | Haqiqiy qiymat |
|---|---|---|
| Accuracy | ≥0.85 | O‘lchanmagan |
| Malignant sensitivity | ≥0.90 | O‘lchanmagan; malignant head yo‘q |
| Specificity | ≥0.80 | O‘lchanmagan |
| Macro-F1 | ≥0.80 | O‘lchanmagan |
| ROC-AUC / PR-AUC | ≥0.85 | O‘lchanmagan |
| Segmentation Dice | ≥0.85 | O‘lchanmagan |
| Klinik model inference | ≤3s | O‘lchanmagan |

OpenAI umumiy vision review shu metrikalarni qoplamaydi. Null score va NOT_ASSESSED risk server tomonidan majburiy. External HTTP javob vaqti klinik model latency acceptance o‘rnini bosmaydi. Synthetic live check faqat API ulanish/input/schema yo‘lini tekshirishi mumkin, tibbiy to‘g‘rilikni emas.

Mahalliy bajarilgan tekshiruv: `services/ml/.venv/Scripts/python.exe -m pytest services/ml/tests -q` — **48 passed**, 2 upstream TestClient deprecation warning. Qamrov: haqiqiy OpenCV fokus/yorug‘lik o‘lchovi, kam teksturali/blur surat uchun WARN, bir xil rangli/extreme exposure surat uchun REJECT, MIME/corrupt/size/pixel minimum, streamed payload limit, service auth, no-model fail-closed, external consent before outbound, valid/invalid ROI, haqiqiy kesma piksellari, allowlisted simptom konteksti, mock OpenAI strict schema/store=false/nullable scores, differential/no-data/unsuitable/OTHER natijalari, refusal va incomplete response. Avtomatik unit/component testlar haqiqiy tibbiy surat yoki network model chaqiruvi ishlatmaydi.

`compileall` va data/train/evaluation/export CLI `--help` tekshirildi. Optional PyTorch training va real artifact inference hali bajarilmagan: katta runtime yoki dataset soxta qulaylik uchun yuklanmagan. Bu skriptlar bajarilgan training/evaluation o‘rnini bosmaydi.

Kelajakdagi real baholash `ml/evaluation/evaluate.py` orqali: artifact checksum, held-out test split, preprocessing parity, barcha olti sinf supporti, confusion/per-class metrikalar, ECE/Brier, mavjud subgroup kesimlari, patient-cluster bootstrap accuracy CI, abstention coverage va warm CPU p50/p95/max latency. Segmentation Dice faqat haqiqiy maskali tasvirda o‘lchanadi. Calibration faqat validationda; test setiga qarab threshold tanlanmaydi. Malignancy target ta’rifi yo‘q bo‘lsa malignant sensitivity/specificity chiqarilmaydi.

Gate: quality texnik component testlari PASS; to‘liq quality model, olti sinfli AI, avtomatik segmentatsiya, kalibrlangan risk, offline inference va klinik validation **BLOCKED**. `python -m ml.check` shu sababli nonzero qaytarishi kutiladi.

Root tomonidan haqiqiy OpenAI Responses API bilan synthetic checkerboard smoke bajarildi: HTTP 200, model gpt-4o-mini, outcome UNSUPPORTED_DOMAIN, risk NOT_ASSESSED, raqamli score yasalmadi. Dalil: `.data/evidence/live-ai-smoke.json`. Ushbu tekshiruv network/schema integratsiyasiga tegishli; klinik accuracy yoki kasallik qamroviga dalil emas.
