import "server-only";
import type { Repositorio } from "./repositorio";
import { RepositorioArquivo } from "./repositorio-arquivo";
import { RepositorioPostgres } from "./repositorio-postgres";

const g = globalThis as unknown as { __repositorio?: Repositorio };

/**
 * Seleciona o armazenamento:
 *  - DATABASE_URL definida → PostgreSQL (Render, Neon, Supabase, etc.)
 *  - caso contrário        → arquivo JSON local em ./dados/banco.json
 */
export function repositorio(): Repositorio {
  if (!g.__repositorio) {
    const url = process.env.DATABASE_URL?.trim();
    g.__repositorio = url ? new RepositorioPostgres(url) : new RepositorioArquivo();
  }
  return g.__repositorio;
}
