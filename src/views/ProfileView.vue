<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useLibraryStore, type ReadingSession } from '@/stores/library'
import { 
  ArrowLeft, BookOpen, Target, Zap, Flame, 
  Award, Library, Clock, Heart, Sparkles, MoveRight,
  TrendingUp, Star, Loader2
} from 'lucide-vue-next'
import AppLogo from '@/components/AppLogo.vue'

const router = useRouter()
const auth = useAuthStore()
const library = useLibraryStore()
const isSyncing = ref(true)

const stats = computed(() => {
  const sessions = library.sessions || []
  const totalPages = sessions.reduce((acc, s) => acc + (s.pages_turned || 0), 0)
  const completed = sessions.filter(s => s.status === 'completed').length
  const reading = sessions.filter(s => s.status === 'reading').length
  
  // High-Fidelity Typing Analytics
  const typingSessions = sessions.filter(s => (s.avg_type_wpm || 0) > 0)
  const maxWpm = typingSessions.reduce((max, s) => Math.max(max, s.avg_type_wpm || 0), 0)
  const totalWpm = typingSessions.reduce((acc, s) => acc + (s.avg_type_wpm || 0), 0)
  const avgWpm = typingSessions.length > 0 ? Math.round(totalWpm / typingSessions.length) : 0
  
  const totalAcc = typingSessions.reduce((acc, s) => acc + (s.avg_accuracy || 0), 0)
  const avgAcc = typingSessions.length > 0 ? Math.round(totalAcc / typingSessions.length) : 0

  const allDates = sessions.flatMap((s: ReadingSession) => {
    return s.last_read_at ? [s.last_read_at.split('T')[0]] : []
  })
  const totalDays = new Set(allDates).size

  return { totalPages, completed, reading, maxWpm, avgWpm, avgAcc, totalDays, totalSessions: sessions.length }
})

const masteryProgress = computed(() => {
  const sessions = library.sessions || []
  if (sessions.length === 0) return 0
  
  const totalWeight = sessions.reduce((sum, s) => {
    if (s.status === 'completed') return sum + 1
    if (s.status === 'reading') {
      // 250 pages = 1 standard 'book unit' of mastery
      // We cap it at 0.95 to ensure 'Reading' never shows 100% until finished
      const progress = Math.min(0.95, (s.pages_turned || 0) / 250)
      return sum + progress
    }
    return sum
  }, 0)
  
  const rawProgress = (totalWeight / sessions.length) * 100
  return Math.min(100, Math.round(rawProgress))
})

const favoriteGenre = computed(() => {
  const genres: Record<string, number> = {}
  library.sessions.forEach(s => {
    const book = library.allBooks.find(b => b.$id === s.book_id)
    if (book) {
      book.subjects.forEach(g => {
        genres[g] = (genres[g] || 0) + 1
      })
    }
  })
  
  const sorted = Object.entries(genres).sort((a, b) => b[1] - a[1])
  return sorted[0]?.[0] || 'The Unknown'
})

const wizardingRank = computed(() => {
  const pages = stats.value.totalPages
  if (pages > 1000) return { title: 'Grand Archmage', level: 'Level 5', icon: Star, color: '#EEBA30' }
  if (pages > 500)  return { title: 'Master Librarian', level: 'Level 4', icon: Library, color: '#EEBA30' }
  if (pages > 250)  return { title: 'Adept Scriptor', level: 'Level 3', icon: Award, color: '#AE0001' }
  if (pages > 100)  return { title: 'Novice Scryer', level: 'Level 2', icon: Sparkles, color: '#AE0001' }
  return { title: 'Initiate Seeker', level: 'Level 1', icon: BookOpen, color: '#6B7280' }
})

const goBack = () => router.push('/dashboard')

onMounted(async () => {
  isSyncing.value = true
  await library.fetchUserSessions()
  isSyncing.value = false
})
</script>

