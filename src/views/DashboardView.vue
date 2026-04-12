<script setup lang="ts">
import { onMounted, computed, ref, watch } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useLibraryStore } from '@/stores/library'
import { useUIStore } from '@/stores/ui'
import { useBookCatalog } from '@/composables/useBookCatalog'
import { BookOpen, Flame, Sparkles, LogOut, ChevronRight,
  Moon, Sun, Search, X, Library, CheckCircle2, Filter,
  Clock, Zap
} from 'lucide-vue-next'
import BookCard from '@/components/BookCard.vue'
import StatsCard from '@/components/StatsCard.vue'
import BookstoreView from '@/components/BookstoreView.vue'
import BookshelfView from '@/components/BookshelfView.vue'
import BookPagination from '@/components/BookPagination.vue'
import AppLogo from '@/components/AppLogo.vue'
import OnboardingWidget from '@/components/dashboard/OnboardingWidget.vue'
import { useRouter } from 'vue-router'

const router = useRouter()

const auth = useAuthStore()
const library = useLibraryStore()
const ui = useUIStore()
const { 
  books: catalogBooks, 
  isLoading: isCatalogLoading, 
  totalCount,
  totalPages, 
  currentPage, 
  filters: catalogFilters, 
  fetchBooks: fetchCatalog,
  changePage,
  updateFilters
} = useBookCatalog()

const activeTab = ref('discover')
const isFilterDrawerOpen = ref(false)
const searchInput = ref(catalogFilters.search)
let debounceTimer: ReturnType<typeof setTimeout> | null = null

watch(searchInput, (val) => {
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => {
    updateFilters({ search: val })
  }, 500)
})

const clearSearch = () => {
  searchInput.value = ''
  updateFilters({ search: '' })
}

onMounted(async () => {
  // Ensure we have the latest verification status
  await auth.refreshUser()
  
  if (!auth.isVerified) {
    ui.showNotification('Verification required to access the archival library.', 'info')
  }
})

const stats = computed(() => {
  const sessions = library.sessions || []
  const totalPages = sessions.reduce((acc: number, s: { pages_turned?: number }) => acc + (s.pages_turned || 0), 0)
  const completed  = sessions.filter((s: { status: string }) => s.status === 'completed').length
  const allDates = sessions.flatMap((s: { last_read_at?: string }) => {
    return s.last_read_at ? [s.last_read_at.split('T')[0]] : []
  })
  const activeDays = new Set(allDates).size
  return [
    { title: 'Pages Read',    value: totalPages,   icon: BookOpen,      color: 'bg-blue-500 shadow-blue-500/30'   },
    { title: 'Completed',     value: completed,    icon: CheckCircle2,  color: 'bg-green-500 shadow-green-500/30' },
    { title: 'Reading Days',  value: activeDays,   icon: Flame,         color: 'bg-orange-500 shadow-orange-500/30' }
  ]
})

const isSearching = computed(() => !!catalogFilters.search)

const sectionTitle = computed(() => {
  if (isSearching.value)
    return `${totalCount.value.toLocaleString()} result${totalCount.value !== 1 ? 's' : ''} for "${catalogFilters.search}"`
  return 'Private Collection'
})

const hasBookshelfContent = computed(() =>
  library.sessions.some(s => s.progress_cfi || s.is_liked)
)

const showRecentTomes = ref(false)

