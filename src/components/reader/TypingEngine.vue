<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick, watch, computed } from 'vue'
import { useReaderStore } from '@/stores/reader'

const reader = useReaderStore()
const container = ref<HTMLElement | null>(null)
const activeCharRef = ref<HTMLElement | null>(null)

const mobileInput = ref<HTMLInputElement | null>(null)

// Focus management
const syncFocus = () => {
  mobileInput.value?.focus()
}

// Keystroke handler
const onKeydown = (e: KeyboardEvent) => {
  // Desktop still uses this for common flow
  reader.handleKeystroke(e)
  // Clear input to avoid double-trigger or buffer buildup
  if (mobileInput.value) mobileInput.value.value = ""
  nextTick(scrollToActive)
}

// Mobile-specific input handler
const onInput = (e: Event) => {
  const input = e.target as HTMLInputElement
  const char = input.value.slice(-1)
  if (char) {
    reader.handleTypingInput(char)
    input.value = "" // Always clear
  }
  nextTick(scrollToActive)
}

// Auto-scroll to keep active character centered
const scrollToActive = () => {
  const el = container.value?.querySelector('[data-active="true"]') as HTMLElement
  if (el) {
    el.scrollIntoView({ block: 'center', behavior: 'smooth' })
  }
}

// Watch for chapter complete
watch(() => reader.currentCharIndex, () => {
  nextTick(scrollToActive)
})

onMounted(() => {
  window.addEventListener('keydown', onKeydown)
  syncFocus()
  nextTick(scrollToActive)
})

onUnmounted(() => {
  window.removeEventListener('keydown', onKeydown)
})

// Group chars into visual paragraph lines
const paragraphGroups = computed(() => {
  const groups: { chars: typeof reader.charTokens; paragraphIndex: number }[] = []
  let currentGroup: typeof reader.charTokens = []
  let currentParagraph = -1

  reader.charTokens.forEach(token => {
    if (token.isNewline) {
      if (currentGroup.length > 0) {
        groups.push({ chars: currentGroup, paragraphIndex: currentParagraph })
      }
      currentGroup = []
      currentParagraph = token.paragraphIndex
      // Push the newline token into the next group to signal paragraph break
      return
    }
    if (token.paragraphIndex !== currentParagraph && currentGroup.length > 0) {
      groups.push({ chars: currentGroup, paragraphIndex: currentParagraph })
      currentGroup = []
    }
    currentParagraph = token.paragraphIndex
    currentGroup.push(token)
  })

  if (currentGroup.length > 0) {
    groups.push({ chars: currentGroup, paragraphIndex: currentParagraph })
  }

  return groups
})
</script>

<template>
  <div class="w-full h-full flex flex-col items-center">
    <!-- Typing instructions -->
    <div class="w-full max-w-3xl px-4 py-3 text-center">
      <p class="text-xs font-bold uppercase tracking-widest text-[var(--text-soft)] opacity-50">
        Type the text below to progress · Press <kbd class="px-1.5 py-0.5 bg-black/5 dark:bg-white/5 rounded text-[10px]">Backspace</kbd> to fix errors
      </p>
    </div>

    <div
      ref="container"
      class="flex-1 w-full max-w-3xl overflow-y-auto px-6 sm:px-10 py-8 reader-scroll-container cursor-text"
      @click="syncFocus"
    >
      <!-- Hidden input for mobile keyboard -->
      <input
        ref="mobileInput"
        type="text"
        class="absolute opacity-0 pointer-events-none"
        @input="onInput"
        @keydown="onKeydown"
        autocorrect="off"
        autocapitalize="off"
        spellcheck="false"
        autocomplete="off"
      />

      <div v-if="reader.isExtracting" class="flex items-center justify-center h-full">
        <div class="w-10 h-10 border-4 border-[#f02e65]/20 border-t-[#f02e65] rounded-full animate-spin" />
      </div>

      <div v-else-if="reader.charTokens.length === 0" class="flex items-center justify-center h-full text-[var(--text-soft)] opacity-50">
        <p class="text-lg font-medium">No text to display for this chapter.</p>
      </div>

      <div v-else>
        <p
          v-for="(group, gIdx) in paragraphGroups"
          :key="gIdx"
          class="mb-6 leading-relaxed"
        >
          <span
            v-for="token in group.chars"
            :key="token.index"
            class="typing-char"
            :class="{
              'typing-char--pending': token.status === 'pending' && token.index !== reader.currentCharIndex,
              'typing-char--correct': token.status === 'correct',
              'typing-char--error': token.status === 'error',
              'typing-char--active': token.index === reader.currentCharIndex,
            }"
            :data-active="token.index === reader.currentCharIndex ? 'true' : undefined"
          >
            <!-- Animated caret on active character -->
            <span
              v-if="token.index === reader.currentCharIndex"
              class="typing-caret"
            />
            {{ token.char === ' ' ? '\u00A0' : token.char }}
          </span>
        </p>
      </div>
    </div>

    <!-- Bottom status -->
    <div class="w-full max-w-3xl px-4 py-2 flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-[var(--text-soft)] opacity-40">
      <span>{{ reader.currentCharIndex }} / {{ reader.charTokens.length }} chars</span>
      <span v-if="reader.chapterData">{{ reader.chapterData.wordCount }} words</span>
    </div>
  </div>
</template>
