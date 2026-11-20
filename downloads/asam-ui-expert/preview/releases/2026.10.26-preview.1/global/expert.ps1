$ErrorActionPreference = 'Stop'
$manifestUrl = [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String('aHR0cHM6Ly9hc2FtLXVpLmdpdGh1Yi5pby9kb3dubG9hZHMvYXNhbS11aS1leHBlcnQvcHJldmlldy9yZWxlYXNlcy8yMDI2LjEwLjI2LXByZXZpZXcuMS9nbG9iYWwvcmVsZWFzZS5qc29u'))
$publicKey = [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String('LS0tLS1CRUdJTiBQVUJMSUMgS0VZLS0tLS0KTUlJQklqQU5CZ2txaGtpRzl3MEJBUUVGQUFPQ0FROEFNSUlCQ2dLQ0FRRUF2ZkxLejRaSmVickFTSUNpR3NNNgpxU1lFd3lyVlhmRlQvNG9iNTNwM2ZyeXFHUjFrRFJENmQ1MzNTS2s2RmhzdUMvK1F3enc4SGR2MHFxcnlIK1Y2ClZNRzdKK3Q2enRDVnFhZk9VajhwWDAwRjI1ZmlsWjQ2dWZ1bnpOQllZVTd6R29TcVVQVUlKcmRrNXRWQnk2cFIKdDhrOWRNOFgrYVVNaGUwT0dmeHN6SkYwQ09DbEJoRmtnelJRNmsyREJOYjMraWdiOSt4MXRiYzJ1dDJENzI0Ugo2akJoMkFhUGVxT2toN3Q5SExHbTBOSmlKdC8zL3Ywazg4QmZ0YnBHT1JYeTRaWGphU0RxTjhvcktLV1hKa3czClkrbHh1THlGZkVZbUFWWlBBaUlZcjFWOTQ1cHZDLzNQamo0M0Z0Mk9pNjdqbUlCUTJjUXB1R3NFL3FmbTlYNzQKSHdJREFRQUIKLS0tLS1FTkQgUFVCTElDIEtFWS0tLS0tCg=='))
$allowHttpForTest = $false
function Assert-DownloadUrl([string]$Value) {
	$uri = [Uri]$Value
	if ($uri.UserInfo -or $uri.Fragment -or ($uri.Scheme -ne 'https' -and -not ($allowHttpForTest -and $uri.Scheme -eq 'http'))) {
		throw '下载地址不受支持；正式入口必须使用 HTTPS。'
	}
}
function Download-File([string]$Url, [string]$Destination) {
	Assert-DownloadUrl $Url
	Invoke-WebRequest -UseBasicParsing -MaximumRedirection 0 -TimeoutSec 60 -Uri $Url -OutFile $Destination
}
$nodeCandidates = @()
if ($env:ASAM_NODE22) {
	if (-not [IO.Path]::IsPathRooted($env:ASAM_NODE22)) { throw 'ASAM_NODE22 必须是独立 Node 22 的绝对路径。' }
	$nodeCandidates = @($env:ASAM_NODE22)
} else { $nodeCandidates = @(Get-Command node.exe -All -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Source -Unique) }
$node = $null
foreach ($candidate in $nodeCandidates) {
	try {
		$nodeVersion = (& $candidate --version).Trim()
		if ($LASTEXITCODE -eq 0 -and $nodeVersion -match '^v22\.(\d+)\.' -and [int]$Matches[1] -ge 19) { $node = $candidate; break }
	} catch { }
}
if (-not $node) { throw '请先准备独立 Node.js >=22.19 <23，可通过 ASAM_NODE22 指定其绝对路径；Harness 使用自己的运行时。' }
$stage = Join-Path ([IO.Path]::GetTempPath()) ('asam-expert-' + [Guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $stage | Out-Null
$manifestPath = Join-Path $stage 'release.json'
$signaturePath = Join-Path $stage 'release.json.sig'
Download-File $manifestUrl $manifestPath
Download-File ($manifestUrl + '.sig') $signaturePath
$rsa = [Security.Cryptography.RSA]::Create()
$parameters = New-Object Security.Cryptography.RSAParameters
$parameters.Modulus = [Convert]::FromBase64String('vfLKz4ZJebrASICiGsM6qSYEwyrVXfFT/4ob53p3fryqGR1kDRD6d533SKk6FhsuC/+Qwzw8Hdv0qqryH+V6VMG7J+t6ztCVqafOUj8pX00F25filZ46ufunzNBYYU7zGoSqUPUIJrdk5tVBy6pRt8k9dM8X+aUMhe0OGfxszJF0COClBhFkgzRQ6k2DBNb3+igb9+x1tbc2ut2D724R6jBh2AaPeqOkh7t9HLGm0NJiJt/3/v0k88BftbpGORXy4ZXjaSDqN8orKKWXJkw3Y+lxuLyFfEYmAVZPAiIYr1V945pvC/3Pjj43Ft2Oi67jmIBQ2cQpuGsE/qfm9X74Hw==')
$parameters.Exponent = [Convert]::FromBase64String('AQAB')
$rsa.ImportParameters($parameters)
try {
	$signature = [Convert]::FromBase64String(([IO.File]::ReadAllText($signaturePath)).Trim())
	if (-not $rsa.VerifyData([IO.File]::ReadAllBytes($manifestPath), $signature, [Security.Cryptography.HashAlgorithmName]::SHA256, [Security.Cryptography.RSASignaturePadding]::Pkcs1)) {
		throw '发行清单签名无效，已停止；未执行安装程序。'
	}
} finally { $rsa.Dispose() }
$manifest = Get-Content -Raw -LiteralPath $manifestPath | ConvertFrom-Json
$candidates = @($manifest.artifacts | Where-Object { $_.host -eq 'installer' -and $_.platform -eq 'any' -and $_.arch -eq 'any' })
if ($manifest.schemaVersion -ne 1 -or $candidates.Count -ne 1) { throw '发行清单格式不受支持。' }
$runner = $candidates[0]
if ($runner.sha256 -notmatch '^[a-f0-9]{64}$' -or $runner.bytes -le 0 -or $runner.bytes -gt 67108864) { throw '安装程序摘要无效。' }
$runnerPath = Join-Path $stage 'installer.mjs'
Download-File $runner.url $runnerPath
$hasher = [Security.Cryptography.SHA256]::Create()
try { $runnerHash = [BitConverter]::ToString($hasher.ComputeHash([IO.File]::ReadAllBytes($runnerPath))).Replace('-', '').ToLowerInvariant() }
finally { $hasher.Dispose() }
if ((Get-Item -LiteralPath $runnerPath).Length -ne $runner.bytes -or $runnerHash -ne $runner.sha256) {
	throw '安装程序校验失败，已停止；旧安装保持原状。'
}
$keyPath = Join-Path $stage 'release-public.pem'
[IO.File]::WriteAllText($keyPath, $publicKey)
$forward = @('--manifest', $manifestUrl, '--public-key-file', $keyPath)
if ($allowHttpForTest) { $forward += '--allow-http-test' }
& $node $runnerPath @forward @args
if ($LASTEXITCODE -ne 0) { throw "安装未完成（退出码 $LASTEXITCODE）；引导文件保留于 $stage。" }
