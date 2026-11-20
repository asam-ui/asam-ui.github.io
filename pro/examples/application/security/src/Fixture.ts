import type {
	SecurityAdapter,
	SecurityContext,
	SecuritySubject
} from '@asam-ui/pro/application/security';

/** Local demonstration only. Replace this entire adapter with your existing host backend. */
export const contexts: SecurityContext[] = [
	{ tenant: 0, organization: null, label: '总部 / 全部组织' },
	{ tenant: 'east', organization: 0, label: '华东 / 零号组织' },
	{ tenant: 'east', organization: 'sales', label: '华东 / 销售' }
];
export const identities = {
	editor: { name: '林编辑', roles: ['editor'], permissions: ['workspace:read', 'record:write'] },
	auditor: { name: '周审计', roles: ['auditor'], permissions: ['workspace:read', 'audit:read'] },
	readonly: {
		name: '只读访客',
		roles: ['editor'],
		permissions: ['workspace:read', 'record:write']
	},
	empty: { name: '未授权访客', roles: [], permissions: [] }
};
export type FixtureIdentity = keyof typeof identities;
export function createFixture() {
	let remembered: SecuritySubject | null = null;
	const controls = { fail: false, readFail: false, delay: 40 };
	async function wait() {
		await new Promise((resolve) => setTimeout(resolve, controls.delay));
	}
	function subject(identity: FixtureIdentity): SecuritySubject {
		return {
			id: identity,
			...identities[identity],
			scope: contexts[0]!,
			contexts,
			expiresAt: Date.now() + 120000,
			readOnly: identity === 'readonly'
		};
	}
	const adapter: SecurityAdapter<FixtureIdentity> = {
		async login(identity, request) {
			await wait();
			if (controls.fail) throw new Error('fixture login');
			const value = subject(identity);
			if (request.isCurrent()) remembered = value;
			return value;
		},
		async restore() {
			await wait();
			if (controls.fail) throw new Error('fixture restore');
			return remembered;
		},
		async refresh(current, request) {
			await wait();
			if (controls.fail) throw new Error('fixture refresh');
			const value = { ...current, expiresAt: Date.now() + 120000 };
			if (request.isCurrent()) remembered = value;
			return value;
		},
		async switchContext(current, scope, request) {
			await wait();
			if (controls.fail) throw new Error('fixture context');
			const value = { ...current, scope, expiresAt: Date.now() + 120000 };
			if (request.isCurrent()) remembered = value;
			return value;
		},
		async logout(request) {
			if (request.isCurrent()) remembered = null;
			await wait();
			if (controls.fail) throw new Error('fixture logout');
		}
	};
	return {
		adapter,
		controls,
		async read(current: SecuritySubject) {
			await wait();
			if (controls.readFail) throw new Error('fixture data');
			return [
				`${current.name} / ${String(current.scope.tenant)} / ${String(current.scope.organization)} 的资料`
			];
		}
	};
}
