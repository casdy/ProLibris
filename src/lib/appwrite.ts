import { Client, Account, Databases, Storage } from 'appwrite'

export const APPWRITE_ENDPOINT = "https://tor.cloud.appwrite.io/v1"
export const APPWRITE_PROJECT_ID = "69cc7978000d9666e135"
export const DATABASE_ID = 'ReaderAppDB'
export const BOOKS_COLLECTION_ID = 'Books'
export const SESSIONS_COLLECTION_ID = 'ReadingSessions'
export const BUCKET_ID = 'EPUB_Files'

const client = new Client()
  .setEndpoint(APPWRITE_ENDPOINT)
  .setProject(APPWRITE_PROJECT_ID)

const account = new Account(client)
const databases = new Databases(client)
const storage = new Storage(client)

export { client, account, databases, storage }
