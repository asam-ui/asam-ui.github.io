<template>
	<output aria-live="polite">{{ width }} × {{ height }}</output>
</template>
<script setup lang="ts">
import { useWindowSize } from '@asam-ui/pro/application/composables/use-window-size';
const { width, height } = useWindowSize();
</script>
