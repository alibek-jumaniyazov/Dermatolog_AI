"""Explicit live-provider smoke. Sends one synthetic checkerboard, never a patient image."""
import json
import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path('services/ml').resolve()))
import cv2
import numpy as np
from fastapi.testclient import TestClient
from app.main import app

if os.environ.get('AI_PROVIDER') != 'openai':
    raise SystemExit('This explicit smoke requires the OpenAI provider.')
image = np.full((512, 512, 3), 190, np.uint8)
for y in range(0, 512, 32):
    for x in range(0, 512, 32):
        if (x // 32 + y // 32) % 2:
            image[y:y+32, x:x+32] = (70, 170, 210)
cv2.putText(image, 'SYNTHETIC TEST', (38, 262), cv2.FONT_HERSHEY_SIMPLEX, 1.4, (25, 25, 25), 3)
payload = cv2.imencode('.png', image)[1].tobytes()
with TestClient(app) as client:
    response = client.post('/infer', headers={'X-Service-Token': os.environ['ML_SERVICE_TOKEN']}, files={'image': ('synthetic.png', payload, 'image/png')}, data={'external_consent': 'true'})
    result = response.json()
    if response.status_code != 200:
        print(json.dumps({'httpStatus':response.status_code, 'errorCode': result.get('error',{}).get('code')}, ensure_ascii=True))
        raise SystemExit(1)
    assert result.get('malignantProbability') is None
    assert result.get('riskLevel') == 'NOT_ASSESSED'
    assert result.get('segmentation', {}).get('available') is False
    assert all(p['score'] is None for p in result.get('predictions', []))
    evidence={'httpStatus':response.status_code,'outcome':result.get('outcome'),'domainStatus':result.get('domainStatus'),'provider':result.get('provider'),'riskLevel':result.get('riskLevel'),'numericScoresInvented':False,'input':'generated checkerboard with SYNTHETIC TEST text; no medical or personal data'}
    Path('.data/evidence').mkdir(parents=True,exist_ok=True)
    Path('.data/evidence/live-ai-smoke.json').write_text(json.dumps(evidence,ensure_ascii=False,indent=2),encoding='utf-8')
    print(json.dumps(evidence, ensure_ascii=True))
