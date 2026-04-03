import { ref, watch, reactive } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { databases, DATABASE_ID, BOOKS_COLLECTION_ID } from '@/lib/appwrite'
import { Query } from 'appwrite'
import type { Book } from '../stores/library'

export interface HybridBook {
  id: number
  $id: string
  title: string
  author: string
  cover_url: string
  subjects: string[]
  isLocal: boolean
  appwriteDocumentId: string | null
  appwriteFileId: string | null
}

interface CacheEntry {
  books: HybridBook[]
  totalCount: number
  timestamp: number
}

// ─── SHARED STATE ──────────────────────────────────────────────────
export const books = ref<HybridBook[]>([])
export const isLoading = ref(false)
export const totalCount = ref(0)
export const totalPages = ref(0)
export const currentPage = ref(1)

export const filters = reactive({
  search: '',
  sort: 'popularity',
  topic: ''
})

const memoizedCache = new Map<string, CacheEntry>()
const MAX_CACHE_SIZE = 50
const DISK_CACHE_KEY = 'prolibris_local_catalog_p1'
const CACHE_TTL = 1000 * 60 * 30 // 30 minutes
let fetchGeneration = 0 // Race-condition guard: ignore stale responses

/** Evict oldest entries when cache exceeds MAX_CACHE_SIZE (FIFO) */
function cacheSet(key: string, entry: CacheEntry) {
  if (memoizedCache.size >= MAX_CACHE_SIZE) {
    const oldestKey = memoizedCache.keys().next().value
    if (oldestKey !== undefined) memoizedCache.delete(oldestKey)
  }
  memoizedCache.set(key, entry)
}

// ─── CORE LOGIC (SINGLETON METHODS) ──────────────────────────────

const getCacheKey = (page: number, f = filters) => {
  return `local-page-${page}-s-${f.search}-t-${f.topic}-sort-${f.sort}`
}

const buildQueries = (page: number, f = filters) => {
  const queries = [
    Query.limit(32),
    Query.offset((page - 1) * 32)
  ]
  if (f.search) queries.push(Query.contains('title', f.search))
  if (f.topic) queries.push(Query.contains('subjects', f.topic))
  
  if (f.sort === 'popular') queries.push(Query.orderDesc('gutenberg_id'))
  else if (f.sort === 'ascending') queries.push(Query.orderAsc('$createdAt'))
  else if (f.sort === 'descending') queries.push(Query.orderDesc('$createdAt'))
  else queries.push(Query.orderAsc('title'))

  return queries
}

const mapBook = (doc: Book): HybridBook => ({
  id: doc.gutenberg_id,
  $id: doc.$id,
  title: doc.title,
  author: doc.author,
  cover_url: doc.cover_url,
  subjects: doc.subjects,
  isLocal: true,
  appwriteDocumentId: doc.$id,
  appwriteFileId: doc.file_id
})

// ─── OPTIMIZED FETCHING (LOCAL-ONLY) ──────────────────────────

