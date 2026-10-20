// Collects the numbers behind /impact/ that live outside this repo and writes them to
// .cache/impact/metrics.json, which the build reads. Deploy runs it before every build.
//
//   GitHub stars, with the day of each star      GitHub REST API: stargazers history (public, any token)
//   commit authors, with their commit months      git history of each repository, all branches
//   commit authors' GitHub accounts and profiles  GitHub REST API; needs GITHUB_TOKEN (a workflow's token will do)
//   PyPI downloads, per day                       ClickHouse's public PyPI dataset (sql-clickhouse.clickhouse.com)
//   npm downloads, per day                        npm's download counts API (api.npmjs.org)
//   Hugging Face datasets and models              the Hub API: creation day and all-time downloads, added to the history
//   Curio's example gallery and Data Catalog      Curio's repository (docs/README.md, datasets/, docs/examples/)
//   the use cases each paper presents             the paper's HTML version on arXiv
//   registered accounts on Curio's hosted apps    their public monitor API, added to the published history
//
//   GITHUB_TOKEN="$(gh auth token)" npm run impact
//
// What to collect comes from site/data/impact.yaml and site/data/papers.bib. Every request is tried three
// times; a source that still fails stops the script, so the site is never built from partial numbers.

import { execFile } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { promisify } from 'node:util'
import { fileURLToPath } from 'node:url'
import { parse } from '@retorquere/bibtex-parser'
import yaml from 'js-yaml'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const CACHE = path.join(ROOT, '.cache/impact')
const OUT = path.join(CACHE, 'metrics.json')
const CLICKHOUSE = 'https://sql-clickhouse.clickhouse.com/'
const TRIES = 5
const MAX_BUFFER = 256 * 1024 * 1024

// A paper's use cases are the parts of its section with one of these titles, minus parts like these.
const USE_CASE_SECTION = /use cases?|usage scenarios?|case stud(y|ies)|application scenarios?|usage examples?|example gallery/i
const NOT_A_USE_CASE =
  /^(experts?['\u2019]? )?(feedback|reflections?|discussion|limitations?|summary|lessons?|take-?aways?|comparison with|performance|participants?|procedure|study design)\b/i
// A heading that is itself one use case, like "Case Study 1: \u2026", has its siblings for the others.
const ONE_USE_CASE = /\b(use case|case study|usage scenario|scenario|usage example|example)\s*\d+\s*[:.]/i

const run = promisify(execFile)

async function tried(what, fn) {
  for (let attempt = 1; ; attempt++) {
    try {
      return await fn()
    } catch (error) {
      if (attempt === TRIES || error.permanent) throw new Error(`${what}: ${error.message}`)
      // A rate limit may say how long to wait; otherwise wait twice as long as the time before.
      await new Promise((resolve) => setTimeout(resolve, error.retryAfter ? error.retryAfter * 1000 : 2000 * 2 ** (attempt - 1)))
    }
  }
}

const USER_AGENT = 'oscur.org impact page (https://github.com/oscur-project/oscur.org)'

async function get(url, headers = {}, { missingOk = false } = {}) {
  const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT, ...headers } })
  if (missingOk && res.status === 404) return null
  if (!res.ok) {
    const reply = (await res.text().catch(() => '')).slice(0, 200)
    const error = new Error(`HTTP ${res.status} for ${url}${reply ? `: ${reply}` : ''}`)
    // Rate limits and server errors can pass; any other client error will not.
    error.permanent = res.status < 500 && res.status !== 429 && res.status !== 403
    error.retryAfter = Number(res.headers.get('retry-after')) || (res.status === 429 ? 30 : 0)
    throw error
  }
  return res
}

function github(route, { accept = 'application/vnd.github+json', missingOk = false } = {}) {
  const headers = { Accept: accept, Authorization: `Bearer ${process.env.GITHUB_TOKEN}` }
  return tried(`GitHub ${route}`, () => get(`https://api.github.com/${route}`, headers, { missingOk }))
}

function isoDay(date) {
  return date.toISOString().slice(0, 10)
}

