<script setup lang="ts">
import { computed } from 'vue'
import { useData, withBase } from 'vitepress'
import FundingLine from './FundingLine.vue'

const { frontmatter, theme } = useData()
// The home page shows the acknowledgement under its hero instead.
const home = computed(() => frontmatter.value.layout === 'home')
const institutions = computed(() => theme.value.oscur.institutions)
const year = new Date().getFullYear()
</script>

<template>
  <footer class="oscur-footer">
    <div class="oscur-container oscur-footer-inner">
      <p v-if="!home" class="oscur-footer-funding"><FundingLine /></p>
      <div class="oscur-footer-logos">
        <a v-for="inst in institutions" :key="inst.name" :href="inst.url" target="_blank" rel="noopener" :aria-label="inst.name">
          <img :src="withBase(inst.logo)" :alt="inst.name" />
        </a>
      </div>
      <p class="oscur-footer-meta">
        &copy; {{ year }} OSCUR &middot;
        <a :href="withBase('/feed.xml')">RSS</a> &middot;
        <a :href="theme.oscur.repo" target="_blank" rel="noopener">Website source</a>
      </p>
    </div>
  </footer>
</template>

<style scoped>
.oscur-footer {
  margin-top: 32px;
  border-top: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg-soft);
}

.oscur-footer-inner {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
  padding-top: 32px;
  padding-bottom: 32px;
  text-align: center;
}

.oscur-footer-funding {
  max-width: 760px;
  margin: 0;
  font-size: 0.9rem;
  line-height: 1.7;
  color: var(--vp-c-text-2);
}

.oscur-footer a {
  color: var(--vp-c-brand-1);
  text-decoration: underline;
  text-underline-offset: 3px;
}

.oscur-footer a:hover {
  text-decoration-thickness: 2px;
}

.oscur-footer-logos a {
  text-decoration: none;
}

.oscur-footer-logos {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 28px;
}

.oscur-footer-logos a {
  display: inline-flex;
  align-items: center;
  height: 48px;
}

.oscur-footer-logos img {
  max-height: 44px;
  max-width: 180px;
  object-fit: contain;
}

/* The logos are colored marks: in dark mode they sit on white tiles rather than being inverted. */
.dark .oscur-footer-logos a {
  padding: 4px 8px;
  border-radius: var(--oscur-radius-sm);
  background: #fff;
}

.oscur-footer-meta {
  margin: 0;
  font-size: 0.82rem;
  color: var(--vp-c-text-2);
}
</style>
