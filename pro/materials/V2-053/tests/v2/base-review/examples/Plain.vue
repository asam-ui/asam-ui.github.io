<template>
	<section>
		<h2>普通 JavaScript 消费</h2>
		<AsamConfigProvider size="big">
			<AsamInput v-model="name" aria-label="JS名称" />
			<AsamButton @click="count++">JS保存</AsamButton>
			<output aria-label="JS结果">{{ name }}:{{ count }}</output>
		</AsamConfigProvider>
	</section>
</template>

<script setup>
import { ref } from 'vue';
import { AsamButton, AsamConfigProvider, AsamInput } from '@asam-ui/ui';
const name = ref('JS初始');
const count = ref(0);
</script>
