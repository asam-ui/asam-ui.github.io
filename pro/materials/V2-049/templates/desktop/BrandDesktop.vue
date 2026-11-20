<template>
	<main class="desktop desktop-brand" data-family="brand">
		<aside class="desktop-brand-rail">
			<a class="desktop-wordmark" :href="`#${mainId}`">ASAM<span>WORKSPACE</span></a>
			<div class="desktop-brand-story">
				<p>工作空间 / 02</p>
				<h1>{{ title || '把工作，放回你的节奏。' }}</h1>
				<p>{{ description || '从左侧启程，在同一张桌面保持上下文。' }}</p>
			</div>
			<nav aria-label="应用导航"><slot name="navigation" /></nav>
			<span class="desktop-brand-mark" aria-hidden="true">A /</span>
		</aside>
		<div :id="mainId" class="desktop-brand-main">
			<header class="desktop-brand-top">
				<strong>我的桌面</strong><span>窗口、面板与偏好</span>
			</header>
			<DesktopStage
				ref="stage"
				:controller="controller"
				:size="size"
				@retry="$emit('retry', $event)"
				><template #panel="scope"><slot name="panel" v-bind="scope" /></template
			></DesktopStage>
			<footer class="desktop-footer">
				<slot name="footer">ASAM · 让每一个工作面板各就其位</slot>
			</footer>
		</div>
	</main>
</template>
<script setup lang="ts">
import { ref, useId } from 'vue';
import DesktopStage from './DesktopStage.vue';
import type { DesktopExpose, DesktopPageProps, DesktopSlots } from './Types.js';
defineProps<DesktopPageProps>();
defineSlots<DesktopSlots>();
defineEmits<{ (e: 'retry', id: string): void }>();
const stage = ref<DesktopExpose>();
const mainId = useId();
defineExpose({ focus: () => stage.value?.focus(), cancel: () => stage.value?.cancel() });
</script>
<style src="./Desktop.css"></style>
