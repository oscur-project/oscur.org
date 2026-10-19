import { defineLoader } from 'vitepress'
import { loadTeam, type Team } from '../theme/node/team'

declare const data: Team
export { data }

export default defineLoader({
  watch: ['../../data/team.yaml'],
  load: () => loadTeam(),
})
