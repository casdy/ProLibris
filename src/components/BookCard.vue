<script setup lang="ts">
import { useRouter } from 'vue-router'
import { computed, ref } from 'vue'
import { useLibraryStore } from '@/stores/library'
import { Heart, BookOpen, User, Archive } from 'lucide-vue-next'
import type { Book } from '@/stores/library'

const props = defineProps<{
  book: Book
}>()

const router = useRouter()
const library = useLibraryStore()
const imgError = ref(false)

const isLiked = computed(() => {
  return library.sessions.find(s => s.book_id === props.book.$id)?.is_liked || false
})

const topic = computed(() => {
  return props.book.subjects?.[0] || 'Archive'
})

const toggleLike = () => {
  library.toggleLike(props.book.$id)
}

const handleReadClick = () => {
  router.push(`/read/${props.book.$id}`)
}

const handleImageError = () => {
  imgError.value = true
}

// Generate a deterministic scholarly color based on title
const bookColor = computed(() => {
  const title = props.book.title || 'Untitled'
  const colors = [
    'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)', // Midnight
    'linear-gradient(135deg, #2c3e50 0%, #000000 100%)', // Charcoal
    'linear-gradient(135deg, #4b134f 0%, #c94b4b 100%)', // Crimson Velvet
    'linear-gradient(135deg, #0f3443 0%, #34e89e 100%)', // Emerald Archive
    'linear-gradient(135deg, #200122 0%, #6f0000 100%)', // Royal Ruby
    'linear-gradient(135deg, #000428 0%, #004e92 100%)'  // Deep Sea
  ]
  let hash = 0
  for (let i = 0; i < title.length; i++) {
    hash = title.charCodeAt(i) + ((hash << 5) - hash)
  }
  return colors[Math.abs(hash) % colors.length]
})
</script>

<template>
  <div class="group relative theme-card rounded-[1.5rem] overflow-hidden border theme-border hover:border-[#AE0001]/60 transition-all duration-700 hover:shadow-[0_20px_50px_rgba(0,0,0,0.4)] flex flex-col h-full bg-[#121212] dark:bg-black">
    
    <!-- Book Cover Container -->
    <div class="relative aspect-[2/3] overflow-hidden bg-black/40">
      <!-- Fallback Generated Cover -->
      <div v-if="imgError || !book.cover_url" 
           :style="{ background: bookColor }"
           class="absolute inset-0 flex flex-col items-center justify-center p-6 text-center animate-fade-in">
        <div class="absolute inset-0 opacity-20 pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/leather.png')]" />
        <Archive class="w-10 h-10 text-white/20 mb-4" />
        <h4 class="text-white font-cinzel text-xs font-bold leading-tight tracking-wider uppercase opacity-80 line-clamp-4">{{ book.title }}</h4>
        <div class="mt-4 w-8 h-0.5 bg-[#EEBA30]/40 rounded-full" />
      </div>

      <img 
        v-else
        :src="book.cover_url" 
        :alt="book.title"
        @error="handleImageError"
        class="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-1000 ease-out"
      />
      
      <!-- Premium Overlay Actions -->
      <div class="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-all duration-500 backdrop-blur-[2px] flex flex-col items-center justify-center gap-4 px-4">
        <button 
          @click="handleReadClick"
          class="w-full flex items-center justify-center gap-2 bg-[#AE0001] text-white px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transform translate-y-8 group-hover:translate-y-0 transition-all duration-500 shadow-2xl hover:scale-105 active:scale-95"
        >
          <BookOpen class="w-4 h-4" />
          Access Archive
        </button>
        
        <button 
          @click="toggleLike"
          class="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-[#EEBA30]/20 backdrop-blur-xl border border-white/10 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transform translate-y-8 group-hover:translate-y-0 transition-all duration-500 delay-75 shadow-lg"
        >
          <Heart :class="{'fill-[#EEBA30] text-[#EEBA30]': isLiked}" class="w-3 h-3" />
          {{ isLiked ? 'In Favs' : 'Bookmark' }}
        </button>
      </div>

      <!-- Genre Badge (Float) -->
      <div class="absolute top-3 left-3 z-10">
        <span class="px-2.5 py-1 rounded-lg bg-black/40 backdrop-blur-xl border border-white/10 text-[8px] font-black uppercase tracking-[0.2em] text-[#EEBA30] shadow-2xl">
          {{ topic }}
        </span>
      </div>
    </div>

    <!-- Book Info -->
    <div class="p-4 flex-1 flex flex-col min-w-0 transition-colors duration-500 bg-gradient-to-b from-transparent to-black/20">
      <h3 class="theme-text font-bold text-sm leading-snug mb-2 line-clamp-2 group-hover:text-[#EEBA30] transition-colors font-cinzel tracking-tight">
        {{ book.title }}
      </h3>
      
      <div class="flex items-center gap-2 mb-4 opacity-60">
        <div class="w-1 h-1 rounded-full bg-[#AE0001]" />
        <p class="theme-text-soft text-[9px] font-black uppercase tracking-widest truncate">
          Headless Markdown
        </p>
      </div>

      <div class="mt-auto pt-4 border-t border-white/5 flex items-center justify-between">
         <div class="flex items-center gap-1.5 grayscale group-hover:grayscale-0 transition-all duration-500">
            <User class="w-3 h-3 text-[#AE0001]" />
            <span class="text-[8px] font-black uppercase tracking-widest theme-text-soft opacity-50 group-hover:opacity-100">ProLibris Seeker</span>
         </div>
         
         <div class="flex items-center gap-2">
            <div class="w-1.5 h-1.5 rounded-full bg-green-500/50" />
            <span class="text-[8px] font-black uppercase tracking-[0.2em] theme-text-soft opacity-30">V1.2</span>
         </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.font-cinzel {
  font-family: 'Cinzel', serif;
}
.animate-fade-in {
  animation: fadeIn 0.8s ease-out forwards;
}
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
</style>