<template>
  <div class="min-h-screen theme-bg theme-text p-6 lg:p-12 relative overflow-hidden font-outfit transition-all duration-500">
    
    <!-- Magical Background Accents -->
    <div class="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-[#EEBA30] blur-[180px] opacity-[0.06] rounded-full pointer-events-none"></div>
    <div class="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-[#AE0001] blur-[180px] opacity-[0.06] rounded-full pointer-events-none"></div>

    <div class="max-w-6xl mx-auto space-y-12 z-20 relative">
      
      <!-- Navbar Back Section -->
      <nav class="flex items-center justify-between py-4">
        <button @click="goBack" class="group flex items-center gap-3 px-5 py-2.5 rounded-2xl theme-card border theme-border hover:border-[#AE0001]/40 transition-all hover:bg-[#AE0001]/5 active:scale-95 shadow-lg shadow-black/10">
          <ArrowLeft class="w-5 h-5 theme-text-soft group-hover:text-[#AE0001] group-hover:-translate-x-1 transition-all" />
          <span class="text-sm font-bold theme-text uppercase tracking-widest">Return to Library</span>
        </button>
        <AppLogo size="sm" class="hover:rotate-12 transition-transform opacity-60" />
      </nav>

      <!-- Profile Header Hero -->
      <header class="grid lg:grid-cols-3 gap-12 items-center">
        <div class="lg:col-span-2 space-y-6">
          <div class="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#EEBA30]/10 border border-[#EEBA30]/20 text-[#EEBA30] text-xs font-black tracking-[0.2em] uppercase">
            <Sparkles class="w-3.5 h-3.5" /> Seeker Profile
          </div>
          <h1 class="text-6xl lg:text-8xl font-black theme-text tracking-tighter font-cinzel leading-none">
            {{ auth.user?.name || 'Grand Arcanist' }}
          </h1>
          <div class="flex flex-wrap items-center gap-6 pt-4">
             <div class="flex items-center gap-3 px-6 py-3 rounded-2xl bg-[#EEBA30] text-black shadow-xl shadow-[#EEBA30]/20 transform hover:-translate-y-1 transition-all cursor-default group">
                <component :is="wizardingRank.icon" class="w-6 h-6 group-hover:rotate-12 transition-transform" />
                <div>
                   <p class="text-[10px] font-black uppercase tracking-widest opacity-60 leading-none mb-1">Current Rank</p>
                   <p class="text-lg font-black font-cinzel leading-none">{{ wizardingRank.title }}</p>
                </div>
             </div>
             <div class="flex items-center gap-3 px-6 py-3 rounded-2xl theme-card border theme-border text-[#AE0001] shadow-xl shadow-black/10 transition-all hover:bg-[#AE0001]/5 hover:border-[#AE0001]/30">
                <TrendingUp class="w-6 h-6" />
                <div>
                   <p class="text-[10px] font-black uppercase tracking-widest opacity-60 leading-none mb-1">Progress</p>
                   <p class="text-lg font-black font-cinzel leading-none">{{ wizardingRank.level }}</p>
                </div>
             </div>
          </div>
        </div>
        
        <div class="relative group">
           <div class="absolute -inset-4 bg-gradient-to-tr from-[#AE0001]/20 via-transparent to-[#EEBA30]/20 rounded-full blur-2xl group-hover:opacity-100 transition-opacity opacity-50"></div>
           <div class="w-56 h-56 lg:w-64 lg:h-64 rounded-full border-4 border-[#EEBA30] overflow-hidden shadow-2xl relative z-10 mx-auto">
              <img src="https://images.unsplash.com/photo-1549488497-256795402cc0?auto=format&fit=crop&q=80&w=400" 
                   class="w-full h-full object-cover grayscale-[0.5] hover:grayscale-0 transition-all duration-700 hover:scale-110" />
           </div>
        </div>
      </header>

      <!-- Main Statistics Grid -->
      <section class="grid md:grid-cols-2 lg:grid-cols-4 gap-6 relative min-h-[300px]">
        <!-- Loading Overlay -->
        <Transition name="fade">
          <div v-if="isSyncing" class="absolute inset-0 z-30 flex flex-col items-center justify-center bg-inherit/40 backdrop-blur-md rounded-[3rem] border theme-border">
            <Loader2 class="w-12 h-12 text-[#EEBA30] animate-spin mb-4" />
            <p class="text-xs font-black uppercase tracking-[0.3em] theme-text opacity-60">Summoning archival stats...</p>
          </div>
        </Transition>

        <!-- Pages Read -->
        <div class="theme-card p-8 rounded-[2.5rem] border theme-border relative overflow-hidden group hover:border-[#EEBA30]/50 transition-all" :class="{ 'opacity-20 blur-sm': isSyncing }">
          <BookOpen class="w-10 h-10 text-[#EEBA30] mb-6 transform group-hover:scale-110 transition-transform" />
          <h4 class="text-5xl font-black theme-text font-cinzel mb-2">{{ stats.totalPages.toLocaleString() }}</h4>
          <p class="text-sm font-bold theme-text-soft uppercase tracking-widest opacity-60">Total Pages Read</p>
          <div class="absolute -bottom-8 -right-8 w-24 h-24 bg-[#EEBA30]/5 rounded-full blur-2xl group-hover:bg-[#EEBA30]/10 transition-all"></div>
        </div>

        <!-- Mastery (Typing Speed) -->
        <div class="theme-card p-8 rounded-[2.5rem] border theme-border relative overflow-hidden group hover:border-[#AE0001]/50 transition-all" :class="{ 'opacity-20 blur-sm': isSyncing }">
          <Zap class="w-10 h-10 text-[#AE0001] mb-6 transform group-hover:scale-110 transition-transform" />
          <h4 class="text-5xl font-black theme-text font-cinzel mb-2">{{ stats.avgWpm }}</h4>
          <p class="text-sm font-bold theme-text-soft uppercase tracking-widest opacity-60">Avg Typing WPM</p>
          <div class="mt-2 text-[10px] font-black uppercase tracking-widest text-[#AE0001] opacity-40">Peak: {{ stats.maxWpm }}</div>
          <div class="absolute -bottom-8 -right-8 w-24 h-24 bg-[#AE0001]/5 rounded-full blur-2xl group-hover:bg-[#AE0001]/10 transition-all"></div>
        </div>

        <!-- Accuracy -->
        <div class="theme-card p-8 rounded-[2.5rem] border theme-border relative overflow-hidden group hover:border-emerald-500/50 transition-all" :class="{ 'opacity-20 blur-sm': isSyncing }">
          <Target class="w-10 h-10 text-emerald-500 mb-6 transform group-hover:scale-110 transition-transform" />
          <h4 class="text-5xl font-black theme-text font-cinzel mb-2">{{ stats.avgAcc }}%</h4>
          <p class="text-sm font-bold theme-text-soft uppercase tracking-widest opacity-60">Global Accuracy</p>
          <div class="absolute -bottom-8 -right-8 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl"></div>
        </div>

        <!-- Reading Days -->
        <div class="theme-card p-8 rounded-[2.5rem] border theme-border relative overflow-hidden group hover:border-orange-500/50 transition-all" :class="{ 'opacity-20 blur-sm': isSyncing }">
          <Flame class="w-10 h-10 text-orange-500 mb-6 transform group-hover:scale-110 transition-transform" />
          <h4 class="text-5xl font-black theme-text font-cinzel mb-2">{{ stats.totalDays }}</h4>
          <p class="text-sm font-bold theme-text-soft uppercase tracking-widest opacity-60">Total Reading Days</p>
          <div class="absolute -bottom-8 -right-8 w-24 h-24 bg-orange-500/5 rounded-full blur-2xl group-hover:bg-orange-500/10 transition-all"></div>
        </div>

        <!-- Collections -->
        <div class="theme-card p-8 rounded-[2.5rem] border theme-border relative overflow-hidden group hover:border-amber-500/50 transition-all" :class="{ 'opacity-20 blur-sm': isSyncing }">
          <Library class="w-10 h-10 text-amber-500 mb-6 transform group-hover:scale-110 transition-transform" />
          <h4 class="text-5xl font-black theme-text font-cinzel mb-2">{{ library.likedBooks.length }}</h4>
          <p class="text-sm font-bold theme-text-soft uppercase tracking-widest opacity-60">Vaulted Favorites</p>
          <div class="absolute -bottom-8 -right-8 w-24 h-24 bg-amber-500/5 rounded-full blur-2xl"></div>
        </div>
      </section>

      <!-- Advanced Analytics Row -->
      <section class="grid lg:grid-cols-3 gap-8">
        
        <!-- Favorit Genre Card -->
        <div class="lg:col-span-2 theme-card p-10 rounded-[3rem] border theme-border relative group overflow-hidden bg-gradient-to-br from-[#1a0f05] to-transparent">
          <div class="flex items-center justify-between mb-8">
            <div class="space-y-1">
              <h3 class="text-2xl font-black theme-text font-cinzel uppercase">Dominant Archive</h3>
              <p class="text-sm theme-text-soft opacity-60 font-medium">Your most explored literary subject</p>
            </div>
            <Heart class="w-10 h-10 text-[#AE0001] fill-[#AE0001]/10 group-hover:scale-110 transition-transform" />
          </div>
          
          <div class="flex flex-col sm:flex-row items-center gap-10">
             <div class="relative">
                <div class="absolute inset-0 bg-[#EEBA30]/20 blur-3xl rounded-full animate-pulse"></div>
                <div class="w-40 h-40 rounded-full border-8 border-double border-[#EEBA30]/30 flex items-center justify-center relative z-10 transition-transform group-hover:rotate-12 duration-500">
                   <Library class="w-16 h-16 text-[#EEBA30]" />
                </div>
             </div>
             <div class="space-y-4 text-center sm:text-left">
                <h2 class="text-5xl lg:text-6xl font-black text-[#EEBA30] font-cinzel truncate">{{ favoriteGenre }}</h2>
                <div class="flex flex-wrap items-center justify-center sm:justify-start gap-3">
                   <span class="px-4 py-1.5 rounded-xl bg-white/5 border theme-border text-xs font-bold uppercase tracking-widest theme-text-soft">Expert Class</span>
                   <span class="px-4 py-1.5 rounded-xl bg-[#AE0001]/10 border border-[#AE0001]/20 text-xs font-bold uppercase tracking-widest text-[#AE0001]">Scarlet Archivist</span>
                </div>
             </div>
          </div>
        </div>

        <!-- Recent Activity Mini-Feed -->
        <div class="theme-card p-10 rounded-[3rem] border theme-border space-y-8">
           <div class="flex items-center justify-between">
              <h3 class="text-xl font-black theme-text font-cinzel uppercase tracking-widest">Rituals</h3>
              <Clock class="w-5 h-5 theme-text-soft opacity-40" />
           </div>
           
           <div class="space-y-6">
              <div v-for="s in library.sessions.slice(0, 3)" :key="s.$id" class="flex gap-4 items-center group cursor-default">
                 <div class="w-12 h-16 flex-shrink-0 bg-white/5 rounded-lg border theme-border overflow-hidden relative">
                    <img :src="library.allBooks.find(b => b.$id === s.book_id)?.cover_url" class="w-full h-full object-cover transition-transform group-hover:scale-110" />
                 </div>
                 <div class="flex-1 min-w-0">
                    <p class="text-sm font-bold theme-text truncate">{{ library.allBooks.find(b => b.$id === s.book_id)?.title }}</p>
                    <p class="text-[10px] font-black uppercase tracking-widest text-[#EEBA30] mt-1">{{ s.status }}</p>
                 </div>
                 <MoveRight class="w-4 h-4 text-white/10 group-hover:text-[#EEBA30] group-hover:translate-x-1 transition-all" />
              </div>
              <div v-if="library.sessions.length === 0" class="text-center py-12 theme-text-soft opacity-40 italic">No recent scrolls found...</div>
           </div>
        </div>
      </section>

      <!-- Vault Progress Bar -->
      <section class="theme-card p-10 rounded-[3rem] border theme-border bg-gradient-to-r from-[#AE0001]/5 to-transparent">
         <div class="flex flex-col md:flex-row items-center gap-12">
            <div class="space-y-2 flex-shrink-0">
               <h3 class="text-3xl font-black theme-text font-cinzel">COLLECTION GROWTH</h3>
               <p class="text-sm theme-text-soft opacity-60">Mastering the archives of ProLibris</p>
            </div>
            
            <div class="flex-1 w-full space-y-4">
               <div class="flex justify-between items-end">
                  <span class="text-xs font-black uppercase tracking-widest text-[#AE0001]">Mastery Progress</span>
                  <span class="text-sm font-black text-[#EEBA30]">{{ masteryProgress }}%</span>
               </div>
               <div class="h-4 bg-black/40 rounded-full overflow-hidden border theme-border p-1">
                  <div class="h-full bg-gradient-to-r from-[#AE0001] via-[#EEBA30] to-[#AE0001] rounded-full transition-all duration-1000 shadow-lg shadow-[#AE0001]/30" :style="{ width: `${Math.max(5, masteryProgress)}%` }"></div>
               </div>
            </div>
         </div>
      </section>

      <!-- Account Actions Footer -->
      <footer class="flex items-center justify-center pt-12 pb-24 opacity-40 hover:opacity-100 transition-opacity">
         <div class="h-px w-24 bg-gradient-to-r from-transparent to-theme-border"></div>
         <p class="px-8 text-[10px] font-bold uppercase tracking-[0.4em] theme-text-soft">ProLibris Engine Profile Integration // v1.2</p>
         <div class="h-px w-24 bg-gradient-to-l from-transparent to-theme-border"></div>
      </footer>

    </div>
  </div>
</template>

<style scoped>
.font-cinzel { font-family: 'Cinzel', serif; }

.animate-float {
  animation: float 4s ease-in-out infinite;
}

@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-10px); }
}

.theme-card {
  background: rgba(40, 22, 10, 0.2);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
}

.dark .theme-card {
  background: rgba(20, 10, 5, 0.4);
}

.animate-pulse {
  animation: pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 0.15; transform: scale(1); }
  50% { opacity: 0.3; transform: scale(1.1); }
}
</style>
