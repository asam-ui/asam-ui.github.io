<template>
	<div
		ref="root"
		class="desktop-stage"
		:data-narrow="c.narrow.value"
		:data-size="size"
		tabindex="-1"
		@keydown="escape"
	>
		<nav class="desktop-launcher" aria-label="快捷入口">
			<AsamButton
				v-for="p in c.visiblePanels.value"
				:key="p.id"
				:size="size"
				:disabled="!c.canOperate(p.id)"
				:data-open="p.id"
				@click="c.open(p.id)"
			>
				<span class="desktop-launch-symbol" aria-hidden="true">{{
					p.title.slice(0, 1)
				}}</span
				>{{ p.title }}
			</AsamButton>
			<p v-if="!c.visiblePanels.value.length" role="status">当前没有可用面板</p>
		</nav>
		<div class="desktop-tools" aria-label="布局偏好">
			<span role="status" data-storage-status>{{ storageMessages[c.status.value] }}</span>
			<AsamButton :size="size" :disabled="locked" @click="c.save()">保存布局</AsamButton>
			<AsamButton :size="size" :disabled="locked" @click="c.restore()">恢复布局</AsamButton>
			<AsamButton :size="size" :disabled="locked" @click="c.reset()">重置布局</AsamButton>
		</div>
		<div ref="surface" class="desktop-surface" aria-label="窗口工作区">
			<div
				v-if="!c.windows.value.some((w) => !w.minimized)"
				class="desktop-idle"
				role="status"
			>
				<span>ASAM / WORKSPACE</span>
				<h2>为当前工作留出空间</h2>
				<p>从快捷入口打开面板，或从任务栏恢复。</p>
			</div>
			<section
				v-for="(w, index) in c.windows.value"
				:key="`${c.contextRevision.value}:${w.id}`"
				v-show="!w.minimized && (!c.narrow.value || c.active.value === w.id)"
				:ref="(el) => windowRef(w.id, el)"
				class="desktop-window"
				:class="{ 'is-active': c.active.value === w.id }"
				:style="windowStyle(w, index)"
				:data-window="w.id"
				:aria-label="panel(w.id).title"
				@focusin="activateFromContent(w.id)"
				@pointerdown="activateFromContent(w.id)"
			>
				<header class="desktop-titlebar">
					<button
						type="button"
						class="desktop-move"
						:data-move="w.id"
						:disabled="!c.canOperate(w.id)"
						:aria-label="`移动 ${panel(w.id).title}`"
						aria-keyshortcuts="ArrowUp ArrowDown ArrowLeft ArrowRight Escape"
						@pointerdown.stop="start($event, w, 'move')"
						@pointermove="move"
						@pointerup="finish"
						@pointercancel="cancel"
						@lostpointercapture="cancel"
						@keydown="keyRect($event, w, 'move')"
					>
						<span aria-hidden="true" class="desktop-grip">⠿</span
						><strong>{{ panel(w.id).title }}</strong>
					</button>
					<div class="desktop-window-actions">
						<AsamButton
							:size="size"
							:disabled="!c.canOperate(w.id)"
							:aria-label="`最小化 ${panel(w.id).title}`"
							@click="c.minimize(w.id)"
							>−</AsamButton
						>
						<AsamButton
							:size="size"
							:disabled="!c.canOperate(w.id) || c.narrow.value"
							:aria-label="`${w.maximized ? '还原' : '最大化'} ${panel(w.id).title}`"
							@click="c.maximize(w.id)"
							>{{ w.maximized ? '↙' : '↗' }}</AsamButton
						>
						<AsamButton
							:size="size"
							:disabled="!c.canOperate(w.id)"
							:aria-label="`关闭 ${panel(w.id).title}`"
							@click="c.close(w.id)"
							>×</AsamButton
						>
					</div>
				</header>
				<div class="desktop-window-content">
					<p v-if="panel(w.id).description" class="desktop-panel-description">
						{{ panel(w.id).description }}
					</p>
					<AsamPageContainer
						:label="panel(w.id).title"
						:status="panel(w.id).status ?? 'ready'"
						@retry="$emit('retry', w.id)"
					>
						<slot
							name="panel"
							:panel="panel(w.id)"
							:window="w"
							:readonly="locked || !!panel(w.id).readonly || !!panel(w.id).disabled"
							:close="() => c.close(w.id)"
							><p>由宿主注入 {{ panel(w.id).title }} 内容。</p></slot
						>
					</AsamPageContainer>
				</div>
				<button
					v-if="!w.maximized && !c.narrow.value"
					class="desktop-resize"
					type="button"
					:data-resize="w.id"
					:disabled="!c.canOperate(w.id)"
					:aria-label="`调整大小 ${panel(w.id).title}`"
					aria-keyshortcuts="ArrowUp ArrowDown ArrowLeft ArrowRight Escape"
					@pointerdown.stop="start($event, w, 'resize')"
					@pointermove="move"
					@pointerup="finish"
					@pointercancel="cancel"
					@lostpointercapture="cancel"
					@keydown="keyRect($event, w, 'resize')"
				>
					◢
				</button>
			</section>
		</div>
		<nav class="desktop-taskbar" aria-label="任务栏">
			<span class="desktop-taskbar-label">{{ c.narrow.value ? '切换面板' : '已打开' }}</span>
			<AsamButton
				v-for="w in c.windows.value"
				:key="w.id"
				:size="size"
				:disabled="!c.canOperate(w.id)"
				:aria-pressed="c.active.value === w.id"
				:data-task="w.id"
				@click="c.activate(w.id)"
				>{{ panel(w.id).title }}{{ w.minimized ? ' · 已最小化' : '' }}</AsamButton
			>
			<span v-if="!c.windows.value.length">暂无窗口</span>
		</nav>
	</div>
