<script setup lang="ts">
import { computed, ref } from 'vue'
import { useLibraryStore } from '@/stores/library'
import {
  X, BookOpen, Clock, Heart,
  Zap, ChevronRight, CheckCircle2, Play,
  Keyboard, Star
} from 'lucide-vue-next'

const library = useLibraryStore()

// ─── Palette ─────────────────────────────────────────────────────
const SPINE_PALETTES = [
  { bg: '#7B1515', text: '#F0C040', accent: '#D4AF37' },
  { bg: '#8B1A1A', text: '#FFD700', accent: '#C8A800' },
  { bg: '#6B0F0F', text: '#E8B84B', accent: '#B8960C' },
  { bg: '#1A3D2E', text: '#C0C0C0', accent: '#A8A9AD' },
  { bg: '#0D3B1E', text: '#B8C5B0', accent: '#8DA888' },
  { bg: '#1E4D35', text: '#D4E6D0', accent: '#9DC4A0' },
  { bg: '#0E1F4D', text: '#946B2D', accent: '#7B5B2A' },
  { bg: '#122060', text: '#CD7F32', accent: '#B5722D' },
  { bg: '#0A1535', text: '#B8860B', accent: '#A0740A' },
  { bg: '#3D2B00', text: '#F0C040', accent: '#D4A820' },
  { bg: '#2A1D00', text: '#FFC800', accent: '#E8B400' },
  { bg: '#003B6F', text: '#C8E6FF', accent: '#90C8FF' },
  { bg: '#004080', text: '#B0D6FF', accent: '#70B4FF' },
  { bg: '#002855', text: '#D4EAFF', accent: '#A0CCFF' },
  { bg: '#2D1B4E', text: '#D4B896', accent: '#B89660' },
  { bg: '#1A0A32', text: '#C8A87A', accent: '#A8885A' },
  { bg: '#3B1A6B', text: '#E8D0B0', accent: '#D4B080' },
  { bg: '#3D1F00', text: '#F0D080', accent: '#D4B060' },
  { bg: '#4A2800', text: '#E8C860', accent: '#C8A840' },
  { bg: '#2A1400', text: '#F4D890', accent: '#DCC070' },
]

function hashStr(s: string): number {
  let h = 5381
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h) ^ s.charCodeAt(i)
  return Math.abs(h)
}

function spineStyle(title: string, idx: number) {
  const h = hashStr(title + idx)
  const palette = SPINE_PALETTES[h % SPINE_PALETTES.length]
  const height = 140 + (h % 8) * 10
  const width = 24 + (h % 6) * 3
  return { palette, height, width }
}

interface ShelfEntry {
  book: {
    $id: string
    title: string
    cover_url?: string
  }
  session: {
    status?: string
    last_read_at?: string
    pages_turned?: number
    mode_preference?: string
    avg_type_wpm?: number
    avg_accuracy?: number
    is_liked?: boolean
    progress_cfi?: string
  } | undefined
  style: {
    palette: { bg: string; text: string; accent: string }
    height: number
    width: number
  }
  isLiked: boolean
  isReading: boolean
}

function getEntriesForBooks(books: { $id: string; title: string; [key: string]: unknown }[]): ShelfEntry[] {
  return books.map((book, idx) => {
    const session = library.sessions.find(s => s.book_id === book.$id)
    return {
      book,
      session,
      style: spineStyle(book.title, idx),
      isLiked: !!session?.is_liked,
      isReading: session?.status === 'reading',
    }
  })
}

// No longer chunking to allow infinite horizontal scroll per deck
const readingEntries = computed(() => {
  const books = [...library.readingBooks]
  const lastRead = library.continueReadingBook
  if (lastRead && !books.find(b => b.$id === lastRead.$id)) {
    books.unshift(lastRead)
  }
  return getEntriesForBooks(books)
})
const likedEntries   = computed(() => getEntriesForBooks(library.likedBooks))
const completedEntries = computed(() => getEntriesForBooks(library.completedBooks))

