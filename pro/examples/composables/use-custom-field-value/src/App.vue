<template>
	<h1>自定义字段桥接</h1>
	<p>把自定义值读取和交互校验接入真实ASAM表单；注入key仅作高级兼容接口。</p>
	<AsamButton @click="mounted = !mounted">卸载 / 重新挂载</AsamButton><Minimal v-if="mounted" />
</template>
<script setup lang="ts">
import { ref } from 'vue';
import { AsamButton } from '@asam-ui/ui';
import Minimal from './MinimalExample.vue';
const mounted = ref(true);
</script>
