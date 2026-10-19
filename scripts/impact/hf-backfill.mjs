// One-time: the all-time Hugging Face downloads of the impact page's repositories at the ends of the award years
// before the page's own history began. Hugging Face has no download history, but cfahlgren1/hub-stats uploads
// a snapshot of the whole Hub every day, one parquet file per kind; the revisions below are the snapshots of
// August 31. Only the id and downloadsAllTime columns are read, with HTTP range requests.
//
// Writes `huggingfaceSnapshots` in site/data/impact.yaml. Needs `cd scripts && npm install` (hyparquet).
// Run from the repo root: node scripts/impact/hf-backfill.mjs

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import yaml from 'js-yaml'
import { cachedAsyncBuffer, parquetReadObjects } from 'hyparquet'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const CONFIG = path.join(ROOT, 'site/data/impact.yaml')
const STATS = 'https://huggingface.co/datasets/cfahlgren1/hub-stats/resolve'

// The last snapshot of each award year before the page's history began, per kind.
const SNAPSHOTS = [
  { day: '2025-08-31', datasets: '5066f9feeeae05fa6066f36536bae7915b48ab73', models: '9d10362f9a24048b28495303d98c93d67bcfb837' },
  { day: '2026-08-31', datasets: '62de802bcd64be16e228f3d48ef9d4b4db3d79fc', models: 'd2b01c0594522c456febe4212f127a3682f0fbd2' },
]

// A parquet file read through HTTP range requests, at most four at a time and each tried five times: hyparquet
// asks for every column chunk at once, which the Hub's CDN answers with connection timeouts.
async function rangedFile(url) {
  const head = await fetch(url, { method: 'HEAD' })
  if (!head.ok) throw new Error(`HTTP ${head.status} for ${url}`)
  const byteLength = Number(head.headers.get('content-length'))
  // The resolve URL redirects to a signed CDN URL; asking it directly saves a redirect per range.
  const target = head.url
  let active = 0
  const waiting = []
  const acquire = () => new Promise((resolve) => (active < 4 ? (active++, resolve()) : waiting.push(resolve)))
  const release = () => (waiting.length ? waiting.shift()() : active--)
  return {
    byteLength,
    async slice(start, end = byteLength) {
      await acquire()
      try {
        for (let attempt = 1; ; attempt++) {
          try {
            const res = await fetch(target, { headers: { Range: `bytes=${start}-${end - 1}` } })
            if (res.status !== 206 && res.status !== 200) throw new Error(`HTTP ${res.status} for a range of ${url}`)
            return await res.arrayBuffer()
          } catch (error) {
            if (attempt === 5) throw error
            await new Promise((resolve) => setTimeout(resolve, 2000 * attempt))
          }
        }
      } finally {
        release()
      }
    },
  }
}

const text = fs.readFileSync(CONFIG, 'utf8')
const config = yaml.load(text)
// The impact.yaml names (kind/owner/name, `*` for any run of characters) as one pattern per kind.
const patterns = { datasets: [], models: [] }
for (const entry of config.software) {
  for (const name of entry.huggingface ?? []) {
    const [kind, ...rest] = name.split('/')
    const escaped = rest.join('/').split('*').map((part) => part.replace(/[.+?^${}()|[\]\\]/g, '\\$&'))
    patterns[kind].push(new RegExp(`^${escaped.join('.*')}$`))
  }
}

const snapshots = []
for (const snapshot of SNAPSHOTS) {
  const downloads = {}
  for (const kind of ['datasets', 'models']) {
    if (!patterns[kind].length) continue
    const url = `${STATS}/${snapshot[kind]}/${kind}.parquet`
    console.log(`reading ${kind} of ${snapshot.day} (${snapshot[kind].slice(0, 8)})`)
    const file = cachedAsyncBuffer(await rangedFile(url))
    const rows = await parquetReadObjects({ file, columns: ['id', 'downloadsAllTime'] })
    for (const { id, downloadsAllTime } of rows) {
      if (patterns[kind].some((re) => re.test(id))) downloads[`${kind}/${id}`] = Number(downloadsAllTime ?? 0)
    }
  }
  // A repository renamed since keeps its downloads under its old name in the snapshot; the Hub API redirects the
  // old name, so record them under the name impact.yaml and the live statistics use.
  for (const id of Object.keys(downloads)) {
    const [kind, ...rest] = id.split('/')
    const res = await fetch(`https://huggingface.co/api/${kind}/${rest.join('/')}`)
    const current = res.ok ? `${kind}/${(await res.json()).id}` : id
    if (current !== id) {
      console.log(`  ${id} is now ${current}`)
      downloads[current] = (downloads[current] ?? 0) + downloads[id]
      delete downloads[id]
    }
  }
  console.log(`  ${Object.keys(downloads).length} repositories`)
  snapshots.push({
    day: snapshot.day,
    source: `cfahlgren1/hub-stats, datasets@${snapshot.datasets.slice(0, 8)}, models@${snapshot.models.slice(0, 8)}`,
    downloads: Object.fromEntries(Object.entries(downloads).sort()),
  })
}

// Rewrite only the huggingfaceSnapshots block, keeping the rest of the file and its comments as they are.
const block = `huggingfaceSnapshots:\n${snapshots
  .map((s) =>
    [
      `  - day: ${s.day}`,
      `    source: '${s.source}'`,
      '    downloads:',
      ...Object.entries(s.downloads).map(([id, n]) => `      '${id}': ${n}`),
    ].join('\n'),
  )
  .join('\n')}\n`
const updated = text.replace(/^huggingfaceSnapshots:[\s\S]*?(?=^\S)/m, `${block}\n`)
if (updated === text) throw new Error('site/data/impact.yaml has no huggingfaceSnapshots key to replace')
fs.writeFileSync(CONFIG, updated)
console.log(`wrote ${snapshots.length} snapshots to ${path.relative(ROOT, CONFIG)}`)
