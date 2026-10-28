"use client";

import { createContext, useContext } from "react";
import { pode, type Acao } from "@/lib/permissoes";
import type { Usuario } from "@/lib/types";

const Contexto = createContext<Usuario | null>(null);

export function ProvedorUsuario({ usuario, children }: { usuario: Usuario | null; children: React.ReactNode }) {
  return <Contexto.Provider value={usuario}>{children}</Contexto.Provider>;
}

/** Usuário logado (null na tela de login). */
export function useUsuario() {
  return useContext(Contexto);
}

/** Se o usuário logado pode realizar a ação (só para exibir botões; o servidor confere). */
export function usePode(acao: Acao) {
  return pode(useContext(Contexto)?.perfil, acao);
}
