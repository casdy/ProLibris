import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useReaderStore } from './reader'
import { useLibraryStore } from './library'

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
const mockUser = { $id: 'user123' }
vi.mock('./auth', () => ({
  useAuthStore: vi.fn(() => ({ user: mockUser }))
}))

export const mockUpdateProgress = vi.fn()
vi.mock('./library', () => ({
  useLibraryStore: vi.fn(() => ({ updateProgress: mockUpdateProgress }))
}))

// Mock the TTS worker
const mockWorker = {
  postMessage: vi.fn(),
  terminate: vi.fn(),
  onmessage: null
}

vi.stubGlobal('Worker', vi.fn(() => mockWorker))

// Mock AudioContext
const mockAudioContext = {
  state: 'running',
  resume: vi.fn().mockResolvedValue(undefined),
  createBuffer: vi.fn().mockReturnValue({ duration: 10 }),
  createBufferSource: vi.fn(() => ({
    buffer: null,
    playbackRate: { value: 1 },
    connect: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
    onended: null
  })),
  currentTime: 0,
  destination: {}
}
vi.stubGlobal('AudioContext', vi.fn(() => mockAudioContext))
vi.stubGlobal('webkitAudioContext', vi.fn(() => mockAudioContext))

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
    expect(store.audioMode).toBe(true)
  })

  it('can set mode and auto-initializes TTS when setting to paced', async () => {
    const store = useReaderStore()
    // Mock the initTTS
    const initSpy = vi.spyOn(store, 'initTTS')
    
    await store.setMode('paced')
    
    expect(store.activeMode).toBe('paced')
    expect(initSpy).toHaveBeenCalled()
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

  it('guards against empty word tokens in visual paced mode', () => {
    const store = useReaderStore()
    store.audioMode = false
    store.wordTokens = []
    
    store.startPacedReading()
    
    // Should immediately return
    expect(store.isPlaying).toBe(false)
  })

  it('runs timer efficiently in visual paced mode', () => {
    const store = useReaderStore()
    store.audioMode = false
    store.targetWpm = 600 // 10 words per sec = 100ms per word
    store.wordTokens = [
      { word: 'Word1', index: 0, paragraphIndex: 0 },
      { word: 'Word2', index: 1, paragraphIndex: 0 },
      { word: 'Word3', index: 2, paragraphIndex: 0 },
    ]
    
    store.startPacedReading()
    
    expect(store.isPlaying).toBe(true)
    
    vi.advanceTimersByTime(110) // +100ms
    expect(store.currentWordIndex).toBe(1)
    
    vi.advanceTimersByTime(100) // +100ms
    expect(store.currentWordIndex).toBe(2)
  })

  it('guards against empty sentences in audio paced mode', async () => {
    const store = useReaderStore()
    store.audioMode = true
    store.sentences = []
    
    await store.startAudioPacedPlayback()
    
    expect(store.isPlaying).toBe(false)
  })

  it('handles completion correctly without triggering immediately', async () => {
    const store = useReaderStore()
    store.currentWordIndex = 0
    store.currentCharIndex = 0
    
    // if no text was read, it shouldn't show analytics
    await store.onChapterComplete()
    expect(store.showAnalyticsModal).toBe(false)
    
    // if text was read
    store.bookId = 'valid_id'
    store.currentWordIndex = 5
    await store.onChapterComplete()
    expect(store.showAnalyticsModal).toBe(true)
    
    // Verify saveSessionToAppwrite was called via library updateProgress
    expect(mockUpdateProgress).toHaveBeenCalled()
  })
})
