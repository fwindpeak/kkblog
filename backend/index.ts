// server.ts
import { Database } from "bun:sqlite";

// === 配置区 ===
// 从环境变量获取密钥，如果没有设置则默认为 "123456"
const ADMIN_SECRET = Bun.env.ADMIN_SECRET || "123456";
const FRONTEND_DIR = "../"; // 你的 SSG 项目路径

const db = new Database("blog.db");
db.run(`
  CREATE TABLE IF NOT EXISTS posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    slug TEXT UNIQUE,
    title TEXT,
    content TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

const server = Bun.serve({
    port: 3000,
    async fetch(req) {
        const url = new URL(req.url);
        const method = req.method;

        // 1. CORS 设置 (增加了 Authorization)
        const headers = {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, Authorization", // 允许鉴权头
            "Content-Type": "application/json",
        };

        // 处理预检请求
        if (method === "OPTIONS") return new Response(null, { headers });

        // === 鉴权中间件逻辑 ===
        // 只有 POST 请求需要鉴权
        if (method === "POST") {
            const authHeader = req.headers.get("Authorization");
            // 检查格式是否为 "Bearer <密钥>"
            if (!authHeader || authHeader !== `Bearer ${ADMIN_SECRET}`) {
                return new Response(JSON.stringify({ error: "Unauthorized" }), {
                    status: 401,
                    headers
                });
            }
        }

        // === 路由 ===

        // 1. 获取文章列表 (无需鉴权，构建脚本也要用)
        if (method === "GET" && url.pathname === "/api/posts") {
            const posts = db.query("SELECT * FROM posts ORDER BY created_at DESC").all();
            return new Response(JSON.stringify(posts), { headers });
        }

        // 2. 保存/更新文章 (需要鉴权)
        if (method === "POST" && url.pathname === "/api/post") {
            try {
                const body = await req.json();
                const { slug, title, content } = body;

                const query = db.query(`
          INSERT INTO posts (slug, title, content) VALUES ($slug, $title, $content)
          ON CONFLICT(slug) DO UPDATE SET title=$title, content=$content
        `);
                query.run({ $slug: slug, $title: title, $content: content });

                return new Response(JSON.stringify({ success: true }), { headers });
            } catch (e) {
                return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers });
            }
        }

        // 3. 触发构建 (需要鉴权)
        if (method === "POST" && url.pathname === "/api/build") {
            console.log("🛠️ 收到构建请求...");
            try {
                const proc = Bun.spawn(["bun", "run", "build"], {
                    cwd: FRONTEND_DIR,
                    stdout: "inherit",
                    stderr: "inherit"
                });
                await proc.exited;
                return new Response(JSON.stringify({ status: "Build Complete" }), { headers });
            } catch (err) {
                return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers });
            }
        }

        return new Response("Not Found", { status: 404, headers });
    },
});

console.log(`🚀 服务运行中: http://localhost:${server.port}`);
console.log(`🔒 当前管理密钥: ${ADMIN_SECRET}`);