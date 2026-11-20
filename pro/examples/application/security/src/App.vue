<template>
	<AsamApplicationProvider
		class="security-application"
		:config="{
			size,
			colorMode: dark ? 'dark' : 'light',
			permission: { check: security.permission }
		}"
		><Teleport to="#preview-settings-extra" :disabled="!websitePreviewControls"
			><WebsiteAsamConfigProvider size="default"
				><section class="preview-control-group">
					<header>
						<h1>{{ text.t('title') }}</h1>
						<!-- prettier-ignore -->
						<div data-asam-field-caption>{{ text.t('size') }}
				<AsamSelect v-model="size" :aria-label="text.t('size')"><AsamOption
						v-for="value in sizes"
						:key="value"
						:value="value"
						:label="value"
					 /></AsamSelect></div>
						<span
							v-show="!websitePreviewControls"
							data-preview-theme-control
							:data-preview-value="dark"
							v-on="{ 'asam-preview-theme': websitePreviewTheme0 }"
							><AsamCheckboxItem v-model="dark" border>{{
								text.t('dark')
							}}</AsamCheckboxItem></span
						><!-- prettier-ignore --><AsamCheckboxItem v-model="fixture.controls.fail" border>{{ text.t('failAuth') }}</AsamCheckboxItem
						><!-- prettier-ignore --><AsamCheckboxItem v-model="fixture.controls.readFail" border>{{ text.t('failRead') }}</AsamCheckboxItem>
						<p role="status" aria-live="polite">
							{{ text.t('session')
							}}{{ formatSecurityStatus(state.status, text.scope) }} {{ state.error }}
						</p>
						<p v-if="state.subject">
							{{ state.subject.name }} / {{ text.t('roles')
							}}{{ state.subject.roles.join(', ') || text.t('none') }} /
							{{ text.t('expires')
							}}{{
								new Date(state.subject.expiresAt).toLocaleTimeString(
									text.scope.enabled.value ? text.scope.locale.value : undefined
								)
							}}
						</p>
						<AsamBaseForm @submit.prevent="login"
							><!-- prettier-ignore -->
							<div data-asam-field-caption>{{ text.t('identity') }}
					<AsamSelect v-model="identity" :aria-label="text.t('identity')"><AsamOption
							v-for="(value, key) in identities"
							:key="key"
							:value="key"
							:label="value.name"
						 /></AsamSelect></div>
							<AsamButton native-type="submit" type="primary">{{
								text.t('login')
							}}</AsamButton></AsamBaseForm
						><AsamButton @click="security.restore()" type="primary">{{
							text.t('restore')
						}}</AsamButton
						><!-- prettier-ignore --><AsamButton :disabled="!state.subject" @click="security.refresh()" type="primary">{{ text.t('refresh') }}</AsamButton
						><!-- prettier-ignore --><AsamButton :disabled="!state.subject" @click="expire" type="primary">{{ text.t('expire') }}</AsamButton
						><AsamButton @click="logout" type="primary">{{
							text.t('logout')
						}}</AsamButton
						><!-- prettier-ignore -->
						<div data-asam-field-caption v-if="state.subject">{{ text.t('context') }}
				<AsamSelect
					:aria-label="text.t('context')"
					:model-value="contextIndex"
					@change="changeContext"
				><AsamOption
						v-for="(context, index) in state.subject.contexts"
						:key="index"
						:value="index"
						:label="context.label"
					 /></AsamSelect></div>
						<AsamButton @click="router.push('/workspace')" type="primary">{{
							text.t('workspace')
						}}</AsamButton
						><AsamButton @click="router.push('/audit')" type="primary">{{
							text.t('audit')
						}}</AsamButton
						><AsamButton @click="router.back()" type="primary">{{
							text.t('back')
						}}</AsamButton>
					</header>
				</section></WebsiteAsamConfigProvider
			></Teleport
		><NavigationShell
			v-if="navigation"
			:key="state.epoch"
			:controller="navigation"
			:size="size"
		/>
		<main v-else ref="safe" tabindex="-1">
			<h2>{{ text.t('safeTitle') }}</h2>
			<p>{{ text.t('safe') }}</p>
		</main></AsamApplicationProvider
	>
