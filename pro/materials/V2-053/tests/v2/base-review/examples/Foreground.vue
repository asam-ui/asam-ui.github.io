<template>
	<section data-testid="foreground-suite">
		<h2>实心前景增量验证</h2>
		<select v-model="scene" aria-label="前景场景">
			<option v-for="name in scenes" :key="name">{{ name }}</option>
		</select>
		<AsamApplicationProvider :config="config">
			<div data-testid="foreground-application">
				<AsamButton
					v-for="type in solidTypes"
					:key="type"
					:type="type"
					:data-testid="`solid-${type}`"
					>{{ type }}</AsamButton
				>
				<AsamButton type="primary" plain data-testid="plain-primary">朴素交互</AsamButton>
			</div>
		</AsamApplicationProvider>
		<div ref="legacyTarget" data-testid="legacy-theme">
			<AsamButton type="primary" data-testid="legacy-button">旧完整主题</AsamButton>
		</div>
		<button @click="applyLegacy">移除显式前景并应用旧完整对象</button>
	</section>
</template>
<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { AsamButton, applyAsamTheme, createAsamTheme, defaultAsamTheme } from '@asam-ui/ui';
import type { AsamButtonType, AsamThemeTokens } from '@asam-ui/ui';
import { AsamApplicationProvider } from '@asam-ui/pro';
import type { AsamApplicationConfig } from '@asam-ui/pro';
const solidTypes = [
	'primary',
	'success',
	'warning',
	'danger',
	'info',
	'gradient'
] as const satisfies readonly AsamButtonType[];
const scenes = ['light', 'surface-only', 'dark', 'explicit'] as const;
const scene = ref<(typeof scenes)[number]>('light');
const config = computed<AsamApplicationConfig>(() => ({
	colorMode: scene.value === 'dark' || scene.value === 'explicit' ? 'dark' : 'light',
	theme: {
		color: {
			primary: '#7a315c',
			...(scene.value === 'surface-only' ? { surface: '#141414' } : {}),
			...(scene.value === 'explicit' ? { onSolid: '#f5e663' } : {})
		}
	}
}));
const legacyTarget = ref<HTMLElement>();
// An existing complete theme object legitimately omits the new optional field.
const { onSolid: omitted, ...legacyColor } = defaultAsamTheme.color;
const legacy: AsamThemeTokens = {
	...defaultAsamTheme,
	color: { ...legacyColor, surface: '#141414' }
};
function applyLegacy() {
	if (legacyTarget.value) applyAsamTheme(legacy, legacyTarget.value);
}
onMounted(() => {
	if (legacyTarget.value)
		applyAsamTheme(createAsamTheme({ color: { onSolid: '#f5e663' } }), legacyTarget.value);
});
void omitted;
</script>
