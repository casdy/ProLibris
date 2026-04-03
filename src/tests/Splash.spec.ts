import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import SplashScreen from '@/components/SplashScreen.vue'
import { createPinia, setActivePinia } from 'pinia'

// Mock AppLogo
vi.mock('@/components/AppLogo.vue', () => ({
  default: { render: () => 'AppLogo' }
}))

describe('SplashScreen', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.useFakeTimers()
  })

  // Test Case 1: SplashScreen rendering and transition
  it('renders logo on mount and transitions after initialization', async () => {
    const wrapper = mount(SplashScreen, {
      props: { isReady: false }
    })

    expect(wrapper.find('h2').text()).toContain('Prolibris')
    expect(wrapper.text()).toContain('Initializing ProLibris Engine...')

    // Finish initialization in host
    await wrapper.setProps({ isReady: true })
    
    // Advance past the min time (1200ms) + allow the 100ms interval to fire
    vi.advanceTimersByTime(1500)
    await wrapper.vm.$nextTick()
    
    // Wait for internal exit animation (600ms setTimeout)
    vi.advanceTimersByTime(700)
    await wrapper.vm.$nextTick()
    
    // In Vue Test Utils, the v-if="show" will be false now
    expect(wrapper.find('.fixed').exists()).toBe(false)
  })

  it('finishes via timeout fallback after 4 seconds', async () => {
    const wrapper = mount(SplashScreen, {
      props: { isReady: false }
    })

    expect(wrapper.find('.fixed').exists()).toBe(true)

    // Wait for safety fallback (4000ms)
    vi.advanceTimersByTime(4500)
    await wrapper.vm.$nextTick()
    
    // Wait for exit animation
    vi.advanceTimersByTime(700)
    await wrapper.vm.$nextTick()
    
    expect(wrapper.find('.fixed').exists()).toBe(false)
  })
})
