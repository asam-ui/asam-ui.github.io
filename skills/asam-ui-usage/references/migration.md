# 2026-10-02 契约迁移与真实支持矩阵

先识别旧包和目标固定包。目标的 root exports、声明、实际组件与对应官网 API/SFC 必须匹配；版本号相同也可能是不同候选，使用 tarball SHA256 和声明哈希辨认。消费项目不导入组件库源码、计划中的入口或上游内部文件。

运行 `node <Skill目录>/scripts/inspect-contract.mjs <已安装包目录>` 校验 export 目标及声明哈希。默认只读；已信任交付包后可加 `--runtime`，执行其 ESM 和 full 安装器，以列出 root 导出、full 注册与 resolver 对应关系。full 使用注册记录器，嵌套 `app.use` 只记录请求、不执行插件；输出同时记录指令、全局属性与根导出身份。该模式不证明真实 Vue 初始化、属性/事件透传、交互、尺寸视觉或服务/指令使用正确。没有 full 的服务/指令只按实际根出口和声明使用，不加入组件 resolver。

分发包的 `references/package-contract.json` 由真实产物生成；`runtime.components` 是此产物三种组件导入路径的对照，`packages` 记录本批实际传入的独立包。未列出的图标包、adapter 或新组件必须先取固定产物，不能凭方案新增依赖。包 `.d.ts` 中的 props/events/slots/expose 是消费接口来源，不在本 Skill 再维护一份属性表。

## 已确认删除和职责拆分

| 原用法                                    | 目标用法                                                   | 消费检查                                                                                            |
| ----------------------------------------- | ---------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| `AsamButton variant="…"`                  | 相同含义改为 `type="…"`；省略时继承组 type，否则 secondary | 目标类型和实际实现已经删除 variant 时迁移；原代码同时有 type/variant 且值冲突时先按现有行为定位含义 |
| `AsamButtonVariant` 类型                  | 读取目标包实际公开的 `AsamButtonType`                      | 不保留已淘汰兼容别名；字符串必须属于目标联合类型                                                    |
| 普通 Input 的 password/show-password 能力 | `AsamPassword`                                             | 保留 v-model、校验、事件和 expose，逐项对目标类型核验                                               |
| 普通 Input 的 textarea 能力               | `AsamTextarea`                                             | rows/autosize 控制高度，保留原模型和表单逻辑                                                        |
| 官网示例直接从上游 icons 包导入           | `@asam-ui/icons-vue` 固定独立包                            | 核目标根/子路径声明、真实图标名；不自动替换所有用户自有图标                                         |

这是新契约的迁移方向，不能当作旧包已删除接口的证明。新固定包未实现某项时明确记录候选差异，不在旧包上伪造新 API；本批新消费示例不用 variant。其他未明确删除的接口保留，不能用此次迁移为由删掉任意业务属性。

## 四档控件尺寸

| 控件 size | 单行主体高度 | Button 左右各自 padding |
| --------- | ------------ | ----------------------- |
| large     | 40px         | 20px                    |
| big       | 36px         | 18px                    |
| default   | 32px         | 16px                    |
| small     | 28px         | 14px                    |

上述规则适用于目标包已接入四档契约的控件。逐个确认组件 Props 的 size 联合类型和 runtime/CSS；仅导出了 `AsamControlSize` 不表示所有组件都接受 big。显式控件尺寸优先，之后是最近组件组、Form、ConfigProvider，最后 default；保留响应式变化。用户只通过公开组件和类型使用，不调用底层 Element Plus 尺寸桥接来把 big 降为 default。

单选、多选、开关、标签、表格、描述和分页按档位调整密度，不强迫每行使用单行控件高度。Textarea 使用 rows/autosize；Drawer 的宽高、Icon/Avatar 图形尺寸、Space 间距、TimelineItem 节点尺寸保持各自语义。不能把 `size="big"` 批量写进这些独立尺寸参数。

## 独立图标

按需补装交付者指定的 `@asam-ui/icons-vue` 精确版本或 tarball，并记录 SHA256。例如目标包确认导出 Search 时：

```ts
import { Search } from '@asam-ui/icons-vue';
// 或实际 exports 含 ./Search 时使用该路径；两条选一。
// import Search from '@asam-ui/icons-vue/Search';
```

图标是 Vue 组件，可在模板使用 `<Search />`，或传给支持 Component 类型的公开 icon prop。图形尺寸由容器/图标自身契约控制，不套四档高度。三种 UI 导入模式都显式导入图标；UI resolver/full 不负责注册独立包图标。本批固定图标包的根入口为命名导出、单图标子路径为默认导出；后续产物仍核实际 `.d.ts` 与 ESM，不把两种写法混用。

## 交付验证

保留用户 AGENTS、路由、store、provider、插件、原组件和业务 CSS。运行真实 typecheck/build，自动导入先构建生成声明；按所选模式验证 size 继承、实际图标渲染与本次迁移。第二次接入按语义检查别名 import、注册、依赖、CSS 和 provider，已满足就不写入；检查前后配置与 lockfile 哈希，不能只把 Skill 重装 unchanged 当作整个业务接入幂等。独立消费 Agent 的实际执行和独立 QA/ACC 结论单独留证。
