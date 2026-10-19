<script setup lang="ts">
import { withBase } from 'vitepress'
import type { SoftwareSummary } from '../node/software'

// A tool's logo, or a monogram in its topic's color when it has none.
withDefaults(
  defineProps<{ software: Pick<SoftwareSummary, 'name' | 'logo' | 'logoOnDark' | 'monogram'>; size?: 'sm' | 'md' | 'lg' }>(),
  { size: 'md' },
)
</script>

<template>
  <span class="oscur-logo" :class="`oscur-logo--${size}`">
    <template v-if="software.logo">
      <img :src="withBase(software.logo)" alt="" :class="{ 'oscur-logo-light': software.logoOnDark }" />
      <img v-if="software.logoOnDark" :src="withBase(software.logoOnDark)" alt="" class="oscur-logo-dark" />
    </template>
    <span v-else class="oscur-monogram" aria-hidden="true">{{ software.monogram }}</span>
  </span>
</template>

<style scoped>
.oscur-logo {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: none;
  border-radius: 14px;
  background: #fff;
  box-shadow: 0 0 0 1px var(--vp-c-divider);
  overflow: hidden;
}

.oscur-logo--sm {
  width: 36px;
  height: 36px;
  border-radius: 10px;
}

.oscur-logo--md {
  width: 48px;
  height: 48px;
}

.oscur-logo--lg {
  width: 72px;
  height: 72px;
  border-radius: 18px;
}

.oscur-logo img {
  width: 82%;
  height: 82%;
  object-fit: contain;
}

.oscur-monogram {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  background: var(--p-light, var(--vp-c-brand-3));
  color: #fff;
  font-weight: 800;
  letter-spacing: -0.02em;
  font-size: 15px;
}

.oscur-logo--lg .oscur-monogram {
  font-size: 24px;
}

.oscur-logo--sm .oscur-monogram {
  font-size: 12px;
}

.oscur-logo-dark,
.dark .oscur-logo-light {
  display: none;
}

.dark .oscur-logo-dark {
  display: block;
}
</style>
