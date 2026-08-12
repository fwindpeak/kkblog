import type { APIRoute } from 'astro';
import { join } from 'path';
import { existsSync, readdirSync, statSync, unlinkSync } from 'fs';
import { db } from '../../lib/db';
import { jsonResponse, verifyAuth } from '../../lib/apiHelper';
import qiniu from 'qiniu';

const UPLOAD_DIR = join(process.cwd(), "uploads");
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

export const POST: APIRoute = async ({ request }) => {
  if (!verifyAuth(request)) {
    return jsonResponse({ error: "Unauthorized" }, 401);
  }

  try {
    // 1. Gather all content from database
    const posts = db.query("SELECT content FROM posts").all() as { content: string }[];
    const thoughts = db.query("SELECT content FROM thoughts").all() as { content: string }[];
    const allContent = [...posts, ...thoughts].map(item => item.content || '').join("\n");

    const isUsed = (fileKey: string) => {
      // Check if the filename or key exists anywhere in the markdown content
      return allContent.includes(fileKey) || allContent.includes(encodeURI(fileKey));
    };

    const AK = process.env.QINIU_ACCESS_KEY;
    const SK = process.env.QINIU_SECRET_KEY;
    const BUCKET = process.env.QINIU_BUCKET;
    let deletedCount = 0;
    const now = Date.now();

    // 2. Scan and clean Qiniu bucket if configured
    if (AK && SK && BUCKET) {
      const mac = new qiniu.auth.digest.Mac(AK, SK);
      const config = new qiniu.conf.Config();
      const bucketManager = new qiniu.rs.BucketManager(mac, config);

      // List all files with 'gkblog/' prefix
      const items = await new Promise<any[]>((resolve, reject) => {
        bucketManager.listPrefix(BUCKET, { prefix: 'gkblog/' }, (err, respBody, respInfo) => {
          if (err) return reject(err);
          if (respInfo.statusCode === 200) {
            resolve(respBody.items || []);
          } else {
            reject(new Error(respBody.error || "Failed to list Qiniu files"));
          }
        });
      });

      const orphans = [];
      for (const item of items) {
        const putTimeMs = item.putTime / 10000; // putTime is 100-nanoseconds
        if (now - putTimeMs < ONE_DAY_MS) continue; // Skip recent files (24h buffer)

        if (!isUsed(item.key)) {
          orphans.push(item.key);
        }
      }

      // Batch delete
      if (orphans.length > 0) {
        // Qiniu batch delete allows max 1000 items per request, handling in one chunk here assuming < 1000 orphans
        const deleteOps = orphans.map(key => qiniu.rs.deleteOp(BUCKET, key));
        await new Promise((resolve, reject) => {
          bucketManager.batch(deleteOps, (err, respBody, respInfo) => {
            if (err) return reject(err);
            if (respInfo.statusCode === 200 || respInfo.statusCode === 298) {
              deletedCount += orphans.length;
              resolve(true);
            } else {
              reject(new Error("Qiniu batch delete failed"));
            }
          });
        });
      }
    } 

    // 3. Scan and clean local storage
    if (existsSync(UPLOAD_DIR)) {
      const files = readdirSync(UPLOAD_DIR);
      for (const file of files) {
        // Skip hidden files or non-image files if necessary, here we check all
        if (file.startsWith('.')) continue;

        const filePath = join(UPLOAD_DIR, file);
        const stats = statSync(filePath);
        
        if (now - stats.mtimeMs < ONE_DAY_MS) continue; // 24h buffer

        if (!isUsed(file)) {
          unlinkSync(filePath);
          deletedCount++;
        }
      }
    }

    return jsonResponse({ success: true, deletedCount });
  } catch (e) {
    console.error('GC error:', e);
    return jsonResponse({ error: String(e) }, 500);
  }
};

export const OPTIONS: APIRoute = async () => {
  return jsonResponse(null);
};
