<script setup lang="ts">
import { ref } from 'vue'
import Icon from './Icon.vue'

const props = defineProps<{ bibtex: string; label?: string }>()
const copied = ref(false)

async function copy() {
  try {
    await navigator.clipboard.writeText(props.bibtex)
    copied.value = true
    setTimeout(() => (copied.value = false), 1800)
  } catch {
    window.prompt('Copy the BibTeX entry:', props.bibtex)
  }
}
</script>

<template>
  <button type="button" class="oscur-bibtex" @click="copy">
    <Icon :name="copied ? 'check' : 'copy'" />
    <span aria-live="polite">{{ copied ? 'Copied' : label ?? 'BibTeX' }}</span>
  </button>
</template>

<style scoped>
.oscur-bibtex {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 2px 10px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
  line-height: 22px;
  color: var(--vp-c-text-2);
  transition: border-color 0.2s, color 0.2s;
}

.oscur-bibtex:hover {
  border-color: var(--vp-c-brand-1);
  color: var(--vp-c-brand-1);
}

.oscur-bibtex svg {
  width: 13px;
  height: 13px;
}
</style>
