import { useQuery } from '@tanstack/react-query';
import { Alert, Button } from 'antd';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { api } from '../lib/api';
import { Failure, Loading, PageHeader } from '../components/Common';
export default function Admin() {
  const { user } = useAuth(); const allowed = user?.role === 'ADMIN';
  const system = useQuery({ queryKey: ['admin', 'system'], enabled: allowed, queryFn: ({ signal }) => api.get<Record<string, unknown>>('/admin/system', { signal }).then(r => r.data) });
  const models = useQuery({ queryKey: ['admin', 'models'], enabled: allowed, queryFn: ({ signal }) => api.get<Record<string, unknown>>('/admin/models', { signal }).then(r => r.data) });
  if (!allowed) return <Navigate to="/app" replace/>;
  return <><PageHeader eyebrow="TEXNIK BOSHQARUV" title="Servis holati" description="Texnik holat va model imkoniyatlari. Bemor suratlari bu sahifada ko‘rsatilmaydi." action={<Button onClick={() => { void system.refetch(); void models.refetch(); }}>Yangilash</Button>}/><Alert className="mb" type="info" showIcon message="Texnik administrator" description="Bu rol bemorlarning shaxsiy tibbiy ma’lumotlariga umumiy kirish bermaydi."/><div className="admin-grid">{[{ title: 'Infratuzilma', query: system }, { title: 'Model va AI imkoniyatlari', query: models }].map(section => <section className="surface" key={section.title}><h2>{section.title}</h2>{section.query.isPending ? <Loading/> : section.query.isError ? <Failure error={section.query.error}/> : <pre className="technical-data">{JSON.stringify(section.query.data, null, 2)}</pre>}</section>)}</div></>;
}
