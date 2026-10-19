import { z } from 'zod'

const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/, 'expected a #rrggbb color')
const sitePath = z.string().regex(/^\//, 'expected a path starting with /')
const id = z.string().regex(/^[a-z0-9][a-z0-9-]*$/, 'expected a lowercase id such as curio or va-blueprint')
const href = z.string().regex(/^(https?:\/\/|\/)/, 'expected an http(s) URL or a path starting with /')

// site/data/topics.yaml: the Software page's sections and the Publications page's filters, in this order.
export const topicsSchema = z
  .array(z.object({ id, label: z.string(), description: z.string().optional(), color: hex }).strict())
  .min(1)

export const LINK_KINDS = [
  'website', 'demo', 'docs', 'github', 'pypi', 'npm', 'data', 'model', 'archive', 'tutorials', 'video',
] as const

const link = z
  .object({ kind: z.enum(LINK_KINDS), url: href, label: z.string().optional(), primary: z.boolean().optional() })
  .strict()

// site/data/software.yaml. Papers name their software in papers.bib (`software = {id}`), not here, so a card's
// papers have one source.
export const softwareSchema = z.array(
  z
    .object({
      id,
      name: z.string(),
      tagline: z.string().max(90, 'keep the tagline under 90 characters; longer text goes in description'),
      description: z.string().optional(),
      topic: id,
      institutions: z.array(id).min(1),
      links: z.array(link).default([]),
      logo: sitePath.optional(),
      logoOnDark: sitePath.optional(),
      monogram: z.string().max(3).optional(),
      status: z.string().max(32, 'keep the status under 32 characters: it is a badge that does not wrap').optional(),
    })
    .strict()
    .refine((s) => !s.logoOnDark || s.logo, { message: 'logoOnDark needs a logo', path: ['logoOnDark'] }),
)

export type SoftwareEntry = z.infer<typeof softwareSchema>[number]

export const teamSchema = z
  .object({
    institutions: z.array(z.object({ id, name: z.string(), short: z.string(), url: z.string().optional() }).strict()),
    // The lists of /team/, in order. `cards`: photo cards in one column per institution (the PIs).
    groups: z.array(z.object({ id, label: z.string(), cards: z.boolean().optional() }).strict()).min(1),
    people: z.array(
      z
        .object({
          id,
          name: z.string(),
          url: z.string().optional(),
          // The OSCUR site the person works with; collaborators elsewhere name their own institution.
          institution: id.optional(),
          group: id.optional(),
          role: z.string().optional(),
          photo: sitePath.optional(),
          alumni: z.boolean().optional(),
          note: z.string().optional(),
          // false: an author whose name links from the papers, but who is not on /team/.
          listed: z.boolean().optional(),
          aliases: z.array(z.string()).optional(),
        })
        .strict()
        .refine((p) => p.listed === false || p.alumni || p.group, { message: 'a listed person needs a group, or alumni: true', path: ['group'] })
        .refine((p) => p.listed === false || p.institution, { message: 'a listed person needs an institution', path: ['institution'] }),
    ),
  })
  .strict()

export const newsSchema = z
  .object({
    title: z.string(),
    date: z.coerce.date(),
    image: sitePath.optional(),
    // `contain` for images that are logos or wide banners, which a cover crop would cut.
    imageFit: z.enum(['cover', 'contain']).optional(),
    // VitePress writes the page description into the HTML without escaping it.
    excerpt: z
      .string()
      .refine((s) => !s.includes('"'), 'use typographic quotes (“ ”) in an excerpt')
      .optional(),
  })
  .strict()

const day = z.coerce.date().transform((d) => d.toISOString().slice(0, 10))

const reported = z
  .object({
    name: z.string(),
    detail: z.string().optional(),
    url: z.string().optional(),
    date: day.optional(),
    year: z.number().int().positive().optional(),
    attendance: z.number().int().nonnegative().optional(),
  })
  .strict()
  .refine((item) => item.date || item.year, 'an item needs a date or an award year')

// A Hugging Face repository as kind/owner/name; `*` in the name matches any run of characters.
const hfRepo = z.string().regex(/^(datasets|models)\/[\w.-]+\/[\w.*-]+$/, 'expected datasets/<owner>/<name> or models/<owner>/<name>')

// site/data/impact.yaml: what /impact/ counts, and the rows only the team can report.
export const impactSchema = z
  .object({
    award: z
      .object({
        start: day.refine((d) => d.endsWith('-01'), 'the award must start on the first of a month'),
        years: z.number().int().positive(),
      })
      .strict(),
    npmOrg: z.string().optional(),
    npmSkip: z.array(z.string()).default([]),
    // The repositories and packages behind the software rows; `software` is an id in software.yaml.
    software: z.array(
      z
        .object({
          software: id,
          repos: z.array(z.string().regex(/^[\w.-]+\/[\w.-]+$/, 'expected owner/name')).min(1),
          pypi: z.array(z.string()).default([]),
          npm: z.array(z.string()).default([]),
          huggingface: z.array(hfRepo).default([]),
        })
        .strict(),
    ),
    internal: z.array(
      z.object({ id: z.string(), name: z.string(), domains: z.array(z.string()), profile: z.array(z.string()) }).strict(),
    ),
    people: z.array(z.object({ ids: z.array(z.string()).min(1), institution: z.string().optional() }).strict()).default([]),
    curio: z
      .object({
        repo: z.string(),
        demos: z.array(z.number().int()),
        inPapers: z.array(z.number().int()).default([]),
      })
      .strict(),
    // Keys in papers.bib whose use cases are not urban, so the Use cases row leaves them out.
    nonUrbanPapers: z.array(z.string()).default([]),
    instances: z.array(z.string().url()).default([]),
    history: z.string().url(),
    // The day history.json was first published; from then on a missing history fails the collection instead of
    // starting the counts over.
    historySince: day.optional(),
    // All-time Hugging Face downloads of each repository on past days, from before the history began
    // (scripts/impact/hf-backfill.mjs reads them from the public cfahlgren1/hub-stats snapshots).
    huggingfaceSnapshots: z
      .array(z.object({ day, source: z.string(), downloads: z.record(z.string(), z.number().int().nonnegative()) }).strict())
      .default([]),
    deployments: z.array(reported).default([]),
    datasets: z.array(reported).default([]),
    workshops: z.array(reported).default([]),
    hackathons: z.array(reported).default([]),
    tutorials: z.array(reported).default([]),
    courses: z.array(reported).default([]),
    internships: z.array(reported).default([]),
  })
  .strict()

export type ImpactConfig = z.infer<typeof impactSchema>

export function describe(error: z.ZodError): string {
  return z.prettifyError(error)
}
