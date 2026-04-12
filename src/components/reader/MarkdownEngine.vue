<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { marked } from 'marked'
import { ChevronLeft, ChevronRight, Zap } from 'lucide-vue-next'
import { useReaderStore } from '@/stores/reader'

const props = defineProps<{
  markdownContent: string
  initialPos?: string
  isDark: boolean
  fontSize: number
}>()

const emit = defineEmits<{
  relocated: [pos: string]
  error: [message: string]
}>()
const reader = useReaderStore()

const viewer = ref<HTMLElement | null>(null)
const renderedHtml = ref('')
const isIndexing = ref(false)
let indexingController: AbortController | null = null
let isMounted = false

// Debounce for navigation
let navDebounceTimer: ReturnType<typeof setTimeout> | null = null
const DEBOUNCE_MS = 250

// Configure marked for v5+ API (marked.setOptions was removed)
marked.use({
  gfm: true,
  breaks: true,
})

const renderMarkdown = async () => {
  if (!isMounted) return
  // Cancel any ongoing indexing
  if (indexingController) {
    indexingController.abort()
  }
  indexingController = new AbortController()
  const signal = indexingController.signal

  try {
    isIndexing.value = true
    const rawHtml = await marked.parse(reader.currentChapterContent)

    if (!isMounted || signal.aborted) return

    // Create a staging element (detached from DOM)
    const staging = document.createElement('div')
    staging.innerHTML = rawHtml
    
    // Process words in spans on the staging element
    await wrapWordsInSpans(staging, signal)
    
    // Only update the live state if not aborted and still mounted
    if (isMounted && !signal.aborted) {
      renderedHtml.value = staging.innerHTML
    }
  } catch (e: any) {
    if (e.name === 'AbortError') return
    if (!isMounted) return
    console.error('Markdown parse error:', e)
    emit('error', 'The ProLibris engine failed to parse this scroll.')
  } finally {
    if (isMounted && !signal.aborted) {
      isIndexing.value = false
    }
  }
}

/**
 * Refactored for 60FPS: DOM-traversal function to wrap every word in a span
 * Uses asynchronous chunking and staging to prevent main-thread blocking.
 */
const wrapWordsInSpans = async (container: HTMLElement, signal: AbortSignal) => {
  let wordIndex = 0
  let nodeCount = 0
  const CHUNK_SIZE = 400 
  
  const textNodes: Text[] = []
  const collectTextNodes = (node: Node) => {
    if (signal.aborted) return
    if (node.nodeType === Node.TEXT_NODE) {
      if (node.textContent?.trim().length) {
        textNodes.push(node as Text)
      }
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node as HTMLElement
      if (['SCRIPT', 'STYLE', 'IMG', 'IFRAME', 'BUTTON'].includes(el.tagName)) return
      Array.from(el.childNodes).forEach(collectTextNodes)
    }
  }
  
  collectTextNodes(container)
  
  for (let i = 0; i < textNodes.length; i++) {
    if (signal.aborted) return
    
    const node = textNodes[i]
    const text = node.textContent || ''
    const fragment = document.createDocumentFragment()
    const words = text.split(/(\s+)/)
    
    words.forEach(part => {
      if (/\s+/.test(part)) {
        fragment.appendChild(document.createTextNode(part))
      } else if (part.length > 0) {
        const span = document.createElement('span')
        span.className = 'word-token transition-all duration-200'
        span.id = `word-${wordIndex++}`
        span.textContent = part
        fragment.appendChild(span)
      }
    })
    
    node.parentNode?.replaceChild(fragment, node)
    nodeCount++
    
    if (nodeCount % CHUNK_SIZE === 0) {
      await new Promise(resolve => requestAnimationFrame(resolve))
    }
  }
}

