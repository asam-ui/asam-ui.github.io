import type { InjectionKey } from 'vue';
import type { PreferenceController } from '@asam-ui/pro/application/preferences';
export const preferenceKey: InjectionKey<PreferenceController> = Symbol('preferences');