export const fetchBooks = async (forceRefresh = false) => {
  const generation = ++fetchGeneration
  const currentPageVal = currentPage.value
  const currentFilters = { ...filters }
  const currentKey = getCacheKey(currentPageVal, currentFilters)
  
  // 1. Memory Cache Check (Instant Resolution)
  const cached = memoizedCache.get(currentKey)
  if (cached && !forceRefresh && (Date.now() - cached.timestamp < CACHE_TTL)) {
    books.value = cached.books
    totalCount.value = cached.totalCount
    totalPages.value = Math.ceil(cached.totalCount / 32)
    triggerPrefetch(currentPageVal)
    return
  }

  // 2. Disk Cache (Default Page 1 Only)
  const isDefaultP1 = currentPageVal === 1 && !currentFilters.search && !currentFilters.topic
  if (isDefaultP1 && !forceRefresh && books.value.length === 0 && typeof localStorage !== 'undefined') {
    const diskData = localStorage.getItem(DISK_CACHE_KEY)
    if (diskData) {
      try {
        const parsed = JSON.parse(diskData)
        if (Date.now() - parsed.timestamp < CACHE_TTL) {
          books.value = parsed.books
          totalCount.value = parsed.totalCount
          totalPages.value = Math.ceil(parsed.totalCount / 32)
        }
      } catch { /* ignore */ }
    }
  }

  // 3. Database Fetch (Local-First, High-Priority)
  isLoading.value = books.value.length === 0
  try {
    const queries = buildQueries(currentPageVal, currentFilters)
    
    // Start Appwrite fetch
    const appwriteRes = await databases.listDocuments<Book>(DATABASE_ID, BOOKS_COLLECTION_ID, queries)
    const localBooks = appwriteRes.documents.map(mapBook)
    
    // Stale response guard: if a newer fetch was triggered, discard this result
    if (generation !== fetchGeneration) return

    // Update UI instantly with Local results
    books.value = localBooks
    totalCount.value = appwriteRes.total
    totalPages.value = Math.ceil(appwriteRes.total / 32)
    
    // Stop primary loading spinner if we have local data
    if (localBooks.length > 0) isLoading.value = false

    // Trigger pre-fetch for neighboring pages (Local data first)
    triggerPrefetch(currentPageVal)

    // 4. Cache final result
    const entry = { books: localBooks, totalCount: totalCount.value, timestamp: Date.now() }
    cacheSet(currentKey, entry)
    if (isDefaultP1 && typeof localStorage !== 'undefined') {
      localStorage.setItem(DISK_CACHE_KEY, JSON.stringify(entry))
    }

  } catch (error) {
    console.error('Failed to fetch local catalog:', error)
  } finally {
    isLoading.value = false
  }
}

const triggerPrefetch = (page: number) => {
  if (page < totalPages.value) prefetchPage(page + 1)
  if (page > 1) prefetchPage(page - 1)
}

const prefetchPage = async (page: number) => {
  const currentFilters = { ...filters }
  const key = getCacheKey(page, currentFilters)
  if (memoizedCache.has(key)) return
  
  try {
    const queries = buildQueries(page, currentFilters)
    
    // 1. Fetch Local Data First (High-Priority)
    const appwriteRes = await databases.listDocuments<Book>(DATABASE_ID, BOOKS_COLLECTION_ID, queries).catch(() => ({ documents: [], total: 0 }))
    const localBooks = appwriteRes.documents.map(mapBook)
    
    // Create initial cache entry with only local data
    const initialEntry = { 
        books: localBooks, 
        totalCount: appwriteRes.total, 
        timestamp: Date.now() 
    }
    cacheSet(key, initialEntry)
  } catch { /* ignore prefetch errors */ }
}

export const changePage = (page: number) => {
  if (page >= 1 && (totalPages.value === 0 || page <= totalPages.value)) {
    currentPage.value = page
    fetchBooks()
    
    // Smooth scroll back to top of the catalog for better UX
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }
}

export const updateFilters = (newFilters: Partial<typeof filters>) => {
  Object.assign(filters, newFilters)
  currentPage.value = 1 
  fetchBooks()
  
  // Smooth scroll back to top of the catalog for better UX
  if (typeof window !== 'undefined') {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
}

// ─── COMPOSABLE WRAPPER (SAFE FOR SETUP) ─────────────────────────

export function useBookCatalog() {
  let route: ReturnType<typeof useRoute> | undefined
  let router: ReturnType<typeof useRouter> | undefined
  try {
    route = useRoute()
    router = useRouter()
  } catch { /* Not in setup */ }

  if (router && route) {
    if (!books.value.length && !isLoading.value) {
      if (route.query.page) currentPage.value = Number(route.query.page)
      if (route.query.search) filters.search = route.query.search as string
      if (route.query.sort) filters.sort = route.query.sort as string
      if (route.query.topic) filters.topic = route.query.topic as string
    }

    watch([() => filters.search, () => filters.sort, () => filters.topic, currentPage], () => {
      router.replace({
        query: {
          ...route.query,
          search: filters.search || undefined,
          sort: filters.sort !== 'popularity' ? filters.sort : undefined,
          topic: filters.topic || undefined,
          page: currentPage.value !== 1 ? currentPage.value.toString() : undefined
        }
      })
    })
  }

  if (!books.value.length && !isLoading.value) {
    fetchBooks()
  }

  return {
    books,
    isLoading,
    totalCount,
    totalPages,
    currentPage,
    filters,
    fetchBooks,
    changePage,
    updateFilters
  }
}
