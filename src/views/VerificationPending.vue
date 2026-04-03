<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useRouter } from 'vue-router'
import { Mail, CheckCircle2, ArrowLeft, RefreshCw, LogOut } from 'lucide-vue-next'
import AppLogo from '@/components/AppLogo.vue'

const auth = useAuthStore()
const router = useRouter()
const sending = ref(false)
const error = ref('')
const success = ref(false)

const sendVerification = async () => {
  sending.value = true
  error.value = ''
  try {
    await auth.sendVerification()
    success.value = true
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : 'Failed to send verification parchment.'
  } finally {
    sending.value = false
  }
}

const checkStatus = async () => {
  await auth.refreshUser()
  if (auth.isVerified) {
    router.push('/dashboard')
  }
}

onMounted(() => {
  if (auth.isVerified) {
    router.push('/dashboard')
  }
})
</script>

<template>
  <div class="min-h-screen theme-bg theme-text font-outfit flex flex-col items-center justify-center p-6 text-center">
    <div class="w-full max-w-md space-y-8 animate-fade-in">
      <AppLogo size="lg" class="mx-auto mb-8" />
      
      <div class="p-8 theme-card border theme-border rounded-[2.5rem] shadow-2xl relative overflow-hidden">
        <!-- Glows -->
        <div class="absolute -top-12 -right-12 w-32 h-32 bg-[#AE0001]/10 blur-3xl pointer-events-none" />
        <div class="absolute -bottom-12 -left-12 w-32 h-32 bg-[#EEBA30]/10 blur-3xl pointer-events-none" />

        <div class="z-10 relative">
          <div class="w-20 h-20 bg-[#AE0001]/10 rounded-3xl flex items-center justify-center mx-auto mb-6 border border-[#AE0001]/20">
            <Mail class="w-10 h-10 text-[#AE0001]" />
          </div>

          <h2 class="text-3xl font-black font-cinzel text-[#EEBA30] uppercase tracking-widest mb-4">Awaiting Seal</h2>
          <p class="theme-text-soft text-sm leading-relaxed mb-8">
            Your journey to the ProLibris archive has begun, but first you must verify your identity. 
            Check your parchment (email) for the sacred link.
          </p>

          <div v-if="success" class="p-4 bg-green-500/10 border border-green-500/20 rounded-2xl mb-8">
            <p class="text-green-500 text-xs font-bold uppercase tracking-widest">A fresh parchment has been sent!</p>
          </div>

          <p v-if="error" class="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl mb-8 text-red-500 text-xs font-bold">
            {{ error }}
          </p>

          <div class="flex flex-col gap-3">
            <button 
              @click="checkStatus"
              class="w-full py-4 bg-[#AE0001] text-white rounded-2xl font-black uppercase tracking-[0.2em] shadow-lg shadow-[#AE0001]/20 hover:scale-105 active:scale-95 transition-all text-sm flex items-center justify-center gap-2"
            >
              <RefreshCw class="w-4 h-4" /> I have verified
            </button>
            <button 
              @click="sendVerification"
              :disabled="sending"
              class="w-full py-4 theme-card theme-text border theme-border rounded-2xl font-black uppercase tracking-[0.2em] hover:bg-black/5 dark:hover:bg-white/5 transition-all text-xs disabled:opacity-50"
            >
              {{ sending ? 'Sending...' : 'Resend Verification Parchment' }}
            </button>
          </div>
        </div>
      </div>

      <div class="flex items-center justify-center gap-6 pt-4">
        <button @click="router.push('/dashboard')" class="flex items-center gap-2 theme-text-soft text-sm font-bold hover:theme-text transition-colors">
          <ArrowLeft class="w-4 h-4" /> Back to Dashboard
        </button>
        <div class="w-px h-4 theme-border border-r opacity-20" />
        <button @click="auth.logout()" class="flex items-center gap-2 theme-text-soft text-sm font-bold hover:text-red-500 transition-colors">
          <LogOut class="w-4 h-4" /> Manifest Logout
        </button>
      </div>
    </div>
    
    <footer class="mt-12 opacity-20 text-[10px] uppercase font-black tracking-[0.5em]">
      ProLibris Security Protocols // Active
    </footer>
  </div>
</template>

<style scoped>
.animate-fade-in {
  animation: fadeIn 0.6s cubic-bezier(0.16, 1, 0.3, 1);
}
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
