import type { APIRoute } from 'astro';
import { join } from 'path';
import { existsSync, readFileSync } from 'fs';

const UPLOAD_DIR = join(process.cwd(), "uploads");

export const GET: APIRoute = async ({ params }) => {
  const { filename } = params;
  if (!filename) {
    return new Response("Missing filename", { status: 400 });
  }

  const filePath = join(UPLOAD_DIR, filename);
  
  if (existsSync(filePath)) {
    try {
      const file = Bun.file(filePath);
      return new Response(file);
    } catch (e) {
      // Node.js fallback if Bun is not available
      const buffer = readFileSync(filePath);
      return new Response(buffer);
    }
  }

  return new Response("File not found", { status: 404 });
};
