import { defineStore } from 'pinia'
import { account } from '@/lib/appwrite'
import { ID, type Models } from 'appwrite'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null as Models.User<Models.Preferences> | null,
    loading: true,
  }),
  getters: {
    isVerified: (state) => state.user?.emailVerification ?? false,
  },
  actions: {
    async refreshUser() {
      try {
        this.user = await account.get()
      } catch {
        this.user = null
      }
    },
    async init() {
      try {
        this.user = await account.get()
      } catch {
        this.user = null
      } finally {
        this.loading = false
      }
    },
    async login(email: string, pass: string) {
      await account.createEmailPasswordSession(email, pass)
      this.user = await account.get()
    },
    async signup(email: string, pass: string, name: string) {
      await account.create(ID.unique(), email, pass, name)
      await this.login(email, pass)
    },
    async logout() {
      await account.deleteSession('current')
      this.user = null
    },
    async sendVerification(origin?: string) {
      const resolvedOrigin = origin
        ?? (typeof window !== 'undefined' ? window.location.origin : '')
      const url = `${resolvedOrigin}/verify-complete`
      await account.createVerification(url)
    },
    async updateInterests(genres: string[]) {
      if (!this.user) return
      this.user.prefs = { ...this.user.prefs, interests: genres }
      await account.updatePrefs(this.user.prefs)
    }
  },
})
