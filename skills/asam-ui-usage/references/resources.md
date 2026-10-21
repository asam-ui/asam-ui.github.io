# 同版本资料索引

优先级：已安装包的 exports 与 `.d.ts` → 同一提交/版本的文档、Story 和生成 API → 概念方案。不要从旧截图或此 Skill 猜测组件参数。

新契约的迁移规则见本 Skill 的 [迁移指南](migration.md)。消费接入按实际安装产物；公网官网独立提供文档/API/原生 SFC，不依赖 Storybook。独立文档 MCP 是可选查询入口，安装状态和固定资料版本见 https://asam-ui.github.io/ai/mcp.html；未发布的包不当作可用服务。

国内官网 https://asam-ui.cn/ 与国际官网 https://asam-ui.github.io/ 提供同一版本资料及相同 Skill 归档。按用户当前所选站点读取对应路径（含 /ai/mcp.html），不要为了安装国内版 Skill 再转到国际域名。

产品包、Skill 与网站资料分别按 [固定包与 API/SFC 配对](api-pairing.md) 核对。旧聚合、有限声明 audit 或 sourceSha 相同的少量演示都只描述各自覆盖范围，不自动证明新整库一致。

| 需要的信息                  | 入口                                                             |
| --------------------------- | ---------------------------------------------------------------- |
| 包版本、peer 与导出         | `node_modules/@asam-ui/ui/package.json`                          |
| 组件公开类型                | 该包 `dist/index.d.ts` 引用的 `dist/components/*/Types.d.ts`     |
| 数据 provider/请求/字典契约 | 该包 `dist/data/types.d.ts` 与 `dist/data/index.d.ts`            |
| 全量注册与类型              | 包 exports 中的 `./full`、`./global`；缺失则不可使用本版全量示例 |
| resolver                    | 包 exports 中的 `./resolver` 及其声明                            |
| 文档目录                    | 官网 AI 的「组件资料」页、同版本 `content-manifest.json`         |

从源码分发时，等价入口是 `packages/ui/src/index.ts`、各组件 `Types.ts`/`DataTypes.ts`、`packages/ui/src/data/types.ts` 和同提交 SFC。Skill 分发包的 `references/package-contract.json` 从真实构建/解包产物生成，记录版本、exports、peerDependencies、全部声明/入口哈希、root/full/resolver 运行时对应关系与 Skill 源码提交。Skill 提交与产品提交可能不同；生产者另附产品 commit、tarball SHA256 和验证原件。它用于校对分发批次，不替代安装包的实际类型，也不把尚未聚合的新入口算作支持。

新官网 API 输入引用真实 Types/JSDoc/SFC；组件示例直接运行并显示同一原生 SFC 的 TS/JS 和多文件原件。聚合 API 的协议路径为 `ai/component-api.json`，包含 `sourceSha`；正文引用 `content/components/<公开入口>.md/.json`、演示引用 `examples/<公开入口>/<demo>/ts|js/manifest.json`。必须核对实际生成产物存在和版本，协议不证明内容已完成。不在 Skill 维护第二份 props 表。官网公开地址只表示站点入口，不能证明尚未部署的内容已经上线；使用交付者指定的本地预览或匹配版本的已部署站点。

如果宿主已连接可用的 Storybook/MCP，可读取匹配版本的组件资料来辅助定位。先核实工具与返回版本；没有 MCP、认证失败或返回过期文档时继续本地类型路线。不要自动新增服务、外发业务源码或凭据。
