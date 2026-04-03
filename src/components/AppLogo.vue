<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { Sparkles } from 'lucide-vue-next'

const props = defineProps({
  size: {
    type: String,
    default: 'md'
  }
})

const pixelMap: Record<string, number> = {
  sm: 40,
  md: 64,
  lg: 112,
  xl: 180
}

const canvasRef = ref<HTMLCanvasElement | null>(null)
const isLoading = ref(true)
const hasError = ref(false)

const processChromaKey = () => {
  const img = new Image()
  img.crossOrigin = "anonymous"
  img.src = "/logo-chroma.png"
  
  img.onload = () => {
    if (!canvasRef.value) return
    const canvas = canvasRef.value
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // High res processing
    const size = 512 
    canvas.width = size
    canvas.height = size
    ctx.drawImage(img, 0, 0, size, size)

    const imageData = ctx.getImageData(0, 0, size, size)
    const data = imageData.data

    // Chroma key removal (Pure Green #00FF00)
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i]
      const g = data[i + 1]
      const b = data[i + 2]
      
      // If green is the dominant color and above a threshold
      if (g > 150 && g > r * 1.4 && g > b * 1.4) {
        data[i + 3] = 0 // Transparent
      }
    }
    
    ctx.putImageData(imageData, 0, 0)
    isLoading.value = false
  }

  img.onerror = () => {
    console.error('Failed to load chroma sticker')
    hasError.value = true
    isLoading.value = false
  }
}

onMounted(() => {
  processChromaKey()
})

watch(() => props.size, () => {
  // Size handled by CSS
})
</script>

<template>
  <div 
    class="logo-root" 
    :style="{ width: (pixelMap[props.size] || 64) + 'px', height: (pixelMap[props.size] || 64) + 'px' }"
  >
    <div class="logo-container" :class="{ 'loading': isLoading }">
      <canvas 
        ref="canvasRef" 
        v-show="!hasError && !isLoading"
        class="owl-canvas"
      ></canvas>
      <Sparkles v-if="hasError" class="fallback-icon" />
      <div v-if="isLoading" class="loader-pulse"></div>
    </div>
  </div>
</template>

<style scoped>
.logo-root {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  position: relative;
  flex-shrink: 0;
}

.logo-container {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  perspective: 1200px;
  position: relative;
}

.owl-canvas {
  width: 100%;
  height: 100%;
  object-fit: contain;
  /* Ultimate shadow for stand-alone silhouette */
  filter: drop-shadow(0 4px 15px rgba(0, 0, 0, 0.5)) drop-shadow(0 0 2px rgba(0, 0, 0, 0.8));
  animation: owl-head-turn 12s cubic-bezier(0.45, 0, 0.55, 1) infinite;
  transform-origin: center center;
}

.fallback-icon {
  width: 80%;
  height: 80%;
  color: #EEBA30; /* Wizarding Gold */
  animation: pulse 2s infinite;
}

.loader-pulse {
  width: 40%;
  height: 40%;
  background: #AE0001; /* Scarlet */
  border-radius: 50%;
  animation: pulse 1.5s infinite;
  opacity: 0.5;
}

@keyframes owl-head-turn {
  0%, 15%, 85%, 100% { transform: rotateY(0deg); }
  25%, 45% { transform: rotateY(-22deg) scaleX(0.98); }
  55%, 75% { transform: rotateY(22deg) scaleX(0.98); }
}

@keyframes pulse {
  0%, 100% { opacity: 0.8; transform: scale(1); }
  50% { opacity: 0.3; transform: scale(0.8); }
}

/* Add a premium magical pedestal glow behind the owl - NOW GOLD */
.logo-root::before {
  content: '';
  position: absolute;
  inset: -20%;
  background: radial-gradient(circle, rgba(238, 186, 48, 0.2) 0%, transparent 70%);
  animation: bg-pulse 10s ease-in-out infinite;
  z-index: -1;
  pointer-events: none;
}

@keyframes bg-pulse {
  0%, 100% { transform: scale(0.9); opacity: 0.2; }
  50% { transform: scale(1.1); opacity: 0.5; }
}
</style>
