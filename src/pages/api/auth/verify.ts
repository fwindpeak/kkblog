import type { APIRoute } from 'astro';
import { jsonResponse } from '../../../lib/apiHelper';

const ADMIN_SECRET = process.env.ADMIN_SECRET || "123456";

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json() as { secret: string };
    const { secret } = body;
    if (secret === ADMIN_SECRET) {
      return jsonResponse({ success: true });
    } else {
      return jsonResponse({ error: "密码错误" }, 401);
    }
  } catch (e) {
    return jsonResponse({ error: String(e) }, 500);
  }
};

export const OPTIONS: APIRoute = async () => {
  return jsonResponse(null);
};
