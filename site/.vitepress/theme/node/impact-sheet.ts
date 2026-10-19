import fs from 'node:fs'
import path from 'node:path'
import writeXlsxFile from 'write-excel-file/node'
import { SITE } from '../../site'
import { IMPACT_SHEET, impactHistory, type Impact, type ImpactLink } from './impact'

export const IMPACT_JSON = '/impact/impact.json'

// The counts every deploy recorded, published so the next deploy can extend them.
export function writeImpactHistory(outDir: string): void {
  const file = path.join(outDir, 'impact', 'history.json')
  fs.mkdirSync(path.dirname(file), { recursive: true })
  fs.writeFileSync(file, `${JSON.stringify(impactHistory(), null, 1)}\n`)
}

// The table's totals by year, for pages elsewhere that show some of them (the partner sites' pages can read
// any row by its id). Empty values are the ones the page shows as "Not available".
export function writeImpactJson(outDir: string, impact: Impact): void {
  const file = path.join(outDir, IMPACT_JSON)
  const json = {
    updated: impact.updated,
    url: `${SITE.hostname}/impact/`,
    years: impact.years.map(({ label, period, current }) => ({ label, period, current })),
    rows: impact.groups.flatMap((g) => g.rows.map(({ id, label, values }) => ({ id, group: g.label, label, values }))),
  }
  fs.mkdirSync(path.dirname(file), { recursive: true })
  fs.writeFileSync(file, `${JSON.stringify(json, null, 1)}\n`)
}

// The table of /impact/ as a one-sheet spreadsheet: a row per metric, with the per-project rows indented
// under their metric and the sources of each metric as links after its values. Empty cells are the ones the
// page shows as "Not available".
export async function writeImpactSheet(outDir: string, impact: Impact): Promise<void> {
  const number = (value: number | null) => (value === null ? null : { value, format: '#,##0' })
  const link = (l: ImpactLink) => ({
    type: 'Formula',
    value: `=HYPERLINK("${l.url}","${l.label.replace(/"/g, '""')}")`,
    textColor: '#0563C1',
    textDecoration: { underline: true },
  })
  const sources = Math.max(0, ...impact.groups.flatMap((g) => g.rows.map((r) => r.sources?.length ?? 0)))
  const rows: any[][] = [
    [{ value: `${SITE.title}: impact by award year`, fontWeight: 'bold' }],
    [{ value: `Last updated ${impact.updated}. ${SITE.hostname}/impact/` }],
    [{ value: 'How it is computed', fontWeight: 'bold' }, ...impact.method.map(link)],
    [],
    [
      ...['Category', 'Metric', ...impact.years.map((y) => `${y.label}: ${y.period}`)].map((value) => ({ value, fontWeight: 'bold' })),
      ...Array.from({ length: sources }, (_, i) => (i === 0 ? { value: 'Sources', fontWeight: 'bold' } : null)),
    ],
  ]
  for (const group of impact.groups) {
    group.rows.forEach((row, i) => {
      rows.push([
        i === 0 ? { value: group.label, fontWeight: 'bold' } : null,
        { value: row.label },
        ...row.values.map(number),
        ...(row.sources ?? []).map(link),
      ])
      for (const project of row.projects) rows.push([null, { value: project.name, indent: 1 }, ...project.values.map(number)])
      row.captions?.forEach((caption, year) => {
        if (caption) rows.push([null, { value: caption, indent: 1 }, ...row.values.map((v, j) => (j === year ? number(v) : null))])
      })
    })
  }

  const file = path.join(outDir, IMPACT_SHEET)
  fs.mkdirSync(path.dirname(file), { recursive: true })
  await writeXlsxFile(rows, {
    sheet: 'Impact',
    columns: [
      { width: 24 },
      { width: 52 },
      ...impact.years.map(() => ({ width: 30 })),
      ...Array.from({ length: sources }, () => ({ width: 40 })),
    ],
    stickyRowsCount: 5,
  }).toFile(file)
}
