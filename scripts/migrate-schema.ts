import { Client, Databases } from 'node-appwrite';
import * as dotenv from 'dotenv';

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

const DATABASE_ID = 'ReaderAppDB';
const SESSIONS_COLLECTION_ID = 'ReadingSessions';

interface AttributeDef {
  name: string;
  create: () => Promise<any>;
}

async function migrate() {
  console.log("🚀 Starting ReadingSessions schema migration...\n");

  const attributes: AttributeDef[] = [
    {
      name: 'mode_preference',
      create: () => databases.createStringAttribute(
        DATABASE_ID, SESSIONS_COLLECTION_ID, 'mode_preference', 20, false, 'standard'
      ),
    },
    {
      name: 'target_read_wpm',
      create: () => databases.createIntegerAttribute(
        DATABASE_ID, SESSIONS_COLLECTION_ID, 'target_read_wpm', false, 250
      ),
    },
    {
      name: 'avg_type_wpm',
      create: () => databases.createIntegerAttribute(
        DATABASE_ID, SESSIONS_COLLECTION_ID, 'avg_type_wpm', false, 0
      ),
    },
    {
      name: 'avg_accuracy',
      create: () => databases.createFloatAttribute(
        DATABASE_ID, SESSIONS_COLLECTION_ID, 'avg_accuracy', false, 100.0
      ),
    },
    {
      name: 'problem_keys',
      create: () => databases.createStringAttribute(
        DATABASE_ID, SESSIONS_COLLECTION_ID, 'problem_keys', 8, false, undefined, true
      ),
    },
  ];

  for (const attr of attributes) {
    try {
      await attr.create();
      console.log(`  ✅ Created attribute: ${attr.name}`);
    } catch (e: any) {
      if (e.code === 409) {
        console.log(`  ⏭️  Attribute already exists: ${attr.name}`);
      } else {
        console.error(`  ❌ Failed to create ${attr.name}:`, e.message);
      }
    }
  }

  console.log("\n✨ Migration complete!");
}

migrate().catch(err => {
  console.error("Critical migration failure:", err);
  process.exit(1);
});
