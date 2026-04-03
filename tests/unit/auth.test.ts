import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useAuthStore } from '@/stores/auth'
import * as appwrite from '@/lib/appwrite'

// Mock Appwrite
vi.mock('@/lib/appwrite', () => ({
    account: {
      get: vi.fn(),
      createEmailPasswordSession: vi.fn(),
      create: vi.fn(),
      deleteSession: vi.fn(),
    },
    client: { setEndpoint: vi.fn(), setProject: vi.fn() },
    ID: { unique: () => 'uid' }
}))

describe('Auth Store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('initializes with a user on init() success', async () => {
    const store = useAuthStore()
    const mockUser = { $id: 'user1', name: 'Test' }
    ;(appwrite.account.get as any).mockResolvedValue(mockUser)

    await store.init()
    
    expect(store.user).toEqual(mockUser)
    expect(store.loading).toBe(false)
  })

  it('sets user to null on init() failure', async () => {
    const store = useAuthStore()
    ;(appwrite.account.get as any).mockRejectedValue(new Error('Unauthorized'))

    await store.init()
    
    expect(store.user).toBeNull()
    expect(store.loading).toBe(false)
  })

  it('logs in correctly', async () => {
    const store = useAuthStore()
    const mockUser = { $id: 'user1' }
    ;(appwrite.account.get as any).mockResolvedValue(mockUser)

    await store.login('test@test.com', 'password')
    
    expect(appwrite.account.createEmailPasswordSession).toHaveBeenCalledWith('test@test.com', 'password')
    expect(store.user).toEqual(mockUser)
  })

  it('signs up and then logs in', async () => {
    const store = useAuthStore()
    const loginSpy = vi.spyOn(store, 'login').mockResolvedValue(undefined as any)

    await store.signup('new@test.com', 'password', 'New User')
    
    expect(appwrite.account.create).toHaveBeenCalled()
    expect(loginSpy).toHaveBeenCalledWith('new@test.com', 'password')
  })
})
