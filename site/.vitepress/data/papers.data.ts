import { defineLoader } from 'vitepress'
import { loadPapers, type Paper } from '../theme/node/bib'
import { loadSoftware } from '../theme/node/software'

declare const data: Paper[]
export { data }

export default defineLoader({
  watch: ['../../data/papers.bib', '../../data/software.yaml', '../../data/topics.yaml'],
  // A paper is filed under its own `topic` and under the topic of every software it names.
  load: () => {
    const topicOf = new Map(loadSoftware().map((s) => [s.id, s.topic]))
    return loadPapers().map((paper) => ({
      ...paper,
      topics: [...new Set([...paper.topics, ...paper.software.map((id) => topicOf.get(id)!)])],
    }))
  },
})
