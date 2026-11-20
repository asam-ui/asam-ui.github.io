<template>
	<AsamApplicationProvider
		class="preference-panel"
		role="region"
		:aria-label="title"
		:config="{ colorMode: session.colorMode.value }"
	>
		<h4>{{ title }}</h4>
		<div class="preference-actions" role="group" aria-label="存储方式">
			<AsamButton
				v-for="mode in modes"
				:key="mode.value"
				:aria-pressed="session.mode.value === mode.value"
				@click="session.setMode(mode.value)"
			>
				{{ mode.label }}
			</AsamButton>
		</div>
		<output class="preference-result" aria-live="polite">
			语言：{{ session.locale.value }}；主题：{{ session.theme.value }}；存储：{{
				session.status.value
			}}
		</output>
		<p>{{ session.message.value }}</p>
		<div class="preference-actions" role="group" aria-label="修改偏好">
			<AsamButton @click="session.choose({ locale: 'zh-CN' })">中文</AsamButton>
			<AsamButton @click="session.choose({ locale: 'en' })">English</AsamButton>
			<AsamButton @click="session.choose({ theme: 'light' })">浅色</AsamButton>
			<AsamButton @click="session.choose({ theme: 'dark' })">深色</AsamButton>
			<AsamButton @click="session.recreate()">释放并重建恢复</AsamButton>
			<AsamButton @click="session.reset()">仅重置本示例</AsamButton>
		</div>
		<p role="status">{{ session.feedback.value }}</p>
	</AsamApplicationProvider>
</template>
<script lang="ts" setup>
import { AsamButton } from '@asam-ui/ui';
import { AsamApplicationProvider } from '@asam-ui/pro/components';
import { usePreferenceSession } from './preferences-session';
const props = defineProps<{ scopeId: string; title: string }>();
const session = usePreferenceSession(props.scopeId);
const modes = [
	{ value: 'browser', label: '浏览器持久化' },
	{ value: 'memory', label: '内存存储' },
	{ value: 'unavailable', label: '存储不可用示例' }
] as const;
</script>
<style scoped>
.preference-panel {
	display: grid;
	gap: 12px;
	padding: 20px;
	border: 1px solid var(--asam-color-border);
	border-radius: var(--asam-radius-card);
	background: var(--asam-color-surface);
	color: var(--asam-color-text-primary);
}
.preference-actions {
	display: flex;
	flex-wrap: wrap;
	gap: 8px;
}
.preference-panel :is(h4, p) {
	margin: 0;
}
.preference-result {
	overflow-wrap: anywhere;
}
</style>
