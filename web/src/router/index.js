import { createRouter, createWebHashHistory } from 'vue-router'
import HomeView from '../views/home/index.vue'

const router = createRouter({
  history: createWebHashHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView
    },
    {
      path: '/game/:id',
      name: 'game',
      component: () => import('@/views/game/index.vue')
    },
    {
      path: '/editor',
      name: 'editor',
      component: () => import('@/views/editor/index.vue')
    }
  ]
})

export default router
