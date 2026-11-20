<template>
	<output>{{ inBrowser ? '浏览器环境' : '非浏览器环境' }}</output>
</template>
<script setup lang="ts">
import { inBrowser } from '@asam-ui/pro/application/composables/environment';
</script>
