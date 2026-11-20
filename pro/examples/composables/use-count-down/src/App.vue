<template>
	<h1>倒计时</h1>
	<p>按剩余毫秒倒计时，可开始、暂停、重置并监听完成。</p>
	<AsamButton @click="mounted = !mounted">卸载 / 重新挂载</AsamButton><Minimal v-if="mounted" />
</template>
<script setup lang="ts">
import { ref } from 'vue';
import { AsamButton } from '@asam-ui/ui';
import Minimal from './MinimalExample.vue';
const mounted = ref(true);
</script>
