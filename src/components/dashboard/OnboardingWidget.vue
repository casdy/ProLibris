<script setup lang="ts">
import { ref, computed } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useLibraryStore } from '@/stores/library'
import { Genres } from '@/lib/genreMapper'
import { Sparkles, Check, ArrowRight, ShieldCheck } from 'lucide-vue-next'

const auth = useAuthStore()
const library = useLibraryStore()

const selectedGenres = ref<string[]>([...(auth.user?.prefs?.interests || [])])
const isSaving = ref(false)

const toggleGenre = (genre: string) => {
  if (selectedGenres.value.includes(genre)) {
    selectedGenres.value = selectedGenres.value.filter(g => g !== genre)
  } else {
    selectedGenres.value.push(genre)
  }
}

const saveInterests = async () => {
  if (selectedGenres.value.length === 0) return
  isSaving.value = true
  try {
    await auth.updateInterests(selectedGenres.value)
    // Small delay for aesthetic transition
    setTimeout(() => {
      isSaving.value = false
    }, 1000)
  } catch (e) {
    console.error('Failed to save interests:', e)
    isSaving.value = false
  }
}

const hasInterests = computed(() => {
  const interests = auth.user?.prefs?.interests
  return Array.isArray(interests) && interests.length > 0
})
</script>

<template>
  <Transition name="fade-slide">
    <div v-if="!hasInterests" class="relative group">
      <!-- Background Glow -->
      <div class="absolute -inset-1 bg-gradient-to-r from-[#AE0001] via-[#EEBA30] to-[#AE0001] rounded-[2.5rem] blur-xl opacity-20 group-hover:opacity-40 transition-opacity duration-1000"></div>
      
      <div class="relative theme-card rounded-[2.25rem] border theme-border overflow-hidden bg-white/50 dark:bg-[#1a0f05]/50 backdrop-blur-3xl p-8 sm:p-12 shadow-2xl">
        <div class="flex flex-col lg:flex-row gap-12 items-center">
          
          <!-- Left Content -->
          <div class="flex-1 space-y-6 text-center lg:text-left">
            <div class="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#f02e65]/10 border border-[#f02e65]/20 text-[#f02e65] text-[10px] font-black uppercase tracking-widest">
              <Sparkles class="w-3.5 h-3.5" /> Manifest your Archive
            </div>
            
            <h2 class="text-3xl sm:text-4xl lg:text-5xl font-black theme-text font-cinzel leading-tight tracking-tight">
              What paths shall we <br/>
              <span class="text-[#EEBA30]">tread today?</span>
            </h2>
            
            <p class="theme-text-soft text-lg font-medium max-w-lg leading-relaxed">
              Select the literary domains you wish to master. We will curate your private collection based on these sacred choices.
            </p>

            <div class="hidden lg:flex items-center gap-4 py-4 text-xs font-bold theme-text-soft opacity-40 uppercase tracking-[0.2em]">
               <ShieldCheck class="w-4 h-4" />
               Your choices are private & encrypted
            </div>
          </div>

          <!-- Right: Genre Selection Grid -->
          <div class="w-full lg:w-[500px] space-y-8">
            <div class="flex flex-wrap justify-center lg:justify-start gap-3">
              <button 
                v-for="genre in Genres" 
                :key="genre"
                @click="toggleGenre(genre)"
                :class="selectedGenres.includes(genre) 
                  ? 'bg-[#AE0001] text-white border-[#AE0001] shadow-lg shadow-[#AE0001]/30 scale-105' 
                  : 'theme-card theme-text-soft border theme-border hover:border-[#EEBA30]/40'"
                class="px-5 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all duration-300 flex items-center gap-2"
              >
                <span>{{ genre }}</span>
                <Check v-if="selectedGenres.includes(genre)" class="w-3.5 h-3.5" />
              </button>
            </div>

            <button 
              @click="saveInterests"
              :disabled="selectedGenres.length === 0 || isSaving"
              class="w-full py-5 bg-[#AE0001] text-white rounded-[1.25rem] font-black uppercase tracking-[0.3em] text-sm shadow-2xl shadow-[#AE0001]/40 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-20 disabled:pointer-events-none group flex items-center justify-center gap-3 overflow-hidden relative"
            >
              <span v-if="isSaving" class="flex items-center gap-3">
                <div class="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                Initializing...
              </span>
              <span v-else class="flex items-center gap-3">
                Begin Archival Sync
                <ArrowRight class="w-4 h-4 group-hover:translate-x-2 transition-transform" />
              </span>
              
              <!-- Subtle shine effect -->
              <div class="absolute inset-x-0 top-0 h-full w-24 bg-white/20 -skew-x-12 -translate-x-full group-hover:animate-shine"></div>
            </button>
          </div>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
@keyframes shine {
  0% { transform: translateX(-100%) skewX(-12deg); }
  100% { transform: translateX(500%) skewX(-12deg); }
}
.animate-shine {
  animation: shine 1s ease-in-out infinite;
}

.fade-slide-enter-active, .fade-slide-leave-active {
  transition: all 0.6s cubic-bezier(0.23, 1, 0.32, 1);
}
.fade-slide-enter-from { opacity: 0; transform: translateY(20px); }
.fade-slide-leave-to { opacity: 0; transform: scale(0.95); }
</style>
