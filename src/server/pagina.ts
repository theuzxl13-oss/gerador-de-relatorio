import "server-only";
import { redirect } from "next/navigation";
import { pode, type Acao } from "@/lib/permissoes";
import type { Usuario } from "@/lib/types";
import { usuarioAtual } from "./auth";

/** Protege uma página: exige login e, opcionalmente, permissão para uma ação. */
export async function exigirPagina(acao?: Acao): Promise<Usuario> {
  const u = await usuarioAtual();
  if (!u) redirect("/login");
  if (acao && !pode(u.perfil, acao)) redirect("/?sem-permissao=1");
  return u;
}
