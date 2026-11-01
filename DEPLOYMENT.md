# EdgeOne Makers 自动部署

此仓库使用 GitHub Actions：PR执行检查，main更新后检查并发布到EdgeOne Makers。部署使用腾讯云官方CLI，项目为“直接上传”类型，账号默认国内站China。

## 首次设置

1. 在[腾讯云EdgeOne控制台](https://console.cloud.tencent.com/edgeone)开通Makers（旧名称Pages），使用免费版并创建“直接上传”项目，名称为 `nuonuo-language-island-cn`，加速区域选择 **全球可用区（含中国大陆）**。
2. 在Makers控制台创建API Token。将其保存为本仓库的GitHub Actions Secret：**EDGEONE_API_TOKEN**。
   - [打开仓库Secrets设置](https://github.com/bobo-coding/nuonuo-language-island/settings/secrets/actions)
   - Token由你在控制台创建并直接填入GitHub，不提交进代码或发到聊天中。
3. 项目名不是上述名称时，在GitHub Actions Variables中增加 `EDGEONE_PROJECT_NAME`。使用国际站账号时增加 `EDGEONE_SITE=global`；国内站默认 `china`，无需额外配置。加速区域默认 `global`（含中国大陆），自定义域名需完成 ICP 备案。
4. 在[Actions页面](https://github.com/bobo-coding/nuonuo-language-island/actions)打开 **Check and deploy to EdgeOne Makers**，选择 **Run workflow**，分支选main。

没有配置Token时，检查仍运行，部署步骤会明确跳过，并在运行摘要中提示配置；这不代表网站已经上线。配置后无需修改代码，手动重跑工作流即可。

项目若采用Makers的原生Git导入，请直接使用平台原生的Git自动部署；这里的CLI工作流对应的是“直接上传”项目，避免混用项目类型。

## 域名与加速区域

当前默认使用 **全球可用区（含中国大陆）**，由大陆及其他地区节点提供服务。`EDGEONE_SITE=china` 表示账号站点；`EDGEONE_AREA=global` 表示项目加速区域，两者含义不同。

2026-11-01 从原 `nuonuo-language-island`（overseas）迁移到 `nuonuo-language-island-cn`（global）。锁定的官方 CLI 仅支持 global / overseas，且 `--area` 仅在创建项目时生效。因此使用新的项目名创建含大陆区域项目，保留原项目以便回退。不要把项目名改回旧项目后误以为 `--area global` 会改变旧项目区域。

迁移使用同一份 dist 静态文件，题库与学习记录格式保持一致。若已有自定义域名绑定旧项目，需在完成 ICP 备案后将该域名迁移到新项目，并按新项目给出的 CNAME 与证书配置接入。仅更改仓库部署参数不会自动迁移域名或修改 DNS。域名未备案时，含大陆区域的正式域名接入仍受备案要求限制。

平台项目/部署域名主要用于预览，对大陆访问有时效或访问规则限制；长期使用请绑定已备案的自定义域名，并从实际使用网络验收。

自动部署完成后，工作流通过与锁定 CLI 相同的官方 API 读取实际项目区域；若仍为 overseas 或无法核实，工作流会失败，避免将“上传成功”误报为“区域切换成功”。

## 自动化范围

- main的push：检查通过后发布production，并核对线上项目实际加速区域。
- PR：仅检查，不提供部署Token、不发布。
- 手动运行：main分支执行生产部署；其他分支仅检查。
- CLI、测试依赖和Actions提交均固定版本；npm ci使用锁文件。
- 只读GitHub仓库权限；Token仅在部署所需步骤提供，并通过锁定CLI支持的环境变量传入，不放到命令参数或静态文件中。
- 部署载荷只有筛选后的HTML和assets，不含仓库文档、测试、凭证、课本或试卷。

## 本地检查和手动部署

本机使用Node.js 24：

```sh
npm ci
npm run check
npm test
npm run deploy:check
```

手动部署可先执行 `npx --no-install edgeone login` 并选择China，然后执行 `npm run deploy`。自动化使用环境变量EDGEONE_API_TOKEN，无需浏览器登录。不要在命令文本中直接粘贴Token。

可选环境变量：`EDGEONE_PROJECT_NAME`、`EDGEONE_SITE`（china/global）、`EDGEONE_ENV`（production/preview）、`EDGEONE_AREA`（global/overseas，默认global，含中国大陆）。预览首次部署如需生产环境，先执行一次production；自动工作流固定发布production。

## 更新与验收

编辑dist或题库后提交到main，Actions会自动检查与部署。在Makers控制台确认部署成功，再用正式HTTPS域名查看首页、题库和观察手记。CLI成功不代表DNS或证书已就绪。

学习进度仍保存在当前浏览器。切换域名、协议、设备或浏览器前先导出备份，再在正式地址导入。服务器发布不会上传或同步浏览器里的学习记录。

## 官方参考

- [EdgeOne CLI及CI部署参数](https://pages.edgeone.ai/document/edgeone-cli)
- [Makers API Token](https://edgeone.cloud.tencent.com/pages/document/176921267881082880)
- [域名限制与加速区域](https://edgeone.cloud.tencent.com/pages/document/175191784523485184)
