/** @type {import('next').NextConfig} */

// Content Security Policy para una aplicación pública.
// Debe permitir el iframe de Google Maps y Vercel Analytics/Speed Insights.
const ContentSecurityPolicy = [
  "default-src 'self'",
  // Next.js inyecta scripts en línea (hidratación) y Vercel Analytics se sirve desde va.vercel-scripts.com
  "script-src 'self' 'unsafe-inline' https://va.vercel-scripts.com",
  // Tailwind / estilos en línea de Next requieren 'unsafe-inline'
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  // Vercel Analytics y Speed Insights
  "connect-src 'self' https://va.vercel-scripts.com https://vitals.vercel-insights.com",
  // iframe incrustado de Google Maps
  "frame-src https://www.google.com",
  // La app incrusta a Google, pero no debe poder ser incrustada por terceros
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
  "upgrade-insecure-requests",
].join("; ")

const securityHeaders = [
  { key: "Content-Security-Policy", value: ContentSecurityPolicy },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(self)" },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
]

const nextConfig = {
  images: {
    unoptimized: true,
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ]
  },
}

export default nextConfig
