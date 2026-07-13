import type { APIRoute } from 'astro';
import { db } from '../../../lib/db';
import { jsonResponse, verifyAuth } from '../../../lib/apiHelper';

export const DELETE: APIRoute = async ({ params, request }) => {
  if (!verifyAuth(request)) {
    return jsonResponse({ error: "Unauthorized" }, 401);
  }

  const { id } = params;
  if (!id) {
    return jsonResponse({ error: "Missing ID" }, 400);
  }

  try {
    db.query("DELETE FROM comments WHERE id = $id").run({ $id: parseInt(id) });
    return jsonResponse({ success: true });
  } catch (e) {
    return jsonResponse({ error: String(e) }, 500);
  }
};

export const OPTIONS: APIRoute = async () => {
  return jsonResponse(null);
};
