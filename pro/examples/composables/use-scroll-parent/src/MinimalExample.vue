<template>
	<div ref="container" style="height: 120px; overflow: auto">
		<div ref="target" style="height: 300px">滚动区域</div>
	</div>
	<p>挂载读取：{{ parent === container }}</p>
	<AsamButton @click="measure()">同步查询</AsamButton><output>{{ matched }}</output>
</template>
<script setup lang="ts">
import { ref } from 'vue';
import { AsamButton } from '@asam-ui/ui';
import {
	useScrollParent,
	getScrollParent
} from '@asam-ui/pro/application/composables/use-scroll-parent';
const container = ref<HTMLElement>();
const target = ref<HTMLElement>();
const parent = useScrollParent(target);
const matched = ref(false);
function measure() {
	matched.value = !!target.value && getScrollParent(target.value) === container.value;
}
</script>
