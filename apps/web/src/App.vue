<script setup lang="ts">
import { RouterLink, RouterView } from 'vue-router'
</script>

<template>
  <div class="app">
    <header class="app-header">
      <RouterLink to="/" class="brand">Workout Tracker</RouterLink>
      <span class="phase">Foundation</span>
    </header>
    <main class="app-main">
      <RouterView />
    </main>
  </div>
</template>
