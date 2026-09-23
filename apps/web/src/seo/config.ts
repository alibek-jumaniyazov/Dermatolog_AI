export const siteName = 'Raqamli Dermatolog';
export const publicPages = {
  '/': {
    title: 'Raqamli Dermatolog — teri o‘zgarishlarini kuzatish',
    description: 'Teri suratining sifatini tekshiring, rozilik asosida AI vizual kuzatuvini oling va o‘zgarishlar tarixini saqlang. Dermatolog tashxisini almashtirmaydi.',
  },
  '/privacy': {
    title: 'Maxfiylik siyosati — Raqamli Dermatolog',
    description: 'Suratlar, simptomlar va hisob ma’lumotlari qanday qayta ishlanishi, saqlanishi, eksport qilinishi va o‘chirilishi haqida bilib oling.',
  },
  '/consent': {
    title: 'Rozilik shartlari — Raqamli Dermatolog',
    description: 'Suratni qayta ishlash, kuzatuv tarixini saqlash, tashqi AI va kelajakdagi tadqiqot uchun alohida rozilik shartlari bilan tanishing.',
  },
  '/limitations': {
    title: 'AI kuzatuvining tibbiy cheklovlari — Raqamli Dermatolog',
    description: 'Vizual AI kuzatuvining imkoniyatlari va cheklovlari: surat sifati, noaniqlik, klinik tashxisdan farqi va dermatolog ko‘rigining o‘rni.',
  },
} as const;
export type PublicPath = keyof typeof publicPages;
export type SeoConfig = { origin: string | null; indexable: boolean };

/** A build can never publish localhost, a reserved test domain, or a URL containing credentials. */
export function publicOrigin(value: string | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value.trim());
    const host = url.hostname.toLowerCase();
    const reserved = /(^|\.)(localhost|local|internal|invalid|test|example)$/.test(host)
      || /(^|\.)(example\.(com|net|org)|yourdomain\.[a-z]+|your-domain\.[a-z]+|change-me\.[a-z]+)$/.test(host);
    if (url.protocol !== 'https:' || url.username || url.password || url.port || url.search || url.hash
      || url.pathname !== '/' || !host.includes('.') || /^[\d.]+$/.test(host) || host.includes(':') || reserved) return null;
    return url.origin;
  } catch { return null; }
}

export function resolveSeoConfig(origin: string | undefined, indexing: string | undefined, production: boolean): SeoConfig {
  const validOrigin = publicOrigin(origin);
  return { origin: validOrigin, indexable: production && indexing === 'true' && validOrigin !== null };
}

export const seoConfig = resolveSeoConfig(import.meta.env.VITE_SITE_URL, import.meta.env.VITE_ALLOW_INDEXING, import.meta.env.PROD);

