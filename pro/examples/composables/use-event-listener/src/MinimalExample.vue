<template>
	<section ref="area"><AsamButton @click="undefined">点击监听区域</AsamButton></section>
	<output>收到 {{ count }} 次事件</output><AsamButton @click="stop()">停止监听</AsamButton>
</template>
<script setup lang="ts">
import { ref } from 'vue';
import { AsamButton } from '@asam-ui/ui';
import { useEventListener } from '@asam-ui/pro/application/composables/use-event-listener';
const area = ref<HTMLElement>();
const count = ref(0);
const stop = useEventListener(
	'click',
	() => {
		count.value++;
	},
	{ target: area }
);
</script>
