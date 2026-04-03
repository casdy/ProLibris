import { defineStore } from 'pinia'
import { databases, storage, DATABASE_ID, BOOKS_COLLECTION_ID, SESSIONS_COLLECTION_ID, BUCKET_ID } from '@/lib/appwrite'
import { ID, Query, type Models } from 'appwrite'
import { useAuthStore } from './auth'

export interface Book extends Models.Document {
  title: string
  author: string
  subjects: string[]
  cover_url: string
  file_id: string
  gutenberg_id: number
}

export interface ReadingSession extends Models.Document {
  user_id: string
  book_id: string
  is_liked: boolean
  progress_cfi?: string
  status: 'unread' | 'reading' | 'completed'
  pages_turned: number
  last_read_at?: string
  // Analytics fields
  mode_preference?: 'typing' | 'paced' | 'standard'
  target_read_wpm?: number
  avg_type_wpm?: number
  avg_accuracy?: number
  problem_keys?: string[]
  read_dates?: string[]
}

function shuffleArray<T>(arr: T[]): T[] {
  const shuffled = [...arr]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

function sortBooks(list: Book[], sortBy: string): Book[] {
  const sorted = [...list]
  if (sortBy === 'title') {
    sorted.sort((a, b) => a.title.localeCompare(b.title))
  } else if (sortBy === 'author') {
    sorted.sort((a, b) => a.author.localeCompare(b.author))
  } else if (sortBy === 'genre') {
    sorted.sort((a, b) => (a.subjects[0] || '').localeCompare(b.subjects[0] || ''))
  }
  return sorted
}

export const useLibraryStore = defineStore('library', {
  state: () => ({
    allBooks: [] as Book[],
    enchantedBooks: [] as Book[],
    discoverBooks: [] as Book[],
    sessions: [] as ReadingSession[],
    loading: false,
    searchQuery: '',
    searchResults: [] as Book[],
    isSearching: false,
    allGenres: [] as string[],
    
    // UI state for filtering/sorting
    enchantedFilter: { genre: '', sort: 'title' },
    discoverFilter: { genre: '', sort: 'title' },
    activeSummons: {} as Record<number, boolean>
  }),
  getters: {
    books(state) {
      // Backward-compatible: returns enchanted or search results
      return state.isSearching ? state.searchResults : state.enchantedBooks
    },
    likedBooks(state) {
      const likedIds = state.sessions.filter(s => s.is_liked).map(s => s.book_id)
      return state.allBooks.filter(b => likedIds.includes(b.$id))
    },
    readingBooks(state) {
      const readingIds = state.sessions.filter(s => s.status === 'reading').map(s => s.book_id)
      return state.allBooks.filter(b => readingIds.includes(b.$id))
    },
    completedBooks(state) {
      const completedIds = state.sessions.filter(s => s.status === 'completed').map(s => s.book_id)
      return state.allBooks.filter(b => completedIds.includes(b.$id))
    },
    continueReadingBook(state) {
      const lastSession = [...state.sessions]
        .filter(s => s.last_read_at)
        .sort((a, b) => new Date(b.last_read_at || 0).getTime() - new Date(a.last_read_at || 0).getTime())[0]
      return state.allBooks.find(b => b.$id === lastSession?.book_id)
    },
    recentReadingList(state) {
      const sorted = [...state.sessions]
        .filter(s => s.last_read_at)
        .sort((a, b) => new Date(b.last_read_at || 0).getTime() - new Date(a.last_read_at || 0).getTime())
        .slice(0, 5)
      
      return sorted.map(s => {
        const book = state.allBooks.find(b => b.$id === s.book_id)
        return { book, session: s }
      }).filter(item => item.book)
    },
    recommendations(): Book[] {
      return this.enchantedBooks
    },
    filteredEnchanted(state): Book[] {
      let list = [...state.enchantedBooks]
      if (state.enchantedFilter.genre) {
        list = list.filter(b => b.subjects.includes(state.enchantedFilter.genre))
      }
      return sortBooks(list, state.enchantedFilter.sort)
    },
    filteredDiscover(state): Book[] {
      let list = [...state.discoverBooks]
      if (state.discoverFilter.genre) {
        list = list.filter(b => b.subjects.includes(state.discoverFilter.genre))
      }
      return sortBooks(list, state.discoverFilter.sort)
    }
  },
  actions: {
    async fetchBooks() {
      this.loading = true
      try {
        // Fetch ALL books from the database (paginated, 100 per request)
        let allDocs: Book[] = []
        let offset = 0
        const limit = 100
        let hasMore = true

        while (hasMore) {
          const response = await databases.listDocuments<Book>(DATABASE_ID, BOOKS_COLLECTION_ID, [
            Query.limit(limit),
            Query.offset(offset),
          ])
          allDocs.push(...response.documents)
          offset += limit
          hasMore = response.documents.length === limit
        }

        this.allBooks = allDocs

        // Extract unique genres from all subjects
        const genreSet = new Set<string>()
        allDocs.forEach(b => b.subjects.forEach(s => genreSet.add(s)))
        this.allGenres = [...genreSet].sort()

        // Generate 30 recommended books — diverse by category
        this.generateRecommendations()

        // Cache recommended book IDs for offline
        try {
          localStorage.setItem('prolibris_recommended', JSON.stringify(this.enchantedBooks.map((b: Book) => b.$id)))
        } catch (e) {
          console.error('Failed to cache recommended books:', e)
        }
      } finally {
        this.loading = false
      }
    },

    generateRecommendations() {
      // Pick 30 diverse books for the Enchanted Selection
      const shuffled = shuffleArray(this.allBooks)
      this.enchantedBooks = shuffled.slice(0, 30)
      
      // Pick 40 MORE unique books for Discover More
      const usedIds = new Set(this.enchantedBooks.map(b => b.$id))
      this.discoverBooks = shuffled
        .filter((b: Book) => !usedIds.has(b.$id))
        .slice(0, 40)
    },

    setEnchantedFilter(genre: string, sort: string) {
      this.enchantedFilter = { genre, sort }
    },

    setDiscoverFilter(genre: string, sort: string) {
      this.discoverFilter = { genre, sort }
    },

    searchBooks(query: string) {
      this.searchQuery = query.trim()

      if (!this.searchQuery) {
        this.isSearching = false
        this.searchResults = []
        return
      }

      this.isSearching = true
      const q = this.searchQuery.toLowerCase()

      this.searchResults = this.allBooks.filter(book => {
        const titleMatch = book.title.toLowerCase().includes(q)
        const authorMatch = book.author.toLowerCase().includes(q)
        const subjectMatch = book.subjects.some(s => s.toLowerCase().includes(q))
        return titleMatch || authorMatch || subjectMatch
      })
    },

    clearSearch() {
      this.searchQuery = ''
      this.isSearching = false
      this.searchResults = []
    },

    async fetchUserSessions() {
      const auth = useAuthStore()
      if (!auth.user) return

      const response = await databases.listDocuments<ReadingSession>(DATABASE_ID, SESSIONS_COLLECTION_ID, [
        Query.equal('user_id', auth.user.$id),
        Query.limit(5000)
      ])
      this.sessions = response.documents
    },

    async updateProgress(bookId: string, cfi: string, pagesInc = 0, analyticsData?: Record<string, unknown>) {
      const auth = useAuthStore()
      if (!auth.user) return

      const session = this.sessions.find(s => s.book_id === bookId)
      const data: Record<string, unknown> = {
        progress_cfi: cfi,
        last_read_at: new Date().toISOString(),
        status: 'reading',
        pages_turned: (session?.pages_turned || 0) + pagesInc,
      }

      // Merge analytics data if provided
      if (analyticsData) {
        Object.assign(data, analyticsData)
      }

      if (session) {
        await databases.updateDocument(DATABASE_ID, SESSIONS_COLLECTION_ID, session.$id, data)
      } else {
        await databases.createDocument(DATABASE_ID, SESSIONS_COLLECTION_ID, ID.unique(), {
          ...data,
          user_id: auth.user.$id,
          book_id: bookId,
          is_liked: false
        })
      }
      await this.fetchUserSessions()
    },

    async toggleLike(bookId: string) {
       const auth = useAuthStore()
       if (!auth.user) return
       
       const session = this.sessions.find(s => s.book_id === bookId)
       if (session) {
         await databases.updateDocument(DATABASE_ID, SESSIONS_COLLECTION_ID, session.$id, { is_liked: !session.is_liked })
       } else {
         await databases.createDocument(DATABASE_ID, SESSIONS_COLLECTION_ID, ID.unique(), {
           user_id: auth.user.$id,
           book_id: bookId,
           is_liked: true,
           status: 'unread',
           pages_turned: 0
         })
       }
       await this.fetchUserSessions()
    },

    async importInBackground(gutenbergId: number, metadata: Partial<Book>) {
      const { useUIStore } = await import('./ui')
      const ui = useUIStore()
      
      if (this.activeSummons[gutenbergId]) {
        ui.showNotification(`Already summoning "${metadata.title}"`, 'info')
        return
      }

      const notificationId = ui.showNotification(`Summoning "${metadata.title}" into your archive...`, 'info', 0)
      this.activeSummons[gutenbergId] = true

      try {
        const book = await this.importBookFromGutenberg(gutenbergId, metadata)
        if (book) {
          ui.removeNotification(notificationId)
          ui.showNotification(`"${book.title}" is ready in your archive!`, 'success')
        } else {
          throw new Error('Import returned null')
        }
      } catch (err) {
        console.error('Background import failed:', err)
        ui.removeNotification(notificationId)
        ui.showNotification(`Failed to summon "${metadata.title}". Checking parchment for errors...`, 'error')
      } finally {
        delete this.activeSummons[gutenbergId]
      }
    },

    async importBookFromGutenberg(gutenbergId: number, metadata: Partial<Book>): Promise<Book | null> {
      this.loading = true
      try {
        // 1. Double check if already imported (concurrency safety)
        const existing = this.allBooks.find(b => b.gutenberg_id === gutenbergId)
        if (existing) return existing

        // 2. Fetch EPUB from Gutenberg
        const epubUrl = `https://www.gutenberg.org/ebooks/${gutenbergId}.epub.images`
        const response = await fetch(epubUrl)
        if (!response.ok) throw new Error(`Gutenberg fetch failed: ${response.status}`)
        
        const blob = await response.blob()
        const file = new File([blob], `${gutenbergId}.epub`, { type: 'application/epub+zip' })

        // 3. Upload to Appwrite Storage
        const fileId = ID.unique()
        await storage.createFile(BUCKET_ID, fileId, file)

        // 4. Create Book Document
        const newBook = await databases.createDocument<Book>(DATABASE_ID, BOOKS_COLLECTION_ID, ID.unique(), {
          title: metadata.title || 'Unknown Title',
          author: metadata.author || 'Unknown Author',
          subjects: metadata.subjects || [],
          cover_url: metadata.cover_url || `https://www.gutenberg.org/cache/epub/${gutenbergId}/pg${gutenbergId}.cover.medium.jpg`,
          file_id: fileId,
          gutenberg_id: gutenbergId
        })

        // 5. Update local state
        this.allBooks.push(newBook)
        return newBook
      } catch (err) {
        console.error('Failed to import book:', err)
        return null
      } finally {
        this.loading = false
      }
    }
  },
})
