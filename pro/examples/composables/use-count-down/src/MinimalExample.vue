<template>
	<output>{{ current.seconds }} 秒 {{ current.milliseconds }} 毫秒</output
	><AsamButton @click="start()">开始</AsamButton><AsamButton @click="pause()">暂停</AsamButton
	><AsamButton @click="reset(5000)">重置</AsamButton>
	<p>完成次数：{{ finished }}</p>
</template>
<script setup lang="ts">
import { onBeforeUnmount, ref } from 'vue';
import { AsamButton } from '@asam-ui/ui';
import { useCountDown } from '@asam-ui/pro/application/composables/use-count-down';
const finished = ref(0);
const { current, start, pause, reset } = useCountDown({
	time: 5000,
	millisecond: true,
	onFinish: () => {
		finished.value++;
	}
});
onBeforeUnmount(pause);
</script>
