const registry = 'https://registry.npmjs.org/';

async function npmLatest(name) {
	const url = new URL(`${encodeURIComponent(name)}/latest`, registry);
	const response = await fetch(url, {
		headers: { 'cache-control': 'no-cache' },
		redirect: 'error',
		signal: AbortSignal.timeout(15000)
	});
	if (!response.ok) throw new Error(`${name} 查询失败（HTTP ${response.status}）`);
	const pkg = await response.json();
	if (
		pkg.name !== name ||
		typeof pkg.version !== 'string' ||
		!pkg.dist?.integrity ||
		!pkg.dist?.tarball
	)
		throw new Error(`${name} 的 latest 缺少版本或归档信息`);
	return {
		name,
		version: pkg.version,
		specifier: `${name}@${pkg.version}`,
		integrity: pkg.dist.integrity,
		tarball: pkg.dist.tarball,
		peerDependencies: pkg.peerDependencies ?? {},
		peerDependenciesMeta: pkg.peerDependenciesMeta ?? {},
		exports: pkg.exports ?? null,
		bin: pkg.bin ?? null
	};
}

try {
	const names = [...new Set(process.argv.slice(2))];
	if (!names.length || names.some((name) => !/^@asam-ui\/[a-z0-9][a-z0-9-]*$/.test(name)))
		throw new Error('用法：node check-latest.mjs @asam-ui/<包名> [@asam-ui/<包名> ...]');
	const packages = await Promise.all(names.map(npmLatest));
	const registryVersions = Object.fromEntries(
		packages.map(({ name, version }) => [name, version])
	);
	console.log(JSON.stringify({ registry, registryVersions, packages }, null, 2));
} catch (error) {
	console.error(error.message);
	process.exitCode = 1;
}
