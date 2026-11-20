import type { InjectionKey } from 'vue';
import type { AsamI18n } from '@asam-ui/ui/i18n';
import type { SafeError } from '@asam-ui/pro/application/transport';
import type { Scenario } from './mock.js';
export interface DemoContext {
	i18n?: AsamI18n;
	setScenario(scenario: Scenario): void;
	updateAuth(): void;
	subscribe(listener: (error: SafeError) => void): () => void;
}
export const demoContextKey: InjectionKey<DemoContext> = Symbol('TransportDemo');
