<script setup lang="ts">
import { useReaderStore, type ReadingMode } from '@/stores/reader'
import { BookOpen, Keyboard } from 'lucide-vue-next'
import { computed, ref } from 'vue'

const reader = useReaderStore()

const modes: { key: ReadingMode; label: string; icon: any }[] = [
  { key: 'standard', label: 'Standard', icon: BookOpen },
  { key: 'typing', label: 'Typing', icon: Keyboard },
]

const activeIdx = computed(() => modes.findIndex(m => m.key === reader.activeMode))

const switching = ref(false)

async function selectMode(mode: ReadingMode) {
  if (mode === reader.activeMode || switching.value) return
  switching.value = true
  await reader.setMode(mode)
  switching.value = false
}
</script>

<template>
  <div class="relative flex items-center p-1 rounded-2xl bg-black/10 dark:bg-white/5 gap-1 border theme-border">
    <!-- Sliding indicator -->
    <div
      class="mode-switcher-pill absolute top-1 bottom-1 rounded-xl bg-[#f02e65] shadow-lg shadow-[#f02e65]/30"
      :style="{
        width: `calc(${100 / modes.length}% - 4px)`,
        left: `calc(${(activeIdx * 100) / modes.length}% + 2px)`,
      }"
    />
    
    <button
      v-for="mode in modes"
      :key="mode.key"
      @click="selectMode(mode.key)"
      :disabled="switching"
      class="relative z-10 flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-bold transition-colors duration-300"
      :class="[
        reader.activeMode === mode.key
          ? 'text-white'
          : 'theme-text-soft hover:theme-text'
      ]"
    >
      <component :is="mode.icon" class="w-4 h-4" />
      <span class="hidden sm:inline">{{ mode.label }}</span>
    </button>
  </div>
</template>
