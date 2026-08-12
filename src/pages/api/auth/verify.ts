import type { APIRoute } from 'astro';
import { jsonResponse } from '../../../lib/apiHelper';

import { db } from '../../../lib/db';

const ADMIN_SECRET = process.env.ADMIN_SECRET || "123456";
const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes in ms

export const POST: APIRoute = async ({ request, clientAddress }) => {
  try {
    const ip = clientAddress || request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    const now = Date.now();

    // 1. Check if IP is currently locked out
    let attemptRecord = db.query("SELECT * FROM login_attempts WHERE ip = $ip").get({ $ip: ip }) as any;
    
    if (attemptRecord && attemptRecord.locked_until > now) {
      const remainingMinutes = Math.ceil((attemptRecord.locked_until - now) / 60000);
      return jsonResponse({ error: `尝试次数过多，请 ${remainingMinutes} 分钟后再试` }, 429);
    }

    // 2. Verify password
    const body = await request.json() as { secret: string };
    const { secret } = body;
    
    if (secret === ADMIN_SECRET) {
      // Success: Clear failed attempts
      db.query("DELETE FROM login_attempts WHERE ip = $ip").run({ $ip: ip });
      return jsonResponse({ success: true });
    } else {
      // Failure: Increment attempts
      let newAttempts = (attemptRecord?.attempts || 0) + 1;
      let newLockedUntil = 0;

      if (newAttempts >= MAX_ATTEMPTS) {
        newLockedUntil = now + LOCKOUT_DURATION;
      }

      if (attemptRecord) {
        db.query("UPDATE login_attempts SET attempts = $attempts, locked_until = $locked_until WHERE ip = $ip")
          .run({ $attempts: newAttempts, $locked_until: newLockedUntil, $ip: ip });
      } else {
        db.query("INSERT INTO login_attempts (ip, attempts, locked_until) VALUES ($ip, $attempts, $locked_until)")
          .run({ $ip: ip, $attempts: newAttempts, $locked_until: newLockedUntil });
      }

      if (newLockedUntil > 0) {
        return jsonResponse({ error: `连续输错 ${MAX_ATTEMPTS} 次，该IP已锁定 15 分钟` }, 429);
      } else {
        return jsonResponse({ error: `密码错误，剩余尝试机会 ${MAX_ATTEMPTS - newAttempts} 次` }, 401);
      }
    }
  } catch (e) {
    console.error('Login verify error:', e);
    return jsonResponse({ error: String(e) }, 500);
  }
};

export const OPTIONS: APIRoute = async () => {
  return jsonResponse(null);
};
