<script setup lang="ts">
import { computed } from 'vue'
import { ChevronLeft, ChevronRight, MoreHorizontal } from 'lucide-vue-next'

const props = defineProps<{
  currentPage: number
  totalPages: number
  isLoading?: boolean
}>()

const emit = defineEmits<{
  (e: 'changePage', page: number): void
}>()

const pages = computed(() => {
  const current = props.currentPage
  const total = props.totalPages
  const range = 2 // Number of pages to show before and after current
  
  const result: (number | string)[] = []
  
  if (total <= 7) {
    for (let i = 1; i <= total; i++) result.push(i)
  } else {
    result.push(1)
    
    if (current > range + 2) {
      result.push('...')
    }
    
    const start = Math.max(2, current - range)
    const end = Math.min(total - 1, current + range)
    
    for (let i = start; i <= end; i++) {
        result.push(i)
    }
    
    if (current < total - (range + 1)) {
      result.push('...')
    }
    
    result.push(total)
  }
  
  return result
})

const handlePageClick = (page: number | string) => {
  if (typeof page === 'number' && page !== props.currentPage) {
    emit('changePage', page)
  }
}
</script>

<template>
  <nav class="flex items-center justify-center gap-2 py-8" aria-label="Pagination">
    <!-- Previous Button -->
    <button
      @click="handlePageClick(currentPage - 1)"
      :disabled="currentPage === 1 || isLoading"
      class="p-2 rounded-xl transition-all duration-300 theme-card border theme-border hover:border-[#AE0001]/40 disabled:opacity-30 disabled:cursor-not-allowed group"
    >
      <ChevronLeft class="w-5 h-5 theme-text group-hover:text-[#AE0001]" />
    </button>

    <!-- Page Numbers -->
    <div class="flex items-center gap-1 md:gap-2">
      <template v-for="(page, idx) in pages" :key="idx">
        <button
          v-if="typeof page === 'number'"
          @click="handlePageClick(page)"
          :disabled="isLoading"
          :class="[
            page === currentPage 
              ? 'bg-[#AE0001] text-white shadow-lg shadow-[#AE0001]/20 scale-110' 
              : 'theme-card theme-text hover:border-[#AE0001]/40',
            (isLoading && page === currentPage) ? 'animate-pulse' : ''
          ]"
          class="min-w-[40px] h-[40px] flex items-center justify-center rounded-xl font-bold text-sm border theme-border transition-all duration-300"
        >
          {{ page }}
        </button>
        
        <div v-else class="min-w-[32px] flex items-center justify-center theme-text-soft opacity-40">
          <MoreHorizontal class="w-4 h-4" />
        </div>
      </template>
    </div>

    <!-- Next Button -->
    <button
      @click="handlePageClick(currentPage + 1)"
      :disabled="currentPage === totalPages || isLoading"
      class="p-2 rounded-xl transition-all duration-300 theme-card border theme-border hover:border-[#AE0001]/40 disabled:opacity-30 disabled:cursor-not-allowed group"
    >
      <ChevronRight class="w-5 h-5 theme-text group-hover:text-[#AE0001]" />
    </button>
  </nav>
</template>

<style scoped>
.theme-card {
  background: var(--bg-card);
  backdrop-filter: blur(12px);
}
</style>
