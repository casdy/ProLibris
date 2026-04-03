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
    localStorage.clear()
    vi.stubGlobal('fetch', vi.fn())
  })

  it('fetchBooks correctly merges Gutendex and Appwrite data', async () => {
    // Mock Appwrite response
    const mockAppwrite = {
      documents: [{ $id: '1', gutenberg_id: 100, title: 'Local Book', author: 'A1', subjects: [], file_id: 'f1', cover_url: '' }],
      total: 1
    };
    // @ts-expect-error Mocking Appwrite
    databases.listDocuments.mockResolvedValue(mockAppwrite)

    // Mock Gutendex response
    const mockGutendex = {
      results: [
        { id: 100, title: 'Local Book (Duplicate)', authors: [{ name: 'A1' }], subjects: [], formats: {} },
        { id: 200, title: 'Remote Book', authors: [{ name: 'A2' }], subjects: [], formats: {} }
      ],
      count: 2
    };
    // @ts-expect-error Mocking Fetch
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => mockGutendex
    })

    const catalog = useBookCatalog()
    await catalog.fetchBooks()

    expect(catalog.books.value).toHaveLength(2)
    expect(catalog.books.value[0].isLocal).toBe(true)
    expect(catalog.books.value[1].isLocal).toBe(false)
    expect(catalog.books.value[0].id).toBe(100)
    expect(catalog.books.value[1].id).toBe(200)
  })

  it('calculates totalPages correctly from merged count', async () => {
    // @ts-expect-error Mocking
    databases.listDocuments.mockResolvedValue({ documents: [], total: 32 });
    // @ts-expect-error Mocking
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({ results: [], count: 64 })
    })

    const catalog = useBookCatalog()
    await catalog.fetchBooks()

    // Assuming 32 items per page as per composable logic
    expect(catalog.totalPages.value).toBe(2) // Max of ceil(32/32) and ceil(64/32)
  })

  it('resets currentPage to 1 when filters are updated', () => {
    const catalog = useBookCatalog()
    catalog.currentPage.value = 5
    
    catalog.updateFilters({ search: 'new query' })
    
    expect(catalog.currentPage.value).toBe(1)
    expect(catalog.filters.search).toBe('new query')
  })
})
