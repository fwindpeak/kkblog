import type { APIRoute } from 'astro';
import { jsonResponse } from '../../lib/apiHelper';

export const POST: APIRoute = async () => {
  try {
    console.log("Triggering background Astro build...");
    
    // Spawn build in background
    Bun.spawn(["bun", "run", "build"], {
      stdout: "inherit",
      stderr: "inherit"
    });
    
    return jsonResponse({ status: "Build Triggered" });
  } catch (e) {
    return jsonResponse({ error: String(e) }, 500);
  }
};

export const OPTIONS: APIRoute = async () => {
  return jsonResponse(null);
};
