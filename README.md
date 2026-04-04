# 🏛️ ProLibris 

**The Archival Sanctuary for Distinguished Seekers.**

ProLibris is a high-fidelity, magical reading portal designed to transform your digital collection into an immersive, private sanctuary. Built for the deep work of literary archival and scholarly focus, it combines state-of-the-art reading engines with a stunning, resonant interface.

---

## ✨ Archival Intelligence

### 📖 The Enchanted Bookshelf
- **Dynamic 3D Spines**: Every tome is rendered with a unique, procedurally generated spine that reflects its archival identity.
- **Persistent Decks**: Intelligent organization into *Continue Reading*, *Vaulted Favorites*, and *Mastered Chronicles*.
- **Parchment Analytics**: Detailed metadata presented on animated parchment, featuring real-time reading intensity and archival progress.

### 🦉 The Archival Sanctuary (Discovery Engine)
- **High-Performance Native Catalog**: Near-instant rendering of thousands of books. All searches and navigations are powered directly by your private Appwrite vault.
- **Eager Pre-fetching**: The system anticipates your archival journey, pre-caching neighboring pages in the background for a zero-latency experience.
- **Global Search**: Search your entire synchronized collection with server-side precision using Appwrite Queries.

### ⚡ Professional Reading Engines
- **Standard Mode**: Distraction-free, premium EPUB rendering with precision typography.
- **Archival Focus (Speed Read)**: 
  - **Fluid Pacing**: Eliminate subvocalization with a steady, mathematically driven visual rhythm.
  - **Zero-Latency Text Extraction**: Real-time content scraping for a continuous, "gapless" reading flow.
  - **Live Calibration**: Adjust WPM and typography instantly from the focus dashboard.
- **Binaural Paced Mode**: Integrated neural TTS (via Puter.js) for high-fidelity audio synthesis and synchronization.

### 📈 Intelligent Mastery Tracking
- **Unit-Based Mastery**: No more binary tracking. Your "Collection Growth" is driven by a page-fidelity algorithm (250 pages = 1 Archival Unit).
- **Seeker Status**: Real-time tracking of reading streaks, WPM peaks, and accuracy across your entire library history.

---

## 🎨 Professional Design System

- **Scarlet & Gold Aesthetic**: A premium visual grammar featuring glassmorphism, Wizarding Gold accents, and reactive transitions.
- **Archival Workstation Logic**: Global system-wide scaling (88%) for a denser, more information-rich research environment.
- **Universal Portability**: Progressive Web App (PWA) manifest support with a high-definition "Magical Owl" favicon and home-screen identity.

---

## 🚀 Deployment & Archival Setup

### 1. Prerequisites
- **Node.js (v18+)**
- **Appwrite Instance**: (Cloud or Self-hosted Archival Backend)

### 2. Initialization
```bash
git clone https://github.com/Antigravity-AI/prolibris.git
cd ProLibris
npm install
```

### 3. Archival Configuration
Create `.env.local` with your archival credentials:
```env
VITE_APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1
VITE_APPWRITE_PROJECT_ID=your_id
VITE_APPWRITE_DATABASE_ID=your_db
VITE_APPWRITE_COLLECTION_ID=your_coll
VITE_APPWRITE_BUCKET_ID=your_bucket
```

### 4. Manifestation
```bash
npm run dev
```

---

*Crafted with absolute precision for the ProLibris Scholarly Archive.*