import { renderToStaticMarkup } from 'react-dom/server';
import { StaticRouter } from 'react-router-dom';
import { AuthProvider } from '../lib/auth';
import Landing from '../pages/Landing';
import Policy from '../pages/Policy';
import { publicPath } from './config';
export { publicPages, renderSeoHead, robotsText, sitemapXml, seoConfig } from './config';

/** Build-time rendering only: no effects, sessions, user data or API calls are executed. */
export function renderPublicPage(pathname: string): string {
  if (!publicPath(pathname)) throw new Error('Only public pages may be prerendered');
  return renderToStaticMarkup(<StaticRouter location={pathname}><AuthProvider>{pathname === '/' ? <Landing/> : <Policy/>}</AuthProvider></StaticRouter>);
}

export function renderNotFound(): string {
  return '<main class="static-not-found"><h1>Sahifa topilmadi</h1><p>Manzil o‘zgargan yoki sahifa mavjud emas.</p><a class="public-button primary" href="/">Bosh sahifaga</a></main>';
}
