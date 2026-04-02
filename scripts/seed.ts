
import { Client, Databases, Storage, ID, Permission, Role } from 'node-appwrite';
import { InputFile } from 'node-appwrite/file';
import axios from 'axios';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' });

const APPWRITE_ENDPOINT = "https://tor.cloud.appwrite.io/v1";
const APPWRITE_PROJECT_ID = "69cc7978000d9666e135";
const APPWRITE_API_KEY = process.env.APPWRITE_API_KEY;

if (!APPWRITE_API_KEY) {
  console.error("APPWRITE_API_KEY not found in .env.local");
  process.exit(1);
}

const client = new Client()
  .setEndpoint(APPWRITE_ENDPOINT)
  .setProject(APPWRITE_PROJECT_ID)
  .setKey(APPWRITE_API_KEY);

const databases = new Databases(client);
const storage = new Storage(client);

const DATABASE_ID = 'ReaderAppDB';
const BOOKS_COLLECTION_ID = 'Books';
const SESSIONS_COLLECTION_ID = 'ReadingSessions';
const BUCKET_ID = 'EPUB_Files';

async function setupInfrastructure() {
  console.log("Setting up Appwrite Infrastructure...");

  try {
    // Attempt to create Database
    await databases.create(DATABASE_ID, 'ReaderAppDB');
    console.log("Database created.");
  } catch (e: any) {
    if (e.code === 409) {
      console.log("Database ID already exists.");
    } else if (e.code === 403) {
      console.log("Plan limit reached. Checking for existing database named 'ReaderAppDB'...");
      const dbList = await databases.list();
      const existing = dbList.databases.find(db => db.name === 'ReaderAppDB' || db.$id === DATABASE_ID);
      if (existing) {
        console.log(`Found existing database: ${existing.$id}. Proceeding with it.`);
      } else {
        throw new Error("Could not create database due to plan limits, and no existing 'ReaderAppDB' was found.");
      }
    } else {
      throw e;
    }
  }

  try {
    // Create Books Collection
    await databases.createCollection(DATABASE_ID, BOOKS_COLLECTION_ID, 'Books', [
      Permission.read(Role.any()),
      Permission.write(Role.users()),
    ]);
    console.log("Books collection created.");

    // Create Attributes for Books
    await databases.createStringAttribute(DATABASE_ID, BOOKS_COLLECTION_ID, 'title', 512, true);
    await databases.createStringAttribute(DATABASE_ID, BOOKS_COLLECTION_ID, 'author', 256, true);
    await databases.createStringAttribute(DATABASE_ID, BOOKS_COLLECTION_ID, 'subjects', 128, false, undefined, true);
    await databases.createUrlAttribute(DATABASE_ID, BOOKS_COLLECTION_ID, 'cover_url', false);
    await databases.createStringAttribute(DATABASE_ID, BOOKS_COLLECTION_ID, 'file_id', 36, true);
    await databases.createIntegerAttribute(DATABASE_ID, BOOKS_COLLECTION_ID, 'gutenberg_id', true);
    console.log("Books attributes created.");
  } catch (e: any) {
    if (e.code === 409) console.log("Books collection already exists.");
    else throw e;
  }

  try {
    // Create ReadingSessions Collection
    await databases.createCollection(DATABASE_ID, SESSIONS_COLLECTION_ID, 'ReadingSessions', [
      Permission.read(Role.users()),
      Permission.write(Role.users()),
    ]);
    console.log("ReadingSessions collection created.");

    // ReadingSessions Attributes
    await databases.createStringAttribute(DATABASE_ID, SESSIONS_COLLECTION_ID, 'user_id', 36, true);
    await databases.createStringAttribute(DATABASE_ID, SESSIONS_COLLECTION_ID, 'book_id', 36, true);
    await databases.createBooleanAttribute(DATABASE_ID, SESSIONS_COLLECTION_ID, 'is_liked', false, false);
    await databases.createStringAttribute(DATABASE_ID, SESSIONS_COLLECTION_ID, 'progress_cfi', 1024, false);
    await databases.createStringAttribute(DATABASE_ID, SESSIONS_COLLECTION_ID, 'status', 20, false, 'unread');
    await databases.createIntegerAttribute(DATABASE_ID, SESSIONS_COLLECTION_ID, 'pages_turned', false, 0);
    await databases.createDatetimeAttribute(DATABASE_ID, SESSIONS_COLLECTION_ID, 'last_read_at', false);
    console.log("ReadingSessions attributes created.");
  } catch (e: any) {
    if (e.code === 409) console.log("ReadingSessions collection already exists.");
    else throw e;
  }

  try {
    // Create Storage Bucket
    await storage.createBucket(BUCKET_ID, 'EPUB_Files', [
      Permission.read(Role.any()),
      Permission.write(Role.users()),
    ], true);
    console.log("EPUB Storage Bucket created.");
  } catch (e: any) {
    if (e.code === 409) {
       console.log("Storage Bucket ID already exists.");
    } else if (e.code === 403) {
      console.log("Plan limit reached. Checking for existing bucket named 'EPUB_Files'...");
      const bucketList = await storage.listBuckets();
      const existing = bucketList.buckets.find(b => b.name === 'EPUB_Files' || b.$id === BUCKET_ID);
      if (existing) {
        console.log(`Found existing bucket: ${existing.$id}. Proceeding with it.`);
      } else {
        throw new Error("Could not create bucket due to plan limits, and no existing 'EPUB_Files' was found.");
      }
    } else {
      throw e;
    }
  }
}

