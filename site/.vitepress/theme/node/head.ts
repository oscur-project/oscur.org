import type { HeadConfig, PageData } from 'vitepress'

interface HeadSite {
  title: string
  description: string
  hostname: string
  image: string
}

export function pageUrl(relativePath: string, hostname: string): string {
  const route = relativePath.replace(/(^|\/)index\.md$/, '$1').replace(/\.md$/, '/')
  return `${hostname}/${route}`
}

// The page's own description: a news post's excerpt, else the frontmatter's description. VitePress writes it
// into <meta name="description"> without escaping it, so straight double quotes become typographic ones.
export function pageDescription(pageData: PageData): string {
  const fm = pageData.frontmatter
  const text: string = fm.excerpt || fm.description || pageData.description || ''
  return text.replace(/"([^"]*)"/g, '“$1”').replace(/"/g, '”')
}

// Canonical and Open Graph tags. They go through frontmatter.head so client-side navigation updates them too.
// VitePress sets an empty description on pages without one, so the fallbacks chain with ||, not ??.
export function socialHead(pageData: PageData, site: HeadSite): HeadConfig[] {
  const fm = pageData.frontmatter
  const url = pageUrl(pageData.relativePath, site.hostname)
  const isHome = pageData.relativePath === 'index.md'
  const title = isHome ? fm.title || site.title : pageData.title || site.title
  const description = pageDescription(pageData) || site.description
  const image = new URL(fm.image || site.image, site.hostname).href
  const head: HeadConfig[] = [
    ['link', { rel: 'canonical', href: url }],
    ['meta', { property: 'og:type', content: fm.date ? 'article' : 'website' }],
    ['meta', { property: 'og:site_name', content: site.title }],
    ['meta', { property: 'og:title', content: title }],
    ['meta', { property: 'og:description', content: description }],
    ['meta', { property: 'og:url', content: url }],
    ['meta', { property: 'og:image', content: image }],
    ['meta', { name: 'twitter:card', content: 'summary_large_image' }],
  ]
  return head
}