function addDays(day, n) {
  const d = new Date(`${day}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + n)
  return isoDay(d)
}

function git(dir, args) {
  return run('git', ['-C', dir, ...args], { maxBuffer: MAX_BUFFER }).then((r) => r.stdout)
}

// The day of each star a repository has, from GitHub's stargazers history: stars per day, by calendar week,
// readable on any public repository with any token. (The stargazer list itself is limited to people who can
// push to the repository, and OSCUR's repositories belong to several organizations.) GitHub notes that its
// weeks need not align with UTC days, so a star can land a day or two off.
async function stars(repo) {
  const days = []
  for (let page = 1; ; page++) {
    const weeks = await (await github(`repos/${repo}/stargazers/history?per_page=30&page=${page}`)).json()
    if (!Array.isArray(weeks) || weeks.length === 0) break
    for (const { week, days: counts } of weeks) {
      counts.forEach((n, i) => {
        const day = isoDay(new Date((week + i * 86_400) * 1000))
        for (let k = 0; k < n; k++) days.push(day)
      })
    }
  }
  const { stargazers_count: count } = await (await github(`repos/${repo}`)).json()
  if (days.length !== count) {
    console.log(`::warning::GitHub's stargazers history of ${repo} lists ${days.length} stars, but the repository has ${count}.`)
  }
  return days.sort()
}

// A blob-less bare clone is enough for the history and stays small; later runs only fetch new commits. The
// token authenticates the clone, since GitHub may refuse some anonymous ones.
function gitAuth() {
  const basic = Buffer.from(`x-access-token:${process.env.GITHUB_TOKEN}`).toString('base64')
  return ['-c', `http.https://github.com/.extraheader=AUTHORIZATION: basic ${basic}`]
}

async function clone(repo) {
  const dir = path.join(CACHE, 'repos', `${repo.replace('/', '__')}.git`)
  if (fs.existsSync(dir)) {
    await tried(`git fetch ${repo}`, () => run('git', [...gitAuth(), '-C', dir, 'fetch', '-q', '--prune', 'origin', '+refs/heads/*:refs/heads/*'], { maxBuffer: MAX_BUFFER }))
  } else {
    fs.mkdirSync(path.dirname(dir), { recursive: true })
    await tried(`git clone ${repo}`, async () => {
      fs.rmSync(dir, { recursive: true, force: true })
      await run('git', [...gitAuth(), 'clone', '-q', '--bare', '--filter=blob:none', `https://github.com/${repo}.git`, dir])
    })
  }
  return dir
}

async function authors(dir) {
  const months = new Map()
  for (const line of (await git(dir, ['log', '--all', '--format=%at%x09%aN%x09%aE'])).split('\n')) {
    const [at, name, email] = line.split('\t')
    if (!email) continue
    const key = `${name}\t${email}`
    if (!months.has(key)) months.set(key, new Set())
    months.get(key).add(new Date(Number(at) * 1000).toISOString().slice(0, 7))
  }
  return [...months].map(([key, set]) => {
    const [name, email] = key.split('\t')
    return { name, email, months: [...set].sort() }
  })
}

// The GitHub account behind each commit email, and the public profile of each account. Authors with no commit
// since `since` (YYYY-MM) count in no award year, so they are not looked up: repositories such as VisTrailsJL
// carry decades of history.
async function accounts(repos, since) {
  const logins = {}
  for (const [repo, { authors: list }] of Object.entries(repos)) {
    for (const { email, name, months } of list) {
      const key = email.toLowerCase()
      if (key in logins || /\[bot\]/i.test(`${name} ${email}`) || !months.some((m) => m >= since)) continue
      const noreply = /^(?:\d+\+)?([^@]+)@users\.noreply\.github\.com$/i.exec(email)
      if (noreply) {
        logins[key] = noreply[1]
        continue
      }
      const commits = await (await github(`repos/${repo}/commits?author=${encodeURIComponent(email)}&per_page=1`)).json()
      logins[key] = commits[0]?.author?.login ?? null
    }
  }
  const profiles = {}
  for (const login of new Set(Object.values(logins).filter(Boolean))) {
    const res = await github(`users/${encodeURIComponent(login)}`, { missingOk: true })
    const user = res ? await res.json() : {}
    profiles[login] = { name: user.name ?? null, company: user.company ?? null, bio: user.bio ?? null }
  }
  return { logins, profiles }
}

