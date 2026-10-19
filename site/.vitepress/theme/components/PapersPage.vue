<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useData } from 'vitepress'
import { data as papers } from '@data/papers.data'
import PaperEntry from './PaperEntry.vue'

interface Topic {
  id: string
  label: string
}

// Every paper, newest first, grouped by year. The full list is prerendered; the topic filter (also reachable
// as /publications/?topic=<id>) only applies once the page has loaded.
const { theme } = useData()
const active = ref<string | null>(null)

// The Software page's topics, in their order, that have at least one paper.
const filters = computed(() =>
  (theme.value.oscur.topics as Topic[]).filter((t) => papers.some((paper) => paper.topics.includes(t.id))),
)

const years = computed(() => {
  const shown = active.value ? papers.filter((p) => p.topics.includes(active.value!)) : papers
  const groups = new Map<number, typeof papers>()
  for (const paper of shown) groups.set(paper.year, [...(groups.get(paper.year) ?? []), paper])
  return [...groups]
})

function select(id: string | null) {
  active.value = id
  const url = new URL(window.location.href)
  if (id) url.searchParams.set('topic', id)
  else url.searchParams.delete('topic')
  history.replaceState(history.state, '', url)
}

onMounted(() => {
  const wanted = new URLSearchParams(window.location.search).get('topic')
  if (wanted && filters.value.some((t) => t.id === wanted)) active.value = wanted
})
</script>

<template>
  <div class="oscur-papers vp-raw">
    <div class="oscur-papers-filters" role="group" aria-label="Filter by topic">
      <button type="button" :aria-pressed="active === null" @click="select(null)">All</button>
      <button
        v-for="topic in filters"
        :key="topic.id"
        type="button"
        :aria-pressed="active === topic.id"
        @click="select(topic.id)"
      >
        {{ topic.label }}
      </button>
    </div>
    <section v-for="[year, entries] in years" :id="String(year)" :key="year" class="oscur-papers-year">
      <h2>{{ year }}</h2>
      <PaperEntry v-for="paper in entries" :key="paper.key" :paper="paper" show-software />
    </section>
  </div>
</template>

<style scoped>
.oscur-papers-filters {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin: 8px 0 12px;
}

.oscur-papers-filters button {
  display: inline-flex;
  align-items: center;
  padding: 4px 12px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 999px;
  font-size: 13px;
  font-weight: 600;
  color: var(--vp-c-text-2);
  transition: border-color 0.2s, color 0.2s, background-color 0.2s;
}

.oscur-papers-filters button:hover {
  border-color: var(--vp-c-brand-1);
  color: var(--vp-c-text-1);
}

.oscur-papers-filters button[aria-pressed='true'] {
  border-color: var(--vp-c-brand-1);
  background: var(--vp-c-brand-soft);
  color: var(--vp-c-brand-1);
}

.oscur-papers-year {
  scroll-margin-top: calc(var(--vp-nav-height) + 16px);
}

.oscur-papers-year h2 {
  margin: 36px 0 4px;
  font-size: 1.4rem;
  font-weight: 800;
  color: var(--vp-c-brand-1);
}
</style>
