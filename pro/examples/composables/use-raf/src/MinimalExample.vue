<template>
	<AsamSpace wrap>
		<output>帧回调：{{ count }}</output>
		<AsamButton @click="stop()">停止循环</AsamButton>
	</AsamSpace>
</template>
<script setup lang="ts">
import { onBeforeUnmount, ref } from 'vue';
import { AsamButton, AsamSpace } from '@asam-ui/ui';
import { useRaf } from '@asam-ui/pro/application/composables/use-raf';
const count = ref(0);
const stop = useRaf(
	() => {
		count.value++;
	},
	{ interval: 100, isLoop: true }
);
onBeforeUnmount(stop);
</script>
