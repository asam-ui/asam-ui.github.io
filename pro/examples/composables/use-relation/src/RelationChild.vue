<template>
	<p>{{ id }}：{{ index }}</p>
</template>
<script setup lang="ts">
import { useParent } from '@asam-ui/pro/application/composables/use-relation';
import { relationKey } from './relation.js';
defineProps<{ id: string }>();
const { index } = useParent(relationKey);
</script>
