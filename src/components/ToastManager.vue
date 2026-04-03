<script setup lang="ts">
import { useUIStore } from '@/stores/ui'
import { X, CheckCircle, AlertCircle, Info, Loader2 } from 'lucide-vue-next'

const ui = useUIStore()
</script>

<template>
  <div class="fixed top-6 right-6 z-[1000] flex flex-col gap-3 w-full max-w-sm pointer-events-none">
    <TransitionGroup name="toast">
      <div
        v-for="notification in ui.notifications"
        :key="notification.id"
        class="pointer-events-auto flex items-start gap-3 p-4 rounded-2xl border shadow-2xl backdrop-blur-xl transition-all duration-500"
        :class="[
          notification.type === 'success' ? 'bg-emerald-50/90 dark:bg-emerald-500/10 border-emerald-200/50 dark:border-emerald-500/20 text-emerald-900 dark:text-emerald-400' :
          notification.type === 'error' ? 'bg-rose-50/90 dark:bg-rose-500/10 border-rose-200/50 dark:border-rose-500/20 text-rose-900 dark:text-rose-400' :
          'bg-white/90 dark:bg-[#1C1C1E]/90 border-[#EBEBEF] dark:border-white/5 text-[#1C1C1E] dark:text-[#F5F5F7]'
        ]"
      >
        <!-- Icon -->
        <div class="shrink-0 mt-0.5">
          <CheckCircle v-if="notification.type === 'success'" class="w-5 h-5 text-emerald-500" />
          <AlertCircle v-else-if="notification.type === 'error'" class="w-5 h-5 text-rose-500" />
          <Loader2 v-else-if="notification.duration === 0" class="w-5 h-5 text-[#AE0001] animate-spin" />
          <Info v-else class="w-5 h-5 text-[#AE0001]" />
        </div>

        <!-- Content -->
        <div class="flex-1 min-w-0">
          <p class="text-sm font-bold leading-tight">{{ notification.message }}</p>
        </div>

        <!-- Close -->
        <button
          @click="ui.removeNotification(notification.id)"
          class="shrink-0 p-1 hover:bg-black/5 dark:hover:bg-white/5 rounded-lg transition-colors"
        >
          <X class="w-4 h-4 opacity-40 hover:opacity-100" />
        </button>
      </div>
    </TransitionGroup>
  </div>
</template>

<style scoped>
.toast-enter-active,
.toast-leave-active {
  transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}

.toast-enter-from {
  opacity: 0;
  transform: translateX(30px) scale(0.9);
}

.toast-leave-to {
  opacity: 0;
  transform: scale(0.9);
  filter: blur(4px);
}

.toast-move {
  transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}
</style>
