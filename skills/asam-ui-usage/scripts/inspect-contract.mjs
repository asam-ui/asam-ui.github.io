import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { resolve, relative, sep } from 'node:path';
import { pathToFileURL } from 'node:url';

const digest = (file) => createHash('sha256').update(readFileSync(file)).digest('hex');

/** Inspect delivered bytes, never a planned component list or a registry latest tag. */
export async function inspectContract(directory, { runtime = false } = {}) {
	const root = resolve(directory);
	const pkg = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'));
	if (!['@asam-ui/ui', '@asam-ui/ui-yudao', '@asam-ui/icons-vue'].includes(pkg.name))
		throw new Error(`Unsupported ASAM package: ${pkg.name}`);
	const files = new Map();
	const collectTarget = (target) => {
		if (typeof target === 'string') {
			const file = resolve(root, target);
			if (!target.startsWith('./') || relative(root, file).startsWith('..'))
				throw new Error(`Invalid export target: ${target}`);
			if (!existsSync(file) || !statSync(file).isFile())
				throw new Error(`Missing delivered export: ${target}`);
			files.set(relative(root, file).split(sep).join('/'), digest(file));
		} else if (target && typeof target === 'object') {
			for (const value of Object.values(target)) collectTarget(value);
		}
	};
	for (const value of Object.values(pkg.exports ?? {})) collectTarget(value);
	const walk = (directory) => {
		if (!existsSync(directory)) return;
		for (const entry of readdirSync(directory, { withFileTypes: true })) {
			const file = resolve(directory, entry.name);
			if (entry.isDirectory()) walk(file);
			else if (entry.isFile() && entry.name.endsWith('.d.ts'))
				files.set(relative(root, file).split(sep).join('/'), digest(file));
		}
	};
	walk(resolve(root, 'dist'));
	const result = {
		schemaVersion: 1,
		name: pkg.name,
		version: pkg.version,
		exports: pkg.exports,
		peerDependencies: pkg.peerDependencies,
		packageJsonSha256: digest(resolve(root, 'package.json')),
		files: [...files]
			.sort(([a], [b]) => a.localeCompare(b))
			.map(([path, sha256]) => ({ path, sha256 })),
		runtime: null,
		note: 'Export targets and declaration hashes identify delivered bytes. They do not prove prop forwarding, interactions, CSS dimensions or independent acceptance.'
	};
	if (runtime) {
		const entry = pkg.exports?.['.']?.import;
		if (typeof entry !== 'string') throw new Error('Missing root ESM import');
		const api = await import(pathToFileURL(resolve(root, entry)).href);
		result.runtime = { exports: Object.keys(api).sort() };
		if (pkg.name === '@asam-ui/ui') {
			const components = {};
			const directives = {};
			const globals = {};
			const plugins = [];
			const rootExports = (value) =>
				Object.keys(api)
					.filter((name) => api[name] === value)
					.sort();
			const rootMembers = (value) =>
				Object.keys(api)
					.sort()
					.flatMap((exportName) => {
						const exported = api[exportName];
						if (!exported || !['object', 'function'].includes(typeof exported))
							return [];
						const descriptors = Object.getOwnPropertyDescriptors(exported);
						return Object.keys(descriptors)
							.sort()
							.filter(
								(member) =>
									'value' in descriptors[member] &&
									descriptors[member].value === value
							)
							.map((member) => ({ exportName, member }));
					});
			const app = {
				config: { globalProperties: globals },
				use(plugin, ...args) {
					plugins.push({ rootExports: rootExports(plugin), argumentCount: args.length });
					return this;
				},
				component(name, component) {
					if (arguments.length === 1) return components[name];
					components[name] = component;
					return this;
				},
				directive(name, directive) {
					if (arguments.length === 1) return directives[name];
					directives[name] = directive;
					return this;
				}
			};
			app._context = { app, config: app.config };
			const fullEntry = pkg.exports?.['./full']?.import;
			if (fullEntry) {
				const full = await import(pathToFileURL(resolve(root, fullEntry)).href);
				(full.AsamUIFull ?? full.default).install(app);
			}
			const resolverEntry = pkg.exports?.['./resolver']?.import;
			const resolver = resolverEntry
				? (await import(pathToFileURL(resolve(root, resolverEntry)).href)).AsamUIResolver()
				: null;
			result.runtime.components = Object.keys(components)
				.sort()
				.map((name) => ({
					name,
					manual: api[name] === components[name],
					full: true,
					auto: resolver?.(name)?.name === name
				}));
			result.runtime.controlSizes = api.asamControlSizes ?? null;
			result.runtime.controlSizeMetrics = api.asamControlSizeMetrics ?? null;
			result.runtime.directives = Object.keys(directives).sort();
			result.runtime.directiveRegistrations = Object.keys(directives)
				.sort()
				.map((name) => ({ name, rootExports: rootExports(directives[name]) }));
			result.runtime.globalProperties = Object.keys(globals)
				.sort()
				.map((name) => ({
					name,
					rootExports: rootExports(globals[name]),
					rootMembers: rootMembers(globals[name])
				}));
			result.runtime.pluginRequests = plugins;
			result.runtime.registrationNote =
				'Full install runs against a registration recorder, not a Vue App. Nested app.use requests are recorded without executing plugins. Global properties and directive identities do not prove runtime/theme initialization, service calls, directive hooks or rendered behavior.';
		}
	}
	return result;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
	if (!process.argv[2] || process.argv.slice(3).some((arg) => arg !== '--runtime'))
		throw new Error(
			'Usage: node inspect-contract.mjs <installed-package-directory> [--runtime]'
		);
	console.log(
		JSON.stringify(
			await inspectContract(process.argv[2], {
				runtime: process.argv.includes('--runtime')
			}),
			null,
			2
		)
	);
}
