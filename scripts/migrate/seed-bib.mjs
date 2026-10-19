// One-time: builds site/data/papers.bib from the papers of the old site and of the NSF annual reports for
// 2024-25 and 2025-26. Each entry is fetched as BibTeX from doi.org (or arXiv when there is no DOI), re-keyed,
// reformatted one field per line, and given the site-only fields (software, topic, presented, status, page,
// code, pdf) that the pages read. Papers with neither a DOI nor an arXiv record are written from `fields`.
// After the first run the file is edited by hand.
//
// Run from the repo root: node scripts/migrate/seed-bib.mjs

import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const OUT = path.join(ROOT, 'site/data/papers.bib')
const CHECKED = '2026-10-19'

const TVCG = '{IEEE Transactions on Visualization and Computer Graphics}'
const UIST26 = '{Proceedings of the 39th Annual ACM Symposium on User Interface Software and Technology}'
const ICCV25 = '{Proceedings of the IEEE/CVF International Conference on Computer Vision (ICCV) Workshops}'

// Newest first within each year, "To appear" first; the site keeps this order within a year. `label` becomes the
// last part of the key. `type` and `override` adjust what the source returns; `pendingDoi` is a DOI the
// publisher assigned that doi.org does not resolve yet, so it is left out until it does.
const PAPERS = [
  // 2026
  {
    label: 'urbantrace', arxiv: '2607.25124', type: 'article', override: { journal: TVCG },
    presented: 'IEEE VIS 2026', status: 'To appear', software: ['urbantrace'], code: 'https://github.com/VIDA-NYU/urbanTrace',
  },
  {
    label: 'artscape', type: 'inproceedings', pendingDoi: '10.1145/3830398.3830557', status: 'To appear', software: ['artscape'],
    fields: {
      title: '{ArtScape: Detecting, Characterizing, and Interactively Exploring Urban Art at Scale Using Vision Language Models}',
      author: '{Jiang, Lucy and Hwang, Jared and Froehlich, Jon E.}',
      booktitle: UIST26,
      series: "{UIST '26}",
      publisher: '{Association for Computing Machinery}',
      year: '{2026}',
      month: 'nov',
    },
  },
  {
    label: 'landmarklens', arxiv: '2608.30142', type: 'inproceedings', pendingDoi: '10.1145/3830398.3830505',
    override: { booktitle: UIST26, series: "{UIST '26}", publisher: '{Association for Computing Machinery}', month: 'nov' },
    status: 'To appear', software: ['landmarklens'], code: 'https://github.com/makeabilitylab/landmarklens',
  },
  {
    label: 'artscapedemo', type: 'inproceedings', pendingDoi: '10.1145/3797867.3841240', status: 'To appear', software: ['artscape'],
    fields: {
      title: '{Expanding Access to Urban Art at Scale: A Demo of ArtScape}',
      author: '{Jiang, Lucy and Hwang, Jared and Froehlich, Jon E.}',
      booktitle: '{Proceedings of the 28th International ACM SIGACCESS Conference on Computers and Accessibility}',
      series: "{ASSETS '26}",
      publisher: '{Association for Computing Machinery}',
      year: '{2026}',
      month: 'oct',
    },
  },
  {
    label: 'autarkinaction', type: 'inproceedings', software: ['autark'],
    fields: {
      title: '{Autark in Action: Building Serverless Prototypes of Urban Visual Analytics Systems}',
      author:
        '{Rulff da Costa, Jo{\\~a}o Lucas and Alexandre, Lucas and Souza, Talisson and Moreira, Gustavo and Oliveira, Daniel and Doraiswamy, Harish and Miranda, Fabio and Silva, Claudio and Lage, Marcos}',
      booktitle: '{39th Conference on Graphics, Patterns and Images (SIBGRAPI 2026), Tutorials}',
      year: '{2026}',
      month: 'sep',
    },
  },
  { label: 'semantic', doi: '10.14778/3827998.3838712', topic: ['data'] },
  { label: 'mosaicjoin', doi: '10.14778/3836663.3836722', topic: ['data'], code: 'https://github.com/VIDA-NYU/MosaicJoin' },
  { label: 'conformal', doi: '10.1109/TVCG.2026.3679888', arxiv: '2602.03743', presented: 'IEEE VR 2026', topic: ['vis'] },
  { label: 'bikebutler', doi: '10.1145/3772318.3791292', software: ['bikebutler'], code: 'https://github.com/makeabilitylab/BikeButler' },
  { label: 'autoddg', doi: '10.1145/3786626', arxiv: '2502.01050', presented: 'SIGMOD 2026', software: ['autoddg'], code: 'https://github.com/VIDA-NYU/AutoDDG' },
  {
    label: 'neural', doi: '10.1109/TVCG.2025.3635528', arxiv: '2511.14742', software: ['neural-3d'],
    page: 'https://urbantk.org/neural-3d/', code: 'https://github.com/urban-toolkit/neural-3d',
  },
  {
    label: 'urbanite', doi: '10.1109/TVCG.2025.3634644', arxiv: '2508.07390', presented: 'IEEE VIS 2025', software: ['urbanite'],
    page: 'https://urbantk.org/urbanite/', code: 'https://github.com/urban-toolkit/urbanite',
  },
  {
    label: 'vablueprint', doi: '10.1109/TVCG.2025.3634809', arxiv: '2508.07497', presented: 'IEEE VIS 2025', software: ['va-blueprint'],
    page: 'https://urbantk.org/va-blueprint/', code: 'https://github.com/urban-toolkit/va-blueprint',
  },
  {
    label: 'streetweave', doi: '10.1109/TVCG.2025.3634647', arxiv: '2508.07496', presented: 'IEEE VIS 2025', software: ['streetweave'],
    page: 'https://urbantk.org/streetweave/', code: 'https://github.com/urban-toolkit/streetweave',
  },
  { label: 'tivy', doi: '10.1109/TVCG.2025.3633882', arxiv: '2507.18972', presented: 'IEEE VIS 2025', topic: ['vis'] },
  { label: 'autark', arxiv: '2604.20759', software: ['autark'], page: 'https://autarkjs.org', code: 'https://github.com/urban-toolkit/autark' },
  { label: 'urbanclipatlas', arxiv: '2604.15225', software: ['urbanclipatlas'], code: 'https://github.com/visual-ds/UrbanClipAtlas' },

  // 2025
  {
    label: 'benchmark', type: 'inproceedings', topic: ['ai'],
    fields: {
      title: '{StreetTransformer: A Large Scale Multimodal Benchmark for Change Detection in Urban Streets}',
      author: '{Atkins, Jon and Rulff, Joao and Silva, Claudio and Hosseini, Maryam}',
      booktitle: '{NeurIPS 2025 Workshop on UrbanAI: Harnessing Artificial Intelligence for Smart Cities}',
      year: '{2025}',
      month: 'dec',
    },
  },
  { label: 'streetview', doi: '10.1145/3764919.3770883', software: ['gsvantage'], code: 'https://github.com/makeabilitylab/GSVantage' },
  { label: 'precedent', doi: '10.1145/3764925.3770912', topic: ['ai'] },
  { label: 'park', doi: '10.1145/3663547.3746377', arxiv: '2509.25460', software: ['accessparkcv'], code: 'https://github.com/makeabilitylab/AccessParkCV' },
  { label: 'rampnet', doi: '10.1109/ICCVW69036.2025.00693', arxiv: '2508.09415', software: ['rampnet'], code: 'https://github.com/ProjectSidewalk/RampNet' },
  {
    label: 'geovisual', arxiv: '2508.15752', type: 'inproceedings', topic: ['ai'],
    override: { booktitle: ICCV25, note: undefined, month: 'oct' },
  },
  { label: 'hierarchical', doi: '10.1145/3736733.3736746', topic: ['data'] },
  { label: 'nightlight', doi: '10.1145/3706598.3714299', topic: ['ai'] },
  { label: 'magneto', doi: '10.14778/3742728.3742757', arxiv: '2412.08194', topic: ['data'], code: 'https://github.com/VIDA-NYU/magneto-matcher' },
  {
    label: 'llms', type: 'article', topic: ['data'],
    // The Bulletin's site serves this PDF over plain HTTP only; its HTTPS certificate does not match the host.
    pdf: 'http://sites.computer.org/debull/A25mar/p3.pdf',
    fields: {
      title: '{Large Language Models for Data Discovery and Integration: Challenges and Opportunities}',
      author:
        '{Freire, Juliana and Fan, Grace and Feuer, Benjamin and Koutras, Christos and Liu, Yurong and Pena, Eduardo and Santos, A{\\\'e}cio and Silva, Cl{\\\'a}udio and Wu, Eden}',
      journal: '{IEEE Data Engineering Bulletin}',
      year: '{2025}',
      month: 'mar',
    },
  },
  {
    label: 'dissertation', type: 'phdthesis', topic: ['vis'],
    fields: {
      title: '{Visual Analysis of Multimodal Sensor Data}',
      author: '{Rulff, Joao}',
      school: '{New York University}',
      year: '{2025}',
    },
  },
]

