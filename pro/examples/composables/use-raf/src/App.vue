<template>
	<h1>动画帧循环</h1>
	<p>在浏览器帧中执行回调并返回停止函数，可配置interval/isLoop。</p>
	<AsamButton @click="mounted = !mounted">卸载 / 重新挂载</AsamButton><Minimal v-if="mounted" />
</template>
<script setup lang="ts">
import { ref } from 'vue';
import { AsamButton } from '@asam-ui/ui';
import Minimal from './MinimalExample.vue';
const mounted = ref(true);
</script>
