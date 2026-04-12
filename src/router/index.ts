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
      meta: { requiresAuth: true, requiresVerification: true },
    },
    {
      path: '/verify-pending',
      name: 'verify-pending',
      component: () => import('@/views/VerificationPending.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/verify-complete',
      name: 'verify-complete',
      component: () => import('@/views/VerificationPending.vue'), // Re-use for simplicity or create new
      meta: { requiresAuth: true },
      beforeEnter: async (to, from, next) => {
        const auth = useAuthStore()
        const userId = to.query.userId as string | undefined
        const secret = to.query.secret as string | undefined
        
        if (userId && secret) {
          try {
            const { account } = await import('@/lib/appwrite')
            await account.updateVerification(userId, secret)
            await auth.refreshUser()
            next('/dashboard')
            return
          } catch (e) {
            console.error('Verification failed:', e)
          }
        }
        next('/verify-pending')
      }
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
  
  // Ensure session is restored before any routing decisions
  if (auth.loading) {
    await auth.init()
  }

  const requiresAuth = to.matched.some(record => record.meta.requiresAuth)
  const requiresVerification = to.matched.some(record => record.meta.requiresVerification)

  if (requiresAuth && !auth.user) {
    // If we are definitely not logged in, go to login
    next({ name: 'login', query: { redirect: to.fullPath } })
  } else if (to.name === 'login' && auth.user) {
    // If logged in and trying to access login page, go to dashboard
    next('/dashboard')
  } else if (requiresVerification && !auth.isVerified && to.name !== 'verify-pending') {
    // If verification is required but not done
    next({ name: 'verify-pending' })
  } else {
    // Proceed to the requested route (preserves /profile, /read, etc.)
    next()
  }
})

export default router
