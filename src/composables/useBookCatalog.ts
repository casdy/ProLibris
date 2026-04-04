import { ref, watch, reactive, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { databases, DATABASE_ID, BOOKS_COLLECTION_ID } from '@/lib/appwrite'
import { Query } from 'appwrite'
import type { Book } from '../stores/library'

// ─── SHARED STATE ──────────────────────────────────────────────────
export const books = ref<Book[]>([])
export const isLoading = ref(false)
export const totalCount = ref(0)
export const limit = ref(32)
export const offset = ref(0)

export const filters = reactive({
  search: '',
  sort: 'popularity',
  topic: ''
})

const memoizedCache = new Map<string, { books: Book[], total: number, timestamp: number }>()
const CACHE_TTL = 1000 * 60 * 5 // 5 minutes for Appwrite results

let fetchGeneration = 0 

// ─── CORE LOGIC ──────────────────────────────────────────────────

const getCacheKey = () => {
  return `catalog-o-${offset.value}-s-${filters.search}-t-${filters.topic}-sort-${filters.sort}`
}

const buildQueries = () => {
  const queries = [
    Query.limit(limit.value),
    Query.offset(offset.value)
  ]
  
  if (filters.search) {
    // Search by title (Appwrite requires index on 'title')
    queries.push(Query.search('title', filters.search))
  }
  
  if (filters.topic) {
    queries.push(Query.contains('subjects', filters.topic))
  }
  
  if (filters.sort === 'popularity') queries.push(Query.orderDesc('gutenberg_id'))
  else if (filters.sort === 'ascending') queries.push(Query.orderAsc('$createdAt'))
  else if (filters.sort === 'descending') queries.push(Query.orderDesc('$createdAt'))
  else queries.push(Query.orderAsc('title'))

  return queries
}

export const fetchBooks = async (forceRefresh = false) => {
  const generation = ++fetchGeneration
  const currentKey = getCacheKey()
  
  // 1. Cache Check
  const cached = memoizedCache.get(currentKey)
  if (cached && !forceRefresh && (Date.now() - cached.timestamp < CACHE_TTL)) {
    books.value = cached.books
    totalCount.value = cached.total
    return
  }

  isLoading.value = true
  try {
    const queries = buildQueries()
    const response = await databases.listDocuments<Book>(DATABASE_ID, BOOKS_COLLECTION_ID, queries)
    
    // Stale response guard
    if (generation !== fetchGeneration) return

    books.value = response.documents
    totalCount.value = response.total
    
    // Cache the result
    memoizedCache.set(currentKey, { 
      books: response.documents, 
      total: response.total, 
      timestamp: Date.now() 
    })
  } catch (error) {
    console.error('Failed to fetch Appwrite catalog:', error)
  } finally {
    if (generation === fetchGeneration) {
      isLoading.value = false
    }
  }
}

export const totalPages = computed(() => Math.ceil(totalCount.value / limit.value))
export const currentPage = computed(() => Math.floor(offset.value / limit.value) + 1)

export const changePage = (page: number) => {
  offset.value = (page - 1) * limit.value
  fetchBooks()
  if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' })
}

export const updateFilters = (newFilters: Partial<typeof filters>) => {
  Object.assign(filters, newFilters)
  offset.value = 0 // Reset pagination on filter change
  fetchBooks()
  if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' })
}

export function useBookCatalog() {
  let route: ReturnType<typeof useRoute> | undefined
  let router: ReturnType<typeof useRouter> | undefined
  try {
    route = useRoute()
    router = useRouter()
  } catch { /* Not in setup */ }

  if (router && route) {
    // Initial state from URL
    if (!books.value.length && !isLoading.value) {
      if (route.query.search) filters.search = route.query.search as string
      if (route.query.sort) filters.sort = route.query.sort as string
      if (route.query.topic) filters.topic = route.query.topic as string
      if (route.query.page) offset.value = (Number(route.query.page) - 1) * limit.value
    }

    // Sync state to URL
    watch([() => filters.search, () => filters.sort, () => filters.topic, offset], () => {
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
