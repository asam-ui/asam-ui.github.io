$ErrorActionPreference = 'Stop'
$manifestUrl = [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String('aHR0cHM6Ly9hc2FtLXVpLmNuL2luc3RhbGwvcmVsZWFzZXMvMS4wLjItd2luZG93cy14NjQvcmVsZWFzZS5qc29u'))
$publicKey = [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String('LS0tLS1CRUdJTiBQVUJMSUMgS0VZLS0tLS0KTUlJQm9qQU5CZ2txaGtpRzl3MEJBUUVGQUFPQ0FZOEFNSUlCaWdLQ0FZRUE0MmliclgzK3hPOXk2TmZQOXl1MAo4S0ZxUlBnYWc4eU5mNGVxS1k1K3ZhNHVPV3VLbDBVeW1wclZoMS9aSnFTZjU1WkpuM2szbkFFNlZaNjVSUi9uCjhlMlBZUGhxK3NLRHpkTHUxbTM1SCtuTktWT1ZkMExGZDhmRTFqdWdtblFOaDBqYWJNenNUaXZ0YTkybE00ZHoKemVFV3B1WENudkM1blIxbGVPTEJSUUxTM1ZpeHdxa04zSENrSWNlRWkrK1YwMm9jazBxemtPWnF2M2szbkZKYwphQ0pHYkhQNTB5UElPMUFmR0FWUHdBV2N6VWljOGxZUDZ1d3VTa2NNSm1pSUtqUWZGazI4OTFBMUt0V01uUnc0CjFrVlNqWlFkblQvamVZdE9FdDF2cllTNFNNTmJlMllKNVpWSEl1VWJoSGRvVU9HNDlpQTZOeURUSitiVDZ0aGgKK0hrM1RYSE1ZSGw0VFEyZklBUkRwQ1pncFlBU1ZQekRHYWdrbDNzSHNtUXByQlE2eCtML1NucjB6UThCbUpkVwp3ZDJHc3VVaXpBTGVjYnFpN21zc1NjQnVaY2EyUGZPZDAyNmUyak1PZjhmZ1lwdEFPN0NLQU8vR281bFJsZEdJClVxMk9UOEk2RkoxLzhoMi8xM1RJQTlEbDYzSFpLSlk2dHY3ZllUK0lCRWlaQWdNQkFBRT0KLS0tLS1FTkQgUFVCTElDIEtFWS0tLS0tCg=='))
$allowHttpForTest = $false
function Assert-DownloadUrl([string]$Value) {
	$uri = [Uri]$Value
	if ($uri.UserInfo -or $uri.Fragment -or ($uri.Scheme -ne 'https' -and -not ($allowHttpForTest -and $uri.Scheme -eq 'http'))) {
		throw ([Text.Encoding]::UTF8.GetString([Convert]::FromBase64String('5LiL6L295Zyw5Z2A5LiN5Y+X5pSv5oyB77yb5q2j5byP5YWl5Y+j5b+F6aG75L2/55SoIEhUVFBT44CC')))
	}
}
function Test-DownloadMatch([string]$Path, [string]$Hash, [long]$Bytes) {
	$cachedItem = Get-Item -LiteralPath $Path -Force -ErrorAction SilentlyContinue
	if ($cachedItem -isnot [IO.FileInfo] -or ($cachedItem.Attributes -band [IO.FileAttributes]::ReparsePoint) -or $cachedItem.Length -ne $Bytes) { return $false }
	$cachedHasher = [Security.Cryptography.SHA256]::Create()
	try { $cachedHash = [BitConverter]::ToString($cachedHasher.ComputeHash([IO.File]::ReadAllBytes($Path))).Replace('-', '').ToLowerInvariant() }
	catch { return $false }
	finally { $cachedHasher.Dispose() }
	return $cachedHash -eq $Hash
}
function Format-InstallerElapsed([long]$Milliseconds) {
	$culture = [Globalization.CultureInfo]::InvariantCulture
	if ($Milliseconds -lt 1000) { return $Milliseconds.ToString($culture) + 'ms' }
	$seconds = [Math]::Floor(($Milliseconds + 50) / 100) / 10
	return $seconds.ToString('F1', $culture) + 's'
}
function Write-InstallerElapsed([string]$Activity, [Diagnostics.Stopwatch]$Clock) {
	Write-Host (([Text.Encoding]::UTF8.GetString([Convert]::FromBase64String('ezB977yI6ICX5pe2IHsxfe+8iQ=='))) -f $Activity, (Format-InstallerElapsed $Clock.ElapsedMilliseconds))
}
function Write-TransferProgress([string]$Activity, [string]$Path, [long]$Bytes, [Diagnostics.Stopwatch]$Clock, [switch]$Complete) {
	$file = Get-Item -LiteralPath $Path -ErrorAction SilentlyContinue
	$received = if ($file) { $file.Length } else { 0 }
	$elapsed = Format-InstallerElapsed $Clock.ElapsedMilliseconds
	$timing = if ($Complete) { ([Text.Encoding]::UTF8.GetString([Convert]::FromBase64String('6ICX5pe2'))) } else { ([Text.Encoding]::UTF8.GetString([Convert]::FromBase64String('5bey55So5pe2'))) }
	if ($Bytes -gt 0) {
		$percent = [Math]::Min(100, [Math]::Floor($received * 100.0 / $Bytes))
		Write-Host (([Text.Encoding]::UTF8.GetString([Convert]::FromBase64String('ezB9IHsxfSXvvIh7Mn0gLyB7M30g5a2X6IqC77yMezR9IHs1fe+8iQ=='))) -f $Activity, $percent, $received, $Bytes, $timing, $elapsed)
	} else {
		Write-Host (([Text.Encoding]::UTF8.GetString([Convert]::FromBase64String('ezB977yI5bey5LiL6L29IHsxfSDlrZfoioLvvIx7Mn0gezN977yJ'))) -f $Activity, $received, $timing, $elapsed)
	}
}
function Receive-Download([string]$Url, [string]$Path, [string]$Activity, [long]$Bytes) {
	$clock = [Diagnostics.Stopwatch]::StartNew()
	$transfer = [PowerShell]::Create()
	try {
		$null = $transfer.AddCommand('Invoke-WebRequest').AddParameter('UseBasicParsing').AddParameter('MaximumRedirection', 0).AddParameter('TimeoutSec', 60).AddParameter('Uri', $Url).AddParameter('OutFile', $Path).AddParameter('ErrorAction', 'Stop')
		if (-not [Console]::IsOutputRedirected) { Write-TransferProgress $Activity $Path $Bytes $clock }
		$pending = $transfer.BeginInvoke()
		while (-not $pending.AsyncWaitHandle.WaitOne(3000)) { Write-TransferProgress $Activity $Path $Bytes $clock }
		$null = $transfer.EndInvoke($pending)
		Write-TransferProgress $Activity $Path $Bytes $clock -Complete
	} finally { $transfer.Dispose() }
}
function Download-File([string]$Url, [string]$Destination, [string]$Activity, [string]$Hash = '', [long]$Bytes = 0, [Diagnostics.Stopwatch]$CacheClock) {
	Assert-DownloadUrl $Url
	if ($Hash -and (Test-DownloadMatch $Destination $Hash $Bytes)) {
		Write-InstallerElapsed ([Text.Encoding]::UTF8.GetString([Convert]::FromBase64String('5bey5qCh6aqM5bm25aSN55So5pys5Zyw5ZCv5Yqo56iL5bqP44CC'))) $CacheClock
		return
	}
	if (Test-Path -LiteralPath $Destination) { throw 'DOWNLOAD_FILE_ALREADY_EXISTS' }
	if (-not $Hash) {
		Receive-Download $Url $Destination $Activity $Bytes
		return
	}
	$incoming = Join-Path $stage 'runner.download'
	Receive-Download $Url $incoming $Activity $Bytes
	if (-not (Test-DownloadMatch $incoming $Hash $Bytes)) {
		throw ([Text.Encoding]::UTF8.GetString([Convert]::FromBase64String('5a6J6KOF56iL5bqP5qCh6aqM5aSx6LSl77yM5bey5YGc5q2i77yb5LiL6L295paH5Lu25L+d55WZ5Zyo5ZCv5Yqo5pel5b+X5omA5Zyo55uu5b2V44CC')))
	}
	try { [IO.File]::Move($incoming, $Destination) }
	catch [IO.IOException] {
		if (-not (Test-DownloadMatch $Destination $Hash $Bytes)) { throw }
		Remove-Item -LiteralPath $incoming -ErrorAction SilentlyContinue
	}
}
$downloads = & { $ErrorActionPreference = 'Stop'; [Console]::OutputEncoding = New-Object Text.UTF8Encoding($false); if (-not ('ASAM.DownloadFolders' -as [type])) { $asamDeclaration = '[DllImport(' + [char]34 + 'shell32.dll' + [char]34 + ')] public static extern int SHGetKnownFolderPath(ref System.Guid id, uint flags, System.IntPtr token, out System.IntPtr path);'; Add-Type -MemberDefinition $asamDeclaration -Name DownloadFolders -Namespace ASAM }; $asamFolderId = [Guid]'374DE290-123F-4565-9164-39C4925E467B'; $asamFolderPath = [IntPtr]::Zero; try { $asamFolderResult = [ASAM.DownloadFolders]::SHGetKnownFolderPath([ref]$asamFolderId, 0, [IntPtr]::Zero, [ref]$asamFolderPath); [Runtime.InteropServices.Marshal]::ThrowExceptionForHR($asamFolderResult); [Runtime.InteropServices.Marshal]::PtrToStringUni($asamFolderPath) } finally { if ($asamFolderPath -ne [IntPtr]::Zero) { [Runtime.InteropServices.Marshal]::FreeCoTaskMem($asamFolderPath) } } }
if ([IO.Path]::GetFileName($downloads.TrimEnd([IO.Path]::DirectorySeparatorChar, [IO.Path]::AltDirectorySeparatorChar)) -ine 'ASAM-UI') {
	$downloads = Join-Path $downloads 'ASAM-UI'
	try {
		[IO.Directory]::CreateDirectory($downloads) | Out-Null
		$item = Get-Item -LiteralPath $downloads -Force
		if (-not $item.PSIsContainer -or ($item.Attributes -band [IO.FileAttributes]::ReparsePoint)) { throw 'ASAM_DOWNLOAD_DIRECTORY_CONFLICT' }
	} catch {
		throw (([Text.Encoding]::UTF8.GetString([Convert]::FromBase64String('5peg5rOV5L2/55So5a6J6KOF5Zmo5LiL6L2955uu5b2V77yaezB944CC6K+35qOA5p+l5ZCM5ZCN5paH5Lu244CB55uu5b2V6ZO+5o6l5ZKM5YaZ5YWl5p2D6ZmQ44CC'))) -f $downloads)
	}
}
$logs = Join-Path $downloads 'logs'
try {
	[IO.Directory]::CreateDirectory($logs) | Out-Null
	$logDirectory = Get-Item -LiteralPath $logs -Force
	if (-not $logDirectory.PSIsContainer -or ($logDirectory.Attributes -band [IO.FileAttributes]::ReparsePoint)) { throw 'ASAM_DOWNLOAD_DIRECTORY_CONFLICT' }
} catch {
	throw (([Text.Encoding]::UTF8.GetString([Convert]::FromBase64String('5peg5rOV5L2/55So5a6J6KOF5pel5b+X55uu5b2V77yaezB944CC6K+35qOA5p+l5ZCM5ZCN5paH5Lu244CB55uu5b2V6ZO+5o6l5ZKM5YaZ5YWl5p2D6ZmQ44CC'))) -f $logs)
}
$stage = Join-Path $logs ('.asam-bootstrap-' + [Guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $stage | Out-Null
$bootstrapRun = [Guid]::NewGuid().ToString('N')
$bootstrapStarted = [DateTime]::UtcNow
$bootstrapPhase = 'node-resolution'
$runnerForExecution = $null
function Write-BootstrapLog([string]$Status, [object]$Details = $null) {
	$event = @{ runId = $bootstrapRun; phase = $bootstrapPhase; status = $Status; atUtc = [DateTime]::UtcNow.ToString('o'); elapsedMs = ([DateTime]::UtcNow - $bootstrapStarted).TotalMilliseconds; details = $Details }
	[IO.File]::AppendAllText((Join-Path $stage 'BOOTSTRAP.jsonl'), (($event | ConvertTo-Json -Compress -Depth 4) + [Environment]::NewLine), (New-Object Text.UTF8Encoding($false)))
}
try {
Write-BootstrapLog 'started'
$nodeCandidates = @()
if ($env:ASAM_NODE22) {
	if (-not [IO.Path]::IsPathRooted($env:ASAM_NODE22)) { throw ([Text.Encoding]::UTF8.GetString([Convert]::FromBase64String('QVNBTV9OT0RFMjIg5b+F6aG75piv54us56uLIE5vZGUgMjIg55qE57ud5a+56Lev5b6E44CC'))) }
	$nodeCandidates = @($env:ASAM_NODE22)
} else { $nodeCandidates = @(Get-Command node.exe -All -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Source -Unique) }
$node = $null
foreach ($candidate in $nodeCandidates) {
	try {
		$nodeVersion = (& $candidate --version).Trim()
		if ($LASTEXITCODE -eq 0 -and $nodeVersion -match '^v22\.(\d+)\.' -and [int]$Matches[1] -ge 19) { $node = $candidate; break }
	} catch { }
}
if (-not $node) { throw ([Text.Encoding]::UTF8.GetString([Convert]::FromBase64String('6K+35YWI5YeG5aSH54us56uLIE5vZGUuanMgPj0yMi4xOSA8MjPvvIzlj6/pgJrov4cgQVNBTV9OT0RFMjIg5oyH5a6a5YW257ud5a+56Lev5b6E77ybSGFybmVzcyDkvb/nlKjoh6rlt7HnmoTov5DooYzml7bjgII='))) }
Write-BootstrapLog 'completed' @{ nodeVersion = $nodeVersion; powershellVersion = $PSVersionTable.PSVersion.ToString(); platform = 'Windows' }
$bootstrapPhase = 'manifest-download'
Write-BootstrapLog 'started'
$manifestPath = Join-Path $stage 'release.json'
$signaturePath = $manifestPath + '.sig'
Download-File $manifestUrl $manifestPath ([Text.Encoding]::UTF8.GetString([Convert]::FromBase64String('5q2j5Zyo5LiL6L295ZCv5Yqo5riF5Y2V4oCm')))
Download-File ($manifestUrl + '.sig') $signaturePath ([Text.Encoding]::UTF8.GetString([Convert]::FromBase64String('5q2j5Zyo5LiL6L295ZCv5Yqo562+5ZCN4oCm')))
Write-BootstrapLog 'completed'
$bootstrapPhase = 'signature-verification'
Write-BootstrapLog 'started'
$signatureClock = [Diagnostics.Stopwatch]::StartNew()
$rsa = [Security.Cryptography.RSA]::Create()
$parameters = New-Object Security.Cryptography.RSAParameters
$parameters.Modulus = [Convert]::FromBase64String('42ibrX3+xO9y6NfP9yu08KFqRPgag8yNf4eqKY5+va4uOWuKl0UymprVh1/ZJqSf55ZJn3k3nAE6VZ65RR/n8e2PYPhq+sKDzdLu1m35H+nNKVOVd0LFd8fE1jugmnQNh0jabMzsTivta92lM4dzzeEWpuXCnvC5nR1leOLBRQLS3VixwqkN3HCkIceEi++V02ock0qzkOZqv3k3nFJcaCJGbHP50yPIO1AfGAVPwAWczUic8lYP6uwuSkcMJmiIKjQfFk2891A1KtWMnRw41kVSjZQdnT/jeYtOEt1vrYS4SMNbe2YJ5ZVHIuUbhHdoUOG49iA6NyDTJ+bT6thh+Hk3TXHMYHl4TQ2fIARDpCZgpYASVPzDGagkl3sHsmQprBQ6x+L/Snr0zQ8BmJdWwd2GsuUizALecbqi7mssScBuZca2PfOd026e2jMOf8fgYptAO7CKAO/Go5lRldGIUq2OT8I6FJ1/8h2/13TIA9Dl63HZKJY6tv7fYT+IBEiZ')
$parameters.Exponent = [Convert]::FromBase64String('AQAB')
$rsa.ImportParameters($parameters)
try {
	$signature = [Convert]::FromBase64String(([IO.File]::ReadAllText($signaturePath)).Trim())
	if (-not $rsa.VerifyData([IO.File]::ReadAllBytes($manifestPath), $signature, [Security.Cryptography.HashAlgorithmName]::SHA256, [Security.Cryptography.RSASignaturePadding]::Pkcs1)) {
		throw ([Text.Encoding]::UTF8.GetString([Convert]::FromBase64String('5Y+R6KGM5riF5Y2V562+5ZCN5peg5pWI77yM5bey5YGc5q2i77yb5pyq5omn6KGM5a6J6KOF56iL5bqP44CC')))
	}
} finally { $rsa.Dispose() }
$manifest = Get-Content -Raw -Encoding UTF8 -LiteralPath $manifestPath | ConvertFrom-Json
$candidates = @($manifest.artifacts | Where-Object { $_.host -eq 'installer' -and $_.platform -eq 'any' -and $_.arch -eq 'any' })
if ($manifest.schemaVersion -ne 1 -or $candidates.Count -ne 1) { throw ([Text.Encoding]::UTF8.GetString([Convert]::FromBase64String('5Y+R6KGM5riF5Y2V5qC85byP5LiN5Y+X5pSv5oyB44CC'))) }
$runner = $candidates[0]
if ($runner.sha256 -notmatch '^[a-f0-9]{64}$' -or $runner.bytes -le 0 -or $runner.bytes -gt 67108864) { throw ([Text.Encoding]::UTF8.GetString([Convert]::FromBase64String('5a6J6KOF56iL5bqP5pGY6KaB5peg5pWI44CC'))) }
Write-BootstrapLog 'completed'
Write-InstallerElapsed ([Text.Encoding]::UTF8.GetString([Convert]::FromBase64String('5bey5qCh6aqM5ZCv5Yqo5riF5Y2V5ZKM562+5ZCN44CC'))) $signatureClock
$bootstrapPhase = 'installer-download'
Write-BootstrapLog 'started'
$cacheClock = [Diagnostics.Stopwatch]::StartNew()
$releaseLabel = [regex]::Replace([string]$manifest.release, '[^a-zA-Z0-9_.-]', '_')
if ($releaseLabel.Length -gt 80) { $releaseLabel = $releaseLabel.Substring(0, 80) }
$runnerStem = 'installer-' + $releaseLabel + '-' + $runner.sha256.Substring($runner.sha256.Length - 16)
$runnerPath = Join-Path $downloads ($runnerStem + '.mjs')
if (-not (Test-DownloadMatch $runnerPath $runner.sha256 $runner.bytes)) {
	$verifiedAlternate = $null
	foreach ($cachedPath in [IO.Directory]::EnumerateFiles($downloads)) {
		if ($cachedPath -ieq $runnerPath) { continue }
		if (Test-DownloadMatch $cachedPath $runner.sha256 $runner.bytes) { $verifiedAlternate = $cachedPath; break }
	}
	if ($verifiedAlternate) { $runnerPath = $verifiedAlternate }
	elseif (Test-Path -LiteralPath $runnerPath) { $runnerPath = Join-Path $downloads ($runnerStem + '-' + $bootstrapRun + '.mjs') }
}
Download-File $runner.url $runnerPath ([Text.Encoding]::UTF8.GetString([Convert]::FromBase64String('5q2j5Zyo5LiL6L295a6J6KOF56iL5bqP4oCm'))) $runner.sha256 $runner.bytes $cacheClock
Write-BootstrapLog 'completed'
$bootstrapPhase = 'installer-verification'
Write-BootstrapLog 'started'
$runnerClock = [Diagnostics.Stopwatch]::StartNew()
# Node requires the .mjs extension to load the verified runner as an ES module.
if ([IO.Path]::GetExtension($runnerPath) -cne '.mjs') {
	$runnerForExecution = Join-Path $stage 'runner.mjs'
	[IO.File]::Copy($runnerPath, $runnerForExecution)
	$runnerPath = $runnerForExecution
}
if (-not (Test-DownloadMatch $runnerPath $runner.sha256 $runner.bytes)) {
	throw ([Text.Encoding]::UTF8.GetString([Convert]::FromBase64String('5a6J6KOF56iL5bqP5qCh6aqM5aSx6LSl77yM5bey5YGc5q2i77yb5pen5a6J6KOF5L+d5oyB5Y6f54q244CC')))
}
Write-BootstrapLog 'completed' @{ sha256 = $runner.sha256; bytes = $runner.bytes }
Write-InstallerElapsed ([Text.Encoding]::UTF8.GetString([Convert]::FromBase64String('5bey5qCh6aqM5a6J6KOF56iL5bqP44CC'))) $runnerClock
$keyPath = Join-Path $stage 'release-public.pem'
[IO.File]::WriteAllText($keyPath, $publicKey)
$forward = @('--manifest', $manifestUrl, '--public-key-file', $keyPath)
if ($allowHttpForTest) { $forward += '--allow-http-test' }
$bootstrapPhase = 'installer-execution'
Write-BootstrapLog 'started'
$previousBootstrapRun = $env:ASAM_INSTALL_BOOTSTRAP_RUN_ID
try {
	$env:ASAM_INSTALL_BOOTSTRAP_RUN_ID = $bootstrapRun
	& $node $runnerPath @forward @args
	$installerExitCode = $LASTEXITCODE
} finally { $env:ASAM_INSTALL_BOOTSTRAP_RUN_ID = $previousBootstrapRun }
Write-BootstrapLog 'returned' @{ exitCode = $installerExitCode }
if ($installerExitCode -ne 0) {
	Write-BootstrapLog 'failed' @{ exitCode = $installerExitCode }
	Write-Warning (([Text.Encoding]::UTF8.GetString([Convert]::FromBase64String('5ZCv5Yqo5pel5b+X77yaezB9'))) -f (Join-Path $stage 'BOOTSTRAP.jsonl'))
	# The installer already reported the failure. Keep an interactive caller open.
	if ($MyInvocation.MyCommand.CommandType -eq 'ExternalScript') { exit $installerExitCode }
	return
}
Remove-Item -LiteralPath $manifestPath, $signaturePath -ErrorAction SilentlyContinue
Write-BootstrapLog 'completed'
} catch {
	$bootstrapFailure = $_
	try { Write-BootstrapLog 'failed' @{ errorType = $_.Exception.GetType().FullName; stack = $_.ScriptStackTrace } } catch { Write-Warning ([Text.Encoding]::UTF8.GetString([Convert]::FromBase64String('5peg5rOV5YaZ5YWl5ZCv5Yqo5pel5b+X77yM6K+35L+d55WZ5b2T5YmN57uI56uv6L6T5Ye644CC'))) }
	Write-Warning (([Text.Encoding]::UTF8.GetString([Convert]::FromBase64String('5ZCv5Yqo5pel5b+X77yaezB9'))) -f $stage)
	throw $bootstrapFailure
} finally {
	if ($runnerForExecution) { Remove-Item -LiteralPath $runnerForExecution -ErrorAction SilentlyContinue }
}
