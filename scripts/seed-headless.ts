import { Client, Databases, Storage, ID, Query, Permission, Role } from 'node-appwrite';
import { InputFile } from 'node-appwrite/file';
import fs from 'fs-extra';
import { readdir, readFile, stat } from 'fs/promises';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';

// Setup __dirname for ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: '.env.local' });

const {
  APPWRITE_ENDPOINT,
  APPWRITE_PROJECT_ID,
  APPWRITE_API_KEY
} = process.env;

if (!APPWRITE_ENDPOINT || !APPWRITE_PROJECT_ID || !APPWRITE_API_KEY) {
  console.error("❌ Missing Appwrite environmental variables in .env.local");
  process.exit(1);
}

// Configuration
const DATABASE_ID = 'ReaderAppDB'; 
const BOOKS_COLLECTION_ID = 'Books';
const STORAGE_BUCKET_ID = 'Library_Assets';
const MASTER_LIBRARY_PATH = path.join(process.cwd(), 'Master_Library');

// Initialize Appwrite Client
const client = new Client()
  .setEndpoint(APPWRITE_ENDPOINT)
  .setProject(APPWRITE_PROJECT_ID)
  .setKey(APPWRITE_API_KEY);

const databases = new Databases(client);
const storage = new Storage(client);

/**
 * Utility: Wait for a specified duration (ms) - helpful for rate limiting
 */
const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

/**
 * The Great Purge: Deletes all documents in the Books collection
 */
async function purgeCollection() {
  console.log("🧹 Starting The Great Purge...");
  let hasMore = true;
  let deletedCount = 0;

  while (hasMore) {
    const response = await databases.listDocuments(DATABASE_ID, BOOKS_COLLECTION_ID, [
      Query.limit(100)
    ]);

    if (response.documents.length === 0) {
      hasMore = false;
      break;
    }

    for (const doc of response.documents) {
      await databases.deleteDocument(DATABASE_ID, BOOKS_COLLECTION_ID, doc.$id);
      deletedCount++;
      if (deletedCount % 10 === 0) console.log(`🗑️ Deleted ${deletedCount} documents...`);
      await delay(100); // Small delay to avoid hammering the API
    }
  }

  console.log(`✅ Purge complete. ${deletedCount} records removed.`);
}

/**
 * Ensure the Library_Assets bucket exists and has correct attributes
 */
async function ensureInfrastructure() {
  console.log("🏗️ Checking infrastructure...");

  // 1. Storage Bucket
  try {
    await storage.getBucket(STORAGE_BUCKET_ID);
    console.log(`📦 Bucket '${STORAGE_BUCKET_ID}' found.`);
  } catch (err: any) {
    if (err.code === 404) {
      console.log(`📦 Creating '${STORAGE_BUCKET_ID}' bucket...`);
      await storage.createBucket(STORAGE_BUCKET_ID, 'Library Assets', [
        Permission.read(Role.any()),
        Permission.write(Role.users()),
      ], true);
    } else {
      throw err;
    }
  }

  // 2. Collection Attributes Migration
  console.log("🔧 Syncing collection schema...");
  
  // List existing attributes to see what we need to delete
  const collection = await databases.getCollection(DATABASE_ID, BOOKS_COLLECTION_ID);
  const existingAttrs = collection.attributes.map(a => a.key);
  
  const targetAttrs = ['title', 'coverImageId', 'markdownFileId'];
  const attrsToDelete = existingAttrs.filter(a => !targetAttrs.includes(a));

  for (const attr of attrsToDelete) {
    try {
      console.log(`🗑️ Deleting old attribute: ${attr}...`);
      await databases.deleteAttribute(DATABASE_ID, BOOKS_COLLECTION_ID, attr);
      // Deletion is async on Appwrite side, but we proceed
    } catch (e: any) {
      console.warn(`⚠️ Could not delete ${attr}: ${e.message}`);
    }
  }

  // Ensure title exists (it should, but we check)
  if (!existingAttrs.includes('title')) {
    await databases.createStringAttribute(DATABASE_ID, BOOKS_COLLECTION_ID, 'title', 512, true);
    console.log("📝 Attribute 'title' created.");
  }

  // Create new attributes
  const newAttrs = [
    { name: 'coverImageId', size: 36 },
    { name: 'markdownFileId', size: 36 }
  ];

  for (const attr of newAttrs) {
    if (!existingAttrs.includes(attr.name)) {
      try {
        await databases.createStringAttribute(DATABASE_ID, BOOKS_COLLECTION_ID, attr.name, attr.size, true);
        console.log(`📝 Attribute '${attr.name}' created.`);
        await delay(2000); // Give Appwrite time to process attribute creation
      } catch (e: any) {
        if (e.code !== 409) console.warn(`⚠️ Attribute ${attr.name}: ${e.message}`);
      }
    }
  }
  
  console.log("✅ Infrastructure ready.");
}

