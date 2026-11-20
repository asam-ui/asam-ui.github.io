import type { InjectionKey } from 'vue';
import type { createSecurity } from '@asam-ui/pro/application/security';
import type { createFixture, FixtureIdentity } from './Fixture.js';
export const applicationKey: InjectionKey<{
	security: ReturnType<typeof createSecurity<FixtureIdentity>>;
	fixture: ReturnType<typeof createFixture>;
}> = Symbol('SecurityExample');
