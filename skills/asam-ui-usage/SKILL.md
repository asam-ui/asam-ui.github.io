---
name: asam-ui-usage
description: 在消费项目中安装和使用 ASAM UI Vue 组件库，识别现有工程、配置手动或自动导入及全量注册、样式与数据 provider，并验证接入。用于业务项目消费组件，不用于维护组件库源码。
---

# ASAM UI 消费接入

在用户指定的 Vue 项目中完成接入。此 Skill 与组件库维护用的 `asam-ui-component` 分开；不要求消费者安装仓库工作流、JEV 或 MCP。

## 先识别，再改动

1. 读目标项目适用的 `AGENTS.md` 和 Git 状态，保留用户改动。运行 `node <本 Skill 目录>/scripts/inspect-project.mjs <项目目录>`，再核对目标 package、workspace、锁文件、包管理器版本、Vue/Vite 及真实脚本。脚本只读，不证明依赖兼容。多锁文件或 packageManager 冲突先定位实际使用者，不能擅自删锁或切换包管理器。
2. 读取 [接入流程](references/integration.md)。检查已有入口、Vite plugins、样式、全局组件、provider 和挂载顺序。已有 Vue/Vite 配置必须合并；不替换 App、路由、store、插件数组或用户 AGENTS。新项目才按用户选定工具建立最小入口。
3. 先给出具体文件与依赖差异，再执行已授权的接入；已有授权不重复审批。版本或产物缺失时只补充缺少的信息，不从 `latest` 或猜测的 registry 地址安装。所需包必须使用真实可访问的固定版本或交付 tarball，记录 SHA256。没有正式发布不阻塞本地固定产物接入。

## 选择一条导入路径

按项目当前习惯或用户选择使用手动导入、自动 resolver、全量注册之一，见 [导入与 provider](references/imports.md)。不要同时给同一个组件增加局部 import、resolver 和全局注册。CSS 及 provider 初始化各保留一处；静态按钮示例无需伪造业务 provider。需要远程组件时复用现有请求、字典和权限边界，禁止用演示 provider 覆盖真实逻辑。

公开 props/events/slots/expose 从**安装包的类型**与同版本组件资料读取，见 [资料索引](references/resources.md)。版本不匹配时以实际安装包为准；MCP 缺失直接读文档与类型，不创建服务作为前置。

按 [固定包与 API/SFC 配对](references/api-pairing.md) 分别核产品、Skill、API 和原生示例的来源与哈希。服务、指令及全局属性按实际根出口/full 注册读取，不当成组件 resolver 能力。

本批 Input 职责拆分、Button 删除接口、四档控件尺寸和独立图标按 [迁移与真实支持矩阵](references/migration.md) 处理。先读目标固定包，不能把公共尺寸 helper、计划入口或旧验收当作组件已支持的证明；同版本不同候选用交付 SHA256 区分。

## 完成与重复执行

生成独立示例组件，并在用户要求的位置接入。安装依赖只补缺项，尊重已有兼容版本；重复运行先检查语义上已存在的导入（含别名）、CSS、插件和 provider，已满足时报告无差异。复杂动态 Vite 配置由 agent 定点编辑，不用正则覆盖整个文件。

运行项目真实 typecheck 与 build；缺少脚本时选用已安装工具或说明缺失，不能宣称未执行的检查通过。验证示例渲染、样式与适用交互。交付列出固定包/Skill 来源与哈希、修改文件、命令结果、既有问题和新增问题、剩余项。再运行识别并检查 diff，确认没有重复依赖、注册、样式或 provider，且用户逻辑与 AGENTS 保留。
