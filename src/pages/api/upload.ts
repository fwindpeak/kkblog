import type { APIRoute } from 'astro';
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { jsonResponse, verifyAuth } from '../../lib/apiHelper';
import qiniu from 'qiniu';

const UPLOAD_DIR = join(process.cwd(), "uploads");

// Ensure upload directory exists
if (!existsSync(UPLOAD_DIR)) {
  mkdirSync(UPLOAD_DIR, { recursive: true });
}

export const POST: APIRoute = async ({ request }) => {
  if (!verifyAuth(request)) {
    return jsonResponse({ error: "Unauthorized" }, 401);
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file');

    if (!file || !(file instanceof File)) {
      return jsonResponse({ error: "No file uploaded" }, 400);
    }

    // Unique filename: timestamp-filename
    const fileName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`; // clean filename

    const AK = process.env.QINIU_ACCESS_KEY;
    const SK = process.env.QINIU_SECRET_KEY;
    const BUCKET = process.env.QINIU_BUCKET;
    const DOMAIN = process.env.QINIU_DOMAIN;

    // Use Qiniu if configured
    if (AK && SK && BUCKET && DOMAIN) {
      const mac = new qiniu.auth.digest.Mac(AK, SK);
      const putPolicy = new qiniu.rs.PutPolicy({ scope: BUCKET });
      const uploadToken = putPolicy.uploadToken(mac);

      const config = new qiniu.conf.Config();
      const formUploader = new qiniu.form_up.FormUploader(config);
      const putExtra = new qiniu.form_up.PutExtra();

      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // Create a sub-directory structure for Qiniu: gkblog/YYYY-MM/
      const date = new Date();
      const folder = `gkblog/${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const qiniuKey = `${folder}/${fileName}`;

      return new Promise((resolve) => {
        formUploader.put(uploadToken, qiniuKey, buffer, putExtra, (err, body, info) => {
          if (err) {
            console.error('Qiniu upload error:', err);
            resolve(jsonResponse({ error: "上传七牛云失败" }, 500));
          } else if (info.statusCode === 200) {
            let safeDomain = DOMAIN.replace(/\/$/, '');
            if (!safeDomain.startsWith('http') && !safeDomain.startsWith('//')) {
              safeDomain = `//${safeDomain}`;
            }
            const fileUrl = `${safeDomain}/${qiniuKey}`;
            resolve(jsonResponse({ success: true, url: fileUrl }));
          } else {
            console.error('Qiniu response:', body);
            resolve(jsonResponse({ error: "上传七牛云异常: " + info.statusCode }, 500));
          }
        });
      });
    } 
    // Fallback to local upload
    else {
      const filePath = join(UPLOAD_DIR, fileName);
      await Bun.write(filePath, file);
      const fileUrl = `/api/uploads/${fileName}`;
      return jsonResponse({ success: true, url: fileUrl });
    }
  } catch (e) {
    console.error('Upload catch error:', e);
    return jsonResponse({ error: String(e) }, 500);
  }
};

export const OPTIONS: APIRoute = async () => {
  return jsonResponse(null);
};
