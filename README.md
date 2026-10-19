# oscur.org

The website of OSCUR, the Open-Source Cyberinfrastructure for Urban Computing (NSF awards 2411221, 2411222 and 2411223), built with [VitePress](https://vitepress.dev/) and deployed to GitHub Pages on every push to `main`.

```bash
npm install
GITHUB_TOKEN="$(gh auth token)" npm run impact   # the numbers behind /impact/; needed once before dev and build
npm run dev       # http://localhost:5173
npm run build     # static site in site/.vitepress/dist
npm run preview   # the build as GitHub Pages serves it, http://localhost:4173
npm run check     # links, old WordPress URLs, redirects and media budgets of the build
```

Use Node 22 (`.nvmrc`).

## Where things live

| What | Where |
|---|---|
| Pages | `site/<page>/index.md`, served at `/<page>/`; the home page is `site/index.md` |
| Papers | `site/data/papers.bib` |
| Software | `site/data/software.yaml` |
| Topics (Software sections, Publications filters) | `site/data/topics.yaml` |
| People and institutions | `site/data/team.yaml` |
| News posts | `site/news/YYYY/MM/<slug>.md`, served at `/YYYY/MM/<slug>/` |
| Old URLs that redirect | `site/data/redirects.yaml` |
| Impact page: what to count, and the rows the team reports | `site/data/impact.yaml` |
| Images and logos | `site/public/media/` |
| Home page diagrams | `site/diagrams/` |
| Funding text, footer logos | `site/.vitepress/site.ts` |
| Theme (components, styles) | `site/.vitepress/theme/` |

Every data file is checked when the site builds: a typo, an unknown id or a broken cross-reference fails the build with a message naming the file and the field.

## Add software

Add an entry to `site/data/software.yaml`, in its topic's section:

```yaml
- id: curio                       # the card's anchor, /software/#curio
  name: Curio
  tagline: Dataflow framework for collaborative urban visual analytics   # at most 90 characters
  description: One or two sentences.          # optional
  topic: workflows                # an id in site/data/topics.yaml; it also sets the card's color
  institutions: [uic]             # ids in site/data/team.yaml
  logo: /media/software/curio/logo.webp       # optional; without one the card shows `monogram` or initials
  status: In development          # optional badge
  links:
    - { kind: website, url: "https://curio.urbantk.org", label: Guide }
    - { kind: github, url: "https://github.com/urban-toolkit/curio" }
```

Link kinds are website, demo, docs, github, pypi, npm, data, model, archive, tutorials and video; the first link is the primary button unless one says `primary: true`. Logos go in `site/public/media/software/<id>/`, square, as WebP of at most 160 px or SVG (with `logoOnDark` for a dark-mode version). A card lists the papers that name it in `papers.bib`.

## Add a paper

Add the entry to `site/data/papers.bib`. Doi.org returns it for any DOI:

```bash
curl -LH "Accept: application/x-bibtex" https://doi.org/10.1109/TVCG.2025.3634644
```

Then add the fields that only this site reads (they are removed from the BibTeX that visitors copy):

```bibtex
  software  = {urbanite},           % ids in software.yaml; the paper is filed under their topics
  topic     = {vis},                % for a paper without software: a topic id from topics.yaml
  presented = {IEEE VIS 2025},      % conference, for journal papers presented at one
  status    = {To appear},          % a badge after the venue
  page      = {https://urbantk.org/urbanite/},
  code      = {https://github.com/urban-toolkit/urbanite},
  eprint    = {2508.07390},         % with archiveprefix = {arXiv}, adds an arXiv link
  archiveprefix = {arXiv},
```

`pdf`, `video` and `award` are also available. A paper that describes one of the tools but is not an OSCUR publication, such as Curio's IEEE VIS 2024 paper, goes at the end of the file with `listed = {false}`: its software's card lists it, while the Publications and impact pages leave it out. Papers are grouped by the year of their issue; within a year they appear in the order of the file, "To appear" first. When a pending DOI starts to resolve (the file notes which), add it and drop `status`; the impact page counts a paper as a publication from then on.

## Add a news post

Create `site/news/YYYY/MM/<slug>.md`:

```markdown
---
title: "Paper accepted at IEEE VIS!"
date: 2026-08-12
image: /media/news/<slug>/image.webp
excerpt: "One or two sentences for the news list and for search engines."
---

The post, in Markdown.
```

Add `imageFit: contain` when the image is a logo, a flyer or a portrait that should not be cropped. A post without an image shows the OSCUR emblem. Write quotes in the excerpt as “ ” rather than ": the excerpt becomes the page's meta description.

## Add a person

Add them to `site/data/team.yaml` with an `institution` and a `group` (PIs, research scientists, research staff, PhD students, students, interns), or `alumni: true` and a `note` on what they do now. PIs get a `photo` (a square WebP in `site/public/media/team/`). Author names in `papers.bib` that match a person's `name` or one of their `aliases` link to their `url`.

## Diagrams and the emblem

The home page's three diagrams are SVG files in `site/diagrams/`. `site/index.md` inlines them, so they follow the light and dark themes and use the site's font. Their colors are classes that read the `--oscur-dg-*` variables in `site/.vitepress/theme/styles/vars.css`, which hold one value per theme; each file keeps the light values as fallbacks, so it also opens on its own. Labels are text: edit them in the file.

The emblem comes in a version for each theme, `site/public/media/brand/oscur-emblem.svg` and `oscur-emblem-dark.svg`: the home page hero and the news without a picture show the one that matches. `/favicon.svg` switches with the browser's theme. `scripts/media/trace-emblem.py` traced all three from the WordPress icon.

## The impact page

`/impact/` shows adoption and outreach by award year, from September to August, across the tools of all three OSCUR sites. Every deploy collects its numbers before the build: `npm run impact` (`scripts/impact/collect.mjs`) reads GitHub, PyPI, npm, Hugging Face, Curio's repository and the papers' HTML versions on arXiv, and writes `.cache/impact/metrics.json`, which is not committed. The build turns it into the page, the spreadsheet at `/impact/oscur-impact.xlsx`, `/impact/impact.json` (the table's totals by year) and `/impact/history.json`. Deploy runs daily as well as on every push, so the history records Hugging Face downloads and Curio accounts as they change.

Stars come from GitHub's stargazers history, which any token can read on a public repository, so the workflow's own token is enough.

`site/data/impact.yaml` says what to count and holds what only the team knows:

- `software`: each tool's repositories, PyPI and npm packages and Hugging Face datasets and models, under their current names. Add an entry to count another tool. A `*` in an npm or Hugging Face name matches any run of characters among the owner's packages.
- `internal`: the institutions whose people are not external contributors, with their email domains and the words their members' GitHub profiles use; `people`: commit identities of one person that share no email, name or GitHub account.
- `curio.demos` and `curio.inPapers`: the Curio examples that show a feature, and those that reproduce the use case of a paper on the Publications page.
- `nonUrbanPapers`: papers whose use cases are not urban, which the Use cases row leaves out.
- `instances`: Curio's hosted apps, whose monitor API gives "Users at large".
- `history` and `historySince`: where the published history lives, and the day it began. Set `historySince` after the first deploy to oscur.org; from then on a missing history fails the deploy instead of starting the counts over.
- `huggingfaceSnapshots`: Hugging Face reports only all-time downloads, so a year's downloads are the change between snapshots. The snapshots before the history began come from the Hub's daily statistics (`cd scripts && npm install`, then `node scripts/impact/hf-backfill.mjs`).
- `deployments`, `datasets`, `workshops`, `hackathons`, `tutorials`, `courses`, `internships`: the rows the team reports. Each item has a `date` or an award `year`.

## Deployment

`.github/workflows/deploy.yml` collects the impact numbers, then builds, checks and deploys `main` to GitHub Pages. Pull requests run the same build and checks in `.github/workflows/ci.yml`. The custom domain is set in the repository's Pages settings and verified for the oscur-project organization.

DNS for oscur.org is at GoDaddy: the apex has A records 185.199.108.153, 185.199.109.153, 185.199.110.153 and 185.199.111.153 and AAAA records 2606:50c0:8000::153 through 2606:50c0:8003::153, and `www` is a CNAME to `oscur-project.github.io`. The domain is registered at GoDaddy too; keep its auto-renew on.

GitHub Pages has no server-side redirects. The build writes a small HTML page at each old URL in `site/data/redirects.yaml` and at each old WordPress year and month archive. `node scripts/check/dist.mjs --base https://oscur.org` checks every old URL against the live site.

## Migration from WordPress

The site replaced a GoDaddy-hosted WordPress site in 2026. `scripts/migrate/` holds the one-time scripts that exported it (`wp-export.mjs`, throttled because the host answers 429 after a burst of requests) and built `papers.bib` (`seed-bib.mjs`); `scripts/media/prepare-assets.mjs` built the images, and `scripts/media/trace-emblem.py` the emblem's SVGs. `migration/pages/` holds the converted drafts of the old pages, and `../oscur-wp-backup` the raw export. `site/data/legacy-urls.txt` lists every URL the old site served; `npm run check` fails if one of them stops resolving. The scripts under `scripts/` have their own `package.json` (`cd scripts && npm install`).
