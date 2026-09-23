import '@ant-design/v5-patch-for-react-19';
import React, { Suspense, lazy } from 'react';
import ReactDOM from 'react-dom/client';
import { App, Button, ConfigProvider, Result } from 'antd';
import { QueryClientProvider } from '@tanstack/react-query';
import { createBrowserRouter, Link, RouterProvider, useRouteError } from 'react-router-dom';
import { queryClient } from './lib/api';
import { AuthProvider } from './lib/auth';
import { Loading } from './components/Common';
import './styles.css';

const Shell = lazy(() => import('./components/Shell'));
const Landing = lazy(() => import('./pages/Landing'));
const Auth = lazy(() => import('./pages/Auth'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const NewAnalysis = lazy(() => import('./pages/NewAnalysis'));
const Analysis = lazy(() => import('./pages/Analysis'));
const History = lazy(() => import('./pages/History'));
const Case = lazy(() => import('./pages/Case'));
const Settings = lazy(() => import('./pages/Settings'));
const Policy = lazy(() => import('./pages/Policy'));
const Admin = lazy(() => import('./pages/Admin'));
function RouteError() { const error = useRouteError(); console.error('Route rendering failed', error instanceof Error ? error.name : 'Unknown'); return <Result status="error" title="Sahifani ochib bo‘lmadi" subTitle="Sahifani yangilang yoki bosh sahifaga qayting." extra={<Button type="primary" onClick={() => window.location.assign('/')}>Bosh sahifaga</Button>}/>; }
const wrap = (element: React.ReactNode) => <Suspense fallback={<Loading/>}>{element}</Suspense>;
const router = createBrowserRouter([{ path: '/', element: wrap(<Landing/>), errorElement: <RouteError/> }, ...['/login', '/register', '/forgot-password', '/reset-password'].map(path => ({ path, element: wrap(<Auth/>), errorElement: <RouteError/> })), ...['/privacy', '/consent', '/limitations'].map(path => ({ path, element: wrap(<Policy/>), errorElement: <RouteError/> })), { element: wrap(<Shell/>), errorElement: <RouteError/>, children: [{ path: '/app', element: wrap(<Dashboard/>) }, { path: '/app/analyses/new', element: wrap(<NewAnalysis/>) }, { path: '/app/analyses/:id', element: wrap(<Analysis/>) }, { path: '/app/history', element: wrap(<History/>) }, { path: '/app/cases/:id', element: wrap(<Case/>) }, { path: '/app/cases/:id/compare', element: wrap(<Case/>) }, { path: '/app/settings', element: wrap(<Settings/>) }, { path: '/admin', element: wrap(<Admin/>) }] }, { path: '*', element: <Result status="404" title="Sahifa topilmadi" subTitle="Manzil o‘zgargan yoki sahifa mavjud emas." extra={<Link to="/"><Button type="primary">Bosh sahifaga</Button></Link>}/> }]);
ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><ConfigProvider theme={{ token: { colorPrimary: '#0f766e', colorInfo: '#0f766e', colorSuccess: '#427647', colorWarning: '#ae7226', colorError: '#b54842', colorText: '#193a35', colorTextSecondary: '#70817b', colorBorder: '#dbe4dc', borderRadius: 10, fontFamily: 'Inter, "Segoe UI", system-ui, sans-serif', controlHeight: 42, fontSize: 14 }, components: { Button: { primaryShadow: 'none', fontWeight: 600 }, Input: { activeShadow: '0 0 0 3px rgba(15,118,110,.08)' }, Tabs: { itemSelectedColor: '#0f766e' } } }}><App><QueryClientProvider client={queryClient}><AuthProvider><RouterProvider router={router}/></AuthProvider></QueryClientProvider></App></ConfigProvider></React.StrictMode>);
if (import.meta.env.PROD && 'serviceWorker' in navigator) window.addEventListener('load', () => { void navigator.serviceWorker.register('/sw.js').catch(() => { /* Offline help is optional if registration is unavailable. */ }); });
