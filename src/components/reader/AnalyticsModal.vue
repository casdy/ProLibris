<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useReaderStore } from '@/stores/reader'
import { Line } from 'vue-chartjs'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title as ChartTitle,
  Tooltip,
  Filler,
} from 'chart.js'
import { Trophy, Target, Zap, Clock, AlertTriangle, ChevronRight, Home } from 'lucide-vue-next'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, ChartTitle, Tooltip, Filler)

const emit = defineEmits<{
  nextChapter: []
  backToDashboard: []
}>()

const reader = useReaderStore()

const chartData = computed(() => ({
  labels: reader.wpmHistory.map(h => `${h.time}s`),
  datasets: [
    {
      label: 'WPM',
      data: reader.wpmHistory.map(h => h.wpm),
      borderColor: '#f02e65',
      backgroundColor: 'rgba(240, 46, 101, 0.12)',
      fill: true,
      tension: 0.4,
      pointRadius: 4,
      pointBackgroundColor: '#f02e65',
      pointBorderColor: '#1a0f05',
      pointBorderWidth: 2,
      borderWidth: 3,
    },
  ],
}))

const chartOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: {
      backgroundColor: '#1a0f05',
      titleColor: '#E8D5A0',
      bodyColor: '#E8D5A0',
      padding: 12,
      cornerRadius: 12,
      displayColors: false,
      borderWidth: 1,
      borderColor: 'rgba(212, 175, 55, 0.2)',
    },
  },
  scales: {
    x: {
      grid: { display: false },
      ticks: { color: '#A08060', font: { size: 10, family: 'Outfit' } },
    },
    y: {
      grid: { color: 'rgba(212, 175, 55, 0.08)' },
      ticks: { color: '#A08060', font: { size: 10, family: 'Outfit' } },
      beginAtZero: true,
    },
  },
}))

const avgWpm = computed(() => {
  if (reader.wpmHistory.length === 0) return 0
  const sum = reader.wpmHistory.reduce((a, b) => a + b.wpm, 0)
  return Math.round(sum / reader.wpmHistory.length)
})

const peakWpm = computed(() => reader.sessionStats.peakWpm)
const accuracy = computed(() => reader.sessionStats.accuracy)

const elapsedFormatted = computed(() => {
  const ms = reader.sessionStats.elapsedMs
  const seconds = Math.floor(ms / 1000)
  const minutes = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${minutes}:${String(secs).padStart(2, '0')}`
})

const hasNextChapter = computed(() => reader.currentSpineIndex < reader.totalChapters - 1)

const problemKeysDisplay = computed(() => reader.problemKeys)

const isTypingMode = computed(() => reader.activeMode === 'typing')
</script>

<template>
  <Transition name="analytics">
    <div
      v-if="reader.showAnalyticsModal"
      class="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
    >
      <div class="w-full max-w-xl theme-bg rounded-[2.5rem] shadow-2xl border-4 theme-border overflow-hidden">
        <!-- Header -->
        <div class="px-8 pt-8 pb-4 text-center">
          <div class="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[#f02e65]/10 mb-4">
            <Trophy class="w-8 h-8 text-[#f02e65]" />
          </div>
          <h2 class="text-2xl font-bold theme-text mb-1">Chapter Complete!</h2>
          <p class="text-sm text-[var(--text-soft)] opacity-70 font-medium">
            {{ reader.chapterTitle }}
          </p>
        </div>

        <!-- Stats Grid -->
        <div class="px-8 py-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div class="bg-black/10 dark:bg-white/5 rounded-2xl p-4 text-center border theme-border shadow-inner">
            <Zap class="w-5 h-5 text-[#f02e65] mx-auto mb-2" />
            <p class="text-2xl font-black theme-text">{{ avgWpm }}</p>
            <p class="text-[9px] uppercase tracking-widest text-[var(--text-soft)] opacity-60 font-bold">Avg WPM</p>
          </div>

          <div class="bg-black/10 dark:bg-white/5 rounded-2xl p-4 text-center border theme-border shadow-inner">
            <Zap class="w-5 h-5 text-emerald-500 mx-auto mb-2" />
            <p class="text-2xl font-black theme-text">{{ peakWpm }}</p>
            <p class="text-[9px] uppercase tracking-widest text-[var(--text-soft)] opacity-60 font-bold">Peak WPM</p>
          </div>

          <div v-if="isTypingMode" class="bg-black/10 dark:bg-white/5 rounded-2xl p-4 text-center border theme-border shadow-inner">
            <Target class="w-5 h-5 text-blue-500 mx-auto mb-2" />
            <p class="text-2xl font-black theme-text">{{ accuracy }}%</p>
            <p class="text-[9px] uppercase tracking-widest text-[var(--text-soft)] opacity-60 font-bold">Accuracy</p>
          </div>

          <div class="bg-black/10 dark:bg-white/5 rounded-2xl p-4 text-center border theme-border shadow-inner">
            <Clock class="w-5 h-5 text-amber-500 mx-auto mb-2" />
            <p class="text-2xl font-black theme-text">{{ elapsedFormatted }}</p>
            <p class="text-[9px] uppercase tracking-widest text-[var(--text-soft)] opacity-60 font-bold">Time</p>
          </div>
        </div>

        <!-- WPM Chart -->
        <div v-if="reader.wpmHistory.length > 1" class="px-8 py-4">
          <p class="text-xs font-bold uppercase tracking-widest text-[var(--text-soft)] opacity-60 mb-3">
            WPM Over Time
          </p>
          <div class="h-40 bg-black/10 dark:bg-white/5 rounded-2xl p-4 border theme-border">
            <Line :data="chartData" :options="(chartOptions as any)" />
          </div>
        </div>

        <!-- Problem Keys -->
        <div v-if="isTypingMode && problemKeysDisplay.length > 0" class="px-8 py-3">
          <div class="flex items-center gap-2 mb-2">
            <AlertTriangle class="w-4 h-4 text-amber-500" />
            <p class="text-xs font-bold uppercase tracking-widest text-[var(--text-soft)] opacity-60">
              Problem Keys
            </p>
          </div>
          <div class="flex flex-wrap gap-2">
            <span
              v-for="key in problemKeysDisplay"
              :key="key"
              class="inline-flex items-center justify-center min-w-[2rem] h-8 px-2 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-lg text-sm font-bold font-mono"
            >
              {{ key === ' ' ? '⎵' : key }}
            </span>
          </div>
        </div>

        <!-- Actions -->
        <div class="px-8 py-6 flex items-center gap-3">
          <button
            @click="emit('backToDashboard')"
            class="flex-1 py-3.5 px-4 bg-black/10 dark:bg-white/5 rounded-2xl text-sm font-bold theme-text hover:theme-text-soft transition-all active:scale-[0.98] border theme-border flex items-center justify-center gap-2"
          >
            <Home class="w-4 h-4" />
            Dashboard
          </button>
          <button
            v-if="hasNextChapter"
            @click="emit('nextChapter')"
            class="flex-1 py-3.5 px-4 bg-[#f02e65] text-white rounded-2xl text-sm font-bold shadow-lg shadow-[#f02e65]/20 hover:shadow-[#f02e65]/40 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
          >
            Next Chapter
            <ChevronRight class="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>
