# Astro 全栈个人博客系统 (gkblog-astro)

一个基于现代 Web 技术栈构建的**轻量级、高性能全栈个人博客系统**。

本项目通过将前台展示、后台管理和 API 服务融合入同一个 **Astro 5.x** 项目中，实现了开发与部署的极致精简，同时利用 Astro 5 的 Hybrid Server Mode 保持了前台博客页面的纯静态（Pre-render）高访问速度。

## 技术栈

- **全栈框架**: [Astro 5.x](https://astro.build/) - 混合渲染（Static + Server）
- **管理界面**: [Vue 3](https://vuejs.org/) - 挂载于 Astro 客户端单页应用（SPA）
- **数据库**: SQLite - 嵌入式轻量数据库，由 Node/Bun 原生读取
- **运行时**: [Bun](https://bun.sh/) (推荐) 或 Node.js 18+
- **样式**: [TailwindCSS v4](https://tailwindcss.com/) - 实用优先的 CSS 框架

## 目录结构

```
gkblog-astro/
├── src/
│   ├── admin/          # Vue 3 管理界面组件及逻辑
│   ├── components/     # Astro 前台组件
│   ├── layouts/        # Astro 前端布局
│   ├── lib/            # 后端公共库 (如 SQLite 数据库连接 db.ts)
│   └── pages/          # 统一路由中心
│       ├── index.astro # 前台首页 (预渲染)
│       ├── admin.astro # 管理后台页面入口 (静态骨架 + 客户端 Vue 渲染)
│       ├── api/        # 统一后端 API (文章、随笔、图片上传、点赞评论)
│       ├── blog/       # 博客前台页面 (预渲染)
│       └── thoughts.astro # 随笔前台页面 (预渲染)
├── public/             # 静态公共资源
├── uploads/            # 图片上传物理存放位置
├── blog.db             # SQLite 数据库文件
├── package.json        # 统一的依赖与脚本配置
└── README.md           # 本说明文件
```

## 快速开始

### 1. 前置条件

- 安装 [Bun](https://bun.sh/) (推荐) 或 Node.js 18+

### 2. 环境变量配置

复制 `.env.example` 为 `.env` 并根据需要进行修改：

```bash
cp .env.example .env
```

主要的系统配置都在 `.env` 中，详见后文的 **环境变量配置** 章节。

### 3. 安装依赖

在项目根目录下直接运行：

```bash
bun install
```

### 4. 启动开发服务器

```bash
bun run dev
```

运行后，全栈系统将启动在 `http://localhost:4321`，其中：
- 博客前台：`http://localhost:4321/`
- 管理后台：`http://localhost:4321/gk-admin`
- 后端 API：`http://localhost:4321/api/*`

无需再开启多个终端，开发体验极为流畅。

---

## 生产部署

### 1. 构建生产版本

```bash
bun run build
```

构建命令会：
1. 编译后台管理和 API 路由为高性能的服务器渲染代码，输出到 `dist/server`。
2. 将前台页面（首页、文章列表、文章详情、随笔等）预渲染成纯静态 HTML 页面，输出到 `dist/client`，提供极致的打开速度。

### 2. 启动生产服务器

配置好环境变量，然后在根目录直接启动：

```bash
# 配置管理员解锁密钥，并使用 Bun 启动 Astro 服务
ADMIN_SECRET=your_secure_password HOST=0.0.0.0 PORT=3000 bun run start
```

服务将运行在 `3000` 端口。你只需配置 Nginx / Caddy 反向代理到该端口即可完成部署。

### 3. 图片持久化 (重要)

如果没有配置七牛云，上传的图片将默认存放在根目录下的 `uploads/` 目录中。在容器化部署或云主机部署时，请确保将该 `uploads` 文件夹以及 `blog.db` 文件进行持久化挂载，防止重启或重新构建时数据丢失。

---

## 环境变量配置

在项目根目录的 `.env` 中，支持以下环境变量：

*   **`PUBLIC_SERVER_URL`**, **`VITE_SERVER_URL`**, **`VITE_API_URL`**: Astro 前台页面和 Vue 后台页面请求后端 API 的基础地址。本地开发默认 `http://localhost:4321`，生产环境需配置为你的实际域名（如 `https://blog.example.com`）。
*   **`ADMIN_SECRET`**: 后台管理系统登录和 API 鉴权的密钥，建议修改为强密码（默认为 `123456`）。
*   **`DB_PATH`**: SQLite 数据库文件的存放路径。如果不配置，默认会在根目录下创建 `blog.db`。
*   **七牛云存储配置 (可选)**: 用于图片上传。如果不配置，图片将默认保存在本地 `uploads/` 目录下。
    *   `QINIU_ACCESS_KEY`: 七牛云 AK
    *   `QINIU_SECRET_KEY`: 七牛云 SK
    *   `QINIU_BUCKET`: 存储桶名称
    *   `QINIU_DOMAIN`: 绑定的下载域名

---

## 核心 API

### 认证

所有非 GET 请求需要在请求头中包含：

```
Authorization: Bearer {ADMIN_SECRET}
```

`ADMIN_SECRET` 默认值为 `123456`，请在部署时通过环境变量进行更改。

### API 路径一览

*   **博客文章**：
    *   `GET /api/posts` - 获取所有文章列表
    *   `GET /api/post/:slug` - 获取单篇文章
    *   `POST /api/post` - 创建/更新文章（需鉴权）
    *   `DELETE /api/post/:slug` - 删除文章（需鉴权）
*   **随笔 record**：
    *   `GET /api/thoughts` - 获取所有随笔
    *   `POST /api/thought` - 创建/更新随笔（需鉴权）
    *   `DELETE /api/thought/:id` - 删除随笔（需鉴权）
*   **文件上传**：
    *   `POST /api/upload` - 上传图片文件，如果配置了七牛云环境变量，则上传到七牛云；否则自动保存至本地 `./uploads/` 并返回相对路径 `/api/uploads/:filename`（需鉴权）
    *   `GET /api/uploads/:filename` - 访问本地已上传的图片
*   **互动模块**：
    *   `POST /api/like` - 文章/随笔点赞
    *   `GET /api/comments` - 获取目标评论列表
    *   `POST /api/comment` - 提交新评论
    *   `GET /api/all-comments` - 获取所有评论（管理端，需鉴权）
    *   `DELETE /api/comment/:id` - 删除指定评论（需鉴权）
*   **重新构建触发器**：
    *   `POST /api/build` - 管理员发布新文章后，在后台触发 Astro 重新生成前台静态页面，实现发布即生效（需鉴权）
