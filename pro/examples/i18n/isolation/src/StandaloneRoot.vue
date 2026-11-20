<template>
	<AsamConfigProvider :i18n="scope">
		<p data-second-root>{{ scope.t('ui.common.retry') }}</p>
		<AsamFormActions />
	</AsamConfigProvider>
</template>
<script setup lang="ts">
import { onScopeDispose } from 'vue';
import { AsamConfigProvider, AsamFormActions } from '@asam-ui/ui';
import { createAsamI18n } from '@asam-ui/ui/i18n';
const scope = createAsamI18n({ locale: 'en' });
onScopeDispose(scope.dispose);
</script>
