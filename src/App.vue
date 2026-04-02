<script setup lang="ts">
import { onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useUIStore } from '@/stores/ui'

const auth = useAuthStore()
const ui = useUIStore()

onMounted(() => {
  auth.init()
  ui.applyTheme()
})
</script>

<template>
  <router-view v-if="!auth.loading" />
  <div v-else class="flex items-center justify-center min-h-screen">
    <div class="w-12 h-12 border-4 border-[#f02e65]/20 border-t-[#f02e65] rounded-full animate-spin"></div>
  </div>
</template>
