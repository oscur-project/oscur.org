<script setup lang="ts">
import { computed } from 'vue'
import { useData, withBase } from 'vitepress'
import { data as software } from '@data/software.data'
import { data as papers } from '@data/papers.data'
import type { Paper } from '../node/bib'
import type { Topic } from '../node/software'
import { accentStyle } from '../composables/accent'
import SoftwareLinks from './SoftwareLinks.vue'
import SoftwareLogo from './SoftwareLogo.vue'

// Every tool, dataset and platform by topic, in the order of topics.yaml and software.yaml. Each card is an
// anchor (/software/#<id>) that the papers' tags link to, and lists the papers that name it.
const { theme } = useData()
const byKey = new Map(papers.map((paper) => [paper.key, paper]))

const sections = computed(() =>
  (theme.value.oscur.topics as Topic[])
    .map((topic) => ({ ...topic, items: software.filter((s) => s.topic === topic.id) }))
    .filter((section) => section.items.length > 0),
)

function papersOf(keys: string[]) {
  return keys.map((key) => byKey.get(key)!).filter(Boolean)
}

// An OSCUR paper links to its entry on /publications/; an earlier paper of the software, to the paper itself.
function paperHref(paper: Paper) {
  if (paper.listed) return withBase(`/publications/#${paper.key}`)
  if (paper.doi) return `https://doi.org/${paper.doi}`
  return paper.arxiv ? `https://arxiv.org/abs/${paper.arxiv}` : (paper.url ?? undefined)
}

// "SIGMOD 2026" needs no ", 2026"; a paper of IEEE VIS 2025 in a 2026 issue keeps its year.
function whereAndWhen(paper: Paper) {
  const where = paper.presented ?? paper.venue
  return where.endsWith(String(paper.year)) ? where : `${where}, ${paper.year}`
}
</script>

<template>
  <div class="oscur-software-page vp-raw">
    <nav class="oscur-topic-nav" aria-label="Topics">
      <a v-for="section in sections" :key="section.id" :href="`#${section.id}`" :style="accentStyle(section)" class="oscur-accent">
        <span class="oscur-dot" :style="{ '--oscur-dot': section.accent }" aria-hidden="true" />{{ section.label }}
        <span class="oscur-topic-count">{{ section.items.length }}</span>
      </a>
    </nav>

    <section v-for="section in sections" :id="section.id" :key="section.id" class="oscur-topic oscur-accent" :style="accentStyle(section)">
      <header class="oscur-topic-header">
        <h2 class="oscur-topic-title">{{ section.label }}</h2>
        <p v-if="section.description" class="oscur-topic-lead">{{ section.description }}</p>
      </header>

      <div class="oscur-software-grid">
        <article v-for="item in section.items" :id="item.id" :key="item.id" class="oscur-software">
          <header class="oscur-software-head">
            <SoftwareLogo :software="item" />
            <div>
              <h3 class="oscur-software-name">{{ item.name }}</h3>
              <p class="oscur-software-sites">
                <template v-for="(inst, i) in item.institutions" :key="inst.id">
                  <span :title="inst.name">{{ inst.short }}</span><template v-if="i < item.institutions.length - 1"> · </template>
                </template>
              </p>
            </div>
          </header>
          <p class="oscur-software-tagline">{{ item.tagline }}</p>
          <p v-if="item.description" class="oscur-software-description">{{ item.description }}</p>
          <p v-if="item.status" class="oscur-software-status"><span class="oscur-badge">{{ item.status }}</span></p>
          <SoftwareLinks :links="item.links" :name="item.name" />
          <ul v-if="item.papers.length" class="oscur-software-papers">
            <li v-for="paper in papersOf(item.papers)" :key="paper.key">
              <a :href="paperHref(paper)" :target="paper.listed ? undefined : '_blank'" :rel="paper.listed ? undefined : 'noopener'">{{ paper.title }}</a>
              <span>
                {{ whereAndWhen(paper) }}<template v-if="paper.status"> · {{ paper.status }}</template>
              </span>
            </li>
          </ul>
        </article>
      </div>
    </section>
  </div>
</template>

<style scoped>
.oscur-topic-nav {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin: 8px 0 8px;
}

.oscur-topic-nav a {
  display: inline-flex;
  align-items: center;
  padding: 4px 12px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 999px;
  font-size: 13px;
  font-weight: 600;
  color: var(--vp-c-text-2);
  text-decoration: none;
  transition: border-color 0.2s, color 0.2s;
}

.oscur-topic-nav a:hover {
  border-color: var(--vp-c-brand-1);
  color: var(--vp-c-brand-1);
}

.oscur-topic-count {
  margin-left: 6px;
  font-weight: 500;
  color: var(--vp-c-text-3);
}

.oscur-topic {
  padding-top: 40px;
  scroll-margin-top: calc(var(--vp-nav-height) + 8px);
}

.oscur-topic-header {
  margin-bottom: 20px;
}

.oscur-topic-title {
  margin: 0 !important;
  padding: 0 !important;
  border: 0 !important;
  color: var(--vp-c-brand-1);
  font-size: 1.45rem;
  font-weight: 800;
  letter-spacing: -0.01em;
}

.oscur-topic-lead {
  max-width: var(--oscur-text-max);
  margin: 6px 0 0 !important;
  color: var(--vp-c-text-2);
  font-size: 0.95rem;
  line-height: 1.65;
}

.oscur-software-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 18px;
}

.oscur-software {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 18px;
  border: 1px solid var(--vp-c-divider);
  border-top: 3px solid var(--p-raw);
  border-radius: var(--oscur-radius);
  background: var(--vp-c-bg-soft);
  scroll-margin-top: calc(var(--vp-nav-height) + 16px);
}

.oscur-software:target {
  box-shadow: 0 0 0 2px var(--vp-c-brand-1);
}

.oscur-software-head {
  display: flex;
  align-items: center;
  gap: 12px;
}

.oscur-software-name {
  margin: 0 !important;
  padding: 0 !important;
  border: 0 !important;
  font-size: 1.08rem !important;
  line-height: 1.3 !important;
  font-weight: 750;
  color: var(--vp-c-text-1);
}

.oscur-software-sites {
  margin: 2px 0 0 !important;
  font-size: 0.8rem;
  font-weight: 600;
  letter-spacing: 0.02em;
  color: var(--vp-c-text-2);
}

.oscur-software-tagline {
  margin: 0 !important;
  font-size: 0.93rem;
  line-height: 1.55;
  color: var(--vp-c-text-1);
}

.oscur-software-description {
  margin: 0 !important;
  font-size: 0.86rem;
  line-height: 1.55;
  color: var(--vp-c-text-2);
}

.oscur-software-status {
  margin: 0 !important;
}

.oscur-software-papers {
  margin: 4px 0 0 !important;
  padding: 10px 0 0 !important;
  border-top: 1px solid var(--vp-c-divider);
  list-style: none;
}

.oscur-software-papers li {
  margin: 0 0 6px !important;
  font-size: 0.82rem;
  line-height: 1.45;
}

.oscur-software-papers a {
  color: var(--vp-c-text-1);
  font-weight: 600;
  text-decoration: none;
}

.oscur-software-papers a:hover {
  color: var(--vp-c-brand-1);
}

.oscur-software-papers span {
  display: block;
  color: var(--vp-c-text-2);
}
</style>
