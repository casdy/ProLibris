<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useLibraryStore } from '@/stores/library'
import { useReaderStore } from '@/stores/reader'
import { useUIStore } from '@/stores/ui'
import { storage, ASSETS_BUCKET_ID } from '@/lib/appwrite'
import ReaderLayout from '@/components/reader/ReaderLayout.vue'
import { X, Settings, Moon, Sun, Type, Loader2 } from 'lucide-vue-next'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const library = useLibraryStore()
const reader = useReaderStore()
const ui = useUIStore()

const bookId = route.params.id as string
const bookMetadata = ref(library.books.find(b => b.$id === bookId) || library.allBooks.find(b => b.$id === bookId))
const loading = ref(true)
const error = ref('')
const fontSize = ref(100)
const isDark = computed(() => ui.isDark)
const showSettings = ref(false)
const markdownContent = ref<string | null>(null)
const initialPos = ref<string | undefined>(undefined)

// Debounced save progress
let saveTimeout: ReturnType<typeof setTimeout> | null = null
interface ReaderAnalytics {
  status: 'reading' | 'completed'
  avg_type_wpm?: number
  avg_accuracy?: number
  mode_preference?: 'typing' | 'paced' | 'standard'
  target_read_wpm?: number
}

const saveProgress = (pos: string) => {
  if (saveTimeout) clearTimeout(saveTimeout)

  // Archival Analytics Synchronization
  const isLastChapter = reader.currentChapterIndex === (reader.chapters.length - 1)
  const status = isLastChapter ? 'completed' : 'reading'

  const analyticsData: ReaderAnalytics = { status }
  if (reader.activeMode === 'typing') {
    analyticsData.avg_type_wpm = Math.round(reader.sessionStats.currentWpm)
    analyticsData.avg_accuracy = Math.round(reader.sessionStats.accuracy)
    analyticsData.mode_preference = 'typing'
  } else if (reader.activeMode === 'paced') {
    analyticsData.mode_preference = 'paced'
    analyticsData.target_read_wpm = reader.targetWpm
  } else {
    analyticsData.mode_preference = 'standard'
  }

  saveTimeout = setTimeout(() => {
    library.updateProgress(bookId, pos, 1, analyticsData as unknown as Record<string, unknown>)
  }, 3000)
}

const initializeReader = async () => {
  try {
    // 1. Initial Verification & Auth Check
    await auth.refreshUser()
    if (!auth.isVerified) {
      error.value = 'Archival Access Restricted: Your identity must be verified via parchment (email) to access this tome.'
      loading.value = false
      return
    }

    // 2. Normal Local Appwrite Reading
    if (!bookMetadata.value) {
      await library.fetchBooks()
      bookMetadata.value = library.books.find(b => b.$id === bookId) ||
                           library.allBooks.find(b => b.$id === bookId)
    }

    if (!bookMetadata.value) {
      error.value = 'Book not found in database.'
      loading.value = false
      return
    }

    // 3. Download Markdown as Text from Appwrite Storage
    // Use .getFileView() for direct access or .getFileDownload() for download enforcement
    const fileUrl = storage.getFileView(ASSETS_BUCKET_ID, bookMetadata.value.markdownFileId).toString()
    console.log('Streaming archival Markdown from:', fileUrl)

    const response = await fetch(fileUrl, {
      mode: 'cors',
      credentials: 'include',
    })

    if (!response.ok) {
      error.value = `Markdown download failed (${response.status}). Archive ID: ${bookMetadata.value.markdownFileId}`
      loading.value = false
      return
    }

    const text = await response.text()
    markdownContent.value = text

    // 4. Restore progress and settings
    await library.fetchUserSessions()
    const session = library.sessions.find(s => s.book_id === bookMetadata.value?.$id || bookId)
    if (session?.progress_cfi) {
      initialPos.value = session.progress_cfi
    }
    if (session?.mode_preference) {
      reader.activeMode = session.mode_preference
    }
    if (session?.target_read_wpm) {
      reader.targetWpm = session.target_read_wpm
    }

    // 5. Initialize Reader Store
    const finalBookId = bookMetadata.value?.$id || bookId
    await reader.initBook(text, finalBookId)

    // Manifest the "Archival Touch": Update last_read_at
    await library.updateProgress(finalBookId, initialPos.value || "", 0)

    loading.value = false
  } catch (e: unknown) {
    console.error('Reader init error:', e)
    const msg = e instanceof Error ? e.message : String(e)
    error.value = `Failed to load book: ${msg}`
    loading.value = false
  }
}

const onRelocated = (cfi: string) => {
  saveProgress(cfi)
}

onMounted(initializeReader)

onUnmounted(() => {
  if (saveTimeout) clearTimeout(saveTimeout)
  reader.cleanup()
})
</script>

