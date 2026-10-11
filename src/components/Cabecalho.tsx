"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { PERFIL_LABEL, type Usuario } from "@/lib/types";
import { Logo } from "./Logo";

const LINKS = [
  { href: "/", rotulo: "Início" },
  { href: "/ocorrencias/nova", rotulo: "Nova ocorrência" },
  { href: "/historico", rotulo: "Histórico" },
  { href: "/base-normativa", rotulo: "Base normativa" },
  { href: "/usuarios", rotulo: "Usuários", admin: true },
  { href: "/configuracoes", rotulo: "Configurações", admin: true },
];

async function sair() {
  await fetch("/api/auth/logout", { method: "POST" }).catch(() => undefined);
  window.location.href = "/login";
}

export function Cabecalho({ usuario }: { usuario: Usuario | null }) {
  const caminho = usePathname();
  const [aberto, setAberto] = useState(false);
  const links = usuario ? LINKS.filter((l) => !l.admin || usuario.perfil === "ADMIN") : [];
  const ativo = (href: string) => (href === "/" ? caminho === "/" : caminho.startsWith(href));

  return (
    <header className="nao-imprimir sticky top-0 z-30 bg-marca-800 text-white shadow-md">
      <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-2.5">
        <Link href="/" className="flex min-w-0 items-center gap-3" onClick={() => setAberto(false)}>
          <Logo className="h-11 w-auto shrink-0 sm:h-12" />
          <div className="min-w-0 leading-tight">
            <div className="truncate text-base font-semibold sm:text-lg">Fazenda da Ilha</div>
            <div className="truncate text-sm italic text-sol">Onde morar é viver!</div>
          </div>
        </Link>

        <nav className="ml-auto hidden items-center gap-1 lg:flex">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                ativo(l.href) ? "bg-white/15 text-white" : "text-marca-100 hover:bg-white/10 hover:text-white"
              }`}
            >
              {l.rotulo}
            </Link>
          ))}
        </nav>

        {usuario && (
          <div className="hidden items-center gap-2 border-l border-white/15 pl-3 lg:flex">
            <Link href="/minha-senha" className="max-w-[9rem] text-right leading-tight hover:underline" title="Trocar minha senha">
              <span className="block truncate text-sm font-semibold">{usuario.nome}</span>
              <span className="block text-xs text-marca-100">{PERFIL_LABEL[usuario.perfil]}</span>
            </Link>
            <button type="button" onClick={sair} className="rounded-md px-2.5 py-1.5 text-sm text-marca-100 hover:bg-white/10 hover:text-white">
              Sair
            </button>
          </div>
        )}

        <button
          type="button"
          className={`ml-auto rounded-md p-2 hover:bg-white/10 lg:hidden ${usuario ? "" : "hidden"}`}
          aria-label="Abrir menu"
          aria-expanded={aberto}
          onClick={() => setAberto((v) => !v)}
        >
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2}>
            {aberto ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
          </svg>
        </button>
      </div>

      {aberto && (
        <nav className="border-t border-white/10 px-4 pb-3 lg:hidden">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setAberto(false)}
              className={`block rounded-md px-3 py-2.5 text-sm font-medium ${ativo(l.href) ? "bg-white/15" : "hover:bg-white/10"}`}
            >
              {l.rotulo}
            </Link>
          ))}
          {usuario && (
            <div className="mt-2 flex items-center justify-between border-t border-white/10 pt-3">
              <Link href="/minha-senha" onClick={() => setAberto(false)} className="px-3 text-sm">
                <span className="font-semibold">{usuario.nome}</span>{" "}
                <span className="text-marca-100">· {PERFIL_LABEL[usuario.perfil]} · trocar senha</span>
              </Link>
              <button type="button" onClick={sair} className="rounded-md px-3 py-2 text-sm font-medium hover:bg-white/10">
                Sair
              </button>
            </div>
          )}
        </nav>
      )}
    </header>
  );
}
