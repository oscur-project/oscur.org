import DefaultTheme from 'vitepress/theme'
import type { Theme } from 'vitepress'
import { h } from 'vue'
import './styles/vars.css'
import './styles/base.css'
import HomeFunding from './components/HomeFunding.vue'
import HomeNews from './components/HomeNews.vue'
import NewsIndex from './components/NewsIndex.vue'
import PapersPage from './components/PapersPage.vue'
import PostHeader from './components/PostHeader.vue'
import SiteFooter from './components/SiteFooter.vue'
import SoftwarePage from './components/SoftwarePage.vue'
import TeamPage from './components/TeamPage.vue'

// The default theme, with the funding line under the home hero, a header on news posts and the site footer.
// The hero image comes from the frontmatter: any home-hero-image slot would mark every hero as having one.
export default {
  extends: DefaultTheme,
  Layout() {
    return h(DefaultTheme.Layout, null, {
      'home-hero-actions-after': () => h(HomeFunding),
      'doc-before': () => h(PostHeader),
      'layout-bottom': () => h(SiteFooter),
    })
  },
  enhanceApp({ app }) {
    // Components used from Markdown pages.
    app.component('HomeNews', HomeNews)
    app.component('NewsIndex', NewsIndex)
    app.component('PapersPage', PapersPage)
    app.component('SoftwarePage', SoftwarePage)
    app.component('TeamPage', TeamPage)
  },
} satisfies Theme
