<template>
	<div class="desktop-example-panel" :data-instance="instance">
		<template v-if="id === 'overview'"
			><div class="desktop-example-metric">
				<span>待处理事项</span><strong>08</strong><small>本地示例 / 非真实业务</small>
			</div>
			<ul>
				<li>确认本周交付清单 <span>今天</span></li>
				<li>核对设计与实现 <span>14:30</span></li>
				<li>整理协作记录 <span>本周</span></li>
			</ul></template
		>
		<template v-else-if="id === 'notes'"
			><label
				>当前草稿<AsamTextarea
					v-model="draft"
					:rows="4"
					:readonly="readonly"
					:disabled="disabled"
					aria-label="当前草稿"
					placeholder="写下接下来要处理的事…"
			/></label>
			<p class="desktop-example-hint">
				移动、切换和最小化会保留草稿。关闭或权限撤回后释放。
			</p></template
		>
		<template v-else
			><ol>
				<li v-for="item in activities" :key="item">
					<span>{{ item }}</span
					><small>协作工作区</small>
				</li>
			</ol>
			<AsamButton :disabled="readonly || disabled" @click="refresh">刷新动态</AsamButton
			><span role="status">{{ loading ? '正在刷新' : '已加载' }}</span></template
		>
	</div>
</template>
<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, useId } from 'vue';
import { AsamButton, AsamTextarea } from '@asam-ui/ui';
const props = defineProps<{ id: string; readonly: boolean; disabled: boolean }>();
const emit = defineEmits<{ (e: 'lifecycle', event: string, id: string): void }>();
const instance = useId();
const draft = ref(''),
	activities = ref(['完成视觉走查', '更新组件使用说明', '同步本周计划']),
	loading = ref(false);
let abort: AbortController | undefined;
let timer: ReturnType<typeof setTimeout> | undefined;
function refresh() {
	abort?.abort();
	clearTimeout(timer);
	abort = new AbortController();
	const signal = abort.signal;
	loading.value = true;
	emit('lifecycle', 'task-start', props.id);
	timer = setTimeout(() => {
		if (!signal.aborted) {
			activities.value = ['动态已刷新', ...activities.value.slice(0, 2)];
			loading.value = false;
			timer = undefined;
			emit('lifecycle', 'task-complete', props.id);
		}
	}, 120);
}
onMounted(() => emit('lifecycle', 'mount', props.id));
onBeforeUnmount(() => {
	abort?.abort();
	clearTimeout(timer);
	if (timer !== undefined) emit('lifecycle', 'task-abort', props.id);
	emit('lifecycle', 'unmount', props.id);
});
</script>
<style>
.desktop-example-panel {
	font-size: 13px;
	line-height: 1.8;
}
.desktop-example-metric {
	display: grid;
	grid-template-columns: 1fr auto;
	align-items: center;
	gap: 8px;
	border-bottom: 1px solid var(--asam-color-border);
	padding-bottom: 16px;
	margin-bottom: 12px;
}
.desktop-example-metric strong {
	font-size: 44px;
	line-height: 1;
	font-weight: 500;
	letter-spacing: -0.06em;
}
.desktop-example-metric small {
	grid-column: 1 / -1;
	color: var(--asam-color-text-secondary);
}
.desktop-example-panel ul,
.desktop-example-panel ol {
	margin: 0;
	padding: 0;
	list-style: none;
}
.desktop-example-panel li {
	display: flex;
	justify-content: space-between;
	gap: 12px;
	border-bottom: 1px solid var(--asam-color-border);
	padding-block: 10px;
}
.desktop-example-panel li > span,
.desktop-example-panel small {
	color: var(--asam-color-text-secondary);
}
.desktop-example-panel label {
	display: grid;
	gap: 8px;
}
.desktop-example-hint {
	color: var(--asam-color-text-secondary);
	font-size: 12px;
	padding-top: 12px;
}
</style>
