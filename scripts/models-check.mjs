import './env.mjs';
const response = await fetch(`${process.env.ML_SERVICE_URL}/capabilities`, { headers: { 'X-Service-Token': process.env.ML_SERVICE_TOKEN || '' }, signal: AbortSignal.timeout(5000) });
if (!response.ok) throw new Error(`ML capability HTTP ${response.status}`);
const capabilities = await response.json();
console.log(JSON.stringify(capabilities, null, 2));
if (process.argv.includes('--require-ready')) {
  const details = capabilities.details || {};
  const checks = {
    classification: capabilities.classification === true,
    segmentation: capabilities.segmentation === true,
    completeQualityAssessment: details.quality?.assessmentComplete === true,
    calibratedDiseaseOutput: capabilities.calibration === true || details.inference?.calibrationStatus === 'CALIBRATED',
    validatedMalignancyOutput: details.malignancy?.available === true,
  };
  const blocked = Object.entries(checks).filter(([, passed]) => !passed).map(([name]) => name);
  if (blocked.length) {
    console.error(`Full research AI gate BLOCKED: ${blocked.join(', ')}. General-purpose AI observations do not satisfy these checks.`);
    process.exitCode = 1;
  }
}