<template>
  <div class="h-screen flex flex-col font-outfit relative overflow-hidden transition-colors duration-300 theme-bg theme-text">
    <!-- Header -->
    <header
      class="shrink-0 p-4 flex items-center justify-between border-b transition-colors duration-300 theme-border"
    >
      <div class="flex items-center gap-4">
        <button
          @click="router.push('/dashboard')"
          class="p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-xl transition-colors"
        >
          <X class="w-6 h-6" />
        </button>
        <div class="hidden sm:block">
          <h2 class="font-bold line-clamp-1 max-w-md">{{ bookMetadata?.title }}</h2>
          <p class="text-xs opacity-60 font-medium">Archival Tome</p>
        </div>
      </div>

      <div class="flex items-center gap-2">
        <button
          @click="ui.toggleTheme()"
          class="p-2.5 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
        >
          <component :is="isDark ? Sun : Moon" class="w-5 h-5" />
        </button>
        <button
          @click="showSettings = !showSettings"
          class="p-2.5 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
        >
          <Settings class="w-5 h-5" />
        </button>
      </div>
    </header>

    <!-- Main Reader Area -->
    <main class="flex-1 relative min-h-0 theme-bg">
      <!-- Loading -->
      <div v-if="loading" class="absolute inset-0 flex flex-col items-center justify-center bg-inherit z-50">
        <div class="w-12 h-12 border-4 border-[#f02e65]/20 border-t-[#f02e65] rounded-full animate-spin mb-4" />
        <p class="font-bold opacity-60">Streaming Markdown from Appwrite Store...</p>
      </div>

      <!-- Error -->
      <div v-else-if="error" class="absolute inset-0 flex flex-col items-center justify-center bg-inherit z-50 gap-4">
        <p class="text-[#f02e65] font-bold text-lg">{{ error }}</p>
        <button
          @click="router.push('/dashboard')"
          class="px-6 py-3 bg-[#f02e65] text-white rounded-xl font-bold hover:opacity-90 transition-opacity"
        >
          Back to Dashboard
        </button>
      </div>

      <!-- Reader Layout with Markdown Rendering -->
      <ReaderLayout
        v-else-if="markdownContent"
        :markdown-content="markdownContent"
        :initial-pos="initialPos"
        :is-dark="isDark"
        :font-size="fontSize"
        @error="msg => (error = msg)"
        @relocated="onRelocated"
        @update-font-size="s => (fontSize = s)"
      />

      <!-- Catch-all fallback for unexpected blank states -->
      <div v-else class="absolute inset-0 flex flex-col items-center justify-center bg-inherit z-50 gap-4 p-8 text-center animate-pulse">
        <Loader2 class="w-10 h-10 text-[#AE0001] animate-spin mb-2" />
        <p class="font-bold theme-text opacity-80">Wait... the tome is still manifesting...</p>
        <p class="text-[10px] opacity-40 max-w-sm uppercase tracking-widest leading-relaxed">
          The ProLibris engine is preparing your private archival copy.
          If the parchment remains empty, please return to the dashboard.
        </p>
        <button
          @click="router.push('/dashboard')"
          class="mt-4 px-6 py-2 bg-black/5 dark:bg-white/5 rounded-xl text-xs font-black uppercase tracking-widest opacity-60 hover:opacity-100 transition-all border theme-border"
        >
          Return to Dashboard
        </button>
      </div>
    </main>

    <!-- Settings Overlay -->
    <transition name="slide-up">
      <div
        v-if="showSettings"
        class="absolute bottom-24 left-1/2 -translate-x-1/2 w-full max-w-md p-6 bg-white/90 dark:bg-[#19191C]/90 backdrop-blur-2xl border border-[#EBEBEF] dark:border-white/5 rounded-3xl shadow-2xl z-[100]"
      >
        <div class="flex items-center justify-between mb-8">
          <h3 class="text-xl font-bold theme-text">Reader Settings</h3>
          <button @click="showSettings = false" class="p-2 hover:bg-[#F5F5F7] dark:hover:bg-white/5 rounded-lg">
            <X class="w-5 h-5 text-[#86868B]" />
          </button>
        </div>

        <div class="space-y-8">
          <div class="space-y-4">
            <label class="flex items-center gap-2 text-sm font-bold text-[#86868B] uppercase tracking-widest">
              <Type class="w-4 h-4" />
              Font Size: {{ fontSize }}%
            </label>
            <input type="range" v-model="fontSize" min="50" max="250" step="2" class="w-full accent-[#f02e65]" />
          </div>

          <div class="grid grid-cols-2 gap-4">
            <button
              @click="ui.isDark && ui.toggleTheme()"
              :class="{ 'ring-2 ring-[#f02e65]': !isDark }"
              class="p-4 theme-bg border theme-border rounded-2xl flex items-center justify-center gap-2 font-bold transition-all theme-text"
            >
              <Sun class="w-5 h-5" /> Light
            </button>
            <button
              @click="!ui.isDark && ui.toggleTheme()"
              :class="{ 'ring-2 ring-[#f02e65]': isDark }"
              class="p-4 bg-[#f02e65] text-white rounded-2xl flex items-center justify-center gap-2 font-bold transition-all shadow-lg shadow-[#f02e65]/20"
            >
              <Moon class="w-5 h-5" /> Dark
            </button>
          </div>
        </div>
      </div>
    </transition>

    <!-- Footer -->
    <footer class="shrink-0 p-3 text-center text-[10px] uppercase font-black tracking-[0.2em] opacity-30">
      Prolibris Dynamic Rendering Engine
    </footer>
  </div>
</template>

<style scoped>
.slide-up-enter-active,
.slide-up-leave-active {
  transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}
.slide-up-enter-from,
.slide-up-leave-to {
  opacity: 0;
  transform: translate(-50%, 20px);
}
</style>
