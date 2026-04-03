import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useLibraryStore } from '@/stores/library'
import * as appwrite from '@/lib/appwrite'

// Mock Appwrite
vi.mock('@/lib/appwrite', () => ({
    databases: {
      listDocuments: vi.fn(),
      createDocument: vi.fn(),
    },
    storage: {
      createFile: vi.fn(),
    },
    DATABASE_ID: 'db',
    BOOKS_COLLECTION_ID: 'books',
    BUCKET_ID: 'bucket',
    ID: { unique: () => 'uid' },
    Query: { limit: vi.fn(), offset: vi.fn() }
}))

describe('Library Store - Summoning Flow', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    
    // Mock global fetch
    global.fetch = vi.fn()
    // Mock File (since it's a browser API)
    global.File = class {
      constructor(bits: any[], name: string) {
        this.bits = bits
        this.name = name
      }
      bits: any[]
      name: string
      type = 'application/epub+zip'
    } as any
  })

  it('successfully imports a book from Gutenberg', async () => {
    const store = useLibraryStore()
    
    // 1. Mock successful Gutenberg fetch
    const mockBlob = new Blob(['epub content'], { type: 'application/epub+zip' })
    ;(global.fetch as any).mockResolvedValue({
      ok: true,
      blob: () => Promise.resolve(mockBlob)
    })

    // 2. Mock Appwrite success
    ;(appwrite.storage.createFile as any).mockResolvedValue({ $id: 'file1' })
    ;(appwrite.databases.createDocument as any).mockResolvedValue({
      $id: 'book1',
      title: 'Test Book',
      author: 'Test Author',
      gutenberg_id: 123
    })

    const result = await store.importBookFromGutenberg(123, { title: 'Test Book', author: 'Test Author' })

    expect(result).toBeDefined()
    expect(result?.$id).toBe('book1')
    expect(appwrite.storage.createFile).toHaveBeenCalled()
    expect(appwrite.databases.createDocument).toHaveBeenCalled()
  })

  it('handles Gutenberg fetch failures gracefully', async () => {
    const store = useLibraryStore()
    
    ;(global.fetch as any).mockResolvedValue({
      ok: false,
      status: 404
    })

    const result = await store.importBookFromGutenberg(999, { title: 'Error Book' })

    expect(result).toBeNull()
    expect(appwrite.storage.createFile).not.toHaveBeenCalled()
  })

  it('prevents duplicate imports if book already exists in local state', async () => {
    const store = useLibraryStore()
    store.allBooks = [{ gutenberg_id: 123, $id: 'existing' } as any]

    const result = await store.importBookFromGutenberg(123, { title: 'Test Book' })

    expect(result?.$id).toBe('existing')
    expect(global.fetch).not.toHaveBeenCalled()
  })
})
