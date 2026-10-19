import fs from 'node:fs'
import path from 'node:path'
import yaml from 'js-yaml'
import { DATA_DIR } from './paths'
import type { NewsPost } from './news'

export interface Redirect {
  from: string
  to: string
}

export function loadRedirects(news: NewsPost[]): Redirect[] {
  const manual = (yaml.load(fs.readFileSync(path.join(DATA_DIR, 'redirects.yaml'), 'utf8')) ?? []) as Redirect[]
  // WordPress served year and month archives such as /2024/ and /2024/08/; they now point to the news page.
  const archives = new Map<string, string>()
  for (const post of news) {
    const [, year, month] = post.url.match(/^\/(\d{4})\/(\d{2})\//)!
    archives.set(`/${year}/`, `/news/#${year}`)
    archives.set(`/${year}/${month}/`, `/news/#${year}`)
  }
  return [...manual, ...[...archives].map(([from, to]) => ({ from, to }))]
}

function escapeAttr(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')
}

function stub(to: string, hostname: string): string {
  const target = escapeAttr(to)
  const canonical = escapeAttr(new URL(to, hostname).href)
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Redirecting</title>
<meta name="robots" content="noindex">
<link rel="canonical" href="${canonical}">
<meta http-equiv="refresh" content="0; url=${target}">
<script>location.replace(${JSON.stringify(to)}${to.includes('#') ? '' : ' + location.hash'})</script>
</head>
<body><p>This page has moved to <a href="${target}">${target}</a>.</p></body>
</html>
`
}

// GitHub Pages has no server-side redirects, so each old path gets a small HTML page that forwards.
export function writeRedirects(outDir: string, redirects: Redirect[], hostname: string): void {
  const sources = new Set(redirects.map((r) => r.from))
  for (const { from, to } of redirects) {
    if (!from.startsWith('/') || !from.endsWith('/')) throw new Error(`redirect source must look like /path/: ${from}`)
    const file = path.join(outDir, from, 'index.html')
    if (fs.existsSync(file)) throw new Error(`redirect ${from} would overwrite a page`)
    const targetPath = to.split('#')[0]
    if (sources.has(targetPath)) throw new Error(`redirect chain: ${from} -> ${to} is itself redirected`)
    if (!to.startsWith('http') && !fs.existsSync(path.join(outDir, targetPath, 'index.html'))) {
      throw new Error(`redirect ${from} points to ${to}, which is not a page`)
    }
    fs.mkdirSync(path.dirname(file), { recursive: true })
    fs.writeFileSync(file, stub(to, hostname))
  }
}