// `collection` is Crossref's repeat of `series` in ACM records.
const DROP = new Set(['url', 'issn', 'isbn', 'abstract', 'primaryclass', 'eprint', 'archiveprefix', 'note', 'collection'])

async function fetchBibtex(paper) {
  const url = paper.doi ? `https://doi.org/${paper.doi}` : `https://arxiv.org/bibtex/${paper.arxiv}`
  const res = await fetch(url, { headers: { Accept: 'application/x-bibtex; charset=utf-8', 'User-Agent': 'oscur.org migration' } })
  if (!res.ok) throw new Error(`${res.status} ${url}`)
  return (await res.text()).trim()
}

// Top-level `name = value` pairs of one entry, values kept verbatim.
function fields(entry) {
  const body = entry.slice(entry.indexOf(',') + 1, entry.lastIndexOf('}'))
  const out = []
  let depth = 0
  let quoted = false
  let start = 0
  for (let i = 0; i <= body.length; i++) {
    const ch = body[i]
    if (ch === '{') depth++
    else if (ch === '}') depth--
    else if (ch === '"' && depth === 0) quoted = !quoted
    else if ((ch === ',' || i === body.length) && depth === 0 && !quoted) {
      const part = body.slice(start, i).trim()
      if (part) {
        const eq = part.indexOf('=')
        out.push([part.slice(0, eq).trim().toLowerCase(), part.slice(eq + 1).trim()])
      }
      start = i + 1
    }
  }
  return out
}

