// ../../9a12/asam-ui/tools/v2/hosts/online-install.mjs
import {
  readFileSync as readFileSync2,
  writeFileSync as writeFileSync2,
  mkdirSync as mkdirSync2,
  existsSync as existsSync2,
  realpathSync as realpathSync2,
  readdirSync as readdirSync2
} from "node:fs";
import { mkdtemp } from "node:fs/promises";
import { join as join3, resolve as resolve2, isAbsolute as isAbsolute2, dirname as dirname3, relative as relative2, sep as sep2 } from "node:path";
import { homedir, tmpdir } from "node:os";
import { pathToFileURL as pathToFileURL2 } from "node:url";
import { spawnSync as spawnSync2 } from "node:child_process";
import { createInterface } from "node:readline/promises";
import { createRequire } from "node:module";
import { createHash as createHash3 } from "node:crypto";

// ../../9a12/asam-ui/tools/v2/hosts/release-manifest.mjs
import { createHash, createPublicKey, verify as verifySignature } from "node:crypto";
import { mkdir, open, rename, unlink, readFile, lstat, copyFile } from "node:fs/promises";
import { constants } from "node:fs";
import { dirname, join, basename } from "node:path";
import { randomUUID } from "node:crypto";
function checkedUrl(value, allowHttp) {
  const url = new URL(value);
  if (url.username || url.password || url.hash || url.protocol !== "https:" && !(allowHttp && url.protocol === "http:"))
    throw Error("RELEASE_URL_UNSUPPORTED");
  return url;
}
async function response(url, { allowHttp = false, signal, maxBytes }) {
  let current = checkedUrl(url, allowHttp);
  for (let redirects = 0; redirects <= 3; redirects++) {
    const result = await fetch(current, {
      redirect: "manual",
      signal: AbortSignal.any([AbortSignal.timeout(6e4), ...signal ? [signal] : []])
    });
    if ([301, 302, 303, 307, 308].includes(result.status)) {
      await result.body?.cancel();
      const next = checkedUrl(new URL(result.headers.get("location"), current), allowHttp);
      if (current.protocol === "https:" && next.protocol !== "https:")
        throw Error("RELEASE_REDIRECT_DOWNGRADE");
      current = next;
      continue;
    }
    if (!result.ok) {
      await result.body?.cancel();
      throw Error(`RELEASE_HTTP_${result.status}`);
    }
    if (Number(result.headers.get("content-length")) > maxBytes) {
      await result.body?.cancel();
      throw Error("RELEASE_DOWNLOAD_TOO_LARGE");
    }
    return result;
  }
  throw Error("RELEASE_REDIRECT_LIMIT");
}
async function readBounded(url, options2) {
  const result = await response(url, options2);
  const chunks = [];
  let length = 0;
  for await (const bytes of result.body) {
    length += bytes.length;
    if (length > options2.maxBytes) throw Error("RELEASE_DOWNLOAD_TOO_LARGE");
    chunks.push(bytes);
  }
  return Buffer.concat(chunks);
}
async function loadRelease({ url, publicKey, allowHttp = false, signal } = {}) {
  const options2 = { allowHttp, signal, maxBytes: 1024 * 1024 };
  const bytes = await readBounded(url, options2);
  const signature = await readBounded(`${url}.sig`, { ...options2, maxBytes: 8192 });
  return verifyReleaseBytes(bytes, signature, { publicKey, allowHttp });
}
function verifyReleaseBytes(bytes, signature, { publicKey, allowHttp = false }) {
  if (bytes.length > 1024 * 1024 || signature.length > 8192)
    throw Error("RELEASE_DOWNLOAD_TOO_LARGE");
  const key = createPublicKey(publicKey);
  if (key.asymmetricKeyType !== "rsa" || key.asymmetricKeyDetails.modulusLength < 2048 || !verifySignature(
    "RSA-SHA256",
    bytes,
    key,
    Buffer.from(signature.toString("utf8").trim(), "base64")
  ))
    throw Error("RELEASE_SIGNATURE_INVALID");
  const manifest = JSON.parse(bytes.toString("utf8"));
  if (manifest.schemaVersion !== 1 || !/^[\w.-]{1,80}$/.test(manifest.release ?? "") || !Array.isArray(manifest.artifacts) || !manifest.artifacts.length || manifest.artifacts.length > 100)
    throw Error("RELEASE_MANIFEST_INVALID");
  const identities = /* @__PURE__ */ new Set();
  for (const artifact of manifest.artifacts) {
    const id = `${artifact.host}/${artifact.platform}/${artifact.arch}`;
    if (!["codex", "workbuddy", "harness", "installer"].includes(artifact.host) || !["win32", "darwin", "linux", "any"].includes(artifact.platform) || !["x64", "arm64", "any"].includes(artifact.arch) || identities.has(id) || !Number.isSafeInteger(artifact.bytes) || artifact.bytes <= 0 || artifact.bytes > 512 * 1024 * 1024 || !/^[a-f0-9]{64}$/.test(artifact.sha256 ?? ""))
      throw Error("RELEASE_ARTIFACT_INVALID");
    checkedUrl(artifact.url, allowHttp);
    identities.add(id);
  }
  return { manifest, sha256: createHash("sha256").update(bytes).digest("hex") };
}
async function loadLocalRelease({ directory, publicKey, allowHttp = false }) {
  return verifyReleaseBytes(
    await readFile(join(directory, "release.json")),
    await readFile(join(directory, "release.json.sig")),
    { publicKey, allowHttp }
  );
}
async function copyLocalArtifact(artifact, directory, destination) {
  const name = basename(new URL(artifact.url).pathname);
  if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]*$/.test(name))
    throw Error("RELEASE_LOCAL_FILENAME_UNSUPPORTED");
  const source = join(directory, name);
  const stat = await lstat(source);
  if (!stat.isFile() || stat.isSymbolicLink() || stat.size !== artifact.bytes)
    throw Error("RELEASE_SIZE_MISMATCH");
  const bytes = await readFile(source);
  if (createHash("sha256").update(bytes).digest("hex") !== artifact.sha256)
    throw Error("RELEASE_HASH_MISMATCH");
  await mkdir(dirname(destination), { recursive: true });
  await copyFile(source, destination, constants.COPYFILE_EXCL);
  if (createHash("sha256").update(await readFile(destination)).digest("hex") !== artifact.sha256) {
    await unlink(destination);
    throw Error("RELEASE_HASH_MISMATCH");
  }
  return destination;
}
function selectArtifact(manifest, host, platform = process.platform, arch = process.arch) {
  const matches = manifest.artifacts.filter(
    (entry) => entry.host === host && (entry.platform === platform || entry.platform === "any") && (entry.arch === arch || entry.arch === "any")
  );
  if (matches.length !== 1) throw Error("RELEASE_PLATFORM_NOT_SUPPORTED");
  return matches[0];
}
async function downloadArtifact(artifact, destination, { allowHttp = false, signal } = {}) {
  const result = await response(artifact.url, { allowHttp, signal, maxBytes: artifact.bytes });
  await mkdir(dirname(destination), { recursive: true });
  const incoming = `${destination}.incoming-${randomUUID()}`;
  const file = await open(incoming, "wx", 384);
  const hash2 = createHash("sha256");
  let length = 0;
  try {
    for await (const bytes of result.body) {
      length += bytes.length;
      if (length > artifact.bytes) throw Error("RELEASE_SIZE_MISMATCH");
      hash2.update(bytes);
      await file.writeFile(bytes);
    }
    if (length !== artifact.bytes || hash2.digest("hex") !== artifact.sha256)
      throw Error("RELEASE_HASH_MISMATCH");
    await file.close();
    const target = await open(destination, "wx", 384);
    await target.close();
    try {
      await rename(incoming, destination);
    } catch (error) {
      await unlink(destination);
      throw error;
    }
    return destination;
  } finally {
    await file.close().catch(() => {
    });
    await unlink(incoming).catch((error) => {
      if (error.code !== "ENOENT") throw error;
    });
  }
}

