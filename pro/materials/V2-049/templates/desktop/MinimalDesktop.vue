<template>
	<main class="desktop desktop-minimal" data-family="minimal">
		<header class="desktop-editorial">
			<div class="desktop-edition"><span>ASAM / DESKTOP</span><span>专注当前 · 01</span></div>
			<div class="desktop-intro">
				<h1>{{ title || '日常工作，有序展开。' }}</h1>
				<p>{{ description || '将常用面板放在手边，为专注留出空间。' }}</p>
			</div>
			<nav aria-label="应用导航"><slot name="navigation" /></nav>
		</header>
		<DesktopStage
			ref="stage"
			:controller="controller"
			:size="size"
			@retry="$emit('retry', $event)"
			><template #panel="scope"><slot name="panel" v-bind="scope" /></template
		></DesktopStage>
		<footer class="desktop-footer">
			<slot name="footer">ASAM · 浏览器工作台 / 布局仅保存在当前身份范围</slot>
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
