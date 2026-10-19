// One-time: builds the site's images from the WordPress export (migration/raw/uploads), from EVL's news photos
// and from the project's own repositories. Logos become small PNG or WebP, photos and figures WebP of at most
// 1600 px (wide diagrams keep 2000 px so their labels stay legible), and news images are converted to WebP with
// their Markdown references updated.
//
// Run from the repo root after scripts/migrate/wp-export.mjs: node scripts/media/prepare-assets.mjs

import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const RAW = path.join(ROOT, 'migration/raw/uploads')
const PUBLIC = path.join(ROOT, 'site/public')
const MEDIA = path.join(PUBLIC, 'media')

const src = (p) => path.join(RAW, p)
const BRAND = '#284b63'

// The round OSCUR emblem as PNG favicons. Its SVG versions (the home page hero, posts without a picture,
// /favicon.svg) are traced from the same image by scripts/media/trace-emblem.py.
const ICONS = [
  { from: src('2024/07/icon.png'), to: '../favicon-192.png', size: 192 },
  { from: src('2024/07/icon.png'), to: '../favicon-32.png', size: 32 },
]

// The OSCUR wordmark for the navbar (black on light, white on dark), and the footer's institution logos:
// fixed height, trimmed.
const STRIPS = [
  { from: src('2024/07/logo-1.png'), to: 'brand/oscur-wordmark.png', height: 64 },
  { from: src('2024/07/logo-white.png'), to: 'brand/oscur-wordmark-white.png', height: 64 },
  { from: src('2024/07/nyu.png'), to: 'institutions/nyu.png', height: 96 },
  { from: src('2024/07/uic.png'), to: 'institutions/uic.png', height: 96 },
  { from: src('2024/07/uw.png'), to: 'institutions/uw.png', height: 96 },
]

// Diagrams and figures of the old pages. `width` is the widest they get; text-heavy diagrams keep more pixels.
const IMAGES = [
  { from: src('2024/07/oscurs-2.png'), to: 'overview/components.webp', width: 1600 },
  { from: src('2024/09/partners2.png'), to: 'partners/partners.webp', width: 2000, quality: 90 },
]

// The PIs' photos on the team page, shown round at 96 px. `extract` crops a photo whose face is small in the frame.
const PHOTOS = [
  { from: src('2024/07/csilva.jpg'), to: 'team/csilva.webp' },
  { from: src('2024/07/juliana-friere.jpg'), to: 'team/jfreire.webp' },
  { from: src('2024/07/gdphoto1.jpg'), to: 'team/gdove.webp' },
  { from: src('2024/07/fabio-miranda-6-large.jpg'), to: 'team/fmiranda.webp' },
  { from: src('2024/07/id_pic.jpg'), to: 'team/sderrible.webp' },
  { from: src('2024/07/UIC-MPA-Faculty_Fusi_Federica-1090x1090-1.jpg'), to: 'team/ffusi.webp' },
  { from: src('2024/07/JonFroehlich_PhotoByDennisWise.jpg'), to: 'team/jfroehlich.webp', extract: { left: 135, top: 15, width: 360, height: 360 } },
]

// Pictures of the news posts that come from elsewhere: EVL's posts about the same events, and the projects' own
// repositories.
const EVL = 'https://www.evl.uic.edu/images'
const NEWS = [
  { from: `${EVL}/cities_in_motion_resized.png-srcw.jpg`, to: 'news/cities-in-motion-workshop-at-uic/cities-in-motion.webp' },
  { from: `${EVL}/coe_awards2026.png-srcw.jpg`, to: 'news/coe-awards-for-gustavo-moreira-and-leonardo-ferreira/coe-awards-2026.webp' },
  { from: `${EVL}/chuli_evl_visit_2026.png-srcw.jpg`, to: 'news/chu-li-visits-evl/chu-li-at-evl.webp' },
  { from: `${EVL}/ssrabanti_phd_2026b.png-srcw.jpg`, to: 'news/sanjana-srabanti-defends-her-phd/defense.webp' },
  { from: `${EVL}/gmoreira_phd_2026.jpg-srcw.jpg`, to: 'news/gustavo-moreira-defends-his-phd/defense.webp' },
  { from: `${EVL}/froehlich_evl_2026.jpg-srcw.jpg`, to: 'news/jon-froehlich-seminar-at-evl/seminar.webp' },
  {
    from: 'https://raw.githubusercontent.com/VIDA-NYU/urbanTrace/main/docs/screenshots/urbantrace_v4_preview.png',
    to: 'news/urbantrace-accepted-to-ieee-vis-2026/urbantrace.webp',
  },
  {
    from: src('2024/07/JonFroehlich_PhotoByDennisWise.jpg'),
    to: 'news/jon-froehlich-receives-the-2026-acm-sigchi-societal-impact-award/jon-froehlich.webp',
  },
]

