<template>
	<p>缓存中的内容</p>
</template>
<script setup lang="ts">
import { onMountedOrActivated } from '@asam-ui/pro/application/composables/on-mounted-or-activated';
const emit = defineEmits<{ active: [] }>();
onMountedOrActivated(() => emit('active'));
</script>
