// Checks the built site (site/.vitepress/dist) the way GitHub Pages will serve it.
//
//   node scripts/check/dist.mjs               checks the build on disk
//   node scripts/check/dist.mjs --base URL    checks the legacy URLs against a live site instead
//
// On disk it verifies that every internal href, src, srcset and poster resolves, that every URL of the old
// WordPress site (site/data/legacy-urls.txt) and every known inbound link still resolves to a page, a
// redirect stub or a file, that no redirect stub points at another stub, and that no stub is in the sitemap.
// VitePress itself only checks links written in Markdown, not the ones in the menu or in components.

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const DIST = path.join(ROOT, 'site/.vitepress/dist')

// Links from outside this repo that must keep working. GitHub code search finds links only to the home page
// (UrbanMapper's README and docs, the PIs' sites, the UrbanAccess 2024 workshop site); the NSF reports cite the
// software and impact pages.
const INBOUND = ['/', '/software/', '/publications/', '/impact/']

function legacyUrls() {
  return fs
    .readFileSync(path.join(ROOT, 'site/data/legacy-urls.txt'), 'utf8')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'))
}

// GitHub Pages: /x/ serves x/index.html, /x serves x.html or redirects to /x/ when x/ is a folder.
function resolveOnDisk(urlPath) {
  const clean = decodeURIComponent(urlPath.split(/[?#]/)[0])
  const target = path.join(DIST, clean)
  if (!target.startsWith(DIST)) return null
  if (clean.endsWith('/')) return fs.existsSync(path.join(target, 'index.html')) ? path.join(target, 'index.html') : null
  if (fs.existsSync(target) && fs.statSync(target).isFile()) return target
  if (fs.existsSync(`${target}.html`)) return `${target}.html`
  if (fs.existsSync(path.join(target, 'index.html'))) return path.join(target, 'index.html')
  return null
}

function htmlFiles(dir) {
  const out = []
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) out.push(...htmlFiles(full))
    else if (entry.name.endsWith('.html')) out.push(full)
  }
  return out
}

function pageUrl(file) {
  const rel = path.relative(DIST, file).split(path.sep).join('/')
  return `/${rel.replace(/(^|\/)index\.html$/, '$1')}`
}

function redirectTarget(html) {
  return html.match(/<meta http-equiv="refresh" content="0; url=([^"]+)"/)?.[1] ?? null
}

function checkDisk() {
  const problems = []
  const files = htmlFiles(DIST)
  let links = 0
  for (const file of files) {
    const html = fs.readFileSync(file, 'utf8')
    const from = pageUrl(file)
    // Feed copies at /feed/ and /news/feed/ are XML, not HTML.
    if (html.startsWith('<?xml')) continue
    const refs = []
    for (const [, attr, value] of html.matchAll(/\s(href|src|poster|srcset)="([^"]*)"/g)) {
      if (attr === 'srcset') refs.push(...value.split(',').map((part) => part.trim().split(/\s+/)[0]))
      else refs.push(value)
    }
    for (const ref of refs) {
      if (!ref || /^(https?:|mailto:|tel:|javascript:|data:|#)/.test(ref) || ref.startsWith('//')) continue
      const absolute = new URL(ref.replace(/&amp;/g, '&'), `https://site.invalid${from}`).pathname
      links++
      if (!resolveOnDisk(absolute)) problems.push(`${from}: broken link ${ref}`)
    }
    const target = redirectTarget(html)
    if (target && !target.startsWith('http')) {
      const next = resolveOnDisk(target)
      if (!next) problems.push(`${from}: redirects to missing ${target}`)
      else if (redirectTarget(fs.readFileSync(next, 'utf8'))) problems.push(`${from}: redirect chain through ${target}`)
    }
  }
  for (const url of [...legacyUrls(), ...INBOUND]) {
    if (!resolveOnDisk(url)) problems.push(`old or inbound URL no longer resolves: ${url}`)
  }
  const sitemap = fs.readFileSync(path.join(DIST, 'sitemap.xml'), 'utf8')
  for (const [, loc] of sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)) {
    const file = resolveOnDisk(new URL(loc).pathname)
    if (!file) problems.push(`sitemap lists a missing page: ${loc}`)
    else if (redirectTarget(fs.readFileSync(file, 'utf8'))) problems.push(`sitemap lists a redirect stub: ${loc}`)
  }
  problems.push(...checkImpactJson())
  console.log(`dist: ${files.length} HTML files, ${links} internal links, ${legacyUrls().length} legacy URLs checked`)
  return problems
}

// Rows that pages elsewhere may read from /impact/impact.json, as www.evl.uic.edu reads urbantk.org's.
const IMPACT_JSON_ROWS = ['downloads-month', 'hf-downloads-month', 'publications']

function checkImpactJson() {
  const file = path.join(DIST, 'impact', 'impact.json')
  if (!fs.existsSync(file)) return ['/impact/impact.json is missing']
  const { years, rows } = JSON.parse(fs.readFileSync(file, 'utf8'))
  return IMPACT_JSON_ROWS.flatMap((id) => {
    const row = rows.find((r) => r.id === id)
    if (!row) return [`/impact/impact.json has no ${id} row`]
    return row.values.length === years.length ? [] : [`/impact/impact.json: ${id} has ${row.values.length} values for ${years.length} years`]
  })
}

async function checkLive(base) {
  const problems = []
  const urls = [...new Set([...legacyUrls(), ...INBOUND])]
  for (const url of urls) {
    try {
      const res = await fetch(new URL(url, base), { redirect: 'follow' })
      if (!res.ok) problems.push(`${res.status} ${url}`)
    } catch (error) {
      problems.push(`${url}: ${error.message}`)
    }
  }
  console.log(`live: ${urls.length} URLs checked against ${base}`)
  return problems
}

const baseIndex = process.argv.indexOf('--base')
const problems = baseIndex > 0 ? await checkLive(process.argv[baseIndex + 1]) : checkDisk()
for (const problem of problems) console.error(`  ${problem}`)
if (problems.length) {
  console.error(`${problems.length} problem(s)`)
  process.exit(1)
}