async function input(from) {
  if (!from.startsWith('http')) return fs.readFile(from)
  const res = await fetch(from, { headers: { 'User-Agent': 'oscur.org media (https://github.com/oscur-project/oscur.org)' } })
  if (!res.ok) throw new Error(`${res.status} ${from}`)
  return Buffer.from(await res.arrayBuffer())
}

async function write(image, to) {
  const out = path.join(MEDIA, to)
  await fs.mkdir(path.dirname(out), { recursive: true })
  const info = await image.toFile(out)
  console.log(`${path.relative(ROOT, out)}  ${info.width}x${info.height}  ${Math.round(info.size / 1024)} KB`)
  return info
}

for (const { from, to, size } of ICONS) {
  const image = sharp(await input(from))
    .trim({ threshold: 5 })
    .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
  await write(to.endsWith('.webp') ? image.webp({ quality: 90 }) : image.png({ compressionLevel: 9, palette: size <= 64 }), to)
}

for (const { from, to, height } of STRIPS) {
  await write(sharp(await input(from)).trim({ threshold: 5 }).resize({ height }).png({ compressionLevel: 9 }), to)
}

for (const { from, to, width, quality = 85 } of IMAGES) {
  await write(sharp(await input(from)).resize({ width, withoutEnlargement: true }).webp({ quality }), to)
}

for (const { from, to, extract } of PHOTOS) {
  const image = sharp(await input(from))
  if (extract) image.extract(extract)
  await write(image.resize(320, 320, { fit: 'cover', position: 'attention', withoutEnlargement: true }).webp({ quality: 82 }), to)
}

for (const { from, to } of NEWS) {
  await write(sharp(await input(from)).resize({ width: 1600, withoutEnlargement: true }).webp({ quality: 82 }), to)
}

// Open Graph image: the black wordmark on white, 1200x630, with a bar in the brand color.
{
  const logo = await sharp(src('2024/07/logo-1.png')).trim({ threshold: 5 }).resize({ width: 900 }).toBuffer()
  const meta = await sharp(logo).metadata()
  const card = sharp({ create: { width: 1200, height: 630, channels: 3, background: '#ffffff' } }).composite([
    { input: logo, left: Math.round((1200 - meta.width) / 2), top: Math.round((630 - meta.height) / 2) },
    { input: Buffer.from(`<svg width="1200" height="12"><rect width="1200" height="12" fill="${BRAND}"/></svg>`), left: 0, top: 618 },
  ])
  await write(card.png({ compressionLevel: 9 }), 'brand/oscur-social.png')
}

// The migrated posts' images: WebP at most 1600 px next to the originals (a WebP over the media budget is
// re-encoded too), then the posts point at them.
const BUDGET = 500 * 1024
const newsMedia = path.join(MEDIA, 'news')
const renamed = new Map()
for (const slug of await fs.readdir(newsMedia)) {
  for (const file of await fs.readdir(path.join(newsMedia, slug))) {
    const from = path.join(newsMedia, slug, file)
    if (file.endsWith('.webp') && (await fs.stat(from)).size <= BUDGET) continue
    // WordPress adds -e<timestamp> to an image edited in place; the cleaned name reads better in the repo.
    const name = `${file.replace(/\.[a-z0-9]+$/i, '').replace(/-e\d{10,}$/, '').replace(/_/g, '-')}.webp`
    const original = await fs.readFile(from)
    await write(sharp(original).resize({ width: 1600, withoutEnlargement: true }).webp({ quality: 80 }), path.join('news', slug, name))
    if (name !== file) {
      await fs.rm(from)
      renamed.set(`/media/news/${slug}/${file}`, `/media/news/${slug}/${name}`)
    }
  }
}
async function* markdown(dir) {
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) yield* markdown(full)
    else if (entry.name.endsWith('.md')) yield full
  }
}
for await (const file of markdown(path.join(ROOT, 'site/news'))) {
  let text = await fs.readFile(file, 'utf8')
  for (const [from, to] of renamed) text = text.split(from).join(to)
  await fs.writeFile(file, text)
}
console.log(`news: ${renamed.size} images converted to WebP`)
