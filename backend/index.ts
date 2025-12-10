// server.ts
import { Database } from "bun:sqlite";

const ADMIN_SECRET = Bun.env.ADMIN_SECRET || "123456";
const FRONTEND_DIR = "../frontend";

const db = new Database("blog.db");
// 确保表结构存在
// 1. 初始化表结构 (增加 thoughts 表)
db.run(`
  CREATE TABLE IF NOT EXISTS posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    slug TEXT UNIQUE,
    title TEXT,
    content TEXT,
    excerpt TEXT,
    tags TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

db.run(`
  CREATE TABLE IF NOT EXISTS thoughts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    content TEXT,
    mood TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

const server = Bun.serve({
    port: 3000,
    async fetch(req) {
        const url = new URL(req.url);
        const method = req.method;

        // CORS
        const headers = {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS", // 允许 DELETE
            "Access-Control-Allow-Headers": "Content-Type, Authorization",
            "Content-Type": "application/json",
        };

        if (method === "OPTIONS") return new Response(null, { headers });

        // 鉴权 (GET 请求不需要鉴权，方便构建，但为了安全你也可以给 GET /api/posts 加鉴权，
        // 然后构建脚本里也传 token。这里为了简单，GET 设为公开，写操作鉴权)
        if (method !== "GET") {
            const authHeader = req.headers.get("Authorization");
            if (!authHeader || authHeader !== `Bearer ${ADMIN_SECRET}`) {
                return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers });
            }
        }

        // --- API: Posts (博客文章) ---

        if (method === "GET" && url.pathname === "/api/posts") {
            const posts = db.query("SELECT * FROM posts ORDER BY created_at DESC").all();
            // 解析 tags 字符串为数组
            const parsedPosts = posts.map((p: any) => ({
                ...p,
                tags: p.tags ? JSON.parse(p.tags) : []
            }));
            return new Response(JSON.stringify(parsedPosts), { headers });
        }

        if (method === "GET" && url.pathname.startsWith("/api/post/")) {
            const slug = url.pathname.split("/").pop();
            const post = db.query("SELECT * FROM posts WHERE slug = $slug").get({ $slug: slug });
            if (post) {
                return new Response(JSON.stringify(post), { headers });
            }
            return new Response(JSON.stringify({ error: "Not Found" }), { status: 404, headers });
        }

        if (method === "POST" && url.pathname === "/api/post") {
            try {
                const body = await req.json();
                const { slug, title, content, tags } = body;

                // 自动生成 excerpt (摘要)
                const plainText = content.replace(/[#*`!\[\]\(\)]/g, '').substring(0, 100) + '...';
                const tagsStr = JSON.stringify(tags || []);

                const query = db.query(`
          INSERT INTO posts (slug, title, content, excerpt, tags) VALUES ($slug, $title, $content, $excerpt, $tagsStr)
          ON CONFLICT(slug) DO UPDATE SET title=$title, content=$content, excerpt=$excerpt, tags=$tagsStr
        `);
                query.run({ $slug: slug, $title: title, $content: content, $excerpt: plainText, $tagsStr: tagsStr });
                return new Response(JSON.stringify({ success: true }), { headers });
            } catch (e) {
                return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers });
            }
        }

        if (method === "DELETE" && url.pathname.startsWith("/api/post/")) {
            const slug = url.pathname.split("/").pop();
            db.query("DELETE FROM posts WHERE slug = $slug").run({ $slug: slug });
            return new Response(JSON.stringify({ success: true }), { headers });
        }

        // --- API: Thoughts (随笔) ---

        if (method === "GET" && url.pathname === "/api/thoughts") {
            const thoughts = db.query("SELECT * FROM thoughts ORDER BY created_at DESC").all();
            return new Response(JSON.stringify(thoughts), { headers });
        }

        if (method === "POST" && url.pathname === "/api/thought") {
            try {
                const body = await req.json();
                const { content, mood } = body;
                // 简单的插入，随笔暂时不做 update，只做 append
                const query = db.query("INSERT INTO thoughts (content, mood) VALUES ($content, $mood)");
                query.run({ $content: content, $mood: mood || 'neutral' });
                return new Response(JSON.stringify({ success: true }), { headers });
            } catch (e) {
                return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers });
            }
        }

        if (method === "DELETE" && url.pathname.startsWith("/api/thought/")) {
            const id = url.pathname.split("/").pop();
            db.query("DELETE FROM thoughts WHERE id = $id").run({ $id: id });
            return new Response(JSON.stringify({ success: true }), { headers });
        }

        // --- 构建触发器 ---
        if (method === "POST" && url.pathname === "/api/build") {
            // ... 保持原有构建逻辑 ...
            // 确保 cwd 指向你的 Astro 项目目录
            const proc = Bun.spawn(["npm", "run", "build"], { cwd: "../frontend" });
            return new Response(JSON.stringify({ status: "Build Triggered" }), { headers });
        }

        // --- 静态文件托管 (可选，用于本地预览) ---
        // 如果 Astro build 到了 ../frontend/dist
        // ... 参考上一个回答的静态托管逻辑 ...

        return new Response("Not Found", { status: 404, headers });
    },
});

console.log(`Backend running on http://localhost:${server.port}`);