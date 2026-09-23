import { renderSeoHead, seoConfig } from './config';

/** Replace, rather than append, metadata when React Router changes the current page. */
export function applyPageMetadata(pathname: string) {
  document.head.querySelectorAll('[data-seo]').forEach(element => element.remove());
  const template = document.createElement('template');
  template.innerHTML = renderSeoHead(pathname, seoConfig);
  document.head.append(template.content);
  document.documentElement.lang = 'uz';
}