// The last day ClickHouse's PyPI dataset holds. A package without downloads that day still has data for it.
async function pypiThrough() {
  const query = 'SELECT toString(max(date)) FROM pypi.pypi_downloads_per_day FORMAT JSONCompact'
  const res = await tried('PyPI dataset', () => get(`${CLICKHOUSE}?${new URLSearchParams({ user: 'demo', query })}`))
  return (await res.json()).data[0][0]
}

async function pypi(pkg, start, through) {
  const query =
    'SELECT toString(date) AS day, sum(count) AS n FROM pypi.pypi_downloads_per_day ' +
    'WHERE project = {p:String} AND date >= {s:Date} AND date <= {t:Date} GROUP BY date ORDER BY date FORMAT JSONCompact'
  const url = `${CLICKHOUSE}?${new URLSearchParams({ user: 'demo', query, param_p: pkg, param_s: start, param_t: through })}`
  const res = await tried(`PyPI downloads of ${pkg}`, () => get(url))
  const days = {}
  for (const [day, n] of (await res.json()).data) if (Number(n)) days[day] = Number(n)
  return { through, days }
}

// The packages an npm organization owns, scoped or not.
async function npmOwned(org) {
  const res = await tried(`npm packages of ${org}`, () => get(`https://registry.npmjs.org/-/org/${org}/package`))
  return Object.keys(await res.json()).sort()
}

// `*` in a name matches any run of characters, among the packages the organization owns.
function npmNames(names, owned) {
  const escape = (part) => part.replace(/[.+?^${}()|[\]\\]/g, '\\$&')
  const glob = (name) => new RegExp(`^${name.split('*').map(escape).join('.*')}$`)
  return names.flatMap((name) => (name.includes('*') ? owned.filter((pkg) => glob(name).test(pkg)) : [name]))
}

// npm answers at most 18 months per request; a year at a time stays well inside that.
async function npm(pkg, start, through) {
  const days = {}
  for (let from = start; from <= through; from = addDays(from, 365)) {
    const to = addDays(from, 364) < through ? addDays(from, 364) : through
    const url = `https://api.npmjs.org/downloads/range/${from}:${to}/${pkg}`
    const res = await tried(`npm downloads of ${pkg}`, () => get(url))
    for (const { day, downloads } of (await res.json()).downloads ?? []) if (downloads) days[day] = downloads
    // npm's API answers 429 to a quick run of requests.
    await new Promise((resolve) => setTimeout(resolve, 1000))
  }
  return { through, days }
}

// Curio's example gallery (the table in docs/README.md), its Data Catalog, and the data files its numbered
// examples read by path. Each carries the day its file was added to main.
async function curio(dir) {
  const show = (file) => git(dir, ['show', `main:${file}`])
  // `follow` traces a file back through renames, so a dataset folder that was renamed keeps the day it was added.
  const added = async (file, follow = false) => {
    const args = ['log', 'main', ...(follow ? ['--follow'] : []), '--diff-filter=A', '--format=%ad', '--date=short']
    const days = (await git(dir, [...args, '--', file])).trim().split('\n')
    return days[days.length - 1] || null
  }
  const list = async (folder) => (await git(dir, ['ls-tree', '--name-only', 'main', `${folder}/`])).trim().split('\n').filter(Boolean)

  const examples = []
  const row = /^\|\s*(\d{2})\s*\|\s*\[([^\]]+)\]\((examples\/[^)]+\.md)\)\s*\|[^|\n]*\|\s*([^|\n]+?)\s*\|/gm
  for (const m of (await show('docs/README.md')).matchAll(row)) {
    const file = `docs/${m[3]}`
    examples.push({ number: Number(m[1]), title: m[2], useCase: m[4], file, added: await added(file) })
  }

  // The numbered examples whose dataflow mentions a dataset id or a file name.
  const dataflows = (await list('docs/examples')).filter((file) => /\/\d{2}-[^/]+\.json$/.test(file))
  const texts = []
  for (const file of dataflows) texts.push(await show(file))
  const readers = (reads) => dataflows.filter((_, i) => reads(texts[i])).map((f) => Number(/\/(\d{2})-/.exec(f)[1]))

  const datasets = []
  for (const folder of await list('datasets')) {
    if (!/@\d+$/.test(folder)) continue
    const manifest = JSON.parse(await show(`${folder}/manifest.json`))
    // An id that only begins a longer id is not a read of this dataset.
    const escaped = manifest.id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const id = new RegExp(`${escaped}(?![\\w-]|\\.\\w)`)
    datasets.push({
      id: manifest.id,
      folder,
      name: manifest.name,
      tags: manifest.tags ?? [],
      description: manifest.description ?? '',
      examples: readers((text) => id.test(text)),
      added: await added(`${folder}/manifest.json`, true),
    })
  }

  // Files only: a folder there holds a storage example's sample files, not one dataset.
  const blobs = (await git(dir, ['ls-tree', 'main', 'docs/examples/data/']))
    .trim()
    .split('\n')
    .filter((line) => line.split(/\s+/)[1] === 'blob')
    .map((line) => line.split('\t')[1])
  const files = []
  for (const file of blobs) {
    const name = path.posix.basename(file)
    const examples = readers((text) => text.includes(name))
    if (examples.length) files.push({ file, name, examples, added: await added(file) })
  }
  return { examples, datasets, files }
}

