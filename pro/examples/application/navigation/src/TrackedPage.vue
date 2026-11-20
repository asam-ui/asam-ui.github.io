<template><StatePage @lifecycle="record" /></template>
<script setup lang="ts">
import { inject } from 'vue';
import { lifecycleKey } from './Lifecycle.js';
import StatePage from './StatePage.vue';
const counts = inject(lifecycleKey);
function record(event: string) {
	if (counts) counts[event] = (counts[event] ?? 0) + 1;
}
</script>
