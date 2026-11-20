<template>
	<output aria-live="polite">页面状态：{{ visibility }}</output>
</template>
<script setup lang="ts">
import { usePageVisibility } from '@asam-ui/pro/application/composables/use-page-visibility';
const visibility = usePageVisibility();
</script>
