<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue'
import { useReaderStore } from '@/stores/reader'
import { 
  Play, Pause, SkipBack, SkipForward, RotateCcw, Minus, Plus, Info, 
  Zap, Gauge, X, Type
} from 'lucide-vue-next'

const props = defineProps<{
  fontSize: number
}>()

const emit = defineEmits<{
  'page-complete': [],
  'update-font-size': [size: number]
}>()

const reader = useReaderStore()

const scrollContainer = ref<HTMLElement | null>(null)
const controlsHaveFocus = ref(false)
const showInfo = ref(false)
const isPageAdvancing = ref(false)

// ─── Visual Pacing Engine (PRD Directive 3) ───────────────────
let pacingTimer: ReturnType<typeof setInterval> | null = null

const calculateInterval = (wpm: number) => {
  return 60000 / Math.max(1, wpm)
}

const startPacing = () => {
  if (pacingTimer) clearInterval(pacingTimer)
  
  const msDelay = calculateInterval(reader.targetWpm)
  
  pacingTimer = setInterval(() => {
    if (reader.currentWordIndex < reader.wordTokens.length - 1) {
      reader.currentWordIndex++
      reader.updatePacedProgress()
      
      // Update sentence index if we cross boundaries
      const currentWord = reader.wordTokens[reader.currentWordIndex]
      if (currentWord) {
        const sentence = reader.sentences.find(s => 
          reader.currentWordIndex >= s.wordStartIndex && 
          reader.currentWordIndex < s.wordStartIndex + s.wordCount
        )
        if (sentence && sentence.index !== reader.currentSentenceIndex) {
          reader.currentSentenceIndex = sentence.index
        }
      }
    } else {
      // Focus session for current page complete
      stopPacing()
      
      // Intelligent Auto-Advance: notify layout to turn page
      isPageAdvancing.value = true
      setTimeout(() => {
        // Only advance if still in "playing" state
        if (reader.isPlaying) {
          emit('page-complete')
        }
      }, 350) // Small breather before turning
    }
  }, msDelay)
}

const stopPacing = () => {
  if (pacingTimer) {
    clearInterval(pacingTimer)
    pacingTimer = null
  }
}

// ─── Watchers ───────────────────────────────────────────────
watch(() => reader.isPlaying, (playing) => {
  if (playing) {
    startPacing()
  } else {
    stopPacing()
  }
})

// Real-time WPM adjustment (PRD Directive 4)
watch(() => reader.targetWpm, () => {
  if (reader.isPlaying) {
    startPacing() // Restart with new interval
  }
})

// Continuous Reading: Watch for new tokens from page scraper
watch(() => reader.wordTokens, (newTokens) => {
  if (newTokens.length > 0) {
    isPageAdvancing.value = false // New text arrived!
    
    if (reader.isPlaying && !pacingTimer) {
      console.log('New focus text detected, resuming pacing...')
      
      // Reset scroll to top instantly for new page
      if (scrollContainer.value) {
        scrollContainer.value.scrollTop = 0
      }
      
      nextTick(() => {
        startPacing()
      })
    }
  }
}, { deep: false })

// Keyboard shortcuts
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
  }
}

// Stabilized Threshold Scroll (Refinement Directive 2)
watch(() => reader.currentWordIndex, () => {
  nextTick(() => {
    const el = scrollContainer.value?.querySelector('[data-word-active="true"]') as HTMLElement
    const container = scrollContainer.value
    if (el && container) {
      const elRect = el.getBoundingClientRect()
      const containerRect = container.getBoundingClientRect()
      
      const relativeTop = elRect.top - containerRect.top
      const relativeBottom = relativeTop + elRect.height
      
      const threshold = containerRect.height * 0.3 // 30% padding
      
      if (relativeTop < threshold) {
        // Scroll up to keep word in focus area
        container.scrollTo({ top: container.scrollTop + relativeTop - threshold, behavior: 'smooth' })
      } else if (relativeBottom > containerRect.height - threshold) {
        // Scroll down
        container.scrollTo({ top: container.scrollTop + (relativeBottom - (containerRect.height - threshold)), behavior: 'smooth' })
      }
    }
  })
})

