const ADMIN_SECRET = process.env.ADMIN_SECRET || "123456";

export function verifyAuth(request: Request): boolean {
  const authHeader = request.headers.get("Authorization");
  return authHeader === `Bearer ${ADMIN_SECRET}`;
}

export function jsonResponse(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization"
    }
  });
}
