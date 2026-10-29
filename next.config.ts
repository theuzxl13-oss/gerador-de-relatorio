import type { NextConfig } from "next";

const producao = process.env.NODE_ENV === "production";

/**
 * Política de conteúdo: só carrega scripts, estilos, imagens e conexões do próprio site.
 * ('unsafe-inline' é exigido pelos scripts de hidratação do Next sem nonce;
 * 'unsafe-eval' apenas em desenvolvimento.)
 */
const CSP = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${producao ? "" : " 'unsafe-eval'"}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  ...(producao ? ["upgrade-insecure-requests"] : []),
].join("; ");

const CABECALHOS = [
  { key: "Content-Security-Policy", value: CSP },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=(), payment=(), usb=()" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  ...(producao ? [{ key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" }] : []),
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  devIndicators: false,
  agentRules: false,
  poweredByHeader: false,
  async headers() {
    return [
      { source: "/:path*", headers: CABECALHOS },
      // Dados pessoais: nunca guardar em cache (nem na Cloudflare).
      { source: "/api/:path*", headers: [{ key: "Cache-Control", value: "private, no-store" }] },
      // O navegador confere sempre se há versão nova do service worker.
      { source: "/sw.js", headers: [{ key: "Cache-Control", value: "no-cache" }, { key: "Service-Worker-Allowed", value: "/" }] },
    ];
  },
};

export default nextConfig;
