<script setup lang="ts">
import { type Book, useLibraryStore } from '@/stores/library'
import { Heart, Plus, BookOpen } from 'lucide-vue-next'
import { computed } from 'vue'

const props = defineProps<{
  book: Book
}>()

const library = useLibraryStore()
const isLiked = computed(() => library.sessions.find(s => s.book_id === props.book.$id)?.is_liked || false)

const toggleLike = () => {
  library.toggleLike(props.book.$id)
}
</script>

<template>
  <div class="group relative theme-card rounded-2xl overflow-hidden border theme-border hover:border-[#f02e65]/40 transition-all duration-500 hover:shadow-2xl hover:shadow-[#f02e65]/10 flex flex-col h-full">
    <!-- Book Cover Container -->
    <div class="relative aspect-[2/3] overflow-hidden bg-black/10 dark:bg-white/5">
      <img 
        :src="book.cover_url || 'https://via.placeholder.com/400x600?text=No+Cover'" 
        :alt="book.title"
        class="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-700"
      />
      
      <!-- Overlay Actions -->
      <div class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-3 px-4">
        <router-link 
          :to="`/read/${book.$id}`"
          class="flex items-center gap-2 bg-[#f02e65] text-white px-4 py-2 rounded-xl font-bold transform translate-y-4 group-hover:translate-y-0 transition-all duration-300 shadow-lg"
        >
          <BookOpen class="w-4 h-4" />
          Read Now
        </router-link>
        
        <button 
          @click="toggleLike"
          class="p-2.5 rounded-xl bg-white/20 backdrop-blur-md border border-white/30 text-white transform translate-y-4 group-hover:translate-y-0 transition-all duration-300 delay-75 hover:bg-[#f02e65] hover:border-[#f02e65] shadow-lg"
        >
          <Heart :class="{'fill-white': isLiked}" class="w-5 h-5" />
        </button>
      </div>

      <!-- Badge if new or progress? -->
    </div>

    <!-- Book Info -->
    <div class="p-5 flex-1 flex flex-col">
      <div class="mb-2 line-clamp-1">
        <span v-for="subject in book.subjects.slice(0, 1)" :key="subject" class="text-[10px] font-bold uppercase tracking-wider text-[#f02e65] bg-[#f02e65]/5 dark:bg-[#f02e65]/20 px-2 py-1 rounded-md">
          {{ subject }}
        </span>
      </div>
      
      <h3 class="theme-text font-bold text-lg leading-tight mb-1 line-clamp-2 group-hover:text-[#f02e65] transition-colors">
        {{ book.title }}
      </h3>
      
      <p class="theme-text-soft text-sm font-medium mb-4">
        {{ book.author }}
      </p>

      <div class="mt-auto pt-4 border-t theme-border flex items-center justify-between">
         <div class="flex items-center gap-1.5 theme-text-soft opacity-60">
            <Plus class="w-3.5 h-3.5" />
            <span class="text-[11px] font-bold">Add to Library</span>
         </div>
         <button @click="toggleLike" class="theme-text-soft hover:theme-text transition-colors">
            <Heart :class="{'text-[#f02e65] fill-[#f02e65]': isLiked}" class="w-5 h-5" />
         </button>
      </div>
    </div>
  </div>
</template>
