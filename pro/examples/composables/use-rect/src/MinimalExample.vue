<template>
	<div ref="target" style="width: 200px; padding: 12px">测量目标</div>
	<AsamButton @click="measure()">读取矩形</AsamButton><output>{{ width }} × {{ height }}</output>
</template>
<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { AsamButton } from '@asam-ui/ui';
import { useRect } from '@asam-ui/pro/application/composables/use-rect';
const target = ref<HTMLElement>();
const width = ref(0);
const height = ref(0);
function measure() {
	const rect = useRect(target);
	width.value = rect.width;
	height.value = rect.height;
}
onMounted(measure);
</script>
