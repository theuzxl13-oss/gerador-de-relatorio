"use client";

import { createContext, useContext } from "react";
import type { Usuario } from "@/lib/types";

const Contexto = createContext<Usuario | null>(null);

export function ProvedorUsuario({ usuario, children }: { usuario: Usuario | null; children: React.ReactNode }) {
  return <Contexto.Provider value={usuario}>{children}</Contexto.Provider>;
}

/** Usuário logado (null na tela de login). */
export function useUsuario() {
  return useContext(Contexto);
}

/** Verdadeiro para o perfil Administrador. */
export function useEhAdmin() {
  return useContext(Contexto)?.perfil === "ADMIN";
}
