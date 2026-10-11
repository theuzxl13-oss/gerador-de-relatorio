import "server-only";
import { redirect } from "next/navigation";
import type { Perfil, Usuario } from "@/lib/types";
import { usuarioAtual } from "./auth";

/** Protege uma página: exige login e, opcionalmente, o perfil Administrador. */
export async function exigirPagina(perfil?: Perfil): Promise<Usuario> {
  const u = await usuarioAtual();
  if (!u) redirect("/login");
  if (perfil === "ADMIN" && u.perfil !== "ADMIN") redirect("/?sem-permissao=1");
  return u;
}