async function fetchBooks() {
  console.log("Fetching top 500 books from Gutendex...");
  let books: any[] = [];
  let nextUrl = 'https://gutendex.com/books/?languages=en&mime_type=application%2Fepub%2Bzip';

  while (books.length < 500 && nextUrl) {
    const response = await axios.get(nextUrl);
    books = [...books, ...(response.data as any).results];
    nextUrl = (response.data as any).next;
    console.log(`Fetched ${books.length} metadata records...`);
  }

  return books.slice(0, 500);
}

async function processBook(book: any) {
  try {
    const epubUrl = book.formats['application/epub+zip'];
    if (!epubUrl) return;

    console.log(`Processing: ${book.title} (Gutenberg ID: ${book.id})`);

    // Download EPUB
    const response = await axios.get(epubUrl, { responseType: 'arraybuffer' });
    const buffer = Buffer.from(response.data as any);

    // Upload to Appwrite Storage
    // Use InputFile to handle buffer upload accurately in Node environment
    const fileId = ID.unique();
    await storage.createFile(BUCKET_ID, fileId, InputFile.fromBuffer(buffer, `${book.id}.epub`));

    // Create Database Entry
    await databases.createDocument(DATABASE_ID, BOOKS_COLLECTION_ID, ID.unique(), {
      title: book.title,
      author: book.authors[0]?.name || 'Unknown Author',
      subjects: book.subjects.slice(0, 10), // Limit number of subjects
      cover_url: book.formats['image/jpeg'] || '',
      file_id: fileId,
      gutenberg_id: book.id,
    });

    console.log(`SUCCESS: ${book.title}`);
  } catch (err: any) {
    console.error(`FAILED: ${book.title} - ${err.message}`);
  }
}

async function main() {
  await setupInfrastructure();
  const books = await fetchBooks();

  console.log("Starting batch processing...");
  // Process in batches to avoid overwhelming the network/server
  const batchSize = 10;
  for (let i = 0; i < books.length; i += batchSize) {
    const batch = books.slice(i, i + batchSize);
    await Promise.all(batch.map(processBook));
    console.log(`Completed batch ${i / batchSize + 1} / ${Math.ceil(books.length / batchSize)}`);
  }

  console.log("Seeding complete!");
}

main().catch(err => {
  console.error("Critical Failure:", err);
});
