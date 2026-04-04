<script setup lang="ts">
import { useRouter } from 'vue-router'
import { computed } from 'vue'
import { useLibraryStore } from '@/stores/library'
import { Heart, BookOpen } from 'lucide-vue-next'
import type { Book } from '@/stores/library'

const props = defineProps<{
  book: Book
}>()

const router = useRouter()
const library = useLibraryStore()

const isLiked = computed(() => {
  return library.sessions.find(s => s.book_id === props.book.$id)?.is_liked || false
})

const toggleLike = () => {
  library.toggleLike(props.book.$id)
}

const handleReadClick = () => {
  router.push(`/read/${props.book.$id}`)
}
</script>

<template>
  <div class="group relative theme-card rounded-2xl overflow-hidden border theme-border hover:border-[#AE0001]/40 transition-all duration-500 hover:shadow-2xl hover:shadow-[#AE0001]/10 flex flex-col h-full">
    <!-- Book Cover Container -->
    <div class="relative aspect-[2/3] overflow-hidden bg-black/10 dark:bg-white/5">
      <img 
        :src="book.cover_url || 'https://via.placeholder.com/400x600?text=No+Cover'" 
        :alt="book.title"
        class="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-700"
      />
      
      <!-- Overlay Actions -->
      <div class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-3 px-4">
        <button 
          @click="handleReadClick"
          class="flex items-center gap-2 bg-[#AE0001] text-white px-4 py-2 rounded-xl text-sm font-bold transform translate-y-4 group-hover:translate-y-0 transition-all duration-300 shadow-lg"
        >
          <BookOpen class="w-4 h-4" />
          Read Now
        </button>
        
        <button 
          @click="toggleLike"
          class="p-2.5 rounded-xl bg-white/20 backdrop-blur-md border border-white/30 text-white transform translate-y-4 group-hover:translate-y-0 transition-all duration-300 delay-75 hover:bg-[#EEBA30] hover:border-[#EEBA30] shadow-lg"
        >
          <Heart :class="{'fill-white': isLiked}" class="w-5 h-5" />
        </button>
      </div>
    </div>

    <!-- Book Info -->
    <div class="p-3 flex-1 flex flex-col min-w-0 pointer-events-none">
      <div class="mb-1 line-clamp-1">
        <span v-for="subject in book.subjects?.slice(0, 1)" :key="subject || 'General'" class="text-[8px] font-bold uppercase tracking-wider text-[#AE0001] bg-[#AE0001]/5 dark:bg-[#AE0001]/20 px-1.5 py-0.5 rounded-md">
          {{ subject }}
        </span>
      </div>
      
      <h3 class="theme-text font-bold text-sm leading-tight mb-0.5 line-clamp-2 group-hover:text-[#EEBA30] transition-colors">
        {{ book.title }}
      </h3>
      
      <p class="theme-text-soft text-[10px] font-medium mb-2 line-clamp-2">
        {{ book.author }}
      </p>

      <div class="mt-auto pt-2 border-t theme-border flex items-center justify-between">
         <span class="text-[8px] font-bold uppercase tracking-widest theme-text-soft opacity-40">ProLibris Archive</span>
         
         <button @click.stop="toggleLike" class="theme-text-soft hover:theme-text transition-colors pointer-events-auto">
            <Heart :class="{'text-[#AE0001] fill-[#AE0001]': isLiked}" class="w-3.5 h-3.5" />
         </button>
      </div>
    </div>
  </div>
</template>
