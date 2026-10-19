<script setup lang="ts">
import { computed } from 'vue'
import { useData, withBase } from 'vitepress'
import FundingLine from './FundingLine.vue'

interface Sponsor {
  name: string
  url: string
  logo: { light: string; dark?: string }
}

// The funding line under the home page hero's buttons, then the sponsors' logos, as on the Curio guide.
const { theme } = useData()
const sponsors = computed(() => theme.value.oscur.funding.sponsors as Sponsor[])
</script>

<template>
  <p class="oscur-hero-funding"><FundingLine /></p>
  <ul class="oscur-sponsors" aria-label="Sponsors">
    <li v-for="sponsor in sponsors" :key="sponsor.name">
      <a :href="sponsor.url" target="_blank" rel="noopener" :title="sponsor.name">
        <img :class="{ light: sponsor.logo.dark }" :src="withBase(sponsor.logo.light)" :alt="sponsor.name" height="32" decoding="async" />
        <img v-if="sponsor.logo.dark" class="dark" :src="withBase(sponsor.logo.dark)" :alt="sponsor.name" height="32" decoding="async" />
      </a>
    </li>
  </ul>
</template>

<style scoped>
.oscur-hero-funding {
  max-width: 576px;
  margin: 28px 0 0;
  font-size: 0.9rem;
  line-height: 1.7;
  color: var(--vp-c-text-2);
}

.oscur-sponsors {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 24px;
  margin: 12px 0 0;
  padding: 0;
  list-style: none;
}

.oscur-sponsors a {
  display: block;
}

.oscur-sponsors img {
  display: block;
  height: 32px;
  width: auto;
}

.dark .oscur-sponsors img.light,
html:not(.dark) .oscur-sponsors img.dark {
  display: none;
}

/* Below 960px the hero centers its text; center the paragraph and the logos with it. */
@media (max-width: 959px) {
  .oscur-hero-funding {
    margin-right: auto;
    margin-left: auto;
  }

  .oscur-sponsors {
    justify-content: center;
  }
}
</style>
