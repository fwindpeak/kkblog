import type { APIRoute } from 'astro';
import { db } from '../../lib/db';
import { jsonResponse } from '../../lib/apiHelper';

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json() as { type: string, id: string, author: string, content: string };
    const { type, id, author, content } = body;
    db.query(`
      INSERT INTO comments (target_id, target_type, author, content, created_at) 
      VALUES ($id, $type, $author, $content, datetime('now', '+08:00'))
    `).run({ $id: id, $type: type, $author: author || '匿名', $content: content });
    return jsonResponse({ success: true });
  } catch (e) {
    return jsonResponse({ error: String(e) }, 500);
  }
};

export const OPTIONS: APIRoute = async () => {
  return jsonResponse(null);
};
