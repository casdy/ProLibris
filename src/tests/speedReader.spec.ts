import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import SpeedReadEngine from '@/components/reader/SpeedReadEngine.vue'
import { createPinia, setActivePinia } from 'pinia'
import { useReaderStore } from '@/stores/reader'

// Mock Lucide icons
vi.mock('lucide-vue-next', () => ({
  Play: { render: () => 'Play' },
  Pause: { render: () => 'Pause' },
  SkipBack: { render: () => 'SkipBack' },
  SkipForward: { render: () => 'SkipForward' },
  RotateCcw: { render: () => 'RotateCcw' },
  Minus: { render: () => 'Minus' },
  Plus: { render: () => 'Plus' },
  Info: { render: () => 'Info' },
  Zap: { render: () => 'Zap' },
  Gauge: { render: () => 'Gauge' },
  X: { render: () => 'X' }
}))

describe('SpeedReadEngine Pacing Logic', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.useFakeTimers()
  })

  // Test Case 1: Math functions
  it('calculateInterval returns correct milliseconds', async () => {
    // We can't access private methods, but we can verify timings via timers
    const reader = useReaderStore()
    reader.targetWpm = 250
    reader.wordTokens = Array(10).fill({ word: 'test', index: 0 })
    reader.activeMode = 'paced'
    reader.isPlaying = true

    const wrapper = mount(SpeedReadEngine, {
      props: { fontSize: 100 }
    })

    // 60000 / 250 = 240ms
    vi.advanceTimersByTime(240)
    expect(reader.currentWordIndex).toBe(1)

    reader.targetWpm = 600
    // Re-trigger pacing (the watcher does this)
    await wrapper.vm.$nextTick()
    
    // 60000 / 600 = 100ms
    vi.advanceTimersByTime(100)
    expect(reader.currentWordIndex).toBe(2)
  })

  // Test Case 2: Pacing increments
  it('startPacing increments activeWordIndex correctly over time', async () => {
    const reader = useReaderStore()
    reader.targetWpm = 300 // 200ms per word
    reader.wordTokens = Array(10).fill({ word: 'test', index: 0 }).map((w, i) => ({ ...w, index: i }))
    reader.isPlaying = true
    reader.activeMode = 'paced'

    mount(SpeedReadEngine, {
      props: { fontSize: 100 }
    })

    vi.advanceTimersByTime(1000) // 5 words
    expect(reader.currentWordIndex).toBe(5)
  })

  // Test Case 3: Pacing pause
  it('pausePacing stops the pacing interval', async () => {
    const reader = useReaderStore()
    reader.targetWpm = 300
    reader.wordTokens = Array(10).fill({ word: 'test', index: 0 }).map((w, i) => ({ ...w, index: i }))
    reader.isPlaying = true
    reader.activeMode = 'paced'

    mount(SpeedReadEngine, {
      props: { fontSize: 100 }
    })

    vi.advanceTimersByTime(400) // 2 words
    expect(reader.currentWordIndex).toBe(2)

    reader.isPlaying = false
    vi.advanceTimersByTime(1000)
    expect(reader.currentWordIndex).toBe(2) // Should NOT increment
  })
})
