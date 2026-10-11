/**
 * Traduz erros de conexão com o PostgreSQL (Neon, Supabase, Render...) em
 * mensagens claras, sem expor a senha da DATABASE_URL.
 */
export function diagnosticarErroBanco(e: unknown): string {
  const err = e as { code?: string; message?: string; hostname?: string };
  const msg = String(err?.message ?? e ?? "").replace(/postgres(ql)?:\/\/[^\s"']+/gi, "postgresql://***");
  const code = err?.code ?? "";
  const supabase = /supabase\.(co|com)/i.test(msg) || /supabase/i.test(process.env.DATABASE_URL ?? "");

  if (!process.env.DATABASE_URL) return "DATABASE_URL não configurada: os dados estão em arquivo local e serão perdidos quando o servidor reiniciar.";
  if (code === "ENOTFOUND" || code === "EAI_AGAIN") return "Endereço do banco não encontrado. Confira se a DATABASE_URL foi colada completa e sem espaços.";
  if (code === "ENETUNREACH" || code === "EHOSTUNREACH" || (supabase && /ENETUNREACH|IPv6/i.test(msg))) {
    return "Sem rota até o banco. No Supabase, a conexão direta (db.xxxx.supabase.co) usa IPv6, que o Render não suporta: use a string do “Session pooler” (aws-0-...pooler.supabase.com).";
  }
  if (code === "28P01" || /password authentication failed/i.test(msg)) return "Usuário ou senha do banco incorretos na DATABASE_URL (a senha aparece como **** no painel: clique em mostrar antes de copiar).";
  if (/tenant or user not found/i.test(msg)) return "Usuário não reconhecido pelo pooler do Supabase: no pooler o usuário deve ser postgres.<id-do-projeto> (copie a string do painel do Supabase).";
  if (code === "3D000") return "O banco de dados indicado na DATABASE_URL não existe.";
  if (code === "ECONNREFUSED" || code === "ETIMEDOUT" || /timeout|terminated unexpectedly|Connection terminated/i.test(msg)) {
    return supabase
      ? "O banco não respondeu. O Supabase gratuito pausa o projeto após 7 dias sem uso: reative-o no painel do Supabase (Restore project)."
      : "O banco não respondeu (tempo esgotado). Tente novamente em alguns segundos.";
  }
  if (/certificate|SSL|TLS/i.test(msg)) return `Falha na conexão segura (SSL) com o banco: ${msg}`;
  return msg ? `Erro do banco: ${msg}${code ? ` [${code}]` : ""}` : "Erro desconhecido no banco de dados.";
}
