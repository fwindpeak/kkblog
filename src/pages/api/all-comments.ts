import type { APIRoute } from 'astro';
import { db } from '../../lib/db';
import { jsonResponse } from '../../lib/apiHelper';

export const GET: APIRoute = async () => {
  try {
    const comments = db.query("SELECT * FROM comments ORDER BY created_at DESC").all();
    return jsonResponse(comments);
  } catch (e) {
    return jsonResponse({ error: String(e) }, 500);
  }
};

export const OPTIONS: APIRoute = async () => {
  return jsonResponse(null);
};
