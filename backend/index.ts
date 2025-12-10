// server.ts
import { Database } from "bun:sqlite";
import { join } from "path"; // 引入 path 模块

const ADMIN_SECRET = Bun.env.ADMIN_SECRET || "123456";
const FRONTEND_DIR = "../frontend";
const UPLOAD_DIR = "./uploads"; // 确保 uploads 目录存在

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
    read_time TEXT, 
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
    hostname: Bun.env.SERVER_HOST || "0.0.0.0",
    port: Number(Bun.env.SERVER_PORT) || 3000,
    // 增大最大请求体大小 (默认较小，传图片可能不够)
    maxRequestBodySize: 1024 * 1024 * 50, // 50MB
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

        // --- 静态文件服务 (图片访问) ---
        // 访问 http://localhost:3000/uploads/xxx.jpg
        if (method === "GET" && url.pathname.startsWith("/api/uploads/")) {
            const fileName = url.pathname.replace("/api/uploads/", "");
            const filePath = join(UPLOAD_DIR, fileName);
            console.log(filePath);
            const file = Bun.file(filePath);
            if (await file.exists()) {
                return new Response(file);
            }
            return new Response("File not found", { status: 404 });
        }

        // --- API: 图片上传 ---
        if (method === "POST" && url.pathname === "/api/upload") {
            try {
                // 鉴权
                const authHeader = req.headers.get("Authorization");
                if (!authHeader || authHeader !== `Bearer ${ADMIN_SECRET}`) {
                    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers });
                }

                const formData = await req.formData();
                const file = formData.get('file');

                if (!file || !(file instanceof Blob)) {
                    return new Response(JSON.stringify({ error: "No file uploaded" }), { status: 400, headers });
                }

                // 生成唯一文件名: timestamp-filename
                const fileName = `${Date.now()}-${file.name}`;
                const filePath = join(UPLOAD_DIR, fileName);

                // 写入文件
                await Bun.write(filePath, file);

                // 返回完整的访问 URL
                // 注意：如果你部署到线上，这里要改成你的域名
                const fileUrl = `${Bun.env.SERVER_HOST || "localhost"}:${Bun.env.SERVER_PORT || 3000}/api/uploads/${fileName}`;

                return new Response(JSON.stringify({ success: true, url: fileUrl }), { headers: { ...headers, "Content-Type": "application/json" } });

            } catch (e) {
                console.error(e);
                return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers });
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
                // 🟢 获取 read_time
                const { slug, title, content, tags, read_time } = body;

                const plainText = content.replace(/[#*`!\[\]\(\)]/g, '').substring(0, 100) + '...';
                const tagsStr = JSON.stringify(tags || []);

                // 🟢 SQL 增加 read_time 字段
                const query = db.query(`
          INSERT INTO posts (slug, title, content, excerpt, tags, read_time, created_at) 
          VALUES ($slug, $title, $content, $excerpt, $tagsStr, $read_time, datetime('now', '+08:00'))
          ON CONFLICT(slug) DO UPDATE SET 
            title=$title, 
            content=$content, 
            excerpt=$excerpt, 
            tags=$tagsStr, 
            read_time=$read_time
        `);

                query.run({
                    $slug: slug,
                    $title: title,
                    $content: content,
                    $excerpt: plainText,
                    $tagsStr: tagsStr,
                    $read_time: read_time || '1' // 默认值
                });
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
                const { id, content, mood } = body as { id?: number; content: string; mood?: string }; // 🟢 获取 id

                if (id) {
                    // 🟢 如果有 ID，执行 UPDATE
                    // 注意：随笔修改通常不更新 created_at，保持“原汁原味”
                    const query = db.query(`
                    UPDATE thoughts 
                    SET content = $content, mood = $mood 
                    WHERE id = $id
                `);
                    query.run({ $content: content, $mood: mood || 'neutral', $id: id });
                } else {
                    // 🟢 没有 ID，执行 INSERT (保持之前的东八区时间逻辑)
                    const query = db.query(`
                    INSERT INTO thoughts (content, mood, created_at) 
                    VALUES ($content, $mood, datetime('now', '+08:00'))
                `);
                    query.run({ $content: content, $mood: mood || 'neutral' });
                }
                return new Response(JSON.stringify({ success: true }), { headers });
            } catch (e) {
                return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers });
            }
        }

        if (method === "DELETE" && url.pathname.startsWith("/api/thought/")) {
            const id = url.pathname.split("/").pop(); // 🟢 确保 ID 是数字
            db.query("DELETE FROM thoughts WHERE id = $id").run({ $id: id });
            return new Response(JSON.stringify({ success: true }), { headers });
        }

        // --- 构建触发器 ---
        if (method === "POST" && url.pathname === "/api/build") {
            // ... 保持原有构建逻辑 ...
            // 确保 cwd 指向你的 Astro 项目目录
            const proc = Bun.spawn(["bun", "run", "build"], { cwd: FRONTEND_DIR });
            return new Response(JSON.stringify({ status: "Build Triggered" }), { headers });
        }

        return new Response("Not Found", { status: 404, headers });
    },
});

console.log(`Backend running on http://${server.hostname}:${server.port}`);
