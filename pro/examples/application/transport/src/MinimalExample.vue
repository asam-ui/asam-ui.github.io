<template>
	<AsamButton :loading="loading" @click="load" type="primary">读取本地数据</AsamButton>
	<p role="status">{{ message }}</p>
</template>
<script setup lang="ts">
import { onBeforeUnmount, ref } from 'vue';
import { AsamButton } from '@asam-ui/ui';
import { createRequestClient } from '@asam-ui/pro/application/transport';
const message = ref('等待读取');
const loading = ref(false);
let alive = true;
const client = createRequestClient({
	transport: async () => ({ mode: 'data', data: { message: '本地数据已读取' } })
});
async function load() {
	if (loading.value) return;
	loading.value = true;
	try {
		const value = await client.request(
			{ url: '/local-example' },
			{
				decode: (data) => {
					if (
						!data ||
						typeof data !== 'object' ||
						!('message' in data) ||
						typeof data.message !== 'string'
					)
						throw new Error('响应不符合约定');
					return data.message;
				}
			}
		);
		if (alive) message.value = value;
	} catch {
		if (alive) message.value = '读取未完成，请重试';
	} finally {
		if (alive) loading.value = false;
	}
}
onBeforeUnmount(() => {
	alive = false;
	client.dispose();
});
</script>
