"use client";

import Link from "next/link";
import { useEffect, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { CONFIANCA_LABEL, STATUS_LABEL, type Confianca, type StatusOcorrencia } from "@/lib/types";

type Variante = "primario" | "secundario" | "perigo" | "fantasma" | "sucesso";

const VARIANTES: Record<Variante, string> = {
  primario: "bg-marca-700 text-white hover:bg-marca-800 focus-visible:ring-marca-500",
  sucesso: "bg-emerald-600 text-white hover:bg-emerald-700 focus-visible:ring-emerald-500",
  secundario: "border border-gray-300 bg-white text-gray-800 hover:bg-gray-50 focus-visible:ring-marca-500",
  perigo: "bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-500",
  fantasma: "text-marca-700 hover:bg-marca-50 focus-visible:ring-marca-500",
};

const BASE_BOTAO =
  "inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50";

export function Botao({ variante = "primario", className = "", ...p }: ButtonHTMLAttributes<HTMLButtonElement> & { variante?: Variante }) {
  return <button type="button" className={`${BASE_BOTAO} ${VARIANTES[variante]} ${className}`} {...p} />;
}

export function BotaoLink({ href, variante = "primario", className = "", children }: { href: string; variante?: Variante; className?: string; children: ReactNode }) {
  return (
    <Link href={href} className={`${BASE_BOTAO} ${VARIANTES[variante]} ${className}`}>
      {children}
    </Link>
  );
}

export function Cartao({ titulo, acoes, children, className = "" }: { titulo?: ReactNode; acoes?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-xl border border-gray-200 bg-white shadow-sm ${className}`}>
      {(titulo || acoes) && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 px-4 py-3 sm:px-5">
          {titulo && <h2 className="text-base font-semibold text-gray-900">{titulo}</h2>}
          {acoes}
        </div>
      )}
      <div className="p-4 sm:p-5">{children}</div>
    </section>
  );
}

export function Campo({ rotulo, obrigatorio, ajuda, erro, children, className = "" }: { rotulo: string; obrigatorio?: boolean; ajuda?: ReactNode; erro?: string; children: ReactNode; className?: string }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1 block text-sm font-medium text-gray-700">
        {rotulo} {obrigatorio && <span className="text-red-600">*</span>}
      </span>
      {children}
      {ajuda && !erro && <span className="mt-1 block text-xs text-gray-500">{ajuda}</span>}
      {erro && <span className="mt-1 block text-xs font-medium text-red-600">{erro}</span>}
    </label>
  );
}

const BASE_INPUT =
  "block w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-base text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-marca-500 focus:outline-none focus:ring-2 focus:ring-marca-200 sm:text-sm";

export function Entrada({ className = "", ...p }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={`${BASE_INPUT} ${className}`} {...p} />;
}

export function Selecao({ className = "", ...p }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={`${BASE_INPUT} ${className}`} {...p} />;
}

export function AreaTexto({ className = "", ...p }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={`${BASE_INPUT} ${className}`} {...p} />;
}

const COR_CONFIANCA: Record<Confianca, string> = {
  ALTA: "bg-emerald-100 text-emerald-800 ring-emerald-200",
  MEDIA: "bg-amber-100 text-amber-800 ring-amber-200",
  BAIXA: "bg-red-100 text-red-800 ring-red-200",
};

export function SeloConfianca({ confianca }: { confianca?: Confianca }) {
  if (!confianca) return <span className="inline-flex rounded-full bg-sky-100 px-2.5 py-0.5 text-xs font-semibold text-sky-800 ring-1 ring-sky-200">Seleção manual</span>;
  return <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ${COR_CONFIANCA[confianca]}`}>Confiança: {CONFIANCA_LABEL[confianca]}</span>;
}

const COR_STATUS: Record<StatusOcorrencia, string> = {
  REGISTRADA: "bg-blue-50 text-blue-800 ring-blue-200",
  AGUARDANDO_ANALISE: "bg-amber-50 text-amber-800 ring-amber-200",
  NOTIFICADA: "bg-violet-50 text-violet-800 ring-violet-200",
  CONCLUIDA: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  CANCELADA: "bg-gray-100 text-gray-600 ring-gray-200",
};

export function SeloStatus({ status }: { status: StatusOcorrencia }) {
  return <span className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ${COR_STATUS[status]}`}>{STATUS_LABEL[status]}</span>;
}

export function Carregando({ texto = "Carregando..." }: { texto?: string }) {
  return (
    <div className="flex items-center justify-center gap-3 py-16 text-gray-500">
      <span className="h-5 w-5 animate-spin rounded-full border-2 border-marca-200 border-t-marca-700" />
      {texto}
    </div>
  );
}

export function Aviso({ tipo = "info", titulo, children }: { tipo?: "info" | "alerta" | "erro" | "sucesso"; titulo?: string; children?: ReactNode }) {
  const cores = {
    info: "border-sky-200 bg-sky-50 text-sky-900",
    alerta: "border-amber-300 bg-amber-50 text-amber-900",
    erro: "border-red-200 bg-red-50 text-red-900",
    sucesso: "border-emerald-200 bg-emerald-50 text-emerald-900",
  }[tipo];
  return (
    <div className={`rounded-lg border px-4 py-3 text-sm ${cores}`} role={tipo === "erro" ? "alert" : undefined}>
      {titulo && <p className="font-semibold">{titulo}</p>}
      {children && <div className={titulo ? "mt-1" : ""}>{children}</div>}
    </div>
  );
}

export function Modal({ aberto, aoFechar, titulo, children, largura = "max-w-3xl" }: { aberto: boolean; aoFechar: () => void; titulo: string; children: ReactNode; largura?: string }) {
  useEffect(() => {
    if (!aberto) return;
    const esc = (e: KeyboardEvent) => e.key === "Escape" && aoFechar();
    document.addEventListener("keydown", esc);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", esc);
      document.body.style.overflow = "";
    };
  }, [aberto, aoFechar]);
  if (!aberto) return null;
  return (
    <div className="nao-imprimir fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center sm:p-4" onMouseDown={aoFechar}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={titulo}
        className={`flex max-h-[92vh] w-full ${largura} flex-col rounded-t-2xl bg-white shadow-xl sm:rounded-2xl`}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <h2 className="text-lg font-semibold">{titulo}</h2>
          <button type="button" onClick={aoFechar} className="rounded-md p-1.5 text-gray-500 hover:bg-gray-100" aria-label="Fechar">
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>
        <div className="overflow-y-auto p-5">{children}</div>
      </div>
    </div>
  );
}
