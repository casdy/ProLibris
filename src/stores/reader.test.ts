import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useReaderStore } from './reader'

// Mock appwrite
vi.mock('@/lib/appwrite', () => ({
  databases: {
    createDocument: vi.fn(),
    updateDocument: vi.fn(),
    listDocuments: vi.fn(() => ({ documents: [] })),
  },
  DATABASE_ID: 'db',
  SESSIONS_COLLECTION_ID: 'sessions'
}))

// Mock dependencies
vi.mock('./auth', () => ({
  useAuthStore: vi.fn(() => ({ user: { $id: 'user123' } }))
}))

vi.mock('./library', () => ({
  useLibraryStore: vi.fn(() => ({
    updateProgress: vi.fn(),
  }))
}))

describe('Reader Store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('initializes with default state', () => {
    const store = useReaderStore()
    expect(store.activeMode).toBe('standard')
    expect(store.isPlaying).toBe(false)
    expect(store.currentWordIndex).toBe(0)
    expect(store.currentCharIndex).toBe(0)
    expect(store.bookId).toBe('')
  })

  it('can set mode', async () => {
    const store = useReaderStore()
    
    await store.setMode('typing')
    expect(store.activeMode).toBe('typing')

    await store.setMode('paced')
    expect(store.activeMode).toBe('paced')

    await store.setMode('standard')
    expect(store.activeMode).toBe('standard')
  })

  it('can reset paced state', () => {
    const store = useReaderStore()
    store.currentWordIndex = 5
    store.chapterProgress = 50
    store.isPlaying = true
    
    store.resetPacedState()
    
    expect(store.currentWordIndex).toBe(0)
    expect(store.chapterProgress).toBe(0)
    expect(store.isPlaying).toBe(false)
  })

  it('guards against empty word tokens when starting paced reading', () => {
    const store = useReaderStore()
    store.wordTokens = []
    
    store.startPacedReading()
    
    expect(store.isPlaying).toBe(false)
  })

  it('startPacedReading sets isPlaying when words are available', () => {
    const store = useReaderStore()
    store.wordTokens = [
      { word: 'Word1', index: 0, paragraphIndex: 0 },
      { word: 'Word2', index: 1, paragraphIndex: 0 },
    ]
    
    store.startPacedReading()
    
    expect(store.isPlaying).toBe(true)
    expect(store.sessionStats.startTime).not.toBeNull()
  })

  it('stopPacedReading clears the playing state', () => {
    const store = useReaderStore()
    store.isPlaying = true
    
    store.stopPacedReading()
    
    expect(store.isPlaying).toBe(false)
  })

  it('handles correct typing input', () => {
    const store = useReaderStore()
    store.activeMode = 'typing'
    store.charTokens = [
      { char: 'H', index: 0, status: 'pending' as const, isNewline: false, paragraphIndex: 0 },
      { char: 'i', index: 1, status: 'pending' as const, isNewline: false, paragraphIndex: 0 },
    ]
    store.currentCharIndex = 0

    store.handleTypingInput('H')
    expect(store.charTokens[0].status).toBe('correct')
    expect(store.currentCharIndex).toBe(1)
  })

  it('handles incorrect typing input (enters error state)', () => {
    const store = useReaderStore()
    store.activeMode = 'typing'
    store.charTokens = [
      { char: 'H', index: 0, status: 'pending' as const, isNewline: false, paragraphIndex: 0 },
    ]
    store.currentCharIndex = 0

    store.handleTypingInput('x')
    expect(store.charTokens[0].status).toBe('error')
    expect(store.isTypingError).toBe(true)
    // Does NOT advance currentCharIndex on error
    expect(store.currentCharIndex).toBe(0)
  })

  it('handles backspace to clear error state', () => {
    const store = useReaderStore()
    store.activeMode = 'typing'
    store.charTokens = [
      { char: 'H', index: 0, status: 'error' as const, isNewline: false, paragraphIndex: 0 },
    ]
    store.currentCharIndex = 0
    store.isTypingError = true

    store.handleTypingInput('Backspace')
    
    expect(store.isTypingError).toBe(false)
    expect(store.charTokens[0].status).toBe('pending')
  })

  it('ignores typing input when not in typing mode', () => {
    const store = useReaderStore()
    store.activeMode = 'standard'
    store.charTokens = [
      { char: 'H', index: 0, status: 'pending' as const, isNewline: false, paragraphIndex: 0 },
    ]
    store.currentCharIndex = 0

    store.handleTypingInput('H')
    expect(store.charTokens[0].status).toBe('pending')
    expect(store.currentCharIndex).toBe(0)
  })

  it('onChapterComplete does not trigger modal without minimum reading', async () => {
    const store = useReaderStore()
    // Zero words read, zero time elapsed
    store.currentWordIndex = 0
    store.currentCharIndex = 0
    
    await store.onChapterComplete()
    expect(store.showAnalyticsModal).toBe(false)
  })

  it('onChapterComplete triggers modal after sufficient reading', async () => {
    const store = useReaderStore()
    store.bookId = 'valid_id'
    store.currentWordIndex = 10 // > minWordsRead (5)
    store.sessionStats.startTime = Date.now() - 5000 // 5 seconds elapsed (> 2s min)
    
    await store.onChapterComplete()
    expect(store.showAnalyticsModal).toBe(true)
    expect(store.chapterProgress).toBe(100)
  })

  it('resets typing state correctly', () => {
    const store = useReaderStore()
    store.currentCharIndex = 10
    store.sessionStats.totalKeystrokes = 100
    store.sessionStats.correctKeystrokes = 90
    
    store.resetTypingState()
    
    expect(store.currentCharIndex).toBe(0)
    expect(store.sessionStats.totalKeystrokes).toBe(0)
    expect(store.sessionStats.correctKeystrokes).toBe(0)
  })

  it('sets target WPM within valid range', () => {
    const store = useReaderStore()
    
    store.setTargetWpm(300)
    expect(store.targetWpm).toBe(300)
    
    // Below minimum (50)
    store.setTargetWpm(10)
    expect(store.targetWpm).toBe(50)
    
    // Above maximum (1000)
    store.setTargetWpm(2000)
    expect(store.targetWpm).toBe(1000)
  })

  it('skips words correctly', () => {
    const store = useReaderStore()
    store.wordTokens = [
      { word: 'a', index: 0, paragraphIndex: 0 },
      { word: 'b', index: 1, paragraphIndex: 0 },
      { word: 'c', index: 2, paragraphIndex: 0 },
      { word: 'd', index: 3, paragraphIndex: 0 },
      { word: 'e', index: 4, paragraphIndex: 0 },
    ]
    store.currentWordIndex = 2

    store.skipWord(2)
    expect(store.currentWordIndex).toBe(4)

    store.skipWord(-3)
    expect(store.currentWordIndex).toBe(1)

    // Should not go below 0
    store.skipWord(-10)
    expect(store.currentWordIndex).toBe(0)

    // Should not go above length - 1
    store.skipWord(100)
    expect(store.currentWordIndex).toBe(4)
  })

  it('togglePacedReading toggles the playing state', () => {
    const store = useReaderStore()
    store.wordTokens = [
      { word: 'a', index: 0, paragraphIndex: 0 },
    ]

    store.togglePacedReading()
    expect(store.isPlaying).toBe(true)

    store.togglePacedReading()
    expect(store.isPlaying).toBe(false)
  })
})
