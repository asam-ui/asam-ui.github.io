<template>
	<section class="preferences-inline">
		<p>
			选择偏好会立即尝试保存，请查看存储状态。浏览器模式可刷新恢复；内存模式只在本次页面内恢复。
		</p>
		<PreferencePanel :scope-id="scopeId + ':first'" title="第一个独立示例" />
		<PreferencePanel :scope-id="scopeId + ':second'" title="第二个独立示例" />
		<AsamButton @click="reload">刷新页面验证恢复</AsamButton>
	</section>
</template>
<script lang="ts" setup>
import { AsamButton } from '@asam-ui/ui';
import PreferencePanel from './PreferencePanel.vue';
defineProps<{ scopeId: string }>();
const reload = () => window.location.reload();
</script>
<style scoped>
.preferences-inline {
	display: grid;
	gap: 20px;
	width: 100%;
}
</style>
