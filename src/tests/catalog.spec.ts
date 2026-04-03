import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useBookCatalog } from '@/composables/useBookCatalog'
import { databases } from '@/lib/appwrite'

// Mock dependencies
vi.mock('vue-router', () => ({
  useRoute: () => ({ query: {} }),
  useRouter: () => ({ replace: vi.fn() })
}))

vi.mock('@/lib/appwrite', () => ({
  databases: {
    listDocuments: vi.fn()
  },
  DATABASE_ID: 'db',
  BOOKS_COLLECTION_ID: 'books',
  SESSIONS_COLLECTION_ID: 'sessions'
}))

describe('useBookCatalog Hybrid Logic', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    if (typeof localStorage !== 'undefined') localStorage.clear()
  })

  it('fetchBooks correctly returns local Appwrite books', async () => {
    const mockAppwrite = {
      documents: [
        { $id: '1', gutenberg_id: 100, title: 'Book A', author: 'A1', subjects: ['Fiction'], file_id: 'f1', cover_url: '' },
        { $id: '2', gutenberg_id: 200, title: 'Book B', author: 'A2', subjects: ['Science'], file_id: 'f2', cover_url: '' },
      ],
      total: 2
    }
    // @ts-expect-error Mocking Appwrite
    databases.listDocuments.mockResolvedValue(mockAppwrite)

    const catalog = useBookCatalog()
    await catalog.fetchBooks(true) // forceRefresh to bypass cache

    expect(catalog.books.value).toHaveLength(2)
    expect(catalog.books.value[0].isLocal).toBe(true)
    expect(catalog.books.value[1].isLocal).toBe(true)
    expect(catalog.books.value[0].id).toBe(100)
    expect(catalog.books.value[1].id).toBe(200)
  })

  it('calculates totalPages correctly from Appwrite count', async () => {
    // @ts-expect-error Mocking
    databases.listDocuments.mockResolvedValue({ documents: [], total: 64 })

    const catalog = useBookCatalog()
    await catalog.fetchBooks(true)

    // 64 items / 32 per page = 2 pages
    expect(catalog.totalPages.value).toBe(2)
  })

  it('resets currentPage to 1 when filters are updated', () => {
    const catalog = useBookCatalog()
    catalog.currentPage.value = 5
    
    catalog.updateFilters({ search: 'new query' })
    
    expect(catalog.currentPage.value).toBe(1)
    expect(catalog.filters.search).toBe('new query')
  })
})
