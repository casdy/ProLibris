import { defineStore } from 'pinia'
import { databases, DATABASE_ID, BOOKS_COLLECTION_ID, SESSIONS_COLLECTION_ID, ASSETS_BUCKET_ID, storage } from '@/lib/appwrite'
import { ID, Query, type Models } from 'appwrite'
import { useAuthStore } from './auth'
import { mapTitleToGenre, Genres, type Genre } from '@/lib/genreMapper'

export interface Book extends Models.Document {
  title: string
  coverImageId: string
  markdownFileId: string
  subjects?: string[] // Re-introducing metadata field
  // Virtual properties calculated for UI
  cover_url?: string
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
  } else if (sortBy === 'newest') {
    sorted.sort((a, b) => new Date(b.$createdAt).getTime() - new Date(a.$createdAt).getTime())
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
    discoverFilter: { genre: '', sort: 'title' }
  }),
  getters: {
    books(state) {
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
      // Prioritize books matching user affinity
      const favorites = this.userPreferredGenres
      if (favorites.length === 0) return this.enchantedBooks

      return [...this.allBooks].filter(b => 
        b.subjects?.some(s => favorites.includes(s))
      ).slice(0, 30)
    },
    userPreferredGenres(state): string[] {
      const auth = useAuthStore()
      const manualInterests = (auth.user?.prefs?.interests as string[]) || []
      
      if (manualInterests.length > 0) return manualInterests

      // Fallback: calculate top 3 genres from reading sessions
      const genres: Record<string, number> = {}
      state.sessions.forEach(s => {
        const book = state.allBooks.find(b => b.$id === s.book_id)
        if (book?.subjects) {
          book.subjects.forEach(g => {
            genres[g] = (genres[g] || 0) + 1
          })
        }
      })
      
      return Object.entries(genres)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([g]) => g)
    },
    filteredEnchanted(state): Book[] {
      const list = [...state.enchantedBooks]
      return sortBooks(list, state.enchantedFilter.sort)
    },
    filteredDiscover(state): Book[] {
      const list = [...state.discoverBooks]
      return sortBooks(list, state.discoverFilter.sort)
    }
  },
  actions: {
    async fetchBooks() {
      this.loading = true
      try {
        const allDocs: Book[] = []
        let offset = 0
        const limit = 100
        let hasMore = true

        while (hasMore) {
          const response = await databases.listDocuments<Book>(DATABASE_ID, BOOKS_COLLECTION_ID, [
            Query.limit(limit),
            Query.offset(offset),
          ])
          
          // Enrich with cover_url for UI compatibility
          const enriched = response.documents.map(doc => {
            const url = storage.getFileView(ASSETS_BUCKET_ID, doc.coverImageId).toString()
            return { ...doc, cover_url: url }
          })
          
          allDocs.push(...enriched)
          offset += limit
          hasMore = response.documents.length === limit
        }

        this.allBooks = allDocs
        
        // Extract unique genres from available metadata + Mapper
        const genresSet = new Set<string>()
        allDocs.forEach(b => {
          // If subjects missing or empty, use Mapper
          if (!b.subjects || b.subjects.length === 0) {
            b.subjects = mapTitleToGenre(b.title)
          }
          b.subjects.forEach(g => genresSet.add(g))
        })
        
        this.allGenres = Array.from(Genres).sort() // Always show the standard set

        this.generateRecommendations()

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
      const shuffled = shuffleArray(this.allBooks)
      this.enchantedBooks = shuffled.slice(0, 30)
      
      const usedIds = new Set(this.enchantedBooks.map(b => b.$id))
      this.discoverBooks = shuffled
        .filter((b: Book) => !usedIds.has(b.$id))
        .slice(0, 40)
    },

    setEnchantedFilter(_genre: string, sort: string) {
      this.enchantedFilter.sort = sort
    },

    setDiscoverFilter(_genre: string, sort: string) {
      this.discoverFilter.sort = sort
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
        return book.title.toLowerCase().includes(q)
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
  },
})
