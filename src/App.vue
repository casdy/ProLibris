<script setup lang="ts">
import { onMounted } from 'vue'
import { useUIStore } from '@/stores/ui'
import SplashScreen from '@/components/SplashScreen.vue'
import ToastManager from '@/components/ToastManager.vue'

const ui = useUIStore()

onMounted(() => {
  ui.applyTheme()
  ui.initializePlatform()
})
</script>

<template>
  <div class="min-h-screen theme-bg">
    <router-view v-if="ui.isInitialized" />
    <SplashScreen :is-ready="ui.isInitialized" />
    <ToastManager />
  </div>
</template>
