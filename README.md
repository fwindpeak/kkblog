# Astro 个人博客系统

一个基于现代 Web 技术栈构建的个人博客系统，包含前端展示、后端 API 和管理界面。

## 技术栈

### 前端 (Frontend)
- **框架**: [Astro](https://astro.build/) - 现代静态站点生成器
- **样式**: [TailwindCSS](https://tailwindcss.com/) - 实用优先的 CSS 框架
- **语言**: TypeScript
- **依赖**: marked (Markdown 解析)

### 后端 (Backend)
- **运行时**: [Bun](https://bun.sh/) - 高性能 JavaScript/TypeScript 运行时
- **数据库**: SQLite - 轻量级嵌入式数据库
- **语言**: TypeScript

### 管理界面 (Admin)
- **框架**: Vue 3 - 渐进式 JavaScript 框架
- **构建工具**: Vite - 下一代前端构建工具
- **样式**: TailwindCSS
- **语言**: TypeScript
- **依赖**: marked (Markdown 解析)

## 目录结构

```
gkblog-astro/
├── admin-vue/          # Vue 3 管理界面
│   ├── public/         # 静态资源
│   ├── src/            # 源代码
│   │   ├── components/ # Vue 组件
│   │   ├── pages/      # 页面组件
│   │   └── App.vue     # 根组件
│   └── package.json    # 依赖配置
├── backend/            # Bun 后端 API
│   ├── index.ts        # 主入口文件
│   ├── blog.db         # SQLite 数据库
│   └── package.json    # 依赖配置
├── frontend/           # Astro 前端
│   ├── public/         # 静态资源
│   ├── src/            # 源代码
│   │   ├── components/ # Astro 组件
│   │   ├── layouts/    # 布局组件
│   │   └── pages/      # 页面
│   └── package.json    # 依赖配置
└── README.md           # 项目说明
```

## 快速开始

### 前置条件

- 安装 [Bun](https://bun.sh/) (推荐) 或 Node.js 18+
- 安装 Git

### 安装依赖

```bash
# 安装前端依赖
cd frontend
bun install

# 安装后端依赖
cd ../backend
bun install

# 安装管理界面依赖
cd ../admin-vue
bun install
```

### 启动开发服务器

#### 1. 启动后端 API

```bash
cd backend
bun run dev
```

后端服务将运行在 `http://localhost:3000`

#### 2. 启动前端

```bash
cd frontend
bun run dev
```

前端开发服务器将运行在 `http://localhost:4321`

#### 3. 启动管理界面

```bash
cd admin-vue
bun run dev
```

管理界面将运行在 `http://localhost:5173`

### 构建生产版本

#### 构建前端

```bash
cd frontend
bun run build
```

#### 构建后端

```bash
cd backend
bun run build
```

#### 构建管理界面

```bash
cd admin-vue
bun run build
```

## API 文档

### 认证

所有非 GET 请求需要在请求头中包含认证信息：

```
Authorization: Bearer {ADMIN_SECRET}
```

`ADMIN_SECRET` 默认值为 `123456`，可以通过环境变量配置。

### 博客文章 (Posts)

#### 获取所有文章

```
GET /api/posts
```

返回所有文章列表，按创建时间降序排列。

#### 获取单篇文章

```
GET /api/post/:slug
```

根据文章的 slug 获取单篇文章。

#### 创建/更新文章

```
POST /api/post
```

请求体：

```json
{
  "slug": "article-slug",
  "title": "文章标题",
  "content": "Markdown 格式的文章内容",
  "tags": ["标签1", "标签2"],
  "read_time": "5"
}
```

#### 删除文章

```
DELETE /api/post/:slug
```

### 随笔 (Thoughts)

#### 获取所有随笔

```
GET /api/thoughts
```

返回所有随笔列表，按创建时间降序排列。

#### 创建/更新随笔

```
POST /api/thought
```

请求体：

```json
{
  "id": 1,          // 更新时需要提供
  "content": "随笔内容",
  "mood": "happy"  // 可选，心情标签
}
```

#### 删除随笔

```
DELETE /api/thought/:id
```

### 文件上传

#### 上传图片

```
POST /api/upload
```

请求体：FormData，包含 `file` 字段。

响应：

```json
{
  "success": true,
  "url": "http://localhost:3000/api/uploads/1234567890-image.jpg"
}
```

#### 访问上传的图片

```
GET /api/uploads/:filename
```

### 构建触发

```
POST /api/build
```

触发前端项目构建。

## 核心功能

1. **博客文章管理**
   - 支持 Markdown 格式
   - 自动生成文章摘要
   - 阅读时间统计
   - 标签系统

2. **随笔功能**
   - 支持心情标签
   - 简洁的发布体验

3. **媒体管理**
   - 图片上传功能
   - 自动生成访问 URL

4. **管理界面**
   - 基于 Vue 3 的现代化界面
   - 实时预览 Markdown
   - 便捷的内容管理

5. **自动化构建**
   - 支持通过 API 触发构建
   - 便于集成 CI/CD

## 环境变量

### 后端

- `ADMIN_SECRET` - 管理员密钥，用于 API 认证

## 部署

### 后端

```bash
cd backend
bun run build
ADMIN_SECRET=your-secret bun run start
```

### 前端

```bash
cd frontend
bun run build
# 将 dist 目录部署到静态文件服务器
```

### 管理界面

```bash
cd admin-vue
bun run build
# 将 dist 目录部署到静态文件服务器
```

## 开发指南

### 数据库结构

#### posts 表

| 字段名      | 类型       | 说明                  |
|------------|------------|----------------------|
| id         | INTEGER    | 主键，自增            |
| slug       | TEXT       | 文章唯一标识          |
| title      | TEXT       | 文章标题              |
| content    | TEXT       | 文章内容（Markdown）  |
| excerpt    | TEXT       | 文章摘要              |
| tags       | TEXT       | 标签数组（JSON 字符串）|
| read_time  | TEXT       | 阅读时间（分钟）      |
| created_at | DATETIME   | 创建时间              |

#### thoughts 表

| 字段名      | 类型       | 说明                  |
|------------|------------|----------------------|
| id         | INTEGER    | 主键，自增            |
| content    | TEXT       | 随笔内容              |
| mood       | TEXT       | 心情标签              |
| created_at | DATETIME   | 创建时间              |

## 贡献

欢迎提交 Issues 和 Pull Requests！

## 许可证

MIT License
