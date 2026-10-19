import fs from 'node:fs'
import path from 'node:path'
import { parse, type Entry } from '@retorquere/bibtex-parser'
import { DATA_DIR } from './paths'

// Fields that only this site reads. They are removed from the BibTeX that visitors copy.
export const SITE_FIELDS = ['software', 'topic', 'presented', 'status', 'page', 'pdf', 'code', 'video', 'award']

export interface Paper {
  key: string
  type: string
  title: string
  authors: string[]
  venue: string
  presented: string | null
  year: number
  // The issue month; a preprint without one takes the month of its arXiv id. Null when neither says.
  month: number | null
  doi: string | null
  arxiv: string | null
  url: string | null
  pdf: string | null
  code: string | null
  video: string | null
  page: string | null
  award: string | null
  // For instance "To appear", shown as a badge after the venue.
  status: string | null
  // Software ids (site/data/software.yaml); the paper is listed on their cards and filed under their topics.
  software: string[]
  // Topic ids from the `topic` field; papers.data.ts adds the topics of the paper's software.
  topics: string[]
  bibtex: string
}

function clean(text: string | undefined): string {
  // The parser writes {\'\i} as a dotless i plus a combining accent.
  return (text ?? '').replace(/ı́/g, 'í').normalize('NFC').replace(/\s+/g, ' ').trim()
}

// Splits the body of a raw entry into its top-level `name = value` fields and drops the named ones.
export function stripFields(raw: string, names: string[]): string {
  const drop = new Set(names.map((n) => n.toLowerCase()))
  const keyEnd = raw.indexOf(',')
  const head = raw.slice(0, keyEnd + 1).trim()
  const body = raw.slice(keyEnd + 1, raw.lastIndexOf('}'))
  const fields: string[] = []
  let depth = 0
  let quoted = false
  let start = 0
  for (let i = 0; i < body.length; i++) {
    const ch = body[i]
    if (ch === '{') depth++
    else if (ch === '}') depth--
    else if (ch === '"' && depth === 0) quoted = !quoted
    else if (ch === ',' && depth === 0 && !quoted) {
      fields.push(body.slice(start, i))
      start = i + 1
    }
  }
  fields.push(body.slice(start))
  const kept = fields
    .map((f) => f.replace(/^\s*%.*$/gm, '').trim())
    .filter((f) => f && !drop.has(f.split('=')[0].trim().toLowerCase()))
    .map((f) => `  ${f.replace(/\s*=\s*/, ' = ')}`)
  return `${head}\n${kept.join(',\n')}\n}`
}

function list(value: string | undefined): string[] {
  return (value ?? '').split(',').map((v) => v.trim()).filter(Boolean)
}

// The parser returns list fields such as publisher and school as arrays.
function first(value: unknown): string | undefined {
  return Array.isArray(value) ? value[0] : (value as string | undefined)
}

function monthOf(value: unknown, arxiv: string | null, year: number): number | null {
  const month = Number.parseInt(String(value ?? ''), 10)
  if (month >= 1 && month <= 12) return month
  const id = arxiv ? /^(\d{2})(\d{2})\./.exec(arxiv) : null
  return id && 2000 + Number(id[1]) === year ? Number(id[2]) : null
}

function venueOf(entry: Entry, f: Record<string, any>, arxiv: string | null): string {
  const venue = f.journal ?? f.journaltitle ?? f.booktitle
  if (venue) return clean(venue)
  if (entry.type === 'phdthesis') return clean(`Ph.D. dissertation, ${first(f.school) ?? first(f.institution) ?? ''}`.replace(/, $/, ''))
  return clean(arxiv ? 'arXiv preprint' : first(f.publisher))
}

function toPaper(entry: Entry): Paper {
  const f = entry.fields as Record<string, any>
  const year = Number.parseInt(f.year ?? f.date ?? '', 10)
  if (!Number.isFinite(year)) throw new Error(`papers.bib: ${entry.key} has no year`)
  if (!f.title) throw new Error(`papers.bib: ${entry.key} has no title`)
  const arxiv =
    (f.archiveprefix ?? '').toLowerCase() === 'arxiv' || (f.eprinttype ?? '').toLowerCase() === 'arxiv'
      ? clean(f.eprint)
      : null
  return {
    key: entry.key,
    type: entry.type,
    title: clean(f.title),
    authors: (f.author ?? []).map((a: any) =>
      clean(a.name ?? [a.firstName, a.prefix, a.lastName, a.suffix].filter(Boolean).join(' ')),
    ),
    venue: venueOf(entry, f, arxiv),
    presented: f.presented ? clean(f.presented) : null,
    year,
    month: monthOf(f.month, arxiv, year),
    doi: f.doi ? clean(f.doi) : null,
    arxiv,
    url: f.url ? clean(f.url) : null,
    pdf: f.pdf ?? null,
    code: f.code ?? null,
    video: f.video ?? null,
    page: f.page ?? null,
    award: f.award ? clean(f.award) : null,
    status: f.status ? clean(f.status) : null,
    software: list(f.software),
    topics: list(f.topic),
    bibtex: stripFields(entry.input, SITE_FIELDS),
  }
}

export function loadPapers(file = path.join(DATA_DIR, 'papers.bib')): Paper[] {
  const library = parse(fs.readFileSync(file, 'utf8'), {
    sentenceCase: false,
    caseProtection: false,
    verbatimFields: ['url', 'doi', 'eprint', 'pdf', 'code', 'video', 'page', /^file$/],
  })
  if (library.errors.length) {
    throw new Error(`papers.bib: ${library.errors.map((e) => JSON.stringify(e)).join('; ')}`)
  }
  const seen = new Set<string>()
  for (const entry of library.entries) {
    if (seen.has(entry.key)) throw new Error(`papers.bib: duplicate key ${entry.key}`)
    seen.add(entry.key)
  }
  // Newest year first; within a year, the order of the file (the sort is stable).
  return library.entries.map(toPaper).sort((a, b) => b.year - a.year)
}