/**
 * Process a single book folder
 */
async function processBook(bookFolderName: string) {
  const bookPath = path.join(MASTER_LIBRARY_PATH, bookFolderName);
  const imagesPath = path.join(bookPath, 'images');
  
  // 1. Find the Markdown file
  const files = await readdir(bookPath);
  const mdFile = files.find(f => f.endsWith('.md'));
  if (!mdFile) {
    console.warn(`⚠️ No markdown file found in ${bookFolderName}. Skipping.`);
    return;
  }

  console.log(`📖 Processing: ${bookFolderName}...`);

  // 2. Process Images
  const imageMap: Record<string, string> = {};
  let coverImageId = '';

  if (await fs.pathExists(imagesPath)) {
    const imageFiles = await readdir(imagesPath);
    for (const img of imageFiles) {
      const imgPath = path.join(imagesPath, img);
      
      try {
        const fileId = ID.unique();
        const uploadedFile = await storage.createFile(
          STORAGE_BUCKET_ID,
          fileId,
          InputFile.fromPath(imgPath, img)
        );
        
        // Generate the live URL
        // Formula: [endpoint]/storage/buckets/[bucketId]/files/[fileId]/view?project=[projectId]
        const liveUrl = `${APPWRITE_ENDPOINT}/storage/buckets/${STORAGE_BUCKET_ID}/files/${uploadedFile.$id}/view?project=${APPWRITE_PROJECT_ID}`;
        
        // Map local path (as used in markdown) to live Appwrite URL
        imageMap[`./images/${img}`] = liveUrl;
        
        // First image is the cover
        if (!coverImageId) coverImageId = uploadedFile.$id;
        
        await delay(200); // Rate limiting
      } catch (err) {
        console.error(`❌ Failed to upload image ${img} for ${bookFolderName}:`, err);
      }
    }
  }

  // 3. Process Markdown Content
  let mdContent = await readFile(path.join(bookPath, mdFile), 'utf-8');

  // Replace links: ![alt](./images/file.jpg) -> ![alt](https://...)
  // Regex matches markdown image syntax
  mdContent = mdContent.replace(/!\[([^\]]*)\]\((.\/images\/[^\)]+)\)/g, (match, alt, localPath) => {
    if (imageMap[localPath]) {
      return `![${alt}](${imageMap[localPath]})`;
    }
    return match; // Keep as is if not found
  });

  // 4. Upload rewritten Markdown file
  const mdBuffer = Buffer.from(mdContent, 'utf-8');
  const markdownFileId = ID.unique();
  await storage.createFile(
    STORAGE_BUCKET_ID,
    markdownFileId,
    InputFile.fromBuffer(mdBuffer, `${bookFolderName}.md`)
  );
  await delay(200);

  // 5. Create Database Entry
  // We use the folder name as title if we can't find a better one,
  // though we could parse the MD frontmatter if it exists.
  const title = bookFolderName.replace(/_\d+$/, '').replace(/_/g, ' ');

  await databases.createDocument(DATABASE_ID, BOOKS_COLLECTION_ID, ID.unique(), {
    title: title,
    coverImageId: coverImageId,
    markdownFileId: markdownFileId
  });

  console.log(`✅ Success: ${title}`);
}

/**
 * Main Execution
 */
async function main() {
  console.log("🚀 Starting Headless Seeding Engine...");
  
  try {
    await ensureInfrastructure();
    await purgeCollection();

    const bookFolders = await readdir(MASTER_LIBRARY_PATH);
    console.log(`📂 Found ${bookFolders.length} folders in Master_Library.`);

    for (const folder of bookFolders) {
      if (!(await stat(path.join(MASTER_LIBRARY_PATH, folder))).isDirectory()) continue;
      
      try {
        await processBook(folder);
      } catch (err) {
        console.error(`❌ Critical error processing ${folder}:`, err);
      }
      
      await delay(500); // Overall batch delay
    }

    console.log("🏁 All operations complete.");
  } catch (err) {
    console.error("💥 Fatal error in seeding engine:", err);
    process.exit(1);
  }
}

main();