onMounted(() => {
  window.addEventListener('keydown', onKeydown)
  if (reader.isPlaying) startPacing()
})

onUnmounted(() => {
  window.removeEventListener('keydown', onKeydown)
  stopPacing()
})

// Group words by sentence for visual rendering
const sentenceGroups = computed(() => {
  const groups: { 
    id: number;
    text: string;
    words: typeof reader.wordTokens;
    paragraphIndex: number;
    isCurrent: boolean;
    isRead: boolean;
  }[] = []

  reader.sentences.forEach(sentence => {
    const sentenceWords = reader.wordTokens.slice(
      sentence.wordStartIndex, 
      sentence.wordStartIndex + sentence.wordCount
    )
    
    groups.push({
      id: sentence.index,
      text: sentence.text,
      words: sentenceWords,
      paragraphIndex: sentence.paragraphIndex,
      isCurrent: sentence.index === reader.currentSentenceIndex,
      isRead: sentence.index < reader.currentSentenceIndex
    })
  })

  const paraGroups: { sentences: typeof groups, paragraphIndex: number }[] = []
  let currentParaIdx = -1
  let currentGroup: typeof groups = []

  groups.forEach(sg => {
    if (sg.paragraphIndex !== currentParaIdx && currentGroup.length > 0) {
      paraGroups.push({ sentences: currentGroup, paragraphIndex: currentParaIdx })
      currentGroup = []
    }
    currentParaIdx = sg.paragraphIndex
    currentGroup.push(sg)
  })

  if (currentGroup.length > 0) {
    paraGroups.push({ sentences: currentGroup, paragraphIndex: currentParaIdx })
  }

  return paraGroups
})

const handleSentenceClick = (id: number) => {
  const sentence = reader.sentences[id]
  if (sentence) {
    reader.currentSentenceIndex = id
    reader.currentWordIndex = sentence.wordStartIndex
    reader.updatePacedProgress()
  }
}

const decrementSpeed = () => reader.setTargetWpm(reader.targetWpm - 25)
const incrementSpeed = () => reader.setTargetWpm(reader.targetWpm + 25)

const decrementZoom = () => emit('update-font-size', Math.max(50, props.fontSize - 2))
const incrementZoom = () => emit('update-font-size', props.fontSize + 2)
</script>

