#!/usr/bin/env bash
set -euo pipefail
command -v curl >/dev/null || { echo '需要 curl。' >&2; exit 2; }
command -v openssl >/dev/null || { echo '需要 OpenSSL 进行发行签名校验。' >&2; exit 2; }
asam_node22=${ASAM_NODE22:-node}
command -v "$asam_node22" >/dev/null || { echo '请准备 Node.js >=22.19 <23，或通过 ASAM_NODE22 指定独立运行时。' >&2; exit 2; }
"$asam_node22" -e 'const [major,minor]=process.versions.node.split(".").map(Number);if(major!==22||minor<19)process.exit(2)' || {
	echo '需要独立的 Node.js >=22.19 <23；Harness 使用自己的运行时。' >&2; exit 2;
}
manifest_url=$(printf '%s' 'aHR0cHM6Ly9hc2FtLXVpLmNuL2Rvd25sb2Fkcy9hc2FtLXVpLWV4cGVydC9wcmV2aWV3L3JlbGVhc2VzLzIwMjYuMTAuMjYtcHJldmlldy4xL2NuL3JlbGVhc2UuanNvbg==' | openssl base64 -d -A)
allow_http_test=0
stage=$(mktemp -d "${TMPDIR:-/tmp}/asam-expert.XXXXXXXX")
download() {
	"$asam_node22" -e 'const u=new URL(process.argv[1]);if(u.username||u.password||u.hash||(u.protocol!=="https:"&&!(process.argv[2]==="1"&&u.protocol==="http:")))process.exit(2)' "$1" "$allow_http_test"
	curl --fail --silent --show-error --max-time 60 --max-redirs 0 "$1" --output "$2"
}
printf '%s' 'LS0tLS1CRUdJTiBQVUJMSUMgS0VZLS0tLS0KTUlJQklqQU5CZ2txaGtpRzl3MEJBUUVGQUFPQ0FROEFNSUlCQ2dLQ0FRRUF2ZkxLejRaSmVickFTSUNpR3NNNgpxU1lFd3lyVlhmRlQvNG9iNTNwM2ZyeXFHUjFrRFJENmQ1MzNTS2s2RmhzdUMvK1F3enc4SGR2MHFxcnlIK1Y2ClZNRzdKK3Q2enRDVnFhZk9VajhwWDAwRjI1ZmlsWjQ2dWZ1bnpOQllZVTd6R29TcVVQVUlKcmRrNXRWQnk2cFIKdDhrOWRNOFgrYVVNaGUwT0dmeHN6SkYwQ09DbEJoRmtnelJRNmsyREJOYjMraWdiOSt4MXRiYzJ1dDJENzI0Ugo2akJoMkFhUGVxT2toN3Q5SExHbTBOSmlKdC8zL3Ywazg4QmZ0YnBHT1JYeTRaWGphU0RxTjhvcktLV1hKa3czClkrbHh1THlGZkVZbUFWWlBBaUlZcjFWOTQ1cHZDLzNQamo0M0Z0Mk9pNjdqbUlCUTJjUXB1R3NFL3FmbTlYNzQKSHdJREFRQUIKLS0tLS1FTkQgUFVCTElDIEtFWS0tLS0tCg==' | openssl base64 -d -A > "$stage/public.pem"
download "$manifest_url" "$stage/release.json"
download "$manifest_url.sig" "$stage/release.json.sig"
openssl base64 -d -A -in "$stage/release.json.sig" -out "$stage/signature.bin"
openssl dgst -sha256 -verify "$stage/public.pem" -signature "$stage/signature.bin" "$stage/release.json" >/dev/null || {
	echo "发行清单签名无效；未执行安装程序。文件保留于 $stage。" >&2; exit 2;
}
"$asam_node22" -e 'const fs=require("node:fs"),m=JSON.parse(fs.readFileSync(process.argv[1],"utf8"));const a=m.artifacts?.filter(a=>a.host==="installer"&&a.platform==="any"&&a.arch==="any");if(m.schemaVersion!==1||a?.length!==1||!/^[a-f0-9]{64}$/.test(a[0].sha256)||!Number.isSafeInteger(a[0].bytes)||a[0].bytes<=0||a[0].bytes>67108864)process.exit(2);fs.writeFileSync(process.argv[2],JSON.stringify(a[0]));' "$stage/release.json" "$stage/runner.json"
runner_url=$("$asam_node22" -e 'console.log(JSON.parse(require("node:fs").readFileSync(process.argv[1],"utf8")).url)' "$stage/runner.json")
download "$runner_url" "$stage/installer.mjs"
"$asam_node22" -e 'const fs=require("node:fs"),c=require("node:crypto"),a=JSON.parse(fs.readFileSync(process.argv[1],"utf8")),b=fs.readFileSync(process.argv[2]);if(b.length!==a.bytes||c.createHash("sha256").update(b).digest("hex")!==a.sha256)process.exit(2)' "$stage/runner.json" "$stage/installer.mjs" || {
	echo "安装程序校验失败；旧安装保持原状。文件保留于 $stage。" >&2; exit 2;
}
if [ "$allow_http_test" = 1 ]; then
	"$asam_node22" "$stage/installer.mjs" --manifest "$manifest_url" --public-key-file "$stage/public.pem" --allow-http-test "$@"
else
	"$asam_node22" "$stage/installer.mjs" --manifest "$manifest_url" --public-key-file "$stage/public.pem" "$@"
fi
