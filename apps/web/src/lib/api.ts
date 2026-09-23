import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { QueryClient } from '@tanstack/react-query';
import type { User } from './types';

export const queryClient = new QueryClient({ defaultOptions: { queries: { staleTime: 20_000, retry: (count, err) => count < 1 && !(axios.isAxiosError(err) && [401, 403, 404].includes(err.response?.status ?? 0)), refetchOnWindowFocus: false }, mutations: { retry: false } } });
export const keys = { me: ['me'] as const, cases: ['cases'] as const, analyses: ['analyses'] as const, analysis: (id: string) => ['analysis', id] as const, case: (id: string) => ['case', id] as const, capabilities: ['capabilities'] as const };
let accessToken: string | null = null;
let refreshFlight: Promise<{ user: User; accessToken: string }> | null = null;
export const api = axios.create({ baseURL: '/api/v1', timeout: 30_000, withCredentials: true });
const sessionApi = axios.create({ baseURL: '/api/v1', timeout: 15_000, withCredentials: true });
export function setToken(token: string | null) { accessToken = token; }
export async function refreshSession() {
  if (!refreshFlight) refreshFlight = sessionApi.post<{ user: User; accessToken: string }>('/auth/refresh').then(({ data }) => { setToken(data.accessToken); return data; }).finally(() => { refreshFlight = null; });
  return refreshFlight;
}
api.interceptors.request.use(config => { if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`; config.headers['X-Request-Id'] = crypto.randomUUID(); return config; });
api.interceptors.response.use(response => response, async (error: AxiosError) => {
  const config = error.config as (InternalAxiosRequestConfig & { retried?: boolean }) | undefined;
  if (error.response?.status === 401 && config && !config.retried && !config.url?.startsWith('/auth/')) {
    config.retried = true;
    try { await refreshSession(); return await api(config); } catch { setToken(null); queryClient.clear(); window.dispatchEvent(new Event('session-expired')); }
  }
  return Promise.reject(error);
});
export function errorText(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const code = error.response?.data?.error?.code;
    const labels: Record<string, string> = { MODEL_NOT_READY: 'Tahlil modeli hali ulanmagan. Hozir kasallik natijasini hisoblab bo‘lmaydi.', UNSUPPORTED_DOMAIN: 'Ushbu surat turi modelning qo‘llanish doirasiga kirmaydi.', EMAIL_NOT_CONFIGURED: 'Email xizmati hali sozlanmagan. Parolni tiklash vaqtincha mavjud emas.', NETWORK_ERROR: 'Server bilan aloqa o‘rnatilmadi.', INVALID_CREDENTIALS: 'Email yoki parol noto‘g‘ri.', CONSENT_REQUIRED: 'Avval qayta ishlashga rozilik bering.' };
    if (code && labels[code]) return labels[code];
    const message = error.response?.data?.error?.message ?? error.response?.data?.message;
    if (typeof message === 'string') return message;
    if (error.code === 'ECONNABORTED') return 'So‘rov vaqti tugadi. Internetni tekshirib, yana urinib ko‘ring.';
    if (!error.response) return 'Server bilan aloqa yo‘q. Internet va servis holatini tekshiring.';
  }
  return error instanceof Error ? error.message : 'Amal bajarilmadi. Yana urinib ko‘ring.';
}
export async function download(path: string, fileName: string, method: 'get' | 'post' = 'get') {
  const { data } = await api.request<Blob>({ method, url: path, responseType: 'blob' });
  const url = URL.createObjectURL(data); const anchor = document.createElement('a'); anchor.href = url; anchor.download = fileName; anchor.click(); setTimeout(() => URL.revokeObjectURL(url), 1_000);
}
export async function invalidateMedical() { await Promise.all([queryClient.invalidateQueries({ queryKey: keys.analyses }), queryClient.invalidateQueries({ queryKey: keys.cases }), queryClient.invalidateQueries({ queryKey: ['case'] }), queryClient.invalidateQueries({ queryKey: ['analysis'] })]); }
