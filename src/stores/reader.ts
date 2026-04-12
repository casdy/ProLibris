import { defineStore } from 'pinia'
import { ref, computed, shallowRef, markRaw } from 'vue'
import { useLibraryStore } from './library'
import { useAuthStore } from './auth'
import { tokenizeWords, tokenizeChars, tokenizeSentences } from '@/lib/textExtractor'
import type { WordToken, CharToken, CharStatus, SentenceToken } from '@/lib/textExtractor'
import { marked } from 'marked'

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

export interface Chapter {
  title: string
  content: string
  index: number
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

function formatTime(minutes: number): string {
  if (!isFinite(minutes) || minutes <= 0) return '< 1 min'
  if (minutes < 1) return '< 1 min'
  if (minutes < 60) return `~${Math.ceil(minutes)} min`
  const hrs = Math.floor(minutes / 60)
  const mins = Math.round(minutes % 60)
  return `~${hrs}h ${mins}m`
}

export const useReaderStore = defineStore('reader', () => {
  // ─── STATE ──────────────────────────────────────────────────
  const activeMode = ref<ReadingMode>('standard')
  const bookId = ref('')
  const markdownRaw = ref('')
  const chapters = shallowRef<Chapter[]>([])
  const currentChapterIndex = ref(0)

  const charTokens = shallowRef<CharToken[]>([])
  const currentCharIndex = ref(0)
  const isTypingError = ref(false)

  const wordTokens = shallowRef<WordToken[]>([])
  const sentences = shallowRef<SentenceToken[]>([])
  const currentWordIndex = ref(0)
  const currentSentenceIndex = ref(0)
  const targetWpm = ref(250)
  const isPlaying = ref(false)
  const pacedTimerId = ref<ReturnType<typeof setInterval> | null>(null)
  const isSpeedReadOverlayOpen = ref(false)
  const lastVisibleText = ref('')

  const sessionStats = ref<SessionStats>(createEmptyStats())
  const wpmHistory = ref<{ time: number; wpm: number }[]>([])
  const wpmSampleTimerId = ref<ReturnType<typeof setInterval> | null>(null)
  const errorMap = ref<Record<string, { total: number; errors: number }>>({})

  const chapterProgress = ref(0)
  const estimatedTimeRemaining = ref('')
  const showAnalyticsModal = ref(false)
  const isExtracting = ref(false)
  const chapterData = shallowRef<any>(null)

  // ─── GETTERS ────────────────────────────────────────────────
  const totalChapters = computed(() => chapters.value.length)
  const chapterTitle = computed(() => chapters.value[currentChapterIndex.value]?.title || `Chapter ${currentChapterIndex.value + 1}`)
  const currentChapterContent = computed(() => chapters.value[currentChapterIndex.value]?.content || '')
  
  const problemKeys = computed(() => {
    const threshold = 0.15
    return Object.entries(errorMap.value)
      .filter(([, stats]) => stats.total >= 5 && stats.errors / stats.total > threshold)
      .sort((a, b) => (b[1].errors / b[1].total) - (a[1].errors / a[1].total))
      .map(([key]) => key)
      .slice(0, 10)
  })

  // ─── ACTIONS ────────────────────────────────────────────────
  
  async function initBook(markdown: string, id: string) {
    markdownRaw.value = markdown
    bookId.value = id
    
    const chaptersList: Chapter[] = []
    const lines = markdown.split('\n')
    let currentChapter: Chapter | null = null
    let chapterContent: string[] = []

    lines.forEach((line) => {
      const hMatch = line.match(/^(#{1,2})\s+(.+)$/)
      if (hMatch) {
        if (currentChapter) {
          currentChapter.content = chapterContent.join('\n')
          chaptersList.push(currentChapter)
        }
        currentChapter = {
          title: hMatch[2].trim(),
          content: '',
          index: chaptersList.length
        }
        chapterContent = [line]
      } else {
        if (!currentChapter) {
          currentChapter = {
            title: 'Introduction',
            content: '',
            index: 0
          }
        }
        chapterContent.push(line)
      }
    })

    if (currentChapter) {
      currentChapter.content = chapterContent.join('\n')
      chaptersList.push(currentChapter)
    }

    chapters.value = chaptersList // shallowRef only tracks this assignment
    currentChapterIndex.value = 0
  }

  async function setMode(mode: ReadingMode) {
    stopPacedReading()
    stopWpmSampling()

    activeMode.value = mode
    
    if (mode !== 'standard') {
      await extractCurrentChapter()
    }

    if (mode === 'typing') {
      resetTypingState()
      startWpmSampling()
    } else if (mode === 'paced') {
      resetPacedState()
    }
  }

  async function extractCurrentChapter() {
    if (chapters.value.length === 0) return

    isExtracting.value = true
    try {
      const content = currentChapterContent.value
      const tokens = marked.lexer(content)
      const paragraphs = tokens
        .filter(t => t.type === 'paragraph' || t.type === 'heading' || t.type === 'text')
        .map(t => {
          const text = (t as any).text || ''
          return text.replace(/[*_~`\[\]()]/g, '')
        })
        .filter(p => p.trim().length > 0)

      wordTokens.value = tokenizeWords(paragraphs)
      charTokens.value = tokenizeChars(paragraphs).map(t => ({ ...t, status: 'pending' as CharStatus }))
      sentences.value = tokenizeSentences(paragraphs)
      
      chapterData.value = {
        title: chapterTitle.value,
        content: content,
        paragraphs: paragraphs,
        sentences: sentences.value,
        wordCount: wordTokens.value.length,
        charCount: charTokens.value.length,
        plainText: paragraphs.join('\n\n')
      }
    } catch (e) {
      console.error('Failed to extract chapter text:', e)
    } finally {
      isExtracting.value = false
    }
  }

  async function goToChapter(index: number) {
    if (index < 0 || index >= chapters.value.length) return

    const wasPlaying = isPlaying.value

    if (activeMode.value !== 'standard') {
      await saveSessionToAppwrite()
    }

    currentChapterIndex.value = index
    resetSessionStats()
    showAnalyticsModal.value = false

    if (activeMode.value !== 'standard' || isSpeedReadOverlayOpen.value) {
      await extractCurrentChapter()
      
      if (activeMode.value === 'typing') {
        resetTypingState()
        startWpmSampling()
      } else if (activeMode.value === 'paced' || isSpeedReadOverlayOpen.value) {
        currentWordIndex.value = 0
        chapterProgress.value = 0
        
        if (wasPlaying) {
           isPlaying.value = true
        } else {
           stopPacedReading()
        }
      }
    }
  }

  async function nextChapter() {
    if (currentChapterIndex.value < chapters.value.length - 1) {
      await goToChapter(currentChapterIndex.value + 1)
    }
  }

  async function prevChapter() {
    if (currentChapterIndex.value > 0) {
      await goToChapter(currentChapterIndex.value - 1)
    }
  }

  function resetTypingState() {
    currentCharIndex.value = 0
    isTypingError.value = false
    charTokens.value = charTokens.value.map(t => ({ ...t, status: 'pending' as CharStatus }))
    resetSessionStats()
  }

  function handleKeystroke(event: KeyboardEvent) {
    if (activeMode.value !== 'typing') return
    if (currentCharIndex.value >= charTokens.value.length) return

    const ignoredKeys = ['Shift', 'Control', 'Alt', 'Meta', 'CapsLock', 'Tab', 'Escape',
      'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Home', 'End',
      'PageUp', 'PageDown', 'Insert', 'Delete', 'F1', 'F2', 'F3', 'F4',
      'F5', 'F6', 'F7', 'F8', 'F9', 'F10', 'F11', 'F12']
    
    if (ignoredKeys.includes(event.key)) return
    
    event.preventDefault()
    handleTypingInput(event.key)
  }

  function handleTypingInput(key: string) {
    if (activeMode.value !== 'typing') return
    if (currentCharIndex.value >= charTokens.value.length) return

    if (sessionStats.value.startTime === null) {
      sessionStats.value.startTime = Date.now()
    }

    const currentToken = charTokens.value[currentCharIndex.value]

    if (key === 'Backspace') {
      if (isTypingError.value) {
        isTypingError.value = false
        currentToken.status = 'pending'
      }
      return
    }

    if (isTypingError.value) return

    sessionStats.value.totalKeystrokes++

    const expectedChar = currentToken.isNewline ? 'Enter' : currentToken.char

    if (!errorMap.value[expectedChar]) {
      errorMap.value[expectedChar] = { total: 0, errors: 0 }
    }
    errorMap.value[expectedChar].total++

    let isCorrect = false
    if (currentToken.isNewline) {
      isCorrect = key === 'Enter' || key === ' '
    } else {
      isCorrect = key === currentToken.char
    }

    if (isCorrect) {
      currentToken.status = 'correct'
      sessionStats.value.correctKeystrokes++
      currentCharIndex.value++
      updateTypingProgress()

      if (currentCharIndex.value >= charTokens.value.length) {
        onChapterComplete()
      }
    } else {
      currentToken.status = 'error'
      isTypingError.value = true
      sessionStats.value.errorKeystrokes++
      errorMap.value[expectedChar].errors++
    }

    sessionStats.value.accuracy = sessionStats.value.totalKeystrokes > 0
      ? Math.round((sessionStats.value.correctKeystrokes / sessionStats.value.totalKeystrokes) * 1000) / 10
      : 100
  }

  function updateTypingProgress() {
    if (charTokens.value.length > 0) {
      chapterProgress.value = Math.round((currentCharIndex.value / charTokens.value.length) * 100)
    }

    if (sessionStats.value.currentWpm > 0) {
      const wordsTyped = charTokens.value
        .slice(0, currentCharIndex.value)
        .filter(t => t.char === ' ' || t.isNewline).length
      const totalWords = wordTokens.value.length
      const wordsRemaining = totalWords - wordsTyped
      const minutesRemaining = wordsRemaining / sessionStats.value.currentWpm
      estimatedTimeRemaining.value = formatTime(minutesRemaining)
    }
  }

  function resetPacedState() {
    stopPacedReading()
    currentWordIndex.value = 0
    chapterProgress.value = 0
    resetSessionStats()
  }

  function startPacedReading() {
    if (isPlaying.value) return
    if (wordTokens.value.length === 0) return

    isPlaying.value = true
    if (sessionStats.value.startTime === null) {
      sessionStats.value.startTime = Date.now()
    }
  }

  function stopPacedReading() {
    isPlaying.value = false
    if (pacedTimerId.value) {
      clearInterval(pacedTimerId.value)
      pacedTimerId.value = null
    }
  }

  function togglePacedReading() {
    if (isPlaying.value) {
      stopPacedReading()
    } else {
      startPacedReading()
    }
  }

  function skipWord(delta: number) {
    const newIndex = Math.max(0, Math.min(currentWordIndex.value + delta, wordTokens.value.length - 1))
    currentWordIndex.value = newIndex
    updatePacedProgress()
  }

  function setTargetWpm(wpm: number) {
    targetWpm.value = Math.max(50, Math.min(1000, wpm))
  }

  function updatePacedProgress() {
    if (wordTokens.value.length > 0) {
      chapterProgress.value = Math.round((currentWordIndex.value / wordTokens.value.length) * 100)
    }

    const wordsRemaining = wordTokens.value.length - currentWordIndex.value
    const minutesRemaining = wordsRemaining / targetWpm.value
    estimatedTimeRemaining.value = formatTime(minutesRemaining)
    sessionStats.value.currentWpm = targetWpm.value
  }

  function startWpmSampling() {
    stopWpmSampling()
    wpmSampleTimerId.value = setInterval(() => {
      sampleWpm()
    }, 2000)
  }

  function stopWpmSampling() {
    if (wpmSampleTimerId.value) {
      clearInterval(wpmSampleTimerId.value)
      wpmSampleTimerId.value = null
    }
  }

  function sampleWpm() {
    if (!sessionStats.value.startTime) return

    const elapsed = Date.now() - sessionStats.value.startTime
    sessionStats.value.elapsedMs = elapsed

    if (elapsed < 1000) return

    const spacesTyped = charTokens.value
      .slice(0, currentCharIndex.value)
      .filter(t => t.char === ' ' || t.isNewline).length
    const wordsTyped = spacesTyped + (currentCharIndex.value > 0 ? 1 : 0)

    const minutes = elapsed / 60000
    const wpm = Math.round(wordsTyped / minutes)

    sessionStats.value.currentWpm = wpm
    if (wpm > sessionStats.value.peakWpm) {
      sessionStats.value.peakWpm = wpm
    }

    wpmHistory.value.push({
      time: Math.round(elapsed / 1000),
      wpm,
    })
  }

  function resetSessionStats() {
    sessionStats.value = createEmptyStats()
    wpmHistory.value = []
    errorMap.value = {}
    chapterProgress.value = 0
    estimatedTimeRemaining.value = ''
  }

  async function onChapterComplete() {
    const minReadingTime = 2000 
    const minWordsRead = 5
    
    const sessionDuration = Date.now() - (sessionStats.value.startTime || Date.now())
    const wordsRead = activeMode.value === 'typing' ? currentCharIndex.value / 5 : currentWordIndex.value

    if (sessionDuration < minReadingTime || wordsRead < minWordsRead) {
      stopPacedReading()
      stopWpmSampling()
      return
    }

    stopPacedReading()
    stopWpmSampling()
    sampleWpm()

    chapterProgress.value = 100
    showAnalyticsModal.value = true

    const isLastChapter = currentChapterIndex.value === chapters.value.length - 1
    await saveSessionToAppwrite(isLastChapter ? 'completed' : 'reading')
  }

  async function saveSessionToAppwrite(statusOverride?: 'reading' | 'completed') {
    try {
      const library = useLibraryStore()
      const auth = useAuthStore()
      if (!auth.user || !bookId.value) return

      const sessionData: Record<string, unknown> = {
        mode_preference: activeMode.value,
        target_read_wpm: targetWpm.value,
      }
      
      if (statusOverride) {
        sessionData.status = statusOverride
      }

      if (activeMode.value === 'typing') {
        sessionData.avg_type_wpm = sessionStats.value.currentWpm
        sessionData.avg_accuracy = sessionStats.value.accuracy
        sessionData.problem_keys = problemKeys.value
      }

      await library.updateProgress(
        bookId.value,
        `chapter-${currentChapterIndex.value}`,
        0,
        sessionData,
      )
    } catch (e) {
      console.error('Failed to save session to Appwrite:', e)
    }
  }

  function toggleSpeedReadOverlay() {
    isSpeedReadOverlayOpen.value = !isSpeedReadOverlayOpen.value
    
    if (isSpeedReadOverlayOpen.value) {
      if (lastVisibleText.value && lastVisibleText.value.trim().length > 0) {
        startFocusSession(lastVisibleText.value)
      }
      isPlaying.value = true
    } else {
      stopPacedReading()
    }
  }

  function startFocusSession(text: string) {
    if (!text) return
    const paragraphs = text.split(/\n+/).filter(p => p.trim().length > 0)
    
    wordTokens.value = tokenizeWords(paragraphs)
    sentences.value = tokenizeSentences(paragraphs)
    currentWordIndex.value = 0
    currentSentenceIndex.value = 0
  }

  function setLastVisibleText(text: string) {
    if (!text) return
    lastVisibleText.value = text
    
    if (isSpeedReadOverlayOpen.value) {
      startFocusSession(text)
    }
  }

  function syncSpeedReadToCfi(indicator: string) {
    console.log(`Syncing Speed Read to Position: ${indicator}`)
    currentWordIndex.value = 0
    currentSentenceIndex.value = 0
  }

  function cleanup() {
    stopPacedReading()
    stopWpmSampling()
    markdownRaw.value = ''
    chapters.value = []
    charTokens.value = []
    wordTokens.value = []
    resetSessionStats()
  }

  return {
    activeMode, bookId, markdownRaw, chapters, currentChapterIndex,
    charTokens, currentCharIndex, isTypingError,
    wordTokens, sentences, currentWordIndex, currentSentenceIndex,
    targetWpm, isPlaying, pacedTimerId, isSpeedReadOverlayOpen, lastVisibleText,
    sessionStats, wpmHistory, wpmSampleTimerId, errorMap,
    chapterProgress, estimatedTimeRemaining, showAnalyticsModal, isExtracting, chapterData,
    totalChapters, chapterTitle, currentChapterContent, problemKeys,
    initBook, setMode, extractCurrentChapter, goToChapter, nextChapter, prevChapter,
    resetTypingState, handleKeystroke, handleTypingInput, updateTypingProgress,
    resetPacedState, startPacedReading, stopPacedReading, togglePacedReading, skipWord,
    setTargetWpm, updatePacedProgress, startWpmSampling, stopWpmSampling, sampleWpm,
    resetSessionStats, onChapterComplete, saveSessionToAppwrite, toggleSpeedReadOverlay,
    startFocusSession, setLastVisibleText, syncSpeedReadToCfi, cleanup
  }
})