<template>
  <div class="w-full h-full flex flex-col relative">
    <div class="shrink-0 mx-auto w-full max-w-4xl px-4 pt-3 flex items-center justify-between">
      <div class="flex items-center gap-3 bg-[#AE0001]/5 border border-[#AE0001]/10 rounded-2xl px-4 py-2">
        <Zap class="w-4 h-4 text-[#AE0001]" />
        <span class="text-[10px] font-black uppercase tracking-wider theme-text opacity-60">ProLibris Focus Engine</span>
      </div>

      <!-- Close Button -->
      <button 
        @click="reader.toggleSpeedReadOverlay()"
        class="p-2 rounded-xl hover:bg-black/10 dark:hover:bg-white/10 transition-all theme-text opacity-60 hover:opacity-100"
        title="Exit Focus Mode"
      >
        <X class="w-5 h-5" />
      </button>
    </div>

    <!-- Controls Bar -->
    <div
      class="shrink-0 w-full max-w-4xl mx-auto px-4 pt-4 pb-2 space-y-3 order-2 md:order-none mb-6 md:mb-0"
      @focusin="controlsHaveFocus = true"
      @focusout="controlsHaveFocus = false"
    >
      <div class="flex items-center gap-4 flex-wrap justify-between bg-black/5 dark:bg-white/5 rounded-3xl p-2 pr-4 border theme-border">
        
        <!-- Left: Branding -->
        <div class="flex items-center gap-4 px-4">
          <Gauge class="w-5 h-5 text-[#AE0001]" />
          <span class="text-xs font-black uppercase tracking-widest theme-text font-cinzel">ProLibris Speed</span>
        </div>

        <!-- Center: Speed & Type Controls -->
        <div class="flex-1 flex items-center justify-center gap-4">
          <!-- Speed -->
          <div class="flex items-center gap-1 border-r theme-border pr-4">
            <button
              @click="decrementSpeed"
              class="p-1.5 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 transition-colors theme-text"
            >
              <Minus class="w-4 h-4" />
            </button>
            <div class="flex flex-col items-center min-w-[60px]">
              <span class="text-xl font-black theme-text tabular-nums leading-none text-[#EEBA30]">
                {{ reader.targetWpm }}
              </span>
              <span class="text-[9px] font-bold text-[var(--text-soft)] opacity-60 uppercase mt-1">
                WPM
              </span>
            </div>
            <button
              @click="incrementSpeed"
              class="p-1.5 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 transition-colors theme-text"
            >
              <Plus class="w-4 h-4" />
            </button>
          </div>

          <!-- Font Size (Zoom) -->
          <div class="flex items-center gap-1 pl-2">
            <button
              @click="decrementZoom"
              class="p-1.5 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 transition-colors theme-text"
              title="Zoom Out"
            >
              <Minus class="w-4 h-4" />
            </button>
            <div class="flex flex-col items-center min-w-[60px]">
              <div class="flex items-center gap-1.5">
                <Type class="w-3 h-3 theme-text opacity-40" />
                <span class="text-lg font-black theme-text tabular-nums leading-none">
                  {{ fontSize }}%
                </span>
              </div>
              <span class="text-[9px] font-bold text-[var(--text-soft)] opacity-60 uppercase mt-1">
                Zoom
              </span>
            </div>
            <button
              @click="incrementZoom"
              class="p-1.5 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 transition-colors theme-text"
              title="Zoom In"
            >
              <Plus class="w-4 h-4" />
            </button>
          </div>
        </div>

        <!-- Right: Main Playback -->
        <div class="flex items-center gap-2">
          <button
            @click="reader.skipWord(-10)"
            class="p-2.5 rounded-xl hover:bg-[#AE0001]/10 hover:text-[#AE0001] transition-all theme-text"
            title="Back 10 words (←)"
          >
            <SkipBack class="w-4 h-4" />
          </button>

          <button
            @click="reader.togglePacedReading()"
            class="w-12 h-12 flex items-center justify-center rounded-2xl text-white shadow-lg transition-all active:scale-95"
            :class="[
              reader.isPlaying
                ? 'bg-[#AE0001] shadow-[#AE0001]/30'
                : 'bg-slate-700 dark:bg-slate-600 shadow-black/20'
            ]"
          >
            <component :is="reader.isPlaying ? Pause : Play" class="w-6 h-6 fill-current" />
          </button>

          <button
            @click="reader.skipWord(10)"
            class="p-2.5 rounded-xl hover:bg-[#AE0001]/10 hover:text-[#AE0001] transition-all theme-text"
            title="Forward 10 words (→)"
          >
            <SkipForward class="w-4 h-4" />
          </button>

          <div class="w-px h-6 bg-black/10 dark:bg-white/10 mx-1" />

          <button
            @click="reader.resetPacedState()"
            class="p-2.5 rounded-xl hover:bg-black/10 dark:hover:bg-white/10 transition-all theme-text opacity-50"
            title="Reset"
          >
            <RotateCcw class="w-4 h-4" />
          </button>
        </div>
      </div>

      <!-- Footer Info -->
      <div class="flex items-center justify-center gap-4 text-[10px] font-bold uppercase tracking-widest text-[var(--text-soft)] opacity-40 py-1">
        <span>Powered by ProLibris Engine</span>
        <span>·</span>
        <span>{{ Math.round(60000 / reader.targetWpm) }}ms per word</span>
        <span>·</span>
        <span>Word {{ reader.currentWordIndex + 1 }} / {{ reader.wordTokens.length }}</span>
        <button 
          @click="showInfo = !showInfo"
          class="hover:text-[#AE0001] transition-colors"
        >
          <Info class="w-3.5 h-3.5" />
        </button>
      </div>
    </div>

    <!-- Info Tooltip -->
    <div v-if="showInfo" class="mx-auto max-w-xl bg-[#AE0001]/5 border border-[#AE0001]/10 rounded-2xl p-4 mb-4 text-xs theme-text mx-4">
      <p class="font-bold mb-1 font-cinzel text-[#EEBA30]">ProLibris Visual Engine</p>
      <p class="opacity-70 leading-relaxed">
        This high-performance reading engine eliminates subvocalization by keeping a steady, mathematical pace. Optimised for the ProLibris hybrid library system.
      </p>
    </div>

    <!-- Text Display -->
    <div
      ref="scrollContainer"
      class="flex-1 w-full max-w-3xl mx-auto overflow-y-auto px-6 sm:px-12 py-10 reader-scroll-container glass-scroll transition-all duration-400 ease-in-out order-1 md:order-none"
      :class="{ 'opacity-10 scale-95 transform blur-[2px]': isPageAdvancing }"
      :style="{ fontSize: `${1.4 * (fontSize / 100)}rem` }"
    >
      <div v-if="reader.isExtracting" class="flex items-center justify-center h-full">
        <div class="w-12 h-12 border-4 border-[#AE0001]/20 border-t-[#AE0001] rounded-full animate-spin" />
      </div>

      <div v-else-if="reader.wordTokens.length === 0" class="flex items-center justify-center h-full text-[var(--text-soft)] opacity-50">
        <p class="text-xl font-medium">Ready to speed read? (No text found)</p>
      </div>

      <div v-else class="select-none px-4 sm:px-12 py-10 pb-64">
        <div class="focus-paper theme-card border theme-border rounded-[2rem] p-6 sm:p-12 md:p-16 shadow-2xl transition-all h-min max-w-2xl mx-auto overflow-hidden">
          <p
            v-for="(group, gIdx) in sentenceGroups"
            :key="gIdx"
            class="paragraph-block mb-10 leading-[2.5] whitespace-normal break-words"
          >
            <span
              v-for="s in group.sentences"
              :key="s.id"
              class="sentence-wrap relative"
              :class="{ 
                'sentence-active': s.isCurrent && reader.isPlaying
              }"
              @click="handleSentenceClick(s.id)"
            >
              <span
                v-for="token in s.words"
                :key="token.index"
                class="paced-word-v3"
                :class="{
                  'paced-active': token.index === reader.currentWordIndex,
                  'paced-read': token.index < reader.currentWordIndex,
                  'paced-unread': token.index > reader.currentWordIndex,
                }"
                :data-word-active="token.index === reader.currentWordIndex ? 'true' : undefined"
              >{{ token.word }}</span>
              <span> </span>
            </span>
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.focus-paper {
  background: var(--bg-app); /* Matches theme but feels contained */
  width: 100%;
  max-width: 100%;
  margin: 0 auto;
  box-sizing: border-box;
  overflow-wrap: break-word;
  word-break: break-word;
}

