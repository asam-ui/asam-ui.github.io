# 项目识别与安装

## 识别范围

`scripts/inspect-project.mjs` 接受消费 package 的目录，返回 packageManager、祖先 workspace/锁文件候选、声明依赖、已安装关键依赖版本、Vite/入口文件路径和校验摘要。它不执行配置文件、不读 `.env`，也不自动改动工程。工作区中应定位具体应用包后调用，不能把 workspace 根的依赖当作应用已安装。

Vue 2、非 Vue 工程或不满足交付包 peerDependencies 时，不强升整个业务工程；说明实际差异并完成可独立的资料/示例准备。Vue/Vite/Node/包管理器版本以消费项目与固定包的真实约束为准。不要把组件库自身 pnpm 工程约束复制为消费者的强制要求。

## 固定来源

对本次需要补装或按要求升级的包查询 npm 官方 `latest`。例如需要平台 Provider 桥接时，先从 Skill 目录运行：

```sh
node scripts/check-latest.mjs @asam-ui/platform-provider
```

按结果核对 `peerDependencies`、归档 `integrity` 和实际归档中的 `package.json`、运行入口及类型。目标工程满足当期 peer 后，在目标应用包运行 `pnpm add --save-exact --registry=https://registry.npmjs.org/ <输出中的 specifier>`。多个所需包可以一起查询，再按各自查得的版本安装。目录的固定版本用于校验已有安装和对照契约。查到的新版本若尚未入目录，以其归档为准。开发工具确有需要时也查询其独立发布版本，例如 `@asam-ui/mcp`。它无需进入业务应用的运行时依赖。

发布前使用交付者提供的本地 tarball 与 SHA256；可由组件库固定提交执行 `pnpm --filter @asam-ui/ui build` 和 `pnpm --dir packages/ui pack --pack-destination <产物目录>` 生成，生产者记录提交和产物哈希。消费者无需 checkout 组件库。当前 Skill 可随源码提交或本地分发包安装。

按实际包管理器在目标 package 中安装固定 tarball（路径含空格时按当前 shell 引号规则处理）：

```sh
pnpm add --save-exact /absolute/path/asam-ui-ui-0.1.0-alpha.1.tgz
# 或 npm install --save-exact /absolute/path/asam-ui-ui-0.1.0-alpha.1.tgz
# 或 yarn add --exact /absolute/path/asam-ui-ui-0.1.0-alpha.1.tgz
```

不同时执行三条命令。Vue 与 Element Plus 依据 peer 范围保留已有兼容版本，缺失时固定到已验证兼容版本；自动导入才添加兼容的 `unplugin-vue-components`。芋道请求或字典桥接需要时才接入 `@asam-ui/ui-yudao`。平台应用需要桥接现有请求或字典缓存时选 `@asam-ui/platform-provider`。先核宿主已有的 provider 与依赖。

需要图标时独立安装 `@asam-ui/icons-vue`，核对其 exports、声明和归档摘要。安装后运行本 Skill 的 `scripts/inspect-contract.mjs <实际包目录>` 检查交付文件。`--runtime` 会执行已信任包的 ESM。新契约迁移见 [迁移指南](migration.md)。

安装后核对实际解析版本与 lockfile 差异。一个 package 不在 dependencies/devDependencies 重复添加同一依赖；已有版本不兼容时报告具体影响，不用 `--force`、`--legacy-peer-deps` 绕过。包管理器可能更新锁文件，因此先保留基线，不能把所有锁文件变化解释为本 Skill 所需。

`0.1.0-alpha.1` 的已验证固定组合使用 Tiptap 3.31.3；新锁可能把 Vue 适配包的可选菜单扩展解析到 3.31.4，出现真实 peer 冲突。先检查解析树：已有锁满足时不修改；pnpm 11 新项目若命中该冲突，在宿主自己的 `pnpm-workspace.yaml` 合并下列定向约束，保留其他配置与已有 overrides，重装后运行 `pnpm peers check`：

```yaml
overrides:
    '@tiptap/vue-3@3.31.3>@tiptap/extension-bubble-menu': '3.31.3'
    '@tiptap/vue-3@3.31.3>@tiptap/extension-floating-menu': '3.31.3'
```

有此文件的 pnpm 11 项目不要用 `--ignore-workspace`，否则本地 overrides 不生效。其他包管理器使用其支持的定向约束，并核验实际依赖树；不把 pnpm 语法直接写到 npm/yarn 配置，不升级整条依赖线。这是当前固定产物的已观察兼容修正，后续版本重新核对，不全局套用。

## 新项目与已有项目

新 Vue/Vite 项目：使用兼容固定依赖建立应用、tsconfig、Vite Vue 插件和 index.html，再引入独立的 ASAM 示例。已有项目：使用原来的 createApp 实例及其 mount 之前的初始化位置，保留 router/store/其他插件顺序；只新增示例文件并在任务指定页面挂载，不覆盖原 App。

运行前记录现有检查结果或已知诊断；接入后执行原脚本。重复执行必须得到相同配置与依赖图，而不是只做到构建仍能通过。不能靠在 AGENTS 中追加整套消费规范来获得幂等性；用户要求增加入口时仅追加相关 Skill 链接。
