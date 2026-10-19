<script setup lang="ts">
import { computed } from 'vue'
import { withBase } from 'vitepress'
import { data as team } from '@data/team.data'
import type { Person } from '../node/team'

// The groups of team.yaml in order. A `cards` group (the PIs) shows photo cards in one column per institution,
// as on the old team page; the others are lists. Alumni come last, with what they do now.
const shown = (p: Person) => p.listed !== false
const short = new Map(team.institutions.map((i) => [i.id, i.short]))

const groups = computed(() =>
  team.groups
    .map((group) => {
      const people = team.people.filter((p) => shown(p) && !p.alumni && p.group === group.id)
      const columns = group.cards
        ? team.institutions
            .map((institution) => ({ institution, people: people.filter((p) => p.institution === institution.id) }))
            .filter((column) => column.people.length > 0)
        : []
      return { ...group, people, columns }
    })
    .filter((group) => group.people.length > 0),
)
const alumni = computed(() => team.people.filter((p) => shown(p) && p.alumni))

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter((w) => /^\p{Lu}/u.test(w))
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
}
</script>

<template>
  <div class="oscur-team vp-raw">
    <section v-for="group in groups" :key="group.id" class="oscur-team-group">
      <h2>{{ group.label }}</h2>
      <div v-if="group.cards" class="oscur-team-columns">
        <div v-for="column in group.columns" :key="column.institution.id" class="oscur-team-column">
          <h3>
            <a v-if="column.institution.url" :href="column.institution.url" target="_blank" rel="noopener">{{ column.institution.name }}</a>
            <template v-else>{{ column.institution.name }}</template>
          </h3>
          <ul>
            <li v-for="person in column.people" :key="person.id" class="oscur-team-card">
              <img v-if="person.photo" :src="withBase(person.photo)" alt="" loading="lazy" width="96" height="96" />
              <span v-else class="oscur-team-initials" aria-hidden="true">{{ initials(person.name) }}</span>
              <a v-if="person.url" :href="person.url" target="_blank" rel="noopener">{{ person.name }}</a>
              <strong v-else>{{ person.name }}</strong>
              <small v-if="person.role">{{ person.role }}</small>
            </li>
          </ul>
        </div>
      </div>
      <ul v-else class="oscur-team-list">
        <li v-for="person in group.people" :key="person.id">
          <a v-if="person.url" :href="person.url" target="_blank" rel="noopener">{{ person.name }}</a>
          <strong v-else>{{ person.name }}</strong>
          <small>
            {{ short.get(person.institution!) }}<template v-if="person.role"> · {{ person.role }}</template
            ><template v-if="person.note"> · {{ person.note }}</template>
          </small>
        </li>
      </ul>
    </section>

    <section v-if="alumni.length" class="oscur-team-group">
      <h2>Alumni</h2>
      <ul class="oscur-team-list">
        <li v-for="person in alumni" :key="person.id">
          <a v-if="person.url" :href="person.url" target="_blank" rel="noopener">{{ person.name }}</a>
          <strong v-else>{{ person.name }}</strong>
          <small>
            {{ short.get(person.institution!) }}<template v-if="person.note"> · {{ person.note }}</template>
          </small>
        </li>
      </ul>
    </section>
  </div>
</template>

<style scoped>
.oscur-team-group h2 {
  margin: 40px 0 16px !important;
  padding: 0 !important;
  border: 0 !important;
  font-size: 1.3rem;
  font-weight: 800;
  color: var(--vp-c-brand-1);
}

.oscur-team-columns {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 24px;
}

.oscur-team-column h3 {
  margin: 0 0 14px !important;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--vp-c-divider);
  font-size: 0.95rem;
  font-weight: 700;
}

.oscur-team-column h3 a {
  color: var(--vp-c-text-1);
  text-decoration: none;
}

.oscur-team-column h3 a:hover {
  color: var(--vp-c-brand-1);
}

.oscur-team-column ul {
  display: grid;
  gap: 16px;
  margin: 0 !important;
  padding: 0 !important;
  list-style: none;
}

.oscur-team-card {
  display: grid;
  grid-template-columns: 72px 1fr;
  grid-template-rows: auto auto;
  column-gap: 14px;
  align-items: center;
  margin: 0 !important;
}

.oscur-team-card img,
.oscur-team-initials {
  grid-row: span 2;
  width: 72px;
  height: 72px;
  border-radius: 50%;
  border: 1px solid var(--vp-c-divider);
  object-fit: cover;
}

.oscur-team-initials {
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--vp-c-brand-soft);
  color: var(--vp-c-brand-1);
  font-size: 1.2rem;
  font-weight: 800;
}

.oscur-team-card a,
.oscur-team-card strong {
  align-self: end;
  font-weight: 700;
  color: var(--vp-c-text-1);
  text-decoration: none;
}

.oscur-team-card small {
  align-self: start;
  font-size: 0.85rem;
  color: var(--vp-c-text-2);
}

.oscur-team-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 10px;
  margin: 0 !important;
  padding: 0 !important;
  list-style: none;
}

.oscur-team-list li {
  margin: 0 !important;
  padding: 10px 14px;
  border: 1px solid var(--vp-c-divider);
  border-radius: var(--oscur-radius-sm);
  background: var(--vp-c-bg-soft);
}

.oscur-team-list a,
.oscur-team-list strong {
  display: block;
  font-weight: 650;
  color: var(--vp-c-text-1);
  text-decoration: none;
}

.oscur-team-group a:hover {
  color: var(--vp-c-brand-1);
}

.oscur-team-list small {
  display: block;
  margin-top: 2px;
  font-size: 0.82rem;
  line-height: 1.45;
  color: var(--vp-c-text-2);
}
</style>
