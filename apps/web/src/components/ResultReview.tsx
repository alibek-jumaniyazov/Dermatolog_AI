import { Alert, Progress } from 'antd';
import { CameraOutlined, CheckOutlined, QuestionCircleOutlined, SearchOutlined } from '@ant-design/icons';
import { diseaseNames, uncertaintyMessages, uncertaintyText } from '../lib/text';
import type { Differential, Result } from '../lib/types';
import { DemoBadge, Status } from './Common';

function Evidence({ item }: { item: Differential }) {
  const uncertainties = uncertaintyMessages(item.uncertainties);
  return <>
    {!!item.supportingFeatures.length && <div className="differential-evidence">
      <h4>Bu taxminga mos ko‘ringan belgilar</h4>
      <ul>{item.supportingFeatures.map((feature, i) => <li key={i}><CheckOutlined/><span>{feature}</span></li>)}</ul>
    </div>}
    {!!uncertainties.length && <div className="differential-uncertainties">
      <h4>Tasdiqlash uchun nima yetishmaydi?</h4>
      <ul>{uncertainties.map((value, i) => <li key={i}>{value}</li>)}</ul>
    </div>}
  </>;
}

export default function ResultReview({ result, isDemo = false }: { result: Result; isDemo?: boolean }) {
  const external = typeof result.provider === 'object' ? result.provider.name === 'openai' : result.provider === 'openai';
  const visualReview = result.analysisMode === 'VISUAL_DIFFERENTIAL' || !!result.differential?.length;
  const differential = result.differential ?? [];
  const unsuitable = result.imageAssessment && (!result.imageAssessment.skinVisible || !result.imageAssessment.imageSuitable);
  const [leading, ...alternatives] = unsuitable ? [] : differential;
  const reasons = uncertaintyMessages(result.uncertaintyReasons);
  const limitations = uncertaintyMessages(result.limitations);
  const nextSteps = result.nextSteps?.filter(step => step.trim()) ?? [];
  const questions = result.followUpQuestions?.filter(question => question.trim()) ?? [];

  return <>
    <div className="surface ai-review">
      <div className="section-heading">
        <h2>{isDemo ? 'Demo kuzatuv natijasi' : visualReview ? 'Surat bo‘yicha AI tahlili' : external ? 'AI kuzatuvi' : 'Tahlil natijasi'}</h2>
        {isDemo ? <DemoBadge/> : external && <span className="provider-badge">OpenAI</span>}
      </div>
      {result.imageAssessment && <div className={`image-assessment ${unsuitable ? 'image-assessment-warning' : ''}`}>
        <CameraOutlined/>
        <div><strong>{unsuitable ? 'Suratni yaxshilash kerak' : 'Surat vizual ko‘rib chiqildi'}</strong><p>{uncertaintyText(result.imageAssessment.reason)}</p></div>
      </div>}
      {result.summary && <p className="result-summary">{result.summary}</p>}
      {leading && <section className="differential-primary" aria-label="Asosiy ehtimoliy holat">
        <div className="differential-kicker"><SearchOutlined/>{isDemo ? 'NAMUNA SIFATIDAGI EHTIMOL' : 'SURATGA KO‘RA ASOSIY EHTIMOL'}</div>
        <h3>{leading.condition}</h3>
        <p className="differential-context">Bu — ko‘rinayotgan belgilar asosidagi taxmin. Yakuniy tashxis uchun dermatolog ko‘rigi kerak.</p>
        <Evidence item={leading}/>
      </section>}
      {!!alternatives.length && <section className="differential-alternatives" aria-label="Boshqa ehtimoliy holatlar">
        <h3>Yana nimalarga o‘xshashi mumkin?</h3>
        <p className="muted">Ayrim teri holatlari bir-biriga o‘xshab ko‘rinadi. Quyidagi taxminlar ko‘rikda farqlanadi.</p>
        {alternatives.map((item, i) => <details className="differential-alternative" key={`${item.classCode}-${i}`}>
          <summary><span className="alternative-index">{String(i + 2).padStart(2, '0')}</span><span>{item.condition}</span></summary>
          <Evidence item={item}/>
        </details>)}
      </section>}
      {!!result.observations?.length && <section className="visible-observations"><h3>Suratda ko‘ringan belgilar</h3><ul className="observation-list">{result.observations.map((value, i) => <li key={i}>{value}</li>)}</ul></section>}
      {!differential.length && !unsuitable && !!result.predictions.length && <section className="legacy-predictions">
        <h3>{isDemo ? 'Namuna sifatidagi guruhlar' : 'Ehtimoliy guruhlar'}</h3>
        {result.predictions.map(prediction => <div className="prediction" key={prediction.classCode}>
          <div><strong>{diseaseNames[prediction.classCode] ?? prediction.classCode}</strong><span>{isDemo || visualReview || external || prediction.score === null || prediction.scoreType === 'NOT_CALIBRATED' ? 'Ehtimol hisoblanmagan' : `${Math.round(prediction.score * 100)}%`}</span></div>
          {!isDemo && !visualReview && !external && prediction.score !== null && prediction.scoreType !== 'NOT_CALIBRATED' && <Progress percent={Math.round(prediction.score * 100)} showInfo={false} strokeColor="#0f766e"/>}
        </div>)}
      </section>}
      {!isDemo && !visualReview && !external && result.malignantProbability !== null && <p>Modelning kalibrlangan malignlik signali: {(result.malignantProbability * 100).toFixed(1)}%</p>}
      {visualReview ? <div className="review-certainty"><span>Baholash chegarasi</span><p>Kasallik ehtimoli va malignlik xavfi suratdan ishonchli raqamda hisoblanmadi.</p></div> : <div className="mt"><Status value={result.riskLevel}/></div>}
      {!visualReview && !isDemo && external && <p className="muted">Umumiy vizual kuzatuv. Kalibrlangan tibbiy klassifikator natijasi emas.</p>}
      {!!reasons.length && <Alert className="mt uncertainty-alert" type="info" showIcon message="Natijani talqin qilishda" description={<ul>{reasons.map((reason, i) => <li key={i}>{reason}</li>)}</ul>}/>}
    </div>
    <div className="recommendation-card next-steps-card">
      <span className="eyebrow">KEYINGI QADAM</span>
      <h3>{isDemo ? 'Tavsiya ko‘rinishi — namuna' : 'Endi nima qilish mumkin?'}</h3>
      {nextSteps.length ? <ol>{nextSteps.map((step, i) => <li key={i}>{step}</li>)}</ol> : <p>{result.recommendation}</p>}
    </div>
    {!!limitations.length && <div className="surface conclusion-limits"><h3>Nimani suratdan aniqlab bo‘lmaydi?</h3><ul>{limitations.map((value, i) => <li key={i}>{value}</li>)}</ul></div>}
    {!!questions.length && <div className="surface follow-up-questions"><div className="follow-up-heading"><QuestionCircleOutlined/><h3>Aniqlashtirish uchun savollar</h3></div><p className="muted">Bu ma’lumotlarni keyingi kuzatuvda yoki dermatolog ko‘rigida aytish foydali.</p><ol>{questions.map((question, i) => <li key={i}>{question}</li>)}</ol></div>}
  </>;
}
