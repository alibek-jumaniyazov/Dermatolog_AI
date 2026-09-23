import { useEffect, useState, type ReactNode } from 'react';
import { Alert, Button, Empty, Spin, Tag } from 'antd';
import { ArrowRightOutlined, PlusOutlined, SafetyCertificateOutlined } from '@ant-design/icons';
import { Link } from 'react-router-dom';
import { api, errorText } from '../lib/api';
import { disclaimer, statusText } from '../lib/text';

export function Brand({ light = false }: { light?: boolean }) { return <Link to="/" className={`brand ${light ? 'brand-light' : ''}`}><span className="brand-mark">✳</span><span>Raqamli<span className="brand-second">Dermatolog</span></span></Link>; }
export function PageHeader({ eyebrow, title, description, action }: { eyebrow?: string; title: string; description?: string; action?: ReactNode }) { return <header className="page-heading"><div>{eyebrow && <div className="eyebrow">{eyebrow}</div>}<h1>{title}</h1>{description && <p>{description}</p>}</div>{action}</header>; }
export function Status({ value }: { value: string }) { const color = ['FINISHED', 'COMPLETED', 'PASS', 'READY', 'LOW'].includes(value) ? 'green' : ['FAILED', 'REJECT', 'HIGH'].includes(value) ? 'red' : ['RUNNING', 'QUEUED', 'OBSERVATIONS_READY'].includes(value) ? 'blue' : 'gold'; return <Tag color={color}>{statusText[value] ?? value}</Tag>; }
export function MedicalNotice() { return <div className="medical-note"><SafetyCertificateOutlined/><span>{disclaimer}</span></div>; }
export function DemoBadge() { return <span className="demo-badge">DEMO</span>; }
export function DemoNotice({ account = false }: { account?: boolean }) { return <div className={`demo-notice ${account ? 'demo-account-notice' : ''}`} role="note"><DemoBadge/><div><strong>{account ? 'Umumiy lokal demo hisobi' : 'Namuna kuzatuv'}</strong><p>{account ? 'Uydirma ma’lumotlar bilan tanishing. Namuna natijalar tibbiy xulosa emas. Haqiqiy shaxsiy ma’lumot uchun alohida hisob yarating.' : 'Bu kuzatuv namuna uchun yaratilgan. Tasvirlar illustratsiya; ma’lumotlar tibbiy yoki haqiqiy AI natijasi emas.'}</p></div></div>; }
export function Failure({ error, retry }: { error: unknown; retry?: () => void }) { return <Alert type="error" showIcon message="Ma’lumotni olishda muammo" description={errorText(error)} action={retry ? <Button onClick={retry}>Qayta urinish</Button> : undefined}/>; }
export function Loading() { return <div className="loading"><Spin size="large"/><span>Yuklanmoqda…</span></div>; }
export function EmptyAnalyses() { return <div className="empty-state"><Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={<><h3>Kuzatuvingiz shu yerdan boshlanadi</h3><p>Hali saqlangan tahlilingiz yo‘q. Birinchi suratni yuklab,<br/> teringizdagi o‘zgarishni kuzatishni boshlang.</p></>}/><Link to="/app/analyses/new"><Button type="primary" icon={<PlusOutlined/>}>Birinchi tahlilni boshlash</Button></Link></div>; }
export function AssetImage({ id, alt, className, onLoad }: { id: string; alt: string; className?: string; onLoad?: () => void }) {
  const [src, setSrc] = useState(''); const [error, setError] = useState(false);
  useEffect(() => { let active = true; let url: string | undefined; const abort = new AbortController(); setSrc(''); setError(false); api.get<Blob>(`/assets/${id}/content`, { responseType: 'blob', signal: abort.signal }).then(({ data }) => { if (active) { url = URL.createObjectURL(data); setSrc(url); } }).catch(() => { if (active) setError(true); }); return () => { active = false; abort.abort(); if (url) URL.revokeObjectURL(url); }; }, [id]);
  if (error) return <div className="image-placeholder">Surat ochilmadi</div>;
  if (!src) return <div className="image-placeholder"><Spin/></div>;
  return <img className={className} src={src} alt={alt} onLoad={onLoad}/>;
}
export function ArrowLink({ to, children }: { to: string; children: ReactNode }) { return <Link className="arrow-link" to={to}>{children}<ArrowRightOutlined/></Link>; }
