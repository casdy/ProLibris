<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { ChevronLeft, ChevronRight, Zap } from 'lucide-vue-next'
import { useReaderStore } from '@/stores/reader'
import type { Rendition, Book } from 'epubjs'

const props = defineProps<{
  bookData: ArrayBuffer
  initialCfi?: string
  isDark: boolean
  fontSize: number
}>()

const emit = defineEmits<{
  relocated: [cfi: string]
  spineLoaded: [book: Book]
  error: [message: string]
}>()

const reader = useReaderStore()
const viewer = ref<HTMLElement | null>(null)
let renditionInstance: Rendition | null = null
let bookInstance: Book | null = null

interface EpubLocation {
  start: { cfi: string }
}

interface EpubContentDocument {
  document: {
    body: HTMLElement
  }
}

const initializeStandard = async () => {
  if (!viewer.value || !props.bookData) return

  try {
    const ePub = (await import('epubjs')).default
    bookInstance = ePub(props.bookData)
    
    // Await ready to ensure metadata/packaging is available for the rendition
    await bookInstance.ready

    renditionInstance = bookInstance.renderTo(viewer.value, {
      width: '100%',
      height: '100%',
      flow: 'paginated',
      spread: 'none',
      allowScriptedContent: true,
    })

    if (props.initialCfi) {
      await renditionInstance.display(props.initialCfi)
    } else {
      await renditionInstance.display()
    }

    renditionInstance.on('relocated', (location: EpubLocation) => {
      emit('relocated', location.start.cfi)

      setTimeout(() => {
        try {
          if (!renditionInstance) return
          const contents = (renditionInstance as unknown as { getContents(): EpubContentDocument[] }).getContents()
          if (contents && contents.length > 0) {
            let visibleText = ''
            contents.forEach((content: EpubContentDocument) => {
              visibleText += content.document.body.innerText + '\n'
            })
            if (visibleText.trim().length > 0) {
              reader.setLastVisibleText(visibleText)
            }
          }
        } catch (e) {
          console.warn('Silent visibility sync failed:', e)
        }
      }, 150)
    })

    applyStyles()
    
    emit('spineLoaded', bookInstance)
  } catch (e) {
    console.error('StandardEngine init error:', e)
    emit('error', 'The ProLibris rendering engine encountered an ancient scroll error. Please refresh the archive.')
  }
}

const applyStyles = () => {
  if (!renditionInstance) return
  renditionInstance.themes.fontSize(`${props.fontSize}%`)
  renditionInstance.themes.register('dark', {
    body: { background: '#0d0702 !important', color: '#EBEBEF !important', 'font-family': 'Outfit, sans-serif !important' },
  })
  renditionInstance.themes.register('light', {
    body: { background: '#1a0f05 !important', color: '#E8D5A0 !important', 'font-family': 'Outfit, sans-serif !important' },
  })
  renditionInstance.themes.select(props.isDark ? 'dark' : 'light')
}

watch(() => [props.fontSize, props.isDark], applyStyles)

const prevPage = () => renditionInstance?.prev()
const nextPage = () => renditionInstance?.next()

onMounted(initializeStandard)

onUnmounted(() => {
  if (renditionInstance) {
    try { renditionInstance.destroy() } catch { /* ignore */ }
  }
})

defineExpose({ prevPage, nextPage })
</script>

<template>
  <div class="relative w-full h-full flex items-center justify-center theme-bg">
    <!-- ePub Viewer Container -->
    <div
      ref="viewer"
      class="w-full max-w-4xl h-full rounded-2xl overflow-hidden transition-all duration-500 theme-bg"
    />

    <!-- Navigation Arrows -->
    <button
      @click="prevPage"
      class="absolute left-2 lg:left-6 top-1/2 -translate-y-1/2 p-3 bg-white/10 backdrop-blur-md rounded-full shadow-2xl hover:bg-[#f02e65] hover:text-white transition-all transform active:scale-95 group"
    >
      <ChevronLeft class="w-6 h-6 group-hover:-translate-x-0.5 transition-transform" />
    </button>
    <button
      @click="nextPage"
      class="absolute right-2 lg:right-6 top-1/2 -translate-y-1/2 p-3 bg-white/10 backdrop-blur-md rounded-full shadow-2xl hover:bg-[#f02e65] hover:text-white transition-all transform active:scale-95 group"
    >
      <ChevronRight class="w-6 h-6 group-hover:translate-x-0.5 transition-transform" />
    </button>

    <!-- Speed Read Floating Toggle -->
    <button
      @click="reader.toggleSpeedReadOverlay()"
      class="absolute bottom-6 right-6 p-4 bg-[#f02e65] text-white rounded-2xl shadow-xl shadow-[#f02e65]/30 hover:scale-110 active:scale-95 transition-all flex items-center gap-3 group z-20"
      title="Enter Focus Mode (Speed Read)"
    >
      <Zap class="w-6 h-6 fill-current" />
      <span class="text-sm font-bold pr-2 hidden group-hover:inline">Focus Mode</span>
    </button>
  </div>
</template>

<style scoped>
:deep(iframe) {
  border-radius: 1rem;
}
</style>
