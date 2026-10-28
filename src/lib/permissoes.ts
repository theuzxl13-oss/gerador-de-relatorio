/**
 * Matriz de permissões por perfil. Usada no servidor (que é quem garante as regras)
 * e nas telas (apenas para esconder botões que o perfil não pode usar).
 */
import type { Ocorrencia, Perfil, Usuario } from "./types";

export type Acao =
  /** Gerar (registrar) um novo relatório. */
  | "registrar"
  /** Ver os relatórios de todos (os perfis operacionais veem só os próprios). */
  | "verTodas"
  /** Registrar/alterar a providência (arquivado, notificado, multado). */
  | "decidir"
  /** Editar o conteúdo de um relatório já gerado. */
  | "editarOcorrencia"
  /** Excluir relatórios e restaurar dados. */
  | "excluir"
  /** Painel de acompanhamento e exportação. */
  | "painel"
  /** Criar e gerenciar logins (limitado aos perfis de `perfisGerenciaveis`). */
  | "usuarios"
  /** Editar a Base Normativa. */
  | "baseNormativa"
  /** Alterar as configurações do relatório. */
  | "configuracoes";

const MATRIZ: Record<Perfil, Acao[]> = {
  ADMIN_GERAL: ["registrar", "verTodas", "decidir", "editarOcorrencia", "excluir", "painel", "usuarios", "baseNormativa", "configuracoes"],
  GERENTE: ["verTodas", "painel"],
  ADMINISTRACAO: ["registrar", "verTodas", "decidir", "editarOcorrencia", "painel", "usuarios"],
  LIDER: ["registrar"],
  PORTEIRO: ["registrar"],
  RONDA: ["registrar"],
};

export function pode(perfil: Perfil | undefined | null, acao: Acao): boolean {
  return !!perfil && (MATRIZ[perfil]?.includes(acao) ?? false);
}

/** Perfis que cada perfil pode criar/editar na tela de usuários. */
export function perfisGerenciaveis(perfil: Perfil | undefined | null): Perfil[] {
  if (perfil === "ADMIN_GERAL") return ["ADMIN_GERAL", "GERENTE", "ADMINISTRACAO", "LIDER", "PORTEIRO", "RONDA"];
  if (perfil === "ADMINISTRACAO") return ["LIDER", "PORTEIRO", "RONDA"];
  return [];
}

/** Perfis que apenas geram relatórios. */
export function ehOperacional(perfil: Perfil | undefined | null): boolean {
  return perfil === "LIDER" || perfil === "PORTEIRO" || perfil === "RONDA";
}

/** Se o usuário pode ver esta ocorrência (operacionais: só as que registraram). */
export function podeVerOcorrencia(u: Pick<Usuario, "id" | "perfil">, o: Pick<Ocorrencia, "registradoPor">): boolean {
  return pode(u.perfil, "verTodas") || o.registradoPor?.id === u.id;
}

/** Converte perfis gravados por versões anteriores. */
export function normalizarPerfil(p: unknown): Perfil {
  switch (p) {
    case "ADMIN_GERAL":
    case "GERENTE":
    case "ADMINISTRACAO":
    case "LIDER":
    case "PORTEIRO":
    case "RONDA":
      return p;
    case "ADMIN":
      return "ADMIN_GERAL";
    default:
      return "LIDER";
  }
}