:global(.light) .focus-paper {
  background: #fff;
  color: #1a0f05;
}

.paced-word-v3 {
  display: inline;
  padding: 1px 4px;
  border-radius: 4px;
  font-family: var(--font-outfit), sans-serif;
  transition: opacity 0.3s ease, background-color 0.1s ease;
  cursor: default;
  position: relative;
  letter-spacing: -0.01em;
  line-height: inherit;
}

.paced-read {
  color: var(--text-main);
  opacity: 0.25;
}

.paced-unread {
  color: var(--text-main);
  opacity: 1; 
}

.paced-active {
  color: white !important; 
  background: #AE0001; 
  box-shadow: 0 4px 12px rgba(174, 0, 1, 0.4);
  z-index: 10;
  border-radius: 4px;
}

:global(.dark) .paced-active {
  color: #fff !important;
  background: #AE0001;
}

.sentence-wrap {
  border-radius: 8px;
  transition: all 0.3s ease;
  padding: 2px 0px;
  cursor: pointer;
  margin: 0px;
}

/* Removed sentence-active background to prevent layout jitter, kept it clean */

.paragraph-block {
  transition: opacity 0.5s ease;
}

/* Glass Scroll Enhancement */
.glass-scroll::-webkit-scrollbar {
  width: 6px;
}
.glass-scroll::-webkit-scrollbar-track {
  background: transparent;
}
.glass-scroll::-webkit-scrollbar-thumb {
  background: rgba(174, 0, 1, 0.2);
  border-radius: 10px;
}
.glass-scroll::-webkit-scrollbar-thumb:hover {
  background: rgba(174, 0, 1, 0.4);
}
</style>
