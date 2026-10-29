import type { ResultadoAnalise } from "./analysis/engine";
import type { Pagina } from "./consulta";
import type { ConteudoCarta } from "./carta";
import type { AnexoInfo, Configuracoes, Norma, Ocorrencia, Perfil, Usuario } from "./types";

/** O registro mudou desde que foi carregado (HTTP 409): recarregar antes de salvar de novo. */
export class ErroConflito extends Error {}

async function req<T>(url: string, init?: RequestInit): Promise<T> {
  const r = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    cache: "no-store",
  });
  const dados = await r.json().catch(() => ({}));
  // Sessão expirada ou usuário desativado: volta para a tela de login.
  if (r.status === 401 && typeof window !== "undefined") {
    window.location.href = `/login?voltar=${encodeURIComponent(window.location.pathname)}`;
  }
  // Senha provisória: a troca é obrigatória antes de qualquer outra ação.
  if (r.status === 403 && (dados as { codigo?: string }).codigo === "TROCAR_SENHA" && typeof window !== "undefined") {
    window.location.href = "/minha-senha?obrigatoria=1";
  }
  // Registro alterado por outra pessoa desde que foi aberto.
  if (r.status === 409) throw new ErroConflito((dados as { erro?: string }).erro ?? "Registro alterado por outra pessoa.");
  if (!r.ok) throw new Error((dados as { erro?: string }).erro ?? `Erro ${r.status}`);
  return dados as T;
}

const json = (body: unknown) => JSON.stringify(body);

export const api = {
  normas: () => req<Norma[]>("/api/normas"),
  salvarNorma: (n: Norma) => req<Norma>("/api/normas", { method: "POST", body: json(n) }),
  excluirNorma: (id: string) => req(`/api/normas/${encodeURIComponent(id)}`, { method: "DELETE" }),
  restaurarNormas: () => req("/api/normas/restaurar", { method: "POST" }),

  ocorrencias: (consulta: Record<string, string | number | boolean | undefined> = {}) => {
    const q = new URLSearchParams(Object.entries(consulta).filter(([, v]) => v !== undefined && v !== "" && v !== false).map(([k, v]) => [k, v === true ? "1" : String(v)]));
    return req<Pagina<Ocorrencia>>(`/api/ocorrencias${q.size ? `?${q}` : ""}`);
  },
  ocorrencia: (id: string) => req<Ocorrencia>(`/api/ocorrencias/${id}`),
  criarOcorrencia: (o: Partial<Ocorrencia>) => req<Ocorrencia>("/api/ocorrencias", { method: "POST", body: json(o) }),
  atualizarOcorrencia: (id: string, o: Partial<Ocorrencia>) => req<Ocorrencia>(`/api/ocorrencias/${id}`, { method: "PUT", body: json(o) }),
  excluirOcorrencia: (id: string) => req(`/api/ocorrencias/${id}`, { method: "DELETE" }),
  registrarProvidencia: (id: string, p: Record<string, unknown>) =>
    req<Ocorrencia>(`/api/ocorrencias/${id}/providencia`, { method: "PUT", body: json(p) }),
  carta: (id: string) => req<ConteudoCarta>(`/api/ocorrencias/${id}/carta`, { method: "POST" }),
  removerProvidencia: (id: string, versao: number) =>
    req<Ocorrencia>(`/api/ocorrencias/${id}/providencia`, { method: "DELETE", body: json({ versao }) }),

  analisar: (dados: { ocorrencia: string; descricao?: string; horario?: string; data?: string; tratamento?: string }) =>
    req<ResultadoAnalise>("/api/analisar", { method: "POST", body: json(dados) }),

  enviarAnexo: (a: { nome: string; tipo: string; largura: number; altura: number; dados: string }) =>
    req<AnexoInfo>("/api/anexos", { method: "POST", body: json(a) }),

  configuracoes: () => req<Configuracoes>("/api/configuracoes"),
  salvarConfiguracoes: (c: Configuracoes) => req<Configuracoes>("/api/configuracoes", { method: "PUT", body: json(c) }),

  usuarios: () => req<Usuario[]>("/api/usuarios"),
  criarUsuario: (u: { nome: string; login: string; perfil: Perfil; senha: string }) =>
    req<Usuario>("/api/usuarios", { method: "POST", body: json(u) }),
  atualizarUsuario: (id: string, u: { nome: string; login: string; perfil: Perfil; ativo: boolean; senha?: string }) =>
    req<Usuario>(`/api/usuarios/${id}`, { method: "PUT", body: json(u) }),
  trocarMinhaSenha: (senhaAtual: string, novaSenha: string) =>
    req("/api/auth/senha", { method: "POST", body: json({ senhaAtual, novaSenha }) }),

  infoDemonstracao: () => req<{ armazenamento: string; permiteRestaurar: boolean; fraseConfirmacao: string }>("/api/demonstracao"),
  restaurarDemonstracao: (confirmacao: string) => req("/api/demonstracao", { method: "POST", body: json({ confirmacao }) }),
};
