import fs from 'node:fs'
import path from 'node:path'
import { Feed } from 'feed'
import type { NewsPost } from './news'

interface FeedSite {
  title: string
  description: string
  hostname: string
}

// Writes the news feed to /feed.xml. WordPress served its feeds at /feed/, /news/feed/ and /comments/feed/, so
// the same XML is also written there as index.html: GitHub Pages sends it as text/html, which most readers
// still accept. The comments feed never had an item; readers subscribed to it now get the posts.
export function writeFeed(outDir: string, news: NewsPost[], site: FeedSite): void {
  const feed = new Feed({
    title: site.title,
    description: site.description,
    id: `${site.hostname}/`,
    link: `${site.hostname}/news/`,
    language: 'en',
    copyright: site.title,
    updated: news.length ? new Date(news[0].date) : new Date(),
    feedLinks: { rss: `${site.hostname}/feed.xml` },
  })
  for (const post of news) {
    const link = new URL(post.url, site.hostname).href
    feed.addItem({
      title: post.title,
      id: link,
      link,
      date: new Date(post.date),
      description: post.excerpt,
      image: post.image ? new URL(post.image, site.hostname).href : undefined,
    })
  }
  const xml = feed.rss2()
  fs.writeFileSync(path.join(outDir, 'feed.xml'), xml)
  for (const legacy of ['feed', 'news/feed', 'comments/feed']) {
    fs.mkdirSync(path.join(outDir, legacy), { recursive: true })
    fs.writeFileSync(path.join(outDir, legacy, 'index.html'), xml)
  }
}
