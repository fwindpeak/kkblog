import type { APIRoute } from 'astro';
import { db } from '../../lib/db';
import { jsonResponse } from '../../lib/apiHelper';

export const POST: APIRoute = async ({ request, clientAddress }) => {
  try {
    const body = await request.json();
    const path = body.path || '/';
    
    // Attempt to get IP from headers if clientAddress is not available (e.g. behind proxy)
    const ip = clientAddress || request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    db.query(`
      INSERT INTO page_views (path, ip, user_agent) 
      VALUES ($path, $ip, $userAgent)
    `).run({
      $path: path,
      $ip: ip,
      $userAgent: userAgent
    });

    return jsonResponse({ success: true });
  } catch (e) {
    console.error('Page view tracking error:', e);
    return jsonResponse({ error: String(e) }, 500);
  }
};

export const OPTIONS: APIRoute = async () => {
  return jsonResponse(null);
};
