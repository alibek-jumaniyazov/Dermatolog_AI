import { readFile, writeFile, mkdir, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import sharp from 'sharp';
import { publicPages, renderPublicPage, renderNotFound, renderSeoHead, robotsText, sitemapXml, seoConfig } from '../.seo-build/prerender.js';

const directory = fileURLToPath(new URL('../dist/', import.meta.url));
const template = await readFile(path.join(directory, 'index.html'), 'utf8');
if (!template.includes('<!--seo:start-->') || !template.includes('<div id="root"></div>')) throw new Error('SEO build template markers are missing');
const html = (route, body) => template.replace(/<!--seo:start-->[\s\S]*?<!--seo:end-->/, `<!--seo:start-->\n${renderSeoHead(route, seoConfig)}\n<!--seo:end-->`)
  .replace('<div id="root"></div>', `<div id="root">${body}</div>`);
for (const route of Object.keys(publicPages)) {
  const output = route === '/' ? directory : path.join(directory, route.slice(1));
  await mkdir(output, { recursive: true });
  await writeFile(path.join(output, 'index.html'), html(route, renderPublicPage(route)));
}
await writeFile(path.join(directory, 'app-shell.html'), html('/app', ''));
await writeFile(path.join(directory, '404.html'), html('/404', renderNotFound()));
await writeFile(path.join(directory, 'robots.txt'), robotsText(seoConfig));
await writeFile(path.join(directory, 'sitemap.xml'), sitemapXml(seoConfig));
await sharp(fileURLToPath(new URL('../src/seo/social-card.svg', import.meta.url))).png().toFile(path.join(directory, 'og-image.png'));
// Only non-sensitive public build settings are recorded here.
await writeFile(path.join(directory, 'seo-build.json'), JSON.stringify({ origin: seoConfig.origin, indexable: seoConfig.indexable, publicRoutes: Object.keys(publicPages) }, null, 2));
console.log(`SEO: ${Object.keys(publicPages).length} public pages prerendered; indexing ${seoConfig.indexable ? 'enabled' : 'disabled'}.`);
// This is a fixed, verified build-only directory below apps/web.
const temporary = fileURLToPath(new URL('../.seo-build/', import.meta.url));
if (path.dirname(temporary.replace(/[\\/]$/, '')) !== path.dirname(directory.replace(/[\\/]$/, ''))) throw new Error('Unexpected SEO build directory');
await rm(temporary, { recursive: true, force: true });
