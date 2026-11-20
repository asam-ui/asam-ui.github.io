import { TransportFault } from '@asam-ui/pro/application/transport';
import type { ClientOptions } from '@asam-ui/pro/application/transport';

export type Scenario = 'success' | 'empty' | 'business' | 'auth' | 'network' | 'unknown';
export function createMockTransport(): {
	transport: ClientOptions['transport'];
	setScenario(scenario: Scenario): void;
} {
	let scenario: Scenario = 'success';
	return {
		setScenario(value) {
			scenario = value;
		},
		async transport(_input, context) {
			const selected = scenario;
			await new Promise<void>((resolve, reject) => {
				const abort = () => {
					clearTimeout(timer);
					reject(new TransportFault('cancelled'));
				};
				const timer = setTimeout(() => {
					context.signal.removeEventListener('abort', abort);
					resolve();
				}, 30);
				context.signal.addEventListener('abort', abort, { once: true });
				if (context.signal.aborted) abort();
			});
			if (selected === 'network') throw new TransportFault('network');
			if (selected === 'unknown') throw new Error('mock-secret-token-hidden');
			if (selected === 'auth') return { mode: 'raw', status: 401, body: null };
			if (selected === 'business') throw new TransportFault('business');
			return {
				mode: 'raw',
				status: 200,
				body: {
					data:
						selected === 'empty'
							? []
							: [
									{ label: '测试项目一', value: 'one' },
									{ label: '测试项目二', value: 'two' }
								]
				}
			};
		}
	};
}

export function unwrapMock(body: unknown): unknown {
	if (!body || typeof body !== 'object' || !('data' in body))
		throw new TransportFault('business');
	return body.data;
}