function clean(html) {
  return html
    .replace(/<span class="ltx_tag[^"]*">[\s\S]*?<\/span>/g, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&nbsp;|&#160;/g, ' ')
    .replace(/\s*\[\s*\d[^\]]*\]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[.:]$/, '')
}

// The use cases a paper presents: the parts of its first section titled like "Usage scenarios", "Case
// studies" or "Use cases", read from arXiv's HTML version. Parts are the section's child headings or, when
// it has none, its paragraphs that open with a bold or italic run-in title.
async function paperUseCases(eprint) {
  const res = await tried(`arXiv ${eprint}`, () => get(`https://arxiv.org/html/${eprint}`, {}, { missingOk: true }))
  if (!res) return { eprint, html: false, section: null, useCases: [] }
  const page = await res.text()
  const level = { section: 1, subsection: 2, subsubsection: 3, paragraph: 4 }
  const headings = [...page.matchAll(/<h\d[^>]*class="ltx_title ltx_title_(section|subsection|subsubsection|paragraph)"[^>]*>([\s\S]*?)<\/h\d>/g)]
    .map((m) => ({ level: level[m[1]], title: clean(m[2]), at: m.index }))
  const i = headings.findIndex((h) => USE_CASE_SECTION.test(h.title))
  if (i < 0) return { eprint, html: true, section: null, useCases: [] }
  const section = headings[i]
  if (ONE_USE_CASE.test(section.title)) {
    const parent = headings.slice(0, i).findLast((h) => h.level < section.level)
    const end = headings.slice(i + 1).find((h) => h.level < section.level)
    const useCases = headings
      .slice(i, end ? headings.indexOf(end) : undefined)
      .filter((h) => h.level === section.level && ONE_USE_CASE.test(h.title))
      .map((h) => h.title.slice(h.title.search(ONE_USE_CASE)))
    return { eprint, html: true, section: parent?.title ?? section.title, useCases }
  }
  const end = headings.slice(i + 1).find((h) => h.level <= section.level)
  const inside = headings.slice(i + 1, end ? headings.indexOf(end) : undefined)
  const top = Math.min(...inside.map((h) => h.level))
  let useCases = inside.filter((h) => h.level === top && !NOT_A_USE_CASE.test(h.title)).map((h) => h.title)
  if (!useCases.length) {
    const body = page.slice(section.at, end ? end.at : undefined)
    const runIn = /<div[^>]*class="ltx_para ltx_noindent"[^>]*>\s*<p[^>]*class="ltx_p"[^>]*>\s*<span[^>]*class="ltx_text ltx_font_(?:bold|italic)"[^>]*>([\s\S]*?)<\/span>/g
    useCases = [...body.matchAll(runIn)].map((m) => clean(m[1])).filter((t) => t && !NOT_A_USE_CASE.test(t))
  }
  return { eprint, html: true, section: section.title, useCases }
}

