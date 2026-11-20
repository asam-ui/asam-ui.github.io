import type { InjectionKey } from 'vue';
export const lifecycleKey: InjectionKey<Record<string, number>> = Symbol(
	'navigation-example-lifecycle'
);
