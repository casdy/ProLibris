<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { Tag, ListFilter, ChevronDown, Check } from 'lucide-vue-next'

const props = defineProps<{
  genres: string[]
  activeGenre: string
  activeSort: string
}>()

const emit = defineEmits<{
  (e: 'update:genre', value: string): void
  (e: 'update:sort', value: string): void
}>()

const isGenreOpen = ref(false)
const isSortOpen = ref(false)

const sortOptions = [
  { label: 'Title', value: 'title' },
  { label: 'Author', value: 'author' },
  { label: 'Genre', value: 'genre' },
]

const currentSortLabel = computed(() => 
  sortOptions.find(o => o.value === props.activeSort)?.label || 'Sort'
)

const currentGenreLabel = computed(() => 
  props.activeGenre || 'All Genres'
)

const toggleGenre = () => {
  isGenreOpen.value = !isGenreOpen.value
  if (isGenreOpen.value) isSortOpen.value = false
}

const toggleSort = () => {
  isSortOpen.value = !isSortOpen.value
  if (isSortOpen.value) isGenreOpen.value = false
}

const selectGenre = (genre: string) => {
  emit('update:genre', genre)
  isGenreOpen.value = false
}

const selectSort = (val: string) => {
  emit('update:sort', val)
  isSortOpen.value = false
}

// Close on click outside
const controlsRef = ref<HTMLElement | null>(null)
const handleClickOutside = (e: MouseEvent) => {
  if (controlsRef.value && !controlsRef.value.contains(e.target as Node)) {
    isGenreOpen.value = false
    isSortOpen.value = false
  }
}

onMounted(() => document.addEventListener('click', handleClickOutside))
onUnmounted(() => document.removeEventListener('click', handleClickOutside))
</script>

<template>
  <div ref="controlsRef" class="flex flex-wrap items-center gap-3 w-full">
    
    <!-- Genre Dropdown -->
    <div class="relative min-w-[160px] flex-1 sm:flex-initial">
      <button 
        @click="toggleGenre"
        class="w-full flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl bg-black/40 backdrop-blur-md border border-white/10 hover:border-[#f02e65]/40 transition-all text-sm font-bold theme-text shadow-lg group"
      >
        <div class="flex items-center gap-2">
          <Tag class="w-4 h-4 text-[#f02e65] group-hover:scale-110 transition-transform" />
          <span class="truncate">{{ currentGenreLabel }}</span>
        </div>
        <ChevronDown class="w-4 h-4 opacity-40 transition-transform" :class="{ 'rotate-180': isGenreOpen }" />
      </button>

      <Transition name="fade-slide-up">
        <div v-if="isGenreOpen" class="absolute left-0 top-full mt-2 w-64 z-50 rounded-2xl bg-[#1a0f05]/95 border border-[#f02e65]/20 shadow-2xl overflow-hidden backdrop-blur-2xl p-1.5">
          <div class="max-h-64 overflow-y-auto custom-scrollbar pr-1">
            <button
              @click="selectGenre('')"
              class="w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-sm font-bold transition-colors mb-1"
              :class="activeGenre === '' ? 'bg-[#f02e65] text-white' : 'text-white/60 hover:bg-white/5 hover:text-white'"
            >
              All Genres
              <Check v-if="activeGenre === ''" class="w-4 h-4" />
            </button>
            <button
              v-for="genre in genres"
              :key="genre"
              @click="selectGenre(genre)"
              class="w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-sm font-bold transition-colors mb-1 text-left"
              :class="activeGenre === genre ? 'bg-[#f02e65] text-white' : 'text-white/60 hover:bg-white/5 hover:text-white'"
            >
              <span class="truncate">{{ genre }}</span>
              <Check v-if="activeGenre === genre" class="w-4 h-4" />
            </button>
          </div>
        </div>
      </Transition>
    </div>

    <!-- Sort Dropdown -->
    <div class="relative min-w-[140px] flex-1 sm:flex-initial">
      <button 
        @click="toggleSort"
        class="w-full flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl bg-black/40 backdrop-blur-md border border-white/10 hover:border-[#f02e65]/40 transition-all text-sm font-bold theme-text shadow-lg group"
      >
        <div class="flex items-center gap-2">
          <ListFilter class="w-4 h-4 text-[#f02e65] group-hover:scale-110 transition-transform" />
          <span class="truncate">{{ currentSortLabel }}</span>
        </div>
        <ChevronDown class="w-4 h-4 opacity-40 transition-transform" :class="{ 'rotate-180': isSortOpen }" />
      </button>

      <Transition name="fade-slide-up">
        <div v-if="isSortOpen" class="absolute right-0 top-full mt-2 w-48 z-50 rounded-2xl bg-[#1a0f05]/95 border border-[#f02e65]/20 shadow-2xl overflow-hidden backdrop-blur-2xl p-1.5">
          <button
            v-for="opt in sortOptions"
            :key="opt.value"
            @click="selectSort(opt.value)"
            class="w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-sm font-bold transition-colors mb-1"
            :class="activeSort === opt.value ? 'bg-[#f02e65] text-white' : 'text-white/60 hover:bg-white/5 hover:text-white'"
          >
            {{ opt.label }}
            <Check v-if="activeSort === opt.value" class="w-4 h-4" />
          </button>
        </div>
      </Transition>
    </div>
  </div>
</template>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  width: 4px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: rgba(240, 46, 101, 0.2);
  border-radius: 10px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: rgba(240, 46, 101, 0.4);
}

.fade-slide-up-enter-active, 
.fade-slide-up-leave-active { 
  transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.25); 
}
.fade-slide-up-enter-from { 
  opacity: 0; 
  transform: translateY(15px) scale(0.95); 
}
.fade-slide-up-leave-to { 
  opacity: 0; 
  transform: translateY(10px) scale(0.95); 
}
</style>
