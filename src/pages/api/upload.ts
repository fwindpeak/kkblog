import type { APIRoute } from 'astro';
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { jsonResponse, verifyAuth } from '../../lib/apiHelper';

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
    const fileName = `${Date.now()}-${file.name}`;
    const filePath = join(UPLOAD_DIR, fileName);

    // Write file using Bun (since Bun environment is used)
    await Bun.write(filePath, file);

    // Relative url works automatically on any domain
    const fileUrl = `/api/uploads/${fileName}`;

    return jsonResponse({ success: true, url: fileUrl });
  } catch (e) {
    return jsonResponse({ error: String(e) }, 500);
  }
};

export const OPTIONS: APIRoute = async () => {
  return jsonResponse(null);
};