</template>
<script setup lang="ts">
import { AsamConfigProvider as WebsiteAsamConfigProvider } from '@asam-ui/ui';
const websitePreviewControls =
	typeof document !== 'undefined' && !!document.getElementById('preview-settings-extra');
function websitePreviewTheme0(event: CustomEvent<'light' | 'dark'>) {
	dark.value = event.detail === 'dark';
}

import { useExampleText } from './Texts.js';
const text = useExampleText();
import { computed, nextTick, onBeforeUnmount, onMounted, provide, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import { AsamBaseForm, AsamButton, AsamCheckboxItem, AsamSelect, AsamOption } from '@asam-ui/ui';
import type { AsamControlSize } from '@asam-ui/ui';
import { AsamApplicationProvider } from '@asam-ui/pro/components';
import { NavigationShell } from '@asam-ui/pro/application/navigation';
import {
	createSecurity,
	createSecurityNavigation,
	formatSecurityStatus
} from '@asam-ui/pro/application/security';
import { createFixture, identities } from './Fixture.js';
import type { FixtureIdentity } from './Fixture.js';
import { applicationKey } from './Context.js';
import DataPage from './DataPage.vue';
const router = useRouter();
const fixture = createFixture();
fixture.controls = reactive(fixture.controls);
const security = createSecurity({ adapter: fixture.adapter, i18n: text.scope });
const state = security.state;
const identity = ref<FixtureIdentity>('editor');
const dark = ref(false);
const sizes: AsamControlSize[] = ['small', 'default', 'big', 'large'];
const size = ref<AsamControlSize>('default');
const safe = ref<HTMLElement>();
provide(applicationKey, { security, fixture });
const bridge = createSecurityNavigation({
	i18n: text.scope,
	security,
	router,
	components: { workspace: DataPage, audit: DataPage },
	items: [
		{ id: 'workspace', path: '/workspace', title: '工作台', resource: 'workspace' },
		{ id: 'audit', path: '/audit', title: '审计资料', resource: 'audit' }
	],
	rules: {
		'/workspace': { permission: 'workspace:read' },
		'/audit': { role: 'auditor', permission: 'audit:read' }
	},
	publicPaths: ['/safe', '/'],
	safePage: '/safe'
});
const navigation = bridge.navigation;
bridge.resume(router.currentRoute.value.fullPath);
const contextIndex = computed(
	() =>
		state.value.subject?.contexts.findIndex(
			(c) =>
				c.tenant === state.value.subject?.scope.tenant &&
				c.organization === state.value.subject?.scope.organization
		) ?? -1
);
const remove = security.onInvalidate(() => {
	void nextTick(() => safe.value?.focus());
});
async function login() {
	await security.login(identity.value);
}
function expire() {
	bridge.forgetReturn();
	security.expire();
}
async function logout() {
	bridge.forgetReturn();
	await security.logout();
}
async function changeContext(value: unknown) {
	const index = Number(value);
	const context = state.value.subject?.contexts[index];
	if (context) await security.switchContext(context);
}
onMounted(() => security.restore());
onBeforeUnmount(() => {
	remove();
	bridge.dispose();
	security.dispose();
});
</script>
<style>
.security-application {
	min-height: 100%;
	background: var(--asam-color-surface);
	color: var(--asam-color-text-primary);
}
.security-application header {
	padding: 16px;
	display: flex;
	flex-wrap: wrap;
	gap: 12px;
	align-items: center;
}
.security-application h1,
.security-application header p {
	flex-basis: 100%;
	margin: 0;
}
.security-application [data-asam-field-caption] {
	display: inline-flex;
	flex-wrap: wrap;
	gap: 8px;
	align-items: center;
}
.security-application main,
.security-application section {
	padding: 16px;
}
.security-application .asam-select {
	max-width: 100%;
	min-width: 160px;
}
.security-application section [data-asam-field-caption] {
	display: flex;
	margin-block: 12px;
}
</style>