// ../../9a12/asam-ui/tools/v2/hosts/harness-install.mjs
import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  realpathSync,
  readdirSync,
  lstatSync,
  writeFileSync,
  openSync,
  closeSync,
  unlinkSync,
  renameSync
} from "node:fs";
import { join as join2, resolve, isAbsolute, dirname as dirname2, relative, sep } from "node:path";
import { pathToFileURL } from "node:url";
import { spawn, spawnSync } from "node:child_process";
import { randomUUID as randomUUID2, createHash as createHash2 } from "node:crypto";
var packageName = "@asam-ui/dsh-development";
var supportedVersion = "0.2.1-rc.3";
var hash = (bytes) => createHash2("sha256").update(bytes).digest("hex");
var json = (path) => JSON.parse(readFileSync(path, "utf8"));
var write = (path, value) => writeFileSync(path, JSON.stringify(value, null, 2) + "\n", { mode: 384 });
function noLinks(path) {
  for (let current = resolve(path); ; current = dirname2(current)) {
    if (existsSync(current) && lstatSync(current).isSymbolicLink())
      throw Error("HARNESS_STATE_LINK_UNSUPPORTED");
    if (dirname2(current) === current) break;
  }
}
function verifyHarnessPackage(root) {
  const ownership = json(join2(root, "asam-ownership.json"));
  if (ownership.schemaVersion !== 1 || ownership.owner !== packageName || !Array.isArray(ownership.files))
    throw Error("HARNESS_UNKNOWN_PACKAGE");
  const walk = (prefix = "") => readdirSync(join2(root, prefix), { withFileTypes: true }).flatMap((entry) => {
    if (!prefix && ["node_modules", "asam-ownership.json"].includes(entry.name))
      return [];
    if (entry.isSymbolicLink()) throw Error("HARNESS_AUTHORED_LINK_UNSUPPORTED");
    const path = prefix ? `${prefix}/${entry.name}` : entry.name;
    return entry.isDirectory() ? walk(path) : [{ path, sha256: hash(readFileSync(join2(root, path))) }];
  }).sort((a, b) => a.path.localeCompare(b.path));
  const actual = walk();
  if (JSON.stringify(actual) !== JSON.stringify(ownership.files))
    throw Error("HARNESS_MODIFIED_CONTENT_PRESERVED");
  const metadata = json(join2(root, "package.json"));
  if (metadata.name !== packageName || metadata.engines?.dsh !== supportedVersion)
    throw Error("HARNESS_PACKAGE_IDENTITY_MISMATCH");
  return { ownership, metadata, files: actual };
}
async function run(command, args, { env = process.env, signal, onProgress, onProcess, timeoutMs = 3e5 } = {}) {
  signal?.throwIfAborted();
  let executable = command, argv = args;
  if (process.platform === "win32" && /\.(?:cmd|bat)$/i.test(command)) {
    const values = [command, ...args];
    if (values.some((value) => /["%&|<>^!\r\n]/.test(value)))
      throw Error("HARNESS_LAUNCHER_PATH_UNSUPPORTED");
    executable = process.env.ComSpec || "cmd.exe";
    argv = ["/d", "/s", "/c", `"${values.map((value) => `"${value}"`).join(" ")}"`];
  }
  return new Promise((resolveResult, reject) => {
    const child = spawn(executable, argv, {
      env,
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
          spawnSync("taskkill.exe", ["/PID", String(child.pid), "/T", "/F"], {
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
      reject(error);
    });
    child.stdout.on("data", (bytes) => {
      stdout += bytes;
      onProgress?.(bytes.toString());
      if (stdout.length + stderr.length > 4 * 1024 * 1024)
        stop(Error("HARNESS_NATIVE_OUTPUT_LIMIT"));
    });
    child.stderr.on("data", (bytes) => {
      stderr += bytes;
      onProgress?.(bytes.toString());
      if (stdout.length + stderr.length > 4 * 1024 * 1024)
        stop(Error("HARNESS_NATIVE_OUTPUT_LIMIT"));
    });
    child.on("close", (code) => {
      cleanup();
      if (failure || code !== 0)
        reject(
          Error(`HARNESS_NATIVE_FAILED: ${failure?.message || code}
${stderr || stdout}`)
        );
      else resolveResult(stdout);
    });
  });
}
async function requireDesktopClosed(launcher, signal) {
  const command = realpathSync(launcher.command);
  let executable;
  if (process.platform === "win32") {
    const suffix = /[\\/]resources[\\/]runtime[\\/]cli[\\/]bin[\\/]dsh\.cmd$/i;
    if (suffix.test(command))
      executable = join2(command.replace(suffix, ""), "DeepSeek Harness.exe");
  } else if (process.platform === "darwin") {
    const suffix = /\/Resources\/runtime\/cli\/bin\/dsh$/;
    if (suffix.test(command))
      executable = join2(command.replace(suffix, ""), "MacOS/DeepSeek Harness");
  }
  if (!executable || !existsSync(executable)) throw Error("HARNESS_DESKTOP_LAUNCHER_REQUIRED");
  executable = realpathSync(executable);
  const observe = (binary, args, env) => run(binary, args, { signal, env, timeoutMs: 6e4 });
  let running = [];
  try {
    if (process.platform === "win32") {
      const result = await observe(
        join2(
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
function atomic(path, bytes, expected) {
  const current = existsSync(path) ? readFileSync(path) : null;
  if (expected === null ? current !== null : !current?.equals(expected))
    throw Error("HARNESS_STATE_CHANGED");
  const temporary = `${path}.incoming-${randomUUID2()}`;
  writeFileSync(temporary, bytes, { flag: "wx", mode: 384 });
  renameSync(temporary, path);
}
async function runHarnessInstall({
  launcher,
  home,
  profile,
  source,
  archive,
  node22,
  stateRoot,
  action = "install",
  signal,
  onProgress,
  onProcess
}) {
  if (!["install", "update", "uninstall", "rollback", "check"].includes(action))
    throw Error("INSTALL_ACTION_UNSUPPORTED");
  if (!/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,63}$/.test(profile ?? ""))
    throw Error("HARNESS_PROFILE_REQUIRED");
  for (const path of [launcher?.command, home, node22, stateRoot])
    if (typeof path !== "string" || !isAbsolute(path))
      throw Error("HARNESS_ABSOLUTE_PATH_REQUIRED");
  noLinks(home);
  noLinks(stateRoot);
  if (!Array.isArray(launcher.args) || launcher.args.some((value) => typeof value !== "string"))
    throw Error("HARNESS_LAUNCHER_REQUIRED");
  const childEnv = { ...process.env, DSH_HOME: home };
  const native = async (args) => {
    if (profile === "desktop" && (args.includes("add") || args.includes("remove")))
      await requireDesktopClosed(launcher, signal);
    return run(launcher.command, [...launcher.args, ...args], {
      env: childEnv,
      signal,
      onProcess,
      onProgress: args.includes("add") || args.includes("remove") ? onProgress : void 0
    });
  };
  if ((await native(["--version"])).trim() !== supportedVersion)
    throw Error("HARNESS_VERSION_UNSUPPORTED");
  const nodeVersion = (await run(node22, ["--version"], { signal })).trim();
  const [major, minor] = nodeVersion.slice(1).split(".").map(Number);
  if (major !== 22 || minor < 19) throw Error("ASAM_NODE22_REQUIRED");
  const profileRoot = join2(home, "profiles", profile);
  if (profile === "desktop" && !existsSync(join2(profileRoot, "package.json")))
    throw Error(
      "HARNESS_DESKTOP_INITIALIZATION_REQUIRED: \u5148\u542F\u52A8\u684C\u9762\u5E94\u7528\u4E00\u6B21\uFF0C\u5B8C\u5168\u9000\u51FA\u540E\u4F7F\u7528\u684C\u9762\u81EA\u5E26 dsh\u3002"
    );
  if (profile === "desktop" && action !== "check") await requireDesktopClosed(launcher, signal);
  if (existsSync(join2(profileRoot, "package.json"))) {
    await native(["plugin", "--profile", profile, "list", "--depth", "0"]);
    const userPatch = join2(profileRoot, "cordis.patch.yml");
    if (existsSync(userPatch) && /asam-ui-development/.test(readFileSync(userPatch, "utf8")))
      throw Error("HARNESS_USER_OVERRIDE_CONFLICT_PRESERVED");
  }
  const target = join2(profileRoot, "node_modules/@asam-ui/dsh-development");
  const manager = join2(stateRoot, profile);
  const toolSettings = {
    schemaVersion: 1,
    toolsConfigRoot: join2(manager, "tool-settings"),
    cacheRoot: process.env.ASAM_OCR_CACHE_ROOT || join2(stateRoot, "ocr"),
    ...process.env.ASAM_OCR_BINARY ? { binary: process.env.ASAM_OCR_BINARY } : {}
  };
  if (existsSync(manager) && lstatSync(manager).isSymbolicLink())
    throw Error("HARNESS_STATE_LINK_UNSUPPORTED");
  mkdirSync(manager, { recursive: true });
  const lockPath = join2(manager, "installer.lock");
  const lock = openSync(lockPath, "wx");
  try {
    const statePath = join2(manager, "state.json");
    const pendingPath = join2(manager, "pending.json");
    noLinks(statePath);
    noLinks(pendingPath);
    const before = existsSync(statePath) ? readFileSync(statePath) : null;
    const state = before ? JSON.parse(before) : null;
    const pendingBytes = existsSync(pendingPath) ? readFileSync(pendingPath) : null;
    const pending = pendingBytes ? JSON.parse(pendingBytes) : null;
    if (pending) {
      const rel = relative(manager, pending.incoming?.archive ?? manager);
      if (pending.owner !== packageName || pending.home !== resolve(home) || pending.profile !== profile || pending.beforeStateSHA256 !== (before ? hash(before) : null) || !rel || isAbsolute(rel) || rel === ".." || rel.startsWith(`..${sep}`))
        throw Error("HARNESS_PENDING_CONFLICT_PRESERVED");
      noLinks(pending.incoming.archive);
      if (hash(readFileSync(pending.incoming.archive)) !== pending.incoming.archiveSHA256)
        throw Error("HARNESS_PENDING_ARCHIVE_CHANGED");
      if (!["install", "update"].includes(action))
        throw Error("HARNESS_RESUME_INSTALL_REQUIRED");
    }
    if (state && (state.owner !== packageName || state.home !== resolve(home) || state.profile !== profile))
      throw Error("HARNESS_STATE_CONFLICT_PRESERVED");
    if (existsSync(target)) {
      const installed = verifyHarnessPackage(realpathSync(target));
      const owned = [state?.current, pending?.incoming].filter(Boolean).some(
        (record) => installed.metadata.version === record.version && hash(readFileSync(join2(target, "asam-ownership.json"))) === record.ownershipSHA256
      );
      if (!owned) throw Error("HARNESS_UNMANAGED_INSTALLATION_PRESERVED");
    }
    if (action === "check") {
      const bundles = existsSync(join2(profileRoot, "package.json")) ? json(join2(profileRoot, "package.json")).dsh?.profile?.bundles : [];
      return {
        status: !existsSync(target) ? "absent" : Array.isArray(bundles) && bundles.includes(packageName) ? "registered" : "installed-not-enabled-or-unknown",
        profile,
        version: state?.current?.version,
        hostUsability: "\u8BF7\u5728\u76EE\u6807\u5BBF\u4E3B\u65B0\u5BF9\u8BDD\u8C03\u7528 Skill \u4E0E MCP\uFF1B\u767B\u8BB0\u68C0\u67E5\u4E0D\u4EE3\u8868\u771F\u5B9E\u5DE5\u4F5C\u6D41\u901A\u8FC7\u3002"
      };
    }
    if (action === "uninstall") {
      if (!existsSync(target)) return { status: "absent", profile };
      await native(["plugin", "--profile", profile, "remove", packageName]);
      if (existsSync(target)) throw Error("HARNESS_UNINSTALL_INCOMPLETE");
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
      if (!isAbsolute(source ?? "") || hash(readFileSync(join2(source, "asam-ownership.json"))) !== pending.incoming.inputOwnershipSHA256 || pending.incoming.node22 !== realpathSync(node22))
        throw Error("HARNESS_RESUME_INPUT_MISMATCH");
      verifyHarnessPackage(source);
      incoming = pending.incoming;
    } else if (action === "rollback") {
      incoming = state?.previous;
      if (!incoming || hash(readFileSync(incoming.archive)) !== incoming.archiveSHA256)
        throw Error("HARNESS_ROLLBACK_INPUT_REQUIRED");
    } else {
      if (!isAbsolute(source ?? "") || !isAbsolute(archive ?? ""))
        throw Error("HARNESS_SOURCE_REQUIRED");
      noLinks(source);
      noLinks(archive);
      const accepted = verifyHarnessPackage(source);
      const { prepareTool, nativeCandidates } = await import(pathToFileURL(join2(source, "tools/v2/hosts/ocr-tool.mjs")));
      const prepared = await prepareTool({
        cacheRoot: toolSettings.cacheRoot,
        candidates: [
          ...toolSettings.binary ? [toolSettings.binary] : [],
          ...nativeCandidates()
        ],
        downloadTimeoutMs: 6e5,
        allowDownload: process.env.ASAM_INSTALL_ALLOW_DOWNLOAD !== "0",
        preferMirror: true,
        signal
      });
      if (prepared.status !== "pass")
        throw Error(`HARNESS_OCR_PREPARATION_${prepared.code || prepared.status}`);
      toolSettings.binary = prepared.binary;
      if (existsSync(target) && state?.current?.inputOwnershipSHA256 === hash(readFileSync(join2(source, "asam-ownership.json"))) && state.current.node22 === realpathSync(node22) && JSON.stringify(state.current.toolSettings) === JSON.stringify(toolSettings))
        return { status: "unchanged", profile, version: accepted.metadata.version };
      const staging = join2(manager, randomUUID2());
      mkdirSync(staging);
      cpSync(source, join2(staging, "package"), { recursive: true });
      const local = join2(staging, "package");
      const patch = `- insert:
    - id: asam-ui-development
      name: '${packageName}'
      config:
        node: ${JSON.stringify(realpathSync(node22))}
`;
      writeFileSync(join2(local, "cordis.patch.yml"), patch);
      write(join2(local, "harness-runtime.json"), toolSettings);
      const owner = json(join2(local, "asam-ownership.json"));
      owner.files.find((file) => file.path === "cordis.patch.yml").sha256 = hash(
        Buffer.from(patch)
      );
      owner.files.push({
        path: "harness-runtime.json",
        sha256: hash(readFileSync(join2(local, "harness-runtime.json")))
      });
      owner.files.sort((a, b) => a.path.localeCompare(b.path));
      write(join2(local, "asam-ownership.json"), owner);
      verifyHarnessPackage(local);
      const localArchive = join2(staging, "plugin.tgz");
      const tar = process.platform === "win32" && process.env.SystemRoot ? join2(process.env.SystemRoot, "System32/tar.exe") : "tar";
      await run(tar, ["-czf", localArchive, "-C", staging, "package"], { signal });
      incoming = {
        toolSettings,
        version: accepted.metadata.version,
        node22: realpathSync(node22),
        archive: localArchive,
        archiveSHA256: hash(readFileSync(localArchive)),
        inputArchiveSHA256: hash(readFileSync(archive)),
        inputOwnershipSHA256: hash(readFileSync(join2(source, "asam-ownership.json"))),
        ownershipSHA256: hash(readFileSync(join2(local, "asam-ownership.json")))
      };
    }
    const journalBytes = pendingBytes ?? Buffer.from(
      JSON.stringify(
        {
          owner: packageName,
          home: resolve(home),
          profile,
          beforeStateSHA256: before ? hash(before) : null,
          incoming
        },
        null,
        2
      ) + "\n"
    );
    if (!pendingBytes) writeFileSync(pendingPath, journalBytes, { flag: "wx", mode: 384 });
    if (before)
      writeFileSync(join2(manager, `state-before-${randomUUID2()}.json`), before, {
        flag: "wx",
        mode: 384
      });
    try {
      await native([
        "plugin",
        "--profile",
        profile,
        "add",
        incoming.archive,
        "--ignore-scripts"
      ]);
      verifyHarnessPackage(realpathSync(target));
      if (hash(readFileSync(join2(target, "asam-ownership.json"))) !== incoming.ownershipSHA256)
        throw Error("HARNESS_INSTALLED_HASH_MISMATCH");
    } catch (error) {
      if (!signal?.aborted && state?.current && hash(readFileSync(state.current.archive)) === state.current.archiveSHA256)
        await native([
          "plugin",
          "--profile",
          profile,
          "add",
          state.current.archive,
          "--ignore-scripts"
        ]);
      throw error;
    }
    atomic(
      statePath,
      Buffer.from(
        JSON.stringify(
          {
            owner: packageName,
            home: resolve(home),
            profile,
            current: incoming,
            previous: state?.current ?? null
          },
          null,
          2
        ) + "\n"
      ),
      before
    );
    if (!readFileSync(pendingPath).equals(journalBytes))
      throw Error("HARNESS_JOURNAL_CHANGED_PRESERVED");
    unlinkSync(pendingPath);
    return {
      status: action === "rollback" ? "rolled-back" : "registered",
      profile,
      version: incoming.version,
      hostUsability: "pending-real-host-check"
    };
  } finally {
    closeSync(lock);
    unlinkSync(lockPath);
  }
}

// ../../9a12/asam-ui/tools/v2/hosts/online-install.mjs
function options(argv) {
  const parsed = {};
  const boolean = /* @__PURE__ */ new Set(["allow-http-test"]);
  const allowed = /* @__PURE__ */ new Set([
    "manifest",
    "public-key-file",
    "host",
    "action",
    "codex-binary",
    "config-root",
    "user-id",
    "dsh-command",
    "dsh-entry",
    "dsh-home",
    "profile",
    "state-root",
    "rollback-manifest",
    "offline-dir",
    ...boolean
  ]);
  for (let index = 0; index < argv.length; index++) {
    const name = argv[index].replace(/^--/, "");
    if (!argv[index].startsWith("--") || !allowed.has(name) || parsed[name] !== void 0)
      throw Error(`INSTALL_OPTION_UNSUPPORTED: ${argv[index]}`);
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
  const result = spawnSync2(process.platform === "win32" ? "where.exe" : "which", [name], {
    encoding: "utf8",
    timeout: 1e4,
    windowsHide: true
  });
  return result.status === 0 ? result.stdout.split(/\r?\n/).find(
    (path) => path && isAbsolute2(path) && (process.platform !== "win32" || /\.(exe|cmd|bat)$/i.test(path))
  ) : void 0;
}
function detectCodexBinary() {
  const command = findCommand("codex");
  if (!command || process.platform !== "win32" || /\.exe$/i.test(command)) return command;
  const pnpm = findCommand("pnpm");
  const roots = [];
  if (pnpm && !/["%&|<>^!\r\n]/.test(pnpm)) {
    const result = spawnSync2(
      process.env.ComSpec || "cmd.exe",
      ["/d", "/s", "/c", `""${pnpm}" root -g"`],
      { encoding: "utf8", timeout: 1e4, windowsHide: true, windowsVerbatimArguments: true }
    );
    const global = result.stdout?.trim();
    if (result.status === 0 && isAbsolute2(global) && existsSync2(global)) {
      roots.push(join3(global, "@openai/codex"), join3(global, "node_modules/@openai/codex"));
      for (const entry of readdirSync2(global, { withFileTypes: true }).slice(0, 100))
        if (entry.isDirectory())
          roots.push(join3(global, entry.name, "node_modules/@openai/codex"));
    }
  }
  const triples = { x64: "x86_64-pc-windows-msvc", arm64: "aarch64-pc-windows-msvc" };
  const nativeIn = (root) => {
    if (!existsSync2(join3(root, "package.json"))) return void 0;
    root = realpathSync2(root);
    let vendor = join3(root, "vendor");
    try {
      const require2 = createRequire(join3(root, "package.json"));
      vendor = join3(
        dirname3(require2.resolve(`@openai/codex-win32-${process.arch}/package.json`)),
        "vendor"
      );
    } catch {
    }
    const native = join3(vendor, triples[process.arch] || "unsupported", "bin/codex.exe");
    return existsSync2(native) ? native : void 0;
  };
  const installed = [
    ...new Set(
      roots.filter((root) => existsSync2(join3(root, "package.json"))).map(nativeIn).filter(Boolean).map((path) => realpathSync2(path))
    )
  ];
  if (installed.length === 1) return installed[0];
  if (installed.length > 1) return void 0;
  return nativeIn(join3(dirname3(command), "node_modules/@openai/codex"));
}
function extract(archive, directory) {
  const tar = process.platform === "win32" && process.env.SystemRoot ? join3(process.env.SystemRoot, "System32/tar.exe") : "tar";
  const invoke = (args) => {
    const result = spawnSync2(tar, args, {
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
  mkdirSync2(directory);
  invoke(["-xzf", archive, "-C", directory, "--no-same-owner", "--no-same-permissions"]);
  return join3(directory, "package");
}
async function runOnlineInstall(argv = process.argv.slice(2)) {
  const input = options(argv);
  const [major, minor] = process.versions.node.split(".").map(Number);
  if (major !== 22 || minor < 19) throw Error("ASAM_NODE22_REQUIRED");
  if (!input.manifest && !input["offline-dir"] || !input["public-key-file"])
    throw Error("SIGNED_RELEASE_INPUT_REQUIRED");
  const publicKey = readFileSync2(input["public-key-file"], "utf8");
  const allowHttp = input["allow-http-test"] === true;
  const controller = new AbortController();
  const signal = controller.signal;
  const cancel = () => controller.abort(Error("INSTALL_CANCELLED"));
  process.once("SIGINT", cancel);
  process.once("SIGTERM", cancel);
  let host = input.host, action = input.action;
  let readline;
  let stage;
  const receipt = { schemaVersion: 1, startedAt: (/* @__PURE__ */ new Date()).toISOString(), status: "running" };
  const ask = async (prompt) => {
    if (!process.stdin.isTTY)
      throw Error("INSTALL_SELECTION_REQUIRED: \u8BF7\u901A\u8FC7 --host \u4E0E --action \u6307\u5B9A\u5BBF\u4E3B\u53CA\u64CD\u4F5C\u3002");
    readline ??= createInterface({ input: process.stdin, output: process.stdout });
    return (await readline.question(prompt, { signal })).trim();
  };
  try {
    const detected = {
      codex: detectCodexBinary(),
      workbuddy: existsSync2(join3(homedir(), ".workbuddy")) ? "\u5DF2\u53D1\u73B0\u914D\u7F6E\uFF0C\u8BF7\u6838\u5BF9\u5F53\u524D\u767B\u5F55\u8D26\u6237" : void 0,
      harness: findCommand("dsh")
    };
    if (!host) {
      console.log("ASAM UI \u5F00\u53D1\u4E13\u5BB6\uFF1A\u5F00\u53D1\u9875\u9762\u3001\u53EA\u68C0\u67E5\u3001\u68C0\u67E5\u5E76\u4FEE\u590D\u3002");
      console.log(
        Object.entries(detected).map(([name, found]) => `${name}: ${found || "\u672A\u81EA\u52A8\u53D1\u73B0\uFF0C\u53EF\u624B\u52A8\u6307\u5B9A"}`).join("\n")
      );
      host = { 1: "codex", 2: "workbuddy", 3: "harness" }[await ask("\u9009\u62E9\u5BBF\u4E3B\uFF1A1 Codex / 2 WorkBuddy / 3 DeepSeek Harness\uFF1A")];
    }
    if (!["codex", "workbuddy", "harness"].includes(host))
      throw Error("INSTALL_HOST_UNSUPPORTED");
    if (!action)
      action = { 1: "install", 2: "update", 3: "check", 4: "uninstall", 5: "rollback" }[await ask("\u9009\u62E9\u64CD\u4F5C\uFF1A1 \u5B89\u88C5 / 2 \u66F4\u65B0 / 3 \u68C0\u67E5 / 4 \u5378\u8F7D / 5 \u56DE\u9000\uFF1A")];
    if (!["install", "update", "check", "uninstall", "rollback"].includes(action))
      throw Error("INSTALL_ACTION_UNSUPPORTED");
    stage = await mkdtemp(join3(tmpdir(), "asam-expert-install-"));
    Object.assign(receipt, { stage, host, action });
    if (action === "rollback" && host !== "harness" && !input["rollback-manifest"] && !input["offline-dir"])
      input["rollback-manifest"] = await ask("\u8F93\u5165\u8981\u56DE\u9000\u7684\u56FA\u5B9A\u7248\u672C\u53D1\u884C\u6E05\u5355 HTTPS \u5730\u5740\uFF1A");
    const releaseUrl = input["rollback-manifest"] || input.manifest;
    const release = input["offline-dir"] ? await loadLocalRelease({
      directory: resolve2(input["offline-dir"]),
      publicKey,
      allowHttp
    }) : await loadRelease({ url: releaseUrl, publicKey, allowHttp, signal });
    const artifact = selectArtifact(release.manifest, host);
    Object.assign(receipt, {
      release: release.manifest.release,
      manifestSHA256: release.sha256,
      artifactSHA256: artifact.sha256
    });
    if (artifact.format !== "tar.gz") throw Error("INSTALL_ARCHIVE_FORMAT_UNSUPPORTED");
    console.log(`\u53D1\u884C\u7248\u672C\uFF1A${release.manifest.release}\uFF1B\u5BBF\u4E3B\uFF1A${host}\uFF1B\u64CD\u4F5C\uFF1A${action}`);
    const archive = input["offline-dir"] ? await copyLocalArtifact(
      artifact,
      resolve2(input["offline-dir"]),
      join3(stage, "expert.tgz")
    ) : await downloadArtifact(artifact, join3(stage, "expert.tgz"), { allowHttp, signal });
    const source = extract(archive, join3(stage, "unpacked"));
    signal.throwIfAborted();
    let report;
    if (host === "harness") {
      let profile = input.profile;
      if (!profile)
        profile = await ask(
          "Harness profile \u540D\u79F0\uFF08\u684C\u9762\u586B desktop\uFF1B\u987B\u5148\u542F\u52A8\u4E00\u6B21\u5E76\u5B8C\u5168\u9000\u51FA\uFF0C\u4F7F\u7528\u684C\u9762\u81EA\u5E26 dsh\uFF09\uFF1A"
        );
      const command = input["dsh-command"] || detected.harness;
      if (!command || !isAbsolute2(command))
        throw Error(
          "HARNESS_COMMAND_REQUIRED: \u5728\u684C\u9762\u83DC\u5355 Manage dsh Command \u5B89\u88C5\u547D\u4EE4\uFF0C\u6216\u6307\u5B9A\u7EDD\u5BF9\u8DEF\u5F84\u3002"
        );
      report = await runHarnessInstall({
        launcher: {
          command,
          args: input["dsh-entry"] ? [resolve2(input["dsh-entry"])] : []
        },
        home: resolve2(input["dsh-home"] || process.env.DSH_HOME || join3(homedir(), ".dsh")),
        profile,
        source,
        archive,
        node22: realpathSync2(process.execPath),
        stateRoot: resolve2(input["state-root"] || join3(homedir(), ".asam-ui/harness")),
        action,
        signal,
        onProgress: (text) => process.stderr.write(text)
      });
      if (profile === "desktop" && action !== "check")
        console.log(
          "Desktop \u4E13\u5BB6\u64CD\u4F5C\u5DF2\u5B8C\u6210\u3002\u8BF7\u91CD\u65B0\u6253\u5F00 DeepSeek Harness\uFF0C\u4F7F\u672C\u6B21\u53D8\u66F4\u751F\u6548\u3002"
        );
    } else {
      const tools = join3(source, "tools/v2/hosts");
      const { verify } = await import(pathToFileURL2(join3(tools, "lifecycle.mjs")));
      if (verify(source).host !== host) throw Error("INSTALL_HOST_PACKAGE_MISMATCH");
      if (host === "codex") {
        const binary = input["codex-binary"] || process.env.ASAM_CODEX_BINARY || detected.codex;
        if (!binary) throw Error("CODEX_CLI_REQUIRED");
        if (action === "check") {
          const config = resolve2(
            input["config-root"] || process.env.CODEX_HOME || join3(homedir(), ".codex")
          );
          const statePath = join3(config, "asam-ui/installer-state.json");
          if (!existsSync2(config)) report = { status: "absent" };
          else {
            const listed = spawnSync2(binary, ["plugin", "list", "--json"], {
              env: { ...process.env, CODEX_HOME: config },
              encoding: "utf8",
              timeout: 3e4,
              windowsHide: true
            });
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
            if (selected.length > 1) throw Error("CODEX_MULTIPLE_INSTALLATIONS");
            if (!selected.length) report = { status: "absent" };
            else if (!existsSync2(statePath))
              report = {
                status: "unmanaged-preserved",
                hostUsability: "requires-source-review"
              };
            else {
              const state = JSON.parse(readFileSync2(statePath, "utf8"));
              if (state.schemaVersion !== 1 || state.owner !== "asam-ui-development" || typeof state.root !== "string" || !isAbsolute2(state.root) || !/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(
                selected[0].version || ""
              ) || selected[0].version !== state.version)
                throw Error("CODEX_INSTALLED_STATE_CONFLICT");
              const rel = relative2(join3(config, "asam-ui/marketplaces"), state.root);
              if (!rel || isAbsolute2(rel) || rel === ".." || rel.startsWith(`..${sep2}`))
                throw Error("CODEX_INSTALLED_SOURCE_CONFLICT");
              verify(join3(state.root, "codex/asam-ui-development"));
              verify(
                join3(
                  config,
                  "plugins/cache/asam-ui-local/asam-ui-development",
                  selected[0].version
                )
              );
              const expectedOwnership = state.ownershipSHA256;
              for (const base of [
                join3(state.root, "codex/asam-ui-development"),
                join3(
                  config,
                  "plugins/cache/asam-ui-local/asam-ui-development",
                  selected[0].version
                )
              ])
                if (createHash3("sha256").update(readFileSync2(join3(base, "ownership.json"))).digest("hex") !== expectedOwnership)
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
          const { runCodexOneClick } = await import(pathToFileURL2(join3(tools, "codex-oneclick.mjs")));
          report = await runCodexOneClick({
            source,
            binary: resolve2(binary),
            codexHome: input["config-root"] ? resolve2(input["config-root"]) : void 0,
            action: action === "uninstall" ? "uninstall" : "install"
          });
        }
      } else {
        const { runOneClick, runUninstall, detectUserIds, chooseUserId } = await import(pathToFileURL2(join3(tools, "oneclick.mjs")));
        const configRoot = resolve2(
          input["config-root"] || process.env.WORKBUDDY_CONFIG_DIR || join3(homedir(), ".workbuddy")
        );
        const userId = chooseUserId(detectUserIds(configRoot), input["user-id"]);
        if (action === "check") {
          const installed = join3(
            configRoot,
            "plugins/marketplaces/my-experts/plugins/asam-ui-development"
          );
          report = existsSync2(installed) ? {
            status: "files-present",
            host: verify(installed).host,
            hostUsability: "pending-real-host-check"
          } : { status: "absent" };
        } else
          report = action === "uninstall" ? runUninstall({ base: source, configRoot, userId }) : await runOneClick({ base: source, configRoot, userId });
      }
    }
    Object.assign(receipt, {
      status: ["partial", "fail"].includes(report.status) ? "partial" : "completed",
      report
    });
    writeFileSync2(join3(stage, "INSTALLATION.json"), JSON.stringify(receipt, null, 2) + "\n");
    console.log(
      JSON.stringify(
        {
          release: release.manifest.release,
          manifestSHA256: release.sha256,
          stage,
          report
        },
        null,
        2
      )
    );
    if (report.status === "partial" || report.status === "fail") process.exitCode = 2;
    return report;
  } catch (error) {
    Object.assign(receipt, { status: "fail", error: error.stack || error.message });
    if (stage) {
      writeFileSync2(
        join3(stage, "INSTALLATION.json"),
        JSON.stringify(receipt, null, 2) + "\n"
      );
      console.error(`\u8BE6\u60C5\uFF1A${join3(stage, "INSTALLATION.json")}`);
    }
    throw error;
  } finally {
    readline?.close();
    process.removeListener("SIGINT", cancel);
    process.removeListener("SIGTERM", cancel);
  }
}

// ../../9a12/asam-ui/tools/v2/hosts/online-install-entry.mjs
try {
  await runOnlineInstall();
} catch (error) {
  const messages = {
    RELEASE_SIGNATURE_INVALID: "\u53D1\u884C\u6E05\u5355\u7B7E\u540D\u4E0D\u7B26\uFF0C\u5DF2\u505C\u6B62\uFF1B\u8BF7\u4ECE\u53D7\u4FE1\u4EFB\u7684\u56FA\u5B9A\u7248\u672C\u5165\u53E3\u91CD\u65B0\u53D6\u5F97\u8D44\u6599\u3002",
    RELEASE_HASH_MISMATCH: "\u4E0B\u8F7D\u6216\u79BB\u7EBF\u5305\u7684\u6458\u8981\u4E0D\u7B26\uFF0C\u5DF2\u505C\u6B62\uFF1B\u73B0\u6709\u5B89\u88C5\u4FDD\u6301\u539F\u72B6\u3002",
    RELEASE_SIZE_MISMATCH: "\u4E0B\u8F7D\u6216\u79BB\u7EBF\u5305\u4E0D\u5B8C\u6574\uFF0C\u5DF2\u505C\u6B62\uFF1B\u8BF7\u91CD\u65B0\u4E0B\u8F7D\u540C\u4E00\u56FA\u5B9A\u7248\u672C\u3002",
    RELEASE_PLATFORM_NOT_SUPPORTED: "\u672C\u53D1\u884C\u6CA1\u6709\u5F53\u524D\u5BBF\u4E3B\u3001\u7CFB\u7EDF\u6216\u67B6\u6784\u7684\u53EF\u7528\u4EA7\u7269\uFF0C\u8BF7\u67E5\u770B\u652F\u6301\u8868\u6216\u9009\u62E9\u5176\u4ED6\u5BBF\u4E3B\u3002",
    ASAM_NODE22_REQUIRED: "\u8BF7\u51C6\u5907\u72EC\u7ACB\u7684 Node.js >=22.19 <23\uFF1BHarness Host \u4F7F\u7528\u81EA\u5DF1\u7684\u8FD0\u884C\u65F6\u3002",
    HARNESS_VERSION_UNSUPPORTED: "\u6B64\u4E13\u5BB6\u5305\u53EA\u9A8C\u8BC1\u4E86 Harness 0.2.1-rc.3\u3002\u8BF7\u6838\u5BF9\u7248\u672C\u5E76\u9009\u62E9\u5339\u914D\u7684\u53D1\u884C\uFF0C\u5B89\u88C5\u5668\u4E0D\u4F1A\u5347\u7EA7\u5BBF\u4E3B\u3002",
    HARNESS_DESKTOP_CLOSE_REQUIRED: "\u8BF7\u4ECE DeepSeek Harness \u5E94\u7528\u83DC\u5355\u5B8C\u5168\u9000\u51FA Desktop\uFF0C\u518D\u6267\u884C\u672C\u64CD\u4F5C\uFF1B\u5B8C\u6210\u540E\u91CD\u65B0\u6253\u5F00\u5E94\u7528\u3002\u5B89\u88C5\u5668\u4E0D\u4F1A\u4EE3\u4F60\u5173\u95ED\u5E94\u7528\u3002",
    HARNESS_DESKTOP_LAUNCHER_REQUIRED: "\u8BF7\u4F7F\u7528\u5DF2\u5B89\u88C5 Desktop \u7684 resources/runtime/cli/bin/dsh\uFF08Windows \u4E3A dsh.cmd\uFF09\uFF0C\u5B8C\u5168\u9000\u51FA\u5E94\u7528\u540E\u91CD\u8BD5\u3002",
    HARNESS_DESKTOP_STATUS_UNAVAILABLE: "\u6682\u65F6\u65E0\u6CD5\u6838\u5B9E Desktop \u662F\u5426\u5DF2\u9000\u51FA\uFF0C\u5C1A\u672A\u6539\u52A8\u4E13\u5BB6\u5B89\u88C5\uFF1B\u8BF7\u786E\u8BA4\u5E94\u7528\u5DF2\u5B8C\u5168\u9000\u51FA\u540E\u91CD\u8BD5\u3002",
    HARNESS_MODIFIED_CONTENT_PRESERVED: "\u5DF2\u53D1\u73B0\u4E13\u5BB6\u5305\u5185\u7684\u7528\u6237\u4FEE\u6539\uFF0C\u5185\u5BB9\u5DF2\u4FDD\u7559\uFF1B\u8BF7\u5148\u4FDD\u5B58\u5E76\u6838\u5BF9\u5DEE\u5F02\uFF0C\u518D\u66F4\u65B0\u6216\u5378\u8F7D\u3002",
    HARNESS_USER_OVERRIDE_CONFLICT_PRESERVED: "\u76EE\u6807 profile \u5DF2\u6709\u672C\u4E13\u5BB6\u7684\u7528\u6237\u8986\u76D6\u914D\u7F6E\uFF0C\u5DF2\u4FDD\u7559\uFF1B\u8BF7\u6838\u5BF9\u5F52\u5C5E\u4E0E\u5DEE\u5F02\u540E\u7EE7\u7EED\u3002",
    HARNESS_RESUME_INSTALL_REQUIRED: "\u4E0A\u6B21\u5B89\u88C5\u4FDD\u7559\u4E86\u672A\u5B8C\u6210\u4E8B\u52A1\uFF1B\u8BF7\u7528\u540C\u4E00\u7248\u672C\u548C\u8F93\u5165\u91CD\u65B0\u9009\u62E9\u5B89\u88C5\u6216\u66F4\u65B0\u4EE5\u6062\u590D\u3002",
    INSTALL_CANCELLED: "\u64CD\u4F5C\u5DF2\u53D6\u6D88\uFF0C\u5B89\u88C5\u8BB0\u5F55\u548C\u6062\u590D\u8F93\u5165\u5DF2\u4FDD\u7559\u3002"
  };
  console.error(`\u5B89\u88C5\u672A\u5B8C\u6210\uFF1A${messages[error.message] || error.message}`);
  process.exitCode = 2;
}
