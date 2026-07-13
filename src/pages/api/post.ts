import type { APIRoute } from 'astro';
import { db } from '../../lib/db';
import { jsonResponse, verifyAuth } from '../../lib/apiHelper';

export const POST: APIRoute = async ({ request }) => {
  if (!verifyAuth(request)) {
    return jsonResponse({ error: "Unauthorized" }, 401);
  }

  try {
    const body = await request.json() as { slug: string; title: string; content: string; tags: string[]; read_time?: string };
    const { slug, title, content, tags, read_time } = body;

    const plainText = content.replace(/[#*`!\[\]\(\)]/g, '').substring(0, 100) + '...';
    const tagsStr = JSON.stringify(tags || []);

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
      $read_time: read_time || '1'
    });

    return jsonResponse({ success: true });
  } catch (e) {
    return jsonResponse({ error: String(e) }, 500);
  }
};

export const OPTIONS: APIRoute = async () => {
  return jsonResponse(null);
};
