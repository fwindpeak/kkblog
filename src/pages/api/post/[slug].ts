import type { APIRoute } from 'astro';
import { db } from '../../../lib/db';
import { jsonResponse, verifyAuth } from '../../../lib/apiHelper';

export const GET: APIRoute = async ({ params }) => {
  const { slug } = params;
  if (!slug) {
    return jsonResponse({ error: "Missing slug" }, 400);
  }

  try {
    const post = db.query("SELECT * FROM posts WHERE slug = $slug").get({ $slug: slug });
    if (post) {
      return jsonResponse(post);
    }
    return jsonResponse({ error: "Not Found" }, 404);
  } catch (e) {
    return jsonResponse({ error: String(e) }, 500);
  }
};

export const DELETE: APIRoute = async ({ params, request }) => {
  if (!verifyAuth(request)) {
    return jsonResponse({ error: "Unauthorized" }, 401);
  }

  const { slug } = params;
  if (!slug) {
    return jsonResponse({ error: "Missing slug" }, 400);
  }

  try {
    db.query("DELETE FROM posts WHERE slug = $slug").run({ $slug: slug });
    return jsonResponse({ success: true });
  } catch (e) {
    return jsonResponse({ error: String(e) }, 500);
  }
};

export const OPTIONS: APIRoute = async () => {
  return jsonResponse(null);
};
