<script setup lang="ts">
import { computed } from 'vue'
import { useData, withBase } from 'vitepress'
import { formatDate } from '../composables/accent'

// Date, title and image above a news post (doc-before slot). Other doc pages render nothing here.
const { frontmatter, page } = useData()
const isPost = computed(() => /^news\/\d{4}\/\d{2}\//.test(page.value.filePath))
const date = computed(() => {
  const value = frontmatter.value.date
  return typeof value === 'string' ? value.slice(0, 10) : new Date(value).toISOString().slice(0, 10)
})
</script>

<template>
  <header v-if="isPost" class="oscur-post-header">
    <a class="oscur-post-back" :href="withBase('/news/')">&larr; News &amp; Events</a>
    <time :datetime="date">{{ formatDate(date) }}</time>
    <h1>{{ frontmatter.title }}</h1>
    <img v-if="frontmatter.image" :src="withBase(frontmatter.image)" alt="" :class="{ contain: frontmatter.imageFit === 'contain' }" />
  </header>
</template>

<style scoped>
.oscur-post-header {
  margin-bottom: 24px;
}

.oscur-post-back {
  display: inline-block;
  margin-bottom: 20px;
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--vp-c-brand-1);
  text-decoration: none;
}

.oscur-post-header time {
  display: block;
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--vp-c-text-2);
}

.oscur-post-header h1 {
  margin: 8px 0 20px;
  font-size: clamp(1.6rem, 3vw, 2.2rem);
  line-height: 1.2;
  font-weight: 800;
  letter-spacing: -0.02em;
}

.oscur-post-header img {
  width: 100%;
  max-height: 420px;
  object-fit: cover;
  border-radius: var(--oscur-radius);
}

/* Logos and portraits that a cover crop would cut. */
.oscur-post-header img.contain {
  max-height: 320px;
  padding: 16px;
  object-fit: contain;
  background: #fff;
  box-shadow: 0 0 0 1px var(--vp-c-divider);
}
</style>
