# DEP-003 当前候选 v2（2026-10-12）

技术候选已固定，供root/TC审阅。尚未上传、建issue、写public Git、启用Pages、dispatch或部署。DEP002技术QA/ACC及DOC014既有完整结论按root新派发复用；npm预览不作为本卡新前置。

## 固定输入与元数据
ABB source abb44e4d0431ffaad22c5c09aa3a761c13c406e1，GitLab project32/pipeline389/job646。
原ZIP20490247B，SHA36597b014a38eeb5628ca935d7fdc5c94f3700b2a7b65cae8218bb88096ef3d1。
仅取website，原3237文件逐字节核hash，inventory cdf96db3341767e55dc1e82dcfcfe0c01538c6311cccf9fb8a36f26fdd2fac51。
website-only.tgz12681546B，SHA845d2d40f64a81c869fe4e18d2cec83cb144ee105abad173bdc8aac37c396b93。
无Storybook树、私库Git历史、私有runtime源码或三包npm制品。消费Skill11文件是既定官网公开下载。
API来源路径、公开声明与消费示例按原文档保留；无map/sourcesContent/凭据模式/私有地址命中。静态扫描有语义检查边界。

工作流核固定tar与原闭包后，仅追加.nojekyll和artifact-manifest.json，原content-manifest docsVersion=workspace保持；
交付清单记录ABB来源、provenance、原指纹及交付文件hash。不重build。
追加树3239文件，指纹09dd2ce01a1aa94e6022e03c26ea861f5513d29df97b5f05ab42214b30748484。
当前check-public.mjs在D复制，只改输出位置及固定ABB的workspace断言，其余规则保持；真实检查failures=[]。
见metadata-checker-adaptation.json、metadata-adaptation-result.json，不改产品源码或扩大旧QA结论。

## 确定的非Git传递路径
使用同一public仓库GitHub原生issue附件引入一次，Actions随后保全固定输入并生成Pages artifact。
目标https://github.com/asam-ui/asam-ui.github.io/issues/new；
索引issue标题“DEP-003 官网固定制品与回退索引：ABB job646”。
只上传上述website-only.tgz。官方支持.tgz及25MB非媒体附件，public仓附件可以匿名下载：
https://docs.github.com/en/get-started/writing-on-github/working-with-advanced-formatting/attaching-files
不用新服务器、release、token或secret。

正式派发后通过官方浏览器Attach files：新鲜观察并绑定同一受管身份和附件input；选择文件即立即上传。
当前无已验证的登录浏览器会话，connector无附件上传API；不得编造API/CLI上传端点或冒上传成功。
GitHub返回真实URL后，匿名下载必须核同hash，再在索引issue记录URL/source/hash/回退项。
workflow输入仅接受https://github.com/user-attachments/files/.../website-only.tgz且无query/秘密；
实际URL/id由上传分配，本轮不伪造；若官方返回形态不同，停止核真实域名后适配。
精确调用计划、权限与保全条件见EXECUTION_PLAN_V2.json。

后继写candidate的workflow、两个脚本和README到public main，Pages采用Actions源。
官方dispatch调用POST /repos/asam-ui/asam-ui.github.io/actions/workflows/pages.yml/dispatches，
ref=main、inputs.artifact_url=真实返回并hash读回通过的URL；当前未调用。
build校验和解包、upload-artifact保全website-input-845d2d40f64a81c8（90天，实际上限/expiry读回）、
追加metadata、upload-pages-artifact生成github-pages（7天）。
deploy needs: build，contents:read/pages:write/id-token:write，github-pages environment，deploy-pages。
无长期私库读取token；失效/hash/路径/闭包不符即停止，不找latest或重build。
工作流依据：https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages

## 当前设置事实与验证
受管zwq8299174 metadata admin/maintain/push/pull=true，collaborator admin。
新支持的受管原始仓库GET明确public、has_issues=true、has_pages=false、size0；Pages尚未启用。
此前runs0、默认公网404。build_type/source、github-pages保护与Actions策略仍UNKNOWN。
旧connector不支持、匿名API限流403及浏览器超时保留，未重复该路径；admin不能代替实际上传或Pages设置验证。

YAML经现有D主仓js-yaml@4.3.2解析且needs/permissions/environment/artifact步骤核对通过；
源码E不装依赖。Node使用D runtime；现有bundled Python标准库拷到本任务D runtime，
D真实解包及metadata测试恢复上述指纹，未装依赖。早期C bundled测试仅历史，不称其D runtime。
180HTML静态深链/资源及CSS URLs/显式JS imports缺项0；160API索引、938公开定义、
1734TS/JS示例内源hash与消费Skill11项hash核对。错误hash在提取前停止。

## 回退及剩余
当前无旧公网版本，首次build失败不会进入deploy；deploy失败/超时先读回，不假设远端绝无变化。
更新前保留上版tar/hash/原指纹/workflow commit/attachment URL/run-artifact ID；
保留索引issue、附件和D原件，不假设附件永久保留。
回退恢复上一接受校验常量与普通中文Git提交，dispatch保全附件。对象失效先停，
root派发后重上传同hash；不引入买服务器或新secret审批，不重build已验网站。

root/TC审阅当前完整候选，独立QA→ACC由TC组织。正式派发后绑定现有受管浏览器附件通路、
读写必要Pages/Actions/environment设置、首次附件/issue/public Git/dispatch及公网有限差分QAACC。
未验公网动态交互/缓存/HTTPS，不冒整卡PASS。wholeCardPass=false，deploymentReady=false。
源码Git仍clean，HEAD80e6224af2842eef484c98169d7b7030d2c1135a。
