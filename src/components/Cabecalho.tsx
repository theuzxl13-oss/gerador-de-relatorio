"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Logo } from "./Logo";

const LINKS = [
  { href: "/", rotulo: "Início" },
  { href: "/ocorrencias/nova", rotulo: "Nova ocorrência" },
  { href: "/historico", rotulo: "Histórico" },
  { href: "/base-normativa", rotulo: "Base normativa" },
  { href: "/configuracoes", rotulo: "Configurações" },
];

export function Cabecalho() {
  const caminho = usePathname();
  const [aberto, setAberto] = useState(false);
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
          {LINKS.map((l) => (
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

        <button
          type="button"
          className="ml-auto rounded-md p-2 hover:bg-white/10 lg:hidden"
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
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setAberto(false)}
              className={`block rounded-md px-3 py-2.5 text-sm font-medium ${ativo(l.href) ? "bg-white/15" : "hover:bg-white/10"}`}
            >
              {l.rotulo}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}