export function publicPath(pathname: string): PublicPath | null {
  const clean = pathname.split(/[?#]/)[0].replace(/\/+$/, '') || '/';
  return Object.hasOwn(publicPages, clean) ? clean as PublicPath : null;
}

const privateTitles: Record<string, string> = {
  '/login': 'Hisobga kirish', '/register': 'Hisob yaratish', '/forgot-password': 'Parolni tiklash',
  '/reset-password': 'Yangi parol', '/app': 'Shaxsiy kabinet', '/app/history': 'Kuzatuv tarixi',
  '/app/settings': 'Hisob sozlamalari', '/app/analyses/new': 'Yangi kuzatuv', '/admin': 'Boshqaruv',
};

export function pageMetadata(pathname: string, config: SeoConfig) {
  const path = publicPath(pathname);
  const cleanPath = pathname.split(/[?#]/)[0].replace(/\/+$/, '') || '/';
  const accountRoute = Object.hasOwn(privateTitles, cleanPath) || /^\/(app|admin)(\/|$)/.test(cleanPath);
  const page = path ? publicPages[path] : {
    title: `${privateTitles[cleanPath] ?? (accountRoute ? 'Shaxsiy kuzatuv' : 'Sahifa topilmadi')} — ${siteName}`,
    description: accountRoute ? 'Shaxsiy kuzatuv va hisob ma’lumotlariga kirish uchun hisobingizdan foydalaning.' : 'So‘ralgan sahifa topilmadi. Raqamli Dermatolog bosh sahifasiga qayting.',
  };
  return {
    ...page, publicPath: path,
    robots: path && config.indexable ? 'index, follow, max-image-preview:large' : 'noindex, nofollow, noarchive',
    canonical: path && config.origin ? `${config.origin}${path}` : null,
    image: path && config.origin ? `${config.origin}/og-image.png` : null,
  };
}

export function structuredData(pathname: string, config: SeoConfig): Record<string, unknown> | null {
  if (publicPath(pathname) !== '/' || !config.origin) return null;
  return {
    '@context': 'https://schema.org',
    '@graph': [
      { '@type': 'WebSite', '@id': `${config.origin}/#website`, url: `${config.origin}/`, name: siteName, inLanguage: 'uz', description: publicPages['/'].description },
      { '@type': 'SoftwareApplication', '@id': `${config.origin}/#application`, url: `${config.origin}/`, name: siteName,
        applicationCategory: 'LifestyleApplication', operatingSystem: 'Web browser', inLanguage: 'uz',
        description: 'Surat sifatini tekshirish, alohida rozilik bilan AI vizual kuzatuvi va shaxsiy kuzatuv tarixini yuritish uchun veb ilova. Klinik tashxis o‘rnini bosmaydi.',
        featureList: ['Surat sifatini tekshirish', 'Rozilik asosida AI vizual kuzatuvi', 'Shaxsiy kuzatuv tarixi', 'Suratlarni taqqoslash', 'PDF hisobot'] },
    ],
  };
}

const escapeHtml = (value: string) => value.replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]!));
export const safeJson = (value: unknown) => JSON.stringify(value).replace(/[<>&\u2028\u2029]/g, character => `\\u${character.charCodeAt(0).toString(16).padStart(4, '0')}`);

export function renderSeoHead(pathname: string, config: SeoConfig): string {
  const meta = pageMetadata(pathname, config);
  const data = structuredData(pathname, config);
  const tag = (name: string, content: string, property = false) => `<meta data-seo ${property ? 'property' : 'name'}="${name}" content="${escapeHtml(content)}"/>`;
  return [
    `<title data-seo>${escapeHtml(meta.title)}</title>`, tag('description', meta.description), tag('robots', meta.robots),
    ...(meta.canonical ? [`<link data-seo rel="canonical" href="${escapeHtml(meta.canonical)}"/>`] : []),
    ...(meta.publicPath ? [tag('og:type', 'website', true), tag('og:site_name', siteName, true), tag('og:locale', 'uz_UZ', true),
      tag('og:title', meta.title, true), tag('og:description', meta.description, true),
      tag('twitter:card', meta.image ? 'summary_large_image' : 'summary'), tag('twitter:title', meta.title), tag('twitter:description', meta.description)] : []),
    ...(meta.canonical ? [tag('og:url', meta.canonical, true)] : []),
    ...(meta.image ? [tag('og:image', meta.image, true), tag('og:image:type', 'image/png', true), tag('og:image:width', '1200', true), tag('og:image:height', '630', true),
      tag('og:image:alt', 'Raqamli Dermatolog — teri o‘zgarishlarini kuzatish', true), tag('twitter:image', meta.image), tag('twitter:image:alt', 'Raqamli Dermatolog — teri o‘zgarishlarini kuzatish')] : []),
    ...(data ? [`<script data-seo type="application/ld+json">${safeJson(data)}</script>`] : []),
  ].join('\n');
}

export function robotsText(config: SeoConfig): string {
  if (!config.indexable || !config.origin) return 'User-agent: *\nDisallow: /\n';
  // Private HTML stays crawlable so crawlers can read noindex. Authorization protects the data.
  return `User-agent: *\nAllow: /\nDisallow: /api/\n\nSitemap: ${config.origin}/sitemap.xml\n`;
}

export function sitemapXml(config: SeoConfig): string {
  const entries = config.indexable && config.origin
    ? Object.keys(publicPages).map(path => `  <url><loc>${escapeHtml(`${config.origin}${path}`)}</loc></url>`).join('\n') : '';
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries}\n</urlset>\n`;
}
