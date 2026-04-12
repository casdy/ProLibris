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
  storage: {
    getFileView: vi.fn(() => ({ toString: () => 'mock-url' }))
  },
  DATABASE_ID: 'db',
  BOOKS_COLLECTION_ID: 'books',
  SESSIONS_COLLECTION_ID: 'sessions',
  ASSETS_BUCKET_ID: 'assets'
}))

describe('useBookCatalog Hybrid Logic', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    if (typeof localStorage !== 'undefined') localStorage.clear()
  })

  it('fetchBooks correctly returns local Appwrite books', async () => {
    const mockAppwrite = {
      documents: [
        { $id: '1', title: 'Book A', coverImageId: 'c1', markdownFileId: 'm1', $createdAt: '2026-01-01' },
        { $id: '2', title: 'Book B', coverImageId: 'c2', markdownFileId: 'm2', $createdAt: '2026-01-02' },
      ],
      total: 2
    }
    // @ts-expect-error Mocking Appwrite
    databases.listDocuments.mockResolvedValue(mockAppwrite)

    const catalog = useBookCatalog()
    await catalog.fetchBooks(true) // forceRefresh to bypass cache

    expect(catalog.books.value).toHaveLength(2)
    expect(catalog.books.value[0].title).toBe('Book A')
    expect(catalog.books.value[1].title).toBe('Book B')
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
