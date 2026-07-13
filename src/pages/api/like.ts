import type { APIRoute } from 'astro';
import { db } from '../../lib/db';
import { jsonResponse } from '../../lib/apiHelper';

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json() as { type: 'post' | 'thought', id: string | number };
    const { type, id } = body;
    if (type === 'post') {
      db.query("UPDATE posts SET likes = likes + 1 WHERE slug = $id").run({ $id: id });
    } else {
      db.query("UPDATE thoughts SET likes = likes + 1 WHERE id = $id").run({ $id: id });
    }
    return jsonResponse({ success: true });
  } catch (e) {
    return jsonResponse({ error: String(e) }, 500);
  }
};

export const OPTIONS: APIRoute = async () => {
  return jsonResponse(null);
};
