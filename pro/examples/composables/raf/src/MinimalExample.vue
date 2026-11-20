<template>
	<AsamSpace wrap>
		<output>{{ status }}</output>
		<AsamButton type="primary" @click="schedule()">预约单帧</AsamButton>
		<AsamButton type="primary" plain @click="cancel()">取消单帧</AsamButton>
		<AsamButton type="primary" @click="twice()">双帧后更新</AsamButton>
	</AsamSpace>
</template>
<script setup lang="ts">
import { onBeforeUnmount, ref } from 'vue';
import { AsamButton, AsamSpace } from '@asam-ui/ui';
import { raf, cancelRaf, doubleRaf } from '@asam-ui/pro/application/composables/raf';
const status = ref('等待操作');
let handle = -1;
let alive = true;
function cancel() {
	cancelRaf(handle);
	status.value = '已取消';
}
function schedule() {
	cancelRaf(handle);
	handle = raf(() => {
		if (alive) status.value = '单帧完成';
	});
}
function twice() {
	doubleRaf(() => {
		if (alive) status.value = '双帧完成';
	});
}
onBeforeUnmount(() => {
	alive = false;
	cancelRaf(handle);
});
</script>
