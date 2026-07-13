import type { APIRoute } from 'astro';
import { db } from '../../lib/db';
import { jsonResponse } from '../../lib/apiHelper';

export const GET: APIRoute = async () => {
  try {
    const thoughts = db.query("SELECT * FROM thoughts ORDER BY created_at DESC").all();
    return jsonResponse(thoughts);
  } catch (e) {
    return jsonResponse({ error: String(e) }, 500);
  }
};

export const OPTIONS: APIRoute = async () => {
  return jsonResponse(null);
};
