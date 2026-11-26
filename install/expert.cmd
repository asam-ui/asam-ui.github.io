@echo off
setlocal
if not "%~1"=="" (
  echo Use the downloaded expert.ps1 with explicit options, or the offline installer, for automation.
  exit /b 2
)
rem Same interactive online entry as PowerShell; preserves the caller's policy.
rem No host upgrade, execution-policy override, or model/account changes.
powershell.exe -NoProfile -Command "$ErrorActionPreference='Stop'; $u=[Text.Encoding]::UTF8.GetString([Convert]::FromBase64String('aHR0cHM6Ly9hc2FtLXVpLmNuL2luc3RhbGwvcmVsZWFzZXMvMS4wLjItd2luZG93cy14NjQvZXhwZXJ0LnBzMQ==')); $r=Invoke-WebRequest -UseBasicParsing -MaximumRedirection 0 -TimeoutSec 60 -Uri $u; $c=$r.Content; if($r.RawContentStream -is [IO.MemoryStream]){$c=$r.RawContentStream.ToArray()}; if($c -is [byte[]]){$c=[Text.Encoding]::UTF8.GetString($c)}; & ([scriptblock]::Create($c.TrimStart([char]0xFEFF))); exit $LASTEXITCODE"
exit /b %errorlevel%
