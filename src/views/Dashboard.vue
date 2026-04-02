<script setup lang="ts">
import { onMounted, computed, ref, watch } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useLibraryStore } from '@/stores/library'
import { useUIStore } from '@/stores/ui'
import { BookOpen, Heart, Flame, Sparkles, LogOut, ChevronRight,
  Moon, Sun, Search, X, RefreshCw, Library, CheckCircle2
} from 'lucide-vue-next'
import BookCard from '@/components/BookCard.vue'
import StatsCard from '@/components/StatsCard.vue'
import BookshelfView from '@/components/BookshelfView.vue'
import BookstoreView from '@/components/BookstoreView.vue'

const auth = useAuthStore()
const library = useLibraryStore()
const ui = useUIStore()

type Tab = 'discover' | 'bookshelf'
const activeTab = ref<Tab>('discover')

const searchInput = ref('')
let debounceTimer: any = null

watch(searchInput, (val) => {
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => {
    library.searchBooks(val)
  }, 250)
})

const clearSearch = () => {
  searchInput.value = ''
  library.clearSearch()
}

const refreshRecommendations = () => {
  library.generateRecommendations()
}

onMounted(async () => {
  await Promise.all([
    library.fetchBooks(),
    library.fetchUserSessions()
  ])
})

const stats = computed(() => {
  const totalPages = library.sessions.reduce((acc, s) => acc + (s.pages_turned || 0), 0)
  const completed  = library.sessions.filter(s => s.status === 'completed').length
  const activeDays = new Set(library.sessions.map(s => s.last_read_at?.split('T')[0]).filter(Boolean)).size
  return [
    { title: 'Pages Read',    value: totalPages,   icon: BookOpen,      color: 'bg-blue-500 shadow-blue-500/30'   },
    { title: 'Completed',     value: completed,    icon: CheckCircle2,  color: 'bg-green-500 shadow-green-500/30' },
    { title: 'Reading Days',  value: activeDays,   icon: Flame,         color: 'bg-orange-500 shadow-orange-500/30' }
  ]
})

const displayBooks = computed(() => library.isSearching ? library.searchResults : library.recommendedBooks)
const sectionTitle  = computed(() => {
  if (library.isSearching)
    return `${library.searchResults.length} result${library.searchResults.length !== 1 ? 's' : ''} for "${library.searchQuery}"`
  return 'Recommended for You'
})

const hasBookshelfContent = computed(() =>
  library.sessions.some(s => s.progress_cfi || s.is_liked)
)
</script>

