import { vi } from 'vitest'

export const Client = vi.fn(() => ({
  setEndpoint: vi.fn().mockReturnThis(),
  setProject: vi.fn().mockReturnThis()
}))

export const Account = vi.fn(() => ({
  get: vi.fn().mockResolvedValue({ $id: 'user123', name: 'Test User' }),
  createEmailPasswordSession: vi.fn().mockResolvedValue({}),
  deleteSession: vi.fn().mockResolvedValue({})
}))

export const Databases = vi.fn(() => ({
  listDocuments: vi.fn().mockResolvedValue({ documents: [], total: 0 }),
  createDocument: vi.fn().mockResolvedValue({ $id: 'doc123' }),
  updateDocument: vi.fn().mockResolvedValue({ $id: 'doc123' })
}))

export const Storage = vi.fn(() => ({
  createFile: vi.fn().mockResolvedValue({ $id: 'file123' }),
  getFileDownload: vi.fn().mockReturnValue(new URL('https://example.com/file'))
}))

export const ID = {
  unique: () => 'unique_id'
}

export const Query = {
  limit: (n: number) => `limit(${n})`,
  offset: (n: number) => `offset(${n})`,
  equal: (k: string, v: any) => `equal(${k}, ${v})`
}