function unbrace(value) {
  return value.replace(/^\{|\}$/g, '').replace(/^"|"$/g, '')
}

function ascii(text) {
  return text.normalize('NFD').replace(/\\[`'^"~=.]|[{}]/g, '').replace(/[^A-Za-z]/g, '').toLowerCase()
}

function firstAuthorLastName(authorValue) {
  const first = unbrace(authorValue).split(/\s+and\s+/)[0].trim()
  return first.includes(',') ? first.split(',')[0] : first.split(/\s+/).pop()
}

const lines = [
  '% Papers of OSCUR, newest year first; within a year the site keeps this order.',
  '% Standard fields come from the publisher (doi.org) or arXiv. Site-only fields, removed from the BibTeX visitors copy:',
  '%   software  = ids in site/data/software.yaml; the paper is listed on their cards and filed under their topics',
  '%   topic     = topic id (site/data/topics.yaml), for a paper without software',
  '%   presented = conference where a journal paper was presented',
  '%   status    = a badge after the venue, e.g. To appear',
  '%   page      = project page',
  '%   code, pdf, video, award',
  '',
]

for (const paper of PAPERS) {
  let type
  let kept
  if (paper.fields) {
    type = paper.type
    kept = Object.entries(paper.fields)
  } else {
    const raw = await fetchBibtex(paper)
    type = paper.type ?? raw.match(/^@(\w+)\s*\{/)[1].toLowerCase()
    kept = fields(raw).filter(([name]) => !DROP.has(name))
    // arXiv's record of a paper with a pending DOI already carries it; the DOI of an arXiv record itself
    // (10.48550/arXiv.*) duplicates the arXiv link.
    kept = kept.filter(([name, value]) => name !== 'doi' || !(paper.pendingDoi || /10\.48550\/arxiv/i.test(value)))
  }
  for (const [name, value] of Object.entries(paper.override ?? {})) {
    const index = kept.findIndex(([n]) => n === name)
    if (value === undefined) {
      if (index >= 0) kept.splice(index, 1)
    } else if (index >= 0) kept[index] = [name, value]
    else kept.push([name, value])
  }
  const get = (name) => kept.find(([n]) => n === name)?.[1]
  const year = unbrace(get('year') ?? '')
  const key = `${ascii(firstAuthorLastName(get('author') ?? '{Unknown}'))}${year}${paper.label}`
  const out = kept.map(([name, value]) => {
    // Crossref writes pages with a Unicode dash, months as capitalized words and & as an HTML entity.
    if (name === 'pages') value = value.replace(/–|—/g, '--')
    if (name === 'month') value = unbrace(value).slice(0, 3).toLowerCase()
    // Crossref titles can carry JATS markup (<i>…</i>) and line breaks, and arXiv titles straight quotes.
    if (name === 'title') value = value.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').replace(/"([^"]*)"/g, '“$1”')
    return [name, value.replace(/&amp;/g, '\\&')]
  })
  if (paper.arxiv) out.push(['eprint', `{${paper.arxiv}}`], ['archiveprefix', '{arXiv}'])
  if (paper.software?.length) out.push(['software', `{${paper.software.join(', ')}}`])
  if (paper.topic?.length) out.push(['topic', `{${paper.topic.join(', ')}}`])
  if (paper.presented) out.push(['presented', `{${paper.presented}}`])
  if (paper.status) out.push(['status', `{${paper.status}}`])
  if (paper.page) out.push(['page', `{${paper.page}}`])
  if (paper.code) out.push(['code', `{${paper.code}}`])
  if (paper.pdf) out.push(['pdf', `{${paper.pdf}}`])
  const width = Math.max(...out.map(([name]) => name.length))
  if (paper.pendingDoi) lines.push(`% DOI ${paper.pendingDoi} was not registered yet on ${CHECKED}; add it once https://doi.org/${paper.pendingDoi} resolves.`)
  lines.push(`@${type}{${key},`)
  lines.push(out.map(([name, value]) => `  ${name.padEnd(width)} = ${value}`).join(',\n'))
  lines.push('}', '')
  console.log(`${key}  <- ${paper.fields ? 'hand-written' : paper.doi ?? `arXiv:${paper.arxiv}`}`)
  // doi.org and arXiv ask clients not to hammer them.
  if (!paper.fields) await new Promise((resolve) => setTimeout(resolve, 1000))
}

await fs.mkdir(path.dirname(OUT), { recursive: true })
await fs.writeFile(OUT, `${lines.join('\n')}`)
console.log(`wrote ${path.relative(ROOT, OUT)}`)
