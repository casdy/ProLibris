import { defineStore } from 'pinia'

/**
 * Safely read the initial theme preference.
 * Returns true (dark) as the default if browser APIs are unavailable.
 */
function resolveInitialDark(): boolean {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') return true
  const stored = localStorage.getItem('theme')
  if (stored) return stored === 'dark'
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? true
}

export const useUIStore = defineStore('ui', {
  state: () => ({
    isDark: resolveInitialDark(),
    isInitialized: false,
    notifications: [] as Array<{ id: string; message: string; type: 'info' | 'success' | 'error'; duration?: number }>
  }),
  actions: {
    toggleTheme() {
      this.isDark = !this.isDark
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('theme', this.isDark ? 'dark' : 'light')
      }
      this.applyTheme()
    },
    applyTheme() {
      if (typeof document === 'undefined') return
      if (this.isDark) {
        document.documentElement.classList.add('dark')
      } else {
        document.documentElement.classList.remove('dark')
      }
    },
    showNotification(message: string, type: 'info' | 'success' | 'error' = 'info', duration = 5000) {
      const id = Math.random().toString(36).substring(2, 9)
      this.notifications.push({ id, message, type, duration })
      if (duration > 0) {
        setTimeout(() => this.removeNotification(id), duration)
      }
      return id
    },
    removeNotification(id: string) {
      this.notifications = this.notifications.filter(n => n.id !== id)
    },
    async initializePlatform() {
      // Avoid re-initialization
      if (this.isInitialized) return

      try {
        const { useAuthStore } = await import('./auth')
        const { useLibraryStore } = await import('./library')
        const { fetchBooks: fetchCatalog } = await import('../composables/useBookCatalog')
        
        const auth = useAuthStore()
        const library = useLibraryStore()

        // 1. First, Manifest the User (Sequential Requirement)
        await auth.init()

        // 2. Then, Summon the Archives (Parallel allowed once ID is present)
        await Promise.all([
          library.fetchBooks(),
          library.fetchUserSessions(),
          fetchCatalog()
        ])
      } catch (error) {
        console.error('Platform initialization error:', error)
      } finally {
        // Always mark as initialized to prevent blocking the UI
        this.isInitialized = true
      }
    }
  }
})
