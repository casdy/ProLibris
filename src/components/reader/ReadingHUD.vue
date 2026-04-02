<script setup lang="ts">
import { useReaderStore } from '@/stores/reader'
import { computed } from 'vue'
import { Gauge, Target, Clock, TrendingUp } from 'lucide-vue-next'

const reader = useReaderStore()

const wpmDisplay = computed(() => reader.sessionStats.currentWpm || 0)
const accuracyDisplay = computed(() => reader.sessionStats.accuracy)
const progressDisplay = computed(() => reader.chapterProgress)
const timeDisplay = computed(() => reader.estimatedTimeRemaining || '—')

const accuracyColor = computed(() => {
  const acc = accuracyDisplay.value
  if (acc >= 95) return 'text-emerald-500'
  if (acc >= 85) return 'text-amber-500'
  return 'text-red-500'
})

const accuracyBg = computed(() => {
  const acc = accuracyDisplay.value
  if (acc >= 95) return 'bg-emerald-500/10'
  if (acc >= 85) return 'bg-amber-500/10'
  return 'bg-red-500/10'
})

const showAccuracy = computed(() => reader.activeMode === 'typing')
const showWpm = computed(() => reader.activeMode !== 'standard')
</script>

<template>
  <div
    v-if="reader.activeMode !== 'standard'"
    class="hud-glass border rounded-2xl px-4 py-2.5 flex items-center gap-4 sm:gap-6 text-sm font-bold transition-all duration-300"
  >
    <!-- WPM -->
    <div v-if="showWpm" class="flex items-center gap-2">
      <div class="p-1.5 rounded-lg bg-[#f02e65]/10">
        <Gauge class="w-4 h-4 text-[#f02e65]" />
      </div>
      <div class="flex flex-col">
        <span class="text-[9px] uppercase tracking-widest text-[var(--text-soft)] opacity-70">WPM</span>
        <span class="hud-stat text-base font-black theme-text">{{ wpmDisplay }}</span>
      </div>
    </div>

    <!-- Accuracy -->
    <div v-if="showAccuracy" class="flex items-center gap-2">
      <div class="p-1.5 rounded-lg" :class="accuracyBg">
        <Target class="w-4 h-4" :class="accuracyColor" />
      </div>
      <div class="flex flex-col">
        <span class="text-[9px] uppercase tracking-widest text-[var(--text-soft)] opacity-70">Accuracy</span>
        <span class="hud-stat text-base font-black" :class="accuracyColor">{{ accuracyDisplay }}%</span>
      </div>
    </div>

    <!-- Progress Bar -->
    <div class="flex-1 min-w-[80px]">
      <div class="flex items-center justify-between mb-1">
        <span class="text-[9px] uppercase tracking-widest text-[var(--text-soft)] opacity-70">Progress</span>
        <span class="text-[10px] font-black text-[#f02e65]">{{ progressDisplay }}%</span>
      </div>
      <div class="h-1.5 bg-black/5 dark:bg-white/5 rounded-full overflow-hidden">
        <div class="progress-bar-fill h-full rounded-full" :style="{ width: `${progressDisplay}%` }" />
      </div>
    </div>

    <!-- Time Remaining -->
    <div class="hidden sm:flex items-center gap-2">
      <div class="p-1.5 rounded-lg bg-amber-500/10">
        <Clock class="w-4 h-4 text-amber-500" />
      </div>
      <div class="flex flex-col">
        <span class="text-[9px] uppercase tracking-widest text-[var(--text-soft)] opacity-70">ETA</span>
        <span class="hud-stat text-xs font-bold theme-text">{{ timeDisplay }}</span>
      </div>
    </div>
  </div>
</template>