</template>
<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import type { ComponentPublicInstance, CSSProperties } from 'vue';
import { AsamButton } from '@asam-ui/ui';
import { AsamPageContainer } from '@asam-ui/pro';
import type {
	DesktopPageProps,
	DesktopSlots,
	DesktopWindow,
	LayoutStatus,
	WindowRect
} from './Types.js';
import { clampRect } from './Desktop.js';
const props = withDefaults(defineProps<DesktopPageProps>(), { size: 'default' });
defineSlots<Pick<DesktopSlots, 'panel'>>();
defineEmits<{ (e: 'retry', id: string): void }>();
const c = props.controller;
const root = ref<HTMLElement>(),
	surface = ref<HTMLElement>();
const elements = new Map<string, HTMLElement>();
const locked = computed(() => c.disabled.value || c.readOnly.value);
const storageMessages: Record<LayoutStatus, string> = {
	missing: '使用默认布局',
	ok: '布局已就绪',
	migrated: '布局已迁移',
	invalid: '布局损坏，可重置',
	future: '布局版本较新，可重置',
	expired: '布局已过期，使用默认布局',
	unavailable: '存储不可用，当前会话可继续',
	disposed: '工作台已销毁',
	stale: '旧操作已忽略',
	conflict: '另一工作台已修改布局，请恢复或重置'
};
const preview = ref<{ id: string; rect: WindowRect }>();
let drag:
	| {
			id: string;
			pointer: number;
			x: number;
			y: number;
			rect: WindowRect;
			mode: 'move' | 'resize';
			target: HTMLElement;
			width: number;
			height: number;
	  }
	| undefined;