// Watch for word index changes to highlight in focus mode
watch(() => reader.currentWordIndex, (idx) => {
  if (!isMounted) return
  const prev = document.querySelector('.active-word')
  prev?.classList.remove('active-word')
  
  const current = document.getElementById(`word-${idx}`)
  if (current) {
    current.classList.add('active-word')
    if (reader.isPlaying) {
      current.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }
})

onMounted(() => {
  isMounted = true
  renderMarkdown()
})

onUnmounted(() => {
  isMounted = false
  // Abort any in-flight indexing
  if (indexingController) {
    indexingController.abort()
    indexingController = null
  }
  if (navDebounceTimer) {
    clearTimeout(navDebounceTimer)
    navDebounceTimer = null
  }
})

watch(() => props.markdownContent, () => {
  if (!isMounted) return
  renderMarkdown()
})

watch(() => reader.currentChapterIndex, () => {
  if (!isMounted) return
  renderMarkdown()
  // Scroll to top of new chapter
  if (viewer.value?.parentElement) {
    viewer.value.parentElement.scrollTop = 0
  }
})

const debouncedNav = (action: () => void) => {
  if (navDebounceTimer) return
  action()
  navDebounceTimer = setTimeout(() => {
    navDebounceTimer = null
  }, DEBOUNCE_MS)
}

const prevPage = () => debouncedNav(() => reader.prevChapter())
const nextPage = () => debouncedNav(() => reader.nextChapter())

defineExpose({ prevPage, nextPage })
</script>

<template>
  <div class="relative w-full h-full flex flex-col theme-bg overflow-hidden">
    <!-- Markdown Container -->
    <div 
      class="flex-1 overflow-y-auto px-6 py-12 lg:px-24 custom-scroll"
      :style="{ fontSize: `${fontSize}%` }"
      :class="{ 'opacity-50 pointer-events-none': isIndexing }"
    >
      <div 
        ref="viewer"
        class="prose-clean mx-auto max-w-3xl will-change-transform"
        v-html="renderedHtml"
      />
      
      <!-- Performance Indexing Indicator -->
      <div v-if="isIndexing" class="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div class="px-4 py-2 bg-black/50 backdrop-blur-md text-white rounded-full text-xs font-bold animate-pulse">
          Indexing Archival Pacing...
        </div>
      </div>
    </div>

    <!-- Navigation Arrows -->
    <button
      @click="prevPage"
      :disabled="reader.currentChapterIndex === 0"
      class="absolute left-0 top-1/2 -translate-y-1/2 w-16 h-32 flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/5 transition-all group z-10 rounded-r-3xl disabled:opacity-0 disabled:pointer-events-none"
      title="Previous Chapter"
    >
      <ChevronLeft class="w-8 h-8 opacity-20 group-hover:opacity-100 group-hover:-translate-x-1 transition-all" />
    </button>
    
    <button
      @click="nextPage"
      :disabled="reader.currentChapterIndex === reader.totalChapters - 1"
      class="absolute right-0 top-1/2 -translate-y-1/2 w-16 h-32 flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/5 transition-all group z-10 rounded-l-3xl disabled:opacity-0 disabled:pointer-events-none"
      title="Next Chapter"
    >
      <ChevronRight class="w-8 h-8 opacity-20 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
    </button>

    <!-- Speed Read Floating Toggle -->
    <button
      @click="reader.toggleSpeedReadOverlay()"
      class="absolute bottom-10 right-10 p-5 bg-[#f02e65] text-white rounded-3xl shadow-2xl shadow-[#f02e65]/40 hover:scale-110 active:scale-95 transition-all flex items-center gap-4 group z-20"
    >
      <Zap class="w-6 h-6 fill-current" />
      <span class="text-sm font-black uppercase tracking-widest hidden group-hover:inline pr-2">Start Focus Mode</span>
    </button>
  </div>
</template>

<style scoped>
.custom-scroll::-webkit-scrollbar {
  width: 8px;
}
.custom-scroll::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scroll::-webkit-scrollbar-thumb {
  background: rgba(0,0,0,0.1);
  border-radius: 10px;
}
:global(.dark) .custom-scroll::-webkit-scrollbar-thumb {
  background: rgba(255,255,255,0.1);
}

.prose-clean {
  line-height: 1.8;
  font-family: 'Outfit', sans-serif;
  color: inherit;
}

.prose-clean :deep(h1) {
  font-size: 2.5em;
  font-weight: 800;
  margin-bottom: 1.5em;
  line-height: 1.2;
}

.prose-clean :deep(h2) {
  font-size: 1.8em;
  font-weight: 700;
  margin-top: 2em;
  margin-bottom: 1em;
}

.prose-clean :deep(p) {
  margin-bottom: 1.5em;
  text-align: justify;
}

.prose-clean :deep(img) {
  border-radius: 1.5rem;
  margin: 3rem auto;
  box-shadow: 0 20px 50px rgba(0,0,0,0.1);
}

.prose-clean :deep(.active-word) {
  background: #f02e65;
  color: white;
  border-radius: 4px;
  padding: 0 2px;
  box-shadow: 0 4px 12px rgba(240, 46, 101, 0.3);
}

.word-token {
  display: inline-block;
  white-space: pre;
}
</style>
