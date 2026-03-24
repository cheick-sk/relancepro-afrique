// CORS configuration

const ALLOWED_ORIGINS = [
  process.env.NEXT_PUBLIC_APP_URL,
  "http://localhost:3000",
  "http://localhost:3001",
].filter(Boolean) as string[]

export function isOriginAllowed(origin: string | null): boolean {
  if (!origin) return true // Allow requests with no origin (mobile apps, etc.)
  return ALLOWED_ORIGINS.includes(origin) || origin.endsWith(".vercel.app")
}

export function handlePreflightRequest(request: Request): Response {
  const origin = request.headers.get("origin") || "*"
  
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": isOriginAllowed(origin) ? origin : ALLOWED_ORIGINS[0],
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, PATCH, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With",
      "Access-Control-Max-Age": "86400",
    },
  })
}

export function applyCorsHeaders(response: Response, origin: string | null): Response {
  if (origin && isOriginAllowed(origin)) {
    response.headers.set("Access-Control-Allow-Origin", origin)
    response.headers.set("Access-Control-Allow-Credentials", "true")
  }
  return response
}

export function applySecurityHeaders(response: Response): Response {
  response.headers.set("X-Content-Type-Options", "nosniff")
  response.headers.set("X-Frame-Options", "DENY")
  response.headers.set("X-XSS-Protection", "1; mode=block")
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin")
  return response
}
