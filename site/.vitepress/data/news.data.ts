import { defineLoader } from 'vitepress'
import { loadNews, type NewsPost } from '../theme/node/news'

declare const data: NewsPost[]
export { data }

export default defineLoader({
  watch: ['../../news/**/*.md'],
  load: () => loadNews(),
})
