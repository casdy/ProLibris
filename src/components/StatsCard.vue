<script setup lang="ts">
import { type LucideIcon } from 'lucide-vue-next'

defineProps<{
  title: string
  value: string | number
  icon: LucideIcon
  color: string
}>()
</script>

<template>
  <div class="theme-card backdrop-blur-xl border theme-border p-6 rounded-3xl shadow-xl shadow-black/10 hover:transform hover:-translate-y-1 transition-all duration-300">
    <div class="flex items-start justify-between">
      <div class="space-y-3">
        <p class="theme-text-soft font-bold text-[10px] uppercase tracking-widest opacity-60">
          {{ title }}
        </p>
        <h3 class="text-3xl font-bold theme-text">
          {{ value }}
        </h3>
      </div>
      <div 
        :class="color"
        class="p-3.5 rounded-2xl shadow-lg flex items-center justify-center text-white"
      >
        <component :is="icon" class="w-6 h-6 stroke-[2.5]" />
      </div>
    </div>
  </div>
</template>
