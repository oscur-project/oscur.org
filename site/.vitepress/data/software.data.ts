import { defineLoader } from 'vitepress'
import { loadSoftware, type SoftwareSummary } from '../theme/node/software'

declare const data: SoftwareSummary[]
export { data }

export default defineLoader({
  watch: ['../../data/software.yaml', '../../data/topics.yaml', '../../data/team.yaml', '../../data/papers.bib'],
  load: () => loadSoftware(),
})
