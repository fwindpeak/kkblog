import type { APIRoute } from 'astro';
import { db } from '../../lib/db';
import { jsonResponse, verifyAuth } from '../../lib/apiHelper';

export const POST: APIRoute = async ({ request }) => {
  if (!verifyAuth(request)) {
    return jsonResponse({ error: "Unauthorized" }, 401);
  }

  try {
    const body = await request.json();
    const { id, content, mood } = body as { id?: number; content: string; mood?: string };

    if (id) {
      const query = db.query(`
        UPDATE thoughts 
        SET content = $content, mood = $mood 
        WHERE id = $id
      `);
      query.run({ $content: content, $mood: mood || 'neutral', $id: id });
    } else {
      const query = db.query(`
        INSERT INTO thoughts (content, mood, created_at) 
        VALUES ($content, $mood, datetime('now', '+08:00'))
      `);
      query.run({ $content: content, $mood: mood || 'neutral' });
    }
    return jsonResponse({ success: true });
  } catch (e) {
    return jsonResponse({ error: String(e) }, 500);
  }
};

export const OPTIONS: APIRoute = async () => {
  return jsonResponse(null);
};
