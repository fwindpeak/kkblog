import type { APIRoute } from 'astro';
import { db } from '../../lib/db';
import { jsonResponse } from '../../lib/apiHelper';

export const GET: APIRoute = async ({ request }) => {
  try {
    const url = new URL(request.url);
    const type = url.searchParams.get('type');
    const idsParam = url.searchParams.get('ids');

    if (!type || (type !== 'post' && type !== 'thought')) {
      return jsonResponse({ error: 'Invalid type' }, 400);
    }

    let query = '';
    let params: Record<string, any> = {};

    if (idsParam) {
      const ids = idsParam.split(',');
      const placeholders = ids.map((_, i) => `$id${i}`).join(',');
      ids.forEach((id, i) => {
        params[`$id${i}`] = id;
      });
      if (type === 'post') {
        query = `SELECT slug as id, likes FROM posts WHERE slug IN (${placeholders})`;
      } else {
        query = `SELECT id, likes FROM thoughts WHERE id IN (${placeholders})`;
      }
    } else {
      if (type === 'post') {
        query = `SELECT slug as id, likes FROM posts`;
      } else {
        query = `SELECT id, likes FROM thoughts`;
      }
    }

    const results = db.query(query).all(params);
    const likesMap = results.reduce((acc: Record<string, number>, row: any) => {
      acc[row.id] = row.likes || 0;
      return acc;
    }, {});

    return jsonResponse(likesMap);
  } catch (e) {
    return jsonResponse({ error: String(e) }, 500);
  }
};

export const OPTIONS: APIRoute = async () => {
  return jsonResponse(null);
};
