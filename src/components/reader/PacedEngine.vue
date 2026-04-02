<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue'
import { useReaderStore } from '@/stores/reader'
import { Play, Pause, SkipBack, SkipForward, RotateCcw, Minus, Plus } from 'lucide-vue-next'

const reader = useReaderStore()
const scrollContainer = ref<HTMLElement | null>(null)
const controlsHaveFocus = ref(false)

// Keyboard shortcuts — only when controls don't have focus
const onKeydown = (e: KeyboardEvent) => {
  if (reader.activeMode !== 'paced') return
  if (controlsHaveFocus.value) return

  if (e.code === 'Space') {
    e.preventDefault()
    reader.togglePacedReading()
  } else if (e.key === 'ArrowRight') {
    e.preventDefault()
    reader.skipWord(5)
  } else if (e.key === 'ArrowLeft') {
    e.preventDefault()
    reader.skipWord(-5)
  } else if (e.key === 'ArrowUp') {
    e.preventDefault()
    reader.setTargetWpm(reader.targetWpm + 25)
  } else if (e.key === 'ArrowDown') {
    e.preventDefault()
    reader.setTargetWpm(reader.targetWpm - 25)
  }
}

// Auto-scroll to active word
watch(() => reader.currentWordIndex, () => {
  nextTick(() => {
    const el = scrollContainer.value?.querySelector('[data-word-active="true"]') as HTMLElement
    if (el) {
      el.scrollIntoView({ block: 'center', behavior: 'smooth' })
    }
  })
})

onMounted(() => {
  window.addEventListener('keydown', onKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', onKeydown)
})

// Group words by paragraph
const paragraphGroups = computed(() => {
  const groups: { words: typeof reader.wordTokens; paragraphIndex: number }[] = []
  let currentGroup: typeof reader.wordTokens = []
  let currentParagraph = -1

  reader.wordTokens.forEach(token => {
    if (token.paragraphIndex !== currentParagraph && currentGroup.length > 0) {
      groups.push({ words: currentGroup, paragraphIndex: currentParagraph })
      currentGroup = []
    }
    currentParagraph = token.paragraphIndex
    currentGroup.push(token)
  })

  if (currentGroup.length > 0) {
    groups.push({ words: currentGroup, paragraphIndex: currentParagraph })
  }

  return groups
})

// Compute ms per word display
const msPerWord = computed(() => Math.round(60000 / reader.targetWpm))

const resetPaced = () => {
  reader.resetPacedState()
}

const decrementWpm = () => reader.setTargetWpm(reader.targetWpm - 25)
const incrementWpm = () => reader.setTargetWpm(reader.targetWpm + 25)
</script>

<template>
  <div class="w-full h-full flex flex-col">
    <!-- Controls Bar -->
    <div
      class="shrink-0 w-full max-w-3xl mx-auto px-4 pt-4 pb-2 space-y-3"
      @focusin="controlsHaveFocus = true"
      @focusout="controlsHaveFocus = false"
    >
      <!-- WPM + Playback unified row -->
      <div class="flex items-center gap-3 flex-wrap justify-center">
        <!-- Speed controls -->
        <div class="flex items-center gap-2 bg-black/5 dark:bg-white/5 rounded-2xl px-3 py-2">
          <button
            @click="decrementWpm"
            class="p-1.5 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 transition-colors theme-text"
          >
            <Minus class="w-3.5 h-3.5" />
          </button>
          <div class="flex items-center gap-1 min-w-[80px] justify-center">
            <span class="text-lg font-black theme-text tabular-nums">{{ reader.targetWpm }}</span>
            <span class="text-[10px] font-bold text-[var(--text-soft)] opacity-60 uppercase">wpm</span>
          </div>
          <button
            @click="incrementWpm"
            class="p-1.5 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 transition-colors theme-text"
          >
            <Plus class="w-3.5 h-3.5" />
          </button>
        </div>

        <!-- Slider -->
        <input
          type="range"
          :value="reader.targetWpm"
          @input="reader.setTargetWpm(+($event.target as HTMLInputElement).value)"
          min="50"
          max="1000"
          step="10"
          class="flex-1 min-w-[120px] accent-[#f02e65] h-1.5"
        />

        <!-- Playback -->
        <div class="flex items-center gap-1.5">
          <button
            @click="reader.skipWord(-10)"
            class="p-2 rounded-xl bg-black/5 dark:bg-white/5 hover:bg-[#f02e65]/10 hover:text-[#f02e65] transition-all active:scale-95 theme-text"
            title="Back 10 words (←)"
          >
            <SkipBack class="w-4 h-4" />
          </button>

          <button
            @click="reader.togglePacedReading()"
            class="p-3.5 rounded-2xl text-white shadow-lg transition-all active:scale-95"
            :class="[
              reader.isPlaying
                ? 'bg-[#f02e65] shadow-[#f02e65]/30 hover:shadow-[#f02e65]/50'
                : 'bg-black/20 dark:bg-white/10 shadow-black/20 hover:bg-[#f02e65] hover:shadow-[#f02e65]/30'
            ]"
            title="Play/Pause (Space)"
          >
            <component :is="reader.isPlaying ? Pause : Play" class="w-5 h-5" />
          </button>

          <button
            @click="reader.skipWord(10)"
            class="p-2 rounded-xl bg-black/5 dark:bg-white/5 hover:bg-[#f02e65]/10 hover:text-[#f02e65] transition-all active:scale-95 theme-text"
            title="Forward 10 words (→)"
          >
            <SkipForward class="w-4 h-4" />
          </button>

          <button
            @click="resetPaced"
            class="p-2 rounded-xl bg-black/5 dark:bg-white/5 hover:bg-[#f02e65]/10 hover:text-[#f02e65] transition-all active:scale-95 theme-text"
            title="Reset"
          >
            <RotateCcw class="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <!-- Info strip -->
      <div class="flex items-center justify-center gap-4 text-[10px] font-bold uppercase tracking-widest text-[var(--text-soft)] opacity-40">
        <span>{{ msPerWord }}ms / word</span>
        <span>·</span>
        <span>{{ reader.currentWordIndex + 1 }} / {{ reader.wordTokens.length }}</span>
        <span class="hidden sm:inline">· Space play/pause · ↑↓ speed · ←→ skip</span>
      </div>
    </div>

    <!-- Text Display — purely passive, words sweep with color -->
    <div
      ref="scrollContainer"
      class="flex-1 w-full max-w-3xl mx-auto overflow-y-auto px-6 sm:px-10 py-8 reader-scroll-container"
    >
      <div v-if="reader.isExtracting" class="flex items-center justify-center h-full">
        <div class="w-10 h-10 border-4 border-[#f02e65]/20 border-t-[#f02e65] rounded-full animate-spin" />
      </div>

      <div v-else-if="reader.wordTokens.length === 0" class="flex items-center justify-center h-full text-[var(--text-soft)] opacity-50">
        <p class="text-lg font-medium">No text to display for this chapter.</p>
      </div>

      <div v-else class="select-none">
        <p
          v-for="(group, gIdx) in paragraphGroups"
          :key="gIdx"
          class="mb-6 leading-[2.4]"
        >
          <span
            v-for="token in group.words"
            :key="token.index"
            class="paced-word-v2"
            :class="{
              'paced-active': token.index === reader.currentWordIndex,
              'paced-read': token.index < reader.currentWordIndex,
              'paced-unread': token.index > reader.currentWordIndex,
              'paced-near-before': token.index < reader.currentWordIndex && reader.currentWordIndex - token.index <= 2,
              'paced-near-after': token.index > reader.currentWordIndex && token.index - reader.currentWordIndex <= 2,
            }"
            :data-word-active="token.index === reader.currentWordIndex ? 'true' : undefined"
          >{{ token.word }}</span>
          <span> </span>
        </p>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* ─── Paced Reader v2: color sweep across all words ─── */

