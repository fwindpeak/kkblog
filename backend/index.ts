// server.ts
import { Database } from "bun:sqlite";

const ADMIN_SECRET = Bun.env.ADMIN_SECRET || "123456";
const FRONTEND_DIR = "../frontend";

const db = new Database("blog.db");
// 确保表结构存在
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

        // --- API ---

        // 1. 列表
        if (method === "GET" && url.pathname === "/api/posts") {
            const posts = db.query("SELECT * FROM posts ORDER BY created_at DESC").all();
            return new Response(JSON.stringify(posts), { headers });
        }

        // 2. 保存 (新建或更新)
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

        // 3. 删除 (新功能)
        if (method === "DELETE" && url.pathname.startsWith("/api/post/")) {
            const slug = url.pathname.split("/").pop(); // 获取 /api/post/slug 中的 slug
            db.query("DELETE FROM posts WHERE slug = $slug").run({ $slug: slug });
            return new Response(JSON.stringify({ success: true }), { headers });
        }

        // 4. 构建
        if (method === "POST" && url.pathname === "/api/build") {
            try {
                const proc = Bun.spawn(["npm", "run", "build"], { cwd: FRONTEND_DIR });
                await proc.exited;
                return new Response(JSON.stringify({ status: "Build Complete" }), { headers });
            } catch (err) {
                return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers });
            }
        }

        return new Response("Not Found", { status: 404, headers });
    },
});

console.log(`Backend running on http://localhost:${server.port}`);