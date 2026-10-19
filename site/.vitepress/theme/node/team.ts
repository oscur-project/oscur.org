import fs from 'node:fs'
import path from 'node:path'
import yaml from 'js-yaml'
import { DATA_DIR } from './paths'
import { describe, teamSchema } from './schema'

export interface Institution {
  id: string
  name: string
  short: string
  url?: string
}

export interface Group {
  id: string
  label: string
  cards?: boolean
}

export interface Person {
  id: string
  name: string
  url?: string
  institution?: string
  group?: string
  role?: string
  photo?: string
  alumni?: boolean
  note?: string
  listed?: boolean
  aliases?: string[]
}

export interface Team {
  institutions: Institution[]
  groups: Group[]
  people: Person[]
}

function duplicates(values: string[]): string[] {
  const seen = new Set<string>()
  return values.filter((value) => (seen.has(value) ? true : (seen.add(value), false)))
}

export function loadTeam(file = path.join(DATA_DIR, 'team.yaml')): Team {
  const parsed = teamSchema.safeParse(yaml.load(fs.readFileSync(file, 'utf8')))
  if (!parsed.success) throw new Error(`site/data/team.yaml is invalid:\n${describe(parsed.error)}`)
  const team = parsed.data
  const problems = [
    ...duplicates(team.institutions.map((i) => i.id)).map((id) => `duplicate institution id ${id}`),
    ...duplicates(team.groups.map((g) => g.id)).map((id) => `duplicate group id ${id}`),
    ...duplicates(team.people.map((p) => p.id)).map((id) => `duplicate person id ${id}`),
    // An author name that matches two people could link to either of them.
    ...duplicates(team.people.flatMap((p) => [p.name, ...(p.aliases ?? [])])).map((name) => `"${name}" names two people`),
  ]
  const institutions = new Set(team.institutions.map((i) => i.id))
  const groups = new Set(team.groups.map((g) => g.id))
  for (const person of team.people) {
    if (person.institution && !institutions.has(person.institution)) problems.push(`${person.id} has unknown institution ${person.institution}`)
    if (person.group && !groups.has(person.group)) problems.push(`${person.id} has unknown group ${person.group}`)
  }
  if (problems.length) throw new Error(`site/data/team.yaml: ${problems.join('; ')}`)
  return team
}
