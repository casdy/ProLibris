<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { ChevronLeft, ChevronRight } from 'lucide-vue-next'

const props = defineProps<{
  bookData: ArrayBuffer
  initialCfi?: string
  isDark: boolean
  fontSize: number
}>()

const emit = defineEmits<{
  relocated: [cfi: string]
  spineLoaded: [book: any]
}>()

const viewer = ref<HTMLElement | null>(null)
let renditionInstance: any = null
let bookInstance: any = null

const initializeStandard = async () => {
  if (!viewer.value || !props.bookData) return

  const ePub = (await import('epubjs')).default
  bookInstance = ePub(props.bookData)

  renditionInstance = bookInstance.renderTo(viewer.value, {
    width: '100%',
    height: '100%',
    flow: 'paginated',
    spread: 'none',
  })

  if (props.initialCfi) {
    await renditionInstance.display(props.initialCfi)
  } else {
    await renditionInstance.display()
  }

  renditionInstance.on('relocated', (location: any) => {
    emit('relocated', location.start.cfi)
  })

  applyStyles()
  
  // Emit book instance once ready for spine info
  bookInstance.ready.then(() => {
    emit('spineLoaded', bookInstance)
  })
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
    try { renditionInstance.destroy() } catch (e) {}
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
  </div>
</template>

<style scoped>
:deep(iframe) {
  border-radius: 1rem;
}
</style>
