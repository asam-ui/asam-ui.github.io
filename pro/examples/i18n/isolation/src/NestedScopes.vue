<template>
	<AsamConfigProvider :i18n="child">
		<p data-nested>{{ child.t('ui.common.retry') }}</p>
		<AsamFormActions />
	</AsamConfigProvider>
</template>
<script setup lang="ts">
import { onScopeDispose } from 'vue';
import { AsamConfigProvider, AsamFormActions } from '@asam-ui/ui';
import { createAsamI18n } from '@asam-ui/ui/i18n';
import type { AsamI18n } from '@asam-ui/ui/i18n';
const props = defineProps<{ parent: AsamI18n }>();
const child = createAsamI18n({ locale: 'en' }, props.parent);
onScopeDispose(child.dispose);
</script>
