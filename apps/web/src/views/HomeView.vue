<script setup lang="ts">
import { onMounted } from 'vue'
import { useHealthStore } from '../stores/health'

const health = useHealthStore()

onMounted(() => {
  if (health.state === 'idle') void health.check()
})
</script>

<template>
  <section aria-labelledby="status-title">
    <h1 id="status-title">Foundation status</h1>
    <p class="lede">
      This shell verifies the web app, API and database path. Workout features are not
      available yet, and the app does not work offline in this phase.
    </p>

    <div class="status-card" :class="`status-${health.state}`" aria-live="polite">
      <p class="status-message">{{ health.message }}</p>
      <button
        v-if="health.state === 'error'"
        type="button"
        class="retry"
        @click="health.check()"
      >
        Retry
      </button>
    </div>
  </section>
</template>
