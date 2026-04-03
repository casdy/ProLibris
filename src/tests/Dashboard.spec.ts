import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import DashboardView from '@/views/DashboardView.vue'
import BookCard from '@/components/BookCard.vue'
import { createPinia, setActivePinia } from 'pinia'
import { useAuthStore } from '@/stores/auth'

// Mock Lucide icons
vi.mock('lucide-vue-next', () => ({
  BookOpen: { render: () => 'BookOpen' },
  Flame: { render: () => 'Flame' },
  Sparkles: { render: () => 'Sparkles' },
  LogOut: { render: () => 'LogOut' },
  ChevronRight: { render: () => 'ChevronRight' },
  Moon: { render: () => 'Moon' },
  Sun: { render: () => 'Sun' },
  Search: { render: () => 'Search' },
  X: { render: () => 'X' },
  Library: { render: () => 'Library' },
  CheckCircle2: { render: () => 'CheckCircle2' },
  Filter: { render: () => 'Filter' }
}))

// Mock AppLogo
vi.mock('@/components/AppLogo.vue', () => ({
  default: { render: () => 'AppLogo' }
}))

// Mock Composables
vi.mock('@/composables/useBookCatalog', () => ({
  useBookCatalog: () => ({
    filters: { search: '', sort: 'popular', topic: '' },
    books: { value: [] as any[] },
    isLoading: { value: false },
    totalCount: { value: 0 },
    totalPages: { value: 0 },
    currentPage: { value: 1 },
    updateFilters: vi.fn(),
    fetchBooks: vi.fn()
  })
}))

// Mock Library Store
vi.mock('@/stores/library', () => ({
  useLibraryStore: () => ({
    fetchBooks: vi.fn(),
    fetchUserSessions: vi.fn(),
    sessions: [],
    continueReadingBook: null
  })
}))

describe('DashboardView and BookCard', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    const auth = useAuthStore()
    // @ts-expect-error Mocking User
    auth.user = { name: 'Test User', $id: 'u1' }
    vi.stubGlobal('fetch', vi.fn())
  })

  // Test Case 2: Mobile Filter Drawer
  it('toggles the mobile filter drawer when the filter icon is clicked', async () => {
    const wrapper = mount(DashboardView, {
      global: {
        stubs: ['router-link', 'router-view', 'BookshelfView', 'BookstoreView', 'StatsCard', 'BookPagination']
      }
    })

    // Filter icon is in the FAB (button with Filter icon)
    // On mobile, the FAB is visible if activeTab === 'discover'
    expect(wrapper.find('.animate-slide-up').exists()).toBe(false)
    
    const fab = wrapper.find('button.md\\:hidden.fixed.bottom-8')
    await fab.trigger('click')
    
    // The drawer is Teleported to body
    expect((wrapper.vm as any).isFilterDrawerOpen).toBe(true)
  })

  // Test Case 3: Local Badge
  it('renders a "Local" badge on book cards where isLocal is true', () => {
    const localBook = {
      id: 1, $id: 'l1', title: 'L', author: 'A', cover_url: '', subjects: [], 
      isLocal: true, appwriteDocumentId: 'l1', appwriteFileId: 'f1'
    }
    const remoteBook = {
       id: 2, $id: 'r1', title: 'R', author: 'A', cover_url: '', subjects: [], 
       isLocal: false, appwriteDocumentId: null, appwriteFileId: null
    }

    const localWrapper = mount(BookCard, {
      props: { book: localBook },
      global: { stubs: ['router-link'] }
    })
    expect(localWrapper.text()).toContain('Local')
    expect(localWrapper.text()).not.toContain('Public')

    const remoteWrapper = mount(BookCard, {
      props: { book: remoteBook as any },
      global: { stubs: ['router-link'] }
    })
    expect(remoteWrapper.text()).toContain('Public')
    expect(remoteWrapper.text()).not.toContain('Local')
  })
})
