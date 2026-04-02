import { defineStore } from 'pinia'
import { databases, DATABASE_ID, BOOKS_COLLECTION_ID, SESSIONS_COLLECTION_ID } from '@/lib/appwrite'
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
}

function shuffleArray<T>(arr: T[]): T[] {
  const shuffled = [...arr]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

export const useLibraryStore = defineStore('library', {
  state: () => ({
    allBooks: [] as Book[],
    recommendedBooks: [] as Book[],
    sessions: [] as ReadingSession[],
    loading: false,
    searchQuery: '',
    searchResults: [] as Book[],
    isSearching: false,
    allGenres: [] as string[],
  }),
  getters: {
    books(state) {
      // Backward-compatible: returns recommended or search results
      return state.isSearching ? state.searchResults : state.recommendedBooks
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
        .filter(s => s.status === 'reading')
        .sort((a, b) => new Date(b.last_read_at || 0).getTime() - new Date(a.last_read_at || 0).getTime())[0]
      return state.allBooks.find(b => b.$id === lastSession?.book_id)
    },
    recommendations(): Book[] {
      return this.recommendedBooks
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
          allDocs = [...allDocs, ...response.documents]
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
          localStorage.setItem('prolibris_recommended', JSON.stringify(this.recommendedBooks.map(b => b.$id)))
        } catch {}
      } finally {
        this.loading = false
      }
    },

    generateRecommendations() {
      // Pick 30 random books spread across categories
      const shuffled = shuffleArray(this.allBooks)
      this.recommendedBooks = shuffled.slice(0, 30)
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
      ])
      this.sessions = response.documents
    },

    async updateProgress(bookId: string, cfi: string, pagesInc = 0, analyticsData?: Record<string, any>) {
      const auth = useAuthStore()
      if (!auth.user) return

      let session = this.sessions.find(s => s.book_id === bookId)
      const data: Record<string, any> = {
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
       
       let session = this.sessions.find(s => s.book_id === bookId)
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
    }
  },
})
