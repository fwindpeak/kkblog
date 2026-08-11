import type { APIRoute } from 'astro';
import { db } from '../../lib/db';
import { jsonResponse } from '../../lib/apiHelper';

export const GET: APIRoute = async ({ request }) => {
  const token = request.headers.get('Authorization')?.replace('Bearer ', '');
  if (token !== import.meta.env.ADMIN_SECRET) {
    return jsonResponse({ error: 'Unauthorized' }, 401);
  }

  try {
    const totalViews = db.query(`SELECT COUNT(*) as count FROM page_views`).get() as { count: number };
    const uniqueIPs = db.query(`SELECT COUNT(DISTINCT ip) as count FROM page_views`).get() as { count: number };
    const topPages = db.query(`
      SELECT path, COUNT(*) as views 
      FROM page_views 
      GROUP BY path 
      ORDER BY views DESC 
      LIMIT 10
    `).all();
    const recentVisits = db.query(`
      SELECT path, ip, created_at 
      FROM page_views 
      ORDER BY created_at DESC 
      LIMIT 20
    `).all();

    return jsonResponse({
      totalViews: totalViews.count,
      uniqueIPs: uniqueIPs.count,
      topPages,
      recentVisits
    });
  } catch (e) {
    console.error('Stats fetch error:', e);
    return jsonResponse({ error: String(e) }, 500);
  }
};
