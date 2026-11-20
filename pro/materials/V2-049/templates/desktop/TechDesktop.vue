<template>
	<main class="desktop desktop-tech" data-family="tech">
		<header class="desktop-tech-top">
			<div>
				<span class="desktop-tech-kicker">ASAM / CONTROL SPACE</span>
				<h1>{{ title || '工作台 / 在线' }}</h1>
			</div>
			<p>{{ description || '将信息面板编排为可恢复的工作现场。' }}</p>
			<nav aria-label="应用导航"><slot name="navigation" /></nav>
		</header>
		<div class="desktop-tech-grid">
			<aside class="desktop-tech-index" aria-hidden="true">
				<span>03</span><i></i><span>DESKTOP</span><small>LOCAL<br />LAYOUT</small>
			</aside>
			<DesktopStage
				ref="stage"
				:controller="controller"
				:size="size"
				@retry="$emit('retry', $event)"
				><template #panel="scope"><slot name="panel" v-bind="scope" /></template
			></DesktopStage>
		</div>
		<footer class="desktop-footer">
			<slot name="footer">ASAM / 浏览器会话 · 权限由宿主实时提供</slot>
		</footer>
	</main>
</template>
<script setup lang="ts">
import { ref } from 'vue';
import DesktopStage from './DesktopStage.vue';
import type { DesktopExpose, DesktopPageProps, DesktopSlots } from './Types.js';
defineProps<DesktopPageProps>();
defineSlots<DesktopSlots>();
defineEmits<{ (e: 'retry', id: string): void }>();
const stage = ref<DesktopExpose>();
defineExpose({ focus: () => stage.value?.focus(), cancel: () => stage.value?.cancel() });
</script>
<style src="./Desktop.css"></style>
