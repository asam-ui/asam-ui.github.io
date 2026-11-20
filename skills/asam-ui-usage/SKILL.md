---
name: asam-ui-usage
description: 在消费项目中安装和使用 ASAM UI Vue 组件库，识别现有工程、配置手动或自动导入及全量注册、样式与数据 provider，并验证接入。用于业务项目消费组件，不用于维护组件库源码。
---

# ASAM UI 消费接入

在用户指定的 Vue 项目中完成接入。此 Skill 与组件库维护用的 `asam-ui-component` 分开；不要求消费者安装仓库工作流、JEV 或 MCP。

## 先识别，再改动

先把任务拆成独立能力，再查[共享包与能力目录](references/ecosystem.json)。首批覆盖基础 UI、Pro、芋道适配、Platform Provider 和图标。目录记录已核验版本、公开入口、归档摘要、peer 和发布状态，其中 `latest` 是维护时的快照。专家工具可用时，通过 `agent_discover` 的 `ecosystem: true` 查能力，再用实际能力 ID 和工程路径核对复用或补装。

例如字典筛选与图标分别核对 UI 的字典入口和图标包。芋道项目需要桥接时再评估芋道适配。检查启动文件中实际调用的 `provideAsamData`，包括启动入口直接调用的本地 `async bootstrap()`。已有注册先核能否提供本次数据。匹配返回 `review-lock` 时，先核对清单声明、对应 pnpm importer 和实际安装，冻结锁检查通过后再补装。目录中的 `pending` 需要已授权的固定归档或已确认的正式发布。遇到版本冲突先保留现有依赖，逐项核实可用能力。确认生态内缺少适用能力后，再评估第三方方案或自行实现。

1. 读目标项目适用的 `AGENTS.md` 和 Git 状态，保留用户改动。运行 `node <本 Skill 目录>/scripts/inspect-project.mjs <项目目录>`，再核对目标 package、workspace、锁文件、包管理器版本、Vue/Vite 及真实脚本。脚本只读，不证明依赖兼容。多锁文件或 packageManager 冲突先定位实际使用者，不能擅自删锁或切换包管理器。
2. 读取 [接入流程](references/integration.md)。检查已有入口、Vite plugins、样式、全局组件、provider 和挂载顺序。已有 Vue/Vite 配置必须合并；不替换 App、路由、store、插件数组或用户 AGENTS。新项目才按用户选定工具建立最小入口。
3. 先给出具体文件与依赖差异，再执行已授权的接入。每次任务按实际能力运行 `node <本 Skill 目录>/scripts/check-latest.mjs <本次需要的包名...>`，从 npm 官方 registry 查询当时的 `latest`，并核对相关 ASAM UI peer。将 `registryVersions` 交给专家工具，按最新版的归档校验公开入口、摘要和实际 peer，再以精确版本安装或更新。目录尚未记录最新版时，使用该版本的真实归档和类型完成核验。已安装最新版且满足本次能力的包直接复用。待发布的包可按已授权的本地固定归档接入并记录 SHA256。

## 选择一条导入路径

`@asam-ui/pro`、`@asam-ui/platform-provider` 和 `@asam-ui/ui-yudao` 各自发布，以实际包中的 `@asam-ui/ui` peer 确认配对。已核验的版本和历史配对见[共享包与能力目录](references/ecosystem.json)。最新版需要同步升级本次相关依赖时，将它们一起检查。发现不能同时满足的 peer，记下具体冲突和受影响的包。

按项目当前习惯或用户选择使用手动导入、自动 resolver、全量注册之一，见 [导入与 provider](references/imports.md)。不要同时给同一个组件增加局部 import、resolver 和全局注册。CSS 及 provider 初始化各保留一处；静态按钮示例无需伪造业务 provider。需要远程组件时复用现有请求、字典和权限边界，禁止用演示 provider 覆盖真实逻辑。

公开 props/events/slots/expose 从**安装包的类型**与同版本组件资料读取，见 [资料索引](references/resources.md)。版本不匹配时以实际安装包为准；MCP 缺失直接读文档与类型，不创建服务作为前置。

按 [固定包与 API/SFC 配对](references/api-pairing.md) 分别核产品、Skill、API 和原生示例的来源与哈希。服务、指令及全局属性按实际根出口/full 注册读取，不当成组件 resolver 能力。

识别结果的 `installed` 记录实际安装字节的版本和入口。按 [1.x 与 2.0 接入](references/released-versions.md) 选择对应路径。涉及 Pro 时先核 `asam.proUiPairing` 及实际 UI peer，再采用 Pro CRUD 公开入口。

本批 Input 职责拆分、Button 删除接口、四档控件尺寸和独立图标按 [迁移与真实支持矩阵](references/migration.md) 处理。先读目标固定包，不能把公共尺寸 helper、计划入口或旧验收当作组件已支持的证明；同版本不同候选用交付 SHA256 区分。

## 完成与重复执行

生成独立示例组件，并在用户要求的位置接入。依赖调整由本次能力与兼容 peer 决定。重复运行先检查实际版本以及已有的导入（含别名）、CSS、插件和 provider，已满足时报告无差异。复杂动态 Vite 配置由 agent 定点编辑，不用正则覆盖整个文件。

运行项目真实 typecheck 与 build；缺少脚本时选用已安装工具或说明缺失，不能宣称未执行的检查通过。验证示例渲染、样式与适用交互。交付列出固定包/Skill 来源与哈希、修改文件、命令结果、既有问题和新增问题、剩余项。再运行识别并检查 diff，确认没有重复依赖、注册、样式或 provider，且用户逻辑与 AGENTS 保留。
