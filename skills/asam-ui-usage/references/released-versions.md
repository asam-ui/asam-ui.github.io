# ASAM UI 1.x 与 2.0 接入

先运行 `inspect-project.mjs` 读取目标应用的实际安装版本。UI 1.x 工程继续使用其版本的类型和组件文档，按目标应用的升级范围评估差异。

已发布的 `@asam-ui/pro@2.0.0` 要求精确的 `@asam-ui/ui@2.0.0` peer。使用相同的 Vue 实例，按 Element Plus → UI → Pro 顺序导入各自样式。图标按需使用独立的 `@asam-ui/icons-vue@1.0.0`。

## Button 迁移

UI 2.0 的 `type` 表示语义颜色。文字外观使用布尔属性 `text`，如 `<AsamButton type="primary" text>查看</AsamButton>`。将旧 `accent` 或 `ghost` 按原用途迁移到实际支持的语义类型及 `plain`、`text` 等外观；旧用法先核对其原始样式和交互。以实际归档的 Button 声明为准。

## Pro CRUD

从 `@asam-ui/pro/templates/crud` 导入 `AsamCrudPage` 和适用公开类型。先运行配套 CRUD 工程，保留其查询、表格、表单和调用方注入的边界。接入真实工程时沿用宿主的请求、权限及错误处理，并使用实际安装包校验 types 和运行入口。
