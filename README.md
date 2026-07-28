# AI Werewolf

AI 狼人杀练习应用（Expo / React Native）：1 名真人 + 11 名 AI，横屏对局。产品说明见 [docs/PRODUCT.md](./docs/PRODUCT.md)，需求文档见 [docs/PRD.md](./docs/PRD.md)。

本仓库已与 GitHub 仓库 **[Cam1-Zhang/more-land](https://github.com/Cam1-Zhang/more-land)** 对齐：`package.json` 的 `"name"` 与根目录 **`app.config.js`** 里 Expo 的 `slug`（均为 **`more-land`**）一致，应用显示名为 **Moer Land**，便于 Pages 地址 **`https://cam1-zhang.github.io/more-land/`**。

### 首次推送到你的 `more-land` 仓库

本地已有提交；在项目根目录执行（远程仓库：**[Cam1-Zhang/more-land](https://github.com/Cam1-Zhang/more-land)**）：

```bash
git remote add origin https://github.com/Cam1-Zhang/more-land.git
git push -u origin main
```

若提示 `remote origin already exists`：

```bash
git remote set-url origin https://github.com/Cam1-Zhang/more-land.git
git push -u origin main
```

推送需在终端完成 GitHub 登录（HTTPS、`ssh`，或安装 [GitHub CLI](https://cli.github.com/) 后执行 `gh auth login`）。

---

## 方式一：把代码放 GitHub，别人用 Expo Go 在手机上玩

适合 **愿意克隆仓库、有 Node.js** 的协作者；**不需要** 你自己搭网站。

### 你要做的

1. 在 [GitHub](https://github.com/new) 建一个仓库，把本仓库推上去（若仓库名不是 `more-land`，请往下看「仓库名与网页路径」）。
2. 在仓库 README（或 Discussions）里说明：**克隆 → 安装依赖 → 启动开发服务器 → 手机 Expo Go 扫码**（或直接转发本文下面的命令）。

### 对方在本机的步骤

1. 安装 [Node.js](https://nodejs.org/)（建议 LTS）。
2. 克隆并安装依赖：

   ```bash
   git clone https://github.com/Cam1-Zhang/more-land.git
   cd more-land
   npm install
   ```

3. 启动开发服务：

   ```bash
   npx expo start
   ```

4. **手机**安装 [Expo Go](https://expo.dev/go)（iOS App Store / Android Play）。
5. 用 Expo Go **扫描终端里的二维码**。
   - 手机与电脑在 **同一 Wi‑Fi** 时通常可直接连。
   - 若连不上（例如公司网隔离），在终端按 **`s`** 切换到 **Tunnel（隧道）** 模式后再扫码（需要当前环境能访问 Expo 隧道服务）。

### 说明

- 这是 **开发模式**，在别人电脑上跑的是「实时打包」，不是商店安装包。
- 首次启动会下载依赖与 Metro 打包，稍等片刻即可。

---

## 方式二：发布静态网页到 GitHub Pages（浏览器里打开）

适合 **不想装 Node、只想点开链接** 的人：你把网页部署到 GitHub Pages，对方用浏览器访问。

本项目已配置：

- **Metro Web** + **SPA 导出**（`app.config.js`）
- 子路径 **`experiments.baseUrl`**：部署到 `https://<用户名>.github.io/<仓库名>/` 时，资源会从 `/仓库名/` 正确加载

并已安装 Web 依赖：`react-dom`、`react-native-web`。

### A. 在你电脑上手动发布（推荐第一次验证）

1. 确认 **`package.json` 里的 `"name"`** 与 **GitHub 仓库名** 一致（本仓库默认 **`more-land`**）。若不一致，部署时请改用下面的「自定义路径」。
2. 安装依赖（只需一次）：`npm install`
3. 构建并推到仓库的 **`gh-pages`** 分支：

   ```bash
   npm run deploy:github
   ```

   该脚本会：带上 `EXPO_PUBLIC_BASE_PATH=/more-land` 执行 `expo export -p web`，再用 `gh-pages` 把 **`dist/`** 推到远端 **`gh-pages`** 分支（含 `--nojekyll`，避免 GitHub 丢弃带下划线的静态文件）。

4. 打开 GitHub 仓库 → **Settings → Pages**：
   - **Source**：Deploy from a branch  
   - **Branch**：`gh-pages` / **folder**：`/ (root)`  
   - Save  

5. 几分钟后可通过 **`https://cam1-zhang.github.io/more-land/`** 访问。

### B. 推送代码自动部署（GitHub Actions）

仓库已包含 **`.github/workflows/deploy-web.yml`**：向 **`main` 或 `master`** 推送时，会自动导出 Web 并部署到 **`gh-pages`** 分支。

首次使用前同样在 **Settings → Pages** 里选择 **`gh-pages`** 分支为站点来源。

若默认分支不是 `main`/`master`，请在该 workflow 文件里加上你的分支名。

### 自定义子路径（仓库名 ≠ `package.json` 的 `name`）

先导出再手动调用 gh-pages，例如仓库名为 `my-game`：

```bash
cross-env EXPO_PUBLIC_BASE_PATH=/my-game npx expo export -p web
npx gh-pages --nojekyll -d dist
```

（已全局安装或未安装 `gh-pages` 时也可用：`npx gh-pages --nojekyll -d dist`。）

### 本地预览正式打包效果

```bash
npm run export:web
npm run serve:web
```

浏览器访问终端提示的地址（一般为 `http://localhost:8081`）。

### Web 端说明

部分原生能力与布局在浏览器中与真机可能有差异；横屏与触控仍以移动端为主进行设计。若仅演示流程，Web 通常足够。

---

## 日常开发命令（摘录）

| 命令 | 说明 |
|------|------|
| `npm start` | Expo 开发服务器（扫码 / 模拟器） |
| `npm run web` | 浏览器开发模式 |
| `npm run export:web` | 导出静态站到 `dist/`（根路径，适合本地 `serve`） |
| `npm run deploy:github` | 导出（带子路径）并部署到 `gh-pages` |

---

## 许可证与隐私

仓库若为私有请自行管理访问权限。客户端本地偏好存储于设备（AsyncStorage）；若启用云端 AI 发言，请在运行环境中配置 `EXPO_PUBLIC_DEEPSEEK_API_KEY`（勿把密钥提交到公开仓库）。