.paced-word-v2 {
  display: inline;
  padding: 3px 2px;
  border-radius: 4px;
  font-size: 1.2rem;
  line-height: 2.4;
  transition: color 0.25s ease, background-color 0.3s ease, opacity 0.3s ease, transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
  cursor: default;
}

/* Already-read words — colored sweep showing where you've been */
.paced-read {
  color: var(--color-correct);
  opacity: 0.5;
}

/* Recently passed words — still bright */
.paced-near-before {
  color: var(--color-correct);
  opacity: 0.75;
}

/* THE active word — big highlight with glow */
.paced-active {
  color: #fff;
  background: linear-gradient(135deg, #f02e65, #e11d48);
  border-radius: 6px;
  padding: 3px 8px;
  display: inline-block;
  transform: scale(1.12);
  box-shadow: 0 4px 16px rgba(240, 46, 101, 0.35), 0 0 30px rgba(240, 46, 101, 0.15);
  font-weight: 700;
  letter-spacing: 0.01em;
}

/* Words coming up next — slightly dimmed */
.paced-near-after {
  color: var(--text-main);
  opacity: 0.8;
}

/* Distant future words — ghost-like */
.paced-unread {
  color: var(--text-main);
  opacity: 0.35;
}

/* Dark mode refinements */
:global(.dark) .paced-read {
  color: var(--color-correct);
  opacity: 0.4;
}

:global(.dark) .paced-near-before {
  color: var(--color-correct);
  opacity: 0.65;
}

:global(.dark) .paced-active {
  color: #fff;
  box-shadow: 0 4px 20px rgba(240, 46, 101, 0.4), 0 0 40px rgba(240, 46, 101, 0.2);
}

:global(.dark) .paced-unread {
  opacity: 0.3;
}
</style>
