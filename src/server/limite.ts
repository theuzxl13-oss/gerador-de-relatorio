import "server-only";

/**
 * Limite de tentativas de login (proteção contra adivinhação de senha).
 * Conta falhas por IP e por login; após 5 falhas em 15 minutos bloqueia por 15 minutos.
 * Fica em memória: vale para uma instância (caso do Render gratuito) e zera ao reiniciar.
 * Na Cloudflare, complemente com uma regra de Rate Limiting em /api/auth/login.
 */
const JANELA_MS = 15 * 60 * 1000;
const MAX_FALHAS = 5;
const falhas = new Map<string, { n: number; desde: number }>();

/** IP real do visitante (Cloudflare → CF-Connecting-IP; Render → X-Forwarded-For). */
export function ipDoCliente(req: Request): string {
  const h = req.headers;
  return (h.get("cf-connecting-ip") || h.get("x-forwarded-for")?.split(",")[0] || h.get("x-real-ip") || "local").trim();
}

function chaves(ip: string, login: string) {
  return [`ip:${ip}`, `login:${login.toLowerCase()}`];
}

function limpar(agora: number) {
  if (falhas.size < 5000) return;
  for (const [k, v] of falhas) if (agora - v.desde > JANELA_MS) falhas.delete(k);
}

/** Minutos restantes de bloqueio, ou 0 se pode tentar. */
export function bloqueio(ip: string, login: string): number {
  const agora = Date.now();
  let resto = 0;
  for (const k of chaves(ip, login)) {
    const f = falhas.get(k);
    if (!f) continue;
    if (agora - f.desde > JANELA_MS) falhas.delete(k);
    else if (f.n >= MAX_FALHAS) resto = Math.max(resto, JANELA_MS - (agora - f.desde));
  }
  return Math.ceil(resto / 60000);
}

export function registrarFalha(ip: string, login: string) {
  const agora = Date.now();
  limpar(agora);
  for (const k of chaves(ip, login)) {
    const f = falhas.get(k);
    if (!f || agora - f.desde > JANELA_MS) falhas.set(k, { n: 1, desde: agora });
    else f.n++;
  }
}

export function limparFalhas(ip: string, login: string) {
  for (const k of chaves(ip, login)) falhas.delete(k);
}