// Registered accounts on a hosted Curio, from its public monitor API. The API path depends on how the host
// proxies /api, so both layouts are tried. An instance without the API (an older release) counts as null.
async function registered(base) {
  for (const route of ['/api/api/monitor', '/api/monitor']) {
    const res = await fetch(`${base}${route}`, { headers: { 'User-Agent': USER_AGENT } }).catch(() => null)
    if (!res?.ok) continue
    const json = await res.json().catch(() => null)
    if (Number.isInteger(json?.accounts?.registered)) return json.accounts.registered
  }
  return null
}

// The counts every earlier deploy recorded, from the published site; none yet before the first deploy. Once
// impact.yaml says when the history began (`historySince`), a missing history is an error rather than a fresh
// start, so a passing outage cannot erase the record.
async function history(url, since) {
  try {
    const res = await tried('impact history', () => get(url, {}, { missingOk: !since }))
    return res ? await res.json() : []
  } catch (error) {
    // Before historySince, the history may not be readable yet (the site's first deploy, a domain that has just
    // moved): start a new one. After, any failure stops the run.
    if (since) throw error
    console.log(`${error.message}; starting a new history`)
    return []
  }
}

// The datasets or models an owner publishes on Hugging Face, with the day each was created, its downloads in
// the last 30 days and all-time. The Hub pages its lists with a Link header.
async function hfOwned(kind, owner) {
  const out = []
  let url = `https://huggingface.co/api/${kind}?author=${encodeURIComponent(owner)}&limit=1000&expand[]=createdAt&expand[]=downloads&expand[]=downloadsAllTime`
  while (url) {
    const res = await tried(`Hugging Face ${kind} of ${owner}`, () => get(url))
    for (const repo of await res.json()) {
      out.push({ id: `${kind}/${repo.id}`, createdAt: repo.createdAt, downloads: repo.downloads ?? 0, downloadsAllTime: repo.downloadsAllTime ?? 0 })
    }
    url = /<([^>]+)>;\s*rel="next"/.exec(res.headers.get('link') ?? '')?.[1] ?? null
  }
  return out
}

// Papers from the award start on, by issue month; a preprint without a month is dated by its arXiv id.
function recentEprints(start) {
  const library = parse(fs.readFileSync(path.join(ROOT, 'site/data/papers.bib'), 'utf8'), {
    sentenceCase: false,
    caseProtection: false,
    verbatimFields: ['url', 'doi', 'eprint', 'pdf', 'code', 'video', 'thumbnail', 'page', /^file$/],
  })
  const first = Number(start.slice(0, 4)) * 12 + Number(start.slice(5, 7))
  const wanted = []
  for (const { key, fields } of library.entries) {
    if (String(fields.listed ?? '').trim() === 'false') continue // an earlier paper of the software, not counted
    const eprint = typeof fields.eprint === 'string' ? fields.eprint.trim() : null
    if (!eprint || String(fields.archiveprefix ?? fields.eprinttype ?? '').toLowerCase() !== 'arxiv') continue
    const year = Number.parseInt(fields.year, 10)
    const fromId = /^(\d{2})(\d{2})\./.exec(eprint)
    const month = Number.parseInt(fields.month, 10) || (fromId && 2000 + Number(fromId[1]) === year ? Number(fromId[2]) : 1)
    if (year * 12 + month >= first) wanted.push({ key, eprint })
  }
  return wanted
}

