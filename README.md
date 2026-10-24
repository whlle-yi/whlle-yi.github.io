# whlle-yi.github.io

WHLLE_YI 的个人网站,基于 [Hugo](https://gohugo.io/) + [OINK](https://oink.pgsty.com/) 主题,通过 GitHub Pages 自动构建发布。

- 线上地址:<https://whlle-yi.github.io/>(英文) · <https://whlle-yi.github.io/zh/>(中文)
- 构建方式:推送到 `main` 分支后,`.github/workflows/github-pages.yaml` 自动构建并发布

## 目录结构

```text
├── hugo.yaml              # 站点唯一配置文件(站名/URL/语言/UI/模块)
├── go.mod / go.sum        # Hugo modules 依赖(OINK 主题 v1.3.2)
├── content/               # 全部内容(Markdown)
│   ├── blog/              # 博客文章(post/design/release)
│   ├── docs/              # 文档知识库
│   └── book/              # 书/专栏
├── data/home/             # 首页内容(en/zh 每语言一份)
├── assets/icons/          # 站点 logo
├── i18n/                  # 界面翻译补充
├── static/                # 静态文件(favicon 等,直接按路径服务)
├── examples/              # 备用语言配置(单语/双语)
└── .github/workflows/     # GitHub Pages 部署工作流
```

内容语言约定:英文文件 `*.md`,中文对应文件 `*.zh.md`,同名成对放置。

## 本地开发

环境要求:Hugo Extended ≥ 0.166.0、Go ≥ 1.27.0、Git。首次构建会下载 OINK 主题模块(国内网络建议设置 `GOPROXY=https://goproxy.cn,direct`)。

```bash
hugo server        # 本地预览 http://localhost:1313/
```

发布级构建(与 CI 一致的严格模式):

```bash
hugo --cleanDestinationDir --gc --minify --environment production \
  --printPathWarnings --panicOnWarning
```

## 部署

推送到 `main` 分支即自动部署,无需手工操作。GitHub Pages 源需在仓库 Settings → Pages 中选择 **GitHub Actions**(已配置)。

## 常用修改

| 改什么 | 在哪改 |
| --- | --- |
| 站名 / 域名 / 默认语言 | `hugo.yaml` 顶部 |
| 首页文案 | `data/home/en.yaml`、`data/home/zh.yaml` |
| 文章 | `content/blog/post/` |
| 导航菜单 | 各板块 `content/*/_index*.md` 的 front matter |
| Logo / favicon | `assets/icons/logo.svg`、`static/favicon.svg` |
