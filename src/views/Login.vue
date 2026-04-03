<script setup lang="ts">
import { ref } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useRouter } from 'vue-router'
import { Mail, Lock, User } from 'lucide-vue-next'
import AppLogo from '@/components/AppLogo.vue'

const auth = useAuthStore()
const router = useRouter()

const isLogin = ref(true)
const email = ref('')
const password = ref('')
const name = ref('')
const error = ref('')
const loading = ref(false)

const handleSubmit = async () => {
  error.value = ''
  loading.value = true
  try {
    if (isLogin.value) {
      await auth.login(email.value, password.value)
    } else {
      await auth.signup(email.value, password.value, name.value)
    }
    router.push('/welcome')
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : 'Authentication failed'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="min-h-screen theme-bg flex items-center justify-center p-6 lg:p-12 relative overflow-hidden font-outfit transition-colors duration-300">
    <!-- Background Accents -->
    <!-- Background Accents -->
    <div class="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-[#EEBA30] blur-[150px] opacity-[0.08] rounded-full animate-pulse"></div>
    <div class="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-[#AE0001] blur-[150px] opacity-[0.08] rounded-full"></div>

    <div class="w-full max-w-lg z-10">
      <div class="text-center mb-12">
        <AppLogo size="lg" class="mb-6 transform hover:rotate-6 transition-all shadow-xl mx-auto" />
        <h1 class="text-4xl font-black theme-text tracking-[0.2em] mb-3 uppercase font-cinzel text-[#EEBA30]">Prolibris</h1>
        <p class="theme-text-soft text-lg font-medium opacity-80">Your Personal Cloud-Synced Library</p>
      </div>

      <div class="theme-card backdrop-blur-3xl border theme-border rounded-3xl p-10 shadow-2xl shadow-black/10">
        <div class="mb-10 flex gap-4 p-1 bg-black/10 dark:bg-white/5 rounded-xl border theme-border">
          <button 
            @click="isLogin = true"
            :class="[isLogin ? 'bg-[#AE0001] text-white shadow-lg shadow-[#AE0001]/20' : 'theme-text-soft hover:theme-text']"
            class="flex-1 py-3.5 rounded-2xl font-bold transition-all"
          >
            Log In
          </button>
          <button 
            @click="isLogin = false"
            :class="[!isLogin ? 'bg-[#AE0001] text-white shadow-lg shadow-[#AE0001]/20' : 'theme-text-soft hover:theme-text']"
            class="flex-1 py-3.5 rounded-2xl font-bold transition-all"
          >
            Join Us
          </button>
        </div>

        <form @submit.prevent="handleSubmit" class="space-y-6">
          <div v-if="!isLogin" class="space-y-2">
            <label class="text-sm font-semibold theme-text-soft ml-1">Display Name</label>
            <div class="relative group">
              <User class="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 theme-text-soft group-focus-within:text-[#AE0001] transition-colors" />
              <input 
                v-model="name"
                required
                type="text" 
                placeholder="How should we call you?"
                class="w-full pl-12 pr-4 py-4 theme-card border theme-border focus:border-[#AE0001] focus:ring-4 focus:ring-[#AE0001]/10 rounded-2xl outline-none transition-all theme-text"
              />
            </div>
          </div>

          <div class="space-y-2">
            <label class="text-sm font-semibold theme-text-soft ml-1">Email Address</label>
            <div class="relative group">
              <Mail class="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 theme-text-soft group-focus-within:text-[#AE0001] transition-colors" />
              <input 
                v-model="email"
                required
                type="email" 
                placeholder="your@email.com"
                class="w-full pl-12 pr-4 py-4 theme-card border theme-border focus:border-[#AE0001] focus:ring-4 focus:ring-[#AE0001]/10 rounded-2xl outline-none transition-all theme-text"
              />
            </div>
          </div>

          <div class="space-y-2">
            <label class="text-sm font-semibold theme-text-soft ml-1">Password</label>
            <div class="relative group">
              <Lock class="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 theme-text-soft group-focus-within:text-[#AE0001] transition-colors" />
              <input 
                v-model="password"
                required
                type="password" 
                placeholder="Minimum 8 characters"
                minlength="8"
                class="w-full pl-12 pr-4 py-4 theme-card border theme-border focus:border-[#AE0001] focus:ring-4 focus:ring-[#AE0001]/10 rounded-2xl outline-none transition-all theme-text"
              />
            </div>
          </div>

          <div v-if="error" class="bg-[#FF3B30]/10 text-[#FF3B30] p-4 rounded-xl text-sm font-medium border border-[#FF3B30]/20 animate-shake">
            {{ error }}
          </div>

          <button 
            type="submit"
            :disabled="loading"
            class="w-full py-4 bg-gradient-to-r from-[#AE0001] to-[#8B1A1A] hover:from-[#8B1A1A] hover:to-[#AE0001] text-white rounded-2xl font-bold text-lg shadow-xl shadow-[#AE0001]/20 hover:shadow-[#AE0001]/40 transition-all duration-300 transform active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <span v-if="loading" class="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
            {{ isLogin ? 'Sign In' : 'Create Account' }}
          </button>
        </form>

        <p class="mt-8 text-center text-[#86868B] text-sm theme-text-soft opacity-60">
          Protected by <span class="text-[#AE0001] font-semibold">Appwrite</span> Cloud Security
        </p>
      </div>
    </div>
  </div>
</template>

<style scoped>
@keyframes shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-4px); }
  75% { transform: translateX(4px); }
}
.animate-shake {
  animation: shake 0.3s ease-in-out;
}
</style>
