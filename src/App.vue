<script setup>
const contractCards = [
  {
    label: 'Build',
    value: 'Single HTML',
    detail: 'Vite + vite-plugin-singlefile untuk Google Apps Script HTML Service.',
  },
  {
    label: 'Runtime',
    value: 'Offline-Tolerant',
    detail: 'Draft dan queue aman setelah aplikasi berhasil dimuat.',
  },
  {
    label: 'UI',
    value: 'Industrial Soft UI',
    detail: 'Mobile-first untuk operator, desktop scan-friendly untuk supervisor.',
  },
];
</script>

<template>
  <main class="app-shell">
    <section class="hero-panel" aria-labelledby="app-title">
      <div class="brand-row">
        <span class="brand-mark" aria-hidden="true">O</span>
        <span class="brand-name">OPTIFLOW</span>
      </div>

      <div class="hero-content">
        <p class="eyebrow">Production reporting bootstrap</p>
        <h1 id="app-title">Vue 3 single-file build siap untuk GAS.</h1>
        <p class="hero-copy">
          Baseline frontend ini menjaga kontrak: bundle tunggal, UI operasional, dan
          fondasi mobile-first untuk alur operator.
        </p>
      </div>
    </section>

    <section class="status-grid" aria-label="Contract status">
      <article v-for="card in contractCards" :key="card.label" class="status-card">
        <p>{{ card.label }}</p>
        <strong>{{ card.value }}</strong>
        <span>{{ card.detail }}</span>
      </article>
    </section>
  </main>
</template>
