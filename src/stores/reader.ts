import { defineStore } from 'pinia'
import { useLibraryStore } from './library'
import { useAuthStore } from './auth'
import {
  extractChapterText,
  tokenizeWords,
  tokenizeChars,
  tokenizeSentences,
  type ExtractedChapter,
  type WordToken,
  type CharToken,
  type CharStatus,
  type SentenceToken,
} from '@/lib/textExtractor'

export type ReadingMode = 'standard' | 'typing' | 'paced'

export interface SessionStats {
  totalKeystrokes: number
  correctKeystrokes: number
  errorKeystrokes: number
  startTime: number | null
  elapsedMs: number
  currentWpm: number
  accuracy: number
  peakWpm: number
}

export interface SpineItem {
  index: number
  label: string
  href: string
}

function createEmptyStats(): SessionStats {
  return {
    totalKeystrokes: 0,
    correctKeystrokes: 0,
    errorKeystrokes: 0,
    startTime: null,
    elapsedMs: 0,
    currentWpm: 0,
    accuracy: 100,
    peakWpm: 0,
  }
}

export const useReaderStore = defineStore('reader', {
  state: () => ({
    // Mode
    activeMode: 'standard' as ReadingMode,

    // Book reference
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    bookInstance: null as any,
    bookId: '',

    // Chapter data
    currentSpineIndex: 0,
    spineItems: [] as SpineItem[],
    chapterData: null as ExtractedChapter | null,

    // Typing mode state
    charTokens: [] as CharToken[],
    currentCharIndex: 0,
    isTypingError: false,

    // Paced mode state
    wordTokens: [] as WordToken[],
    sentences: [] as SentenceToken[],
    currentWordIndex: 0,
    currentSentenceIndex: 0,
    targetWpm: 250,
    isPlaying: false,
    pacedTimerId: null as ReturnType<typeof setInterval> | null,
    isSpeedReadOverlayOpen: false,
    lastVisibleText: '',

    // Analytics
    sessionStats: createEmptyStats(),
    wpmHistory: [] as { time: number; wpm: number }[],
    wpmSampleTimerId: null as ReturnType<typeof setInterval> | null,
    errorMap: {} as Record<string, { total: number; errors: number }>,

    // UI state
    chapterProgress: 0,
    estimatedTimeRemaining: '',
    showAnalyticsModal: false,
    isExtracting: false,
  }),

  getters: {
    totalChapters(state): number {
      return state.spineItems.length
    },
    chapterTitle(state): string {
      return state.chapterData?.title || `Chapter ${state.currentSpineIndex + 1}`
    },
    problemKeys(state): string[] {
      const threshold = 0.15 // 15% error rate
      return Object.entries(state.errorMap)
        .filter(([, stats]) => stats.total >= 5 && stats.errors / stats.total > threshold)
        .sort((a, b) => (b[1].errors / b[1].total) - (a[1].errors / a[1].total))
        .map(([key]) => key)
        .slice(0, 10)
    },
  },

  actions: {
    // ─── INITIALIZATION ─────────────────────────────────────────
    async initBook(book: any, bookId: string) {
      this.bookInstance = book
      this.bookId = bookId
      
      // Build spine item list
      const items: SpineItem[] = []
      book.spine.each((section: any, index: number) => {
        items.push({
          index,
          label: section.label || `Section ${index + 1}`,
          href: section.href || '',
        })
      })
      this.spineItems = items
    },

    // ─── MODE SWITCHING ─────────────────────────────────────────
    async setMode(mode: ReadingMode) {
      // Cleanup current mode
      this.stopPacedReading()
      this.stopWpmSampling()

      this.activeMode = mode
      
      if (mode !== 'standard' && this.bookInstance) {
        await this.extractCurrentChapter()
      }

      if (mode === 'typing') {
        this.resetTypingState()
        this.startWpmSampling()
      } else if (mode === 'paced') {
        this.resetPacedState()
      }
    },

    // ─── TEXT EXTRACTION ────────────────────────────────────────
    async extractCurrentChapter() {
      if (!this.bookInstance) return

      this.isExtracting = true
      try {
        this.chapterData = await extractChapterText(this.bookInstance, this.currentSpineIndex)

        if (this.chapterData) {
          this.wordTokens = tokenizeWords(this.chapterData.paragraphs)
          this.charTokens = tokenizeChars(this.chapterData.paragraphs)
          this.sentences = tokenizeSentences(this.chapterData.paragraphs)
          
          // Synthesis will be handled by PuterStore in the component
        }
      } catch (e) {
        console.error('Failed to extract chapter text:', e)
      } finally {
        this.isExtracting = false
      }
    },

    // ─── CHAPTER NAVIGATION ─────────────────────────────────────
    async goToChapter(index: number) {
      if (index < 0 || index >= this.spineItems.length) return

      // Save current session stats before moving
      if (this.activeMode !== 'standard') {
        await this.saveSessionToAppwrite()
      }

      this.currentSpineIndex = index
      this.resetSessionStats()
      this.showAnalyticsModal = false

      if (this.activeMode !== 'standard') {
        await this.extractCurrentChapter()
        if (this.activeMode === 'typing') {
          this.resetTypingState()
          this.startWpmSampling()
        } else if (this.activeMode === 'paced') {
          this.resetPacedState()
        }
      }
    },

    async nextChapter() {
      await this.goToChapter(this.currentSpineIndex + 1)
    },

    async prevChapter() {
      await this.goToChapter(this.currentSpineIndex - 1)
    },

    // ─── TYPING ENGINE ──────────────────────────────────────────
    resetTypingState() {
      this.currentCharIndex = 0
      this.isTypingError = false
      this.charTokens = this.charTokens.map(t => ({ ...t, status: 'pending' as CharStatus }))
      this.resetSessionStats()
    },

    handleKeystroke(event: KeyboardEvent) {
      if (this.activeMode !== 'typing') return
      if (this.currentCharIndex >= this.charTokens.length) return

      // Ignore meta keys
      const ignoredKeys = ['Shift', 'Control', 'Alt', 'Meta', 'CapsLock', 'Tab', 'Escape',
        'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Home', 'End',
        'PageUp', 'PageDown', 'Insert', 'Delete', 'F1', 'F2', 'F3', 'F4',
        'F5', 'F6', 'F7', 'F8', 'F9', 'F10', 'F11', 'F12']
      if (ignoredKeys.includes(event.key)) return

      event.preventDefault()

      // Start timer on first keystroke
      if (this.sessionStats.startTime === null) {
        this.sessionStats.startTime = Date.now()
      }

      const currentToken = this.charTokens[this.currentCharIndex]

      // Handle backspace — correct an error
      if (event.key === 'Backspace') {
        if (this.isTypingError) {
          this.isTypingError = false
          currentToken.status = 'pending'
        }
        return
      }

      // If currently in error state, don't advance
      if (this.isTypingError) return

      this.sessionStats.totalKeystrokes++

      // Track key accuracy
      const expectedChar = currentToken.isNewline ? 'Enter' : currentToken.char
      // const typedKey = currentToken.isNewline ? event.key : event.key

      if (!this.errorMap[expectedChar]) {
        this.errorMap[expectedChar] = { total: 0, errors: 0 }
      }
      this.errorMap[expectedChar].total++

      // Check correctness
      let isCorrect = false
      if (currentToken.isNewline) {
        isCorrect = event.key === 'Enter' || event.key === ' '
      } else {
        isCorrect = event.key === currentToken.char
      }

      if (isCorrect) {
        currentToken.status = 'correct'
        this.sessionStats.correctKeystrokes++
        this.currentCharIndex++
        this.updateTypingProgress()

        // Check if chapter complete
        if (this.currentCharIndex >= this.charTokens.length) {
          this.onChapterComplete()
        }
      } else {
        currentToken.status = 'error'
        this.isTypingError = true
        this.sessionStats.errorKeystrokes++
        this.errorMap[expectedChar].errors++
      }

      // Update accuracy
      this.sessionStats.accuracy = this.sessionStats.totalKeystrokes > 0
        ? Math.round((this.sessionStats.correctKeystrokes / this.sessionStats.totalKeystrokes) * 1000) / 10
        : 100
    },

    updateTypingProgress() {
      if (this.charTokens.length > 0) {
        this.chapterProgress = Math.round((this.currentCharIndex / this.charTokens.length) * 100)
      }

      // Estimate time remaining based on current WPM
      if (this.sessionStats.currentWpm > 0 && this.chapterData) {
        const wordsTyped = this.charTokens
          .slice(0, this.currentCharIndex)
          .filter(t => t.char === ' ' || t.isNewline).length
        const wordsRemaining = (this.chapterData.wordCount || 0) - wordsTyped
        const minutesRemaining = wordsRemaining / this.sessionStats.currentWpm
        this.estimatedTimeRemaining = formatTime(minutesRemaining)
      }
    },

    // ─── PACED READING ENGINE ───────────────────────────────────
    resetPacedState() {
      this.stopPacedReading()
      this.currentWordIndex = 0
      this.chapterProgress = 0
      this.resetSessionStats()
    },

    startPacedReading() {
      if (this.isPlaying) return

      // Guard: don't start if there's nothing to read
      if (this.wordTokens.length === 0) {
        console.warn('No word tokens to read — skipping playback.')
        return
      }

      this.isPlaying = true

      if (this.sessionStats.startTime === null) {
        this.sessionStats.startTime = Date.now()
      }

      // Visual pacing logic is now handled in the component
      // for more precise UI synchronization, but we'll maintain the store's
      // isPlaying state for global control.
    },

    stopPacedReading() {
      this.isPlaying = false
      if (this.pacedTimerId) {
        clearInterval(this.pacedTimerId)
        this.pacedTimerId = null
      }
    },

    togglePacedReading() {
      if (this.isPlaying) {
        this.stopPacedReading()
      } else {
        this.startPacedReading()
      }
    },

    skipWord(delta: number) {
      const newIndex = Math.max(0, Math.min(this.currentWordIndex + delta, this.wordTokens.length - 1))
      this.currentWordIndex = newIndex
      this.updatePacedProgress()
    },

    setTargetWpm(wpm: number) {
      this.targetWpm = Math.max(50, Math.min(1000, wpm))
    },

    updatePacedProgress() {
      if (this.wordTokens.length > 0) {
        this.chapterProgress = Math.round((this.currentWordIndex / this.wordTokens.length) * 100)
      }

      // Time estimate
      const wordsRemaining = this.wordTokens.length - this.currentWordIndex
      const minutesRemaining = wordsRemaining / this.targetWpm
      this.estimatedTimeRemaining = formatTime(minutesRemaining)

      // Update WPM stat for paced = just target
      this.sessionStats.currentWpm = this.targetWpm
    },

    // ─── WPM SAMPLING ───────────────────────────────────────────
    startWpmSampling() {
      this.stopWpmSampling()
      this.wpmSampleTimerId = setInterval(() => {
        this.sampleWpm()
      }, 2000)
    },

    stopWpmSampling() {
      if (this.wpmSampleTimerId) {
        clearInterval(this.wpmSampleTimerId)
        this.wpmSampleTimerId = null
      }
    },

    sampleWpm() {
      if (!this.sessionStats.startTime) return

      const elapsed = Date.now() - this.sessionStats.startTime
      this.sessionStats.elapsedMs = elapsed

      if (elapsed < 1000) return

      // Count words typed (based on spaces typed)
      const spacesTyped = this.charTokens
        .slice(0, this.currentCharIndex)
        .filter(t => t.char === ' ' || t.isNewline).length
      const wordsTyped = spacesTyped + (this.currentCharIndex > 0 ? 1 : 0)

      const minutes = elapsed / 60000
      const wpm = Math.round(wordsTyped / minutes)

      this.sessionStats.currentWpm = wpm
      if (wpm > this.sessionStats.peakWpm) {
        this.sessionStats.peakWpm = wpm
      }

      // Record history point
      this.wpmHistory.push({
        time: Math.round(elapsed / 1000),
        wpm,
      })
    },

    // ─── SESSION MANAGEMENT ─────────────────────────────────────
    resetSessionStats() {
      this.sessionStats = createEmptyStats()
      this.wpmHistory = []
      this.errorMap = {}
      this.chapterProgress = 0
      this.estimatedTimeRemaining = ''
    },

    async onChapterComplete() {
      // Guard: only show completion if a meaningful reading session occurred
      const minReadingTime = 2000 // 2 seconds
      const minWordsRead = 5
      
      const sessionDuration = Date.now() - (this.sessionStats.startTime || Date.now())
      const wordsRead = this.activeMode === 'typing' ? this.currentCharIndex / 5 : this.currentWordIndex

      if (sessionDuration < minReadingTime || wordsRead < minWordsRead) {
        this.stopPacedReading()
        this.stopWpmSampling()
        return
      }

      this.stopPacedReading()
      this.stopWpmSampling()

      // Final WPM sample
      this.sampleWpm()

      this.chapterProgress = 100
      this.showAnalyticsModal = true

      await this.saveSessionToAppwrite()
    },

    async saveSessionToAppwrite() {
      try {
        const library = useLibraryStore()
        const auth = useAuthStore()
        if (!auth.user || !this.bookId) return

        const sessionData: Record<string, any> = {
          mode_preference: this.activeMode,
          target_read_wpm: this.targetWpm,
        }

        if (this.activeMode === 'typing') {
          sessionData.avg_type_wpm = this.sessionStats.currentWpm
          sessionData.avg_accuracy = this.sessionStats.accuracy
          sessionData.problem_keys = this.problemKeys
        }

        await library.updateProgress(
          this.bookId,
          `spine-${this.currentSpineIndex}`,
          0,
          sessionData,
        )
      } catch (e) {
        console.error('Failed to save session to Appwrite:', e)
      }
    },

    toggleSpeedReadOverlay() {
      this.isSpeedReadOverlayOpen = !this.isSpeedReadOverlayOpen
      
      if (this.isSpeedReadOverlayOpen) {
        // Automatically start focus session with the last known visible text
        if (this.lastVisibleText && this.lastVisibleText.trim().length > 0) {
          this.startFocusSession(this.lastVisibleText)
        }
        this.isPlaying = true
      } else {
        this.stopPacedReading()
      }
    },

    startFocusSession(text: string) {
      if (!text) return
      // Split text into paragraphs to match tokenizer requirements
      const paragraphs = text.split(/\n+/).filter(p => p.trim().length > 0)
      
      this.wordTokens = tokenizeWords(paragraphs)
      this.sentences = tokenizeSentences(paragraphs)
      this.currentWordIndex = 0
      this.currentSentenceIndex = 0
    },

    setLastVisibleText(text: string) {
      if (!text) return
      this.lastVisibleText = text
      
      // If Focus Mode is already open, instantly refresh the session with the new page text
      if (this.isSpeedReadOverlayOpen) {
        this.startFocusSession(text)
      }
    },

    // ─── Seamless Handoff Logic ──────────────────────────────
    syncSpeedReadToCfi(cfi: string) {
      if (!this.wordTokens.length) return
      console.log(`Syncing Speed Read to CFI: ${cfi}`)
      
      // Simple implementation: Reset to start of current chapter tokens
      this.currentWordIndex = 0
      this.currentSentenceIndex = 0
    },

    // ─── Puter.js Helpers Removed ────────────────────────────


    // ─── CLEANUP ────────────────────────────────────────────────
    cleanup() {
      this.stopPacedReading()
      this.stopWpmSampling()
      
      this.bookInstance = null
      this.chapterData = null
      this.charTokens = []
      this.wordTokens = []
      this.spineItems = []
      this.resetSessionStats()
    },

  },
})

// ─── HELPERS ──────────────────────────────────────────────────────
function formatTime(minutes: number): string {
  if (!isFinite(minutes) || minutes <= 0) return '< 1 min'
  if (minutes < 1) return '< 1 min'
  if (minutes < 60) return `~${Math.ceil(minutes)} min`
  const hrs = Math.floor(minutes / 60)
  const mins = Math.round(minutes % 60)
  return `~${hrs}h ${mins}m`
}
