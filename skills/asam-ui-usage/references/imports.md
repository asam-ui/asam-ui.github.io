# 导入、样式与 provider

先核对安装包 exports。这里的全量入口要求包包含 `./full` 与 `./global`；旧产物没有这些入口时使用原手动/自动路线或换到用户指定的固定新产物。

## 手动导入

在使用处显式导入组件；类型使用 `import type`。静态组件只需 CSS，无须为示例增加插件。

```vue
<template>
	<AsamButton @click="count++">已点击 {{ count }} 次</AsamButton>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { AsamButton } from '@asam-ui/ui';

const count = ref(0);
</script>
```

应用入口在原有业务覆盖样式之前引入一次：

```ts
import 'element-plus/dist/index.css';
import '@asam-ui/ui/style.css';
```

保留宿主样式覆盖顺序。Element Plus 的现有样式已存在时不再重复插入。

## 自动导入

合并现有 Vite `plugins`，有 `Components(...)` 时在其原 `resolvers` 中添加一次 `AsamUIResolver()`，保留现有 resolver/include/dts。没有时再新建插件配置：

```ts
import Components from 'unplugin-vue-components/vite';
import { AsamUIResolver } from '@asam-ui/ui/resolver';

// 合入原 plugins 数组，保留 vue() 与其他插件
Components({ resolvers: [AsamUIResolver()], dts: 'src/components.d.ts' });
```

模板直接使用 `<AsamButton>`。resolver 仅识别已导出的组件，默认注入 Element Plus 完整 CSS 与 ASAM CSS；不把它当函数自动导入器，不关闭 sideEffects。`ref`、`AsamUI`、provider 等仍需正常 import。让 Vite 先生成组件声明，再 typecheck；已有 `components.d.ts` 路径沿用原配置并确保纳入 tsconfig。

## 全量注册

```ts
import AsamUIFull from '@asam-ui/ui/full';
import 'element-plus/dist/index.css';
import '@asam-ui/ui/style.css';

app.use(AsamUIFull); // 原 createApp 实例，在 mount 前执行一次
```

模板可直接使用所有已注册组件。将 `@asam-ui/ui/global` 添加到原 `compilerOptions.types`（保留已有项），或在现有包含的声明文件写 `import '@asam-ui/ui/global'`，二者选一。该入口只提供声明，不能从运行时代码导入。

`AsamUIFull` 初始化 runtime/theme 并注册包内组件。新聚合候选还通过 full 安装 Message、Notification、MessageBox、Loading 服务及 ASAM 指令；必须先检查目标产物实际 full 入口与根导出，旧包不能沿用这个能力描述。根 `AsamUI` 只初始化 runtime/theme，不能把 `app.use(AsamUI)` 描述为全量组件注册。选择 full 后无需再安装根插件或添加 resolver。

## 服务与指令

服务是可调用函数或服务对象，指令通过 `app.directive` 注册，不加入组件 resolver 或组件全局声明。手动/自动组件模式仍显式导入所需服务；需要全局属性或应用上下文时按目标包公开的 install 签名安装一次。已有 full 注册时不重复安装。

例如目标根出口包含 `AsamMessage`、`AsamLoadingDirective` 时，可以显式导入服务并注册 `asam-loading` 指令。先核对目标包的声明与使用示例；不能把服务快捷方法当成组件、将 `vAsamLoading` 别名误写成模板组件，或因为根插件存在就假设所有指令已注册。`--runtime` 检查器记录 full 的组件、指令和全局属性身份，以及未执行的嵌套插件请求；真实 Vue 初始化、服务调用与指令 hooks 仍需消费项目验证。

## 按需配置数据能力

静态数组/API 函数可直接使用；URL 请求与字典需要宿主 provider。手动/自动模式如果需要 theme/provider，可在原 app 中使用根插件：

```ts
import { AsamUI } from '@asam-ui/ui';
import type { AsamDataProvider } from '@asam-ui/ui';

// provider 来自当前业务项目的现有适配；不在通用示例中编造请求/认证。
function configureAsam(provider: AsamDataProvider) {
	app.use(AsamUI, { dataProvider: provider, dataScope: 'session-0' });
}
```

这里 `app` 表示宿主已有的 Vue App 实例。全量模式把相同选项传给 `AsamUIFull`。已用 `provideAsamData(app, provider, options)` 的项目保留原初始化，不重复覆盖；已有插件带 theme/provider 参数时合并原参数。退出登录/租户切换由业务层调用 `setAsamDataScope`，scope 不包含凭据。芋道适配从同批 `@asam-ui/ui-yudao` 的真实类型取签名，不把 CL store 或 API 写进 Skill。
