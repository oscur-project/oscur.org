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

export function describe(error: z.ZodError): string {
  return z.prettifyError(error)
}