const selected = ref<ShelfEntry | null>(null)
const pulledOut = ref<string | null>(null)

function openBook(entry: ShelfEntry) {
  if (pulledOut.value === entry.book.$id) {
    selected.value = entry
    return
  }
  pulledOut.value = entry.book.$id
  setTimeout(() => { selected.value = entry }, 350)
}

function closeModal() {
  selected.value = null
  setTimeout(() => { pulledOut.value = null }, 400)
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
  reading:   '#AE0001',
  unread:    '#6b7280',
}

// ─── Horizontal Scroll Logic ─────────────────────────────────────
const scrollContainers = ref<Record<string, HTMLElement | null>>({})

function setScrollRef(key: string, el: unknown) {
  if (el) scrollContainers.value[key] = el as HTMLElement
}

function handleWheel(e: WheelEvent, key: string) {
  const el = scrollContainers.value[key]
  if (!el) return
  if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
    e.preventDefault()
    el.scrollLeft += e.deltaY * 1.5
  }
}

function scrollShelf(key: string, dir: 'left' | 'right') {
  const el = scrollContainers.value[key]
  if (!el) return
  const amount = el.clientWidth * 0.8
  el.scrollBy({
    left: dir === 'left' ? -amount : amount,
    behavior: 'smooth'
  })
}
</script>

