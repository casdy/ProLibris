<script setup lang="ts">
import { onMounted, ref } from 'vue'
import AppLogo from './AppLogo.vue'

const props = defineProps<{
  isReady: boolean
}>()

const emit = defineEmits<{
  'finished': []
}>()

const show = ref(true)
const isExiting = ref(false)

onMounted(() => {
  // Minimum splash time to avoid flickering if init is too fast
  const minTime = 1200 
  const startTime = Date.now()

  const checkReady = setInterval(() => {
    const elapsed = Date.now() - startTime
    if (props.isReady && elapsed >= minTime) {
      clearInterval(checkReady)
      startExit()
    }
    // Safety fallback
    if (elapsed > 4000) {
      clearInterval(checkReady)
      startExit()
    }
  }, 100)
})

const startExit = () => {
  isExiting.value = true
  setTimeout(() => {
    show.value = false
    emit('finished')
  }, 600) // Match transition duration
}
</script>

<template>
  <Transition name="splash-fade">
    <div v-if="show" class="fixed inset-0 z-[100] theme-bg flex flex-col items-center justify-center overflow-hidden">
      
      <!-- Background Decorative Elements -->
      <div class="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-[#AE0001]/10 blur-[120px] animate-pulse" />
      <div class="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-[#EEBA30]/5 blur-[120px] animate-pulse-slow" />

      <!-- Centered Content -->
      <div class="relative flex flex-col items-center gap-8" :class="{ 'scale-110 opacity-0 transition-all duration-700 ease-in': isExiting }">
        <div class="relative">
          <!-- Pulse rings -->
          <div class="absolute inset-0 rounded-full bg-[#AE0001]/20 animate-ping-slow" />
          <div class="absolute inset-0 rounded-full bg-[#EEBA30]/10 animate-ping-slower" />
          
          <div class="relative p-6 bg-white dark:bg-black/20 rounded-[2.5rem] shadow-2xl shadow-[#AE0001]/20 border border-[#AE0001]/10 backdrop-blur-xl">
             <AppLogo size="lg" class="animate-float" />
          </div>
        </div>

        <div class="flex flex-col items-center gap-2">
          <h2 class="text-3xl font-black uppercase tracking-[0.3em] theme-text animate-reveal font-cinzel">
            Prolibris
          </h2>
          <div class="flex items-center gap-4">
            <div class="h-[1px] w-8 bg-gradient-to-r from-transparent to-[#EEBA30]" />
            <span class="text-[10px] font-bold uppercase tracking-[0.4em] text-[#EEBA30] opacity-80">
              ProLibris Engine
            </span>
            <div class="h-[1px] w-8 bg-gradient-to-l from-transparent to-[#EEBA30]" />
          </div>
        </div>
      </div>

      <!-- Loading Progress -->
      <div class="absolute bottom-12 left-1/2 -translate-x-1/2 flex flex-col items-center gap-4">
        <div class="w-48 h-[2px] bg-black/5 dark:bg-white/5 rounded-full overflow-hidden">
          <div class="h-full bg-gradient-to-r from-[#AE0001] via-[#EEBA30] to-[#AE0001] animate-loading-bar" />
        </div>
        <p class="text-[10px] font-black uppercase tracking-widest theme-text-soft opacity-40 animate-pulse">
          Initializing ProLibris Engine...
        </p>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.animate-ping-slow {
  animation: ping 3s cubic-bezier(0, 0, 0.2, 1) infinite;
}
.animate-ping-slower {
  animation: ping 4s cubic-bezier(0, 0, 0.2, 1) infinite;
}
@keyframes ping {
  75%, 100% {
    transform: scale(2);
    opacity: 0;
  }
}

.animate-float {
  animation: float 6s ease-in-out infinite;
}
@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-10px); }
}

.animate-pulse-slow {
  animation: pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

.animate-loading-bar {
  width: 100%;
  animation: loading 2.5s infinite ease-in-out;
  transform-origin: left;
}
@keyframes loading {
  0% { transform: scaleX(0); }
  50% { transform: scaleX(0.7); }
  100% { transform: scaleX(1); opacity: 0; }
}

.animate-reveal {
  animation: reveal 1s cubic-bezier(0.23, 1, 0.32, 1) forwards;
}
@keyframes reveal {
  from { opacity: 0; transform: translateY(10px); letter-spacing: 0.1em; }
  to { opacity: 1; transform: translateY(0); letter-spacing: 0.3em; }
}

.splash-fade-leave-active {
  transition: opacity 0.6s cubic-bezier(0.4, 0, 0.2, 1), transform 0.6s ease-in;
}
.splash-fade-leave-to {
  opacity: 0;
}
</style>
