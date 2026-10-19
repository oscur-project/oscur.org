<script setup lang="ts">
import { computed } from 'vue'
import { useData, withBase } from 'vitepress'
import { data as news } from '@data/news.data'
import { formatDate } from '../composables/accent'
import { EMBLEM } from '../emblem'

const { theme } = useData()
const latest = computed(() => news.slice(0, theme.value.oscur.newsOnHome))
</script>

<template>
  <section id="news" class="oscur-section oscur-home-news vp-raw">
    <div class="oscur-container">
      <header class="oscur-section-header">
        <h2 class="oscur-section-title">What&rsquo;s new</h2>
        <div class="oscur-section-divider" aria-hidden="true" />
      </header>
      <div class="oscur-news-grid">
        <a v-for="post in latest" :key="post.url" class="oscur-news-card" :href="withBase(post.url)">
          <div class="oscur-news-media">
            <img v-if="post.image" :src="withBase(post.image)" alt="" loading="lazy" :class="`oscur-fit-${post.imageFit}`" />
            <template v-else>
              <img :src="withBase(EMBLEM.light)" alt="" loading="lazy" class="oscur-emblem oscur-only-light" />
              <img :src="withBase(EMBLEM.dark)" alt="" loading="lazy" class="oscur-emblem oscur-only-dark" />
            </template>
          </div>
          <div class="oscur-news-body">
            <time :datetime="post.date">{{ formatDate(post.date) }}</time>
            <h3>{{ post.title }}</h3>
          </div>
        </a>
      </div>
      <a class="oscur-link-more" :href="withBase('/news/')">All news &rarr;</a>
    </div>
  </section>
</template>

<style scoped>
.oscur-home-news {
  scroll-margin-top: var(--vp-nav-height);
}

.oscur-news-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
}

.oscur-news-card {
  display: flex;
  flex-direction: column;
  border: 1px solid var(--vp-c-divider);
  border-radius: var(--oscur-radius);
  overflow: hidden;
  background: var(--vp-c-bg-soft);
  color: inherit;
  text-decoration: none;
  transition: border-color 0.25s, transform 0.25s;
}

.oscur-news-card:hover {
  border-color: var(--vp-c-brand-1);
  transform: translateY(-2px);
}

.oscur-news-media {
  aspect-ratio: 2 / 1;
  background: var(--vp-c-bg-alt);
  overflow: hidden;
}

.oscur-news-media img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.oscur-news-media img.oscur-fit-contain {
  object-fit: contain;
  padding: 12px 20px;
  background: #fff;
}

.oscur-news-media img.oscur-emblem {
  object-fit: contain;
  padding: 12px 20px;
  background: var(--vp-c-bg);
}

.oscur-news-body {
  padding: 14px 18px 18px;
}

.oscur-news-body time {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--vp-c-text-2);
}

.oscur-news-body h3 {
  margin: 6px 0 0;
  font-size: 1rem;
  line-height: 1.45;
  font-weight: 650;
  color: var(--vp-c-text-1);
}
</style>
