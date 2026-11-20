<template>
	<main>
		<h1>{{ text.t('title') }}</h1>
		<p>{{ text.t('description') }}</p>
		<!-- prettier-ignore -->
		<div data-asam-field-caption>{{ text.t('scenario') }}
			<AsamSelect
				v-model="scenario"
				:aria-label="text.t('scenario')"
				@change="updateScenario"
			><AsamOption value="success" :label="text.t('success')"  /><AsamOption value="empty" :label="text.t('empty')"  /><AsamOption value="business" :label="text.t('business')"  /><AsamOption value="auth" :label="text.t('auth')"  /><AsamOption value="network" :label="text.t('network')"  /><AsamOption value="unknown" :label="text.t('unknown')"  /></AsamSelect></div>
		<AsamButton @click="reload" type="primary">{{ text.t('load') }}</AsamButton
		><AsamButton @click="rotateAuth" type="primary">{{ text.t('rotate') }}</AsamButton
		><AsamButton @click="mounted = !mounted" type="primary">{{ text.t('mount') }}</AsamButton>
		<p role="status">{{ text.t('revisions') }}{{ authRevision }}</p>
		<section v-if="notice" role="alert">
			<h2>{{ text.t(notice.kind === 'auth' ? 'authTitle' : 'failedTitle') }}</h2>
			<p>{{ notice.message }}（{{ notice.traceId }}）</p>
			<AsamButton @click="recover" type="primary">{{ text.t('recover') }}</AsamButton>
		</section>
		<AsamRemoteSelect
			v-if="mounted"
			ref="remote"
			v-model="value"
			:request="request"
			:placeholder="text.t('placeholder')"
		/>
		<p>
			{{ text.t('selected') }}{{ value ?? text.t('none') }}{{ text.t('feedback')
			}}{{ feedbackCount }}
		</p>
	</main>
</template>

<script setup lang="ts">
import { useExampleText } from './Texts.js';
import { AsamButton, AsamSelect, AsamOption } from '@asam-ui/ui';

import { inject, onUnmounted, ref } from 'vue';
import { AsamRemoteSelect } from '@asam-ui/ui';
import type { AsamAsyncSelectExpose, AsamValue } from '@asam-ui/ui';
import type { SafeError } from '@asam-ui/pro/application/transport';
import type { Scenario } from './mock.js';
import { demoContextKey } from './context.js';

const context = inject(demoContextKey);
if (!context) throw new Error('Transport demo context missing');
const demo = context;
const text = useExampleText(demo.i18n);

const scenario = ref<Scenario>('success');
const value = ref<string | null>(null);
const mounted = ref(true);
const remote = ref<AsamAsyncSelectExpose<AsamValue, object>>();
const notice = ref<SafeError>();
const feedbackCount = ref(0);
const authRevision = ref(0);
const request = { url: '/local-options', method: 'get' as const };
const remove = demo.subscribe((error) => {
	notice.value = error;
	feedbackCount.value++;
});
function updateScenario() {
	demo.setScenario(scenario.value);
}
function reload() {
	void remote.value?.reload({ force: true });
}
function rotateAuth() {
	demo.updateAuth();
	authRevision.value++;
}
function recover() {
	scenario.value = 'success';
	updateScenario();
	notice.value = undefined;
	reload();
}
onUnmounted(remove);
</script>

<style scoped>
main {
	max-width: 760px;
	padding: 24px;
	margin: auto;
	font-family: sans-serif;
}
.asam-button,
.asam-select {
	margin: 8px;
}
section {
	padding: 16px;
	border: 1px solid var(--asam-semantic-danger-outline);
	color: var(--asam-semantic-danger-foreground);
	background: var(--asam-semantic-danger-soft);
	margin: 16px 0;
}
</style>