let observer: ResizeObserver | undefined;
function panel(id: string) {
	return c.panels.value.find((p) => p.id === id)!;
}
function windowRef(id: string, el: Element | ComponentPublicInstance | null) {
	if (el instanceof HTMLElement) elements.set(id, el);
	else elements.delete(id);
}
function windowStyle(w: Readonly<DesktopWindow>, index: number): CSSProperties {
	const r = preview.value?.id === w.id ? preview.value.rect : c.displayRect(w);
	return {
		transform: `translate(${r.x}px, ${r.y}px)`,
		width: `${r.width}px`,
		height: `${r.height}px`,
		zIndex: index + 1
	};
}
function activateFromContent(id: string) {
	if (c.active.value !== id) c.activate(id);
}
function cancel() {
	const previous = drag;
	drag = undefined;
	preview.value = undefined;
	if (previous?.target.hasPointerCapture(previous.pointer))
		previous.target.releasePointerCapture(previous.pointer);
}
function start(event: PointerEvent, w: Readonly<DesktopWindow>, mode: 'move' | 'resize') {
	if (
		event.button !== 0 ||
		!event.isPrimary ||
		!c.canOperate(w.id) ||
		w.maximized ||
		c.narrow.value
	)
		return;
	event.preventDefault();
	cancel();
	c.activate(w.id);
	const target = event.currentTarget as HTMLElement;
	drag = {
		id: w.id,
		pointer: event.pointerId,
		x: event.clientX,
		y: event.clientY,
		rect: c.displayRect(w),
		mode,
		target,
		width: surface.value?.clientWidth ?? 0,
		height: surface.value?.clientHeight ?? 0
	};
	target.focus();
	target.setPointerCapture(event.pointerId);
}
function move(event: PointerEvent) {
	if (!drag || event.pointerId !== drag.pointer) return;
	const dx = event.clientX - drag.x,
		dy = event.clientY - drag.y;
	preview.value = {
		id: drag.id,
		rect: clampRect(
			{
				...drag.rect,
				...(drag.mode === 'move'
					? { x: drag.rect.x + dx, y: drag.rect.y + dy }
					: { width: drag.rect.width + dx, height: drag.rect.height + dy })
			},
			c.viewport.value.width,
			c.viewport.value.height
		)
	};
}
function finish(event: PointerEvent) {
	if (!drag || event.pointerId !== drag.pointer) return;
	const current = drag,
		value = preview.value;
	cancel();
	if (
		surface.value?.clientWidth !== current.width ||
		surface.value?.clientHeight !== current.height
	)
		return;
	if (value) c.setRect(current.id, value.rect);
}
function escape(event: KeyboardEvent) {
	if (event.key === 'Escape' && drag) {
		event.preventDefault();
		event.stopPropagation();
		cancel();
	}
}
function keyRect(event: KeyboardEvent, w: Readonly<DesktopWindow>, mode: 'move' | 'resize') {
	if (
		!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key) ||
		event.altKey ||
		event.metaKey ||
		event.ctrlKey
	)
		return;
	event.preventDefault();
	cancel();
	const r = c.displayRect(w),
		step = event.shiftKey ? 32 : 8;
	const dx = event.key === 'ArrowLeft' ? -step : event.key === 'ArrowRight' ? step : 0;
	const dy = event.key === 'ArrowUp' ? -step : event.key === 'ArrowDown' ? step : 0;
	c.setRect(w.id, {
		...r,
		...(mode === 'move'
			? { x: r.x + dx, y: r.y + dy }
			: { width: r.width + dx, height: r.height + dy })
	});
}
watch(() => c.revision.value, cancel, { flush: 'sync' });
watch(
	() => c.focusRevision.value,
	async () => {
		await nextTick();
		if (!root.value?.isConnected) return;
		const target = c.active.value ? elements.get(c.active.value) : undefined;
		if (target && !target.contains(document.activeElement))
			target.querySelector<HTMLElement>('.desktop-move')?.focus({ preventScroll: true });
		else if (
			!target &&
			(!document.activeElement ||
				document.activeElement === document.body ||
				!root.value.contains(document.activeElement))
		)
			root.value
				.querySelector<HTMLElement>('[data-open]:not(:disabled)')
				?.focus({ preventScroll: true });
	}
);
function storage(event: StorageEvent) {
	c.externalChange(event.key);
}
onMounted(() => {
	observer = new ResizeObserver(() => {
		cancel();
		if (surface.value) c.setViewport(surface.value.clientWidth, surface.value.clientHeight);
	});
	if (surface.value) {
		c.setViewport(surface.value.clientWidth, surface.value.clientHeight);
		observer.observe(surface.value);
	}
	window.addEventListener('blur', cancel);
	window.addEventListener('scroll', cancel, true);
	window.addEventListener('storage', storage);
});
onBeforeUnmount(() => {
	cancel();
	observer?.disconnect();
	elements.clear();
	window.removeEventListener('blur', cancel);
	window.removeEventListener('scroll', cancel, true);
	window.removeEventListener('storage', storage);
});
defineExpose({ focus: () => root.value?.focus(), cancel });
</script>
<style src="./Desktop.css"></style>
