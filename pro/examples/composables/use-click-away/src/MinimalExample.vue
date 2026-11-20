<template>
	<AsamSpace wrap alignment="start">
		<section ref="inside">
			<AsamButton @click="opened = true">打开区域</AsamButton>
			<p v-if="opened">点击区域外关闭</p>
		</section>
		<AsamButton>区域外按钮</AsamButton>
	</AsamSpace>
</template>
<script setup lang="ts">
import { ref } from 'vue';
import { AsamButton, AsamSpace } from '@asam-ui/ui';
import { useClickAway } from '@asam-ui/pro/application/composables/use-click-away';
const inside = ref<HTMLElement>();
const opened = ref(false);
useClickAway(inside, () => {
	opened.value = false;
});
</script>
