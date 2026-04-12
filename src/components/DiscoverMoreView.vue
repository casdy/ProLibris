<script setup lang="ts">
import { ref, computed } from 'vue'
import { useLibraryStore } from '@/stores/library'
import { Sparkles, Grid } from 'lucide-vue-next'
import SectionControls from './SectionControls.vue'
import BookCard from './BookCard.vue'

const library = useLibraryStore()
const genres  = computed(() => library.allGenres.slice(0, 20))

// Filtering and Sorting
const activeGenre = ref('')
const activeSort  = ref('title')

const filteredBooks = computed(() => {
  let list = [...library.discoverBooks]
  
  // Note: Genre/Subject filtering is currently disabled in headless mode
  
  if (activeSort.value === 'title') {
    list.sort((a, b) => a.title.localeCompare(b.title))
  }
  
  return list
})

const displayedBooks = computed(() => filteredBooks.value.slice(0, 40))

const updateGenre = (g: string) => activeGenre.value = g
const updateSort  = (s: string) => activeSort.value  = s
</script>

<template>
  <div class="discover-more-section relative pb-12">
    <!-- Section Header -->
    <div class="flex flex-col gap-8 mb-12">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-6 px-1">
        <div class="flex items-center gap-4">
          <div class="p-3 bg-[#f02e65]/10 rounded-[1.25rem] border border-[#f02e65]/20 shadow-lg shadow-[#f02e65]/5">
            <Grid class="w-6 h-6 text-[#f02e65]" />
          </div>
          <div>
            <h3 class="text-3xl font-bold theme-text tracking-tight">Discover More</h3>
            <p class="text-sm theme-text-soft opacity-60 font-medium">Selected especially for your curious mind</p>
          </div>
        </div>
        
        <!-- Section-wide stats or info -->
        <div class="hidden lg:flex items-center gap-4 p-3 pr-6 bg-white/5 backdrop-blur-md rounded-2xl border border-white/5 shadow-xl">
           <div class="p-2 bg-[#f02e65]/20 rounded-xl"><Sparkles class="w-4 h-4 text-[#f02e65]" /></div>
           <p class="text-[11px] font-bold uppercase tracking-widest text-[#f02e65]/80">{{ displayedBooks.length }} New Treasures</p>
        </div>
      </div>

      <!-- Controls -->
      <SectionControls
        :genres="genres"
        :activeGenre="activeGenre"
        :activeSort="activeSort"
        @update:genre="updateGenre"
        @update:sort="updateSort"
      />
    </div>

    <!-- Grid Layout -->
    <div v-if="displayedBooks.length > 0" class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 lg:gap-8 min-h-[600px]">
      <div 
        v-for="(book, index) in displayedBooks" 
        :key="book.$id"
        class="animate-staggered"
        :style="{ animationDelay: `${index * 40}ms` }"
      >
        <BookCard :book="book" />
      </div>
    </div>

    <!-- Empty State -->
    <div v-else class="flex flex-col items-center justify-center py-32 bg-white/5 border border-dashed border-white/10 rounded-[2.5rem]">
      <div class="p-5 bg-white/5 rounded-3xl mb-6 opacity-40"><Grid class="w-12 h-12 theme-text-soft" /></div>
      <p class="text-xl font-bold theme-text-soft opacity-60 mb-2">No matches found in this collection</p>
      <button @click="activeGenre = ''" class="text-sm font-bold text-[#f02e65] hover:underline transition-all">Clear genre filter</button>
    </div>
  </div>
</template>

<style scoped>
.animate-staggered {
  opacity: 0;
  animation: slideInUp 0.6s cubic-bezier(0.19, 1, 0.22, 1) forwards;
}

@keyframes slideInUp {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.discover-more-section {
  position: relative;
  border-radius: 3rem;
  padding-top: 1rem;
}
</style>