<template>
  <div class="min-h-screen theme-bg theme-text flex flex-col font-outfit transition-colors duration-500">

    <!-- ═══ Navbar ═══ -->
    <nav class="sticky top-0 z-50 theme-nav backdrop-blur-3xl border-b theme-border px-6 py-4 lg:px-12">
      <div class="max-w-7xl mx-auto flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 bg-[#f02e65] rounded-xl flex items-center justify-center shadow-lg shadow-[#f02e65]/20">
            <BookOpen class="w-6 h-6 text-white" />
          </div>
          <h1 class="text-xl font-bold theme-text tracking-tight">Prolibris</h1>
        </div>

        <div class="flex items-center gap-4">
          <!-- Tab switcher -->
          <div class="flex items-center gap-1 p-1 theme-card rounded-xl border theme-border">
            <button
              @click="activeTab = 'discover'"
              :class="activeTab === 'discover'
                ? 'bg-[#f02e65] text-white shadow-lg shadow-[#f02e65]/20'
                : 'theme-text-soft hover:theme-text'"
              class="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-bold transition-all duration-200"
            >
              <Sparkles class="w-4 h-4" />
              <span class="hidden sm:inline">Discover</span>
            </button>
            <button
              @click="activeTab = 'bookshelf'"
              :class="activeTab === 'bookshelf'
                ? 'bg-[#f02e65] text-white shadow-lg shadow-[#f02e65]/20'
                : 'theme-text-soft hover:theme-text'"
              class="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-bold transition-all duration-200 relative"
            >
              <Library class="w-4 h-4" />
              <span class="hidden sm:inline">Bookshelf</span>
              <span
                v-if="hasBookshelfContent && activeTab !== 'bookshelf'"
                class="absolute -top-0.5 -right-0.5 w-2 h-2 bg-[#f02e65] rounded-full border-2 theme-border"
              />
            </button>
          </div>

          <button @click="ui.toggleTheme()" class="p-2.5 rounded-xl bg-black/10 dark:bg-white/5 shadow-inner theme-text-soft hover:theme-text transition-all duration-300">
            <component :is="ui.isDark ? Sun : Moon" class="w-5 h-5" />
          </button>
          <div class="hidden sm:flex flex-col items-end">
            <p class="text-sm font-bold theme-text">{{ auth.user?.name }}</p>
            <p class="text-xs theme-text-soft font-medium opacity-70">Member since 2026</p>
          </div>
          <button @click="auth.logout()" class="p-2.5 rounded-xl bg-black/10 dark:bg-white/5 shadow-inner theme-text-soft hover:theme-text hover:bg-red-500/10 transition-all duration-300 transform active:scale-95">
            <LogOut class="w-5 h-5" />
          </button>
        </div>
      </div>
    </nav>

    <!-- ═══════ DISCOVER TAB ═══════ -->
    <main v-if="activeTab === 'discover'" class="flex-1 max-w-7xl mx-auto w-full p-6 lg:p-12 space-y-16 animate-fade-in">

      <!-- Welcome Hero & Stats -->
      <section class="grid lg:grid-cols-3 gap-8 items-stretch">
        <div class="lg:col-span-2 relative bg-gradient-to-br from-[#1a0f05] via-[#2a180d] to-[#3d2212] rounded-[2.5rem] p-10 overflow-hidden shadow-2xl flex flex-col justify-between min-h-[320px]">
          <div class="absolute top-0 right-0 w-[40%] h-full bg-gradient-to-l from-amber-500/10 to-transparent blur-3xl opacity-20 pointer-events-none" />
          <div class="z-10">
            <h2 class="text-4xl lg:text-5xl font-bold text-white mb-4 tracking-tight leading-tight">
              Good evening, <br/>
              <span class="text-[#f02e65]">{{ auth.user?.name?.split(' ')[0] }}</span>.
            </h2>
            <p class="text-white/60 text-lg font-medium max-w-md">
              The world of literature is waiting for you. Ready to turn the next page?
            </p>
          </div>

          <div v-if="library.continueReadingBook" class="z-10 mt-8 flex flex-col sm:flex-row items-center gap-6 p-4 bg-white/5 backdrop-blur-md rounded-3xl border border-white/5 shadow-2xl">
            <img :src="library.continueReadingBook.cover_url" class="h-28 w-20 object-cover rounded-xl shadow-lg shadow-black/20" />
            <div class="flex-1">
              <p class="text-[10px] uppercase font-black tracking-widest text-[#f02e65] mb-1">Continue Reading</p>
              <h4 class="text-white font-bold text-lg mb-1 leading-tight line-clamp-1">{{ library.continueReadingBook.title }}</h4>
              <p class="text-white/40 text-sm font-medium mb-3">{{ library.continueReadingBook.author }}</p>
              <router-link :to="`/read/${library.continueReadingBook.$id}`" class="inline-flex items-center gap-2 bg-[#f02e65] text-white px-5 py-2 rounded-xl text-sm font-bold shadow-lg shadow-[#f02e65]/20 hover:scale-105 transition-transform active:scale-95">
                Jump Back In <ChevronRight class="w-4 h-4" />
              </router-link>
            </div>
          </div>
          <div v-else class="z-10 mt-8 flex items-center gap-4 p-6 bg-white/5 backdrop-blur-md rounded-3xl border border-white/5">
            <div class="p-3 bg-white/10 rounded-2xl"><Sparkles class="w-6 h-6 text-[#f02e65]" /></div>
            <p class="text-white/70 font-medium">Pick a book from the library to start your journey.</p>
          </div>
        </div>

        <div class="grid gap-6">
          <StatsCard v-for="stat in stats" :key="stat.title" v-bind="stat" />
        </div>
      </section>

      <!-- Search Bar -->
      <section class="space-y-4">
        <div class="relative max-w-2xl mx-auto">
          <Search class="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 theme-text-soft opacity-50" />
          <input
            v-model="searchInput"
            type="text"
            placeholder="Search by title, author, or genre..."
            class="w-full pl-14 pr-14 py-4.5 theme-card theme-text border theme-border rounded-2xl outline-none focus:border-[#f02e65] focus:ring-4 focus:ring-[#f02e65]/10 transition-all text-base font-medium placeholder:theme-text-soft placeholder:opacity-50"
            style="background-color: var(--bg-card); color: var(--text-main); border-color: var(--border-app);"
          />
          <button v-if="searchInput" @click="clearSearch" class="absolute right-5 top-1/2 -translate-y-1/2 p-1.5 hover:bg-[#f02e65]/10 rounded-lg transition-colors">
            <X class="w-4 h-4 theme-text-soft" />
          </button>
        </div>
        <p class="text-center text-sm theme-text-soft opacity-60 font-medium">{{ library.allBooks.length }} books in library</p>
      </section>

      <!-- Bookstore / Book Grid -->
      <section class="space-y-8">
        <!-- Section Header (Only shown for Search) -->
        <div v-if="library.isSearching" class="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pr-2">
          <div class="flex items-center gap-4">
            <div class="p-2.5 rounded-xl bg-[#f02e65]/10">
              <Search class="w-6 h-6 text-[#f02e65]" />
            </div>
            <h3 class="text-2xl font-bold theme-text">{{ sectionTitle }}</h3>
          </div>
        </div>

        <!-- Bookstore View (Recommended) -->
        <div v-if="!library.isSearching">
          <BookstoreView />
        </div>

        <!-- Search Results Grid -->
        <div v-else>
          <div v-if="library.loading" class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-8">
            <div v-for="i in 10" :key="i" class="aspect-[2/3] bg-black/5 dark:bg-white/5 animate-pulse rounded-2xl" />
          </div>
          <div v-else-if="library.searchResults.length === 0" class="text-center py-20">
            <Search class="w-12 h-12 mx-auto theme-text-soft opacity-30 mb-4" />
            <p class="text-xl font-bold theme-text-soft opacity-60">No books found</p>
            <p class="text-sm theme-text-soft opacity-40 mt-2">Try a different title, author, or genre</p>
          </div>
          <div v-else class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6 lg:gap-8">
            <BookCard v-for="book in library.searchResults" :key="book.$id" :book="book" />
          </div>
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
          class="inline-flex items-center gap-2 px-5 py-2.5 bg-[#f02e65] text-white rounded-xl text-sm font-bold shadow-lg shadow-[#f02e65]/20 hover:shadow-[#f02e65]/40 transition-all active:scale-95"
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
    <footer class="mt-auto py-12 px-6 border-t theme-border text-center">
      <p class="theme-text-soft text-sm font-medium">Powered by <span class="text-[#f02e65] font-bold">Appwrite</span> & <span class="font-black uppercase tracking-tighter theme-text">epub.js</span></p>
    </footer>
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
</style>
