import "server-only";
import { ErroConfiguracao, ehProducao } from "./config";
import type { Repositorio } from "./repositorio";
import { RepositorioArquivo } from "./repositorio-arquivo";
import { RepositorioPostgres } from "./repositorio-postgres";

const g = globalThis as unknown as { __repositorio?: Repositorio };

/**
 * Seleciona o armazenamento:
 *  - DATABASE_URL definida → PostgreSQL (Render, Neon, Supabase, etc.)
 *  - caso contrário        → arquivo JSON local em ./dados/banco.json (somente fora de produção,
 *    ou com PERMITIR_ARMAZENAMENTO_ARQUIVO=true)
 */
export function repositorio(): Repositorio {
  if (!g.__repositorio) {
    const url = process.env.DATABASE_URL?.trim();
    if (!url && ehProducao() && process.env.PERMITIR_ARMAZENAMENTO_ARQUIVO !== "true") {
      throw new ErroConfiguracao("DATABASE_URL não configurada: em produção os dados não podem ficar em arquivo temporário.");
    }
    g.__repositorio = url ? new RepositorioPostgres(url) : new RepositorioArquivo();
  }
  return g.__repositorio;
}
