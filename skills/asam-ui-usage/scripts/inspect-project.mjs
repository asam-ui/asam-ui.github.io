import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';

const lockNames = {
	'pnpm-lock.yaml': 'pnpm',
	'package-lock.json': 'npm',
	'npm-shrinkwrap.json': 'npm',
	'yarn.lock': 'yarn',
	'bun.lock': 'bun',
	'bun.lockb': 'bun'
};
const readJson = (path) => JSON.parse(readFileSync(path, 'utf8').replace(/^\uFEFF/, ''));

export function inspectProject(directory) {
	const root = resolve(directory);
	const packagePath = resolve(root, 'package.json');
	const pkg = existsSync(packagePath) ? readJson(packagePath) : {};
	const ancestors = [];
	let cursor = root;
	while (true) {
		const manifest = resolve(cursor, 'package.json');
		const data = existsSync(manifest) ? readJson(manifest) : {};
		const locks = Object.entries(lockNames)
			.filter(([name]) => existsSync(resolve(cursor, name)))
			.map(([name, manager]) => ({ path: resolve(cursor, name), manager }));
		if (
			locks.length ||
			data.packageManager ||
			data.workspaces ||
			existsSync(resolve(cursor, 'pnpm-workspace.yaml'))
		) {
			ancestors.push({ root: cursor, packageManager: data.packageManager ?? null, locks });
		}
		if (existsSync(resolve(cursor, '.git')) || dirname(cursor) === cursor) break;
		cursor = dirname(cursor);
	}
	const declaredManager = ancestors.find((entry) => entry.packageManager)?.packageManager ?? null;
	const closestLocks = ancestors.find((entry) => entry.locks.length)?.locks ?? [];
	const managers = new Set(closestLocks.map((entry) => entry.manager));
	if (declaredManager) managers.add(declaredManager.split('@')[0]);
	const dependencies = { ...pkg.devDependencies, ...pkg.dependencies };
	const installed = {};
	for (const name of [
		'vue',
		'vite',
		'element-plus',
		'@asam-ui/ui',
		'@asam-ui/icons-vue',
		'@asam-ui/ui-yudao',
		'unplugin-vue-components'
	]) {
		const path = resolve(root, 'node_modules', name, 'package.json');
		if (existsSync(path)) {
			const data = readJson(path);
			installed[name] = {
				version: data.version,
				peerDependencies: data.peerDependencies,
				exports: data.exports
			};
		}
	}
	const files = [
		'AGENTS.md',
		'vite.config.ts',
		'vite.config.mts',
		'vite.config.js',
		'vite.config.mjs',
		'src/main.ts',
		'src/main.js',
		'src/App.vue',
		'tsconfig.json'
	]
		.filter((name) => existsSync(resolve(root, name)))
		.map((name) => ({
			path: name,
			sha256: createHash('sha256')
				.update(readFileSync(resolve(root, name)))
				.digest('hex')
		}));
	return {
		root,
		kind: !existsSync(packagePath) ? 'new' : dependencies.vue ? 'vue' : 'review-framework',
		packageManager: managers.size === 1 ? [...managers][0] : null,
		declaredManager,
		managerConflict: managers.size > 1,
		lockConflict: closestLocks.length > 1,
		ancestors,
		dependencies,
		installed,
		scripts: pkg.scripts ?? {},
		files,
		next: 'Read applicable AGENTS and existing configuration before preparing a diff; this inspection does not modify files or prove compatibility.'
	};
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
	if (!process.argv[2])
		throw new Error('Usage: node inspect-project.mjs <consumer-package-directory>');
	console.log(JSON.stringify(inspectProject(process.argv[2]), null, 2));
}
