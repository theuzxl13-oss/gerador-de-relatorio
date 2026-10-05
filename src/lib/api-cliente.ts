import type { ResultadoAnalise } from "./analysis/engine";
import type { AnexoInfo, Configuracoes, Norma, Ocorrencia } from "./types";

async function req<T>(url: string, init?: RequestInit): Promise<T> {
  const r = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    cache: "no-store",
  });
  const dados = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error((dados as { erro?: string }).erro ?? `Erro ${r.status}`);
  return dados as T;
}

const json = (body: unknown) => JSON.stringify(body);

export const api = {
  normas: () => req<Norma[]>("/api/normas"),
  salvarNorma: (n: Norma) => req<Norma>("/api/normas", { method: "POST", body: json(n) }),
  excluirNorma: (id: string) => req(`/api/normas/${encodeURIComponent(id)}`, { method: "DELETE" }),
  restaurarNormas: () => req("/api/normas/restaurar", { method: "POST" }),

  ocorrencias: () => req<Ocorrencia[]>("/api/ocorrencias"),
  ocorrencia: (id: string) => req<Ocorrencia>(`/api/ocorrencias/${id}`),
  criarOcorrencia: (o: Partial<Ocorrencia>) => req<Ocorrencia>("/api/ocorrencias", { method: "POST", body: json(o) }),
  atualizarOcorrencia: (id: string, o: Partial<Ocorrencia>) => req<Ocorrencia>(`/api/ocorrencias/${id}`, { method: "PUT", body: json(o) }),
  excluirOcorrencia: (id: string) => req(`/api/ocorrencias/${id}`, { method: "DELETE" }),

  analisar: (dados: { ocorrencia: string; descricao?: string; horario?: string; data?: string; tratamento?: string }) =>
    req<ResultadoAnalise>("/api/analisar", { method: "POST", body: json(dados) }),

  enviarAnexo: (a: { nome: string; tipo: string; largura: number; altura: number; dados: string }) =>
    req<AnexoInfo>("/api/anexos", { method: "POST", body: json(a) }),

  configuracoes: () => req<Configuracoes>("/api/configuracoes"),
  salvarConfiguracoes: (c: Configuracoes) => req<Configuracoes>("/api/configuracoes", { method: "PUT", body: json(c) }),

  infoDemonstracao: () => req<{ armazenamento: string; permiteRestaurar: boolean }>("/api/demonstracao"),
  restaurarDemonstracao: () => req("/api/demonstracao", { method: "POST" }),
};
