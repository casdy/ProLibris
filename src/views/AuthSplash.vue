<script setup lang="ts">
import { onMounted, computed, ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { Sparkles, Flame, MoveRight, LogIn } from 'lucide-vue-next'
import AppLogo from '@/components/AppLogo.vue'

const router = useRouter()
const route = useRoute()
const auth = useAuthStore()

const isWelcome = computed(() => route.name === 'welcome')
const userName = ref(auth.user?.name?.split(' ')[0] || 'Seeker')

onMounted(async () => {
  if (!isWelcome.value) {
    // Perform actual logout during the farewell splash
    await auth.logout()
  }
  
  setTimeout(() => {
    if (isWelcome.value) {
      router.push('/dashboard')
    } else {
      router.push('/login')
    }
  }, 2500)
})
</script>

<template>
  <div class="min-h-screen theme-bg flex items-center justify-center p-6 relative overflow-hidden font-outfit">
    
    <!-- Magical Background Accents -->
    <Transition name="fade-scale" appear>
      <div v-if="isWelcome" class="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div class="w-[60%] h-[60%] bg-[#EEBA30] blur-[160px] opacity-[0.12] rounded-full animate-pulse-slow"></div>
        <div class="absolute w-full h-full bg-[radial-gradient(circle_at_center,rgba(238,186,48,0.05)_0%,transparent_70%)]"></div>
      </div>
      <div v-else class="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div class="w-[60%] h-[60%] bg-[#AE0001] blur-[160px] opacity-[0.12] rounded-full animate-pulse-slow"></div>
        <div class="absolute w-full h-full bg-[radial-gradient(circle_at_center,rgba(174,0,1,0.05)_0%,transparent_70%)]"></div>
      </div>
    </Transition>

    <div class="z-10 text-center space-y-12 max-w-2xl px-4">
      
      <!-- Animated Logo Section -->
      <div class="relative inline-block">
        <div class="absolute -inset-8 bg-gradient-to-tr from-transparent via-[#EEBA30]/10 to-transparent rounded-full blur-2xl animate-spin-slow opacity-50"></div>
        <AppLogo size="lg" class="mb-2 transform hover:scale-110 transition-transform duration-700 animate-float" />
      </div>

      <!-- Main Message -->
      <div class="space-y-6">
        <Transition name="slide-up" appear>
          <div v-if="isWelcome" class="space-y-4">
            <div class="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#EEBA30]/10 border border-[#EEBA30]/20 text-[#EEBA30] text-xs font-black tracking-[0.2em] uppercase mb-2">
              <Sparkles class="w-3.5 h-3.5" /> Magical Entry
            </div>
            <h2 class="text-5xl lg:text-7xl font-black theme-text tracking-tight font-cinzel leading-tight">
              Welcome back, <br/>
              <span class="text-[#EEBA30] block mt-2">{{ userName }}</span>
            </h2>
            <p class="theme-text-soft text-lg font-medium opacity-60">The library is initializing your private collection...</p>
          </div>
          
          <div v-else class="space-y-4">
            <div class="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#AE0001]/10 border border-[#AE0001]/20 text-[#AE0001] text-xs font-black tracking-[0.2em] uppercase mb-2">
              <Flame class="w-3.5 h-3.5" /> Embers of Departure
            </div>
            <h2 class="text-5xl lg:text-7xl font-black theme-text tracking-tight font-cinzel leading-tight">
              Safe travels, <br/>
              <span class="text-[#AE0001] block mt-2">{{ userName }}</span>
            </h2>
            <p class="theme-text-soft text-lg font-medium opacity-60">Your reading progress has been synchronized to the cloud.</p>
          </div>
        </Transition>
      </div>

      <!-- Loading Indicator -->
      <div class="flex items-center justify-center gap-8 pt-8">
         <div class="flex gap-2">
            <div v-for="i in 3" :key="i" 
                 :class="isWelcome ? 'bg-[#EEBA30]' : 'bg-[#AE0001]'"
                 class="w-2.5 h-2.5 rounded-full animate-bounce"
                 :style="{ animationDelay: `${(i-1) * 0.1}s` }">
            </div>
         </div>
      </div>
    </div>

    <!-- Floating Wizarding Sigils -->
    <div class="absolute inset-x-0 bottom-12 flex justify-center opacity-10 space-x-24">
       <LogIn v-if="isWelcome" class="w-12 h-12 text-[#EEBA30]" />
       <MoveRight v-else class="w-12 h-12 text-[#AE0001]" />
    </div>
  </div>
</template>

<style scoped>
.animate-pulse-slow {
  animation: pulse 6s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

.animate-spin-slow {
  animation: spin 12s linear infinite;
}

.animate-float {
  animation: float 4s ease-in-out infinite;
}

@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-15px); }
}

.slide-up-enter-active {
  transition: all 1.2s cubic-bezier(0.16, 1, 0.3, 1);
}
.slide-up-enter-from {
  opacity: 0;
  transform: translateY(40px);
}

.fade-scale-enter-active {
  transition: all 1.5s ease-out;
}
.fade-scale-enter-from {
  opacity: 0;
  transform: scale(0.95);
}
</style>
