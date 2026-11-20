#!/usr/bin/env bash
set -euo pipefail
command -v curl >/dev/null || { echo '需要 curl。' >&2; exit 2; }
command -v openssl >/dev/null || { echo '需要 OpenSSL 进行发行签名校验。' >&2; exit 2; }
asam_node22=${ASAM_NODE22:-node}
command -v "$asam_node22" >/dev/null || { echo '请准备 Node.js >=22.19 <23，或通过 ASAM_NODE22 指定独立运行时。' >&2; exit 2; }
"$asam_node22" -e 'const [major,minor]=process.versions.node.split(".").map(Number);if(major!==22||minor<19)process.exit(2)' || {
	echo '需要独立的 Node.js >=22.19 <23；Harness 使用自己的运行时。' >&2; exit 2;
}
manifest_url=$(printf '%s' 'aHR0cHM6Ly9hc2FtLXVpLmNuL2luc3RhbGwvcmVsZWFzZXMvMS4wLjEtZGFyd2luLWFybTY0L3JlbGVhc2UuanNvbg==' | openssl base64 -d -A)
allow_http_test=0
downloads=$("$asam_node22" -e 'const fs=require("node:fs"),p=require("node:path"),root=p.join(require("node:os").homedir(),"Downloads"),dir=p.join(root,"ASAM-UI");try{fs.mkdirSync(dir,{recursive:true,mode:0o700});if(!fs.lstatSync(dir).isDirectory())process.exit(2);process.stdout.write(dir)}catch{process.exit(2)}') || {
	echo '无法使用 Downloads/ASAM-UI，请检查同名文件、目录链接和写入权限。' >&2; exit 2;
}
stage=$(mktemp -d "$downloads/.asam-bootstrap-XXXXXXXX")
manifest_path="$stage/release.json"
download() {
	"$asam_node22" -e 'const u=new URL(process.argv[1]);if(u.username||u.password||u.hash||(u.protocol!=="https:"&&!(process.argv[2]==="1"&&u.protocol==="http:")))process.exit(2)' "$1" "$allow_http_test" || return 2
	{ test ! -e "$2" && test ! -L "$2"; } || { echo 'DOWNLOAD_FILE_ALREADY_EXISTS' >&2; exit 2; }
	(set -o noclobber; curl --fail --silent --show-error --max-time 60 --max-redirs 0 "$1" > "$2")
}
download_failed() {
	echo "下载未完成。文件保留于 ${stage}。" >&2; exit 2;
}
printf '%s' 'LS0tLS1CRUdJTiBQVUJMSUMgS0VZLS0tLS0KTUlJQm9qQU5CZ2txaGtpRzl3MEJBUUVGQUFPQ0FZOEFNSUlCaWdLQ0FZRUE0MmliclgzK3hPOXk2TmZQOXl1MAo4S0ZxUlBnYWc4eU5mNGVxS1k1K3ZhNHVPV3VLbDBVeW1wclZoMS9aSnFTZjU1WkpuM2szbkFFNlZaNjVSUi9uCjhlMlBZUGhxK3NLRHpkTHUxbTM1SCtuTktWT1ZkMExGZDhmRTFqdWdtblFOaDBqYWJNenNUaXZ0YTkybE00ZHoKemVFV3B1WENudkM1blIxbGVPTEJSUUxTM1ZpeHdxa04zSENrSWNlRWkrK1YwMm9jazBxemtPWnF2M2szbkZKYwphQ0pHYkhQNTB5UElPMUFmR0FWUHdBV2N6VWljOGxZUDZ1d3VTa2NNSm1pSUtqUWZGazI4OTFBMUt0V01uUnc0CjFrVlNqWlFkblQvamVZdE9FdDF2cllTNFNNTmJlMllKNVpWSEl1VWJoSGRvVU9HNDlpQTZOeURUSitiVDZ0aGgKK0hrM1RYSE1ZSGw0VFEyZklBUkRwQ1pncFlBU1ZQekRHYWdrbDNzSHNtUXByQlE2eCtML1NucjB6UThCbUpkVwp3ZDJHc3VVaXpBTGVjYnFpN21zc1NjQnVaY2EyUGZPZDAyNmUyak1PZjhmZ1lwdEFPN0NLQU8vR281bFJsZEdJClVxMk9UOEk2RkoxLzhoMi8xM1RJQTlEbDYzSFpLSlk2dHY3ZllUK0lCRWlaQWdNQkFBRT0KLS0tLS1FTkQgUFVCTElDIEtFWS0tLS0tCg==' | openssl base64 -d -A > "$stage/public.pem"
download "$manifest_url" "$manifest_path" || download_failed
download "$manifest_url.sig" "$manifest_path.sig" || download_failed
openssl base64 -d -A -in "$manifest_path.sig" -out "$stage/signature.bin"
openssl dgst -sha256 -verify "$stage/public.pem" -signature "$stage/signature.bin" "$manifest_path" >/dev/null || {
	echo "发行清单签名无效；未执行安装程序。文件保留于 ${stage}。" >&2; exit 2;
}
"$asam_node22" -e 'const fs=require("node:fs"),m=JSON.parse(fs.readFileSync(process.argv[1],"utf8"));const a=m.artifacts?.filter(a=>a.host==="installer"&&a.platform==="any"&&a.arch==="any");if(m.schemaVersion!==1||a?.length!==1||!/^[a-f0-9]{64}$/.test(a[0].sha256)||!Number.isSafeInteger(a[0].bytes)||a[0].bytes<=0||a[0].bytes>67108864)process.exit(2);fs.writeFileSync(process.argv[2],JSON.stringify(a[0]));' "$manifest_path" "$stage/runner.json"
runner_url=$("$asam_node22" -e 'console.log(JSON.parse(require("node:fs").readFileSync(process.argv[1],"utf8")).url)' "$stage/runner.json")
release_label=$("$asam_node22" -e 'const m=JSON.parse(require("node:fs").readFileSync(process.argv[1],"utf8"));console.log(String(m.release||"release").replace(/[^a-zA-Z0-9_.-]/g,"_").slice(0,80))' "$manifest_path")
runner_path=$("$asam_node22" -e '
const fs=require("node:fs"),path=require("node:path"),crypto=require("node:crypto"),a=JSON.parse(fs.readFileSync(process.argv[1],"utf8")),root=process.argv[2],stem="installer-"+process.argv[3]+"-"+a.sha256.slice(-16),canonical=path.join(root,stem+".mjs");
function matches(file){try{const s=fs.lstatSync(file);return s.isFile()&&!s.isSymbolicLink()&&s.size===a.bytes&&crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex")===a.sha256}catch(e){if(["ENOENT","EACCES","EPERM"].includes(e.code))return false;throw e}}
function occupied(file){try{fs.lstatSync(file);return true}catch(e){if(e.code==="ENOENT")return false;throw e}}
if (matches(canonical)) { console.log(canonical); process.exit(0); }
const scanProgram = `process.stdout.write(JSON.stringify(require("node:fs").readdirSync(process.argv[1])))`;
const scan = require("node:child_process").spawnSync(process.execPath, ["-e", scanProgram, root], {
  encoding: "utf8", timeout: 10000, killSignal: "SIGKILL", maxBuffer: 2097152
});
if (scan.error || scan.status !== 0) {
  const failure = { code: scan.error?.code || "DOWNLOAD_CACHE_SCAN_FAILED", status: scan.status, signal: scan.signal, stderr: scan.stderr, error: scan.error?.message };
  const log = path.join(path.dirname(process.argv[1]), "runner-cache-error.json");
  fs.writeFileSync(log, JSON.stringify(failure), { flag: "wx", mode: 0o600 });
  console.error(failure.code === "ETIMEDOUT" ? "读取安装器缓存目录超时，原文件已保留。" : "无法读取安装器缓存目录，原文件已保留。");
  console.error("详情：" + log);
  process.exit(2);
}
const candidates = JSON.parse(scan.stdout).map(name => path.join(root, name));
const existing = [canonical, ...candidates].find(matches);
console.log(existing||(!occupied(canonical)?canonical:path.join(root,stem+"-"+crypto.randomBytes(16).toString("hex")+".mjs")));
' "$stage/runner.json" "$downloads" "$release_label")
verify_runner() {
	"$asam_node22" -e 'const fs=require("node:fs"),c=require("node:crypto"),a=JSON.parse(fs.readFileSync(process.argv[1],"utf8")),file=process.argv[2];if(!fs.lstatSync(file,{throwIfNoEntry:false})?.isFile())process.exit(2);const b=fs.readFileSync(file);if(b.length!==a.bytes||c.createHash("sha256").update(b).digest("hex")!==a.sha256)process.exit(2)' "$stage/runner.json" "$1"
}
runner_verification_failed() {
	echo "安装程序校验失败；旧安装保持原状。文件保留于 ${stage}。" >&2; exit 2;
}
if ! verify_runner "$runner_path"; then
	incoming="$stage/runner.download"
	download "$runner_url" "$incoming" || download_failed
	verify_runner "$incoming" || runner_verification_failed
	"$asam_node22" -e '
const fs = require("node:fs");
const [staged, destination] = process.argv.slice(1);
try {
	try {
		fs.linkSync(staged, destination);
	} catch (error) {
		const unsupported = ["ENOTSUP", "EOPNOTSUPP", "ENOSYS", "EPERM", "EXDEV", "EMLINK"];
		if (!unsupported.includes(error.code) && !(process.platform === "win32" && error.code === "EISDIR"))
			throw error;
		fs.copyFileSync(staged, destination, fs.constants.COPYFILE_EXCL);
	}
} catch (error) {
	if (error.code !== "EEXIST") throw error;
}
' "$incoming" "$runner_path" || {
		echo "无法保留已校验的安装程序。文件保留于 ${stage}。" >&2; exit 2;
	}
	verify_runner "$runner_path" || runner_verification_failed
	rm -f -- "$incoming" || true
fi
run_installer() {
	if [ "$allow_http_test" = 1 ]; then
		"$asam_node22" "$runner_path" --manifest "$manifest_url" --public-key-file "$stage/public.pem" --allow-http-test "$@"
	else
		"$asam_node22" "$runner_path" --manifest "$manifest_url" --public-key-file "$stage/public.pem" "$@"
	fi
}
# A piped script keeps its own stdin; only the interactive runner reads the TTY.
if [ "$#" -eq 0 ] && [ -z "${BASH_SOURCE[0]:-}" ] && [ ! -t 0 ] && { exec 3</dev/tty; } 2>/dev/null; then
	run_installer "$@" <&3
	exec 3<&-
else
	run_installer "$@"
fi
rm -f -- "$manifest_path" "$manifest_path.sig" || true