<template>
  <div class="bookshelf-scene relative w-full min-h-[60vh] overflow-hidden select-none">
    <div class="particles-layer" aria-hidden="true">
      <div v-for="n in 18" :key="n" class="particle" :style="{
        left: `${(n * 17.3) % 100}%`,
        animationDelay: `${(n * 0.7) % 6}s`,
        animationDuration: `${5 + (n * 1.1) % 5}s`,
        width: `${2 + n % 3}px`,
        height: `${2 + n % 3}px`,
        opacity: 0.4 + (n % 3) * 0.15,
      }" />
    </div>

    <div v-if="readingEntries.length === 0 && likedEntries.length === 0 && completedEntries.length === 0" class="flex flex-col items-center justify-center py-24 text-center">
      <div class="text-6xl mb-6">📚</div>
      <p class="text-xl font-bold" style="color: #D4B896;">Your shelf awaits…</p>
      <p class="text-sm mt-2" style="color: #8B7355;">Read or like a book to place it here</p>
    </div>

    <div v-else class="shelves-container p-6 lg:p-12 space-y-16 mt-4">
      
      <!-- Deck 1: Continue Reading -->
      <section v-if="readingEntries.length > 0" class="shelf-deck">
        <h3 class="deck-title"><Play class="w-5 h-5 inline mr-2 mb-1" /> Continue Reading</h3>
        <div class="shelf-row relative group/nav">
          <!-- Navigation Buttons -->
          <button v-if="readingEntries.length > 5" @click="scrollShelf('reading', 'left')" class="nav-btn left-0 rounded-r-2xl">
            <ChevronRight class="w-5 h-5 rotate-180" />
          </button>
          <button v-if="readingEntries.length > 5" @click="scrollShelf('reading', 'right')" class="nav-btn right-0 rounded-l-2xl">
            <ChevronRight class="w-5 h-5" />
          </button>

          <div :ref="el => setScrollRef('reading', el)" @wheel="e => handleWheel(e, 'reading')" class="books-row scroll-smooth">
            <div v-for="entry in readingEntries" :key="entry.book.$id" class="book-spine-wrapper" @click="openBook(entry)" :title="entry.book.title">
              <div class="book-spine" :class="{ 'pulled-out': pulledOut === entry.book.$id }" :style="{ width: entry.style.width + 'px', height: entry.style.height + 'px', background: entry.style.palette.bg, '--accent': entry.style.palette.accent }">
                <div class="spine-highlight" />
                <div class="spine-title" :style="{ color: entry.style.palette.text }">{{ entry.book.title }}</div>
                <div class="spine-band" :style="{ background: entry.style.palette.accent }" />
                <div class="spine-glow reading-glow" />
                <div class="spine-badges">
                  <span v-if="entry.isLiked" class="spine-badge">♥</span>
                  <span class="spine-badge">▷</span>
                </div>
              </div>
            </div>
          </div>
          <div class="shelf-plank"><div class="shelf-edge" /></div>
        </div>
      </section>

      <!-- Deck 2: Enchanted Favorites (Liked) -->
      <section v-if="likedEntries.length > 0" class="shelf-deck">
        <h3 class="deck-title"><Heart class="w-5 h-5 inline mr-2 mb-1" /> Enchanted Favorites</h3>
        <div class="shelf-row relative group/nav">
          <button v-if="likedEntries.length > 5" @click="scrollShelf('liked', 'left')" class="nav-btn left-0 rounded-r-2xl">
            <ChevronRight class="w-5 h-5 rotate-180" />
          </button>
          <button v-if="likedEntries.length > 5" @click="scrollShelf('liked', 'right')" class="nav-btn right-0 rounded-l-2xl">
            <ChevronRight class="w-5 h-5" />
          </button>

          <div :ref="el => setScrollRef('liked', el)" @wheel="e => handleWheel(e, 'liked')" class="books-row scroll-smooth">
            <div v-for="entry in likedEntries" :key="entry.book.$id" class="book-spine-wrapper" @click="openBook(entry)" :title="entry.book.title">
              <div class="book-spine" :class="{ 'pulled-out': pulledOut === entry.book.$id }" :style="{ width: entry.style.width + 'px', height: entry.style.height + 'px', background: entry.style.palette.bg, '--accent': entry.style.palette.accent }">
                <div class="spine-highlight" />
                <div class="spine-title" :style="{ color: entry.style.palette.text }">{{ entry.book.title }}</div>
                <div class="spine-band" :style="{ background: entry.style.palette.accent }" />
                <div v-if="entry.isReading" class="spine-glow reading-glow" />
                <div class="spine-glow liked-glow" />
                <div class="spine-badges">
                  <span class="spine-badge">♥</span>
                  <span v-if="entry.isReading" class="spine-badge">▷</span>
                </div>
              </div>
            </div>
          </div>
          <div class="shelf-plank"><div class="shelf-edge" /></div>
        </div>
      </section>

      <!-- Deck 3: Legendary Completions (Completed) -->
      <section v-if="completedEntries.length > 0" class="shelf-deck">
        <h3 class="deck-title"><CheckCircle2 class="w-5 h-5 inline mr-2 mb-1" /> Legendary Completions</h3>
        <div class="shelf-row relative group/nav">
          <button v-if="completedEntries.length > 5" @click="scrollShelf('completed', 'left')" class="nav-btn left-0 rounded-r-2xl">
            <ChevronRight class="w-5 h-5 rotate-180" />
          </button>
          <button v-if="completedEntries.length > 5" @click="scrollShelf('completed', 'right')" class="nav-btn right-0 rounded-l-2xl">
            <ChevronRight class="w-5 h-5" />
          </button>

          <div :ref="el => setScrollRef('completed', el)" @wheel="e => handleWheel(e, 'completed')" class="books-row scroll-smooth">
            <div v-for="entry in completedEntries" :key="entry.book.$id" class="book-spine-wrapper" @click="openBook(entry)" :title="entry.book.title">
              <div class="book-spine" :class="{ 'pulled-out': pulledOut === entry.book.$id }" :style="{ width: entry.style.width + 'px', height: entry.style.height + 'px', background: entry.style.palette.bg, '--accent': entry.style.palette.accent }">
                <div class="spine-highlight" />
                <div class="spine-title" :style="{ color: entry.style.palette.text }">{{ entry.book.title }}</div>
                <div class="spine-band" :style="{ background: entry.style.palette.accent }" />
                <div class="spine-badges">
                  <span v-if="entry.isLiked" class="spine-badge">♥</span>
                  <span class="spine-badge">★</span>
                </div>
              </div>
            </div>
          </div>
          <div class="shelf-plank"><div class="shelf-edge" /></div>
        </div>
      </section>
    </div>
  </div>

  <Transition name="modal-fade">
    <div v-if="selected" class="modal-overlay" @click.self="closeModal">
      <div class="modal-parchment">
        <button @click="closeModal" class="modal-close">
          <X class="w-4 h-4" />
        </button>
        <div class="modal-header">
          <div class="modal-cover-wrap">
            <img :src="selected.book.cover_url || 'https://via.placeholder.com/120x180'" :alt="selected.book.title" class="modal-cover" />
            <div class="cover-glow" :style="{ background: selected.style.palette.bg }" />
          </div>
          <div class="modal-meta min-w-0">
            <div class="modal-status-badge" :style="{ color: statusColor[selected.session?.status || 'unread'], borderColor: statusColor[selected.session?.status || 'unread'] + '40' }">
              <CheckCircle2 class="w-3.5 h-3.5" />
              {{ (selected.session?.status || 'unread').toUpperCase() }}
            </div>
            <h2 class="modal-title line-clamp-2">{{ selected.book.title }}</h2>
            <p class="modal-author truncate">Archival Tome</p>
            <div class="modal-subjects">
              <span class="subject-tag">ProLibris Archive</span>
            </div>
          </div>
        </div>
        <div class="parchment-divider"><span>✦</span></div>
        <div class="stats-grid">
          <div class="stat-cell"><Clock class="stat-icon" /><p class="stat-label">Last Read</p><p class="stat-value">{{ formatDate(selected.session?.last_read_at) }}</p></div>
          <div class="stat-cell"><BookOpen class="stat-icon" /><p class="stat-label">Pages Turned</p><p class="stat-value">{{ selected.session?.pages_turned || 0 }}</p></div>
          <div class="stat-cell"><component :is="modeInfo(selected.session?.mode_preference).icon" class="stat-icon" :style="{ color: modeInfo(selected.session?.mode_preference).color }" /><p class="stat-label">Reading Mode</p><p class="stat-value">{{ modeInfo(selected.session?.mode_preference).label }}</p></div>
          <div class="stat-cell"><Star class="stat-icon" /><p class="stat-label">Liked</p><p class="stat-value">{{ selected.isLiked ? '♥ Yes' : '—' }}</p></div>
          <template v-if="selected.session?.avg_type_wpm">
            <div class="stat-cell"><Zap class="stat-icon" style="color:#AE0001" /><p class="stat-label">Avg WPM</p><p class="stat-value">{{ selected.session.avg_type_wpm }}</p></div>
            <div class="stat-cell"><Target class="stat-icon" style="color:#22c55e" /><p class="stat-label">Accuracy</p><p class="stat-value">{{ selected.session.avg_accuracy }}%</p></div>
          </template>
        </div>
        <div class="parchment-divider"><span>✦</span></div>
        <div class="modal-actions">
          <button @click="closeModal" class="btn-secondary">Close</button>
          <router-link :to="`/read/${selected.book.$id}`" @click="closeModal" class="btn-primary">
            <Play class="w-4 h-4 fill-current" />
            {{ selected.session?.progress_cfi ? 'Continue Reading' : 'Start Reading' }}
            <ChevronRight class="w-4 h-4" />
          </router-link>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.bookshelf-scene {
  background: radial-gradient(ellipse at 50% 0%, #1a0d05 0%, #0d0702 60%, #080402 100%);
  border-radius: 2rem;
  padding: 2rem 1rem 0;
  box-shadow: inset 0 0 120px rgba(0,0,0,0.8), 0 0 60px rgba(0,0,0,0.6);
  border: 1px solid rgba(212, 175, 55, 0.12);
}
.particles-layer { position: absolute; inset: 0; pointer-events: none; z-index: 0; overflow: hidden; }
.particle { position: absolute; bottom: 20%; border-radius: 50%; background: radial-gradient(circle, #FFD700 0%, rgba(255,200,0,0.3) 60%, transparent 100%); animation: floatUp linear infinite; }
@keyframes floatUp {
  0% { transform: translateY(0) rotate(0deg); opacity: 0; }
  10% { opacity: 0.6; }
  90% { opacity: 0.3; }
  100% { transform: translateY(-80vh) rotate(360deg); opacity: 0; }
}
.shelves-container { position: relative; z-index: 1; display: flex; flex-direction: column; }
.shelf-deck { display: flex; flex-direction: column; gap: 0; }
.deck-title { font-family: var(--font-cinzel), serif; font-size: 1.5rem; font-weight: 800; color: #D4B896; text-shadow: 0 4px 12px rgba(0,0,0,0.6); margin-bottom: 0.5rem; padding-left: 1.5rem; opacity: 0.9; letter-spacing: 0.02em; }
.shelf-row { display: flex; flex-direction: column; margin-bottom: 0; }
.nav-btn { position: absolute; top: 1.5rem; bottom: 22px; z-index: 20; width: 3.5rem; background: rgba(5, 2, 1, 0.4); backdrop-filter: blur(8px); display: flex; align-items: center; justify-content: center; color: #D4AF37; opacity: 0; transition: all 0.3s ease; border: 1px solid rgba(212, 175, 55, 0.1); cursor: pointer; }
.group\/nav:hover .nav-btn { opacity: 1; }
.nav-btn:hover { background: #8B1A1A; color: #F0C040; border-color: rgba(212, 175, 55, 0.4); }
.books-row { display: flex; align-items: flex-end; gap: 3px; padding: 0 4rem; padding-top: 1.5rem; overflow-x: auto; scrollbar-width: none; overscroll-behavior-x: contain; }
@media (max-width: 768px) {
  .books-row { padding: 0 1.5rem; }
}
.books-row::-webkit-scrollbar { display: none; }
.shelf-plank { height: 22px; background: linear-gradient(180deg, #8B5E2C 0%, #6B4420 40%, #4A2E14 70%, #3D2410 100%); box-shadow: 0 4px 16px rgba(0,0,0,0.7), 0 2px 4px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,200,100,0.15), inset 0 -1px 0 rgba(0,0,0,0.5); border-top: 1px solid rgba(220, 160, 60, 0.25); position: relative; margin: 0 0.5rem; border-radius: 0 0 4px 4px; }
.shelf-edge { position: absolute; bottom: 0; left: 0; right: 0; height: 5px; background: linear-gradient(180deg, #2A1600, #1A0E00); border-radius: 0 0 4px 4px; }
.book-spine-wrapper { cursor: pointer; display: flex; align-items: flex-end; transition: transform 0.2s ease; }
.book-spine-wrapper:hover .book-spine:not(.pulled-out) { transform: translateY(-14px); filter: brightness(1.2); }
.book-spine { position: relative; border-radius: 2px 3px 3px 2px; display: flex; flex-direction: column; align-items: center; justify-content: center; overflow: hidden; cursor: pointer; transition: transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1), filter 0.2s ease, box-shadow 0.2s ease; box-shadow: inset -2px 0 6px rgba(0,0,0,0.4), inset 2px 0 4px rgba(255,255,255,0.05), 2px 0 8px rgba(0,0,0,0.6), -1px 0 2px rgba(0,0,0,0.3); }
.book-spine.pulled-out { transform: translateY(-32px) !important; filter: brightness(1.3) !important; box-shadow: inset -2px 0 6px rgba(0,0,0,0.4), inset 2px 0 4px rgba(255,255,255,0.08), 0 20px 40px rgba(0,0,0,0.8), 0 0 30px var(--accent, #FFD700), -1px 0 2px rgba(0,0,0,0.3); }
.spine-highlight { position: absolute; top: 0; left: 0; width: 3px; height: 100%; background: linear-gradient(180deg, rgba(255,255,255,0.25) 0%, rgba(255,255,255,0.04) 100%); }
.spine-title { writing-mode: vertical-rl; text-orientation: mixed; transform: rotate(180deg); font-size: 10px; font-weight: 700; letter-spacing: 0.1em; line-height: 1.1; text-align: center; padding: 8px 4px; height: 100%; max-height: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; text-shadow: 0 1px 3px rgba(0,0,0,0.8); font-family: 'Outfit', serif; }
.spine-band { position: absolute; top: 18px; left: 0; right: 0; height: 3px; opacity: 0.6; }
.spine-glow { position: absolute; inset: 0; pointer-events: none; }
.reading-glow { box-shadow: inset 0 0 12px rgba(174, 0, 1, 0.4); animation: readingPulse 2.5s ease-in-out infinite; }
.liked-glow { box-shadow: inset 0 0 10px rgba(238, 186, 48, 0.25); }
@keyframes readingPulse { 0%, 100% { opacity: 0.5; } 50% { opacity: 1; } }
.spine-badges { position: absolute; bottom: 6px; display: flex; flex-direction: column; align-items: center; gap: 2px; }
.spine-badge { font-size: 8px; opacity: 0.8; line-height: 1; }
.modal-overlay { position: fixed; inset: 0; z-index: 500; background: rgba(5, 2, 1, 0.85); backdrop-filter: blur(12px); display: flex; align-items: center; justify-content: center; padding: 1rem; }
.modal-parchment { position: relative; width: 100%; max-width: 540px; max-height: 90vh; overflow-y: auto; background: radial-gradient(ellipse at top left, #3d2200 0%, transparent 60%), radial-gradient(ellipse at bottom right, #1a0d00 0%, transparent 60%), linear-gradient(145deg, #2a1800 0%, #1a0f05 40%, #231405 70%, #1a0d00 100%); border: 1px solid rgba(212, 175, 55, 0.3); border-radius: 1.5rem; padding: 2rem; box-shadow: 0 0 0 1px rgba(212, 175, 55, 0.1), 0 40px 80px rgba(0,0,0,0.9), 0 0 60px rgba(120, 60, 0, 0.3), inset 0 1px 0 rgba(212, 175, 55, 0.15); scrollbar-width: thin; scrollbar-color: rgba(212, 175, 55, 0.2) transparent; }
.modal-close { position: absolute; top: 1rem; right: 1rem; width: 2rem; height: 2rem; border-radius: 50%; background: rgba(255,255,255,0.05); border: 1px solid rgba(212, 175, 55, 0.2); color: rgba(212, 175, 55, 0.6); display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.2s ease; }
.modal-close:hover { background: rgba(212, 175, 55, 0.1); color: #D4AF37; }
.modal-header { display: flex; gap: 1.5rem; align-items: flex-start; margin-bottom: 1.5rem; }
.modal-cover-wrap { position: relative; flex-shrink: 0; }
.modal-cover { width: 90px; height: 130px; object-fit: cover; border-radius: 6px; box-shadow: 0 8px 30px rgba(0,0,0,0.8), 0 0 20px rgba(120,60,0,0.4); border: 1px solid rgba(212, 175, 55, 0.2); }
.cover-glow { position: absolute; inset: -4px; border-radius: 10px; opacity: 0.4; filter: blur(16px); z-index: -1; }
.modal-meta { flex: 1; min-width: 0; }
.modal-status-badge { display: inline-flex; align-items: center; gap: 0.375rem; font-size: 0.65rem; font-weight: 800; letter-spacing: 0.12em; border: 1px solid; border-radius: 100px; padding: 0.2rem 0.75rem; margin-bottom: 0.6rem; }
.modal-title { font-size: 1.2rem; font-weight: 800; line-height: 1.3; color: #E8D5A0; margin-bottom: 0.25rem; font-family: var(--font-cinzel), serif; text-shadow: 0 2px 8px rgba(0,0,0,0.6); }
.modal-author { font-size: 0.8rem; color: rgba(200, 170, 100, 0.6); font-style: italic; margin-bottom: 0.75rem; }
.modal-subjects { display: flex; flex-wrap: wrap; gap: 0.375rem; }
.subject-tag { font-size: 0.6rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; padding: 0.2rem 0.6rem; border-radius: 100px; background: rgba(212, 175, 55, 0.1); color: rgba(212, 175, 55, 0.7); border: 1px solid rgba(212, 175, 55, 0.2); }
.parchment-divider { text-align: center; margin: 1rem 0; position: relative; color: rgba(212, 175, 55, 0.4); font-size: 0.75rem; }
.parchment-divider::before, .parchment-divider::after { content: ''; position: absolute; top: 50%; width: calc(50% - 1.5rem); height: 1px; background: linear-gradient(90deg, transparent, rgba(212, 175, 55, 0.25)); }
.parchment-divider::before { left: 0; }
.parchment-divider::after { right: 0; background: linear-gradient(270deg, transparent, rgba(212, 175, 55, 0.25)); }
.stats-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 0.75rem; }
.stat-cell { background: rgba(255,255,255,0.03); border: 1px solid rgba(212, 175, 55, 0.1); border-radius: 0.875rem; padding: 0.875rem 0.75rem; display: flex; flex-direction: column; align-items: center; gap: 0.375rem; text-align: center; transition: background 0.2s ease; }
.stat-cell:hover { background: rgba(212, 175, 55, 0.05); }
.stat-icon { width: 1.125rem; height: 1.125rem; color: rgba(212, 175, 55, 0.5); }
.stat-label { font-size: 0.6rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: rgba(200, 170, 100, 0.4); }
.stat-value { font-size: 0.875rem; font-weight: 800; color: #D4B896; font-family: 'Outfit', sans-serif; }
.modal-actions { display: flex; gap: 0.75rem; margin-top: 1rem; }
.btn-secondary { flex: 1; padding: 0.875rem; border-radius: 0.875rem; font-size: 0.875rem; font-weight: 700; background: rgba(255,255,255,0.04); border: 1px solid rgba(212, 175, 55, 0.15); color: rgba(212, 175, 55, 0.6); cursor: pointer; transition: all 0.2s ease; }
.btn-secondary:hover { background: rgba(255,255,255,0.07); color: #D4AF37; }
.btn-primary { flex: 2; display: inline-flex; align-items: center; justify-content: center; gap: 0.5rem; padding: 0.875rem; border-radius: 0.875rem; font-size: 0.875rem; font-weight: 800; background: linear-gradient(135deg, #8B1A1A, #6B0D0D); border: 1px solid rgba(212, 175, 55, 0.3); color: #F0C040; text-decoration: none; cursor: pointer; transition: all 0.25s ease; box-shadow: 0 4px 20px rgba(139, 26, 26, 0.4), 0 0 30px rgba(212, 175, 55, 0.1); }
.btn-primary:hover { transform: translateY(-2px); box-shadow: 0 8px 30px rgba(139, 26, 26, 0.6), 0 0 40px rgba(212, 175, 55, 0.2); background: linear-gradient(135deg, #9B2020, #7B1010); }
.btn-primary:active { transform: translateY(0); }
.modal-fade-enter-active { animation: modalIn 0.45s cubic-bezier(0.16, 1, 0.3, 1); }
.modal-fade-leave-active { animation: modalIn 0.25s cubic-bezier(0.4, 0, 1, 1) reverse; }
@keyframes modalIn { from { opacity: 0; transform: scale(0.88) translateY(24px); } to { opacity: 1; transform: scale(1) translateY(0); } }
</style>