async function main() {
  if (!process.env.GITHUB_TOKEN) {
    throw new Error('GitHub answers these requests only with a token: set GITHUB_TOKEN, e.g. GITHUB_TOKEN="$(gh auth token)" npm run impact')
  }
  const config = yaml.load(fs.readFileSync(path.join(ROOT, 'site/data/impact.yaml'), 'utf8'))
  const start = isoDay(new Date(config.award.start))
  const collected = new Date()
  const yesterday = addDays(isoDay(collected), -1)
  const out = {
    collected: collected.toISOString(),
    repos: {},
    accounts: null,
    pypi: {},
    npm: {},
    npmPackages: {},
    huggingface: {},
    hfRepos: {},
    curio: null,
    papers: {},
    history: [],
  }

  const pypiDay = await pypiThrough()
  const owned = config.npmOrg ? await npmOwned(config.npmOrg) : []
  const hubLists = new Map()
  const dirs = {}
  for (const entry of config.software) {
    for (const repo of entry.repos) {
      console.log(`github  ${repo}`)
      dirs[repo] = await clone(repo)
      out.repos[repo] = { stars: await stars(repo), authors: await authors(dirs[repo]) }
      console.log(`        ${out.repos[repo].stars.filter((day) => day >= start).length} stars since ${start}`)
    }
    for (const pkg of entry.pypi ?? []) {
      console.log(`pypi    ${pkg}`)
      out.pypi[pkg] = await pypi(pkg, start, pypiDay)
    }
    out.npmPackages[entry.software] = npmNames(entry.npm ?? [], owned)
    for (const pkg of out.npmPackages[entry.software]) {
      console.log(`npm     ${pkg}`)
      out.npm[pkg] = await npm(pkg, start, yesterday)
    }
    // Hugging Face names are kind/owner/name, with `*` matching any run of characters among the owner's repos.
    out.huggingface[entry.software] = []
    for (const name of entry.huggingface ?? []) {
      const [kind, owner] = name.split('/')
      const list = `${kind}/${owner}`
      if (!hubLists.has(list)) hubLists.set(list, await hfOwned(kind, owner))
      const glob = new RegExp(`^${name.split('*').map((part) => part.replace(/[.+?^${}()|[\]\\]/g, '\\$&')).join('.*')}$`)
      const matched = hubLists.get(list).filter((repo) => glob.test(repo.id))
      if (!matched.length) throw new Error(`impact.yaml: no Hugging Face repository matches ${name}`)
      for (const { id, ...stats } of matched) {
        out.hfRepos[id] = stats
        out.huggingface[entry.software].push(id)
      }
      console.log(`hf      ${name}: ${matched.length} repositories`)
    }
  }
  // npm reports 0 for a day it has not counted yet, so its data runs to the last day any package has downloads.
  const npmDay = Object.values(out.npm).flatMap((d) => Object.keys(d.days)).sort().at(-1) ?? null
  for (const d of Object.values(out.npm)) d.through = npmDay
  const uncounted = owned.filter((pkg) => !out.npm[pkg] && !(config.npmSkip ?? []).includes(pkg))
  if (uncounted.length) {
    console.log(`::warning::No tool in impact.yaml counts these packages of the ${config.npmOrg} npm organization: ${uncounted.join(', ')}.`)
  }
  console.log('github  accounts of commit authors')
  out.accounts = await accounts(out.repos, start.slice(0, 7))
  console.log(`curio   ${config.curio.repo}`)
  out.curio = await curio(dirs[config.curio.repo] ?? (await clone(config.curio.repo)))
  for (const { key, eprint } of recentEprints(start)) {
    console.log(`arxiv   ${eprint} (${key})`)
    out.papers[key] = await paperUseCases(eprint)
    await new Promise((resolve) => setTimeout(resolve, 1000))
  }

  const users = {}
  for (const base of config.instances ?? []) {
    const count = await registered(base)
    console.log(`curio   ${base}: ${count ?? 'no monitor API'}`)
    if (count !== null) users[base] = count
  }
  // Hugging Face reports only all-time downloads, so each run records them; a year's downloads are the change.
  const hf = Object.fromEntries(Object.entries(out.hfRepos).map(([id, stats]) => [id, stats.downloadsAllTime]))
  const today = isoDay(collected)
  out.history = [...(await history(config.history, config.historySince)).filter((entry) => entry.day !== today), { day: today, users, hf }]
  out.history.sort((a, b) => (a.day < b.day ? -1 : 1))

  fs.mkdirSync(CACHE, { recursive: true })
  fs.writeFileSync(OUT, `${JSON.stringify(out)}\n`)
  console.log(`\nWrote ${path.relative(ROOT, OUT)}`)
}

main().catch((error) => {
  console.error(error.message)
  process.exit(1)
})
