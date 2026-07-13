import type { APIRoute } from 'astro';
import { db } from '../../lib/db';
import { jsonResponse } from '../../lib/apiHelper';

export const GET: APIRoute = async () => {
  try {
    const posts = db.query("SELECT * FROM posts ORDER BY created_at DESC").all();
    const parsedPosts = posts.map((p: any) => ({
      ...p,
      tags: p.tags ? JSON.parse(p.tags) : []
    }));
    return jsonResponse(parsedPosts);
  } catch (e) {
    return jsonResponse({ error: String(e) }, 500);
  }
};

export const OPTIONS: APIRoute = async () => {
  return jsonResponse(null);
};
