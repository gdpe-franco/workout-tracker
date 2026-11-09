<script setup lang="ts">
import { RouterLink } from 'vue-router'
</script>

<template>
  <section aria-labelledby="not-found-title">
    <h1 id="not-found-title">Page not found</h1>
    <p class="lede">This route does not exist.</p>
    <RouterLink to="/" class="back-link">Back to status</RouterLink>
  </section>
</template>
