# 诺诺的语文探险岛

面向四年级的趣味语文训练网站。纯HTML、CSS和JavaScript，无后端运行依赖。

- 四周16次任务，每次5关，主线共80个不同关卡。
- 六类专项各30个活动，另有12个迁移挑战，共192个活动。
- 默写活动覆盖86个不同词组；支持题库筛选、新题换组、错题复练、草稿和观察手记。

[题库说明](QUESTION-BANK.md) · [EdgeOne Makers自动部署](DEPLOYMENT.md)

## 本地使用

安装开发与部署工具需要Node.js 24：

```sh
npm ci
npm run check
npm test
```

网站本身不需要构建。可直接打开dist/index.html，或通过静态服务器预览：

```sh
python3 -m http.server 4173 --directory dist
```

访问 http://localhost:4173/ 。

## 页面

| 文件 | 用途 |
| --- | --- |
| dist/index.html / navigation.html | 导航首页 |
| dist/plan.html | 四周任务地图 |
| dist/library.html | 专项题库筛选与单题练习 |
| dist/train.html | 任务、专项换组、单题和错题复练 |
| dist/journal.html | 观察手记及打印 |
| dist/parents.html | 家长指南、草稿回看及备份导入导出 |

## 自动部署

main更新后，GitHub Actions检查通过即部署到EdgeOne Makers；PR只执行检查。

首次需在GitHub仓库Settings → Secrets and variables → Actions设置Secret：

```text
EDGEONE_API_TOKEN
```

默认项目名nuonuo-language-island，账号站点china；可用Actions Variables覆盖。Token未配置时，工作流明确跳过发布并提示设置，不会进行匿名部署。完整步骤见[部署文档](DEPLOYMENT.md)。

本地检查与发布：

```sh
npm run deploy:check   # 只检查与筛选文件，不上传
npm run deploy        # 使用已登录的CLI或环境中的Token上传
```

## 内容与记录

题库底座在dist/assets/data.js，扩充内容、难度与主线编排在bank.js；交互在app.js，样式在style.css。各页面依次加载data、bank、app脚本。

浏览器localStorage保存进度、草稿与观察手记，不会跨设备自动同步。更换域名、协议或浏览器前，请先在家长指南中导出备份，再到正式地址导入。旧版草稿和手记会保留，旧任务完成记录单独存档。

选择、证据与排序可自动核对；简答、习作与纸上默写需自查或家长核对。完成记录不代表标准化能力评分。
