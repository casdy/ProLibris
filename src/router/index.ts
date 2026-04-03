import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      redirect: '/dashboard',
    },
    {
      path: '/login',
      name: 'login',
      component: () => import('@/views/Login.vue'),
    },
    {
      path: '/dashboard',
      name: 'dashboard',
      component: () => import('@/views/DashboardView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/profile',
      name: 'profile',
      component: () => import('@/views/ProfileView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/welcome',
      alias: '/dashboard/welcome',
      name: 'welcome',
      component: () => import('@/views/AuthSplash.vue'),
    },
    {
      path: '/farewell',
      name: 'farewell',
      component: () => import('@/views/AuthSplash.vue'),
    },
    {
      path: '/read/:id',
      name: 'reader',
      component: () => import('@/views/ReaderView.vue'),
      meta: { requiresAuth: true },
    },
    // Fallback for unmatched routes to prevent blank screens
    {
      path: '/:pathMatch(.*)*',
      redirect: '/dashboard',
    },
  ],
})

router.beforeEach(async (to, from, next) => {
  const auth = useAuthStore()
  if (auth.loading) await auth.init()

  if (to.meta.requiresAuth && !auth.user) {
    next('/login')
  } else if (to.path === '/login' && auth.user) {
    next('/dashboard')
  } else {
    next()
  }
})

export default router
