# ASAM UI 开发专家离线包

解压后保留全部文件，使用 Node.js >=22.19 <23 运行：

```sh
node installer.mjs --offline-dir . --public-key-file release-public.pem
```

按提示选择宿主与操作；也可用 --host codex|workbuddy|harness 和 --action install|update|check|uninstall|rollback。离线模式仍校验发行清单签名与所选包摘要。首次信任公钥以官网公布的指纹和取得包的可信来源为准。Harness 宿主依赖安装仍由其原生 pnpm 完成；宿主没有本地依赖缓存时不能声称完全离线。
