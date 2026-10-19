import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitepress'
import { SITE } from './site'
import { writeFeed } from './theme/node/feed'
import { pageDescription, socialHead } from './theme/node/head'
import { loadImpact } from './theme/node/impact'
import { writeImpactHistory, writeImpactJson, writeImpactSheet } from './theme/node/impact-sheet'
import { loadNews } from './theme/node/news'
import { loadRedirects, writeRedirects } from './theme/node/redirects'
import { loadSoftware, loadTopics } from './theme/node/software'

// Loading the software checks every cross-reference between software.yaml, topics.yaml, team.yaml and
// papers.bib, so a typo fails the build before any page renders.
loadSoftware()
const topics = loadTopics()

// VitePress writes sitemap.xml through a stream it does not await, so it can still be open in buildEnd.
async function completeFile(file: string, ending: string, timeoutMs = 10_000): Promise<void> {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    if (fs.existsSync(file) && fs.readFileSync(file, 'utf8').trimEnd().endsWith(ending)) return
    await new Promise((resolve) => setTimeout(resolve, 50))
  }
  throw new Error(`${file} was not written in time`)
}

export default defineConfig({
  lang: 'en-US',
  title: SITE.title,
  description: SITE.description,
  srcExclude: ['README.md', 'data/**'],

  // Every URL of the old WordPress site keeps working: pages at /<page>/, news at /YYYY/MM/<slug>/.
  rewrites: {
    'news/:year/:month/:slug.md': ':year/:month/:slug/index.md',
  },

  head: [
    // The SVG favicon follows the browser's light or dark theme; browsers without SVG favicons take the PNGs.
    ['link', { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' }],
    ['link', { rel: 'icon', type: 'image/png', sizes: '32x32', href: '/favicon-32.png' }],
    ['link', { rel: 'icon', type: 'image/png', sizes: '192x192', href: '/favicon-192.png' }],
    ['link', { rel: 'apple-touch-icon', href: '/favicon-192.png' }],
    ['link', { rel: 'alternate', type: 'application/rss+xml', title: 'OSCUR news', href: '/feed.xml' }],
  ],

  sitemap: {
    hostname: SITE.hostname,
  },

  themeConfig: {
    // The wordmark already says OSCUR, so the bar shows no title text; the alt names the home link.
    logo: { light: '/media/brand/oscur-wordmark.png', dark: '/media/brand/oscur-wordmark-white.png', alt: 'OSCUR' },
    siteTitle: false,
    nav: [
      { text: 'Overview', link: '/overview/' },
      { text: 'Software', link: '/software/' },
      { text: 'Publications', link: '/publications/' },
      { text: 'News & Events', link: '/news/', activeMatch: '^/(news|\\d{4})/' },
      { text: 'Partners', link: '/partners/' },
      { text: 'Team', link: '/team/' },
      { text: 'Impact', link: '/impact/' },
      { text: 'Newsletter', link: '/newsletter/' },
    ],
    outline: false,
    // Site content read by the theme's components (the theme itself holds none).
    oscur: {
      topics,
      newsOnHome: SITE.newsOnHome,
      funding: SITE.funding,
      institutions: SITE.institutions,
      repo: SITE.repo,
    },
  },

  transformPageData(pageData) {
    pageData.frontmatter.aside ??= false
    // News posts carry an excerpt rather than a description; either becomes the page's meta description.
    pageData.description = pageDescription(pageData)
    pageData.frontmatter.head ??= []
    pageData.frontmatter.head.push(...socialHead(pageData, SITE))
  },

  async buildEnd(siteConfig) {
    const news = loadNews()
    writeRedirects(siteConfig.outDir, loadRedirects(news), SITE.hostname)
    writeFeed(siteConfig.outDir, news, SITE)
    const impact = loadImpact()
    await writeImpactSheet(siteConfig.outDir, impact)
    writeImpactJson(siteConfig.outDir, impact)
    writeImpactHistory(siteConfig.outDir)
    // WordPress published its sitemap at /wp-sitemap.xml; keep that URL alive for crawlers that cached it.
    const sitemap = path.join(siteConfig.outDir, 'sitemap.xml')
    await completeFile(sitemap, '</urlset>')
    fs.copyFileSync(sitemap, path.join(siteConfig.outDir, 'wp-sitemap.xml'))
  },

  vite: {
    resolve: {
      alias: { '@data': fileURLToPath(new URL('./data', import.meta.url)) },
    },
  },
})
