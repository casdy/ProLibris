<script setup lang="ts">
import { useReaderStore } from '@/stores/reader'
import { useRouter } from 'vue-router'
import { ref } from 'vue'
import ModeSwitcher from './ModeSwitcher.vue'
import ReadingHUD from './ReadingHUD.vue'
import StandardEngine from './StandardEngine.vue'
import TypingEngine from './TypingEngine.vue'
import SpeedReadEngine from './SpeedReadEngine.vue'
import AnalyticsModal from './AnalyticsModal.vue'
import { ChevronLeft, ChevronRight } from 'lucide-vue-next'
import type { Book } from 'epubjs'

defineProps<{
  bookData: ArrayBuffer
  initialCfi?: string
  isDark: boolean
  fontSize: number
}>()

const emit = defineEmits<{
  relocated: [cfi: string]
  error: [message: string]
  'update-font-size': [size: number]
}>()

const router = useRouter()
const reader = useReaderStore()
const standardEngine = ref<InstanceType<typeof StandardEngine> | null>(null)

const onSpineLoaded = (book: Book) => {
  reader.initBook(book, '')
}

const onRelocated = (cfi: string) => {
  emit('relocated', cfi)
}

const handleNextChapter = async () => {
  reader.showAnalyticsModal = false
  await reader.nextChapter()
}

const handleBackToDashboard = () => {
  router.push('/dashboard')
}

const handlePageComplete = () => {
  if (standardEngine.value) {
    console.log('Focus page complete, advancing...')
    standardEngine.value.nextPage()
  }
}
</script>

<template>
  <div class="flex-1 flex flex-col w-full h-full theme-bg transition-colors duration-500">
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

      <!-- Chapter nav (non-standard modes) -->
      <div v-if="reader.activeMode !== 'standard' && reader.totalChapters > 1" class="flex items-center gap-2">
        <button
          @click="reader.prevChapter()"
          :disabled="reader.currentSpineIndex <= 0"
          class="p-2 rounded-xl bg-black/5 dark:bg-white/5 hover:bg-[#f02e65]/10 hover:text-[#f02e65] transition-all disabled:opacity-20 disabled:pointer-events-none theme-text"
          title="Previous chapter"
        >
          <ChevronLeft class="w-4 h-4" />
        </button>
        <span class="text-xs font-bold text-[var(--text-soft)] opacity-60 whitespace-nowrap">
          Ch. {{ reader.currentSpineIndex + 1 }}/{{ reader.totalChapters }}
        </span>
        <button
          @click="reader.nextChapter()"
          :disabled="reader.currentSpineIndex >= reader.totalChapters - 1"
          class="p-2 rounded-xl bg-black/5 dark:bg-white/5 hover:bg-[#f02e65]/10 hover:text-[#f02e65] transition-all disabled:opacity-20 disabled:pointer-events-none theme-text"
          title="Next chapter"
        >
          <ChevronRight class="w-4 h-4" />
        </button>
      </div>
    </div>

    <!-- Engine Area -->
    <div class="flex-1 min-h-0 relative theme-bg">
      <!-- Standard Mode -->
      <StandardEngine
        v-if="reader.activeMode === 'standard'"
        ref="standardEngine"
        :book-data="bookData"
        :initial-cfi="initialCfi"
        :is-dark="isDark"
        :font-size="fontSize"
        @relocated="onRelocated"
        @spine-loaded="onSpineLoaded"
        @error="e => emit('error', e)"
      />

      <!-- Typing Mode -->
      <TypingEngine
        v-else-if="reader.activeMode === 'typing'"
      />
    </div>

    <!-- Speed Read Focus Overlay (Seamless Integration) -->
    <Transition name="overlay">
      <div v-if="reader.isSpeedReadOverlayOpen" class="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-8">
        <!-- Backdrop Backdrop -->
        <div 
          class="absolute inset-0 bg-[#0d0702]/85 backdrop-blur-2xl"
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
.overlay-enter-active,
.overlay-leave-active {
  transition: all 0.5s cubic-bezier(0.16, 1, 0.3, 1);
}

.overlay-enter-from,
.overlay-leave-to {
  opacity: 0;
  transform: scale(1.05);
  backdrop-filter: blur(0px);
}

@keyframes overlay-in {
  from { opacity: 0; transform: translateY(20px) scale(0.98); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}

.animate-overlay-in {
  animation: overlay-in 0.6s cubic-bezier(0.16, 1, 0.3, 1);
}
</style>
