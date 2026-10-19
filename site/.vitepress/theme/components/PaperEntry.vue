<script setup lang="ts">
import { computed } from 'vue'
import { withBase } from 'vitepress'
import { data as team } from '@data/team.data'
import { data as software } from '@data/software.data'
import type { Paper } from '../node/bib'
import BibtexButton from './BibtexButton.vue'
import Icon from './Icon.vue'

const props = defineProps<{ paper: Paper; showSoftware?: boolean }>()

// Author names that match a team member (or one of their aliases) link to that person.
const people = new Map<string, string | undefined>()
for (const person of team.people) {
  for (const name of [person.name, ...(person.aliases ?? [])]) people.set(name, person.url)
}

const links = computed(() => {
  const p = props.paper
  const out: { kind: string; label: string; url: string }[] = []
  if (p.page) out.push({ kind: 'website', label: 'Project page', url: withBase(p.page) })
  if (p.doi) out.push({ kind: 'paper', label: 'Paper', url: `https://doi.org/${p.doi}` })
  if (p.arxiv) out.push({ kind: 'arxiv', label: 'arXiv', url: `https://arxiv.org/abs/${p.arxiv}` })
  if (!p.doi && !p.arxiv && p.url) out.push({ kind: 'paper', label: 'Paper', url: p.url })
  if (p.pdf) out.push({ kind: 'pdf', label: 'PDF', url: p.pdf.startsWith('/') ? withBase(p.pdf) : p.pdf })
  if (p.code) out.push({ kind: 'github', label: 'Code', url: p.code })
  if (p.video) out.push({ kind: 'video', label: 'Video', url: p.video })
  return out
})

// The paper's title links to the paper itself, not to a project page.
const titleUrl = computed(() => links.value.find((link) => link.kind !== 'website')?.url ?? links.value[0]?.url)
const tags = computed(() => (props.showSoftware ? software.filter((s) => props.paper.software.includes(s.id)) : []))
</script>

<template>
  <article :id="paper.key" class="oscur-paper">
    <h3 class="oscur-paper-title">
      <a v-if="titleUrl" :href="titleUrl">{{ paper.title }}</a>
      <template v-else>{{ paper.title }}</template>
    </h3>
    <p class="oscur-paper-authors">
      <template v-for="(author, i) in paper.authors" :key="author + i">
        <a v-if="people.get(author)" :href="people.get(author)" target="_blank" rel="noopener">{{ author }}</a>
        <span v-else>{{ author }}</span>
        <template v-if="i < paper.authors.length - 1">, </template>
      </template>
    </p>
    <p class="oscur-paper-venue">
      {{ paper.venue }}<template v-if="paper.presented"> ({{ paper.presented }})</template>, {{ paper.year }}
      <span v-if="paper.status" class="oscur-badge oscur-paper-badge">{{ paper.status }}</span>
      <span v-if="paper.award" class="oscur-badge oscur-paper-badge"><Icon name="award" />{{ paper.award }}</span>
    </p>
    <div class="oscur-paper-actions">
      <a v-for="link in links" :key="link.url" class="oscur-paper-link" :href="link.url">
        <Icon :name="link.kind" />{{ link.label }}
      </a>
      <BibtexButton :bibtex="paper.bibtex" />
      <a v-for="item in tags" :key="item.id" class="oscur-paper-software" :href="withBase(item.url)">
        <span class="oscur-dot" :style="{ '--oscur-dot': item.accent }" aria-hidden="true" />{{ item.name }}
      </a>
    </div>
  </article>
</template>

<style scoped>
.oscur-paper {
  padding: 18px 0;
  border-top: 1px solid var(--vp-c-divider);
  scroll-margin-top: calc(var(--vp-nav-height) + 16px);
}

.oscur-paper:target {
  margin: 0 -12px;
  padding: 18px 12px;
  border-radius: var(--oscur-radius-sm);
  background: var(--vp-c-brand-soft);
}

.oscur-paper-title {
  margin: 0;
  font-size: 1.02rem;
  line-height: 1.45;
  font-weight: 650;
}

.oscur-paper-title a {
  color: var(--vp-c-text-1);
  text-decoration: none;
}

.oscur-paper-title a:hover {
  color: var(--vp-c-brand-1);
}

.oscur-paper-authors,
.oscur-paper-venue {
  margin: 4px 0 0;
  font-size: 0.9rem;
  line-height: 1.55;
  color: var(--vp-c-text-2);
}

.oscur-paper-authors a {
  color: inherit;
  text-decoration: underline;
  text-decoration-color: var(--vp-c-divider);
  text-underline-offset: 3px;
}

.oscur-paper-authors a:hover {
  color: var(--vp-c-brand-1);
}

.oscur-paper-badge {
  margin-left: 8px;
}

.oscur-paper-badge svg {
  width: 13px;
  height: 13px;
}

.oscur-paper-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin-top: 10px;
}

.oscur-paper-link {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 2px 10px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
  line-height: 22px;
  color: var(--vp-c-text-2);
  text-decoration: none;
  transition: border-color 0.2s, color 0.2s;
}

.oscur-paper-link:hover {
  border-color: var(--vp-c-brand-1);
  color: var(--vp-c-brand-1);
}

.oscur-paper-link svg {
  width: 13px;
  height: 13px;
}

.oscur-paper-software {
  display: inline-flex;
  align-items: center;
  font-size: 12px;
  font-weight: 600;
  color: var(--vp-c-text-2);
  text-decoration: none;
}

.oscur-paper-software:hover {
  color: var(--vp-c-text-1);
}
</style>
