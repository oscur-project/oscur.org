import fs from 'node:fs'
import path from 'node:path'
import matter from 'gray-matter'
import { NEWS_DIR } from './paths'
import { describe, newsSchema } from './schema'

export interface NewsPost {
  url: string
  title: string
  date: string
  year: string
  image: string | null
  imageFit: 'cover' | 'contain'
  excerpt: string
}

// News posts live in site/news/YYYY/MM/<slug>.md and are served at /YYYY/MM/<slug>/, the old WordPress
// URLs. createContentLoader ignores rewrites, so the posts are read here instead.
export function loadNews(): NewsPost[] {
  const posts: NewsPost[] = []
  for (const year of fs.readdirSync(NEWS_DIR).filter((d) => /^\d{4}$/.test(d))) {
    for (const month of fs.readdirSync(path.join(NEWS_DIR, year)).filter((d) => /^\d{2}$/.test(d))) {
      for (const file of fs.readdirSync(path.join(NEWS_DIR, year, month)).filter((f) => f.endsWith('.md'))) {
        const { data } = matter(fs.readFileSync(path.join(NEWS_DIR, year, month, file), 'utf8'))
        const parsed = newsSchema.safeParse(data)
        if (!parsed.success) throw new Error(`site/news/${year}/${month}/${file}:\n${describe(parsed.error)}`)
        posts.push({
          url: `/${year}/${month}/${file.slice(0, -'.md'.length)}/`,
          title: parsed.data.title,
          date: parsed.data.date.toISOString().slice(0, 10),
          year,
          image: parsed.data.image ?? null,
          imageFit: parsed.data.imageFit ?? 'cover',
          excerpt: parsed.data.excerpt ?? '',
        })
      }
    }
  }
  return posts.sort((a, b) => b.date.localeCompare(a.date) || a.title.localeCompare(b.title))
}
