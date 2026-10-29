import "server-only";
import { redirect } from "next/navigation";
import { pode, type Acao } from "@/lib/permissoes";
import type { Usuario } from "@/lib/types";
import { usuarioAtual } from "./auth";

/** Protege uma página: exige login, troca de senha provisória e, opcionalmente, permissão para uma ação. */
export async function exigirPagina(acao?: Acao, opcoes: { permitirSenhaProvisoria?: boolean } = {}): Promise<Usuario> {
  const u = await usuarioAtual();
  if (!u) redirect("/login");
  if (u.trocarSenha && !opcoes.permitirSenhaProvisoria) redirect("/minha-senha?obrigatoria=1");
  if (acao && !pode(u.perfil, acao)) redirect("/?sem-permissao=1");
  return u;
}
