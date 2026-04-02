<script setup lang="ts">
import { useReaderStore } from '@/stores/reader'
import { useRouter } from 'vue-router'
import ModeSwitcher from './ModeSwitcher.vue'
import ReadingHUD from './ReadingHUD.vue'
import StandardEngine from './StandardEngine.vue'
import TypingEngine from './TypingEngine.vue'
import PacedEngine from './PacedEngine.vue'
import AnalyticsModal from './AnalyticsModal.vue'
import { ChevronLeft, ChevronRight } from 'lucide-vue-next'

const props = defineProps<{
  bookData: ArrayBuffer
  initialCfi?: string
  isDark: boolean
  fontSize: number
}>()

const emit = defineEmits<{
  relocated: [cfi: string]
}>()

const router = useRouter()
const reader = useReaderStore()

const onSpineLoaded = (book: any) => {
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
        :book-data="bookData"
        :initial-cfi="initialCfi"
        :is-dark="isDark"
        :font-size="fontSize"
        @relocated="onRelocated"
        @spine-loaded="onSpineLoaded"
      />

      <!-- Typing Mode -->
      <TypingEngine
        v-else-if="reader.activeMode === 'typing'"
      />

      <!-- Paced Mode -->
      <PacedEngine
        v-else-if="reader.activeMode === 'paced'"
      />
    </div>

    <!-- Analytics Modal -->
    <AnalyticsModal
      @next-chapter="handleNextChapter"
      @back-to-dashboard="handleBackToDashboard"
    />
  </div>
</template>
