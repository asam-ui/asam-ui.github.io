<template>
	<h1>滚动父容器</h1>
	<p>挂载后获取最近可滚动父元素，或同步查询指定元素。</p>
	<AsamButton @click="mounted = !mounted">卸载 / 重新挂载</AsamButton><Minimal v-if="mounted" />
</template>
<script setup lang="ts">
import { ref } from 'vue';
import { AsamButton } from '@asam-ui/ui';
import Minimal from './MinimalExample.vue';
const mounted = ref(true);
</script>
