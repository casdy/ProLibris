<script setup lang="ts">
import { useReaderStore } from '@/stores/reader'
import { useRouter } from 'vue-router'
import { ref } from 'vue'
import ModeSwitcher from './ModeSwitcher.vue'
import ReadingHUD from './ReadingHUD.vue'
import MarkdownEngine from './MarkdownEngine.vue'
import TypingEngine from './TypingEngine.vue'
import SpeedReadEngine from './SpeedReadEngine.vue'
import AnalyticsModal from './AnalyticsModal.vue'
import { ChevronLeft, ChevronRight } from 'lucide-vue-next'

defineProps<{
  markdownContent: string
  initialPos?: string
  isDark: boolean
  fontSize: number
}>()

const emit = defineEmits<{
  relocated: [pos: string]
  error: [message: string]
  'update-font-size': [size: number]
}>()

const router = useRouter()
const reader = useReaderStore()
const markdownEngine = ref<InstanceType<typeof MarkdownEngine> | null>(null)
const isTransitioning = ref(false)

// Debounce for navigation
let navDebounceTimer: ReturnType<typeof setTimeout> | null = null
const DEBOUNCE_MS = 250

const debouncedNav = (action: () => void) => {
  if (navDebounceTimer) return
  action()
  navDebounceTimer = setTimeout(() => {
    navDebounceTimer = null
  }, DEBOUNCE_MS)
}

const onRelocated = (pos: string) => {
  emit('relocated', pos)
}

const handleNextChapter = async () => {
  reader.showAnalyticsModal = false
  debouncedNav(() => reader.nextChapter())
}

const handleBackToDashboard = () => {
  router.push('/dashboard')
}

const handlePageComplete = () => {
  if (markdownEngine.value) {
    console.log('Focus page complete, advancing...')
    markdownEngine.value.nextPage()
  }
}
</script>

<template>
  <div 
    class="flex-1 flex flex-col w-full h-full theme-bg transition-colors duration-500"
    :class="{ 'pointer-events-none': isTransitioning }"
  >
    <!-- Top Controls Bar -->
    <div class="shrink-0 px-4 py-2 flex flex-col sm:flex-row items-center gap-3 border-b theme-border bg-black/5 dark:bg-white/2 backdrop-blur-md">
      <!-- Mode Switcher -->
      <div class="w-full sm:w-auto sm:min-w-[280px]">
        <ModeSwitcher />
      </div>

      <!-- HUD -->
      <div class="flex-1 w-full">
        <ReadingHUD />
      </div>

      <!-- Chapter nav -->
      <div v-if="reader.totalChapters > 1" class="flex items-center gap-2">
        <button
          @click="debouncedNav(() => reader.prevChapter())"
          :disabled="reader.currentChapterIndex <= 0 || isTransitioning"
          class="p-2 rounded-xl bg-black/5 dark:bg-white/5 hover:bg-[#f02e65]/10 hover:text-[#f02e65] transition-all disabled:opacity-20 disabled:pointer-events-none theme-text"
          title="Previous chapter"
        >
          <ChevronLeft class="w-4 h-4" />
        </button>
        <span class="text-xs font-bold text-[var(--text-soft)] opacity-60 whitespace-nowrap">
          Ch. {{ reader.currentChapterIndex + 1 }}/{{ reader.totalChapters }}
        </span>
        <button
          @click="debouncedNav(() => reader.nextChapter())"
          :disabled="reader.currentChapterIndex >= reader.totalChapters - 1 || isTransitioning"
          class="p-2 rounded-xl bg-black/5 dark:bg-white/5 hover:bg-[#f02e65]/10 hover:text-[#f02e65] transition-all disabled:opacity-20 disabled:pointer-events-none theme-text"
          title="Next chapter"
        >
          <ChevronRight class="w-4 h-4" />
        </button>
      </div>
    </div>

    <!-- Engine Area -->
    <div class="flex-1 min-h-0 relative theme-bg overflow-hidden">
      <Transition 
        name="engine" 
        mode="out-in"
        @before-enter="isTransitioning = true"
        @after-enter="isTransitioning = false"
        @before-leave="isTransitioning = true"
        @after-leave="isTransitioning = false"
      >
        <!-- Standard Mode -->
        <MarkdownEngine
          v-if="reader.activeMode === 'standard'"
          :key="'standard'"
          ref="markdownEngine"
          :markdown-content="markdownContent"
          :initial-pos="initialPos"
          :is-dark="isDark"
          :font-size="fontSize"
          @relocated="onRelocated"
          @error="e => emit('error', e)"
        />

        <!-- Typing Mode -->
        <TypingEngine
          v-else-if="reader.activeMode === 'typing'"
          :key="'typing'"
        />
      </Transition>
    </div>

    <!-- Speed Read Focus Overlay (Seamless Integration) -->
    <Transition 
      name="overlay"
      @before-enter="isTransitioning = true"
      @after-enter="isTransitioning = false"
      @before-leave="isTransitioning = true"
      @after-leave="isTransitioning = false"
    >
      <div v-if="reader.isSpeedReadOverlayOpen" class="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-8">
        <!-- Backdrop Backdrop -->
        <div 
          class="absolute inset-0 bg-[#0d0702]/85 backdrop-blur-3xl transition-opacity duration-300"
          @click="reader.toggleSpeedReadOverlay()"
        />
        
        <!-- Engine Content -->
        <div class="relative w-full h-full max-w-5xl bg-white/2 dark:bg-black/2 rounded-3xl border theme-border shadow-2xl overflow-hidden animate-overlay-in">
          <SpeedReadEngine 
            :font-size="fontSize"
            @page-complete="handlePageComplete" 
            @update-font-size="s => emit('update-font-size', s)"
          />
        </div>
      </div>
    </Transition>

    <!-- Analytics Modal -->
    <AnalyticsModal
      @next-chapter="handleNextChapter"
      @back-to-dashboard="handleBackToDashboard"
    />
  </div>
</template>

<style scoped>
/* Engine mode transitions */
.engine-enter-active,
.engine-leave-active {
  transition: all 0.35s cubic-bezier(0.22, 1, 0.36, 1);
  will-change: transform, opacity;
}

.engine-enter-from {
  opacity: 0;
  transform: translate3d(0, 10px, 0);
}

.engine-leave-to {
  opacity: 0;
  transform: translate3d(0, -10px, 0);
}

/* Speed Read Overlay transitions */
.overlay-enter-active,
.overlay-leave-active {
  transition: all 0.35s cubic-bezier(0.22, 1, 0.36, 1);
  will-change: transform, opacity, backdrop-filter;
}

.overlay-enter-from,
.overlay-leave-to {
  opacity: 0;
  transform: translate3d(0, 0, 0) scale(1.02);
  backdrop-filter: blur(0px);
}

@keyframes overlay-in {
  from { opacity: 0; transform: translateY(15px) scale(0.99); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}

.animate-overlay-in {
  animation: overlay-in 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}
</style>
