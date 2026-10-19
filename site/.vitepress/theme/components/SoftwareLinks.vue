<script setup lang="ts">
import { computed } from 'vue'
import { withBase } from 'vitepress'
import type { SoftwareSummary } from '../node/software'
import Icon from './Icon.vue'

const LABELS: Record<string, string> = {
  website: 'Website',
  demo: 'Try it',
  docs: 'Docs',
  github: 'Code',
  pypi: 'PyPI',
  npm: 'npm',
  data: 'Data',
  model: 'Model',
  archive: 'Reproducibility package',
  tutorials: 'Tutorials',
  video: 'Video',
}

const props = defineProps<{ links: SoftwareSummary['links']; name: string }>()

// The first link is the primary button unless one is marked.
const buttons = computed(() => {
  const out = props.links.map((link) => ({
    kind: link.kind,
    url: link.url,
    label: link.label ?? LABELS[link.kind] ?? link.kind,
    primary: !!link.primary,
  }))
  if (out.length && !out.some((b) => b.primary)) out[0].primary = true
  return out
})

function href(url: string): string {
  return url.startsWith('/') ? withBase(url) : url
}
</script>

<template>
  <nav v-if="buttons.length" class="oscur-links" :aria-label="`${name} links`">
    <a
      v-for="button in buttons"
      :key="button.url"
      class="oscur-button"
      :class="{ 'oscur-button--primary': button.primary }"
      :href="href(button.url)"
      :target="button.url.startsWith('/') ? undefined : '_blank'"
      :rel="button.url.startsWith('/') ? undefined : 'noopener'"
    >
      <Icon :name="button.kind" />
      {{ button.label }}
    </a>
  </nav>
</template>

<style scoped>
.oscur-links {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.oscur-links .oscur-button {
  min-height: 34px;
  padding: 0 12px;
  font-size: 13px;
}

.oscur-links .oscur-button svg {
  width: 15px;
  height: 15px;
}
</style>
