<script setup lang="ts">
import { computed, ref, onMounted } from 'vue'
import { useLibraryStore } from '@/stores/library'
import { useRouter } from 'vue-router'
import {
  X, BookOpen, Clock, BarChart2, Heart, Target,
  Zap, ChevronRight, Bookmark, CheckCircle2, Play,
  Keyboard, Star, Sparkles, RefreshCw
} from 'lucide-vue-next'

const library = useLibraryStore()
const router  = useRouter()

// ─── Selection Modal Logic ───────────────────────────────────────
const selected = ref<any | null>(null)

function openBook(book: any) {
  const session = library.sessions.find(s => s.book_id === book.$id)
  selected.value = {
    book,
    session,
    isLiked: !!session?.is_liked,
    isReading: session?.status === 'reading',
  }
}

function closeModal() {
  selected.value = null
}

function formatDate(dateStr?: string) {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  const diff = Date.now() - d.getTime()
  const mins  = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days  = Math.floor(diff / 86400000)
  if (mins < 1)   return 'just now'
  if (mins < 60)  return `${mins}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days < 7)   return `${days}d ago`
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function modeInfo(mode?: string) {
  if (mode === 'typing') return { label: 'Typing Mode',  icon: Keyboard, color: '#a855f7' }
  if (mode === 'paced')  return { label: 'Paced Mode',   icon: Zap,      color: '#3b82f6' }
  return                          { label: 'Standard Mode', icon: BookOpen, color: '#6b7280' }
}

const statusColor: Record<string, string> = {
  completed: '#22c55e',
  reading:   '#f02e65',
  unread:    '#6b7280',
}

const refreshRecommendations = () => {
  library.generateRecommendations()
}

// ─── Horizontal Scroll Logic ─────────────────────────────────────
const scrollContainer = ref<HTMLElement | null>(null)

function handleWheel(e: WheelEvent) {
  if (!scrollContainer.value) return
  // Translate vertical wheel to horizontal scroll
  if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
    e.preventDefault()
    scrollContainer.value.scrollLeft += e.deltaY * 1.5
  }
}

function scrollShelf(dir: 'left' | 'right') {
  if (!scrollContainer.value) return
  const amount = scrollContainer.value.clientWidth * 0.8
  scrollContainer.value.scrollBy({
    left: dir === 'left' ? -amount : amount,
    behavior: 'smooth'
  })
}
</script>

<template>
  <div class="bookstore-scene relative w-full overflow-hidden select-none pb-12">
    <!-- Magical ambient particles -->
    <div class="particles-layer" aria-hidden="true">
      <div v-for="n in 12" :key="n" class="particle" :style="{
        left: `${(n * 23.3) % 100}%`,
        animationDelay: `${(n * 0.9) % 6}s`,
        animationDuration: `${6 + (n * 1.3) % 5}s`,
        width: `${3 + n % 3}px`,
        height: `${3 + n % 3}px`,
        opacity: 0.3 + (n % 3) * 0.1,
      }" />
    </div>

    <!-- The Bookstore Shelf -->
    <div class="bookstore-container relative z-10">
      <div class="shelf-header flex items-center justify-between mb-8 px-8">
        <div class="flex items-center gap-3">
          <div class="p-2.5 bg-[#f02e65]/10 rounded-xl">
             <Sparkles class="w-6 h-6 text-[#f02e65]" />
          </div>
          <h3 class="text-2xl font-bold theme-text tracking-tight">Enchanted Selection</h3>
        </div>
        <button @click="refreshRecommendations" 
          class="flex items-center gap-2 px-4 py-2 bg-black/20 hover:bg-black/40 rounded-xl text-sm font-bold theme-text-soft hover:theme-text transition-all active:scale-95 border border-white/5 shadow-lg">
           <RefreshCw class="w-4 h-4" />
           Refresh
        </button>
      </div>

      <!-- Horizontal Scrollable Cover Flow -->
      <div class="relative group/nav">
        <!-- Navigation Buttons -->
        <button 
          @click="scrollShelf('left')"
          class="absolute left-0 top-1/2 -translate-y-1/2 z-20 p-4 bg-black/40 backdrop-blur-md text-[#E8D5A0] rounded-r-2xl border border-white/10 opacity-0 group-hover/nav:opacity-100 transition-opacity hover:bg-[#f02e65] hover:text-white"
        >
          <ChevronRight class="w-6 h-6 rotate-180" />
        </button>

        <button 
          @click="scrollShelf('right')"
          class="absolute right-0 top-1/2 -translate-y-1/2 z-20 p-4 bg-black/40 backdrop-blur-md text-[#E8D5A0] rounded-l-2xl border border-white/10 opacity-0 group-hover/nav:opacity-100 transition-opacity hover:bg-[#f02e65] hover:text-white"
        >
          <ChevronRight class="w-6 h-6" />
        </button>

        <div 
          ref="scrollContainer"
          @wheel="handleWheel"
          class="cover-flow-container overflow-x-auto overflow-y-visible pb-12 px-8 flex gap-8 snap-x snap-mandatory hide-scrollbar scroll-smooth"
        >
          <div 
            v-for="book in library.recommendedBooks" 
            :key="book.$id"
            class="book-item group flex-shrink-0 snap-center first:pl-2 last:pr-12"
            @click="openBook(book)"
          >
            <div class="cover-wrap relative transition-all duration-500 transform group-hover:-translate-y-4 group-hover:scale-105">
              <!-- Book shadow on shelf -->
              <div class="absolute -bottom-4 left-1/2 -translate-x-1/2 w-[85%] h-6 bg-black/60 blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
              
              <!-- Book Cover -->
              <div class="relative w-48 h-72 rounded-lg overflow-hidden shadow-[0_12px_40px_rgba(0,0,0,0.6)] border border-white/10 preserve-3d">
                <img :src="book.cover_url" class="w-full h-full object-cover" />
                <div class="absolute inset-0 bg-gradient-to-tr from-black/20 to-transparent opacity-40" />
                <div class="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-20 transition-opacity" />
                
                <!-- Subtle binding detail -->
                <div class="absolute inset-y-0 left-0 w-1.5 bg-black/30 border-r border-white/10" />
              </div>

              <!-- Magical Glow -->
              <div class="absolute inset-0 -z-10 bg-[#f02e65]/20 blur-2xl opacity-0 group-hover:opacity-60 transition-opacity duration-700 rounded-full scale-75" />
            </div>
            
            <div class="mt-6 text-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 transform translate-y-2 group-hover:translate-y-0">
              <h4 class="text-[#E8D5A0] font-bold text-sm line-clamp-1 max-w-[192px]">{{ book.title }}</h4>
              <p class="text-white/40 text-[10px] font-medium mt-1">{{ book.author }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Mahogany Shelf base -->
      <div class="shelf-plank absolute bottom-0 left-8 right-8 h-6 rounded-lg pointer-events-none">
        <div class="shelf-edge" />
        <div class="shelf-light absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent h-px" />
      </div>
    </div>

    <!-- Selection Modal (Same as BookshelfView) -->
    <Transition name="modal-fade">
      <div v-if="selected" class="modal-overlay" @click.self="closeModal">
        <div class="modal-parchment">
          <button @click="closeModal" class="modal-close">
            <X class="w-4 h-4" />
          </button>
          
          <div class="modal-header">
            <div class="modal-cover-wrap">
              <img :src="selected.book.cover_url" class="modal-cover" />
              <div class="cover-glow" style="background: #3d2200" />
            </div>
            <div class="modal-meta">
              <div class="modal-status-badge" :style="{ color: statusColor[selected.session?.status || 'unread'], borderColor: statusColor[selected.session?.status || 'unread'] + '40' }">
                <CheckCircle2 class="w-3.5 h-3.5" />
                {{ (selected.session?.status || 'unread').toUpperCase() }}
              </div>
              <h2 class="modal-title">{{ selected.book.title }}</h2>
              <p class="modal-author">by {{ selected.book.author }}</p>
              <div v-if="selected.book.subjects?.length" class="modal-subjects">
                <span v-for="subj in selected.book.subjects.slice(0, 2)" :key="subj" class="subject-tag">{{ subj }}</span>
              </div>
            </div>
          </div>

          <div class="parchment-divider"><span>✦</span></div>
          <div class="stats-grid">
            <div class="stat-cell"><Clock class="stat-icon" /><p class="stat-label">Last Read</p><p class="stat-value">{{ formatDate(selected.session?.last_read_at) }}</p></div>
            <div class="stat-cell"><BookOpen class="stat-icon" /><p class="stat-label">Pages Turned</p><p class="stat-value">{{ selected.session?.pages_turned || 0 }}</p></div>
            <div class="stat-cell"><component :is="modeInfo(selected.session?.mode_preference).icon" class="stat-icon" :style="{ color: modeInfo(selected.session?.mode_preference).color }" /><p class="stat-label">Reading Mode</p><p class="stat-value">{{ modeInfo(selected.session?.mode_preference).label }}</p></div>
            <div class="stat-cell"><Star class="stat-icon" /><p class="stat-label">Liked</p><p class="stat-value">{{ selected.isLiked ? '♥ Yes' : '—' }}</p></div>
          </div>

          <div class="parchment-divider"><span>✦</span></div>
          <div class="modal-actions">
            <button @click="closeModal" class="btn-secondary">Close</button>
            <router-link :to="`/read/${selected.book.$id}`" @click="closeModal" class="btn-primary">
              <Play class="w-4 h-4 fill-current" />
              {{ selected.session?.status === 'reading' ? 'Continue Reading' : 'Start Reading' }}
              <ChevronRight class="w-4 h-4" />
            </router-link>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.bookstore-scene {
  background: radial-gradient(ellipse at 50% 0%, #1a0d05 0%, #0d0702 100%);
  border-radius: 2.5rem;
  padding-top: 3rem;
  box-shadow: inset 0 0 100px rgba(0,0,0,0.6);
  border: 1px solid rgba(212, 175, 55, 0.08);
}

.particles-layer { position: absolute; inset: 0; pointer-events: none; z-index: 0; overflow: hidden; }
.particle { position: absolute; bottom: 20%; border-radius: 50%; background: radial-gradient(circle, #FFD700 0%, transparent 80%); animation: floatUp linear infinite; }
@keyframes floatUp {
  0% { transform: translateY(0); opacity: 0; }
  10% { opacity: 0.4; }
  90% { opacity: 0.2; }
  100% { transform: translateY(-60vh); opacity: 0; }
}

.hide-scrollbar::-webkit-scrollbar { display: none; }
.hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }

.shelf-plank {
  background: linear-gradient(180deg, #8B5E2C 0%, #6B4420 40%, #3D2410 100%);
  box-shadow: 0 10px 30px rgba(0,0,0,0.8), inset 0 1px 0 rgba(255,200,100,0.1);
  border-top: 1px solid rgba(220, 160, 60, 0.2);
}
.shelf-edge { position: absolute; bottom: -4px; left: 0; right: 0; height: 6px; background: #1a0e00; border-radius: 0 0 8px 8px; }

.book-item { cursor: pointer; perspective: 1000px; }
.cover-wrap { transition: transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275); }

/* Modal Styles - Shared with BookshelfView but tailored */
.modal-overlay { position: fixed; inset: 0; z-index: 500; background: rgba(5, 2, 1, 0.9); backdrop-filter: blur(16px); display: flex; align-items: center; justify-content: center; padding: 1rem; }
.modal-parchment { position: relative; width: 100%; max-width: 500px; background: linear-gradient(145deg, #2a1800 0%, #1a0f05 100%); border: 1px solid rgba(212, 175, 55, 0.25); border-radius: 1.5rem; padding: 2.5rem; box-shadow: 0 50px 100px rgba(0,0,0,0.9); }
.modal-close { position: absolute; top: 1.25rem; right: 1.25rem; color: rgba(212, 175, 55, 0.4); cursor: pointer; transition: color 0.2s; }
.modal-close:hover { color: #D4AF37; }
.modal-header { display: flex; gap: 2rem; align-items: flex-start; }
.modal-cover { width: 100px; height: 150px; object-fit: cover; border-radius: 8px; box-shadow: 0 15px 40px rgba(0,0,0,0.8); border: 1px solid rgba(212, 175, 55, 0.2); }
.modal-title { font-size: 1.5rem; font-weight: 800; color: #E8D5A0; font-family: 'Playfair Display', serif; margin: 0.5rem 0; }
.modal-author { font-size: 0.9rem; color: rgba(200, 170, 100, 0.6); font-style: italic; }
.modal-status-badge { display: inline-flex; align-items: center; gap: 0.5rem; font-size: 0.7rem; font-weight: 800; border: 1px solid; border-radius: 100px; padding: 0.25rem 0.75rem; }
.subject-tag { font-size: 0.65rem; font-weight: 700; padding: 0.25rem 0.75rem; border-radius: 100px; background: rgba(212, 175, 55, 0.1); color: rgba(212, 175, 55, 0.7); border: 1px solid rgba(212, 175, 55, 0.2); margin-top: 0.5rem; display: inline-block; }
.parchment-divider { text-align: center; margin: 1.5rem 0; color: rgba(212, 175, 55, 0.3); }
.stats-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem; }
.stat-cell { background: rgba(255,255,255,0.02); border: 1px solid rgba(212, 175, 55, 0.1); border-radius: 1rem; padding: 1rem; text-align: center; }
.stat-icon { width: 1.25rem; height: 1.25rem; margin: 0 auto 0.5rem; color: rgba(212, 175, 55, 0.4); }
.stat-label { font-size: 0.6rem; text-transform: uppercase; letter-spacing: 0.1em; color: rgba(200, 170, 100, 0.4); font-weight: 700; }
.stat-value { font-size: 0.9rem; font-weight: 800; color: #D4B896; margin-top: 0.25rem; }
.modal-actions { display: flex; gap: 1rem; margin-top: 1.5rem; }
.btn-secondary { flex: 1; padding: 1rem; border-radius: 1rem; background: rgba(255,255,255,0.04); border: 1px solid rgba(212, 175, 55, 0.15); color: rgba(212, 175, 55, 0.6); font-weight: 700; cursor: pointer; }
.btn-primary { flex: 2; display: flex; align-items: center; justify-content: center; gap: 0.5rem; padding: 1rem; border-radius: 1rem; background: linear-gradient(135deg, #8B1A1A, #6B0D0D); color: #F0C040; font-weight: 800; text-decoration: none; box-shadow: 0 10px 30px rgba(139, 26, 26, 0.4); }
.modal-fade-enter-active { animation: modalIn 0.4s ease-out; }
@keyframes modalIn { from { opacity: 0; transform: scale(0.9) translateY(20px); } to { opacity: 1; transform: scale(1) translateY(0); } }
</style>
