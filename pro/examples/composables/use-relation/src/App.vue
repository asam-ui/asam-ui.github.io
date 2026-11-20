<template>
	<h1>父子组件关联</h1>
	<p>使用同一InjectionKey建立复合组件的父子关系并读取顺序索引。</p>
	<AsamButton @click="mounted = !mounted">卸载 / 重新挂载</AsamButton><Minimal v-if="mounted" />
</template>
<script setup lang="ts">
import { ref } from 'vue';
import { AsamButton } from '@asam-ui/ui';
import Minimal from './MinimalExample.vue';
const mounted = ref(true);
</script>
