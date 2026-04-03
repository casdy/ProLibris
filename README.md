# 🏛️ ProLibris

**The Premium Digital Sanctuary for Modern Readers.**

ProLibris is a high-fidelity, magical reading platform designed to transform your digital library into an immersive sanctuary. Built with a focus on deep work and aesthetic excellence, it combines state-of-the-art reading engines with a stunning, reactive interface.

---

## ✨ Core Features

### 📖 The Magical Bookshelf
- **Dynamic 3D Spines**: Every book in your collection is rendered with a unique, procedurally generated spine based on its content.
- **Persistent Decks**: Organized categories for *Continue Reading*, *Enchanted Favorites*, and *Legendary Completions*.
- **Interactive Parchment**: Detailed book metadata presented on an elegant, animated parchment overlay with reading statistics.

### 🦉 High-Performance Hybrid Discovery
- **Local-First Architecture**: Refactored for near-instant rendering. All searches and page turns prioritize your private Appwrite library.
- **Eager Pre-fetching**: A background engine (The Magical Owl) anticipates your navigation, pre-caching neighboring pages while you browse.
- **Gutendex Integration**: Seamless fallback to the Gutenberg public archive with background backfilling. No more "blank screen" issues or CORS/503 errors.

### ⚡ Advanced Reader Engines
- **Standard Mode (The Classic)**: Distraction-free, premium EPUB rendering powered by `epubjs`.
- **Focus Engine (Speed Read)**:
  - **Visual Pacing**: Eliminate subvocalization with a steady mathematical pace.
  - **Zero-Latency Scraping**: Real-time text extraction for a continuous, "gapless" reading flow.
  - **On-the-Fly Zoom**: Adjust typography and WPM without leaving the focus state.
- **Audio Paced Mode**: Integrated support for neural TTS (via Puter.js) for high-fidelity audio synthesis.

### 🎨 Design & UX (Wizarding Aesthetic)
- **Scarlet & Gold Theme**: A premium visual language featuring blurred backdrops, Wizarding Gold highlights, and smooth Transitions.
- **Mobile-First PWA**: Fully optimized for the Home Screen with manifest support and custom Apple Touch Icons.
- **Universal Mode**: Seamless transition between Magical Dark and Wizarding Light themes.

---

## 🚀 Getting Started

### 1. Prerequisites
- **Node.js (v18+)**
- **Appwrite Project**: (Cloud or Self-hosted)
- **API Access**: Access to `https://gutendex.com` (public fallback).

### 2. Installation
```bash
git clone https://github.com/Antigravity-AI/prolibris.git
cd ProLibris
npm install
```

### 3. Configuration
Copy `.env.example` to `.env.local` and fill in your Appwrite credentials:
```env
VITE_APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1
VITE_APPWRITE_PROJECT_ID=your_id
VITE_APPWRITE_DATABASE_ID=your_db
VITE_APPWRITE_COLLECTION_ID=your_coll
VITE_APPWRITE_BUCKET_ID=your_bucket
```

### 4. Operations & Diagnostics
ProLibris includes several high-performance utility scripts:
- **Seed Database**: Initialize your magical collection.
  ```bash
  npm run seed-db
  ```
- **Book Count**: Run diagnostic checks on your repository.
  ```bash
  npx ts-node scripts/count-books.ts
  ```

### 5. Launch
```bash
npm run dev
```

---

## 🛠️ Tech Stack
- **Frontend**: [Vue.js 3](https://vuejs.org/) + [Vite](https://vitejs.dev/)
- **State Management**: [Pinia](https://pinia.vuejs.org/) (High-Performance Reading State)
- **Backend-as-a-Service**: [Appwrite](https://appwrite.io/) (Archival Storage & Session Sync)
- **Reading Engine**: [ePub.js](https://github.com/futurepress/epub.js/)
- **Icons**: [Lucide Vue Next](https://lucide.dev/)
- **Branding**: Customized magical owl branding with PWA manifest integration.

---

## 📜 License
This project is licensed under the MIT License.

*Crafted with precision by the ProLibris Engineering Team.*