function formatDate(dateStr?: string) {
  if (!dateStr) return 'Recently'
  const d = new Date(dateStr)
  const diff = Date.now() - d.getTime()
  const mins  = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days  = Math.floor(diff / 86400000)
  if (mins < 1)   return 'just now'
  if (mins < 60)  return `${mins}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days < 7)   return `${days}d ago`
  return d.toLocaleDateString()
}

const greeting = computed(() => {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  if (hour < 22) return 'Good evening'
  return 'Good night'
})
</script>

<template>
  <div class="min-h-screen theme-bg theme-text flex flex-col font-outfit">

    <!-- ═══ Navbar ═══ -->
    <nav class="sticky top-0 z-50 theme-nav backdrop-blur-3xl border-b theme-border px-6 py-4 lg:px-12">
      <div class="max-w-7xl mx-auto flex items-center justify-between">
        <div class="flex flex-col sm:flex-row items-center gap-1 sm:gap-4 flex-shrink-0">
          <AppLogo size="md" class="hover:scale-110 transition-transform cursor-pointer" />
          <h1 class="text-[10px] sm:text-xl font-black theme-text tracking-[0.2em] sm:tracking-widest uppercase font-cinzel text-[#EEBA30] leading-none">Prolibris</h1>
        </div>

        <div class="flex items-center gap-4">
          <!-- Tab switcher -->
          <div class="flex items-center gap-1 p-1 theme-card rounded-xl border theme-border">
            <button
              @click="activeTab = 'discover'"
              :class="activeTab === 'discover'
                ? 'bg-[#AE0001] text-white shadow-lg shadow-[#AE0001]/20'
                : 'theme-text-soft hover:theme-text'"
              class="flex items-center gap-1.5 px-2.5 sm:px-3.5 py-2 rounded-lg text-sm font-bold transition-all duration-200"
            >
              <Sparkles class="w-4 h-4" />
              <span class="hidden md:inline">Discover</span>
            </button>
            <button
              @click="activeTab = 'bookshelf'"
              :class="activeTab === 'bookshelf'
                ? 'bg-[#AE0001] text-white shadow-lg shadow-[#AE0001]/20'
                : 'theme-text-soft hover:theme-text'"
              class="flex items-center gap-1.5 px-2.5 sm:px-3.5 py-2 rounded-lg text-sm font-bold transition-all duration-200 relative"
            >
              <Library class="w-4 h-4" />
              <span class="hidden md:inline">Bookshelf</span>
              <span
                v-if="hasBookshelfContent && activeTab !== 'bookshelf'"
                class="absolute -top-0.5 -right-0.5 w-2 h-2 bg-[#EEBA30] rounded-full border-2 theme-border"
              />
            </button>
          </div>

          <button @click="ui.toggleTheme()" class="p-2.5 rounded-xl bg-black/10 dark:bg-white/5 shadow-inner theme-text-soft hover:theme-text transition-all duration-300">
            <component :is="ui.isDark ? Sun : Moon" class="w-5 h-5" />
          </button>
          <router-link to="/profile" class="flex flex-col items-end group">
            <p class="text-sm font-bold theme-text group-hover:text-[#EEBA30] transition-colors line-clamp-1">{{ auth.user?.name }}</p>
            <p class="hidden md:block text-xs theme-text-soft font-medium opacity-70 group-hover:opacity-100 transition-opacity">View Seeker Stats</p>
          </router-link>
          <button @click="router.push('/farewell')" class="p-2.5 rounded-xl bg-black/10 dark:bg-white/5 shadow-inner theme-text-soft hover:theme-text hover:bg-red-500/10 transition-all duration-300 transform active:scale-95">
            <LogOut class="w-5 h-5" />
          </button>
        </div>
      </div>
    </nav>

    <!-- ═══════ DISCOVER TAB ═══════ -->
    <main v-if="activeTab === 'discover'" class="flex-1 max-w-7xl mx-auto w-full p-6 lg:p-12 space-y-16 animate-fade-in">

      <!-- Welcome Hero & Stats -->
      <section v-if="!isSearching" class="space-y-12">
        <OnboardingWidget />
        
        <div class="grid lg:grid-cols-3 gap-8 items-stretch">
        <div class="lg:col-span-2 relative bg-gradient-to-br from-[var(--bg-app)] via-[#2a180d]/10 to-[#3d2212]/20 dark:from-[#1a0f05] dark:via-[#2a180d] dark:to-[#3d2212] theme-card rounded-[2.5rem] p-10 overflow-hidden shadow-2xl flex flex-col justify-between min-h-[320px]">
          <div class="absolute top-0 right-0 w-[40%] h-full bg-gradient-to-l from-amber-500/10 to-transparent blur-3xl opacity-20 pointer-events-none" />
          <div class="z-10">
            <h2 class="text-2xl sm:text-3xl lg:text-5xl font-bold text-white mb-4 tracking-tight leading-tight truncate">
              {{ greeting }}, <br/>
              <span class="text-[#EEBA30]">{{ auth.user?.name?.split(' ')[0] }}</span>.
            </h2>
            <p class="text-white/60 text-lg font-medium max-w-md">
              The world of literature is waiting for you. Ready to explore your private collection?
            </p>
          </div>

          <div v-if="library.continueReadingBook" 
               @click="showRecentTomes = true"
               class="z-10 mt-8 flex flex-col sm:flex-row items-center gap-6 p-4 bg-white/5 backdrop-blur-md rounded-3xl border border-white/5 shadow-2xl cursor-pointer hover:bg-white/10 transition-all group">
            <img :src="library.continueReadingBook.cover_url" class="h-28 w-20 object-cover rounded-xl shadow-lg shadow-black/20 group-hover:scale-105 transition-transform" />
            <div class="flex-1 min-w-0">
              <p class="text-[10px] uppercase font-black tracking-widest text-[#EEBA30] mb-1">Continue Reading</p>
              <h4 class="text-white font-bold text-lg mb-1 leading-tight line-clamp-2">{{ library.continueReadingBook.title }}</h4>
              <p class="text-white/40 text-sm font-medium mb-3 line-clamp-2">Archival Tome</p>
              <router-link 
                @click.stop
                :to="`/read/${library.continueReadingBook.$id}`" 
                class="inline-flex items-center gap-2 bg-[#AE0001] text-white px-5 py-2 rounded-xl text-sm font-bold shadow-lg shadow-[#AE0001]/20 hover:scale-105 transition-transform active:scale-95"
              >
                Jump Back In <ChevronRight class="w-4 h-4" />
              </router-link>
            </div>
          </div>
        </div>

        <div class="grid gap-6">
          <StatsCard v-for="stat in stats" :key="stat.title" v-bind="stat" />
        </div>
      </div>
    </section>

      <!-- Search & Filters Bar (Desktop) -->
      <section class="hidden md:block space-y-6">
        <div class="flex flex-col md:flex-row gap-4 max-w-4xl mx-auto">
          <div class="relative flex-1">
            <Search class="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 theme-text-soft opacity-50" />
            <input
              v-model="searchInput"
              type="text"
              placeholder="Search your private library..."
              class="w-full pl-14 pr-14 py-4.5 theme-card theme-text border theme-border rounded-2xl outline-none focus:border-[#AE0001] focus:ring-4 focus:ring-[#AE0001]/10 transition-all text-base font-medium placeholder:theme-text-soft placeholder:opacity-50 shadow-inner"
            />
            <button v-if="searchInput" @click="clearSearch" class="absolute right-5 top-1/2 -translate-y-1/2 p-1.5 hover:bg-[#AE0001]/10 rounded-lg transition-colors text-[#AE0001]">
              <X class="w-4 h-4" />
            </button>
          </div>
          
          <div class="flex items-center gap-2">
            <select 
              :value="catalogFilters.sort"
              @change="updateFilters({ sort: ($event.target as HTMLSelectElement).value })"
              class="px-4 py-4.5 theme-card theme-text border theme-border rounded-2xl outline-none focus:border-[#f02e65] transition-all text-sm font-bold appearance-none cursor-pointer pr-10 bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2216%22%20height%3D%2216%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22currentColor%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpath%20d%3D%22m6%209%206%206%206-6%22%2F%3E%3C%2Fsvg%3E')] bg-[length:20px] bg-[position:right_12px_center] bg-no-repeat shadow-inner"
            >
              <option value="popular">Popularity</option>
              <option value="descending">Newest First</option>
              <option value="ascending">Oldest First</option>
            </select>
          </div>
        </div>
        
        <div v-if="!isSearching" class="flex flex-wrap items-center justify-center gap-2">
          <button 
            @click="updateFilters({ topic: '' })"
            :class="!catalogFilters.topic ? 'bg-[#AE0001] text-white shadow-lg' : 'theme-card theme-text-soft border theme-border'"
            class="px-5 py-2 rounded-xl text-xs font-bold transition-all hover:scale-105"
          >
            All Archives
          </button>
          <button 
            v-for="genre in library.allGenres" 
            :key="genre"
            @click="updateFilters({ topic: genre })"
            :class="catalogFilters.topic === genre ? 'bg-[#AE0001] text-white shadow-lg' : 'theme-card theme-text-soft border theme-border'"
            class="px-5 py-2 rounded-xl text-xs font-bold transition-all hover:scale-105 flex items-center gap-2"
          >
            {{ genre }}
            <span v-if="library.userPreferredGenres.includes(genre)" class="w-2 h-2 bg-[#EEBA30] rounded-full border border-black/20 shadow-sm" />
          </button>
        </div>
      </section>

      <!-- Mobile FAB & Search -->
      <section class="md:hidden flex flex-col gap-4">
         <div class="relative">
            <Search class="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 theme-text-soft opacity-50" />
            <input
              v-model="searchInput"
              type="text"
              placeholder="Search..."
              class="w-full pl-11 pr-11 py-3.5 theme-card theme-text border theme-border rounded-xl outline-none focus:border-[#AE0001] text-sm"
            />
         </div>
      </section>

        <!-- Bookstore / Book Grid -->
        <section class="space-y-12 relative">

          <!-- Section Header -->
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pr-2">
            <div class="flex items-center gap-4">
            <div class="p-2.5 rounded-xl bg-[#AE0001]/10 shadow-lg border border-[#AE0001]/20">
              <component :is="isSearching ? Search : Sparkles" class="w-6 h-6 text-[#AE0001]" />
            </div>
            <h3 class="text-3xl font-black theme-text tracking-tight font-cinzel text-[#EEBA30] uppercase">{{ sectionTitle }}</h3>
            </div>
          </div>
  
          <!-- Bookstore View (Enchanted Selection - Still from Appwrite) -->
          <div v-if="!isSearching" class="animate-in fade-in slide-in-from-bottom-5 duration-700">
            <BookstoreView />
          </div>
  
          <!-- Complete Archive Grid -->
          <div class="space-y-12 mt-16">
            <div v-if="!isSearching" class="flex items-center gap-4 mb-4">
               <div class="h-px flex-1 bg-gradient-to-r from-transparent via-theme-border to-transparent opacity-30" />
               <span class="text-sm font-black uppercase tracking-[0.3em] theme-text-soft opacity-40">Complete Collection</span>
               <div class="h-px flex-1 bg-gradient-to-r from-transparent via-theme-border to-transparent opacity-30" />
            </div>
  
            <div v-if="isCatalogLoading" class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-6 lg:gap-8 animate-pulse">
              <div v-for="i in 12" :key="i" class="aspect-[2/3] bg-black/5 dark:bg-white/5 rounded-2xl border theme-border" />
            </div>
            
            <div v-else-if="!isCatalogLoading && (!catalogBooks || catalogBooks.length === 0)" class="text-center py-32 theme-card rounded-3xl border theme-border border-dashed">
              <Search class="w-16 h-16 mx-auto theme-text-soft opacity-20 mb-6" />
              <p class="text-2xl font-bold theme-text-soft opacity-60">No matching books found</p>
              <p class="text-sm theme-text-soft opacity-40 mt-2">Try adjusting your filters or search terms</p>
            </div>
            
            <div v-else class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4 lg:gap-5">
              <BookCard v-for="book in catalogBooks" :key="book.$id" :book="book" />
            </div>
  
            <!-- Pagination -->
            <BookPagination 
              v-if="totalPages > 1"
              :current-page="currentPage"
              :total-pages="totalPages"
              :is-loading="isCatalogLoading"
              @change-page="changePage"
            />
          </div>
        </section>
      </main>

    <!-- ═══════ BOOKSHELF TAB ═══════ -->
    <main v-else class="flex-1 w-full animate-fade-in">
      <!-- Header -->
      <div class="max-w-7xl mx-auto px-6 lg:px-12 pt-8 pb-4 flex items-center justify-between">
        <div>
          <h2 class="text-3xl font-bold theme-text tracking-tight">My Bookshelf</h2>
          <p class="text-sm theme-text-soft opacity-60 font-medium mt-1">
            {{ library.sessions.length }} book{{ library.sessions.length !== 1 ? 's' : '' }} on your shelf · Click a spine to see stats
          </p>
        </div>
        <button
          v-if="!hasBookshelfContent"
          @click="activeTab = 'discover'"
          class="inline-flex items-center gap-2 px-5 py-2.5 bg-[#AE0001] text-white rounded-xl text-sm font-bold shadow-lg shadow-[#AE0001]/20 hover:shadow-[#AE0001]/40 transition-all active:scale-95"
        >
          <Sparkles class="w-4 h-4" /> Browse Library
        </button>
      </div>

      <!-- The magical shelf -->
      <div class="max-w-7xl mx-auto px-6 lg:px-12 pb-12">
        <BookshelfView />
      </div>
    </main>



    <!-- Footer -->
    <footer class="mt-auto py-16 px-6 border-t theme-border text-center bg-black/20">
      <div class="max-w-4xl mx-auto space-y-6">
        <div class="flex flex-col md:flex-row items-center justify-center gap-4 md:gap-8 theme-text-soft text-sm font-bold uppercase tracking-widest">
          <a href="https://github.com/casdy" target="_blank" class="hover:text-[#EEBA30] transition-colors flex items-center gap-2">
            Built with <span class="text-[#AE0001]">❤️</span> by @casdy
          </a>
        </div>
        
        <p class="theme-text-soft text-xs font-medium opacity-60">
          Powered by <span class="text-[#AE0001] font-bold">Appwrite</span>
        </p>

        <div class="pt-4 border-t theme-border opacity-20">
          <p class="text-[10px] font-black tracking-[0.4em] uppercase theme-text">ProLibris Engine // v1.2</p>
        </div>
      </div>
    </footer>

    <!-- Mobile Filter Drawer -->
    <Teleport to="body">
       <div v-if="isFilterDrawerOpen" class="fixed inset-0 z-[100] md:hidden">
         <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" @click="isFilterDrawerOpen = false" />
         <div class="absolute bottom-0 inset-x-0 theme-bg rounded-t-[2.5rem] p-8 border-t theme-border shadow-2xl animate-slide-up">
            <div class="flex items-center justify-between mb-8">
               <h3 class="text-xl font-bold theme-text tracking-tight uppercase">Filters & Sorting</h3>
               <button @click="isFilterDrawerOpen = false" class="p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-full transition-colors">
                 <X class="w-6 h-6 theme-text" />
               </button>
            </div>

            <div class="space-y-8">
               <div>
                  <p class="text-[10px] font-black uppercase tracking-widest theme-text-soft opacity-60 mb-4">Sort By</p>
                  <div class="grid grid-cols-2 gap-3">
                     <button 
                       v-for="s in ['popular', 'descending', 'ascending']" 
                       :key="s"
                       @click="updateFilters({ sort: s })"
                       :class="catalogFilters.sort === s ? 'bg-[#AE0001] text-white shadow-lg shadow-[#AE0001]/20' : 'theme-card theme-text-soft border theme-border'"
                       class="px-4 py-3 rounded-xl text-xs font-bold capitalize transition-all"
                     >
                       {{ s === 'popular' ? 'Popularity' : s.replace('ing', '') + 'est' }}
                     </button>
                  </div>
               </div>

               <div>
                  <p class="text-[10px] font-black uppercase tracking-widest theme-text-soft opacity-60 mb-4">Categories</p>
                  <div class="grid grid-cols-2 gap-3 max-h-[40vh] overflow-y-auto pr-2">
                     <button 
                       v-for="topic in ['Fiction', 'History', 'Mystery', 'Science', 'Poetry', 'Philosophy', 'Art', 'Biography']"
                       :key="topic"
                       @click="updateFilters({ topic: catalogFilters.topic === topic ? '' : topic })"
                       :class="catalogFilters.topic === topic ? 'bg-[#AE0001] text-white' : 'theme-card theme-text-soft border theme-border'"
                       class="px-4 py-3 rounded-xl text-xs font-bold transition-all text-left"
                     >
                       {{ topic }}
                     </button>
                  </div>
               </div>

               <button 
                 @click="isFilterDrawerOpen = false"
                 class="w-full py-4 bg-[#AE0001] text-white rounded-2xl font-bold shadow-lg shadow-[#AE0001]/20 active:scale-95 transition-transform"
               >
                 Apply Filters
               </button>
            </div>
         </div>
       </div>
    </Teleport>

    <!-- Mobile Filter Toggle FAB -->
    <button 
      v-if="activeTab === 'discover'"
      @click="isFilterDrawerOpen = true"
      class="md:hidden fixed bottom-8 right-6 z-50 w-14 h-14 bg-[#AE0001] text-white rounded-2xl shadow-xl shadow-[#AE0001]/30 flex items-center justify-center transform active:scale-90 transition-transform"
    >
       <Filter class="w-6 h-6" />
       <div v-if="catalogFilters.topic" class="absolute -top-1 -right-1 w-4 h-4 bg-white dark:bg-slate-900 text-[#EEBA30] text-[10px] font-black rounded-full border-2 border-[#AE0001] flex items-center justify-center">1</div>
    </button>

    <!-- ═══ Recent Tomes Portal Overlay ═══ -->
    <Teleport to="body">
       <Transition name="modal-fade">
          <div v-if="showRecentTomes" class="fixed inset-0 z-[200] flex items-center justify-center p-6">
            <div class="absolute inset-0 bg-black/80 backdrop-blur-xl" @click="showRecentTomes = false" />
            
            <div class="relative w-full max-w-xl bg-gradient-to-br from-[#2a180d] via-[#1a0f05] to-[#2a180d] rounded-[3rem] p-8 border border-white/10 shadow-2xl overflow-hidden">
               <!-- Magical Glows -->
               <div class="absolute -top-24 -right-24 w-64 h-64 bg-amber-500/10 blur-[100px] pointer-events-none" />
               <div class="absolute -bottom-24 -left-24 w-64 h-64 bg-[#AE0001]/10 blur-[100px] pointer-events-none" />

               <div class="flex items-center justify-between mb-8">
                  <div>
                    <h3 class="text-2xl font-black theme-text font-cinzel text-[#EEBA30] uppercase tracking-wider">Recently Accessed</h3>
                    <p class="text-white/40 text-xs font-bold uppercase tracking-widest mt-1">Jump back into your paths</p>
                  </div>
                  <button @click="showRecentTomes = false" class="p-3 hover:bg-white/5 rounded-full transition-colors text-white/60 hover:text-white">
                    <X class="w-6 h-6" />
                  </button>
               </div>

               <div class="space-y-4 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                  <div 
                    v-for="item in library.recentReadingList" 
                    :key="item.book?.$id || 'unknown'"
                    @click="item.book && router.push(`/read/${item.book.$id}`)"
                    class="group flex items-center gap-5 p-4 rounded-3xl bg-white/5 border border-white/5 transition-all hover:bg-white/10 hover:border-white/10 cursor-pointer active:scale-[0.98]"
                  >
                     <div class="relative flex-shrink-0">
                        <img :src="item.book?.cover_url" class="w-16 h-24 object-cover rounded-xl shadow-xl transition-all group-hover:scale-105" />
                        <div class="absolute inset-0 rounded-xl ring-1 ring-inset ring-white/10" />
                     </div>
                     
                     <div class="flex-1 min-w-0">
                        <div class="flex items-center gap-2 mb-1">
                           <Clock class="w-3 h-3 text-[#EEBA30]" />
                           <span class="text-[10px] font-black uppercase tracking-widest text-[#EEBA30]">{{ formatDate(item.session.last_read_at) }}</span>
                        </div>
                        <h4 class="text-white font-bold text-lg mb-0.5 line-clamp-2 leading-tight">{{ item.book?.title }}</h4>
                        <p class="text-white/40 text-sm font-medium line-clamp-2 mb-2">Archival Tome</p>
                        
                        <div class="flex items-center gap-4">
                           <div class="flex items-center gap-1.5 px-3 py-1 bg-[#AE0001]/20 rounded-lg text-[10px] font-black text-[#AE0001] uppercase tracking-widest border border-[#AE0001]/30">
                              <Zap class="w-3 h-3" />
                              {{ item.session.status === 'completed' ? 'Mastered' : 'Progressing' }}
                           </div>
                        </div>
                     </div>
                     
                     <ChevronRight class="w-6 h-6 text-white/20 group-hover:text-[#EEBA30] group-hover:translate-x-1 transition-all" />
                  </div>
               </div>

               <p v-if="library.recentReadingList.length === 0" class="text-center py-12 text-white/20 font-bold tracking-widest uppercase text-sm">
                  No recently accessed tomes found
               </p>

               <div class="mt-8 pt-6 border-t border-white/5 flex justify-center">
                  <button @click="showRecentTomes = false" class="text-xs font-black uppercase tracking-[0.3em] text-white/40 hover:text-[#EEBA30] transition-colors">
                     Close Portal
                  </button>
               </div>
            </div>
          </div>
       </Transition>
    </Teleport>
  </div>
</template>

<style>
.animate-fade-in {
  animation: fadeIn 0.4s ease-out;
}
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(12px); }
  to   { opacity: 1; transform: translateY(0);    }
}

.animate-slide-up {
  animation: slideUp 0.4s cubic-bezier(0.23, 1, 0.32, 1);
}
@keyframes slideUp {
  from { transform: translateY(100%); }
  to   { transform: translateY(0); }
}

.modal-fade-enter-active { animation: modalIn 0.45s cubic-bezier(0.16, 1, 0.3, 1); }
.modal-fade-leave-active { animation: modalIn 0.25s cubic-bezier(0.4, 0, 1, 1) reverse; }
@keyframes modalIn { from { opacity: 0; transform: scale(0.88) translateY(24px); } to { opacity: 1; transform: scale(1) translateY(0); } }

.custom-scrollbar::-webkit-scrollbar { width: 4px; }
.custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
.custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.1); border-radius: 10px; }
.custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255, 255, 255, 0.2); }
</style>
