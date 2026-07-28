# GitHub Pages（项目页：`username.github.io/仓库名/`）

## 前提

- 仓库名必须与 **`package.json` 里的 `"name"`** 一致（当前为 **`more-land`**），这样 `EXPO_PUBLIC_BASE_PATH=/more-land` 才会和线上路径 `/more-land/` 对齐。
- 若你改了 GitHub 上的仓库名，请同步修改根目录 **`package.json` 的 `name`**，并更新下面的 **`homepage`**。

## 若下拉列表里还没有 `gh-pages` 分支

这是正常的：`gh-pages` **不会**随 `main` 自动出现，只有在**第一次成功把静态站推到远端**之后，GitHub 上才会有这个分支。

任选其一先生成 `gh-pages`，再回来选分支：

1. **GitHub Actions（推荐）**：把包含 `.github/workflows/deploy-web.yml` 的代码推送到 **`main`**，打开仓库 **Actions**，等 **Deploy Web to GitHub Pages** 变绿（成功）。然后刷新 **Settings → Pages**，分支里就会出现 **`gh-pages`**。
2. **本机命令**：在项目根目录执行 **`npm run deploy:github`**（需已配置 `origin` 且能 `git push`）。成功后远端会出现 **`gh-pages`**。

然后再按下面「打开 GitHub Pages」选 **`gh-pages` / (root)`** 并保存。

## 一次性：打开 GitHub Pages

1. 打开 GitHub 仓库 → **Settings** → **Pages**。
2. **Build and deployment**：Source 选 **Deploy from a branch**。
3. Branch 选 **`gh-pages`**，文件夹 **`/ (root)`**，保存（须先按上一节生成 **`gh-pages`** 分支）。

## 部署命令

在项目根目录：

```bash
npm run deploy:github
```

会使用 `cross-env EXPO_PUBLIC_BASE_PATH=/more-land` 导出网页到 `dist/`，再通过 `gh-pages` 推送到远程分支 **`gh-pages`**。

部署完成后，站点地址一般为：

**https://cam1-zhang.github.io/more-land/**

（若你改了用户名或仓库名，请同步改 `package.json` 里的 **`homepage`**。）

## 本地预览「带子路径」的构建结果

```bash
npm run export:web:github
npx expo serve --port 8081
```

浏览器打开：`http://localhost:8081/more-land/`（注意要带 **`/more-land/`** 前缀，否则资源路径会对不上）。

部署到 GitHub Pages 后，若只输入 **`.../more-land`**（末尾没有 **`/`**），以前有的环境会自动补斜杠；若没有，页面可能白屏或资源 404。构建脚本会在 **`index.html` / `404.html`** 里注入一行重定向，把 **`/more-land`** 立刻改成 **`/more-land/`**，与「上次直接跳转」的体验一致。

## 说明

- GitHub **Project Pages** 对 SPA 深链接刷新支持有限；若某条路由刷新后白屏，请从首页 **`.../more-land/`** 进入再导航。
- 私有仓库的 Pages 可能有额度或权限限制，以 GitHub 当前文档为准。
