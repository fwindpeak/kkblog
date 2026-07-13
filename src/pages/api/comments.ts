import type { APIRoute } from 'astro';
import { db } from '../../lib/db';
import { jsonResponse } from '../../lib/apiHelper';

export const GET: APIRoute = async ({ request }) => {
  try {
    const url = new URL(request.url);
    const target_id = url.searchParams.get("id");
    const target_type = url.searchParams.get("type");

    if (!target_id || !target_type) {
      return jsonResponse({ error: "Missing id or type parameter" }, 400);
    }

    const comments = db.query("SELECT * FROM comments WHERE target_id = $id AND target_type = $type ORDER BY created_at ASC")
      .all({ $id: target_id, $type: target_type });
    return jsonResponse(comments);
  } catch (e) {
    return jsonResponse({ error: String(e) }, 500);
  }
};

export const OPTIONS: APIRoute = async () => {
  return jsonResponse(null);
};
