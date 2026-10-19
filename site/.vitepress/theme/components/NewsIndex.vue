<script setup lang="ts">
import { computed } from 'vue'
import { withBase } from 'vitepress'
import { data as news } from '@data/news.data'
import { formatDate } from '../composables/accent'
import { EMBLEM } from '../emblem'

// All posts by year. The old year and month archives (/2024/, /2024/08/) redirect to these anchors.
const years = computed(() => {
  const groups = new Map<string, typeof news>()
  for (const post of news) groups.set(post.year, [...(groups.get(post.year) ?? []), post])
  return [...groups]
})
</script>

<template>
  <div class="oscur-news-index vp-raw">
    <section v-for="[year, posts] in years" :id="year" :key="year" class="oscur-news-year">
      <h2>{{ year }}</h2>
      <a v-for="post in posts" :key="post.url" class="oscur-news-row" :href="withBase(post.url)">
        <img v-if="post.image" :src="withBase(post.image)" alt="" loading="lazy" :class="`oscur-fit-${post.imageFit}`" />
        <template v-else>
          <img :src="withBase(EMBLEM.light)" alt="" loading="lazy" class="oscur-emblem oscur-only-light" />
          <img :src="withBase(EMBLEM.dark)" alt="" loading="lazy" class="oscur-emblem oscur-only-dark" />
        </template>
        <span class="oscur-news-row-text">
          <time :datetime="post.date">{{ formatDate(post.date) }}</time>
          <strong>{{ post.title }}</strong>
          <span v-if="post.excerpt">{{ post.excerpt }}</span>
        </span>
      </a>
    </section>
  </div>
</template>

<style scoped>
.oscur-news-year {
  scroll-margin-top: calc(var(--vp-nav-height) + 16px);
}

.oscur-news-year h2 {
  margin: 40px 0 12px;
  font-size: 1.4rem;
  font-weight: 800;
  color: var(--vp-c-brand-1);
}

.oscur-news-row {
  display: grid;
  grid-template-columns: 160px 1fr;
  gap: 20px;
  align-items: start;
  padding: 16px 0;
  border-top: 1px solid var(--vp-c-divider);
  color: inherit;
  text-decoration: none;
}

.oscur-news-row img {
  width: 160px;
  aspect-ratio: 16 / 10;
  object-fit: cover;
  border-radius: var(--oscur-radius-sm);
  background: var(--vp-c-bg-soft);
}

.oscur-news-row img.oscur-fit-contain {
  object-fit: contain;
  padding: 8px;
  background: #fff;
}

.oscur-news-row img.oscur-emblem {
  object-fit: contain;
  padding: 8px;
  background: var(--vp-c-bg);
}

.oscur-news-row-text {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.oscur-news-row time {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--vp-c-text-2);
}

.oscur-news-row strong {
  font-size: 1.05rem;
  line-height: 1.4;
  color: var(--vp-c-text-1);
}

.oscur-news-row:hover strong {
  color: var(--vp-c-brand-1);
}

.oscur-news-row-text > span {
  font-size: 0.92rem;
  line-height: 1.6;
  color: var(--vp-c-text-2);
}

@media (max-width: 560px) {
  .oscur-news-row {
    grid-template-columns: 1fr;
  }

  .oscur-news-row img {
    width: 100%;
  }
}
</style>
