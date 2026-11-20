// ../../../DevCache/workspaces/asam-ui/expert-production-1.0.0-20261120/tools/v2/hosts/online-install.mjs
import {
  readFileSync as readFileSync11,
  mkdirSync as mkdirSync8,
  mkdtempSync as mkdtempSync3,
  existsSync as existsSync11,
  realpathSync as realpathSync5,
  readdirSync as readdirSync5,
  rmSync as rmSync4
} from "node:fs";
import { join as join15, resolve as resolve7, isAbsolute as isAbsolute11, dirname as dirname9, relative as relative3, sep as sep2, basename as basename7 } from "node:path";
import { homedir as homedir7, tmpdir as tmpdir3 } from "node:os";
import { pathToFileURL as pathToFileURL3 } from "node:url";

// ../../../DevCache/workspaces/asam-ui/expert-production-1.0.0-20261120/tools/v2/hosts/installer-log.mjs
import { AsyncLocalStorage } from "node:async_hooks";
import { channel } from "node:diagnostics_channel";
import { spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { appendFileSync, writeFileSync, lstatSync } from "node:fs";
import { basename, join } from "node:path";
import { homedir } from "node:os";
var native = channel("asam-ui.installer.native");
var active = new AsyncLocalStorage();
function nativeLog(command, args) {
  if (!native.hasSubscribers) return () => {
  };
  const startedAt = (/* @__PURE__ */ new Date()).toISOString();
  const started = Date.now();
  let finished2 = false;
  return (result) => {
    if (finished2) return;
    finished2 = true;
    native.publish({
      phase: "native",
      command,
      args,
      startedAt,
      finishedAt: (/* @__PURE__ */ new Date()).toISOString(),
      durationMs: Date.now() - started,
      exitCode: result.status ?? null,
      signal: result.signal ?? null,
      stopRequested: result.stopRequested || void 0,
      stdout: result.stdout?.toString() || "",
      stderr: result.stderr?.toString() || "",
      error: result.error?.stack || null
    });
  };
}
function loggedCall(invoke, command, args, options2) {
  const finish = nativeLog(command, args);
  try {
    const result = invoke(command, args, options2);
    finish(result);
    return result;
  } catch (error) {
    finish({ error });
    throw error;
  }
}
var loggedSpawnSync = (command, args, options2) => loggedCall(spawnSync, command, args, options2);
function installationLog(directory) {
  const runId = randomUUID();
  const bootstrapRunId = /^[a-f0-9]{32}$/.test(process.env.ASAM_INSTALL_BOOTSTRAP_RUN_ID || "") ? process.env.ASAM_INSTALL_BOOTSTRAP_RUN_ID : void 0;
  const started = Date.now();
  const file2 = join(directory, "EXECUTION.jsonl");
  const aliases = /* @__PURE__ */ new Map([[homedir(), "<home>"]]);
  let sequence = 0;
  let warning;
  const text = (value) => {
    let result = String(value);
    for (const [value2, label] of [...aliases].sort((a, b) => b[0].length - a[0].length))
      result = result.split(value2).join(label).split(value2.replaceAll("\\", "/")).join(label);
    return result.replace(
      /-----BEGIN [^-]*PRIVATE KEY-----[\s\S]*?-----END [^-]*PRIVATE KEY-----/g,
      "<redacted>"
    ).replace(/\b(?:Bearer|Basic)\s+[A-Za-z0-9+/_.=:-]+/gi, "<redacted>").replace(
      /(\b(?:set[-_]?cookie|cookie)["']?\s*[:=]\s*)(?:"(?:\\.|[^"\\])*"|'[^']*'|[^\r\n]*)/gi,
      "$1<redacted>"
    ).replace(
      /(["']?(?:[\w.-]*(?:token|password|passwd|secret|authorization|api[_-]?key|auth[_-]?key|_auth)[\w.-]*)["']?\s*[:=]\s*)(?:"(?:\\.|[^"\\])*"|'[^']*'|[^\s,;}]+)/gi,
      '$1"<redacted>"'
    ).replace(/https?:\/\/[^\s"'<>]+/g, (url) => {
      try {
        const parsed = new URL(url);
        return `${parsed.origin}${parsed.pathname}${parsed.search ? "?<redacted>" : ""}`;
      } catch {
        return "<url>";
      }
    }).replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "<email>");
  };
  const clean = (value, key = "") => {
    if (/token|password|passwd|secret|authorization|cookie|api[_-]?key|^env$|^config(?:uration)?$|credentials/i.test(
      key
    ))
      return "<redacted>";
    if (typeof value === "string") {
      if (value === runId) return value;
      try {
        return JSON.stringify(clean(JSON.parse(value)));
      } catch {
        return text(value);
      }
    }
    if (Array.isArray(value)) return value.map((item) => clean(item));
    if (value && typeof value === "object")
      return Object.fromEntries(
        Object.entries(value).map(([name, item]) => [name, clean(item, name)])
      );
    return value;
  };
  const record2 = (event) => {
    try {
      appendFileSync(
        file2,
        JSON.stringify({
          runId,
          sequence: ++sequence,
          at: (/* @__PURE__ */ new Date()).toISOString(),
          ...clean(event)
        }) + "\n",
        { mode: 384 }
      );
    } catch (error) {
      warning ||= error.code || "INSTALL_LOG_WRITE_FAILED";
    }
  };
  const listen = (event) => {
    if (active.getStore() !== runId) return;
    const args = event.args.map(
      (arg, index) => index && ["-e", "-Command"].includes(event.args[index - 1]) ? "<script>" : arg
    );
    let stdout = event.args.includes("config") && event.args.includes("list") ? "<configuration listing omitted>" : event.stdout;
    if (event.args.includes("plugin") && event.args.includes("list")) {
      try {
        const listed = JSON.parse(event.stdout);
        stdout = JSON.stringify({
          marketplaces: listed.marketplaces?.filter(
            (item) => item.name === "asam-ui-local"
          ),
          installed: listed.installed?.filter(
            (item) => item.pluginId === "asam-ui-development@asam-ui-local"
          )
        });
      } catch {
        stdout = "<unrelated plugin listing omitted>\n" + event.stdout.split(/\r?\n/).filter((line) => /@asam-ui\/dsh-development/.test(line)).join("\n");
      }
    }
    record2({
      ...event,
      command: basename(event.command),
      args,
      stdout,
      stdoutBytes: Buffer.byteLength(event.stdout),
      stderrBytes: Buffer.byteLength(event.stderr)
    });
  };
  return {
    runId,
    file: file2,
    clean,
    record: record2,
    alias(value, label) {
      if (value && typeof value === "string") aliases.set(value, `<${label}>`);
    },
    async run(callback) {
      native.subscribe(listen);
      try {
        return await active.run(runId, callback);
      } finally {
        native.unsubscribe(listen);
      }
    },
    async step(phase, callback) {
      const started2 = Date.now();
      record2({ phase, status: "started" });
      try {
        const value = await callback();
        record2({ phase, status: "completed", durationMs: Date.now() - started2 });
        return value;
      } catch (error) {
        record2({
          phase,
          status: "failed",
          durationMs: Date.now() - started2,
          error: error.stack,
          ...error.preserved ? { preserved: error.preserved } : {}
        });
        throw error;
      }
    },
    snapshot(paths2) {
      return Object.fromEntries(
        Object.entries(paths2).map(([name, path]) => {
          try {
            const info = lstatSync(path);
            return [
              name,
              {
                exists: true,
                symlink: info.isSymbolicLink(),
                bytes: info.size,
                modifiedAt: info.mtime.toISOString()
              }
            ];
          } catch (error) {
            return [
              name,
              error.code === "ENOENT" ? { exists: false } : { observationError: error.code }
            ];
          }
        })
      );
    },
    writeReceipt(receipt) {
      writeFileSync(
        join(directory, "INSTALLATION.json"),
        JSON.stringify(
          clean({
            ...receipt,
            bootstrapRunId,
            runId,
            executionLog: file2,
            logWarning: warning,
            finishedAt: (/* @__PURE__ */ new Date()).toISOString(),
            durationMs: Date.now() - started
          }),
          null,
          2
        ) + "\n",
        { mode: 384 }
      );
    }
  };
}

// ../../../DevCache/workspaces/asam-ui/expert-production-1.0.0-20261120/tools/v2/hosts/online-install.mjs
import { createInterface } from "node:readline/promises";
import { createRequire } from "node:module";
import { createHash as createHash7 } from "node:crypto";
import { isDeepStrictEqual as isDeepStrictEqual3 } from "node:util";
import { setImmediate as yieldToTerminal } from "node:timers/promises";

// ../../../DevCache/workspaces/asam-ui/expert-production-1.0.0-20261120/tools/v2/hosts/release-manifest.mjs
import { createHash as createHash2, createPublicKey, verify as verifySignature } from "node:crypto";
import { open, readFile, lstat, copyFile, unlink, rmdir } from "node:fs/promises";
import { constants as constants2 } from "node:fs";
import { dirname as dirname2, join as join3, basename as basename3 } from "node:path";
import { request as httpRequest } from "node:http";
import { request as httpsRequest } from "node:https";

// ../../../DevCache/workspaces/asam-ui/expert-production-1.0.0-20261120/tools/v2/hosts/download-paths.mjs
import {
  constants,
  copyFileSync,
  linkSync,
  lstatSync as lstatSync2,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync
} from "node:fs";
import { join as join2, win32, posix, extname, isAbsolute, basename as basename2, normalize, dirname } from "node:path";
import { randomUUID as randomUUID2, createHash } from "node:crypto";
import { homedir as homedir2 } from "node:os";
import { spawnSync as spawnSync2 } from "node:child_process";
var windowsDownloadsScript = [
  "$ErrorActionPreference = 'Stop'",
  "[Console]::OutputEncoding = New-Object Text.UTF8Encoding($false)",
  "if (-not ('ASAM.DownloadFolders' -as [type])) { $asamDeclaration = '[DllImport(' + [char]34 + 'shell32.dll' + [char]34 + ')] public static extern int SHGetKnownFolderPath(ref System.Guid id, uint flags, System.IntPtr token, out System.IntPtr path);'; Add-Type -MemberDefinition $asamDeclaration -Name DownloadFolders -Namespace ASAM }",
  "$asamFolderId = [Guid]'374DE290-123F-4565-9164-39C4925E467B'",
  "$asamFolderPath = [IntPtr]::Zero",
  "try { $asamFolderResult = [ASAM.DownloadFolders]::SHGetKnownFolderPath([ref]$asamFolderId, 0, [IntPtr]::Zero, [ref]$asamFolderPath); [Runtime.InteropServices.Marshal]::ThrowExceptionForHR($asamFolderResult); [Runtime.InteropServices.Marshal]::PtrToStringUni($asamFolderPath) } finally { if ($asamFolderPath -ne [IntPtr]::Zero) { [Runtime.InteropServices.Marshal]::FreeCoTaskMem($asamFolderPath) } }"
].join("; ");
var resolvedWindowsDownloads;
function windowsDownloads() {
  if (resolvedWindowsDownloads) return resolvedWindowsDownloads;
  const result = spawnSync2(
    "powershell.exe",
    ["-NoLogo", "-NoProfile", "-NonInteractive", "-Command", windowsDownloadsScript],
    { encoding: "utf8", windowsHide: true, timeout: 3e4 }
  );
  if (result.status !== 0) throw Error("SYSTEM_DOWNLOADS_RESOLUTION_FAILED");
  resolvedWindowsDownloads = result.stdout.trim();
  return resolvedWindowsDownloads;
}
function systemDownloads({
  platform = process.platform,
  home = homedir2(),
  resolveWindows = windowsDownloads
} = {}) {
  if (!["win32", "darwin"].includes(platform)) throw Error("DOWNLOADS_PLATFORM_UNSUPPORTED");
  const paths2 = platform === "win32" ? win32 : posix;
  const directory = platform === "win32" ? resolveWindows() : paths2.join(home, "Downloads");
  if (!paths2.isAbsolute(directory) || directory.includes("${") || /[\r\n\0]/.test(directory))
    throw Error("SYSTEM_DOWNLOADS_RESOLUTION_FAILED");
  return directory;
}
function installerDownloads(root = normalize(systemDownloads())) {
  const name = basename2(root);
  const alreadyScoped = process.platform === "win32" ? name.toUpperCase() === "ASAM-UI" : name === "ASAM-UI";
  const directory = alreadyScoped ? root : join2(root, "ASAM-UI");
  if (!alreadyScoped) {
    try {
      mkdirSync(directory, { recursive: true, mode: 448 });
      if (!lstatSync2(directory).isDirectory())
        throw Error("ASAM_DOWNLOAD_DIRECTORY_CONFLICT");
    } catch (cause) {
      throw Error(
        `\u65E0\u6CD5\u4F7F\u7528\u5B89\u88C5\u5668\u4E0B\u8F7D\u76EE\u5F55\uFF1A${directory}\u3002\u8BF7\u68C0\u67E5\u540C\u540D\u6587\u4EF6\u3001\u76EE\u5F55\u94FE\u63A5\u548C\u5199\u5165\u6743\u9650\u3002`,
        { cause }
      );
    }
  }
  return directory;
}
function createDownloadStage(kind, { downloads = installerDownloads() } = {}) {
  assertDownloadRoot(downloads);
  if (!/^[a-zA-Z0-9][a-zA-Z0-9_.-]{0,127}$/.test(kind)) throw Error("DOWNLOAD_CATEGORY_INVALID");
  mkdirSync(downloads, { recursive: true, mode: 448 });
  return mkdtempSync(join2(downloads, `.asam-${kind}-`));
}
function createInstallerLogStage(downloads = installerDownloads()) {
  if (process.platform !== "win32") return createDownloadStage("installer", { downloads });
  const logs = join2(downloads, "logs");
  try {
    mkdirSync(logs, { recursive: true, mode: 448 });
    if (!lstatSync2(logs).isDirectory()) throw Error("ASAM_DOWNLOAD_DIRECTORY_CONFLICT");
    return createDownloadStage("installer", { downloads: logs });
  } catch (cause) {
    throw Error(`\u65E0\u6CD5\u4F7F\u7528\u5B89\u88C5\u65E5\u5FD7\u76EE\u5F55\uFF1A${logs}\u3002\u8BF7\u68C0\u67E5\u540C\u540D\u6587\u4EF6\u3001\u76EE\u5F55\u94FE\u63A5\u548C\u5199\u5165\u6743\u9650\u3002`, {
      cause
    });
  }
}
var downloadDirectoryScan = [
  "const fs = require('node:fs');",
  "try {",
  "  process.stdout.write(JSON.stringify({ entries: fs.readdirSync(process.argv[1]) }));",
  "} catch (error) {",
  "  process.stdout.write(JSON.stringify({ code: error.code || 'UNKNOWN' }));",
  "  process.exitCode = 2;",
  "}"
].join("\n");
function downloadDirectoryEntries(directory) {
  if (process.platform !== "darwin") return readdirSync(directory);
  const result = spawnSync2(process.execPath, ["-e", downloadDirectoryScan, directory], {
    encoding: "utf8",
    timeout: 1e4,
    killSignal: "SIGKILL",
    maxBuffer: 2 * 1024 * 1024,
    windowsHide: true
  });
  if (result.error?.code === "ETIMEDOUT")
    throw Error("DOWNLOAD_CACHE_SCAN_TIMEOUT: \u8BFB\u53D6\u5B89\u88C5\u7F13\u5B58\u76EE\u5F55\u8D85\u65F6\uFF0C\u539F\u6587\u4EF6\u5DF2\u4FDD\u7559\uFF0C\u8BF7\u53CD\u9988\u5B89\u88C5\u65E5\u5FD7\u3002");
  if (result.error) throw result.error;
  let response2;
  try {
    response2 = JSON.parse(result.stdout);
  } catch (cause) {
    throw Error("DOWNLOAD_CACHE_SCAN_FAILED", { cause });
  }
  if (result.status !== 0)
    throw Error(`DOWNLOAD_CACHE_SCAN_FAILED: ${response2.code || "UNKNOWN"}`);
  if (!Array.isArray(response2.entries) || response2.entries.some((name) => typeof name !== "string"))
    throw Error("DOWNLOAD_CACHE_SCAN_FAILED");
  return response2.entries;
}
function downloadFilePath(name, { downloads, sha256, bytes: bytes2, reuseByContent = false } = {}) {
  const systemRoot = downloads === void 0 ? normalize(systemDownloads()) : void 0;
  if (systemRoot !== void 0) downloads = installerDownloads(systemRoot);
  assertDownloadRoot(downloads);
  if (!/^[a-zA-Z0-9][a-zA-Z0-9_.-]{0,180}$/.test(name)) throw Error("DOWNLOAD_FILENAME_INVALID");
  mkdirSync(downloads, { recursive: true, mode: 448 });
  const extension = extname(name), stem = name.slice(0, name.length - extension.length);
  if (sha256 !== void 0 || bytes2 !== void 0) {
    if (!/^[a-f0-9]{64}$/.test(sha256 || "") || !Number.isSafeInteger(bytes2) || bytes2 < 1)
      throw Error("DOWNLOAD_PIN_INVALID");
    const hashTail = sha256.slice(-16);
    const pinnedStem = `${stem}-${hashTail}`;
    const pinned = join2(downloads, pinnedStem + extension);
    if (matchesDownload(pinned, sha256, bytes2)) return pinned;
    const suffix = new RegExp(`-${hashTail}(?:-[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12})?$`);
    const previous = downloadDirectoryEntries(downloads).filter((entry) => {
      if (entry === pinnedStem + extension) return false;
      if (reuseByContent) return true;
      if (extname(entry) !== extension) return false;
      const candidate = basename2(entry, extension);
      return candidate.startsWith(pinnedStem + "-") && suffix.test(candidate);
    }).map((entry) => join2(downloads, entry));
    const verified = [pinned, ...previous].find(
      (candidate) => matchesDownload(candidate, sha256, bytes2)
    );
    if (verified) return verified;
    if (!downloadOccupied(pinned)) {
      if (systemRoot && systemRoot === dirname(downloads))
        reuseLegacyDownload(join2(systemRoot, basename2(pinned)), pinned, { sha256, bytes: bytes2 });
      if (!downloadOccupied(pinned) || matchesDownload(pinned, sha256, bytes2)) return pinned;
    }
  }
  for (let attempt = 0; attempt < 4; attempt++) {
    const file2 = join2(
      downloads,
      `${stem}-${sha256 ? `${sha256.slice(-16)}-` : ""}${randomUUID2()}${extension}`
    );
    if (!downloadOccupied(file2)) return file2;
  }
  throw Error("DOWNLOAD_FILENAME_COLLISION");
}
function reuseLegacyDownload(legacy, destination, { sha256, bytes: bytes2 }) {
  if (!matchesDownload(legacy, sha256, bytes2)) return;
  const stage = createDownloadStage("reuse", { downloads: dirname(destination) });
  const incoming = join2(stage, "verified.download");
  try {
    copyFileSync(legacy, incoming, constants.COPYFILE_EXCL);
    if (matchesDownload(incoming, sha256, bytes2))
      publishVerifiedDownload(incoming, destination, { sha256, bytes: bytes2 });
  } catch (error) {
    if (!["ENOENT", "EEXIST", "EACCES", "EPERM"].includes(error.code)) throw error;
  } finally {
    rmSync(stage, { recursive: true, force: true });
  }
}
function retainVerifiedDownload(name, staged, { downloads, sha256, bytes: bytes2 }) {
  for (let attempt = 0; attempt < 4; attempt++) {
    const path = downloadFilePath(name, { downloads, sha256, bytes: bytes2 });
    try {
      publishVerifiedDownload(staged, path, { sha256, bytes: bytes2 });
      return path;
    } catch (error) {
      if (error.code !== "EEXIST") throw error;
    }
  }
  throw Error("DOWNLOAD_FILENAME_COLLISION");
}
function publishExclusive(staged, destination) {
  try {
    linkSync(staged, destination);
  } catch (error) {
    const unsupported = ["ENOTSUP", "EOPNOTSUPP", "ENOSYS", "EPERM", "EXDEV", "EMLINK"];
    if (!unsupported.includes(error.code) && !(process.platform === "win32" && error.code === "EISDIR"))
      throw error;
    copyFileSync(staged, destination, constants.COPYFILE_EXCL);
  }
}
function publishVerifiedDownload(staged, destination, { sha256, bytes: bytes2 }) {
  try {
    publishExclusive(staged, destination);
  } catch (error) {
    if (error.code !== "EEXIST" || !matchesDownload(destination, sha256, bytes2)) throw error;
  }
}
function matchesDownload(path, sha256, bytes2) {
  try {
    const stat = lstatSync2(path);
    return stat.isFile() && stat.size === bytes2 && createHash("sha256").update(readFileSync(path)).digest("hex") === sha256;
  } catch (error) {
    if (!["ENOENT", "EACCES", "EPERM"].includes(error.code)) throw error;
    return false;
  }
}
function downloadOccupied(path) {
  try {
    lstatSync2(path);
    return true;
  } catch (error) {
    if (error.code === "ENOENT") return false;
    if (["EACCES", "EPERM"].includes(error.code)) return true;
    throw error;
  }
}
function assertDownloadRoot(directory) {
  if (typeof directory !== "string" || !isAbsolute(directory) || directory.includes("${") || /[\r\n\0]/.test(directory))
    throw Error("SYSTEM_DOWNLOADS_RESOLUTION_FAILED");
}

// ../../../DevCache/workspaces/asam-ui/expert-production-1.0.0-20261120/tools/v2/hosts/release-manifest.mjs
function checkedUrl(value, allowHttp) {
  const url = new URL(value);
  if (url.username || url.password || url.hash || url.protocol !== "https:" && !(allowHttp && url.protocol === "http:"))
    throw Error("RELEASE_URL_UNSUPPORTED");
  return url;
}
async function response(url, { allowHttp = false, signal, maxBytes }) {
  let current = checkedUrl(url, allowHttp);
  for (let redirects = 0; redirects <= 3; redirects++) {
    const result = await new Promise((resolve8, reject) => {
      const request = current.protocol === "https:" ? httpsRequest : httpRequest;
      const outgoing = request(current, {
        signal: AbortSignal.any([AbortSignal.timeout(6e4), ...signal ? [signal] : []]),
        headers: { "Accept-Encoding": "identity" }
      }, (incoming) => {
        incoming.on("error", () => {
        });
        resolve8(incoming);
      });
      outgoing.on("error", reject);
      outgoing.end();
    });
    if ([301, 302, 303, 307, 308].includes(result.statusCode)) {
      result.destroy();
      if (!result.headers.location) throw Error("RELEASE_REDIRECT_INVALID");
      const next = checkedUrl(new URL(result.headers.location, current), allowHttp);
      if (current.protocol === "https:" && next.protocol !== "https:")
        throw Error("RELEASE_REDIRECT_DOWNGRADE");
      current = next;
      continue;
    }
    if (result.statusCode < 200 || result.statusCode >= 300) {
      result.destroy();
      throw Error(`RELEASE_HTTP_${result.statusCode}`);
    }
    if (Number(result.headers["content-length"]) > maxBytes) {
      result.destroy();
      throw Error("RELEASE_DOWNLOAD_TOO_LARGE");
    }
    return result;
  }
  throw Error("RELEASE_REDIRECT_LIMIT");
}
async function readBounded(url, options2, incoming) {
  options2.progress?.(0, true);
  const result = await response(url, options2);
  let file2;
  const chunks = [];
  let length = 0;
  try {
    file2 = await open(incoming, "wx", 384);
    for await (const bytes2 of result) {
      length += bytes2.length;
      if (length > options2.maxBytes) throw Error("RELEASE_DOWNLOAD_TOO_LARGE");
      await file2.writeFile(bytes2);
      chunks.push(bytes2);
      options2.progress?.(length);
    }
  } finally {
    result.destroy();
    await file2?.close();
  }
  options2.progress?.(length, true);
  return Buffer.concat(chunks, length);
}
function transferProgress(onProgress, phase, message, totalBytes) {
  if (!onProgress) return;
  let last = 0;
  return (receivedBytes, force = false) => {
    const now = Date.now();
    if (!force && now - last < 1e3) return;
    last = now;
    onProgress({ phase, message, receivedBytes, totalBytes });
  };
}
async function loadRelease({
  url,
  publicKey,
  allowHttp = false,
  signal,
  downloadRoot,
  stage,
  onProgress
} = {}) {
  checkedUrl(url, allowHttp);
  const options2 = { allowHttp, signal, maxBytes: 1024 * 1024 };
  const directory = stage ?? createDownloadStage("release", { downloads: downloadRoot });
  const incomingManifest = join3(directory, "release.json");
  const incomingSignature = join3(directory, "release.json.sig");
  try {
    const bytes2 = await readBounded(
      url,
      {
        ...options2,
        progress: transferProgress(onProgress, "manifest-download", "\u6B63\u5728\u8BFB\u53D6\u53D1\u884C\u6E05\u5355\u2026")
      },
      incomingManifest
    );
    const signature = await readBounded(
      `${url}.sig`,
      {
        ...options2,
        maxBytes: 8192,
        progress: transferProgress(onProgress, "signature-download", "\u6B63\u5728\u8BFB\u53D6\u53D1\u884C\u7B7E\u540D\u2026")
      },
      incomingSignature
    );
    onProgress?.({ phase: "manifest-verification", message: "\u6B63\u5728\u6821\u9A8C\u53D1\u884C\u6E05\u5355\u7B7E\u540D\u2026" });
    const verified = verifyReleaseBytes(bytes2, signature, { publicKey, allowHttp });
    const urlId = createHash2("sha256").update(url).digest("hex").slice(-16);
    const manifestFile = retainVerifiedDownload(`release-${urlId}.json`, incomingManifest, {
      downloads: downloadRoot,
      sha256: verified.sha256,
      bytes: bytes2.length
    });
    const signatureFile = retainVerifiedDownload(
      `release-${urlId}.json.sig`,
      incomingSignature,
      {
        downloads: downloadRoot,
        sha256: createHash2("sha256").update(signature).digest("hex"),
        bytes: signature.length
      }
    );
    await unlink(incomingManifest).catch(() => {
    });
    await unlink(incomingSignature).catch(() => {
    });
    if (!stage) await rmdir(directory).catch(() => {
    });
    return { ...verified, downloadFiles: { manifest: manifestFile, signature: signatureFile } };
  } catch (error) {
    error.preserved = directory;
    throw error;
  }
}
function verifyReleaseBytes(bytes2, signature, { publicKey, allowHttp = false }) {
  if (bytes2.length > 1024 * 1024 || signature.length > 8192)
    throw Error("RELEASE_DOWNLOAD_TOO_LARGE");
  const key = createPublicKey(publicKey);
  if (key.asymmetricKeyType !== "rsa" || key.asymmetricKeyDetails.modulusLength < 2048 || !verifySignature(
    "RSA-SHA256",
    bytes2,
    key,
    Buffer.from(signature.toString("utf8").trim(), "base64")
  ))
    throw Error("RELEASE_SIGNATURE_INVALID");
  const manifest = JSON.parse(bytes2.toString("utf8"));
  if (manifest.schemaVersion !== 1 || !/^[\w.-]{1,80}$/.test(manifest.release ?? "") || !Array.isArray(manifest.artifacts) || !manifest.artifacts.length || manifest.artifacts.length > 100)
    throw Error("RELEASE_MANIFEST_INVALID");
  const identities = /* @__PURE__ */ new Set();
  for (const artifact of manifest.artifacts) {
    const id2 = `${artifact.host}/${artifact.platform}/${artifact.arch}`;
    if (!["codex", "workbuddy", "harness", "installer"].includes(artifact.host) || !["win32", "darwin", "linux", "any"].includes(artifact.platform) || !["x64", "arm64", "any"].includes(artifact.arch) || identities.has(id2) || !Number.isSafeInteger(artifact.bytes) || artifact.bytes <= 0 || artifact.bytes > 512 * 1024 * 1024 || !/^[a-f0-9]{64}$/.test(artifact.sha256 ?? ""))
      throw Error("RELEASE_ARTIFACT_INVALID");
    checkedUrl(artifact.url, allowHttp);
    identities.add(id2);
  }
  return { manifest, sha256: createHash2("sha256").update(bytes2).digest("hex") };
}
async function loadLocalRelease({ directory, publicKey, allowHttp = false }) {
  return verifyReleaseBytes(
    await readFile(join3(directory, "release.json")),
    await readFile(join3(directory, "release.json.sig")),
    { publicKey, allowHttp }
  );
}
async function copyLocalArtifact(artifact, directory, destination, { stage, onProgress } = {}) {
  const name = basename3(new URL(artifact.url).pathname);
  if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]*$/.test(name))
    throw Error("RELEASE_LOCAL_FILENAME_UNSUPPORTED");
  const source = join3(directory, name);
  const stat = await lstat(source);
  if (!stat.isFile() || stat.isSymbolicLink() || stat.size !== artifact.bytes)
    throw Error("RELEASE_SIZE_MISMATCH");
  if (await reusableDownload(artifact, destination)) {
    const bytes2 = await readFile(source);
    if (bytes2.length !== artifact.bytes) throw Error("RELEASE_SIZE_MISMATCH");
    if (createHash2("sha256").update(bytes2).digest("hex") !== artifact.sha256)
      throw Error("RELEASE_HASH_MISMATCH");
    onProgress?.({ phase: "reused", message: "\u5DF2\u6821\u9A8C\u5E76\u590D\u7528\u672C\u5730\u5B89\u88C5\u5305\u3002" });
    return destination;
  }
  return stageArtifact(artifact, destination, stage, async (incoming) => {
    await copyFile(source, incoming, constants2.COPYFILE_EXCL);
    const bytes2 = await readFile(incoming);
    if (bytes2.length !== artifact.bytes) throw Error("RELEASE_SIZE_MISMATCH");
    if (createHash2("sha256").update(bytes2).digest("hex") !== artifact.sha256)
      throw Error("RELEASE_HASH_MISMATCH");
  });
}
function selectArtifact(manifest, host, platform = process.platform, arch = process.arch) {
  const matches = manifest.artifacts.filter(
    (entry) => entry.host === host && (entry.platform === platform || entry.platform === "any") && (entry.arch === arch || entry.arch === "any")
  );
  if (matches.length !== 1) throw Error("RELEASE_PLATFORM_NOT_SUPPORTED");
  return matches[0];
}
async function downloadArtifact(artifact, destination, { allowHttp = false, signal, stage, onProgress } = {}) {
  checkedUrl(artifact.url, allowHttp);
  if (await reusableDownload(artifact, destination)) {
    onProgress?.({ phase: "reused", message: "\u5DF2\u6821\u9A8C\u5E76\u590D\u7528\u672C\u5730\u5B89\u88C5\u5305\u3002" });
    return destination;
  }
  const progress = transferProgress(
    onProgress,
    "package-download",
    "\u6B63\u5728\u4E0B\u8F7D\u5B89\u88C5\u5305\u2026",
    artifact.bytes
  );
  progress?.(0, true);
  const result = await response(artifact.url, { allowHttp, signal, maxBytes: artifact.bytes });
  try {
    return await stageArtifact(artifact, destination, stage, async (incoming) => {
      const file2 = await open(incoming, "wx", 384);
      const hash2 = createHash2("sha256");
      let length = 0;
      try {
        for await (const bytes2 of result) {
          length += bytes2.length;
          if (length > artifact.bytes) throw Error("RELEASE_SIZE_MISMATCH");
          hash2.update(bytes2);
          await file2.writeFile(bytes2);
          progress?.(length, length === artifact.bytes);
        }
        onProgress?.({
          phase: "package-verification",
          message: "\u6B63\u5728\u6838\u5BF9\u4E0B\u8F7D\u5927\u5C0F\u548C SHA256\u2026"
        });
        if (length !== artifact.bytes || hash2.digest("hex") !== artifact.sha256)
          throw Error("RELEASE_HASH_MISMATCH");
      } finally {
        await file2.close();
      }
    });
  } finally {
    result.destroy();
  }
}
async function stageArtifact(artifact, destination, stage, writeVerified) {
  const directory = stage ?? createDownloadStage("artifact", { downloads: dirname2(destination) });
  const incoming = join3(directory, "artifact.download");
  try {
    await writeVerified(incoming);
    publishVerifiedDownload(incoming, destination, artifact);
  } catch (error) {
    error.preserved = directory;
    throw error;
  }
  await unlink(incoming).catch(() => {
  });
  if (!stage) await rmdir(directory).catch(() => {
  });
  return destination;
}
async function reusableDownload(artifact, destination) {
  try {
    const stat = await lstat(destination);
    if (stat.isFile() && !stat.isSymbolicLink() && stat.size === artifact.bytes && createHash2("sha256").update(await readFile(destination)).digest("hex") === artifact.sha256)
      return true;
    throw Object.assign(Error("DOWNLOAD_FILE_ALREADY_EXISTS"), { code: "EEXIST" });
  } catch (error) {
    if (error.code === "ENOENT") return false;
    throw error;
  }
}

// ../../../DevCache/workspaces/asam-ui/expert-production-1.0.0-20261120/tools/v2/hosts/harness-install.mjs
import {
  cpSync,
  copyFileSync as copyFileSync2,
  existsSync as existsSync2,
  mkdirSync as mkdirSync2,
  readFileSync as readFileSync3,
  realpathSync,
  readdirSync as readdirSync2,
  lstatSync as lstatSync4,
  mkdtempSync as mkdtempSync2,
  rmSync as rmSync2,
  writeFileSync as writeFileSync3,
  openSync,
  closeSync,
  unlinkSync as unlinkSync2,
  renameSync as renameSync2
} from "node:fs";
import { basename as basename4, join as join5, resolve, isAbsolute as isAbsolute3, dirname as dirname4, relative, sep } from "node:path";
import { isDeepStrictEqual } from "node:util";
import { pathToFileURL } from "node:url";
import { spawn, spawnSync as spawnSync3 } from "node:child_process";
import { randomUUID as randomUUID4, createHash as createHash4 } from "node:crypto";

// ../../../DevCache/workspaces/asam-ui/expert-production-1.0.0-20261120/tools/v2/hosts/harness-compatibility.mjs
var harnessVersion = "0.2.2-rc.1";
var harnessRc5Version = "0.2.2-rc.5";
var harnessPackageTargets = Object.freeze([
  harnessVersion,
  "0.2.2-rc.2",
  harnessRc5Version
]);
var knownHarnessVersions = Object.freeze(["0.2.1-rc.3", ...harnessPackageTargets]);
var supportedHarnessVersions = Object.freeze(
  knownHarnessVersions.filter(
    (version) => version !== harnessRc5Version || process.platform === "win32" && process.arch === "x64" || process.platform === "darwin" && process.arch === "arm64"
  )
);

// ../../../DevCache/workspaces/asam-ui/expert-production-1.0.0-20261120/tools/v2/hosts/appledouble.mjs
function isAppleDouble(bytes2) {
  if (bytes2.length < 38 || bytes2.length > 16 * 1024 * 1024 || bytes2.readUInt32BE(0) !== 333319 || bytes2.readUInt32BE(4) !== 131072)
    return false;
  const count = bytes2.readUInt16BE(24), end = 26 + count * 12;
  if (count < 1 || count > 2 || end > bytes2.length) return false;
  const ids = /* @__PURE__ */ new Set(), ranges = [];
  for (let i = 26; i < end; i += 12) {
    const id2 = bytes2.readUInt32BE(i), start = bytes2.readUInt32BE(i + 4), size = bytes2.readUInt32BE(i + 8);
    if (![2, 9].includes(id2) || ids.has(id2) || start < end || start + size > bytes2.length || id2 === 9 && size < 32)
      return false;
    ids.add(id2);
    if (size) ranges.push([start, start + size]);
  }
  if (!ids.has(9)) return false;
  let cursor = end;
  for (const [start, stop] of ranges.sort((a, b) => a[0] - b[0])) {
    if (start < cursor || bytes2.subarray(cursor, start).some((value) => value !== 0))
      return false;
    cursor = stop;
  }
  return cursor === bytes2.length;
}

// ../../../DevCache/workspaces/asam-ui/expert-production-1.0.0-20261120/tools/v2/hosts/harness-environment.mjs
import { win32 as win322, posix as posix2 } from "node:path";
function harnessEnvironment(env = process.env, platform = process.platform) {
  const result = { ...env };
  const valueAt = (name) => {
    const keys = Object.keys(env).filter((key) => key.toLowerCase() === name.toLowerCase());
    const values = [...new Set(keys.map((key) => env[key]).filter(Boolean))];
    if (values.length > 1) throw Error(`HARNESS_PNPM_ENV_CONFLICT: ${name}`);
    return values[0];
  };
  const native2 = (name, value) => {
    if (value && !(platform === "win32" ? win322.isAbsolute(value) : posix2.isAbsolute(value) && !/^(?:[a-z]:|\\\\|\/\/)/i.test(value)))
      throw Error(
        `HARNESS_FOREIGN_RUNTIME_PATH: ${name}; \u8BF7\u5728\u672C\u6B21\u8FDB\u7A0B\u6307\u5B9A\u672C\u673A\u5DF2\u6709\u7684\u7EDD\u5BF9\u8DEF\u5F84\u3002`
      );
  };
  for (const name of ["PNPM_HOME", "XDG_CACHE_HOME", "XDG_CONFIG_HOME", "XDG_STATE_HOME"])
    native2(name, valueAt(name));
  for (const name of ["store_dir", "cache_dir", "state_dir"]) {
    const legacy = valueAt(`npm_config_${name}`), current = valueAt(`pnpm_config_${name}`);
    native2(`npm_config_${name}`, legacy);
    native2(`pnpm_config_${name}`, current);
    if (!current && legacy) result[`pnpm_config_${name}`] = legacy;
  }
  return result;
}

// ../../../DevCache/workspaces/asam-ui/expert-production-1.0.0-20261120/tools/v2/hosts/harness-install.mjs
import { tmpdir } from "node:os";

// ../../../DevCache/workspaces/asam-ui/expert-production-1.0.0-20261120/tools/v2/hosts/harness-store-recovery.mjs
import {
  existsSync,
  lstatSync as lstatSync3,
  readFileSync as readFileSync2,
  renameSync,
  unlinkSync,
  writeFileSync as writeFileSync2
} from "node:fs";
import { dirname as dirname3, isAbsolute as isAbsolute2, join as join4 } from "node:path";
import { createHash as createHash3, randomUUID as randomUUID3 } from "node:crypto";
import { homedir as homedir3 } from "node:os";
var harnessRecoveryProbeArgs = Object.freeze([
  "--config.ignore-pnpmfile=true",
  "--config.config-dependencies=false",
  "--config.pm-on-fail=ignore",
  "--config.runtime-on-fail=ignore",
  "--config.runtime=false",
  "--config.manage-package-manager-versions=false",
  "--config.strict-ssl=true"
]);
var storageKeys = /* @__PURE__ */ new Set([
  "storedir",
  "cachedir",
  "statedir",
  "cache",
  "globaldir",
  "globalbindir",
  "useragent",
  "registry"
]);
var nativeWorkspace = Buffer.from(
  "packages:\n  - .\n\nnodeLinker: hoisted\nautoInstallPeers: false\n"
);
var nativeBundles = ["@deepseek-ai/dsh-base", "@deepseek-ai/dsh-web-app"];
var bundleOwner = "@asam-ui/dsh-development";
var configFiles = [
  ".npmrc",
  "pnpm-workspace.yaml",
  ".pnpmfile.cjs",
  ".pnpmfile.mjs",
  ".pnpmfile.js",
  "pnpmfile.cjs",
  "pnpmfile.mjs"
];
function present(path) {
  try {
    lstatSync3(path);
    return true;
  } catch (error) {
    if (error.code === "ENOENT") return false;
    throw error;
  }
}
function workspaceBytes(profile) {
  const path = join4(profile, "pnpm-workspace.yaml");
  if (!present(path)) return null;
  const bytes2 = regularFile(path);
  if (!bytes2.equals(nativeWorkspace))
    throw Error("HARNESS_STORE_RECOVERY_PROFILE_CONFIG_PRESENT");
  return bytes2;
}
function sameBytes(path, before) {
  try {
    return before ? present(path) && regularFile(path).equals(before) : !present(path);
  } catch {
    return false;
  }
}
function assertProfileConfiguration(profile, user) {
  for (let path = profile; ; path = dirname3(path)) {
    for (const name of configFiles) {
      const file2 = join4(path, name);
      if (name === ".npmrc" && user && file2 === join4(user, ".npmrc")) continue;
      if (!present(file2)) continue;
      if (path === profile && name === "pnpm-workspace.yaml" && regularFile(file2).equals(nativeWorkspace))
        continue;
      throw Error("HARNESS_STORE_RECOVERY_PROFILE_CONFIG_PRESENT");
    }
    if (dirname3(path) === path) break;
  }
}
function manifestBeforeRecovery(profile) {
  const bytes2 = regularFile(join4(profile, "package.json"));
  const manifest = JSON.parse(bytes2);
  const bundles = manifest.dsh?.profile?.bundles;
  if (!Array.isArray(bundles) || bundles.length && JSON.stringify(bundles) !== JSON.stringify(nativeBundles) || [
    "scripts",
    "pnpm",
    "packageManager",
    "devEngines",
    "engines",
    "executionEnv",
    "configDependencies"
  ].some((key) => manifest[key] !== void 0) || ["dependencies", "devDependencies", "optionalDependencies", "peerDependencies"].some(
    (key) => manifest[key] && Object.keys(manifest[key]).length
  ))
    throw Error("HARNESS_STORE_RECOVERY_PROFILE_NOT_EMPTY");
  return { bytes: bytes2, bundles };
}
function assertHarnessRecoveryInput(profile, env) {
  const user = env.HOME || env.USERPROFILE || homedir3();
  for (const [key, value] of Object.entries(env)) {
    if (!value) continue;
    const match = key.match(/^(?:npm|pnpm)_config_(.+)$/i);
    if (match && !storageKeys.has(match[1].replace(/[-_]/g, "").toLowerCase()) || /^(?:INIT_CWD|NODE_OPTIONS)$/i.test(key))
      throw Error("HARNESS_STORE_RECOVERY_PATH_OVERRIDE");
  }
  assertProfileConfiguration(profile, user);
  const config = env.XDG_CONFIG_HOME ? join4(env.XDG_CONFIG_HOME, "pnpm") : process.platform === "darwin" ? join4(user, "Library/Preferences/pnpm") : env.LOCALAPPDATA ? join4(env.LOCALAPPDATA, "pnpm/config") : join4(user, ".config/pnpm");
  const globalFiles = /* @__PURE__ */ new Set([
    join4(user, ".npmrc"),
    join4(config, "rc"),
    join4(config, "config.yaml"),
    ...env.PNPM_HOME ? [join4(env.PNPM_HOME, "rc")] : [],
    ...process.platform === "darwin" ? ["/etc/npmrc", "/usr/local/etc/npmrc"] : []
  ]);
  for (const path of globalFiles) {
    if (!present(path)) continue;
    for (const line of regularFile(path).toString("utf8").split(/\r?\n/)) {
      if (!line.trim() || /^\s*[#;]/.test(line)) continue;
      const assignment = line.match(/^([\w-]+)\s*[:=]\s*([^\r\n]+)$/);
      const key = assignment?.[1];
      const rc = /(?:^|[\\/])(?:rc|\.npmrc)$/.test(path);
      if (rc && key === "strict-ssl" && !/^(['"]?)true\1$/i.test(assignment[2].trim()))
        throw Error("HARNESS_STORE_RECOVERY_TLS_REQUIRED");
      const inertRc = rc && (key === "puppeteer_download_host" || key === "strict-ssl");
      const authKey = rc && /^(?:(?:\/\/[^\s=]+\/):)?(?:_authToken|_auth|username|_password|always-auth)\s*=/.test(
        line
      );
      if (!authKey && !inertRc && (!key || !storageKeys.has(key.replace(/[-_]/g, "").toLowerCase())))
        throw Error("HARNESS_STORE_RECOVERY_GLOBAL_CONFIG_PRESENT");
    }
  }
  manifestBeforeRecovery(profile);
}
var scopedSettings = {
  modulesDir: "node_modules",
  virtualStoreDir: "node_modules/.pnpm",
  lockfileDir: void 0,
  workspaceDir: void 0,
  globalPnpmfile: void 0,
  lockfile: "true"
};
async function verifyHarnessRecoveryScope(profile, env, nativeConfig) {
  assertHarnessRecoveryInput(profile, env);
  const tls = await nativeConfig("strict-ssl");
  assertHarnessRecoveryInput(profile, env);
  if (tls !== "true") throw Error("HARNESS_STORE_RECOVERY_TLS_REQUIRED");
  const settings = {
    ...scopedSettings,
    ...workspaceBytes(profile) ? { lockfileDir: profile, workspaceDir: profile } : {}
  };
  for (const [key, allowed] of Object.entries(settings)) {
    assertHarnessRecoveryInput(profile, env);
    const actual = await nativeConfig(key);
    if (!actual || actual === "undefined" || actual === allowed || allowed && key !== "lockfile" && actual === join4(profile, allowed))
      continue;
    throw Error(`HARNESS_STORE_RECOVERY_PATH_OVERRIDE: ${key}`);
  }
}
function regularFile(path) {
  if (!lstatSync3(path).isFile()) throw Error("HARNESS_STORE_RECOVERY_BASELINE_UNSUPPORTED");
  return readFileSync2(path);
}
function recordedStore(modules) {
  if (!lstatSync3(modules).isDirectory())
    throw Error("HARNESS_STORE_RECOVERY_BASELINE_UNSUPPORTED");
  const raw = regularFile(join4(modules, ".modules.yaml")).toString("utf8");
  if (raw.trimStart().startsWith("{")) {
    const { storeDir } = JSON.parse(raw);
    if (typeof storeDir !== "string" || !storeDir)
      throw Error("HARNESS_STORE_RECOVERY_BASELINE_UNSUPPORTED");
    return storeDir;
  }
  const rows = [...raw.matchAll(/^storeDir: ([^\r\n]+)\r?$/gm)];
  if (rows.length !== 1) throw Error("HARNESS_STORE_RECOVERY_BASELINE_UNSUPPORTED");
  const value = rows[0][1].trim();
  if (value.startsWith('"')) return JSON.parse(value);
  if (value.startsWith("'") && value.endsWith("'"))
    return value.slice(1, -1).replaceAll("''", "'");
  return value;
}
async function withHarnessStoreRecovery({ profile, manager, currentStore, env = process.env, nativeBundlesBefore, verifyNativeBundles }, install) {
  const modules = join4(profile, "node_modules");
  const store = recordedStore(modules);
  if (store === currentStore) return install();
  if (store !== `${profile}/D:\\.pnpm-store/v11` || !isAbsolute2(currentStore) || currentStore.startsWith(`${profile}/`) || !lstatSync3(currentStore).isDirectory())
    throw Error("HARNESS_STORE_RECOVERY_BASELINE_UNSUPPORTED");
  assertHarnessRecoveryInput(profile, env);
  const manifestPath = join4(profile, "package.json");
  const { bytes: manifestBytes, bundles } = manifestBeforeRecovery(profile);
  const workspacePath = join4(profile, "pnpm-workspace.yaml");
  const workspaceBefore = workspaceBytes(profile);
  const workspaceUnchanged = () => sameBytes(workspacePath, workspaceBefore);
  const lockPath = join4(profile, "pnpm-lock.yaml");
  const lockBytes = existsSync(lockPath) ? regularFile(lockPath) : null;
  const id2 = randomUUID3();
  const backup = join4(profile, `node_modules.asam-store-before-${id2}`);
  const journal = join4(manager, "store-recovery.json");
  if (existsSync(journal)) throw Error(`HARNESS_STORE_RECOVERY_MANUAL_REVIEW: ${journal}`);
  const snapshot = (name, bytes2) => {
    if (!bytes2) return null;
    const path = join4(manager, `store-before-${id2}-${name}`);
    writeFileSync2(path, bytes2, { flag: "wx", mode: 384 });
    return { path, sha256: createHash3("sha256").update(bytes2).digest("hex") };
  };
  const manifestBefore = snapshot("package.json", manifestBytes);
  const lockBefore = snapshot("pnpm-lock.yaml", lockBytes);
  const workspaceSnapshot = snapshot("pnpm-workspace.yaml", workspaceBefore);
  writeFileSync2(
    journal,
    JSON.stringify(
      {
        schemaVersion: 1,
        profile,
        modules,
        backup,
        store,
        currentStore,
        manifestBefore,
        lockBefore,
        workspaceBefore: workspaceSnapshot,
        nativeBundlesBefore
      },
      null,
      2
    ) + "\n",
    { flag: "wx", mode: 384 }
  );
  renameSync(modules, backup);
  let result;
  try {
    const verifyBaseline = () => {
      if (!workspaceUnchanged())
        throw Error("HARNESS_STORE_RECOVERY_NATIVE_BASELINE_CHANGED");
    };
    result = await install(
      () => {
        if (recordedStore(modules) !== currentStore)
          throw Error("HARNESS_STORE_RECOVERY_TARGET_UNPROVEN");
        const afterBundles = JSON.parse(regularFile(manifestPath)).dsh?.profile?.bundles;
        if (!workspaceUnchanged() || !Array.isArray(afterBundles) || JSON.stringify(afterBundles.filter((name) => name !== bundleOwner)) !== JSON.stringify(bundles))
          throw Error("HARNESS_STORE_RECOVERY_NATIVE_BASELINE_CHANGED");
        return verifyNativeBundles ? Promise.resolve(verifyNativeBundles()).then(verifyBaseline) : verifyBaseline();
      },
      () => {
        verifyBaseline();
        if (!sameBytes(manifestPath, manifestBytes) || !sameBytes(lockPath, lockBytes))
          throw Error("HARNESS_STORE_RECOVERY_NATIVE_BASELINE_CHANGED");
        assertHarnessRecoveryInput(profile, env);
      }
    );
  } catch (error) {
    if (!sameBytes(manifestPath, manifestBytes) || !sameBytes(lockPath, lockBytes) || !workspaceUnchanged())
      throw Error(`HARNESS_STORE_RECOVERY_MANUAL_REVIEW: ${journal}
${error.message}`, {
        cause: error
      });
    if (existsSync(modules)) renameSync(modules, `${backup}.failed`);
    renameSync(backup, modules);
    unlinkSync(journal);
    throw error;
  }
  unlinkSync(journal);
  return {
    ...result,
    storeRecovery: {
      backup,
      store: currentStore,
      workspaceBefore: workspaceSnapshot,
      nativeBundlesBefore
    }
  };
}

// ../../../DevCache/workspaces/asam-ui/expert-production-1.0.0-20261120/tools/v2/hosts/harness-install.mjs
var packageName = "@asam-ui/dsh-development";
var hash = (bytes2) => createHash4("sha256").update(bytes2).digest("hex");
var json = (path) => JSON.parse(readFileSync3(path, "utf8"));
var write = (path, value) => writeFileSync3(path, JSON.stringify(value, null, 2) + "\n", { mode: 384 });
function noLinks(path) {
  const paths2 = [];
  for (let current = resolve(path); ; current = dirname4(current)) {
    paths2.unshift(current);
    if (dirname4(current) === current) break;
  }
  for (const current of paths2)
    if (lstatSync4(current, { throwIfNoEntry: false })?.isSymbolicLink())
      throw Error("HARNESS_STATE_LINK_UNSUPPORTED");
}
function verifyHarnessPackage(root, { allowAppleDouble = false, archiveRoot } = {}) {
  const ownership = json(join5(root, "asam-ownership.json"));
  if (ownership.schemaVersion !== 1 || ownership.owner !== packageName || !Array.isArray(ownership.files))
    throw Error("HARNESS_UNKNOWN_PACKAGE");
  const authored = /* @__PURE__ */ new Set(["asam-ownership.json", ...ownership.files.map((file2) => file2.path)]);
  for (const path of [...authored]) {
    const parts = path.split("/");
    while (parts.length > 1) {
      parts.pop();
      authored.add(parts.join("/"));
    }
  }
  const macMetadata = [];
  const walk = (prefix = "") => readdirSync2(join5(root, prefix), { withFileTypes: true }).flatMap((entry) => {
    if (!prefix && ["node_modules", "asam-ownership.json"].includes(entry.name))
      return [];
    if (entry.isSymbolicLink()) throw Error("HARNESS_AUTHORED_LINK_UNSUPPORTED");
    const path = prefix ? `${prefix}/${entry.name}` : entry.name;
    const sibling = prefix ? `${prefix}/${entry.name.slice(2)}` : entry.name.slice(2);
    const wrapper = !prefix && archiveRoot === "package" && entry.name === "._package";
    if (allowAppleDouble && entry.isFile() && entry.name.startsWith("._") && (wrapper || authored.has(sibling) && existsSync2(join5(root, sibling)))) {
      const metadata2 = join5(root, path);
      if (lstatSync4(metadata2).size <= 16 * 1024 * 1024 && isAppleDouble(readFileSync3(metadata2))) {
        macMetadata.push(path);
        return [];
      }
    }
    return entry.isDirectory() ? walk(path) : [{ path, sha256: hash(readFileSync3(join5(root, path))) }];
  }).sort((a, b) => a.path.localeCompare(b.path));
  const actual = walk();
  if (JSON.stringify(actual) !== JSON.stringify(ownership.files))
    throw Error("HARNESS_MODIFIED_CONTENT_PRESERVED");
  const metadata = json(join5(root, "package.json"));
  if (metadata.name !== packageName || !knownHarnessVersions.includes(metadata.engines?.dsh))
    throw Error("HARNESS_PACKAGE_IDENTITY_MISMATCH");
  return { ownership, metadata, files: actual, macMetadata };
}
async function run(command, args, { env = process.env, cwd, signal, onProgress, onProcess, timeoutMs = 3e5 } = {}) {
  signal?.throwIfAborted();
  let executable = command, argv = args;
  if (process.platform === "win32" && /\.(?:cmd|bat)$/i.test(command)) {
    const values = [command, ...args];
    if (values.some((value) => /["%&|<>^!\r\n]/.test(value)))
      throw Error("HARNESS_LAUNCHER_PATH_UNSUPPORTED");
    executable = process.env.ComSpec || "cmd.exe";
    argv = ["/d", "/s", "/c", `"${values.map((value) => `"${value}"`).join(" ")}"`];
  }
  const finishLog = nativeLog(command, args);
  return new Promise((resolveResult, reject) => {
    const child = spawn(executable, argv, {
      env,
      cwd,
      windowsHide: true,
      windowsVerbatimArguments: process.platform === "win32" && /\.(?:cmd|bat)$/i.test(command),
      detached: process.platform !== "win32",
      stdio: ["ignore", "pipe", "pipe"]
    });
    if (child.pid) onProcess?.({ pid: child.pid, command, args });
    let stdout = "", stderr = "", failure, hardKill;
    const stop = (reason) => {
      if (failure) return;
      failure = reason;
      if (process.platform === "win32") {
        if (child.pid)
          spawnSync3("taskkill.exe", ["/PID", String(child.pid), "/T", "/F"], {
            windowsHide: true,
            timeout: 1e4
          });
      } else if (child.pid) {
        try {
          process.kill(-child.pid, "SIGTERM");
        } catch (error) {
          if (error.code !== "ESRCH") throw error;
        }
        hardKill = setTimeout(() => {
          try {
            process.kill(-child.pid, "SIGKILL");
          } catch {
          }
        }, 3e3);
      }
    };
    const timeout = setTimeout(() => stop(Error("HARNESS_NATIVE_TIMEOUT")), timeoutMs);
    const abort = () => stop(signal.reason ?? Error("HARNESS_CANCELLED"));
    signal?.addEventListener("abort", abort, { once: true });
    const cleanup = () => {
      clearTimeout(timeout);
      clearTimeout(hardKill);
      signal?.removeEventListener("abort", abort);
    };
    child.on("error", (error) => {
      cleanup();
      failure = error;
      finishLog({ stdout, stderr, error });
      reject(error);
    });
    child.stdout.on("data", (bytes2) => {
      stdout += bytes2;
      onProgress?.(bytes2.toString());
      if (stdout.length + stderr.length > 4 * 1024 * 1024)
        stop(Error("HARNESS_NATIVE_OUTPUT_LIMIT"));
    });
    child.stderr.on("data", (bytes2) => {
      stderr += bytes2;
      onProgress?.(bytes2.toString());
      if (stdout.length + stderr.length > 4 * 1024 * 1024)
        stop(Error("HARNESS_NATIVE_OUTPUT_LIMIT"));
    });
    child.on("close", (code, signal2) => {
      cleanup();
      finishLog({ status: code, signal: signal2, stdout, stderr, error: failure });
      if (failure || code !== 0)
        reject(
          Error(`HARNESS_NATIVE_FAILED: ${failure?.message || code}
${stderr || stdout}`)
        );
      else resolveResult(stdout);
    });
  });
}
function assertHarnessDesktopInitialized(home) {
  const manifest = join5(home, "profiles", "desktop", "package.json");
  noLinks(manifest);
  if (!existsSync2(manifest) || !lstatSync4(manifest).isFile())
    throw Error("HARNESS_DESKTOP_INITIALIZATION_REQUIRED");
}
async function requireDesktopClosed(launcher, signal) {
  const command = realpathSync(launcher.command);
  let executable;
  if (process.platform === "win32") {
    const suffix = /[\\/]resources[\\/]runtime[\\/]cli[\\/]bin[\\/]dsh\.cmd$/i;
    if (suffix.test(command))
      executable = join5(command.replace(suffix, ""), "DeepSeek Harness.exe");
  } else if (process.platform === "darwin") {
    const suffix = /\/Resources\/runtime\/cli\/bin\/dsh$/;
    if (suffix.test(command))
      executable = join5(command.replace(suffix, ""), "MacOS/DeepSeek Harness");
  }
  if (!executable || !existsSync2(executable)) throw Error("HARNESS_DESKTOP_LAUNCHER_REQUIRED");
  executable = realpathSync(executable);
  const observe = (binary, args, env) => run(binary, args, { signal, env, timeoutMs: 6e4 });
  let running = [];
  try {
    if (process.platform === "win32") {
      const result = await observe(
        join5(
          process.env.SystemRoot || "C:/Windows",
          "System32/WindowsPowerShell/v1.0/powershell.exe"
        ),
        [
          "-NoProfile",
          "-NonInteractive",
          "-Command",
          `Get-CimInstance Win32_Process -Filter "Name = 'DeepSeek Harness.exe'" -ErrorAction Stop | Where-Object { $_.ExecutablePath -eq $env:ASAM_DESKTOP_EXECUTABLE -and $_.CommandLine -notmatch '(?:^|\\s)--(?:type(?:=|\\s)|expose-internals(?:\\s|$))' } | Select-Object -ExpandProperty ProcessId | ConvertTo-Json -Compress`
        ],
        { ...process.env, ASAM_DESKTOP_EXECUTABLE: executable }
      );
      if (result.trim()) {
        const pids = JSON.parse(result);
        running = Array.isArray(pids) ? pids : [pids];
      }
    } else {
      const processes = await observe("/bin/ps", ["-Aww", "-o", "pid=,comm="]);
      const pids = processes.split("\n").flatMap((line) => {
        const match = line.match(/^\s*(\d+)\s+(.+?)\s*$/);
        return match && match[2] === executable ? [match[1]] : [];
      });
      if (pids.length) {
        const commands = await observe("/bin/ps", [
          "-ww",
          "-p",
          pids.join(","),
          "-o",
          "pid=,args="
        ]);
        running = commands.split("\n").filter(
          (line) => line.trim() && !/(?:^|\s)--(?:type(?:=|\s)|expose-internals(?:\s|$))/.test(line)
        );
      }
    }
  } catch (error) {
    signal?.throwIfAborted();
    throw Error("HARNESS_DESKTOP_STATUS_UNAVAILABLE", { cause: error });
  }
  if (running.length) throw Error("HARNESS_DESKTOP_CLOSE_REQUIRED");
}
function atomic(path, bytes2, expected) {
  const current = existsSync2(path) ? readFileSync3(path) : null;
  if (expected === null ? current !== null : !current?.equals(expected))
    throw Error("HARNESS_STATE_CHANGED");
  const temporary = `${path}.incoming-${randomUUID4()}`;
  writeFileSync3(temporary, bytes2, { flag: "wx", mode: 384 });
  renameSync2(temporary, path);
}
function committedStateBytes(home, profile, incoming, previous) {
  return Buffer.from(
    JSON.stringify(
      { owner: packageName, home: resolve(home), profile, current: incoming, previous },
      null,
      2
    ) + "\n"
  );
}
function journalWasCommitted(manager, pending, state, bytes2, home, profile) {
  if (state?.owner !== packageName || state.home !== resolve(home) || state.profile !== profile || JSON.stringify(state.current) !== JSON.stringify(pending.incoming))
    return false;
  if (pending.afterStateSHA256 !== void 0) return pending.afterStateSHA256 === hash(bytes2);
  if (pending.beforeStateSHA256 === null)
    return bytes2.equals(committedStateBytes(home, profile, pending.incoming, null));
  for (const name of readdirSync2(manager)) {
    if (!/^state-before-[0-9a-f-]+\.json$/.test(name)) continue;
    const path = join5(manager, name);
    noLinks(path);
    const previousBytes = readFileSync3(path);
    if (hash(previousBytes) !== pending.beforeStateSHA256) continue;
    const previous = JSON.parse(previousBytes);
    return previous.owner === packageName && previous.home === resolve(home) && previous.profile === profile && bytes2.equals(
      committedStateBytes(home, profile, pending.incoming, previous.current ?? null)
    );
  }
  return false;
}
async function inspectHarnessNativeBundles({
  app,
  executable,
  cwd = app,
  env = process.env,
  signal
}) {
  return JSON.parse(
    await run(
      executable,
      [
        "--expose-internals",
        "--input-type=module",
        "--eval",
        `import fs from 'node:fs'; import path from 'node:path'; import {createRequire} from 'node:module'; import {createHash} from 'node:crypto';
const root=process.argv[1], request=createRequire(path.join(root,'package.json'));
const values=['@deepseek-ai/dsh-base','@deepseek-ai/dsh-web-app'].map(name=>{
const expected=fs.realpathSync(path.join(root,'node_modules',name));
const actual=(request.resolve.paths(name)||[]).map(base=>path.join(base,name)).find(dir=>fs.existsSync(path.join(dir,'package.json')));
if(!actual||fs.realpathSync(actual)!==expected)throw Error('HARNESS_NATIVE_BUNDLE_ORIGIN_UNPROVEN');
const bytes=fs.readFileSync(path.join(expected,'package.json')), pkg=JSON.parse(bytes), entry=fs.realpathSync(request.resolve(name));
if(pkg.name!==name||typeof pkg.version!=='string'||!entry.startsWith(expected+path.sep))throw Error('HARNESS_NATIVE_BUNDLE_ORIGIN_UNPROVEN');
return {name,version:pkg.version,directory:expected,entry,manifestSHA256:createHash('sha256').update(bytes).digest('hex')};});
console.log(JSON.stringify(values));`,
        join5(app, "Resources/app.asar/dsh")
      ],
      {
        cwd,
        env: { ...env, ELECTRON_RUN_AS_NODE: "1" },
        signal,
        timeoutMs: 15e3
      }
    )
  );
}
function registeredDesktopState(defaultRoot, home, profileRoot, target) {
  try {
    const defaultManager = join5(defaultRoot, "desktop");
    noLinks(defaultManager);
    if (["state.json", "pending.json", "installer.lock", "store-recovery.json"].some(
      (name) => lstatSync4(join5(defaultManager, name), { throwIfNoEntry: false })
    ))
      return;
    const manifest = join5(profileRoot, "package.json");
    noLinks(manifest);
    noLinks(target);
    const registration = json(manifest);
    const dependency = registration.dependencies?.[packageName];
    const bundles = registration.dsh?.profile?.bundles;
    if (!Array.isArray(bundles) || !bundles.includes(packageName) || typeof dependency !== "string" || !/^file:[a-z]:[\\/]/i.test(dependency))
      return;
    const archive = resolve(dependency.slice(5));
    const slot = dirname4(archive);
    const manager = dirname4(slot);
    if (basename4(archive) !== "plugin.tgz" || !/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(basename4(slot)) || basename4(manager) !== "desktop")
      return;
    const statePath = join5(manager, "state.json");
    const runtimePath = join5(target, "harness-runtime.json");
    const ownershipPath = join5(target, "asam-ownership.json");
    noLinks(archive);
    noLinks(statePath);
    const archiveInfo = lstatSync4(archive, { throwIfNoEntry: false });
    if (!archiveInfo?.isFile() || archiveInfo.size > 512 * 1024 * 1024) return;
    for (const path of [statePath, runtimePath, ownershipPath])
      if (!lstatSync4(path, { throwIfNoEntry: false })?.isFile()) return;
    if (lstatSync4(join5(manager, "pending.json"), { throwIfNoEntry: false })) return;
    const state = json(statePath);
    const current = state.current;
    const runtime = json(runtimePath);
    if (state.owner !== packageName || state.home !== resolve(home) || state.profile !== "desktop" || !current || !isAbsolute3(current.archive ?? "") || relative(current.archive, archive) !== "" || !isAbsolute3(runtime.toolsConfigRoot ?? "") || relative(runtime.toolsConfigRoot, join5(manager, "tool-settings")) !== "" || !isDeepStrictEqual(current.toolSettings, runtime) || hash(readFileSync3(ownershipPath)) !== current.ownershipSHA256 || hash(readFileSync3(archive)) !== current.archiveSHA256)
      return;
    return { root: dirname4(manager), archive, ownershipSHA256: current.ownershipSHA256 };
  } catch {
    return void 0;
  }
}
function normalizeHarnessProfile(profile) {
  return process.platform === "win32" && typeof profile === "string" && profile.toLowerCase() === "desktop" ? "desktop" : profile;
}
async function runHarnessInstall(options2) {
  const { launcher, home, node22, stateRoot, action = "install" } = options2;
  const profile = normalizeHarnessProfile(options2.profile);
  if (!["install", "update", "uninstall", "check"].includes(action))
    throw Error("INSTALL_ACTION_UNSUPPORTED");
  if (!/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,63}$/.test(profile ?? ""))
    throw Error("HARNESS_PROFILE_REQUIRED");
  for (const path of [launcher?.command, home, node22, stateRoot])
    if (typeof path !== "string" || !isAbsolute3(path))
      throw Error("HARNESS_ABSOLUTE_PATH_REQUIRED");
  noLinks(home);
  noLinks(stateRoot);
  if (!Array.isArray(launcher.args) || launcher.args.some((value) => typeof value !== "string"))
    throw Error("HARNESS_LAUNCHER_REQUIRED");
  const profileRoot = join5(home, "profiles", profile);
  if (process.platform !== "win32" || profile !== "desktop")
    return runHarnessProfileInstall(options2, profileRoot);
  assertHarnessDesktopInitialized(home);
  const profileLockPath = join5(profileRoot, ".asam-ui-installer.lock");
  let profileLock;
  try {
    profileLock = openSync(profileLockPath, "wx");
  } catch (error) {
    if (error.code === "EEXIST") throw Error("HARNESS_DESKTOP_INSTALLER_BUSY");
    throw error;
  }
  try {
    return await runHarnessProfileInstall({ ...options2, profile }, profileRoot);
  } finally {
    try {
      closeSync(profileLock);
    } finally {
      unlinkSync2(profileLockPath);
    }
  }
}
async function runHarnessProfileInstall({
  launcher,
  home,
  profile,
  source,
  archive,
  node22,
  stateRoot,
  findPreviousState = false,
  action = "install",
  recoverStore = false,
  signal,
  onStage,
  onProgress,
  onProcess
}, profileRoot) {
  const childEnv = { ...harnessEnvironment(), DSH_HOME: home };
  if (recoverStore) {
    noLinks(join5(home, "profiles", profile));
    assertHarnessRecoveryInput(join5(home, "profiles", profile), childEnv);
  }
  const native2 = async (args, beforeRun) => {
    const operation = args[0] === "--version" ? "version" : args[3];
    const message = {
      version: "\u6B63\u5728\u68C0\u67E5 DeepSeek Harness \u7248\u672C\u2026",
      list: "\u6B63\u5728\u8BFB\u53D6 DeepSeek Harness \u63D2\u4EF6\u767B\u8BB0\u2026",
      add: "\u6B63\u5728\u8C03\u7528 DeepSeek Harness \u5B89\u88C5\u4E13\u5BB6\u2026",
      remove: "\u6B63\u5728\u8C03\u7528 DeepSeek Harness \u5378\u8F7D\u4E13\u5BB6\u2026"
    }[operation];
    if (message) onStage?.({ phase: `harness-${operation}`, message });
    if (profile === "desktop" && (args.includes("add") || args.includes("remove")))
      await requireDesktopClosed(launcher, signal);
    if (recoverStore) assertHarnessRecoveryInput(profileRoot, childEnv);
    beforeRun?.();
    return run(launcher.command, [...launcher.args, ...args], {
      env: childEnv,
      signal,
      onProcess,
      onProgress: args.includes("add") || args.includes("remove") ? onProgress : void 0
    });
  };
  const hostVersion = (await native2(["--version"])).trim();
  if (!supportedHarnessVersions.includes(hostVersion)) throw Error("HARNESS_VERSION_UNSUPPORTED");
  const nodeVersion = (await run(node22, ["--version"], { signal })).trim();
  const [major, minor] = nodeVersion.slice(1).split(".").map(Number);
  if (major !== 22 || minor < 19) throw Error("ASAM_NODE22_REQUIRED");
  if (recoverStore && (process.platform !== "darwin" || profile !== "desktop" || action !== "install"))
    throw Error("HARNESS_STORE_RECOVERY_REQUIRES_MAC_DESKTOP_INSTALL");
  if (profile === "desktop") assertHarnessDesktopInitialized(home);
  if (profile === "desktop" && action !== "check") await requireDesktopClosed(launcher, signal);
  if (existsSync2(join5(profileRoot, "package.json"))) {
    await native2(["plugin", "--profile", profile, "list", "--depth", "0"]);
    const userPatch = join5(profileRoot, "cordis.patch.yml");
    if (existsSync2(userPatch) && /asam-ui-development/.test(readFileSync3(userPatch, "utf8")))
      throw Error("HARNESS_USER_OVERRIDE_CONFLICT_PRESERVED");
  }
  onStage?.({
    phase: "harness-ownership",
    message: "\u6B63\u5728\u6838\u5BF9 DeepSeek Harness \u4E13\u5BB6\u7684\u539F\u5B89\u88C5\u8BB0\u5F55\u2026"
  });
  const target = join5(profileRoot, "node_modules/@asam-ui/dsh-development");
  const previousState = findPreviousState && process.platform === "win32" && profile === "desktop" && action === "uninstall" ? registeredDesktopState(stateRoot, home, profileRoot, target) : void 0;
  const effectiveStateRoot = previousState?.root ?? stateRoot;
  const manager = join5(effectiveStateRoot, profile);
  const recheckPreviousState = () => {
    if (previousState && !isDeepStrictEqual(
      registeredDesktopState(stateRoot, home, profileRoot, target),
      previousState
    ))
      throw Error("HARNESS_UNMANAGED_INSTALLATION_PRESERVED");
  };
  const toolSettings = {
    schemaVersion: 1,
    toolsConfigRoot: join5(manager, "tool-settings"),
    cacheRoot: process.env.ASAM_OCR_CACHE_ROOT || join5(effectiveStateRoot, "ocr"),
    ...process.env.ASAM_OCR_BINARY ? { binary: process.env.ASAM_OCR_BINARY } : {}
  };
  if (existsSync2(manager) && lstatSync4(manager).isSymbolicLink())
    throw Error("HARNESS_STATE_LINK_UNSUPPORTED");
  mkdirSync2(manager, { recursive: true });
  const lockPath = join5(manager, "installer.lock");
  const lock = openSync(lockPath, "wx");
  try {
    recheckPreviousState();
    const storeRecoveryJournal = join5(manager, "store-recovery.json");
    if (existsSync2(storeRecoveryJournal))
      throw Error(`HARNESS_STORE_RECOVERY_MANUAL_REVIEW: ${storeRecoveryJournal}`);
    const statePath = join5(manager, "state.json");
    const pendingPath = join5(manager, "pending.json");
    noLinks(statePath);
    noLinks(pendingPath);
    const before = existsSync2(statePath) ? readFileSync3(statePath) : null;
    const state = before ? JSON.parse(before) : null;
    let pendingBytes = existsSync2(pendingPath) ? readFileSync3(pendingPath) : null;
    let pending = pendingBytes ? JSON.parse(pendingBytes) : null;
    if (recoverStore && (pending || state?.current))
      throw Error("HARNESS_STORE_RECOVERY_REQUIRES_CLEAN_TRANSACTION");
    let committedPending = false;
    if (pending) {
      const rel = relative(manager, pending.incoming?.archive ?? manager);
      if (pending.owner !== packageName || pending.home !== resolve(home) || pending.profile !== profile || !rel || isAbsolute3(rel) || rel === ".." || rel.startsWith(`..${sep}`))
        throw Error("HARNESS_PENDING_CONFLICT_PRESERVED");
      noLinks(pending.incoming.archive);
      if (hash(readFileSync3(pending.incoming.archive)) !== pending.incoming.archiveSHA256)
        throw Error("HARNESS_PENDING_ARCHIVE_CHANGED");
      if (pending.beforeStateSHA256 !== (before ? hash(before) : null)) {
        committedPending = Boolean(
          before && journalWasCommitted(manager, pending, state, before, home, profile)
        );
        if (!committedPending) throw Error("HARNESS_PENDING_CONFLICT_PRESERVED");
      } else if (pending.afterStateSHA256 !== void 0 && pending.afterStateSHA256 !== hash(
        committedStateBytes(home, profile, pending.incoming, state?.current ?? null)
      ))
        throw Error("HARNESS_PENDING_CONFLICT_PRESERVED");
      if (!committedPending && !["install", "update", "check", "uninstall"].includes(action))
        throw Error("HARNESS_RESUME_INSTALL_REQUIRED");
    }
    if (state && (state.owner !== packageName || state.home !== resolve(home) || state.profile !== profile))
      throw Error("HARNESS_STATE_CONFLICT_PRESERVED");
    let installed;
    if (existsSync2(target)) {
      installed = verifyHarnessPackage(realpathSync(target), {
        allowAppleDouble: true,
        archiveRoot: "package"
      });
      const owned = [state?.current, pending?.incoming].filter(Boolean).some(
        (record2) => installed.metadata.version === record2.version && hash(readFileSync3(join5(target, "asam-ownership.json"))) === record2.ownershipSHA256
      );
      if (!owned) throw Error("HARNESS_UNMANAGED_INSTALLATION_PRESERVED");
    }
    if (committedPending) {
      const bundles = json(join5(profileRoot, "package.json")).dsh?.profile?.bundles;
      if (!installed || installed.metadata.version !== pending.incoming.version || hash(readFileSync3(join5(target, "asam-ownership.json"))) !== pending.incoming.ownershipSHA256 || !Array.isArray(bundles) || !bundles.includes(packageName))
        throw Error("HARNESS_PENDING_INSTALLATION_UNPROVEN_PRESERVED");
      if (!readFileSync3(statePath).equals(before)) throw Error("HARNESS_STATE_CHANGED");
      if (!readFileSync3(pendingPath).equals(pendingBytes))
        throw Error("HARNESS_JOURNAL_CHANGED_PRESERVED");
      unlinkSync2(pendingPath);
      pending = null;
      pendingBytes = null;
    }
    if (pending && action === "uninstall") {
      const tar2 = process.platform === "win32" && process.env.SystemRoot ? join5(process.env.SystemRoot, "System32/tar.exe") : "tar";
      const archived2 = JSON.parse(
        await run(tar2, ["-xOf", pending.incoming.archive, "package/package.json"], {
          signal
        })
      );
      const archivedOwnership = await run(
        tar2,
        ["-xOf", pending.incoming.archive, "package/asam-ownership.json"],
        { signal }
      );
      if (archived2.name !== packageName || archived2.version !== pending.incoming.version || hash(Buffer.from(archivedOwnership)) !== pending.incoming.ownershipSHA256)
        throw Error("HARNESS_PENDING_INSTALLATION_UNPROVEN_PRESERVED");
      const bundleList = () => {
        const value = existsSync2(join5(profileRoot, "package.json")) ? json(join5(profileRoot, "package.json")).dsh?.profile?.bundles : [];
        if (value !== void 0 && !Array.isArray(value))
          throw Error("HARNESS_PENDING_INSTALLATION_UNPROVEN_PRESERVED");
        return value || [];
      };
      const hadNative = Boolean(installed || bundleList().includes(packageName));
      if (hadNative) await native2(["plugin", "--profile", profile, "remove", packageName]);
      if (existsSync2(target) || bundleList().includes(packageName))
        throw Error("HARNESS_UNINSTALL_INCOMPLETE");
      const currentState = existsSync2(statePath) ? readFileSync3(statePath) : null;
      if (before === null ? currentState !== null : !currentState?.equals(before))
        throw Error("HARNESS_STATE_CHANGED");
      if (!readFileSync3(pendingPath).equals(pendingBytes))
        throw Error("HARNESS_JOURNAL_CHANGED_PRESERVED");
      const preservedJournal = join5(manager, `pending-before-uninstall-${randomUUID4()}.json`);
      renameSync2(pendingPath, preservedJournal);
      if (before && state.current)
        atomic(
          statePath,
          Buffer.from(
            JSON.stringify({ ...state, current: null, previous: state.current }) + "\n"
          ),
          before
        );
      return {
        status: hadNative ? "removed" : "absent",
        profile,
        preservedJournal,
        preservedArchive: pending.incoming.archive,
        recoveredPending: true
      };
    }
    if (action === "check") {
      const hostMismatch = installed && installed.metadata.engines.dsh !== hostVersion;
      const bundles = existsSync2(join5(profileRoot, "package.json")) ? json(join5(profileRoot, "package.json")).dsh?.profile?.bundles : [];
      return {
        ...pending ? {
          code: "HARNESS_RESUME_INSTALL_REQUIRED",
          recovery: "\u4F7F\u7528\u539F\u56FA\u5B9A\u8F93\u5165\u6062\u590D\uFF0C\u6216\u5378\u8F7D\u5DF2\u6838\u5F52\u5C5E\u7684\u672A\u5B8C\u6210\u5B89\u88C5\uFF1B\u539F\u4E8B\u52A1\u4FDD\u7559\u3002"
        } : hostMismatch ? {
          code: "HARNESS_PACKAGE_HOST_VERSION_MISMATCH",
          message: `\u73B0\u6709\u4E13\u5BB6\u5305\u9002\u914D ${installed.metadata.engines.dsh}\uFF0C\u5F53\u524D\u5BBF\u4E3B\u4E3A ${hostVersion}\u3002\u8BF7\u4F7F\u7528\u5339\u914D\u53D1\u884C\u5347\u7EA7\u4E13\u5BB6\u3002`
        } : {},
        status: pending || hostMismatch ? "partial" : !existsSync2(target) ? "absent" : Array.isArray(bundles) && bundles.includes(packageName) ? "registered" : "installed-not-enabled-or-unknown",
        profile,
        version: state?.current?.version,
        harnessVersion: hostVersion,
        packageHarnessVersion: installed?.metadata.engines.dsh,
        hostCompatibility: !installed ? "absent" : installed.metadata.engines.dsh === hostVersion ? "matched" : "mismatch",
        hostUsability: "\u8BF7\u5728 DeepSeek Harness \u4E2D\u65B0\u5EFA\u5BF9\u8BDD\uFF0C\u8BD5\u7528\u4E13\u5BB6\u6280\u80FD\u548C\u5DE5\u5177\u3002"
      };
    }
    if (action === "uninstall") {
      if (!existsSync2(target)) {
        const bundles = existsSync2(join5(profileRoot, "package.json")) ? json(join5(profileRoot, "package.json")).dsh?.profile?.bundles : [];
        if (Array.isArray(bundles) && bundles.includes(packageName))
          throw Error("HARNESS_UNINSTALL_INCOMPLETE");
        if (state?.current)
          atomic(
            statePath,
            Buffer.from(
              JSON.stringify({ ...state, current: null, previous: state.current }) + "\n"
            ),
            before
          );
        return { status: "absent", profile };
      }
      if (previousState) {
        const tar2 = join5(process.env.SystemRoot || "C:/Windows", "System32/tar.exe");
        const archivedOwnership = await run(
          tar2,
          ["-xOf", previousState.archive, "package/asam-ownership.json"],
          { signal }
        );
        if (hash(Buffer.from(archivedOwnership)) !== previousState.ownershipSHA256)
          throw Error("HARNESS_UNMANAGED_INSTALLATION_PRESERVED");
      }
      await native2(["plugin", "--profile", profile, "remove", packageName], () => {
        if (!previousState) return;
        recheckPreviousState();
        if (!readFileSync3(statePath).equals(before)) throw Error("HARNESS_STATE_CHANGED");
        verifyHarnessPackage(target, { allowAppleDouble: true, archiveRoot: "package" });
      });
      if (existsSync2(target)) throw Error("HARNESS_UNINSTALL_INCOMPLETE");
      atomic(
        statePath,
        Buffer.from(
          JSON.stringify({ ...state, current: null, previous: state.current }) + "\n"
        ),
        before
      );
      return { status: "removed", profile, preservedArchive: state.current.archive };
    }
    let incoming;
    if (pending) {
      if (!isAbsolute3(source ?? "") || !isAbsolute3(archive ?? "") || hash(readFileSync3(join5(source, "asam-ownership.json"))) !== pending.incoming.inputOwnershipSHA256 || hash(readFileSync3(archive)) !== pending.incoming.inputArchiveSHA256 || pending.incoming.node22 !== realpathSync(node22))
        throw Error("HARNESS_RESUME_INPUT_MISMATCH");
      verifyHarnessPackage(source);
      incoming = pending.incoming;
    } else {
      if (!isAbsolute3(source ?? "") || !isAbsolute3(archive ?? ""))
        throw Error("HARNESS_SOURCE_REQUIRED");
      noLinks(source);
      noLinks(archive);
      const accepted = verifyHarnessPackage(source);
      if (accepted.metadata.engines.dsh !== hostVersion)
        throw Error("HARNESS_PACKAGE_HOST_VERSION_MISMATCH");
      const { prepareTool, nativeCandidates } = await import(pathToFileURL(join5(source, "tools/v2/hosts/ocr-tool.mjs")));
      const prepared = await prepareTool({
        cacheRoot: toolSettings.cacheRoot,
        candidates: [
          ...toolSettings.binary ? [toolSettings.binary] : [],
          ...nativeCandidates()
        ],
        downloadTimeoutMs: 6e5,
        allowDownload: process.env.ASAM_INSTALL_ALLOW_DOWNLOAD !== "0",
        preferMirror: true,
        signal,
        onProgress: onStage
      });
      if (prepared.status !== "pass")
        throw Error(`HARNESS_OCR_PREPARATION_${prepared.code || prepared.status}`);
      toolSettings.binary = prepared.binary;
      if (existsSync2(target) && installed.macMetadata.length === 0 && state?.current?.inputOwnershipSHA256 === hash(readFileSync3(join5(source, "asam-ownership.json"))) && state.current.node22 === realpathSync(node22) && JSON.stringify(state.current.toolSettings) === JSON.stringify(toolSettings))
        return { status: "unchanged", profile, version: accepted.metadata.version };
      onStage?.({
        phase: "harness-repack",
        message: "\u6B63\u5728\u6838\u5BF9\u5E76\u51C6\u5907 DeepSeek Harness \u672C\u673A\u5B89\u88C5\u5305\u2026"
      });
      const staging = mkdtempSync2(join5(tmpdir(), "asam-harness-work-"));
      try {
        cpSync(source, join5(staging, "package"), { recursive: true });
        const local = join5(staging, "package");
        const patch = `- insert:
    - id: asam-ui-development
      name: '${packageName}'
      config:
        node: ${JSON.stringify(realpathSync(node22))}
`;
        writeFileSync3(join5(local, "cordis.patch.yml"), patch);
        write(join5(local, "harness-runtime.json"), toolSettings);
        const owner = json(join5(local, "asam-ownership.json"));
        owner.files.find((file2) => file2.path === "cordis.patch.yml").sha256 = hash(
          Buffer.from(patch)
        );
        owner.files.push({
          path: "harness-runtime.json",
          sha256: hash(readFileSync3(join5(local, "harness-runtime.json")))
        });
        owner.files.sort((a, b) => a.path.localeCompare(b.path));
        write(join5(local, "asam-ownership.json"), owner);
        verifyHarnessPackage(local);
        const localArchive = join5(staging, "plugin.tgz");
        const tar2 = process.platform === "win32" && process.env.SystemRoot ? join5(process.env.SystemRoot, "System32/tar.exe") : "tar";
        await run(tar2, ["-czf", localArchive, "-C", staging, "package"], {
          env: { ...process.env, COPYFILE_DISABLE: "1" },
          signal
        });
        const installedReceipt = join5(manager, randomUUID4());
        mkdirSync2(installedReceipt);
        const installedArchive = join5(installedReceipt, "plugin.tgz");
        copyFileSync2(localArchive, installedArchive);
        if (hash(readFileSync3(installedArchive)) !== hash(readFileSync3(localArchive)))
          throw Error("HARNESS_ARCHIVE_COPY_MISMATCH");
        incoming = {
          toolSettings,
          version: accepted.metadata.version,
          node22: realpathSync(node22),
          archive: installedArchive,
          archiveSHA256: hash(readFileSync3(localArchive)),
          inputArchiveSHA256: hash(readFileSync3(archive)),
          inputOwnershipSHA256: hash(readFileSync3(join5(source, "asam-ownership.json"))),
          ownershipSHA256: hash(readFileSync3(join5(local, "asam-ownership.json")))
        };
      } finally {
        try {
          rmSync2(staging, { recursive: true, force: true });
        } catch (error) {
          nativeLog("installer-work-cleanup", [staging])({ error });
        }
      }
    }
    const tar = process.platform === "win32" && process.env.SystemRoot ? join5(process.env.SystemRoot, "System32/tar.exe") : "tar";
    onStage?.({
      phase: "harness-archive",
      message: "\u6B63\u5728\u68C0\u67E5 DeepSeek Harness \u5B89\u88C5\u5305\u7248\u672C\u548C\u5F52\u5C5E\u2026"
    });
    const archived = JSON.parse(
      await run(tar, ["-xOf", incoming.archive, "package/package.json"], { signal })
    );
    if (archived.name !== packageName || archived.version !== incoming.version)
      throw Error("HARNESS_ARCHIVE_IDENTITY_MISMATCH");
    if (archived.engines?.dsh !== hostVersion)
      throw Error("HARNESS_PACKAGE_HOST_VERSION_MISMATCH");
    const committedBytes = committedStateBytes(home, profile, incoming, state?.current ?? null);
    const journalBytes = pendingBytes ?? Buffer.from(
      JSON.stringify(
        {
          owner: packageName,
          home: resolve(home),
          profile,
          beforeStateSHA256: before ? hash(before) : null,
          afterStateSHA256: hash(committedBytes),
          incoming
        },
        null,
        2
      ) + "\n"
    );
    const install = async (verifyStore = () => {
    }, verifyBeforeNative = () => {
    }) => {
      if (!pendingBytes)
        writeFileSync3(pendingPath, journalBytes, { flag: "wx", mode: 384 });
      if (before)
        writeFileSync3(join5(manager, `state-before-${randomUUID4()}.json`), before, {
          flag: "wx",
          mode: 384
        });
      try {
        await native2(
          [
            "plugin",
            "--profile",
            profile,
            "add",
            incoming.archive,
            "--ignore-scripts",
            ...recoverStore ? harnessRecoveryProbeArgs : []
          ],
          verifyBeforeNative
        );
        onStage?.({
          phase: "harness-installed",
          message: "\u6B63\u5728\u6838\u5BF9\u5DF2\u5B89\u88C5\u7684 DeepSeek Harness \u4E13\u5BB6\u6587\u4EF6\u2026"
        });
        installed = verifyHarnessPackage(realpathSync(target), {
          allowAppleDouble: true,
          archiveRoot: "package"
        });
        if (hash(readFileSync3(join5(target, "asam-ownership.json"))) !== incoming.ownershipSHA256)
          throw Error("HARNESS_INSTALLED_HASH_MISMATCH");
        await verifyStore();
      } catch (error) {
        if (!signal?.aborted && state?.current && installed?.metadata.engines.dsh === hostVersion && hash(readFileSync3(state.current.archive)) === state.current.archiveSHA256)
          await native2([
            "plugin",
            "--profile",
            profile,
            "add",
            state.current.archive,
            "--ignore-scripts"
          ]);
        throw error;
      }
      atomic(statePath, committedBytes, before);
      if (!readFileSync3(pendingPath).equals(journalBytes))
        throw Error("HARNESS_JOURNAL_CHANGED_PRESERVED");
      unlinkSync2(pendingPath);
      return {
        status: "registered",
        profile,
        version: incoming.version,
        hostUsability: "pending-real-host-check"
      };
    };
    if (!recoverStore || !existsSync2(join5(profileRoot, "node_modules"))) return await install();
    noLinks(profileRoot);
    await requireDesktopClosed(launcher, signal);
    const app = realpathSync(launcher.command).replace(
      /\/Resources\/runtime\/cli\/bin\/dsh$/,
      ""
    );
    const pnpm = join5(app, "Resources/runtime/primary-runtime/dependencies/pnpm/bin/pnpm.mjs");
    const executable = join5(app, "MacOS/DeepSeek Harness");
    if (!existsSync2(pnpm)) throw Error("HARNESS_STORE_RECOVERY_NATIVE_PNPM_REQUIRED");
    const inspectPnpm = async (...args) => {
      assertHarnessRecoveryInput(profileRoot, childEnv);
      return (await run(
        executable,
        ["--expose-internals", pnpm, ...harnessRecoveryProbeArgs, ...args],
        {
          cwd: profileRoot,
          env: { ...childEnv, ELECTRON_RUN_AS_NODE: "1" },
          signal,
          timeoutMs: 15e3
        }
      )).trim();
    };
    await verifyHarnessRecoveryScope(
      profileRoot,
      childEnv,
      (key) => inspectPnpm("config", "get", key)
    );
    const currentStore = await inspectPnpm("store", "path");
    const inspectBundles = () => inspectHarnessNativeBundles({
      app,
      executable,
      cwd: profileRoot,
      env: childEnv,
      signal
    });
    const nativeBundlesBefore = json(join5(profileRoot, "package.json")).dsh.profile.bundles.length ? await inspectBundles() : void 0;
    await requireDesktopClosed(launcher, signal);
    return await withHarnessStoreRecovery(
      {
        profile: profileRoot,
        manager,
        currentStore,
        env: childEnv,
        nativeBundlesBefore,
        verifyNativeBundles: nativeBundlesBefore ? async () => {
          if (JSON.stringify(await inspectBundles()) !== JSON.stringify(nativeBundlesBefore))
            throw Error("HARNESS_NATIVE_BUNDLE_ORIGIN_CHANGED");
        } : void 0
      },
      install
    );
  } finally {
    closeSync(lock);
    unlinkSync2(lockPath);
  }
}

// ../../../DevCache/workspaces/asam-ui/expert-production-1.0.0-20261120/tools/v2/hosts/host-discovery.mjs
import { existsSync as existsSync4, statSync as statSync2, realpathSync as realpathSync2 } from "node:fs";
import { join as join7, isAbsolute as isAbsolute5 } from "node:path";
import { homedir as homedir4 } from "node:os";
import { spawnSync as spawnSync5 } from "node:child_process";

// ../../../DevCache/workspaces/asam-ui/expert-production-1.0.0-20261120/tools/v2/hosts/workbuddy-app.mjs
import { accessSync, constants as constants3, existsSync as existsSync3, statSync } from "node:fs";
import { basename as basename5, isAbsolute as isAbsolute4, join as join6 } from "node:path";
import { spawnSync as spawnSync4 } from "node:child_process";
function macAppExecutable(app, {
  readExecutable = (plist) => {
    const result = spawnSync4(
      "/usr/libexec/PlistBuddy",
      ["-c", "Print :CFBundleExecutable", plist],
      { encoding: "utf8", timeout: 1e4 }
    );
    if (result.error || result.status !== 0) throw Error("WORKBUDDY_APP_METADATA_INVALID");
    return result.stdout.replace(/\r?\n$/, "");
  }
} = {}) {
  if (typeof app !== "string" || !isAbsolute4(app) || !app.endsWith(".app"))
    throw Error("WORKBUDDY_APP_INVALID");
  const plist = join6(app, "Contents/Info.plist");
  if (!existsSync3(plist) || !statSync(plist).isFile())
    throw Error(`WORKBUDDY_APP_METADATA_MISSING: ${plist}`);
  const name = readExecutable(plist);
  if (typeof name !== "string" || !name || [".", ".."].includes(name) || /[/\\\r\n\0]/.test(name))
    throw Error("WORKBUDDY_APP_METADATA_INVALID");
  const executable = join6(app, "Contents/MacOS", name);
  if (!existsSync3(executable) || !statSync(executable).isFile())
    throw Error(`WORKBUDDY_APP_EXECUTABLE_MISSING: ${executable}`);
  accessSync(executable, constants3.X_OK);
  return executable;
}
function workBuddyExecutable(app, platform = process.platform) {
  if (platform === "darwin") return macAppExecutable(app);
  if (platform !== "win32" || typeof app !== "string" || !isAbsolute4(app) || basename5(app).toLowerCase() !== "workbuddy.exe" || !existsSync3(app) || !statSync(app).isFile())
    throw Error("WORKBUDDY_NOT_INSTALLED");
  return app;
}

// ../../../DevCache/workspaces/asam-ui/expert-production-1.0.0-20261120/tools/v2/hosts/host-discovery.mjs
var file = (path) => {
  try {
    return existsSync4(path) && statSync2(path).isFile();
  } catch {
    return false;
  }
};
function windowsWorkBuddyRegistration(env) {
  if (process.platform !== "win32" || !env.SystemRoot) return [];
  const result = spawnSync5(
    join7(env.SystemRoot, "System32/WindowsPowerShell/v1.0/powershell.exe"),
    [
      "-NoProfile",
      "-NonInteractive",
      "-Command",
      `[Console]::OutputEncoding = [Text.Encoding]::UTF8
$entries = foreach ($hive in 'HKCU:', 'HKLM:') {
	$appPath = Get-Item -LiteralPath ($hive + '\\Software\\Microsoft\\Windows\\CurrentVersion\\App Paths\\WorkBuddy.exe') -ErrorAction SilentlyContinue
	if ($appPath) { @{ kind = 'app'; value = $appPath.GetValue('') } }
	$callback = Get-Item -LiteralPath ($hive + '\\Software\\Classes\\workbuddy\\shell\\open\\command') -ErrorAction SilentlyContinue
	if ($callback) { @{ kind = 'callback'; value = $callback.GetValue('') } }
}
ConvertTo-Json -Compress -InputObject @($entries | Where-Object { $_.value -is [string] })`
    ],
    { encoding: "utf8", windowsHide: true, timeout: 1e4 }
  );
  if (result.error || result.status !== 0) return [];
  try {
    return JSON.parse(result.stdout);
  } catch {
    return [];
  }
}
function findWorkBuddyApps({
  platform = process.platform,
  home = homedir4(),
  env = process.env,
  roots,
  registrations = !roots && platform === "win32" ? windowsWorkBuddyRegistration(env) : [],
  validateApp = workBuddyExecutable
} = {}) {
  const directories = roots || (platform === "darwin" ? ["/Applications/WorkBuddy.app", join7(home, "Applications/WorkBuddy.app")] : platform === "win32" ? [
    env.LOCALAPPDATA && join7(env.LOCALAPPDATA, "Programs/WorkBuddy"),
    env.LOCALAPPDATA && join7(env.LOCALAPPDATA, "WorkBuddy"),
    env.ProgramFiles && join7(env.ProgramFiles, "WorkBuddy"),
    env["ProgramFiles(x86)"] && join7(env["ProgramFiles(x86)"], "WorkBuddy")
  ].filter(Boolean) : []);
  const candidates = directories.filter(isAbsolute5).map((root) => platform === "win32" ? join7(root, "WorkBuddy.exe") : root);
  if (platform === "win32") {
    for (const { kind, value } of registrations) {
      if (typeof value !== "string" || /[\r\n\0]/.test(value)) continue;
      const entry = value.trim();
      if (kind === "app") candidates.push(entry.replace(/^"([^"]+)"$/, "$1"));
      if (kind === "callback") {
        const match = /^(?:"([^"]+)"|([^"]+?))\s+(?:"%1"|%1)$/.exec(entry);
        if (match) candidates.push(match[1] ?? match[2]);
      }
    }
  }
  const matches = /* @__PURE__ */ new Map();
  for (const candidate of candidates) {
    try {
      validateApp(candidate, platform);
      const path = realpathSync2(candidate);
      matches.set(platform === "win32" ? path.toLowerCase() : path, path);
    } catch {
    }
  }
  return [...matches.values()];
}
function detectDesktopLauncher({
  platform = process.platform,
  home = homedir4(),
  env = process.env,
  roots
} = {}) {
  if (!["darwin", "win32"].includes(platform)) return void 0;
  const candidates = roots || (platform === "darwin" ? ["/Applications", join7(home, "Applications")].flatMap(
    (root) => ["DeepSeek Harness.app", "DeepSeek-Harness.app"].map((name) => join7(root, name))
  ) : platform === "win32" ? [
    env.ProgramFiles,
    env["ProgramFiles(x86)"],
    env.LOCALAPPDATA && join7(env.LOCALAPPDATA, "Programs")
  ].filter(Boolean).flatMap(
    (root) => ["DeepSeek-Harness", "DeepSeek Harness"].map((name) => join7(root, name))
  ) : []);
  const matches = candidates.filter(isAbsolute5).flatMap((root) => {
    const executable = platform === "darwin" ? join7(root, "Contents/MacOS/DeepSeek Harness") : join7(root, "DeepSeek Harness.exe");
    const command = platform === "darwin" ? join7(root, "Contents/Resources/runtime/cli/bin/dsh") : join7(root, "resources/runtime/cli/bin/dsh.cmd");
    return file(executable) && file(command) ? [realpathSync2(command)] : [];
  });
  const unique = [...new Set(matches)];
  return unique.length === 1 ? unique[0] : void 0;
}
function detectMacCodex({
  home = homedir4(),
  roots = ["/Applications", join7(home, "Applications")]
} = {}) {
  const matches = roots.flatMap(
    (root) => ["codex", "bin/codex"].map((entry) => join7(root, "Codex.app/Contents/Resources", entry))
  ).filter(file).map((path) => realpathSync2(path));
  const unique = [...new Set(matches)];
  return unique.length === 1 ? unique[0] : void 0;
}

// ../../../DevCache/workspaces/asam-ui/expert-production-1.0.0-20261120/tools/v2/hosts/installation-choice.mjs
import { existsSync as existsSync5, readFileSync as readFileSync5 } from "node:fs";
import { join as join9 } from "node:path";

// ../../../DevCache/workspaces/asam-ui/expert-production-1.0.0-20261120/tools/v2/hosts/files.mjs
import { mkdirSync as mkdirSync3, readFileSync as readFileSync4, readdirSync as readdirSync3, writeFileSync as writeFileSync4, lstatSync as lstatSync5 } from "node:fs";
import { dirname as dirname5, join as join8, isAbsolute as isAbsolute6, resolve as resolve2 } from "node:path";
import { createHash as createHash5 } from "node:crypto";
var sha = (bytes2) => createHash5("sha256").update(bytes2).digest("hex");
var json2 = (file2) => JSON.parse(readFileSync4(file2, "utf8"));
function assertNoLinks(path) {
  if (!isAbsolute6(path)) throw Error("ABSOLUTE_PATH_REQUIRED");
  for (let current = resolve2(path); ; current = dirname5(current)) {
    try {
      if (lstatSync5(current).isSymbolicLink()) throw Error("SYMLINK_NOT_ALLOWED");
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
    if (current === dirname5(current)) break;
  }
}
function write2(file2, data) {
  mkdirSync3(dirname5(file2), { recursive: true });
  writeFileSync4(
    file2,
    typeof data === "string" || Buffer.isBuffer(data) ? data : JSON.stringify(data, null, "	") + "\n"
  );
}
function inventory(directory, prefix = "") {
  return readdirSync3(join8(directory, prefix), { withFileTypes: true }).flatMap((entry) => {
    const path = [prefix, entry.name].filter(Boolean).join("/");
    if (entry.isSymbolicLink()) throw new Error("SYMLINK_NOT_ALLOWED");
    return entry.isDirectory() ? inventory(directory, path) : [{ path, sha256: sha(readFileSync4(join8(directory, path))) }];
  }).sort((a, b) => a.path.localeCompare(b.path));
}

// ../../../DevCache/workspaces/asam-ui/expert-production-1.0.0-20261120/tools/v2/hosts/installation-choice.mjs
var expert = "asam-ui-development";
var harnessPackage = "@asam-ui/dsh-development";
var pattern = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-([0-9A-Za-z.-]+))?(?:\+[0-9A-Za-z.-]+)?$/;
var expertVersion = (value) => typeof value === "string" && value.length <= 100 && pattern.test(value) ? value : null;
function read(path) {
  try {
    return JSON.parse(readFileSync5(path, "utf8").replace(/^\uFEFF/, ""));
  } catch (error) {
    if (error.code === "ENOENT" || error instanceof SyntaxError) return null;
    throw error;
  }
}
function packageVersion(base, host) {
  const metadata = read(
    join9(
      base,
      host === "harness" ? "package.json" : `.${host === "codex" ? "codex" : "codebuddy"}-plugin/plugin.json`
    )
  );
  return metadata?.name === (host === "harness" ? harnessPackage : expert) ? expertVersion(metadata.version) : null;
}
function installedExpert({ host, configRoot, home, profile, codexInstalled }) {
  if (host === "codex") {
    const selected = codexInstalled.filter(
      (item) => item.pluginId === `${expert}@asam-ui-local`
    );
    if (selected.length > 1) throw Error("CODEX_MULTIPLE_INSTALLATIONS");
    return { installed: selected.length === 1, version: expertVersion(selected[0]?.version) };
  }
  if (host === "harness") {
    if (!/^[-a-zA-Z0-9_]{1,80}$/.test(profile || "")) throw Error("INVALID_PROFILE");
    const root = join9(home, "profiles", profile);
    assertNoLinks(root);
    const target2 = join9(root, "node_modules/@asam-ui/dsh-development");
    const metadata = read(join9(root, "package.json"));
    return {
      installed: existsSync5(target2) || Array.isArray(metadata?.dsh?.profile?.bundles) && metadata.dsh.profile.bundles.includes(harnessPackage) || typeof metadata?.dependencies?.[harnessPackage] === "string",
      version: packageVersion(target2, host)
    };
  }
  assertNoLinks(configRoot);
  const target = join9(configRoot, "plugins/marketplaces/my-experts/plugins", expert);
  assertNoLinks(target);
  const path = join9(configRoot, "mcp.json");
  assertNoLinks(path);
  const config = read(path);
  return {
    installed: existsSync5(target) || Object.hasOwn(config?.mcpServers || {}, "asam-ui"),
    version: packageVersion(target, "workbuddy")
  };
}
function compareExpertVersions(left, right) {
  const a = expertVersion(left)?.match(pattern), b = expertVersion(right)?.match(pattern);
  if (!a || !b) return null;
  for (let index = 1; index <= 3; index++) {
    const x2 = BigInt(a[index]), y2 = BigInt(b[index]);
    if (x2 !== y2) return x2 > y2 ? 1 : -1;
  }
  if (a[4] === b[4]) return 0;
  if (!a[4] || !b[4]) return a[4] ? -1 : 1;
  const x = a[4].split("."), y = b[4].split(".");
  for (let index = 0; index < Math.max(x.length, y.length); index++) {
    if (x[index] === y[index]) continue;
    if (x[index] === void 0 || y[index] === void 0)
      return x[index] === void 0 ? -1 : 1;
    const numericX = /^\d+$/.test(x[index]), numericY = /^\d+$/.test(y[index]);
    if (numericX && numericY) {
      if (BigInt(x[index]) === BigInt(y[index])) continue;
      return BigInt(x[index]) > BigInt(y[index]) ? 1 : -1;
    }
    if (numericX !== numericY) return numericX ? -1 : 1;
    return x[index] > y[index] ? 1 : -1;
  }
  return 0;
}
async function chooseExpertAction({
  current,
  targetVersion,
  requested,
  ask,
  expertLabel = "",
  actionPrompt = "\u8BF7\u8F93\u5165\u7F16\u53F7\uFF1A",
  write: write3 = console.log
}) {
  const versions = [
    `${expertLabel}\u5DF2\u5B89\u88C5\u7248\u672C\uFF1A${current.installed ? current.version || "\u672A\u77E5" : "\u672A\u5B89\u88C5"}`,
    `${expertLabel}\u76EE\u6807\u7248\u672C\uFF1A${targetVersion || "\u672A\u77E5"}`
  ];
  if (["check", "uninstall", "cancel"].includes(requested) || !current.installed) {
    for (const line of versions) write3(line);
    return ["check", "uninstall", "cancel"].includes(requested) ? requested : "install";
  }
  const downgrade = compareExpertVersions(current.version, targetVersion) === 1;
  if (requested === "update") {
    for (const line of versions) write3(line);
    if (downgrade) throw Error("EXPERT_DOWNGRADE_UNSUPPORTED");
    return "update";
  }
  const options2 = downgrade ? ["\u76EE\u6807\u7248\u672C\u4F4E\u4E8E\u5DF2\u5B89\u88C5\u7248\u672C\uFF0C\u4E0D\u652F\u6301\u964D\u7EA7\u3002", "1. \u5378\u8F7D", "2. \u53D6\u6D88\uFF08\u9ED8\u8BA4\uFF09"] : ["\u8BF7\u9009\u62E9\u64CD\u4F5C\uFF1A", "1. \u5347\u7EA7", "2. \u53D6\u6D88\uFF08\u9ED8\u8BA4\uFF09", "3. \u5378\u8F7D"];
  const choice = await ask([...versions, ...options2, actionPrompt].join("\n"));
  if (!choice || choice === "2") return "cancel";
  if (downgrade && choice === "1") return "uninstall";
  if (!downgrade && choice === "1") return "update";
  if (!downgrade && choice === "3") return "uninstall";
  throw Error("INVALID_INSTALL_SELECTION");
}

// ../../../DevCache/workspaces/asam-ui/expert-production-1.0.0-20261120/tools/v2/hosts/workbuddy-upgrade.mjs
import {
  existsSync as existsSync10,
  readFileSync as readFileSync10,
  writeFileSync as writeFileSync8,
  renameSync as renameSync6,
  unlinkSync as unlinkSync6,
  openSync as openSync4,
  closeSync as closeSync4
} from "node:fs";
import { join as join14, isAbsolute as isAbsolute10, basename as basename6 } from "node:path";
import { pathToFileURL as pathToFileURL2 } from "node:url";
import { randomUUID as randomUUID8, createHash as createHash6 } from "node:crypto";
import { isDeepStrictEqual as equal } from "node:util";

// ../../../DevCache/workspaces/asam-ui/expert-production-1.0.0-20261120/tools/v2/hosts/workbuddy-install.mjs
import {
  existsSync as existsSync9,
  readFileSync as readFileSync9,
  mkdirSync as mkdirSync7,
  renameSync as renameSync5,
  openSync as openSync3,
  closeSync as closeSync3,
  unlinkSync as unlinkSync5,
  writeFileSync as writeFileSync7
} from "node:fs";
import { dirname as dirname8, isAbsolute as isAbsolute9, join as join13, relative as relative2, resolve as resolve6 } from "node:path";
import { homedir as homedir6 } from "node:os";
import { randomUUID as randomUUID7 } from "node:crypto";

// ../../../DevCache/workspaces/asam-ui/expert-production-1.0.0-20261120/tools/v2/hosts/lifecycle.mjs
import {
  cpSync as cpSync2,
  existsSync as existsSync6,
  lstatSync as lstatSync6,
  mkdirSync as mkdirSync4,
  readFileSync as readFileSync6,
  renameSync as renameSync3,
  rmSync as rmSync3
} from "node:fs";
import { dirname as dirname6, isAbsolute as isAbsolute7, join as join10, resolve as resolve3 } from "node:path";
function entryStat(path) {
  try {
    return lstatSync6(path);
  } catch (error) {
    if (error.code === "ENOENT") return null;
    throw error;
  }
}
function verify(directory, { allowWorkBuddyUsageMarkers = false } = {}) {
  if (entryStat(directory)?.isSymbolicLink()) throw new Error("SYMLINK_NOT_ALLOWED");
  const receipt = json2(join10(directory, "ownership.json"));
  if (receipt.schemaVersion !== 1 || receipt.owner !== "asam-ui-development" || !["codex", "workbuddy"].includes(receipt.host))
    throw new Error("UNKNOWN_OWNER");
  const expected = receipt.files;
  const actual = inventory(directory).filter(
    (file2) => file2.path !== "ownership.json" && !(allowWorkBuddyUsageMarkers && receipt.host === "workbuddy" && file2.path.startsWith(".in_use/"))
  );
  if (!Array.isArray(expected)) throw new Error("UNKNOWN_OWNER");
  const before = new Map(expected.map((file2) => [file2.path, file2.sha256]));
  if (expected.length > 1e4 || before.size !== expected.length || expected.some(
    (file2) => typeof file2.path !== "string" || !file2.path || isAbsolute7(file2.path) || file2.path.includes("\\") || file2.path.split("/").some((part) => !part || part === ".." || part === ".") || file2.path === "ownership.json" || !/^[a-f0-9]{64}$/.test(file2.sha256)
  ))
    throw new Error("UNKNOWN_OWNER");
  const after = new Map(actual.map((file2) => [file2.path, file2.sha256]));
  const paths2 = [.../* @__PURE__ */ new Set([...before.keys(), ...after.keys()])].filter((path) => before.get(path) !== after.get(path)).sort();
  if (paths2.length) {
    const error = new Error("MODIFIED_CONTENT");
    error.paths = paths2;
    throw error;
  }
  return receipt;
}
if (false) {
  try {
    const [action, slot, source] = process.argv.slice(2);
    const operations = {
      install: () => install(source, slot),
      uninstall: () => uninstall(slot),
      rollback: () => rollback(slot),
      disable: () => setEnabled(slot, false),
      enable: () => setEnabled(slot, true),
      resume: () => recover(slot, "resume"),
      cancel: () => recover(slot, "cancel")
    };
    if (!operations[action]) throw new Error("ACTION_UNSUPPORTED");
    console.log(JSON.stringify(operations[action]()));
  } catch (error) {
    console.error(
      JSON.stringify({
        status: "fail",
        code: error.message,
        slot: process.argv[3],
        preservedPaths: error.paths
      })
    );
    process.exitCode = 1;
  }
}

// ../../../DevCache/workspaces/asam-ui/expert-production-1.0.0-20261120/tools/v2/hosts/workbuddy-mcp.mjs
import {
  existsSync as existsSync7,
  readFileSync as readFileSync7,
  realpathSync as realpathSync3,
  mkdirSync as mkdirSync5,
  openSync as openSync2,
  closeSync as closeSync2,
  writeFileSync as writeFileSync5,
  renameSync as renameSync4,
  unlinkSync as unlinkSync3
} from "node:fs";
import { dirname as dirname7, isAbsolute as isAbsolute8, join as join11, resolve as resolve4 } from "node:path";
import { homedir as homedir5 } from "node:os";
import { randomUUID as randomUUID5 } from "node:crypto";
import { isDeepStrictEqual as isDeepStrictEqual2 } from "node:util";
var record = (value) => value && typeof value === "object" && !Array.isArray(value);
var bytesAt = (path) => existsSync7(path) ? readFileSync7(path) : null;
var sameBytes2 = (left, right) => left === null ? right === null : right !== null && left.equals(right);
function mcpOwnership(configRoot, previous) {
  const path = join11(configRoot, "mcp.json.asam-ui-owner.json");
  assertNoLinks(path);
  const before = bytesAt(path);
  let value = null;
  try {
    value = before ? JSON.parse(before.toString("utf8")) : null;
  } catch {
    throw Error("ASAM_MCP_ENTRY_CONFLICT");
  }
  if (before && !record(value)) throw Error("ASAM_MCP_ENTRY_CONFLICT");
  if (value && (value.schema !== "asam-ui/mcp-owner@1" || !isAbsolute8(value.base || "") || !/^[a-f0-9]{64}$/.test(value.ownershipSHA256 || "") || !record(value.server) || !isAbsolute8(value.server.command || "") || !isDeepStrictEqual2(value.server.args, [join11(value.base, "runtime/mcp-entry.mjs")]) || !isDeepStrictEqual2(value.server.env, { ASAM_AGENT_VALIDATION: "1" }) || Object.keys(value.server).some((key) => !["command", "args", "env"].includes(key)) || previous !== void 0 && !isDeepStrictEqual2(previous, value.server)))
    throw Error("ASAM_MCP_ENTRY_CONFLICT");
  return { path, before, value };
}
function mcpConfiguration(base, command = process.execPath) {
  if (!isAbsolute8(base) || !isAbsolute8(command)) throw Error("ABSOLUTE_PATH_REQUIRED");
  assertNoLinks(base);
  command = realpathSync3(command);
  assertNoLinks(command);
  if (verify(base).host !== "workbuddy") throw Error("WORKBUDDY_PACKAGE_REQUIRED");
  const descriptor = json2(join11(base, "mcpServer.json"));
  if (descriptor.schema !== "asam-ui/mcp-install@1" || descriptor.serverName !== "asam-ui" || descriptor.transport.command !== "node" || JSON.stringify(descriptor.transport.args) !== JSON.stringify(["{{EXPERT_ROOT}}/runtime/mcp-entry.mjs"]) || JSON.stringify(descriptor.transport.env) !== JSON.stringify({ ASAM_AGENT_VALIDATION: "1" }))
    throw Error("MCP_DESCRIPTOR_MISMATCH");
  return {
    command,
    args: [join11(resolve4(base), "runtime/mcp-entry.mjs")],
    env: { ASAM_AGENT_VALIDATION: "1" }
  };
}
function installMcp({
  base,
  configRoot = process.env.WORKBUDDY_CONFIG_DIR || join11(homedir5(), ".workbuddy"),
  command = process.execPath,
  apply = false
} = {}) {
  if (!isAbsolute8(configRoot) || typeof apply !== "boolean") throw Error("INVALID_INSTALL_INPUT");
  const server = mcpConfiguration(base, command);
  const target = join11(configRoot, "mcp.json");
  assertNoLinks(target);
  const before = existsSync7(target) ? readFileSync7(target) : null;
  const value = before ? JSON.parse(before.toString("utf8").replace(/^\uFEFF/, "")) : {};
  if (!record(value) || value.mcpServers !== void 0 && !record(value.mcpServers))
    throw Error("INVALID_MCP_CONFIG");
  const previous = value.mcpServers?.["asam-ui"];
  const ownership = mcpOwnership(configRoot, previous);
  const installedBase = join11(
    configRoot,
    "plugins/marketplaces/my-experts/plugins/asam-ui-development"
  );
  const managedBases = [resolve4(base), resolve4(installedBase)];
  let managed = isDeepStrictEqual2(previous, server);
  if (previous !== void 0 && !managed) {
    if (ownership.value && managedBases.includes(ownership.value.base)) {
      verify(ownership.value.base);
      managed = true;
    } else if (existsSync7(installedBase)) {
      managed = isDeepStrictEqual2(previous, mcpConfiguration(installedBase, command));
    }
    if (!managed) throw Error("ASAM_MCP_ENTRY_CONFLICT");
  }
  const unchanged = isDeepStrictEqual2(previous, server);
  const owner = {
    schema: "asam-ui/mcp-owner@1",
    base: resolve4(base),
    ownershipSHA256: sha(readFileSync7(join11(base, "ownership.json"))),
    server
  };
  const ownerBytes = Buffer.from(JSON.stringify(owner, null, "	") + "\n");
  if (unchanged && (!apply || sameBytes2(ownership.before, ownerBytes)))
    return { status: "unchanged", target };
  const plan = {
    status: "planned",
    target,
    service: "asam-ui",
    operation: previous === void 0 ? "add" : "update",
    server,
    trust: "user-action-required-if-host-requests"
  };
  if (!apply) return plan;
  mkdirSync5(configRoot, { recursive: true });
  const lock = `${target}.asam-install.lock`;
  assertNoLinks(lock);
  const fd = openSync2(lock, "wx");
  const suffix = randomUUID5();
  const temporary = `${target}.asam-incoming-${suffix}`;
  const ownerTemporary = `${ownership.path}.asam-incoming-${suffix}`;
  const backup = before ? `${target}.asam-backup-${suffix}` : null;
  const ownerBackup = ownership.before ? `${ownership.path}.asam-backup-${suffix}` : null;
  let written = false;
  let encoded;
  try {
    const current = existsSync7(target) ? readFileSync7(target) : null;
    if (before === null ? current !== null : current === null || !before.equals(current))
      throw Error("MCP_CONFIG_CHANGED");
    if (!sameBytes2(ownership.before, bytesAt(ownership.path)))
      throw Error("MCP_CONFIG_CHANGED");
    if (backup) writeFileSync5(backup, before, { flag: "wx", mode: 384 });
    if (ownerBackup) writeFileSync5(ownerBackup, ownership.before, { flag: "wx", mode: 384 });
    value.mcpServers ??= {};
    value.mcpServers["asam-ui"] = server;
    encoded = unchanged ? before : Buffer.from(JSON.stringify(value, null, "	") + "\n");
    writeFileSync5(temporary, encoded, {
      flag: "wx",
      mode: 384
    });
    writeFileSync5(ownerTemporary, ownerBytes, { flag: "wx", mode: 384 });
    const latest = existsSync7(target) ? readFileSync7(target) : null;
    if (before === null ? latest !== null : latest === null || !before.equals(latest))
      throw Error("MCP_CONFIG_CHANGED");
    if (!sameBytes2(ownership.before, bytesAt(ownership.path)))
      throw Error("MCP_CONFIG_CHANGED");
    if (!unchanged) {
      renameSync4(temporary, target);
      written = true;
    }
    renameSync4(ownerTemporary, ownership.path);
    return {
      ...plan,
      status: unchanged ? "unchanged" : "installed",
      backup,
      ownerBackup,
      previousSHA256: before && sha(before),
      restartRequired: true
    };
  } catch (error) {
    if (written && sameBytes2(encoded, bytesAt(target))) {
      if (before) {
        writeFileSync5(temporary, before, { flag: "wx", mode: 384 });
        renameSync4(temporary, target);
      } else unlinkSync3(target);
    }
    throw error;
  } finally {
    if (existsSync7(temporary)) unlinkSync3(temporary);
    if (existsSync7(ownerTemporary)) unlinkSync3(ownerTemporary);
    closeSync2(fd);
    unlinkSync3(lock);
  }
}
if (false) {
  try {
    const [configRoot, action] = process.argv.slice(2);
    if (action !== void 0 && action !== "--apply") throw Error("EXPECTED_APPLY_FLAG");
    console.log(
      JSON.stringify(
        installMcp({
          base: resolve4(dirname7(fileURLToPath(import.meta.url)), "../../.."),
          configRoot,
          apply: action === "--apply"
        })
      )
    );
  } catch (error) {
    console.log(
      JSON.stringify({
        status: "partial",
        code: error.code || error.message,
        action: "\u4FDD\u7559\u539F\u914D\u7F6E\uFF0C\u6838\u5BF9\u660E\u786E\u5B89\u88C5\u76EE\u5F55\u548C\u51B2\u7A81\u540E\u91CD\u8BD5"
      })
    );
    process.exitCode = 2;
  }
}

// ../../../DevCache/workspaces/asam-ui/expert-production-1.0.0-20261120/tools/v2/hosts/workbuddy-cache.mjs
import {
  existsSync as existsSync8,
  lstatSync as lstatSync7,
  readFileSync as readFileSync8,
  readdirSync as readdirSync4,
  mkdirSync as mkdirSync6,
  rmdirSync,
  unlinkSync as unlinkSync4,
  writeFileSync as writeFileSync6,
  realpathSync as realpathSync4
} from "node:fs";
import { join as join12, resolve as resolve5 } from "node:path";
import { tmpdir as tmpdir2 } from "node:os";
import { randomUUID as randomUUID6 } from "node:crypto";
var pluginId = "asam-ui-development@my-experts";
var object = (value) => value && typeof value === "object" && !Array.isArray(value);
var versionSegment = (value) => typeof value === "string" && /^[a-zA-Z0-9][a-zA-Z0-9._+-]{0,99}$/.test(value);
var cacheVersion = (value) => value.replaceAll("+", "-");
function planWorkBuddyCache({ source, configRoot, readOnly = false }) {
  const path = join12(configRoot, "plugins/installed_plugins.json");
  assertNoLinks(path);
  if (!existsSync8(path)) return null;
  const before = readFileSync8(path);
  const registry = JSON.parse(before.toString("utf8").replace(/^\uFEFF/, ""));
  if (!object(registry) || !object(registry.plugins))
    throw Error("WORKBUDDY_CACHE_REGISTRY_CONFLICT");
  const records = registry.plugins[pluginId];
  if (records === void 0) return null;
  if (!Array.isArray(records) || records.some((record3) => !object(record3)))
    throw Error("WORKBUDDY_CACHE_REGISTRY_CONFLICT");
  if (records.length === 0) return null;
  const users = records.filter((record3) => record3.scope === "user");
  if (users.length !== 1 || records.some((record3) => record3.scope === "managed"))
    throw Error("WORKBUDDY_CACHE_SCOPE_CONFLICT");
  const record2 = users[0];
  const metadata = JSON.parse(readFileSync8(join12(source, ".codebuddy-plugin/plugin.json")));
  if (metadata.name !== "asam-ui-development" || !versionSegment(metadata.version))
    throw Error("WORKBUDDY_CACHE_VERSION_CONFLICT");
  const root = join12(configRoot, "plugins/cache/my-experts/asam-ui-development");
  if (!versionSegment(record2.version) || typeof record2.installPath !== "string" || resolve5(record2.installPath) !== join12(root, cacheVersion(record2.version)))
    throw Error("WORKBUDDY_CACHE_PATH_CONFLICT");
  const previous = join12(root, cacheVersion(record2.version));
  const target = join12(root, cacheVersion(metadata.version));
  const snapshots = [];
  for (const slot of /* @__PURE__ */ new Set([previous, target])) {
    assertNoLinks(slot);
    if (!existsSync8(slot)) continue;
    if (!readOnly) assertCacheIdle(slot);
    if (verify(slot, { allowWorkBuddyUsageMarkers: readOnly }).host !== "workbuddy")
      throw Error("WORKBUDDY_CACHE_OWNER_CONFLICT");
    const installed = JSON.parse(readFileSync8(join12(slot, ".codebuddy-plugin/plugin.json")));
    if (installed.name !== metadata.name || !versionSegment(installed.version) || join12(root, cacheVersion(installed.version)) !== slot)
      throw Error("WORKBUDDY_CACHE_VERSION_CONFLICT");
    snapshots.push({
      path: slot,
      ownershipSHA256: sha(readFileSync8(join12(slot, "ownership.json")))
    });
  }
  const same2 = existsSync8(target) && readFileSync8(join12(target, "ownership.json")).equals(
    readFileSync8(join12(source, "ownership.json"))
  );
  const updated = { ...record2, installPath: target, version: metadata.version };
  if (Object.hasOwn(record2, "resolvedVersion")) updated.resolvedVersion = metadata.version;
  registry.plugins[pluginId] = records.map((item) => item === record2 ? updated : item);
  const unchanged = JSON.stringify(record2) === JSON.stringify(updated);
  return {
    path,
    before,
    after: unchanged ? before : Buffer.from(JSON.stringify(registry, null, "	") + "\n"),
    target,
    previous,
    root: join12(configRoot, "plugins/cache"),
    same: same2,
    snapshots
  };
}
function assertWorkBuddyCacheUnchanged(cache) {
  assertNoLinks(cache.path);
  if (!readFileSync8(cache.path).equals(cache.before)) throw Error("EXPERT_REGISTRY_CHANGED");
  for (const snapshot of cache.snapshots) {
    assertNoLinks(snapshot.path);
    assertCacheIdle(snapshot.path);
    verify(snapshot.path);
    if (sha(readFileSync8(join12(snapshot.path, "ownership.json"))) !== snapshot.ownershipSHA256)
      throw Error("EXPERT_SOURCE_CHANGED");
  }
  if (!cache.snapshots.some((entry) => entry.path === cache.target) && existsSync8(cache.target))
    throw Error("EXPERT_SOURCE_CHANGED");
}
function assertCacheIdle(slot) {
  const markers = join12(slot, ".in_use");
  assertNoLinks(markers);
  if (!existsSync8(markers)) return;
  const entries = readdirSync4(markers);
  if (!entries.length) return;
  const groups = { active: [], stale: [], unknown: 0 };
  for (const entry of entries) {
    const status = workBuddyUsageStatus(markers, entry);
    if (status === "unknown") groups.unknown++;
    else groups[status].push(entry);
  }
  const detail = [
    groups.active.length && `\u6D3B\u8DC3 PID ${groups.active.join(", ")}`,
    groups.stale.length && `PID \u5DF2\u4E0D\u5B58\u5728 ${groups.stale.join(", ")}`,
    groups.unknown && `\u65E0\u6CD5\u6838\u5B9E ${groups.unknown} \u4E2A\u6807\u8BB0`
  ].filter(Boolean).join("\uFF1B");
  throw Error(`WORKBUDDY_CACHE_IN_USE: ${detail}`);
}
function workBuddyUsageStatus(markers, entry) {
  if (!/^[1-9][0-9]{0,9}$/.test(entry)) return "unknown";
  const pid = Number(entry);
  if (pid > 2147483647) return "unknown";
  try {
    const path = join12(markers, entry);
    const stat = lstatSync7(path);
    if (!stat.isFile() || stat.size > 1024) return "unknown";
    if (JSON.parse(readFileSync8(path, "utf8")).pid !== pid) return "unknown";
  } catch {
    return "unknown";
  }
  try {
    process.kill(pid, 0);
    return "active";
  } catch (error) {
    return error.code === "ESRCH" ? "stale" : "unknown";
  }
}
function lockWorkBuddyCache(cache) {
  const locks = [];
  const release = () => {
    for (const { path, token } of locks.reverse()) {
      const record2 = join12(path, "lock.json");
      assertNoLinks(record2);
      if (JSON.parse(readFileSync8(record2)).lockId !== token)
        throw Error("WORKBUDDY_CACHE_LOCK_CHANGED");
      unlinkSync4(record2);
      rmdirSync(path);
    }
  };
  try {
    const names = [.../* @__PURE__ */ new Set([cache.root, cache.target])].sort().map((path) => `kylin-plugin-cache-${sha(resolve5(path)).slice(0, 16)}`);
    names.push(`installed-plugins-registry-${sha(resolve5(cache.path)).slice(0, 16)}`);
    for (const name of names) {
      const path = join12(realpathSync4(tmpdir2()), `${name}.lock`);
      assertNoLinks(path);
      try {
        mkdirSync6(path);
      } catch (error) {
        if (error.code === "EEXIST") throw Error("WORKBUDDY_CACHE_BUSY");
        throw error;
      }
      const token = randomUUID6();
      try {
        writeFileSync6(
          join12(path, "lock.json"),
          JSON.stringify({ lockId: token, pid: process.pid, timestamp: Date.now() }),
          { flag: "wx", mode: 384 }
        );
      } catch (error) {
        rmdirSync(path);
        throw error;
      }
      locks.push({ path, token });
    }
    return release;
  } catch (error) {
    release();
    throw error;
  }
}

// ../../../DevCache/workspaces/asam-ui/expert-production-1.0.0-20261120/tools/v2/hosts/workbuddy-install.mjs
var id = "asam-ui-development";
var outside = (root, path) => {
  const rel = relative2(root, path);
  return isAbsolute9(rel) || rel === ".." || rel.startsWith("..\\") || rel.startsWith("../");
};
var object2 = (value) => value && typeof value === "object" && !Array.isArray(value);
function copy(source, target) {
  for (const file2 of inventory(source))
    write2(join13(target, file2.path), readFileSync9(join13(source, file2.path)));
  verify(target);
}
function replaceRegistry(path, bytes2) {
  assertNoLinks(path);
  mkdirSync7(dirname8(path), { recursive: true });
  const temporary = `${path}.asam-incoming-${randomUUID7()}`;
  writeFileSync7(temporary, bytes2, { flag: "wx", mode: 384 });
  try {
    renameSync5(temporary, path);
  } finally {
    if (existsSync9(temporary)) unlinkSync5(temporary);
  }
}
function installExpert({
  source,
  configRoot = process.env.WORKBUDDY_CONFIG_DIR || join13(homedir6(), ".workbuddy"),
  userId,
  apply = false
} = {}, { lockCache = lockWorkBuddyCache } = {}) {
  if (!isAbsolute9(source) || !isAbsolute9(configRoot) || typeof apply !== "boolean" || !/^[-a-zA-Z0-9_]{1,100}$/.test(userId || ""))
    throw Error("EXPLICIT_INSTALL_INPUT_REQUIRED");
  source = resolve6(source);
  configRoot = resolve6(configRoot);
  assertNoLinks(source);
  assertNoLinks(configRoot);
  if (!outside(source, configRoot) || !outside(configRoot, source))
    throw Error("SEPARATE_SOURCE_REQUIRED");
  if (verify(source).host !== "workbuddy") throw Error("WORKBUDDY_PACKAGE_REQUIRED");
  const target = join13(configRoot, "plugins/marketplaces/my-experts/plugins", id);
  const marketPath = join13(
    configRoot,
    "plugins/marketplaces/my-experts/.codebuddy-plugin/marketplace.json"
  );
  const listPath = join13(configRoot, "experts/custom", userId, "experts.json");
  const cache = planWorkBuddyCache({ source, configRoot, readOnly: !apply });
  for (const path of [target, marketPath, listPath]) assertNoLinks(path);
  const oldBytes = [marketPath, listPath].map(
    (path) => existsSync9(path) ? readFileSync9(path) : null
  );
  const market = oldBytes[0] ? JSON.parse(oldBytes[0].toString("utf8").replace(/^\uFEFF/, "")) : { name: "my-experts", plugins: [] };
  const list = oldBytes[1] ? JSON.parse(oldBytes[1].toString("utf8").replace(/^\uFEFF/, "")) : [];
  if (!object2(market) || market.name !== "my-experts" || !Array.isArray(market.plugins) || !Array.isArray(list) || list.some((entry2) => typeof entry2 !== "string") || market.plugins.some((entry2) => !object2(entry2)) || market.plugins.filter((entry2) => entry2.name === id).length > 1)
    throw Error("EXPERT_REGISTRY_CONFLICT");
  const sourceHash = sha(readFileSync9(join13(source, "ownership.json")));
  let same2 = false;
  if (existsSync9(target)) {
    verify(target);
    same2 = sha(readFileSync9(join13(target, "ownership.json"))) === sourceHash;
  }
  const entry = {
    name: id,
    source: `./plugins/${id}`,
    description: json2(join13(source, ".codebuddy-plugin/plugin.json")).description
  };
  const previousEntry = market.plugins.find((item) => item.name === id);
  if (previousEntry && previousEntry.source !== entry.source)
    throw Error("EXPERT_SOURCE_CONFLICT");
  if (previousEntry) Object.assign(previousEntry, entry);
  else market.plugins.push(entry);
  if (!list.includes(id)) list.push(id);
  const plan = {
    status: "planned",
    source,
    target,
    configRoot,
    userId,
    operation: same2 ? "reuse" : "install",
    ownershipSHA256: sourceHash,
    hostObservation: "pending"
  };
  if (!same2 && existsSync9(target) || cache && !cache.same) plan.operation = "update";
  if (cache)
    plan.runtimeCache = { target: cache.target, previous: cache.previous, reuse: cache.same };
  if (!apply) return plan;
  const incoming = join13(configRoot, "installation-staging", id);
  const cacheIncoming = join13(configRoot, "installation-staging", `${id}-cache`);
  assertNoLinks(incoming);
  assertNoLinks(cacheIncoming);
  if (existsSync9(incoming)) throw Error("EXPERT_RECOVERY_REQUIRED");
  if (existsSync9(cacheIncoming)) throw Error("EXPERT_RECOVERY_REQUIRED");
  mkdirSync7(configRoot, { recursive: true });
  const lock = join13(configRoot, "asam-expert-install.lock");
  assertNoLinks(lock);
  const backup = join13(configRoot, "installation-backups", id, randomUUID7());
  assertNoLinks(backup);
  const transaction = join13(backup, "transaction.json");
  const fd = openSync3(lock, "wx");
  let movedOld = false, movedNew = false, movedCacheOld = false, movedCacheNew = false, cacheRegistryWritten = false;
  const writtenMetadata = [];
  let releaseCache;
  try {
    if (cache) releaseCache = lockCache(cache);
    if (cache) assertWorkBuddyCacheUnchanged(cache);
    if (!same2 || cache && (!cache.same || !cache.before.equals(cache.after)))
      write2(transaction, { ...plan, phase: "copying", incoming, cacheIncoming, backup });
    if (cache && !cache.same) {
      copy(source, cacheIncoming);
      if (sha(readFileSync9(join13(cacheIncoming, "ownership.json"))) !== sourceHash)
        throw Error("EXPERT_SOURCE_CHANGED");
    }
    for (let n = 0; n < oldBytes.length; n++) {
      const path = [marketPath, listPath][n];
      const current = existsSync9(path) ? readFileSync9(path) : null;
      if (oldBytes[n] === null ? current !== null : current === null || !oldBytes[n].equals(current))
        throw Error("EXPERT_REGISTRY_CHANGED");
    }
    if (!same2) {
      copy(source, incoming);
      if (sha(readFileSync9(join13(incoming, "ownership.json"))) !== sourceHash)
        throw Error("EXPERT_SOURCE_CHANGED");
      if (existsSync9(target)) {
        verify(target);
        mkdirSync7(backup, { recursive: true });
        renameSync5(target, join13(backup, "expert"));
        movedOld = true;
      }
      mkdirSync7(dirname8(target), { recursive: true });
      renameSync5(incoming, target);
      movedNew = true;
    }
    if (cache && !cache.same) {
      assertWorkBuddyCacheUnchanged(cache);
      if (existsSync9(cache.target)) {
        verify(cache.target);
        mkdirSync7(backup, { recursive: true });
        renameSync5(cache.target, join13(backup, "cache"));
        movedCacheOld = true;
      }
      mkdirSync7(dirname8(cache.target), { recursive: true });
      renameSync5(cacheIncoming, cache.target);
      movedCacheNew = true;
    }
    for (const [n, path, value] of [
      [0, marketPath, market],
      [1, listPath, list]
    ]) {
      const encoded = JSON.stringify(value, null, "	") + "\n";
      if (oldBytes[n] && oldBytes[n].toString("utf8") === encoded) continue;
      const current = existsSync9(path) ? readFileSync9(path) : null;
      if (oldBytes[n] === null ? current !== null : current === null || !oldBytes[n].equals(current))
        throw Error("EXPERT_REGISTRY_CHANGED");
      if (oldBytes[n]) write2(join13(backup, `registry-${n}.json`), oldBytes[n]);
      replaceRegistry(path, encoded);
      writtenMetadata.push(n);
    }
    if (cache) {
      if (!cache.before.equals(readFileSync9(cache.path)))
        throw Error("EXPERT_REGISTRY_CHANGED");
      if (!cache.before.equals(cache.after)) {
        write2(join13(backup, "installed-plugins.json"), cache.before);
        replaceRegistry(cache.path, cache.after);
        cacheRegistryWritten = true;
      }
    }
    const mcp = installMcp({ base: target, configRoot, apply: true });
    if (existsSync9(transaction))
      write2(transaction, { ...plan, phase: "completed", incoming, backup, mcp });
    return {
      ...plan,
      status: same2 && (!cache || cache.same) && !cacheRegistryWritten && writtenMetadata.length === 0 && mcp.status === "unchanged" ? "unchanged" : "installed",
      backup: existsSync9(backup) ? backup : null,
      mcp,
      restartRequired: true
    };
  } catch (error) {
    if (cacheRegistryWritten) {
      if (!readFileSync9(cache.path).equals(cache.after)) throw Error("EXPERT_REGISTRY_CHANGED");
      replaceRegistry(cache.path, cache.before);
    }
    if (movedCacheNew) {
      mkdirSync7(backup, { recursive: true });
      renameSync5(cache.target, join13(backup, "failed-cache"));
    }
    if (movedCacheOld) renameSync5(join13(backup, "cache"), cache.target);
    if (existsSync9(cacheIncoming)) {
      mkdirSync7(backup, { recursive: true });
      renameSync5(cacheIncoming, join13(backup, "cache-staging"));
    }
    for (const n of writtenMetadata) {
      const path = [marketPath, listPath][n];
      if (oldBytes[n]) replaceRegistry(path, oldBytes[n]);
      else unlinkSync5(path);
    }
    if (movedNew) {
      mkdirSync7(backup, { recursive: true });
      renameSync5(target, join13(backup, "failed-candidate"));
    }
    if (movedOld) renameSync5(join13(backup, "expert"), target);
    if (existsSync9(transaction))
      write2(transaction, {
        ...plan,
        phase: "failed-preserved",
        incoming,
        backup,
        code: error.code || error.message
      });
    throw error;
  } finally {
    try {
      releaseCache?.();
    } finally {
      closeSync3(fd);
      unlinkSync5(lock);
    }
  }
}
if (false) {
  try {
    const [configRoot, userId, action] = process.argv.slice(2);
    if (action !== void 0 && action !== "--apply") throw Error("EXPECTED_APPLY_FLAG");
    console.log(
      JSON.stringify(
        installExpert({
          source: resolve6(dirname8(fileURLToPath(import.meta.url)), "../../.."),
          configRoot,
          userId,
          apply: action === "--apply"
        })
      )
    );
  } catch (error) {
    console.log(
      JSON.stringify({
        status: "partial",
        code: error.code || error.message,
        action: "\u4FDD\u7559\u73B0\u573A\uFF1B\u786E\u8BA4 WorkBuddy \u5DF2\u9000\u51FA\u3001\u5B8C\u6574\u5305\u548C\u7528\u6237 ID \u540E\u91CD\u8BD5"
      })
    );
    process.exitCode = 2;
  }
}

// ../../../DevCache/workspaces/asam-ui/expert-production-1.0.0-20261120/tools/v2/hosts/workbuddy-upgrade.mjs
var bytes = (path) => existsSync10(path) ? readFileSync10(path) : null;
var same = (a, b) => a === null ? b === null : b !== null && a.equals(b);
var object3 = (value) => value && typeof value === "object" && !Array.isArray(value);
var sha2 = (value) => createHash6("sha256").update(value).digest("hex");
var parse = (value) => {
  try {
    return JSON.parse(value.toString("utf8").replace(/^\uFEFF/, ""));
  } catch {
    throw Error("INVALID_MCP_CONFIG");
  }
};
function serviceParts(previous, expected) {
  if (!object3(previous)) throw Error("ASAM_MCP_ENTRY_CONFLICT");
  const core = Object.fromEntries(["command", "args", "env"].map((key) => [key, previous[key]]));
  const extra = Object.fromEntries(
    Object.entries(previous).filter(([key]) => !["command", "args", "env"].includes(key))
  );
  if (Object.entries(extra).some(
    ([key, value]) => !(["enabled", "disabled"].includes(key) && typeof value === "boolean") && !(key === "type" && value === "stdio")
  ) || !equal(core.args, expected.args) || !equal(core.env, expected.env) || !isAbsolute10(core.command || ""))
    throw Error("ASAM_MCP_ENTRY_CONFLICT");
  return { core, extra };
}
async function managedWorkBuddyService({ source, configRoot, service }) {
  const tools = join14(source, "tools/v2/hosts");
  const { verify: verify2 } = await import(pathToFileURL2(join14(tools, "lifecycle.mjs")));
  const { mcpConfiguration: mcpConfiguration2, mcpOwnership: mcpOwnership2 } = await import(pathToFileURL2(join14(tools, "workbuddy-mcp.mjs")));
  const installed = join14(
    configRoot,
    "plugins/marketplaces/my-experts/plugins/asam-ui-development"
  );
  const target = join14(configRoot, "mcp.json");
  assertNoLinks(installed);
  assertNoLinks(target);
  const before = bytes(target);
  const config = before ? parse(before) : {};
  if (!object3(config) || config.mcpServers !== void 0 && !object3(config.mcpServers))
    throw Error("INVALID_MCP_CONFIG");
  const previous = service ?? config.mcpServers?.["asam-ui"];
  if (previous === void 0) return null;
  if (!object3(previous) || !existsSync10(installed)) throw Error("ASAM_MCP_ENTRY_CONFLICT");
  if (verify2(installed).host !== "workbuddy") throw Error("ASAM_MCP_ENTRY_CONFLICT");
  const metadata = parse(readFileSync10(join14(installed, ".codebuddy-plugin/plugin.json")));
  if (metadata.name !== "asam-ui-development") throw Error("ASAM_MCP_ENTRY_CONFLICT");
  const expected = mcpConfiguration2(installed);
  const { core, extra } = serviceParts(previous, expected);
  const owner = mcpOwnership2(configRoot, core);
  if (!owner.value && core.command !== expected.command && !["node", "node.exe"].includes(basename6(core.command).toLowerCase()))
    throw Error("ASAM_MCP_ENTRY_CONFLICT");
  if (owner.value && (owner.value.base !== installed || owner.value.ownershipSHA256 !== sha2(readFileSync10(join14(installed, "ownership.json")))))
    throw Error("ASAM_MCP_ENTRY_CONFLICT");
  return { target, config, before, previous, core, extra, expected, owner };
}
var paths = (root) => ({
  lock: join14(root, "asam-ui-upgrade.lock"),
  pending: join14(root, "asam-ui-upgrade.pending.json")
});
function assertInactive(record2) {
  if (record2?.schema !== "asam-ui/selected-upgrade@1" || !Number.isSafeInteger(record2.pid) || record2.pid <= 0 || !/^[-a-f0-9]{36}$/.test(record2.token || ""))
    throw Error("MCP_CONFIG_CHANGED");
  try {
    process.kill(record2.pid, 0);
  } catch (error) {
    if (error.code === "ESRCH") return;
    throw Error("INSTALLATION_IN_PROGRESS");
  }
  throw Error("INSTALLATION_IN_PROGRESS");
}
async function settle({ source, configRoot, pending, originalBytes }) {
  const base = join14(configRoot, "plugins/marketplaces/my-experts/plugins/asam-ui-development");
  if (pending.root !== configRoot || !["update", "uninstall"].includes(pending.action))
    throw Error("MCP_CONFIG_CHANGED");
  const shape = {
    args: [join14(base, "runtime/mcp-entry.mjs")],
    env: { ASAM_AGENT_VALIDATION: "1" }
  };
  const { core, extra } = serviceParts(pending.previous, shape);
  if (Object.keys(serviceParts(pending.expected, shape).extra).length)
    throw Error("MCP_CONFIG_CHANGED");
  const stagedService = pending.staged ?? pending.expected;
  if (Object.keys(serviceParts(stagedService, shape).extra).length || pending.staged !== void 0 && !equal(stagedService, pending.ownerBeforeSHA256 === null ? pending.expected : core))
    throw Error("MCP_CONFIG_CHANGED");
  const target = join14(configRoot, "mcp.json"), ownerPath = join14(configRoot, "mcp.json.asam-ui-owner.json");
  assertNoLinks(target);
  assertNoLinks(ownerPath);
  assertNoLinks(base);
  const currentBytes = bytes(target), current = currentBytes && parse(currentBytes), ownerAfter = bytes(ownerPath);
  if (!object3(current)) throw Error("MCP_CONFIG_CHANGED");
  if (pending.ownerBeforeSHA256 !== null && !/^[a-f0-9]{64}$/.test(pending.ownerBeforeSHA256 || ""))
    throw Error("MCP_CONFIG_CHANGED");
  if (pending.action === "uninstall" && !Object.hasOwn(current.mcpServers || {}, "asam-ui") && !existsSync10(base) && // The original package retains an existing owner receipt on uninstall.
  (ownerAfter === null || sha2(ownerAfter) === pending.ownerBeforeSHA256))
    return;
  const committed = (ownerAfter === null ? null : sha2(ownerAfter)) !== pending.ownerBeforeSHA256;
  const desired = committed ? { ...pending.expected, ...extra } : pending.previous;
  const actual = current.mcpServers?.["asam-ui"];
  if (!equal(actual, pending.expected) && !equal(actual, desired) && !(!committed && equal(actual, stagedService)))
    throw Error("MCP_CONFIG_CHANGED");
  const trusted = await managedWorkBuddyService({
    source,
    configRoot,
    service: committed ? pending.expected : pending.previous
  });
  if (!trusted || committed && !trusted.owner.value) throw Error("MCP_CONFIG_CHANGED");
  current.mcpServers["asam-ui"] = desired;
  replace(
    target,
    !committed && originalBytes && equal(current, parse(originalBytes)) ? originalBytes : Buffer.from(JSON.stringify(current, null, "	") + "\n"),
    currentBytes
  );
}
async function resumePending(source, configRoot) {
  const path = paths(configRoot);
  assertNoLinks(path.lock);
  assertNoLinks(path.pending);
  const lockBytes = bytes(path.lock), pendingBytes = bytes(path.pending);
  if (!lockBytes && !pendingBytes) return;
  const lock = lockBytes && parse(lockBytes), pending = pendingBytes && parse(pendingBytes);
  assertInactive(lock || pending);
  if (pending) {
    if (pending.schema !== "asam-ui/selected-upgrade@1" || lock && (lock.token !== pending.token || lock.pid !== pending.pid))
      throw Error("MCP_CONFIG_CHANGED");
    await settle({ source, configRoot, pending });
    if (!same(bytes(path.pending), pendingBytes)) throw Error("MCP_CONFIG_CHANGED");
    unlinkSync6(path.pending);
  }
  if (lockBytes) {
    if (!same(bytes(path.lock), lockBytes)) throw Error("MCP_CONFIG_CHANGED");
    unlinkSync6(path.lock);
  }
}
function replace(path, value, previous) {
  assertNoLinks(path);
  if (!same(bytes(path), previous)) throw Error("MCP_CONFIG_CHANGED");
  const incoming = `${path}.incoming-${randomUUID8()}`;
  writeFileSync8(incoming, value, { flag: "wx", mode: 384 });
  try {
    renameSync6(incoming, path);
  } finally {
    if (existsSync10(incoming)) unlinkSync6(incoming);
  }
}
async function upgradeWorkBuddy({ source, configRoot, userId, action = "update", run: run2 }) {
  if (!["update", "uninstall"].includes(action)) throw Error("INSTALL_ACTION_UNSUPPORTED");
  const updateCache = action === "update" && userId;
  const cache = updateCache ? planWorkBuddyCache({ source, configRoot }) : null;
  const releaseCache = cache ? lockWorkBuddyCache(cache) : void 0;
  try {
    if (cache) assertWorkBuddyCacheUnchanged(cache);
    const deployExpert = cache ? (input) => installExpert(input, {
      lockCache: (plan) => {
        if (plan.path !== cache.path || plan.target !== cache.target || plan.root !== cache.root)
          throw Error("EXPERT_REGISTRY_CHANGED");
      }
    }) : installExpert;
    return await withManagedWorkBuddyService({ source, configRoot, action }, async () => {
      let installed;
      const report = await run2(
        updateCache ? (input) => installed = deployExpert(input) : void 0
      );
      if (updateCache && report?.status === "pass") {
        installed ??= deployExpert({ source, configRoot, userId, apply: true });
        report.runtimeCache = installed.runtimeCache ?? null;
        report.cacheRefreshBackup = installed.backup;
      }
      return report;
    });
  } finally {
    releaseCache?.();
  }
}
async function withManagedWorkBuddyService({ source, configRoot, action }, execute) {
  await resumePending(source, configRoot);
  const state = await managedWorkBuddyService({ source, configRoot });
  if (!state) return execute();
  const { target, config, before, previous, core, expected, owner } = state;
  if (equal(previous, expected)) return execute();
  const { lock: lockPath, pending: pendingPath } = paths(configRoot);
  assertNoLinks(lockPath);
  assertNoLinks(pendingPath);
  const lock = openSync4(lockPath, "wx");
  const stagedService = owner.value ? core : expected;
  const pending = {
    schema: "asam-ui/selected-upgrade@1",
    pid: process.pid,
    token: randomUUID8(),
    root: configRoot,
    action,
    previous,
    expected,
    staged: stagedService,
    ownerBeforeSHA256: owner.before === null ? null : sha2(owner.before)
  };
  let staged = false, intent = false, settled = false;
  try {
    writeFileSync8(
      lock,
      JSON.stringify({ schema: pending.schema, pid: pending.pid, token: pending.token })
    );
    writeFileSync8(pendingPath, JSON.stringify(pending), { flag: "wx", mode: 384 });
    intent = true;
    if (!same(bytes(owner.path), owner.before)) throw Error("MCP_CONFIG_CHANGED");
    config.mcpServers["asam-ui"] = stagedService;
    replace(target, Buffer.from(JSON.stringify(config, null, "	") + "\n"), before);
    staged = true;
    return await execute();
  } finally {
    try {
      if (staged) await settle({ source, configRoot, pending, originalBytes: before });
      if (intent) unlinkSync6(pendingPath);
      settled = true;
    } finally {
      closeSync4(lock);
      if (settled) unlinkSync6(lockPath);
    }
  }
}

// ../../../DevCache/workspaces/asam-ui/expert-production-1.0.0-20261120/tools/v2/hosts/online-install.mjs
var agentNames = { codex: "Codex", workbuddy: "WorkBuddy", harness: "DeepSeek Harness" };
var harnessDesktopQuit = process.platform === "darwin" ? "\u8BF7\u4ECE\u5E94\u7528\u83DC\u5355\u5B8C\u5168\u9000\u51FA DeepSeek Harness" : "\u8BF7\u4ECE\u6258\u76D8\u5B8C\u5168\u9000\u51FA DeepSeek Harness";
var harnessDesktopSteps = `\u9996\u6B21\u4F7F\u7528\u8BF7\u5148\u6253\u5F00 DeepSeek Harness \u4E00\u6B21\u3002${harnessDesktopQuit}\uFF0C\u56DE\u5230\u5B89\u88C5\u5668\u7EE7\u7EED\u3002`;
async function selectHarness({ input, detected, home, action, ask, signal, progress }) {
  if (action === "cancel") return;
  let profile = input.profile;
  const interactive = !profile;
  if (interactive) {
    const choice = await ask(
      "\u8BF7\u9009\u62E9 DeepSeek Harness \u4E13\u5BB6\u7684\u5B89\u88C5\u76EE\u6807\uFF1A\n1. \u684C\u9762\u5E94\u7528\uFF08\u4F7F\u7528\u5185\u7F6E\u684C\u9762\u914D\u7F6E\uFF09\n2. \u547D\u4EE4\u884C\uFF08\u6307\u5B9A\u547D\u4EE4\u884C\u914D\u7F6E\u540D\u79F0\uFF09\n0. \u53D6\u6D88\uFF08\u9ED8\u8BA4\uFF09\n\u8BF7\u8F93\u5165\u7F16\u53F7\uFF1A"
    );
    if (choice === "0" || choice === "") return;
    if (choice === "1") profile = "desktop";
    else if (choice === "2") {
      profile = await ask("\u8BF7\u8F93\u5165 DeepSeek Harness \u547D\u4EE4\u884C\u914D\u7F6E\u540D\u79F0\uFF08\u7559\u7A7A\u53D6\u6D88\uFF09\uFF1A");
      if (!profile) return;
      if (profile.toLowerCase() === "desktop") throw Error("HARNESS_USE_DESKTOP_TARGET");
    } else throw Error("HARNESS_TARGET_UNSUPPORTED");
  }
  if (!/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,63}$/.test(profile)) throw Error("HARNESS_PROFILE_REQUIRED");
  profile = normalizeHarnessProfile(profile);
  const desktop = profile === "desktop";
  const args = input["dsh-entry"] ? [resolve7(input["dsh-entry"])] : [];
  if (input["recover-harness-store"] && (!desktop || process.platform !== "darwin"))
    throw Error("HARNESS_STORE_RECOVERY_REQUIRES_MAC_DESKTOP_INSTALL");
  if (desktop && interactive && action !== "check") {
    let guidance = harnessDesktopSteps;
    for (; ; ) {
      const ready = await ask(
        `${guidance}
\u6309 Enter \u68C0\u67E5\u5E76\u7EE7\u7EED\uFF0C\u8F93\u5165 0 \u53D6\u6D88\uFF1A`,
        "harness-desktop-ready"
      );
      if (ready === "0") return;
      if (ready !== "") throw Error("HARNESS_TARGET_UNSUPPORTED");
      const command2 = input["dsh-command"] || detectDesktopLauncher();
      if (!command2) {
        guidance = "\u5C1A\u672A\u627E\u5230 DeepSeek Harness \u684C\u9762\u5E94\u7528\u3002\u8BF7\u786E\u8BA4\u5DF2\u5B89\u88C5\uFF0C\u518D\u68C0\u67E5\u4E00\u6B21\u3002";
        continue;
      }
      const launcher2 = { command: command2, args };
      try {
        progress("harness-desktop-check", "\u6B63\u5728\u6838\u5BF9 DeepSeek Harness \u684C\u9762\u5E94\u7528\u72B6\u6001\u2026");
        assertHarnessDesktopInitialized(home);
        await requireDesktopClosed(launcher2, signal);
        return { profile, launcher: launcher2 };
      } catch (error) {
        if (error.message === "HARNESS_DESKTOP_INITIALIZATION_REQUIRED")
          guidance = `\u684C\u9762\u914D\u7F6E\u5C1A\u672A\u521D\u59CB\u5316\u3002${harnessDesktopSteps}`;
        else if (error.message === "HARNESS_DESKTOP_CLOSE_REQUIRED")
          guidance = `DeepSeek Harness \u4ECD\u5728\u8FD0\u884C\u3002${harnessDesktopQuit}\uFF0C\u518D\u68C0\u67E5\u4E00\u6B21\u3002`;
        else throw error;
      }
    }
  }
  const command = input["dsh-command"] || (desktop ? detected.harnessDesktop : detected.harness);
  const selectedCommand = command || await ask("\u8BF7\u8F93\u5165 DeepSeek Harness \u539F\u751F dsh \u7684\u7EDD\u5BF9\u8DEF\u5F84\uFF08\u7559\u7A7A\u53D6\u6D88\uFF09\uFF1A");
  if (!selectedCommand) return;
  if (!isAbsolute11(selectedCommand)) throw Error("HARNESS_COMMAND_REQUIRED");
  const launcher = { command: selectedCommand, args };
  if (desktop) {
    progress("harness-desktop-check", "\u6B63\u5728\u6838\u5BF9 DeepSeek Harness \u684C\u9762\u5E94\u7528\u72B6\u6001\u2026");
    assertHarnessDesktopInitialized(home);
    if (action !== "check") await requireDesktopClosed(launcher, signal);
  }
  return { profile, launcher };
}
function options(argv) {
  const parsed = {};
  const boolean = /* @__PURE__ */ new Set(["allow-http-test", "recover-harness-store"]);
  const allowed = /* @__PURE__ */ new Set([
    "manifest",
    "public-key-file",
    "host",
    "action",
    "codex-binary",
    "workbuddy-app",
    "config-root",
    "user-id",
    "dsh-command",
    "dsh-entry",
    "dsh-home",
    "profile",
    "state-root",
    "offline-dir",
    ...boolean
  ]);
  for (let index = 0; index < argv.length; index++) {
    const name = argv[index].replace(/^--/, "");
    if (!argv[index].startsWith("--") || !allowed.has(name) || parsed[name] !== void 0)
      throw Error("INSTALL_OPTION_UNSUPPORTED");
    if (boolean.has(name)) parsed[name] = true;
    else {
      const value = argv[++index];
      if (!value || value.startsWith("--"))
        throw Error(`INSTALL_OPTION_VALUE_REQUIRED: ${name}`);
      parsed[name] = value;
    }
  }
  return parsed;
}
function findCommand(name) {
  const result = loggedSpawnSync(process.platform === "win32" ? "where.exe" : "which", [name], {
    encoding: "utf8",
    timeout: 1e4,
    windowsHide: true
  });
  return result.status === 0 ? result.stdout.split(/\r?\n/).find(
    (path) => path && isAbsolute11(path) && (process.platform !== "win32" || /\.(exe|cmd|bat)$/i.test(path))
  ) : void 0;
}
function detectCodexBinary() {
  const command = findCommand("codex") || (process.platform === "darwin" ? detectMacCodex() : void 0);
  if (!command || process.platform !== "win32" || /\.exe$/i.test(command)) return command;
  const pnpm = findCommand("pnpm");
  const roots = [];
  if (pnpm && !/["%&|<>^!\r\n]/.test(pnpm)) {
    const result = loggedSpawnSync(
      process.env.ComSpec || "cmd.exe",
      ["/d", "/s", "/c", `""${pnpm}" root -g"`],
      { encoding: "utf8", timeout: 1e4, windowsHide: true, windowsVerbatimArguments: true }
    );
    const global = result.stdout?.trim();
    if (result.status === 0 && isAbsolute11(global) && existsSync11(global)) {
      roots.push(join15(global, "@openai/codex"), join15(global, "node_modules/@openai/codex"));
      for (const entry of readdirSync5(global, { withFileTypes: true }).slice(0, 100))
        if (entry.isDirectory())
          roots.push(join15(global, entry.name, "node_modules/@openai/codex"));
    }
  }
  const triples = { x64: "x86_64-pc-windows-msvc", arm64: "aarch64-pc-windows-msvc" };
  const nativeIn = (root) => {
    if (!existsSync11(join15(root, "package.json"))) return void 0;
    root = realpathSync5(root);
    let vendor = join15(root, "vendor");
    try {
      const require2 = createRequire(join15(root, "package.json"));
      vendor = join15(
        dirname9(require2.resolve(`@openai/codex-win32-${process.arch}/package.json`)),
        "vendor"
      );
    } catch {
    }
    const native2 = join15(vendor, triples[process.arch] || "unsupported", "bin/codex.exe");
    return existsSync11(native2) ? native2 : void 0;
  };
  const installed = [
    ...new Set(
      roots.filter((root) => existsSync11(join15(root, "package.json"))).map(nativeIn).filter(Boolean).map((path) => realpathSync5(path))
    )
  ];
  if (installed.length === 1) return installed[0];
  if (installed.length > 1) return void 0;
  return nativeIn(join15(dirname9(command), "node_modules/@openai/codex"));
}
function extract(archive, directory) {
  const tar = process.platform === "win32" && process.env.SystemRoot ? join15(process.env.SystemRoot, "System32/tar.exe") : "tar";
  const invoke = (args) => {
    const result = loggedSpawnSync(tar, args, {
      encoding: "utf8",
      timeout: 6e4,
      windowsHide: true,
      maxBuffer: 4 * 1024 * 1024
    });
    if (result.error || result.status !== 0)
      throw Error(`INSTALL_ARCHIVE_FAILED: ${result.error?.message || result.stderr}`);
    return result.stdout;
  };
  const names = invoke(["-tzf", archive]).split(/\r?\n/).filter(Boolean);
  if (!names.length || names.some(
    (name) => !name.startsWith("package/") || name.includes("\\") || name.split("/").some((part) => part === ".." || part === ".")
  ) || /^[lh]/m.test(invoke(["-tvzf", archive])))
    throw Error("INSTALL_ARCHIVE_PATH_UNSUPPORTED");
  mkdirSync8(directory);
  invoke(["-xzf", archive, "-C", directory, "--no-same-owner", "--no-same-permissions"]);
  return join15(directory, "package");
}
async function checkWorkBuddyInstallation({ source, configRoot, loadSource }) {
  const installed = join15(
    configRoot,
    "plugins/marketplaces/my-experts/plugins/asam-ui-development"
  );
  if (!existsSync11(installed)) return { status: "absent" };
  source ??= await loadSource();
  const { verify: verify2 } = await import(pathToFileURL3(join15(source, "tools/v2/hosts/lifecycle.mjs")));
  if (loadSource && verify2(source).host !== "workbuddy")
    throw Error("INSTALL_HOST_PACKAGE_MISMATCH");
  if (verify2(installed).host !== "workbuddy") throw Error("WORKBUDDY_PACKAGE_REQUIRED");
  const state = await managedWorkBuddyService({ source, configRoot });
  if (!state)
    return {
      status: "partial",
      host: "workbuddy",
      reason: "WORKBUDDY_MCP_CONFIGURATION_REQUIRED",
      hostUsability: "\u4E13\u5BB6\u6587\u4EF6\u5DF2\u5B58\u5728\uFF0CMCP \u914D\u7F6E\u5C1A\u672A\u5C31\u7EEA\uFF1B\u8BF7\u901A\u8FC7\u5B89\u88C5\u6D41\u7A0B\u6838\u5BF9\u3002"
    };
  if (!isDeepStrictEqual3(state.core, state.expected)) throw Error("ASAM_MCP_ENTRY_CONFLICT");
  const cache = planWorkBuddyCache({ source, configRoot, readOnly: true });
  if (cache && (!cache.same || !cache.before.equals(cache.after)))
    return {
      status: "partial",
      host: "workbuddy",
      reason: "WORKBUDDY_CACHE_UPDATE_REQUIRED",
      runtimeCache: cache.target,
      hostUsability: "\u8FD0\u884C\u7F13\u5B58\u4E0E\u76EE\u6807\u5305\u4E0D\u4E00\u81F4\uFF0C\u8BF7\u901A\u8FC7\u5347\u7EA7\u6D41\u7A0B\u66F4\u65B0\u540E\u91CD\u542F WorkBuddy\u3002"
    };
  return {
    status: "files-present",
    host: "workbuddy",
    version: packageVersion(installed, "workbuddy"),
    mcpConfiguration: "matched",
    hostUsability: "pending-real-host-check"
  };
}
async function runOnlineInstall(argv = process.argv.slice(2), interaction = {}) {
  interaction.onProgress?.({ phase: "downloads-location", message: "\u6B63\u5728\u5B9A\u4F4D\u5B89\u88C5\u5668\u4E0B\u8F7D\u76EE\u5F55\u2026" });
  const downloads = installerDownloads();
  const stage = createInstallerLogStage(downloads);
  const log = installationLog(stage);
  return log.run(async () => {
    log.record({
      phase: "start",
      node: process.version,
      platform: process.platform,
      arch: process.arch
    });
    try {
      return await executeOnlineInstall(argv, log, stage, downloads, interaction);
    } catch (error) {
      log.record({ phase: "finished", status: "failed", exitCode: 2, error: error.stack });
      if (!existsSync11(join15(stage, "INSTALLATION.json")))
        log.writeReceipt({ status: "fail", error: error.stack });
      console.error(`\u8BE6\u60C5\uFF1A${join15(stage, "INSTALLATION.json")}`);
      error.message = log.clean(error.message);
      throw error;
    }
  });
}
async function executeOnlineInstall(argv, log, stage, downloads, interaction) {
  const { ask: askTerminal, signal: terminalSignal, onProgress, onIdle } = interaction;
  const progress = (phase, message) => onProgress?.({ phase, message });
  const input = options(argv);
  for (const [name, value] of Object.entries(input)) {
    if (typeof value !== "string" || ["host", "action", "profile", "user-id"].includes(name))
      continue;
    if (name === "manifest") {
      if (/^https?:\/\//i.test(value) && URL.canParse(value)) log.alias(value, name);
    } else {
      const path = resolve7(value);
      if (path !== "/") log.alias(path, name);
    }
  }
  log.record({
    phase: "input",
    host: input.host,
    action: input.action,
    profile: input.profile,
    optionSources: Object.fromEntries(Object.keys(input).map((name) => [name, "explicit"]))
  });
  const [major, minor] = process.versions.node.split(".").map(Number);
  if (major !== 22 || minor < 19) throw Error("ASAM_NODE22_REQUIRED");
  if (!input.manifest && !input["offline-dir"] || !input["public-key-file"])
    throw Error("SIGNED_RELEASE_INPUT_REQUIRED");
  const publicKey = readFileSync11(resolve7(input["public-key-file"]), "utf8");
  const allowHttp = input["allow-http-test"] === true;
  const controller = new AbortController();
  const signal = terminalSignal ? AbortSignal.any([controller.signal, terminalSignal]) : controller.signal;
  const checkCancellation = async () => {
    if (terminalSignal) await yieldToTerminal();
    signal.throwIfAborted();
  };
  const cancel = () => controller.abort(Error("INSTALL_CANCELLED"));
  process.once("SIGINT", cancel);
  process.once("SIGTERM", cancel);
  let host = input.host, action = input.action;
  let readline, workStage;
  const receipt = { schemaVersion: 1, startedAt: (/* @__PURE__ */ new Date()).toISOString(), status: "running" };
  const ask = async (prompt, menu) => {
    signal.throwIfAborted();
    if (menu) log.record({ phase: "awaiting-input", host, menu });
    if (askTerminal) return askTerminal(prompt);
    if (!process.stdin.isTTY)
      throw Error(
        "INSTALL_SELECTION_REQUIRED: \u8BF7\u901A\u8FC7 --host \u4E0E --action \u6307\u5B9A Agent \u5DE5\u5177\u53CA\u64CD\u4F5C\u3002"
      );
    readline ??= createInterface({ input: process.stdin, output: process.stdout });
    return (await readline.question(prompt, { signal })).trim();
  };
  try {
    progress("tool-discovery", "\u6B63\u5728\u67E5\u627E\u5DF2\u5B89\u88C5\u7684 Agent \u5DE5\u5177\u2026");
    const detected = {
      codex: detectCodexBinary(),
      workbuddy: existsSync11(join15(homedir7(), ".workbuddy")) ? "\u5DF2\u53D1\u73B0\u914D\u7F6E\uFF0C\u8BF7\u6838\u5BF9\u5F53\u524D\u767B\u5F55\u8D26\u6237" : void 0,
      harness: findCommand("dsh"),
      harnessDesktop: detectDesktopLauncher()
    };
    if (!host) {
      console.log("ASAM UI \u5F00\u53D1\u4E13\u5BB6\u5B89\u88C5");
      host = { 1: "codex", 2: "workbuddy", 3: "harness" }[await ask(
        [
          "\u8BF7\u9009\u62E9\u8981\u63A5\u5165\u7684 Agent \u5DE5\u5177\uFF1A",
          "1. Codex",
          "2. WorkBuddy",
          "3. DeepSeek Harness",
          "\u8BF7\u8F93\u5165\u7F16\u53F7\uFF081-3\uFF09\uFF1A"
        ].join("\n")
      )];
    }
    if (!["codex", "workbuddy", "harness"].includes(host))
      throw Error("INSTALL_HOST_UNSUPPORTED");
    if (input["recover-harness-store"] && host !== "harness")
      throw Error("HARNESS_STORE_RECOVERY_REQUIRES_MAC_DESKTOP_INSTALL");
    if (action && !["install", "update", "check", "uninstall", "cancel"].includes(action))
      throw Error("INSTALL_ACTION_UNSUPPORTED");
    Object.assign(receipt, { stage, host });
    const agent = agentNames[host];
    console.log(`\u4E0B\u8F7D\u76EE\u5F55\uFF1A${downloads}`);
    const dshHome = resolve7(
      input["dsh-home"] || process.env.DSH_HOME || join15(homedir7(), ".dsh")
    );
    let harness;
    if (host === "harness") {
      harness = await selectHarness({
        input,
        detected,
        home: dshHome,
        action,
        ask,
        signal,
        progress
      });
      if (!harness) {
        Object.assign(receipt, {
          status: "cancelled",
          action: "cancel",
          report: { status: "cancelled" }
        });
        log.record({ phase: "finished", status: "cancelled", exitCode: 0 });
        log.writeReceipt(receipt);
        console.log(`\u5DF2\u53D6\u6D88 ${agent} \u4E13\u5BB6\u64CD\u4F5C\u3002`);
        return receipt.report;
      }
    }
    const releaseUrl = input.manifest;
    progress("manifest-verification", "\u6B63\u5728\u8BFB\u53D6\u5E76\u6821\u9A8C\u53D1\u884C\u6E05\u5355\u2026");
    const release = await log.step(
      "manifest-verification",
      async () => input["offline-dir"] ? await loadLocalRelease({
        directory: resolve7(input["offline-dir"]),
        publicKey,
        allowHttp
      }) : await loadRelease({
        url: releaseUrl,
        publicKey,
        allowHttp,
        signal,
        stage,
        onProgress
      })
    );
    const artifact = selectArtifact(release.manifest, host);
    Object.assign(receipt, {
      release: release.manifest.release,
      manifestSHA256: release.sha256,
      artifactSHA256: artifact.sha256
    });
    if (artifact.format !== "tar.gz") throw Error("INSTALL_ARCHIVE_FORMAT_UNSUPPORTED");
    if (!onProgress) console.log(`\u6B63\u5728\u6838\u5BF9 ${agent} \u7684\u5DF2\u5B89\u88C5\u4E13\u5BB6\u7248\u672C\u2026`);
    const declaredVersion = expertVersion(release.manifest.productVersion);
    let archive, source;
    const loadPayload = async () => {
      if (source) return source;
      progress("package-cache", `\u6B63\u5728\u6838\u5BF9 ${agent} \u5B89\u88C5\u5305\u7684\u672C\u5730\u7F13\u5B58\u2026`);
      if (!onProgress) console.log(`\u6B63\u5728\u8BFB\u53D6 ${agent} \u5B89\u88C5\u5305\u2026`);
      const archivePath = downloadFilePath(basename7(new URL(artifact.url).pathname), {
        sha256: artifact.sha256,
        bytes: artifact.bytes,
        reuseByContent: true
      });
      archive = await log.step(
        "artifact-verification",
        async () => input["offline-dir"] ? await copyLocalArtifact(
          artifact,
          resolve7(input["offline-dir"]),
          archivePath,
          {
            stage,
            onProgress
          }
        ) : await downloadArtifact(artifact, archivePath, {
          allowHttp,
          signal,
          stage,
          onProgress
        })
      );
      await checkCancellation();
      const tempRoot = process.platform === "darwin" ? realpathSync5(tmpdir3()) : tmpdir3();
      workStage = mkdtempSync3(join15(tempRoot, "asam-expert-work-"));
      progress("extract", `\u6B63\u5728\u89E3\u5305\u5E76\u68C0\u67E5 ${agent} \u5B89\u88C5\u5305\u2026`);
      source = await log.step("extract", () => extract(archive, join15(workStage, "unpacked")));
      await checkCancellation();
      if (declaredVersion && packageVersion(source, host) !== declaredVersion)
        throw Error("RELEASE_PACKAGE_VERSION_MISMATCH");
      return source;
    };
    log.record({
      phase: "release",
      release: release.manifest.release,
      manifestSHA256: release.sha256,
      artifactSHA256: artifact.sha256
    });
    const configRoot = resolve7(
      input["config-root"] || (host === "codex" ? process.env.CODEX_HOME || join15(homedir7(), ".codex") : process.env.WORKBUDDY_CONFIG_DIR || join15(homedir7(), ".workbuddy"))
    );
    const codexBinary = input["codex-binary"] || process.env.ASAM_CODEX_BINARY || detected.codex;
    if (!["check", "cancel"].includes(action) && !(host === "codex" && action === "uninstall")) {
      progress("installed-version", `\u6B63\u5728\u8BFB\u53D6 ${agent} \u63D2\u4EF6\u767B\u8BB0\u5E76\u6838\u5BF9\u7248\u672C\u2026`);
      let codexInstalled = [];
      if (host === "codex" && existsSync11(configRoot)) {
        if (!codexBinary) throw Error("CODEX_CLI_REQUIRED");
        const listed = loggedSpawnSync(
          codexBinary,
          ["plugin", "list", "--marketplace", "asam-ui-local", "--json"],
          {
            env: { ...process.env, CODEX_HOME: configRoot },
            encoding: "utf8",
            timeout: 3e4,
            windowsHide: true
          }
        );
        if (listed.error || listed.status !== 0) throw Error("CODEX_CHECK_FAILED");
        codexInstalled = JSON.parse(listed.stdout).installed;
        if (!Array.isArray(codexInstalled)) throw Error("CODEX_CLI_RESPONSE_UNSUPPORTED");
      }
      const current = installedExpert({
        host,
        configRoot,
        home: dshHome,
        profile: harness?.profile,
        codexInstalled
      });
      const targetVersion = declaredVersion ?? packageVersion(await loadPayload(), host);
      action = await chooseExpertAction({
        current,
        targetVersion,
        requested: action,
        ask: (prompt) => ask(prompt, "expert-action"),
        expertLabel: `${agent} \u4E13\u5BB6`,
        actionPrompt: process.platform === "win32" ? `\u8BF7\u8F93\u5165 ${agent} \u4E13\u5BB6\u64CD\u4F5C\u7F16\u53F7\uFF1A` : void 0
      });
      Object.assign(receipt, { installedVersion: current.version, targetVersion });
    }
    if (action === "cancel") {
      onIdle?.();
      Object.assign(receipt, {
        status: "cancelled",
        action,
        report: { status: "cancelled" }
      });
      log.record({ phase: "finished", status: "cancelled", exitCode: 0 });
      log.writeReceipt(receipt);
      console.log(`\u5DF2\u53D6\u6D88 ${agent} \u4E13\u5BB6\u64CD\u4F5C\uFF0C\u73B0\u6709\u5B89\u88C5\u548C\u914D\u7F6E\u4FDD\u6301\u539F\u72B6\u3002`);
      return receipt.report;
    }
    Object.assign(receipt, { action });
    log.record({ phase: "selection", host, action });
    log.alias(configRoot, "config-root");
    log.alias(dshHome, "dsh-home");
    const observedPaths = host === "harness" ? { home: dshHome, profile: join15(dshHome, "profiles", harness.profile) } : {
      configRoot,
      state: join15(
        configRoot,
        host === "codex" ? "asam-ui/installer-state.json" : "plugins/marketplaces/my-experts/plugins/asam-ui-development"
      )
    };
    const before = log.snapshot(observedPaths);
    log.record({
      phase: "before",
      target: observedPaths,
      profile: harness?.profile,
      source: input["config-root"] || input["dsh-home"] ? "explicit" : "environment-or-default",
      state: before
    });
    let report;
    try {
      await log.step("host-operation", async () => {
        await checkCancellation();
        const showAction = () => progress(
          "host-operation",
          `\u6B63\u5728${{ install: "\u5B89\u88C5", update: "\u5347\u7EA7", uninstall: "\u5378\u8F7D", check: "\u68C0\u67E5" }[action]} ${agent} \u4E13\u5BB6\u2026`
        );
        if (host === "harness") {
          if (action === "install" || action === "update") await loadPayload();
          showAction();
          const { profile, launcher } = harness;
          report = await runHarnessInstall({
            recoverStore: input["recover-harness-store"] === true,
            launcher,
            home: dshHome,
            profile,
            source,
            archive,
            node22: realpathSync5(process.execPath),
            findPreviousState: input["state-root"] === void 0,
            stateRoot: resolve7(
              input["state-root"] || join15(homedir7(), ".asam-ui/harness")
            ),
            action,
            signal,
            onStage: onProgress,
            onProgress: (text) => process.stderr.write(text)
          });
        } else if (host === "workbuddy" && action === "check") {
          showAction();
          report = await checkWorkBuddyInstallation({
            configRoot,
            loadSource: loadPayload
          });
        } else {
          let tools;
          if (action !== "check") {
            tools = join15(await loadPayload(), "tools/v2/hosts");
            progress("package-ownership", `\u6B63\u5728\u6838\u5BF9 ${agent} \u5B89\u88C5\u5305\u7684\u5185\u5BB9\u548C\u5F52\u5C5E\u2026`);
            const { verify: verify2 } = await import(pathToFileURL3(join15(tools, "lifecycle.mjs")));
            if (verify2(source).host !== host)
              throw Error("INSTALL_HOST_PACKAGE_MISMATCH");
          }
          await checkCancellation();
          showAction();
          if (host === "codex") {
            const binary = codexBinary;
            if (!binary) throw Error("CODEX_CLI_REQUIRED");
            if (action === "check") {
              const config = resolve7(
                input["config-root"] || process.env.CODEX_HOME || join15(homedir7(), ".codex")
              );
              const statePath = join15(config, "asam-ui/installer-state.json");
              if (!existsSync11(config)) report = { status: "absent" };
              else {
                const listed = loggedSpawnSync(
                  binary,
                  ["plugin", "list", "--marketplace", "asam-ui-local", "--json"],
                  {
                    env: { ...process.env, CODEX_HOME: config },
                    encoding: "utf8",
                    timeout: 3e4,
                    windowsHide: true
                  }
                );
                if (listed.error || listed.status !== 0)
                  throw Error(
                    `CODEX_CHECK_FAILED: ${listed.error?.message || listed.stderr}`
                  );
                const installed = JSON.parse(listed.stdout).installed;
                if (!Array.isArray(installed))
                  throw Error("CODEX_CLI_RESPONSE_UNSUPPORTED");
                const selected = installed.filter(
                  (entry) => entry.pluginId === "asam-ui-development@asam-ui-local"
                );
                if (selected.length > 1)
                  throw Error("CODEX_MULTIPLE_INSTALLATIONS");
                if (!selected.length) report = { status: "absent" };
                else if (!existsSync11(statePath))
                  report = {
                    status: "unmanaged-preserved",
                    hostUsability: "requires-source-review"
                  };
                else {
                  const state = JSON.parse(readFileSync11(statePath, "utf8"));
                  if (state.schemaVersion !== 1 || state.owner !== "asam-ui-development" || typeof state.root !== "string" || !isAbsolute11(state.root) || !/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(
                    selected[0].version || ""
                  ) || selected[0].version !== state.version)
                    throw Error("CODEX_INSTALLED_STATE_CONFLICT");
                  const rel = relative3(
                    join15(config, "asam-ui/marketplaces"),
                    state.root
                  );
                  if (!rel || isAbsolute11(rel) || rel === ".." || rel.startsWith(`..${sep2}`))
                    throw Error("CODEX_INSTALLED_SOURCE_CONFLICT");
                  const source2 = await loadPayload();
                  const { verify: verify2 } = await import(pathToFileURL3(join15(source2, "tools/v2/hosts/lifecycle.mjs")));
                  if (verify2(source2).host !== "codex")
                    throw Error("INSTALL_HOST_PACKAGE_MISMATCH");
                  verify2(join15(state.root, "codex/asam-ui-development"));
                  verify2(
                    join15(
                      config,
                      "plugins/cache/asam-ui-local/asam-ui-development",
                      selected[0].version
                    )
                  );
                  const expectedOwnership = state.ownershipSHA256;
                  for (const base of [
                    join15(state.root, "codex/asam-ui-development"),
                    join15(
                      config,
                      "plugins/cache/asam-ui-local/asam-ui-development",
                      selected[0].version
                    )
                  ])
                    if (createHash7("sha256").update(readFileSync11(join15(base, "ownership.json"))).digest("hex") !== expectedOwnership)
                      throw Error("CODEX_INSTALLED_SOURCE_CONFLICT");
                  if (selected[0].version !== state.version)
                    throw Error("CODEX_INSTALLED_STATE_CONFLICT");
                  report = {
                    status: selected[0].enabled ? "registered" : "disabled",
                    version: state.version,
                    hostUsability: "pending-real-host-check"
                  };
                }
              }
            } else {
              const { runCodexOneClick } = await import(pathToFileURL3(join15(tools, "codex-oneclick.mjs")));
              report = await runCodexOneClick({
                source,
                binary: resolve7(binary),
                codexHome: input["config-root"] ? resolve7(input["config-root"]) : void 0,
                action: action === "uninstall" ? "uninstall" : "install",
                signal
              });
            }
          } else {
            const {
              runOneClick,
              runUninstall,
              detectUserIds,
              chooseUserId,
              workBuddyRunning
            } = await import(pathToFileURL3(join15(tools, "oneclick.mjs")));
            const configRoot2 = resolve7(
              input["config-root"] || process.env.WORKBUDDY_CONFIG_DIR || join15(homedir7(), ".workbuddy")
            );
            const userId = chooseUserId(detectUserIds(configRoot2), input["user-id"]);
            log.alias(userId, "user-id");
            let app = input["workbuddy-app"] || process.env.ASAM_WORKBUDDY_APP;
            if (!app) {
              const apps = findWorkBuddyApps();
              if (!apps.length)
                throw Error(
                  "WORKBUDDY_NOT_INSTALLED: \u8BF7\u786E\u8BA4\u80FD\u4ECE\u7CFB\u7EDF\u5E94\u7528\u83DC\u5355\u6253\u5F00 WorkBuddy\uFF0C\u767B\u5F55\u5E76\u5B8C\u5168\u9000\u51FA\u540E\u91CD\u8BD5\u3002"
                );
              app = apps[0];
              if (apps.length > 1) {
                const choices = apps.map((path, index) => `${index + 1}. ${path}`);
                const choice = await ask(
                  [
                    "\u68C0\u6D4B\u5230\u591A\u4E2A WorkBuddy \u5B89\u88C5\uFF0C\u8BF7\u9009\u62E9\uFF1A",
                    ...choices,
                    "\u8BF7\u8F93\u5165\u7F16\u53F7\uFF1A"
                  ].join("\n")
                );
                app = apps.find((_, index) => String(index + 1) === choice);
                if (!app)
                  throw Error(
                    "INVALID_WORKBUDDY_APP_SELECTION: \u8BF7\u9009\u62E9\u5217\u8868\u4E2D\u7684\u7F16\u53F7\u3002"
                  );
              }
            }
            workBuddyExecutable(app);
            log.alias(app, "workbuddy-app");
            const previousApp = process.env.ASAM_WORKBUDDY_APP;
            process.env.ASAM_WORKBUDDY_APP = app;
            try {
              const run2 = (deployExpert) => action === "uninstall" ? runUninstall({ base: source, configRoot: configRoot2, userId }) : runOneClick({
                base: source,
                configRoot: configRoot2,
                userId,
                signal,
                deployExpert
              });
              if (["update", "uninstall"].includes(action)) {
                if (workBuddyRunning()) throw Error("WORKBUDDY_RUNNING");
                report = await upgradeWorkBuddy({
                  source,
                  configRoot: configRoot2,
                  userId,
                  action,
                  run: run2
                });
              } else report = await run2();
            } finally {
              if (previousApp === void 0) delete process.env.ASAM_WORKBUDDY_APP;
              else process.env.ASAM_WORKBUDDY_APP = previousApp;
            }
          }
        }
      });
      await checkCancellation();
    } finally {
      log.record({
        phase: "after",
        target: observedPaths,
        profile: harness?.profile,
        state: log.snapshot(observedPaths)
      });
    }
    onIdle?.();
    Object.assign(receipt, {
      status: ["partial", "fail"].includes(report.status) ? "partial" : "completed",
      report
    });
    log.record({
      phase: "finished",
      status: receipt.status,
      exitCode: receipt.status === "completed" ? 0 : 2
    });
    log.writeReceipt(receipt);
    const label = { install: "\u5B89\u88C5", update: "\u5347\u7EA7", uninstall: "\u5378\u8F7D", check: "\u68C0\u67E5" }[action];
    console.log(`${agent} \u4E13\u5BB6${label}${receipt.status === "partial" ? "\u672A\u5B8C\u6210" : "\u5B8C\u6210"}\u3002`);
    if (receipt.status === "partial" && report.message) console.error(report.message);
    if (receipt.status === "partial") console.log(`\u8BE6\u60C5\uFF1A${join15(stage, "INSTALLATION.json")}`);
    else if (["install", "update"].includes(action)) {
      if (harness && harness.profile !== "desktop")
        console.log(`\u8BF7\u4ECE DeepSeek Harness \u547D\u4EE4\u884C\u542F\u52A8\u914D\u7F6E ${harness.profile} \u4F7F\u7528\u4E13\u5BB6\u3002`);
      else console.log(`\u8BF7\u91CD\u65B0\u6253\u5F00 ${agent} \u4F7F\u7528\u4E13\u5BB6\u3002`);
    } else if (action === "uninstall" && harness?.profile === "desktop")
      console.log("\u8BF7\u91CD\u65B0\u6253\u5F00 DeepSeek Harness\uFF0C\u4F7F\u672C\u6B21\u53D8\u66F4\u751F\u6548\u3002");
    if (report.status === "partial" || report.status === "fail") process.exitCode = 2;
    return report;
  } catch (error) {
    Object.assign(receipt, { status: "fail", error: error.stack || error.message });
    log.writeReceipt(receipt);
    throw error;
  } finally {
    if (workStage) {
      progress("cleanup", "\u6B63\u5728\u6E05\u7406\u672C\u6B21\u5B89\u88C5\u7684\u4E34\u65F6\u6587\u4EF6\u2026");
      try {
        rmSync4(workStage, { recursive: true, force: true });
      } catch (error) {
        log.record({
          phase: "work-cleanup",
          status: "failed",
          path: workStage,
          error: error.message
        });
      }
    }
    onIdle?.();
    readline?.close();
    process.removeListener("SIGINT", cancel);
    process.removeListener("SIGTERM", cancel);
  }
}

// ../../../DevCache/workspaces/asam-ui/expert-production-1.0.0-20261120/tools/v2/hosts/online-install-entry.mjs
import { isMainThread, parentPort, workerData } from "node:worker_threads";

// ../../../DevCache/workspaces/asam-ui/expert-production-1.0.0-20261120/tools/v2/hosts/installer-terminal.mjs
import { createInterface as createInterface2, emitKeypressEvents } from "node:readline";
import { createInterface as createStreamInterface } from "node:readline/promises";
import { PassThrough } from "node:stream";
import { finished } from "node:stream/promises";
import { SHARE_ENV, Worker } from "node:worker_threads";

// ../../../DevCache/workspaces/asam-ui/expert-production-1.0.0-20261120/tools/v2/hosts/installer-progress.mjs
import { writeFileSync as writeFileSync9, renameSync as renameSync7, existsSync as existsSync12, unlinkSync as unlinkSync7 } from "node:fs";
import { randomUUID as randomUUID9 } from "node:crypto";
import { channel as channel2 } from "node:diagnostics_channel";
var installerProgressEvents = channel2("asam-ui.installer.progress");
var settledPhases = /* @__PURE__ */ new Set(["complete", "failed", "reused", "tool-ready"]);
var maxPendingOutputBytes = 64 * 1024;
function formatInstallerElapsed(milliseconds) {
  return milliseconds < 1e3 ? `${Math.floor(milliseconds)}ms` : `${(Math.floor((milliseconds + 50) / 100) / 10).toFixed(1)}s`;
}
function installerProgress({
  report = {},
  file: file2,
  stream = process.stderr,
  intervalMs = 3e3
}) {
  const relay = file2 && installerProgressEvents.hasSubscribers;
  let started, timer;
  let closed = false, tick = 0, row = false;
  const openOutputLines = /* @__PURE__ */ new Set();
  const pendingOutput = /* @__PURE__ */ new Map();
  const deferredLines = [];
  const elapsedAt = (at) => Math.max(0, at - started);
  const clearRow = () => {
    if (row) stream.write("\r\x1B[2K");
    row = false;
  };
  const writeStatus = (line) => {
    if (openOutputLines.size) deferredLines.push(line);
    else {
      clearRow();
      stream.write(line + "\n");
    }
  };
  const flushStatus = () => {
    for (const line of deferredLines.splice(0)) stream.write(line + "\n");
  };
  const persist = () => {
    if (!file2) return;
    assertNoLinks(file2);
    const incoming = `${file2}.progress-${randomUUID9()}`;
    writeFileSync9(incoming, JSON.stringify(report, null, "	") + "\n", {
      flag: "wx",
      mode: 384
    });
    try {
      renameSync7(incoming, file2);
    } finally {
      if (existsSync12(incoming)) unlinkSync7(incoming);
    }
  };
  const render = (at, { heartbeat = false, final = false } = {}) => {
    const event = report.progress;
    if (!event) return;
    const active2 = !settledPhases.has(event.phase);
    const elapsed = active2 ? `\uFF08${final ? "\u8017\u65F6" : "\u5DF2\u7528\u65F6"} ${formatInstallerElapsed(elapsedAt(at))}\uFF09` : "";
    let bytes2 = "";
    if (event.phase !== "connecting" && Number.isFinite(event.receivedBytes)) {
      bytes2 = `\uFF08\u5DF2\u4E0B\u8F7D ${event.receivedBytes.toLocaleString("zh-CN")} \u5B57\u8282\uFF09`;
      if (event.totalBytes > 0)
        bytes2 = ` ${Math.min(100, Math.floor(event.receivedBytes * 100 / event.totalBytes))}%\uFF08${event.receivedBytes.toLocaleString("zh-CN")} / ${event.totalBytes.toLocaleString("zh-CN")} \u5B57\u8282\uFF09`;
    }
    const line = `${heartbeat ? ["|", "/", "-", "\\"][tick++ % 4] + " " : ""}${event.message}${bytes2}${elapsed}`;
    if (openOutputLines.size) {
      if (final || !active2) writeStatus(line);
      return;
    }
    clearRow();
    const activeRow = stream.isTTY && active2 && !final;
    stream.write(line + (activeRow ? "" : "\n"));
    row = Boolean(activeRow);
  };
  const refresh = () => {
    try {
      const now = Date.now();
      report.progress.elapsedSeconds = Math.floor(elapsedAt(now) / 1e3);
      report.updatedAt = new Date(now).toISOString();
      persist();
      if (!relay) render(now, { heartbeat: true });
    } catch (error) {
      writeStatus(`\u8FDB\u5EA6\u65E5\u5FD7\u66F4\u65B0\u5931\u8D25\uFF0C\u8BF7\u4FDD\u7559\u73B0\u573A\uFF1A${error.code || error.message}`);
      clearInterval(timer);
    }
  };
  const finish = (at) => {
    clearInterval(timer);
    if (!report.progress || settledPhases.has(report.progress.phase)) return;
    report.progress.elapsedSeconds = Math.floor(elapsedAt(at) / 1e3);
    if (!relay) render(at, { final: true });
  };
  const update = (event) => {
    if (closed) return;
    const now = Date.now();
    const time = new Date(now).toISOString();
    if (report.progress?.phase !== event.phase) {
      finish(event.startedAt ?? now);
      started = event.startedAt ?? now;
      if (!settledPhases.has(event.phase)) {
        timer = setInterval(refresh, intervalMs);
        timer.unref();
      }
      report.stages ||= [];
      report.stages.push({
        phase: event.phase,
        message: event.message,
        startedAt: new Date(started).toISOString()
      });
    }
    report.progress = {
      ...event,
      updatedAt: time,
      elapsedSeconds: Math.floor(elapsedAt(now) / 1e3)
    };
    report.updatedAt = time;
    persist();
    if (relay) installerProgressEvents.publish({ ...event, startedAt: started });
    else if (stream.isTTY || settledPhases.has(event.phase)) render(now);
  };
  const writeOutput = (output, chunk) => {
    if (!stream.isTTY || !output.isTTY || !chunk.length) {
      output.write(chunk);
      return;
    }
    const lastNewline = chunk.lastIndexOf(10);
    let pending = pendingOutput.get(output);
    if (lastNewline >= 0) {
      clearRow();
      if (pending) output.write(Buffer.concat(pending.chunks, pending.bytes));
      output.write(chunk.subarray(0, lastNewline + 1));
      openOutputLines.delete(output);
      pendingOutput.delete(output);
      pending = void 0;
    }
    const tail = chunk.subarray(lastNewline + 1);
    if (tail.length) {
      pending ??= { chunks: [], bytes: 0 };
      if (!openOutputLines.has(output) && pending.bytes + tail.length <= maxPendingOutputBytes) {
        pending.chunks.push(Buffer.from(tail));
        pending.bytes += tail.length;
        pendingOutput.set(output, pending);
      } else {
        clearRow();
        if (pending.bytes) output.write(Buffer.concat(pending.chunks, pending.bytes));
        output.write(tail);
        pendingOutput.delete(output);
        openOutputLines.add(output);
      }
    }
    if (lastNewline >= 0 && !openOutputLines.size) {
      flushStatus();
      if (report.progress && !settledPhases.has(report.progress.phase)) render(Date.now());
    }
  };
  const endOutputLine = () => {
    if (openOutputLines.size) stream.write("\n");
    openOutputLines.clear();
    for (const [output, pending] of pendingOutput) {
      clearRow();
      output.write(Buffer.concat(pending.chunks, pending.bytes));
      output.write("\n");
    }
    pendingOutput.clear();
    flushStatus();
  };
  return {
    update,
    writeOutput,
    writeStatus,
    endOutputLine,
    clear(at = Date.now()) {
      finish(at);
      delete report.progress;
    },
    close() {
      if (closed) return;
      closed = true;
      const now = Date.now();
      endOutputLine();
      finish(now);
      if (relay && report.progress) installerProgressEvents.publish({ endedAt: now });
      persist();
    }
  };
}

// ../../../DevCache/workspaces/asam-ui/expert-production-1.0.0-20261120/tools/v2/hosts/installer-terminal.mjs
function terminalInput(onAnswer, onCancel) {
  const input = process.stdin;
  if (!input.isTTY || typeof input.setRawMode !== "function") return;
  const wasRaw = input.isRaw;
  let editor;
  const closePrompt = () => {
    editor?.close();
    editor = void 0;
  };
  const onKey = (text, key) => {
    if (key.ctrl && key.name === "c") onCancel();
    else editor?.write(text, key);
  };
  emitKeypressEvents(input);
  input.setRawMode(true);
  input.on("keypress", onKey);
  input.resume();
  return {
    ask(prompt) {
      const promptStart = prompt.lastIndexOf("\n") + 1;
      const question = prompt.slice(promptStart);
      editor = createInterface2({
        input: new PassThrough(),
        output: process.stdout.isTTY ? process.stdout : void 0,
        terminal: true,
        historySize: 0
      });
      editor.once("line", (answer) => {
        closePrompt();
        onAnswer(answer.trim());
      });
      editor.setPrompt(question);
      process.stdout.write(prompt);
    },
    closePrompt,
    close() {
      closePrompt();
      input.off("keypress", onKey);
      input.setRawMode(wasRaw);
      input.pause();
    }
  };
}
async function runWindowsInstaller(entry) {
  const progress = installerProgress({});
  const worker = new Worker(entry, {
    argv: process.argv.slice(2),
    workerData: { asamInstaller: true, interactive: Boolean(process.stdin.isTTY) },
    env: SHARE_ENV,
    stdout: true,
    stderr: true
  });
  let input;
  let cancelled = false;
  const cancel = () => {
    if (cancelled) return;
    cancelled = true;
    input?.closePrompt();
    progress.clear();
    progress.writeStatus("\u6B63\u5728\u53D6\u6D88\uFF0C\u7B49\u5F85\u5F53\u524D\u64CD\u4F5C\u5B89\u5168\u7ED3\u675F\u2026");
    worker.postMessage({ type: "cancel" });
  };
  const answer = (text) => worker.postMessage({ type: "answer", text });
  let workerError;
  const ended = new Promise((resolve8) => {
    worker.once("error", (error) => {
      workerError = error;
    });
    worker.once("exit", resolve8);
  });
  try {
    input = terminalInput(answer, cancel);
    const question = !input && process.stdin.isTTY ? createStreamInterface({
      input: process.stdin,
      output: process.stdout,
      terminal: false
    }) : void 0;
    worker.on("message", ({ type, event, prompt, at }) => {
      if (cancelled) return;
      if (type === "progress") progress.update(event);
      if (type === "clear") progress.clear(at);
      if (type === "ask") {
        progress.clear(at);
        progress.endOutputLine();
        if (input) input.ask(prompt);
        else if (question)
          void Promise.resolve(question.question(prompt)).then(answer, cancel);
      }
    });
    for (const [source, output] of [
      [worker.stdout, process.stdout],
      [worker.stderr, process.stderr]
    ]) {
      source.on("data", (chunk) => progress.writeOutput(output, chunk));
    }
    process.on("SIGINT", cancel);
    process.on("SIGTERM", cancel);
    try {
      const [code] = await Promise.all([
        ended,
        finished(worker.stdout, { cleanup: true }),
        finished(worker.stderr, { cleanup: true })
      ]);
      if (workerError) throw workerError;
      return code;
    } finally {
      if (!input) question?.close();
    }
  } finally {
    process.off("SIGINT", cancel);
    process.off("SIGTERM", cancel);
    input?.close();
    progress.close();
  }
}

// ../../../DevCache/workspaces/asam-ui/expert-production-1.0.0-20261120/tools/v2/hosts/installer-message.mjs
function installerMessage(error) {
  const detail = String(error?.code || error?.message || error);
  const code = detail.match(/^[A-Z][A-Z0-9_]+/)?.[0];
  const messages = [
    [
      /NODE_FOREIGN_APPLICATION/,
      "\u4E0D\u80FD\u4F7F\u7528\u5176\u4ED6\u5E94\u7528\u7684\u79C1\u6709 Node\uFF0C\u8BF7\u4F7F\u7528\u5F53\u524D\u5E73\u53F0\u81EA\u5E26 Node \u6216 PATH \u4E2D\u7684\u7CFB\u7EDF Node\u3002"
    ],
    [
      /NODE_22|NODE_RUNTIME/,
      "\u9700\u8981 Node.js 22.19 \u6216\u4EE5\u4E0A\u7684 22.x \u7248\u672C\uFF0C\u8BF7\u5B89\u88C5\u540E\u52A0\u5165 PATH\uFF0C\u518D\u91CD\u65B0\u8FD0\u884C\u3002"
    ],
    [
      /WORKBUDDY_NOT_INSTALLED|WORKBUDDY_APP_/,
      "\u672A\u627E\u5230\u6709\u6548\u7684 WorkBuddy \u5E94\u7528\uFF0C\u8BF7\u68C0\u67E5\u5B89\u88C5\u4F4D\u7F6E\u5E76\u5148\u767B\u5F55\u4E00\u6B21\u3002"
    ],
    [
      /WORKBUDDY_ACCOUNT_UNKNOWN|INVALID_ACCOUNT_SELECTION/,
      "\u8D26\u53F7\u9009\u62E9\u65E0\u6548\uFF0C\u8BF7\u91CD\u65B0\u8FD0\u884C\u5E76\u9009\u62E9\u5F53\u524D\u5DF2\u767B\u5F55\u7684\u8D26\u53F7\u3002"
    ],
    [/WORKBUDDY_ACCOUNT_REQUIRED/, "\u8BF7\u5148\u6253\u5F00 WorkBuddy \u5E76\u767B\u5F55\u4E00\u6B21\uFF0C\u5B8C\u5168\u9000\u51FA\u540E\u518D\u8FD0\u884C\u5B89\u88C5\u5668\u3002"],
    [/WORKBUDDY_ACCOUNT_SELECTION_REQUIRED/, "\u68C0\u6D4B\u5230\u591A\u4E2A\u8D26\u53F7\uFF0C\u8BF7\u91CD\u65B0\u8FD0\u884C\u5E76\u9009\u62E9\u5F53\u524D\u8D26\u53F7\u3002"],
    [/WORKBUDDY_RUNNING|WORKBUDDY_RESTARTED/, "\u8BF7\u5B8C\u5168\u9000\u51FA WorkBuddy\uFF08\u5305\u62EC\u6258\u76D8\uFF09\uFF0C\u7136\u540E\u91CD\u8BD5\u3002"],
    [
      /WORKBUDDY_CACHE_IN_USE/,
      "WorkBuddy \u4E13\u5BB6\u7F13\u5B58\u4ECD\u6709\u4F7F\u7528\u6807\u8BB0\u3002\u8BF7\u5B8C\u5168\u9000\u51FA\u5E94\u7528\u5E76\u91CD\u8BD5\uFF1B\u82E5\u65E5\u5FD7\u4E2D\u7684 PID \u5DF2\u4E0D\u5B58\u5728\u4E14\u6807\u8BB0\u4ECD\u4FDD\u7559\uFF0C\u8BF7\u4EA4\u7531\u7EF4\u62A4\u4EBA\u5458\u6838\u5BF9\u5BBF\u4E3B\u6062\u590D\u6D41\u7A0B\u3002"
    ],
    [/PROCESS_CHECK_FAILED/, "\u65E0\u6CD5\u786E\u8BA4\u5E94\u7528\u662F\u5426\u5DF2\u9000\u51FA\uFF0C\u8BF7\u68C0\u67E5\u8FDB\u7A0B\u72B6\u6001\u540E\u91CD\u8BD5\u3002"],
    [
      /CODEX_CONFIG_INCOMPATIBLE/,
      "\u5F53\u524D Codex CLI \u65E0\u6CD5\u8BFB\u53D6\u73B0\u6709 config.toml\uFF0C\u8BF7\u6838\u5BF9 CLI \u4E0E\u684C\u9762\u7248\u672C\u53CA\u4E0B\u65B9\u914D\u7F6E\u9519\u8BEF\u4F4D\u7F6E\u3002\u5B89\u88C5\u5668\u672A\u4FEE\u6539\u8BE5\u914D\u7F6E\u3002"
    ],
    [
      /CODEX_CLI_REQUIRED|CODEX_CLI_RESPONSE_UNSUPPORTED/,
      "\u672A\u627E\u5230\u652F\u6301\u63D2\u4EF6\u5B89\u88C5\u547D\u4EE4\u7684 Codex CLI\uFF0C\u8BF7\u68C0\u67E5 Codex \u5B89\u88C5\u53CA\u7248\u672C\u3002"
    ],
    [/CODEX_NATIVE_FAILED/, "Codex \u539F\u751F\u547D\u4EE4\u6267\u884C\u5931\u8D25\uFF0C\u8BF7\u67E5\u770B\u4E0B\u65B9\u8BCA\u65AD\u3002"],
    [/GIT_REQUIRED/, "\u672A\u627E\u5230 Git\uFF0C\u8BF7\u5B89\u88C5\u5E76\u52A0\u5165 PATH \u540E\u91CD\u65B0\u8FD0\u884C\u3002"],
    [
      /MODIFIED_CONTENT|MANAGED_SOURCE_CHANGED|INSTALLED_SOURCE_CONFLICT/,
      "\u68C0\u6D4B\u5230\u5DF2\u5B89\u88C5\u6587\u4EF6\u88AB\u4FEE\u6539\uFF0C\u5DF2\u505C\u6B62\u64CD\u4F5C\u5E76\u4FDD\u7559\u539F\u4EF6\uFF0C\u8BF7\u5148\u6838\u5BF9\u4FEE\u6539\u3002"
    ],
    [
      /CONFLICT|UNMANAGED_INSTALLATION|MULTIPLE_INSTALLATIONS/,
      "\u68C0\u6D4B\u5230\u73B0\u6709\u5B89\u88C5\u6216\u914D\u7F6E\u51B2\u7A81\uFF0C\u5DF2\u4FDD\u7559\u539F\u4EF6\uFF0C\u8BF7\u5148\u6838\u5BF9\u5F52\u5C5E\u3002"
    ],
    [
      /STATE_INVALID|PLUGIN_IDENTITY|PACKAGE_REQUIRED|MISMATCH|INCOMPLETE|OUTPUT_EXISTS/,
      "\u5B89\u88C5\u5305\u6216\u5B89\u88C5\u8BB0\u5F55\u6821\u9A8C\u672A\u901A\u8FC7\uFF0C\u8BF7\u4FDD\u7559\u73B0\u573A\u5E76\u4F7F\u7528\u5B8C\u6574\u3001\u5339\u914D\u7684\u5B89\u88C5\u5305\u3002"
    ],
    [
      /SYMLINK|ABSOLUTE_PATH|INDEPENDENT_BACKUP|INVALID_/,
      "\u8DEF\u5F84\u6216\u53C2\u6570\u65E0\u6548\uFF0C\u8BF7\u68C0\u67E5\u7EDD\u5BF9\u8DEF\u5F84\u3001\u94FE\u63A5\u548C\u5B89\u88C5\u53C2\u6570\u3002"
    ],
    [/DISK_SPACE/, "\u5B89\u88C5\u76EE\u5F55\u5269\u4F59\u7A7A\u95F4\u4E0D\u8DB3\uFF0C\u8BF7\u91CA\u653E\u7A7A\u95F4\u540E\u91CD\u8BD5\u3002"],
    [
      /PREVIOUS_INSTALLATION|BUSY|EEXIST/,
      "\u68C0\u6D4B\u5230\u672A\u7ED3\u675F\u7684\u5B89\u88C5\u73B0\u573A\u6216\u6B63\u5728\u6267\u884C\u7684\u4EFB\u52A1\uFF0C\u8BF7\u4FDD\u7559\u65E5\u5FD7\u5E76\u6838\u5BF9\u540E\u91CD\u8BD5\u3002"
    ],
    [/CHANGED/, "\u64CD\u4F5C\u671F\u95F4\u6587\u4EF6\u6216\u914D\u7F6E\u53D1\u751F\u53D8\u5316\uFF0C\u5DF2\u505C\u6B62\u64CD\u4F5C\uFF0C\u8BF7\u6838\u5BF9\u540E\u91CD\u8BD5\u3002"],
    [/OCR_|TOOL_/, "OCR \u5DE5\u5177\u51C6\u5907\u6216\u89C4\u5219\u81EA\u68C0\u672A\u901A\u8FC7\uFF0C\u8BF7\u68C0\u67E5\u7F51\u7EDC\u3001\u5DE5\u5177\u8DEF\u5F84\u53CA\u65E5\u5FD7\u540E\u91CD\u8BD5\u3002"],
    [/EACCES|EPERM/, "\u6CA1\u6709\u8BBF\u95EE\u6240\u9700\u6587\u4EF6\u7684\u6743\u9650\uFF0C\u8BF7\u68C0\u67E5\u76EE\u5F55\u6743\u9650\u540E\u91CD\u8BD5\u3002"]
  ];
  const message = messages.find(([pattern2]) => pattern2.test(detail))?.[1] || "\u64CD\u4F5C\u672A\u5B8C\u6210\uFF0C\u5DF2\u4FDD\u7559\u73B0\u573A\uFF0C\u8BF7\u67E5\u770B\u65E5\u5FD7\u4E2D\u7684\u5177\u4F53\u539F\u56E0\u540E\u91CD\u8BD5\u3002";
  return `${message}${code ? `\uFF08${code}\uFF09` : ""}
\u539F\u59CB\u8BCA\u65AD\uFF1A${detail}`;
}

// ../../../DevCache/workspaces/asam-ui/expert-production-1.0.0-20261120/tools/v2/hosts/online-install-entry.mjs
try {
  if (process.platform === "win32" && isMainThread) {
    process.exitCode = await runWindowsInstaller(new URL(import.meta.url));
  } else if (workerData?.asamInstaller) {
    const controller = new AbortController();
    const onProgress = (event) => parentPort.postMessage(
      event.endedAt === void 0 ? { type: "progress", event: { startedAt: Date.now(), ...event } } : { type: "clear", at: event.endedAt }
    );
    parentPort.on("message", ({ type }) => {
      if (type === "cancel") controller.abort(Error("INSTALL_CANCELLED"));
    });
    const ask = workerData.interactive ? (prompt) => new Promise((resolve8, reject) => {
      const signal = controller.signal;
      const cleanup = () => {
        signal.removeEventListener("abort", abort);
        parentPort.off("message", answer);
      };
      const abort = () => {
        cleanup();
        reject(signal.reason);
      };
      const answer = ({ type, text }) => {
        if (type !== "answer") return;
        cleanup();
        resolve8(text);
      };
      signal.throwIfAborted();
      signal.addEventListener("abort", abort, { once: true });
      parentPort.on("message", answer);
      parentPort.postMessage({ type: "ask", prompt, at: Date.now() });
    }) : void 0;
    installerProgressEvents.subscribe(onProgress);
    try {
      await runOnlineInstall(void 0, {
        ask,
        signal: controller.signal,
        onProgress,
        onIdle: () => parentPort.postMessage({ type: "clear", at: Date.now() })
      });
    } finally {
      installerProgressEvents.unsubscribe(onProgress);
      parentPort.close();
    }
  } else await runOnlineInstall();
} catch (error) {
  const messages = {
    INSTALL_HOST_UNSUPPORTED: "\u8BF7\u9009\u62E9\u5217\u8868\u4E2D\u7684 Agent \u5DE5\u5177\uFF081\u20133\uFF09\u3002",
    INSTALL_ACTION_UNSUPPORTED: "\u8BF7\u9009\u62E9\u5B89\u88C5\u3001\u5347\u7EA7\u3001\u5378\u8F7D\u6216\u53D6\u6D88\u3002",
    CODEX_CLI_REQUIRED: "\u8BF7\u5148\u5B89\u88C5\u652F\u6301\u63D2\u4EF6\u7BA1\u7406\u7684 Codex\uFF0C\u7136\u540E\u91CD\u8BD5\u3002",
    WORKBUDDY_NOT_INSTALLED: "\u8BF7\u5148\u5B89\u88C5\u5E76\u767B\u5F55 WorkBuddy\uFF0C\u5B8C\u5168\u9000\u51FA\u540E\u91CD\u8BD5\u3002",
    WORKBUDDY_RUNNING: "\u8BF7\u5B8C\u5168\u9000\u51FA WorkBuddy\uFF08\u5305\u62EC\u6258\u76D8\uFF09\uFF0C\u7136\u540E\u91CD\u8BD5\u3002",
    WORKBUDDY_RESTARTED_DURING_PREPARATION: "\u8BF7\u5B8C\u5168\u9000\u51FA WorkBuddy\uFF08\u5305\u62EC\u6258\u76D8\uFF09\uFF0C\u7136\u540E\u91CD\u8BD5\u3002",
    HARNESS_STORE_RECOVERY_REQUIRES_MAC_DESKTOP_INSTALL: "\u6B64\u6062\u590D\u9009\u9879\u4EC5\u7528\u4E8E macOS \u4E0A\u7684 DeepSeek Harness \u684C\u9762\u5E94\u7528\u5B89\u88C5\u6216\u5347\u7EA7\u3002",
    ASAM_MCP_ENTRY_CONFLICT: "\u53D1\u73B0\u5DF2\u6709\u540C\u540D MCP \u914D\u7F6E\uFF0C\u5F52\u5C5E\u6216\u5185\u5BB9\u672A\u5339\u914D\uFF0C\u5DF2\u4FDD\u7559\u539F\u72B6\uFF1B\u8BF7\u5148\u6838\u5BF9\u73B0\u6709\u670D\u52A1\u3002",
    RELEASE_SIGNATURE_INVALID: "\u53D1\u884C\u6E05\u5355\u7B7E\u540D\u4E0D\u7B26\uFF0C\u5DF2\u505C\u6B62\uFF1B\u8BF7\u4ECE\u53D7\u4FE1\u4EFB\u7684\u56FA\u5B9A\u7248\u672C\u5165\u53E3\u91CD\u65B0\u53D6\u5F97\u8D44\u6599\u3002",
    RELEASE_HASH_MISMATCH: "\u4E0B\u8F7D\u6216\u79BB\u7EBF\u5305\u7684\u6458\u8981\u4E0D\u7B26\uFF0C\u5DF2\u505C\u6B62\uFF1B\u73B0\u6709\u5B89\u88C5\u4FDD\u6301\u539F\u72B6\u3002",
    RELEASE_PACKAGE_VERSION_MISMATCH: "\u5B89\u88C5\u5305\u4E0E\u53D1\u884C\u6E05\u5355\u8BB0\u5F55\u7684\u7248\u672C\u4E0D\u7B26\uFF0C\u8BF7\u91CD\u65B0\u53D6\u5F97\u56FA\u5B9A\u7248\u672C\u5B89\u88C5\u5305\u3002",
    INSTALL_HOST_PACKAGE_MISMATCH: "\u53D1\u884C\u6E05\u5355\u63D0\u4F9B\u7684\u5B89\u88C5\u5305\u4E0E\u6240\u9009 Agent \u5DE5\u5177\u4E0D\u7B26\uFF0C\u8BF7\u5C06\u5B89\u88C5\u65E5\u5FD7\u4EA4\u7ED9\u7EF4\u62A4\u4EBA\u5458\u6838\u5BF9\u3002",
    RELEASE_SIZE_MISMATCH: "\u4E0B\u8F7D\u6216\u79BB\u7EBF\u5305\u4E0D\u5B8C\u6574\uFF0C\u5DF2\u505C\u6B62\uFF1B\u8BF7\u91CD\u65B0\u4E0B\u8F7D\u540C\u4E00\u56FA\u5B9A\u7248\u672C\u3002",
    RELEASE_PLATFORM_NOT_SUPPORTED: "\u5F53\u524D\u9009\u62E9\u7684 Agent \u5DE5\u5177\u3001\u7CFB\u7EDF\u6216\u67B6\u6784\u6CA1\u6709\u53EF\u7528\u5B89\u88C5\u5305\uFF0C\u8BF7\u67E5\u770B\u652F\u6301\u8868\u3002",
    ASAM_NODE22_REQUIRED: "\u8BF7\u5B89\u88C5 Node.js 22.19 \u6216\u66F4\u9AD8\u7684 22.x \u7248\u672C\uFF0C\u7136\u540E\u91CD\u8BD5\u3002",
    HARNESS_VERSION_UNSUPPORTED: `\u5F53\u524D DeepSeek Harness \u7248\u672C\u5C1A\u672A\u7EB3\u5165\u672C\u5B89\u88C5\u5668\u7684\u517C\u5BB9\u8303\u56F4\u3002\u6B64\u5B89\u88C5\u5668\u7684\u9002\u914D\u76EE\u6807\u4E3A ${supportedHarnessVersions.join("\u3001")}\uFF0C\u8BF7\u4F7F\u7528\u5339\u914D\u7684\u4E13\u5BB6\u53D1\u884C\u5305\u3002`,
    HARNESS_PACKAGE_HOST_VERSION_MISMATCH: "\u4E13\u5BB6\u5305\u4E0E\u5F53\u524D DeepSeek Harness \u7248\u672C\u4E0D\u5339\u914D\u3002\u8BF7\u9009\u62E9\u5339\u914D\u7684\u53D1\u884C\uFF1B\u65E7\u5305\u4E0E\u6062\u590D\u8BB0\u5F55\u5DF2\u4FDD\u7559\u3002",
    HARNESS_TARGET_UNSUPPORTED: "\u8BF7\u9009\u62E9 DeepSeek Harness \u7684\u684C\u9762\u5E94\u7528\u3001\u547D\u4EE4\u884C\u6216\u53D6\u6D88\u3002",
    HARNESS_USE_DESKTOP_TARGET: "\u5982\u9700\u63A5\u5165 DeepSeek Harness \u684C\u9762\u5E94\u7528\uFF0C\u8BF7\u9009\u62E9\u684C\u9762\u5E94\u7528\u9009\u9879\u3002",
    HARNESS_PROFILE_REQUIRED: "\u8BF7\u8F93\u5165\u6709\u6548\u7684 DeepSeek Harness \u547D\u4EE4\u884C\u914D\u7F6E\u540D\u79F0\u3002",
    HARNESS_COMMAND_REQUIRED: "\u8BF7\u63D0\u4F9B DeepSeek Harness \u539F\u751F dsh \u7684\u7EDD\u5BF9\u8DEF\u5F84\u3002",
    HARNESS_DESKTOP_INITIALIZATION_REQUIRED: `\u8BF7\u5148\u6253\u5F00 DeepSeek Harness \u4E00\u6B21\u3002${harnessDesktopQuit}\uFF0C\u7136\u540E\u91CD\u8BD5\u3002`,
    HARNESS_DESKTOP_CLOSE_REQUIRED: `${harnessDesktopQuit}\uFF0C\u7136\u540E\u91CD\u8BD5\u3002`,
    HARNESS_DESKTOP_LAUNCHER_REQUIRED: "\u8BF7\u4F7F\u7528 DeepSeek Harness \u684C\u9762\u5E94\u7528\u81EA\u5E26\u7684 dsh\uFF08Windows \u4E3A dsh.cmd\uFF09\uFF0C\u5B8C\u5168\u9000\u51FA\u540E\u91CD\u8BD5\u3002",
    HARNESS_DESKTOP_STATUS_UNAVAILABLE: `\u6682\u65F6\u65E0\u6CD5\u6838\u5B9E DeepSeek Harness \u662F\u5426\u5DF2\u9000\u51FA\u3002${harnessDesktopQuit}\uFF0C\u7136\u540E\u91CD\u8BD5\u3002`,
    HARNESS_DESKTOP_INSTALLER_BUSY: "\u53E6\u4E00\u9879\u5B89\u88C5\u64CD\u4F5C\u6B63\u5728\u5904\u7406 DeepSeek Harness \u684C\u9762\u914D\u7F6E\u3002\u8BF7\u7B49\u5B83\u7ED3\u675F\u540E\u518D\u8BD5\u3002",
    HARNESS_UNMANAGED_INSTALLATION_PRESERVED: "\u65E0\u6CD5\u6838\u5BF9 DeepSeek Harness \u4E2D\u8FD9\u4EFD\u4E13\u5BB6\u7684\u539F\u5B89\u88C5\u8BB0\u5F55\uFF0C\u5DF2\u505C\u6B62\u64CD\u4F5C\u3002\u8BF7\u4FDD\u7559\u73B0\u6709\u63D2\u4EF6\uFF0C\u5E76\u5C06\u65E5\u5FD7\u4EA4\u7ED9\u7EF4\u62A4\u4EBA\u5458\u6838\u5BF9\u3002",
    HARNESS_STATE_CONFLICT_PRESERVED: "\u53D1\u73B0\u76F8\u4E92\u51B2\u7A81\u7684 DeepSeek Harness \u4E13\u5BB6\u5B89\u88C5\u8BB0\u5F55\uFF0C\u5DF2\u4FDD\u7559\u73B0\u6709\u63D2\u4EF6\u548C\u8BB0\u5F55\u3002\u8BF7\u5C06\u5B89\u88C5\u65E5\u5FD7\u4EA4\u7ED9\u7EF4\u62A4\u4EBA\u5458\u6838\u5BF9\u3002",
    HARNESS_PENDING_CONFLICT_PRESERVED: "\u4E0A\u6B21 DeepSeek Harness \u4E13\u5BB6\u64CD\u4F5C\u7684\u6062\u590D\u8BB0\u5F55\u4E0E\u73B0\u6709\u5B89\u88C5\u4E0D\u4E00\u81F4\u3002\u8BF7\u5C06\u5B89\u88C5\u65E5\u5FD7\u4EA4\u7ED9\u7EF4\u62A4\u4EBA\u5458\u6838\u5BF9\u3002",
    HARNESS_RESUME_INPUT_MISMATCH: "\u4E0A\u6B21 DeepSeek Harness \u4E13\u5BB6\u64CD\u4F5C\u4F7F\u7528\u4E86\u4E0D\u540C\u7684\u5B89\u88C5\u5305\u3002\u8BF7\u7528\u4E0A\u6B21\u7684\u56FA\u5B9A\u7248\u672C\u5165\u53E3\u6062\u590D\u64CD\u4F5C\u3002",
    HARNESS_MODIFIED_CONTENT_PRESERVED: "\u5DF2\u53D1\u73B0\u4E13\u5BB6\u5305\u5185\u7684\u7528\u6237\u4FEE\u6539\uFF0C\u5185\u5BB9\u5DF2\u4FDD\u7559\uFF1B\u8BF7\u5148\u4FDD\u5B58\u5E76\u6838\u5BF9\u5DEE\u5F02\uFF0C\u518D\u66F4\u65B0\u6216\u5378\u8F7D\u3002",
    HARNESS_USER_OVERRIDE_CONFLICT_PRESERVED: "\u6240\u9009 DeepSeek Harness \u914D\u7F6E\u5DF2\u6709\u8BE5\u4E13\u5BB6\u7684\u81EA\u5B9A\u4E49\u8BBE\u7F6E\u3002\u8BF7\u6838\u5BF9\u8BBE\u7F6E\u540E\u91CD\u8BD5\u3002",
    HARNESS_RESUME_INSTALL_REQUIRED: "\u4E0A\u6B21\u5B89\u88C5\u4FDD\u7559\u4E86\u672A\u5B8C\u6210\u4E8B\u52A1\uFF1B\u8BF7\u7528\u540C\u4E00\u7248\u672C\u548C\u8F93\u5165\u91CD\u65B0\u9009\u62E9\u5B89\u88C5\u6216\u66F4\u65B0\u4EE5\u6062\u590D\u3002",
    INSTALL_CANCELLED: "\u64CD\u4F5C\u5DF2\u53D6\u6D88\uFF0C\u5B89\u88C5\u8BB0\u5F55\u548C\u6062\u590D\u8F93\u5165\u5DF2\u4FDD\u7559\u3002",
    EACCES: "\u65E0\u6CD5\u8BBF\u95EE\u5B89\u88C5\u6240\u9700\u7684\u6587\u4EF6\uFF0C\u8BF7\u68C0\u67E5\u76F8\u5173\u76EE\u5F55\u7684\u6743\u9650\u540E\u91CD\u8BD5\u3002",
    EPERM: "\u65E0\u6CD5\u8BBF\u95EE\u5B89\u88C5\u6240\u9700\u7684\u6587\u4EF6\uFF0C\u8BF7\u68C0\u67E5\u76F8\u5173\u76EE\u5F55\u7684\u6743\u9650\u540E\u91CD\u8BD5\u3002",
    ENOSPC: "\u78C1\u76D8\u7A7A\u95F4\u4E0D\u8DB3\uFF0C\u8BF7\u91CA\u653E\u7A7A\u95F4\u540E\u91CD\u8BD5\u3002"
  };
  const [, code, explanation] = error.message.match(/^([A-Z][A-Z0-9_]+)(?::\s*(.*))?$/s) ?? [];
  const localized = explanation && /[\u3400-\u9fff]/u.test(explanation) ? explanation : null;
  const cacheMessage = /^WORKBUDDY_CACHE_/.test(error.code || code || "") ? installerMessage(error) : null;
  const detail = messages[error.code] || messages[code] || cacheMessage || localized || (code ? "\u5B89\u88C5\u5668\u9047\u5230\u5F02\u5E38\uFF0C\u8BF7\u5C06\u5B89\u88C5\u65E5\u5FD7\u4EA4\u7ED9\u7EF4\u62A4\u4EBA\u5458\u6838\u5BF9\u3002" : error.message);
  console.error(`\u5B89\u88C5\u672A\u5B8C\u6210\uFF1A${detail}`);
  if (error.message.includes("ERR_PNPM_UNEXPECTED_STORE"))
    console.error(
      "DeepSeek Harness \u4ECD\u5728\u4F7F\u7528\u65E7\u7684 pnpm \u5B58\u50A8\u76EE\u5F55\u3002\u5982\u679C\u4F60\u5DF2\u786E\u8BA4 macOS \u684C\u9762\u5E94\u7528\u7684\u63D2\u4EF6\u914D\u7F6E\u4E3A\u7A7A\uFF0C\u8BF7\u5148\u5B8C\u6210\u6216\u5378\u8F7D\u4E0A\u6B21\u5B89\u88C5\uFF0C\u518D\u4F7F\u7528 --recover-harness-store \u91CD\u88C5\u3002"
    );
  process.exitCode = 2;
}
