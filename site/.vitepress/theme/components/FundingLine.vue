<script setup lang="ts">
import { computed } from 'vue'
import { useData } from 'vitepress'

// The funding acknowledgement from SITE.funding, as one sentence; shared by the home page hero and the footer.
const { theme } = useData()
const funding = computed(() => theme.value.oscur.funding)
</script>

<template>
  <span class="oscur-funding">
    {{ funding.lead }}
    <template v-for="(sponsor, i) in funding.sponsors" :key="sponsor.name">
      <strong>{{ sponsor.name }}</strong
      ><template v-if="sponsor.awards">
        (Awards
        <template v-for="(award, j) in sponsor.awards" :key="award.id">
          <a :href="award.url" target="_blank" rel="noopener">#{{ award.id }}</a
          ><template v-if="j < sponsor.awards.length - 2">, </template
          ><template v-else-if="j === sponsor.awards.length - 2">, and </template>
        </template>)</template
      ><template v-if="i < funding.sponsors.length - 2">, </template
      ><template v-else-if="i === funding.sponsors.length - 2">, and </template>
    </template>.
  </span>
</template>

<style scoped>
.oscur-funding strong {
  font-weight: 600;
  color: var(--vp-c-text-1);
}

.oscur-funding a {
  color: var(--vp-c-brand-1);
  text-decoration: underline;
  text-underline-offset: 3px;
}

.oscur-funding a:hover {
  text-decoration-thickness: 2px;
}
</style>
