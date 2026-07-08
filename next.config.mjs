/** @type {import('next').NextConfig} */

// Content Security Policy para una aplicación pública.
// Debe permitir el iframe de Google Maps y Vercel Analytics/Speed Insights.
const ContentSecurityPolicy = [
  "default-src 'self'",
  // Next.js inyecta scripts en línea (hidratación), Vercel Analytics se sirve desde
  // va.vercel-scripts.com y la Google Maps JavaScript API desde maps.googleapis.com / maps.gstatic.com
  "script-src 'self' 'unsafe-inline' https://va.vercel-scripts.com https://maps.googleapis.com https://maps.gstatic.com",
  // Tailwind / estilos en línea de Next y de Google Maps requieren 'unsafe-inline'
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data: https://fonts.gstatic.com",
  // Vercel Analytics/Speed Insights y las peticiones de datos de Google Maps
  "connect-src 'self' https://va.vercel-scripts.com https://vitals.vercel-insights.com https://maps.googleapis.com https://maps.gstatic.com",
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
