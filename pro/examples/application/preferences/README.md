# preferences完整示例

使用Node22.19+的22.x及pnpm11.9.0。在解压目录执行pnpm install --frozen-lockfile、pnpm run typecheck、pnpm run dev、pnpm run build。vendor内正常UI/Pro包与锁文件配套；无源码alias或借入node_modules。

src/MinimalExample.vue展示本能力最小用法；完整场景保留原路由、provider及本地fixture。src/mount.ts与根main.ts已经接好启动和释放，不需要手写网站宿主。预览设置检测不到网站侧栏时在原位置显示。会话、请求均为本地合成，不连接真实业务后端。跨能力通过公开Pro叶子入口引用，导航的Vue Router是必要依赖，其他样式/按钮与fixture属于演示宿主。

Tiptap既有传递依赖可能出现peer告警，未通过修改依赖版本掩盖。

本工程默认运行与文档页内相同的最小示例，入口见src/inline-entry.ts。完整App及作者宿主仍保留在src目录中，可按其依赖单独接入。场景源码ZIP保留同名相对路径，正常包仅位于完整工程vendor目录。
