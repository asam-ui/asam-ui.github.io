<template>
	<section>
		<h2>{{ preferences.t(page) }}</h2>
		<p>{{ preferences.t('greeting', { name: 'ASAM' }) }}</p>
		<div data-asam-field-caption>
			{{ preferences.t('draft') }}
			<AsamInput v-model="draft" data-draft :aria-label="preferences.t('draft')" />
		</div>
		<p data-format>
			{{ preferences.number(12345.67) }} ·
			{{
				preferences.date(new Date('2026-10-18T12:00:00Z'), {
					timeZone: 'UTC',
					dateStyle: 'long'
				})
			}}
		</p>
	</section>
</template>
<script setup lang="ts">
import { AsamInput } from '@asam-ui/ui';
import { inject, ref } from 'vue';
import { useRoute } from 'vue-router';
import { preferenceKey } from './context.js';
const preferences = inject(preferenceKey)!;
const page = useRoute().path === '/notes' ? 'notes' : 'home';
const draft = ref('');
</script>
