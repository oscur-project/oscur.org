import { defineLoader } from 'vitepress'
import { loadImpact, type Impact } from '../theme/node/impact'

declare const data: Impact
export { data }

export default defineLoader({
  watch: [
    '../../data/impact.yaml',
    '../../data/papers.bib',
    '../../data/team.yaml',
    '../../data/software.yaml',
    '../../data/topics.yaml',
    '../../../.cache/impact/metrics.json',
  ],
  load: () => loadImpact(),
})
