# 🏛️ ProLibris

**The Premium Digital Sanctuary for Modern Readers.**

ProLibris is a high-fidelity, magical reading platform designed to transform your digital library into an immersive sanctuary. Built with a focus on deep work and aesthetic excellence, it combines state-of-the-art reading engines with a stunning, reactive interface.

---

## ✨ Core Features

### 📖 The Magical Bookshelf
- **Dynamic 3D Spines**: Every book in your collection is rendered with a unique, procedurally generated spine based on its content.
- **Persistent Decks**: Organized categories for *Continue Reading*, *Enchanted Favorites*, and *Legendary Completions*.
- **Interactive Parchment**: Detailed book metadata presented on an elegant, animated parchment overlay with reading statistics.

### ⚡ Advanced Reader Engine
- **EPUB Streaming**: Pure, high-performance EPUB rendering powered by `epubjs`, streaming directly from Appwrite cloud storage.
- **Intelligent Modes**:
  - **Standard**: A classic, distraction-free reading experience.
  - **Paced Mode**: Dynamic markers and auto-scrolling to help you maintain a consistent reading rhythm.
  - **Interactive Mode**: Specialized modes for deep engagement and focus.
- **Customization**: Granular control over typography, font size, and themes (Universal Dark/Light modes).

### ☁️ Cloud Infrastructure
- **Appwrite Backend**: Seamless integration with Appwrite for authentication and real-time data persistence.
- **Session Sync**: Your progress, reading speed, and preferences are synced across all devices instantly.
- **Secure Storage**: Fully encrypted and private book storage in dedicated cloud buckets.

### 🎨 Design & UX
- **Glassmorphism & Gold Accents**: A premium visual language featuring blurred backdrops, golden highlights, and smooth transitions.
- **Micro-Animations**: Subtle UI feedback and "Magical Particles" that bring your library to life.
- **Responsive Architecture**: Built with Vue 3, Pinia, and Tailwind CSS for a lightning-fast, mobile-first experience.

---

## 🚀 Getting Started

### 1. Prerequisites
- Node.js (v18+)
- An Appwrite project (Cloud or Self-hosted)

### 2. Installation
```bash
git clone https://github.com/Antigravity-AI/prolibris.git
cd ProLibris
npm install
```

### 3. Configuration
Copy the `.env.example` to `.env` and fill in your Appwrite credentials:
```env
VITE_APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1
VITE_APPWRITE_PROJECT_ID=your_project_id
VITE_APPWRITE_DATABASE_ID=your_db_id
VITE_APPWRITE_COLLECTION_ID=your_collection_id
VITE_APPWRITE_BUCKET_ID=your_bucket_id
```

### 4. Run Development Server
```bash
npm run dev
```

---

## 🛠️ Tech Stack
- **Frontend**: [Vue.js 3](https://vuejs.org/) + [Vite](https://vitejs.dev/)
- **State Management**: [Pinia](https://pinia.vuejs.org/)
- **Backend-as-a-Service**: [Appwrite](https://appwrite.io/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Icons**: [Lucide Vue Next](https://lucide.dev/)
- **Typography**: [Google Fonts (Outfit & Playfair Display)](https://fonts.google.com/)

---

## 📜 License
This project is licensed under the MIT License.

*Crafted with precision by the ProLibris Team.*