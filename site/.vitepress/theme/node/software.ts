import fs from 'node:fs'
import path from 'node:path'
import yaml from 'js-yaml'
import { loadPapers } from './bib'
import { deriveAccent } from './color'
import { DATA_DIR } from './paths'
import { describe, softwareSchema, topicsSchema, type SoftwareEntry } from './schema'
import { loadTeam } from './team'

export interface Topic {
  id: string
  label: string
  description: string | null
  color: string
  accent: string
  accentLight: string
  accentDark: string
}

// What the Software page, the papers' tags and the impact rows need to know about a tool.
export interface SoftwareSummary {
  id: string
  url: string
  name: string
  tagline: string
  description: string | null
  topic: string
  institutions: { id: string; short: string; name: string; url: string | null }[]
  links: SoftwareEntry['links']
  logo: string | null
  logoOnDark: string | null
  monogram: string
  status: string | null
  accent: string
  accentLight: string
  accentDark: string
  // papers.bib keys of the papers that name this software, in the order of the file.
  papers: string[]
}

function readYaml(name: string): unknown {
  return yaml.load(fs.readFileSync(path.join(DATA_DIR, name), 'utf8'))
}

export function loadTopics(): Topic[] {
  const parsed = topicsSchema.safeParse(readYaml('topics.yaml'))
  if (!parsed.success) throw new Error(`site/data/topics.yaml is invalid:\n${describe(parsed.error)}`)
  const seen = new Set<string>()
  return parsed.data.map((topic) => {
    if (seen.has(topic.id)) throw new Error(`site/data/topics.yaml: duplicate id ${topic.id}`)
    seen.add(topic.id)
    return { ...topic, description: topic.description ?? null, ...deriveAccent(topic.color) }
  })
}

function monogramOf(name: string): string {
  const words = name.split(/[\s-]+/).filter(Boolean)
  return (words.length > 1 ? words.slice(0, 2).map((w) => w[0]) : [name[0]]).join('').toUpperCase()
}

// Every topic, institution and software id a file names must exist; a typo fails the build here instead of
// leaving a card or a tag pointing nowhere.
export function loadSoftware(): SoftwareSummary[] {
  const parsed = softwareSchema.safeParse(readYaml('software.yaml'))
  if (!parsed.success) throw new Error(`site/data/software.yaml is invalid:\n${describe(parsed.error)}`)
  const topics = new Map(loadTopics().map((t) => [t.id, t]))
  const institutions = new Map(loadTeam().institutions.map((i) => [i.id, i]))
  const papers = loadPapers()
  const problems: string[] = []
  const ids = new Set<string>()
  for (const s of parsed.data) {
    if (ids.has(s.id)) problems.push(`duplicate software id ${s.id}`)
    ids.add(s.id)
    if (!topics.has(s.topic)) problems.push(`${s.id}: unknown topic "${s.topic}" (see site/data/topics.yaml)`)
    for (const i of s.institutions) if (!institutions.has(i)) problems.push(`${s.id}: unknown institution "${i}" (see site/data/team.yaml)`)
  }
  if (problems.length) throw new Error(`site/data/software.yaml: ${problems.join('; ')}`)
  for (const paper of papers) {
    for (const id of paper.software) if (!ids.has(id)) problems.push(`${paper.key} names unknown software "${id}"`)
    for (const id of paper.topics) if (!topics.has(id)) problems.push(`${paper.key} has unknown topic "${id}"`)
  }
  if (problems.length) throw new Error(`papers.bib: ${problems.join('; ')}`)

  return parsed.data.map((s) => {
    const topic = topics.get(s.topic)!
    return {
      id: s.id,
      url: `/software/#${s.id}`,
      name: s.name,
      tagline: s.tagline,
      description: s.description ?? null,
      topic: s.topic,
      institutions: s.institutions.map((id) => {
        const i = institutions.get(id)!
        return { id, short: i.short, name: i.name, url: i.url ?? null }
      }),
      links: s.links,
      logo: s.logo ?? null,
      logoOnDark: s.logoOnDark ?? null,
      monogram: s.monogram ?? monogramOf(s.name),
      status: s.status ?? null,
      accent: topic.accent,
      accentLight: topic.accentLight,
      accentDark: topic.accentDark,
      papers: papers.filter((p) => p.software.includes(s.id)).map((p) => p.key),
    }
  })
}
