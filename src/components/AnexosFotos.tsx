"use client";

/* eslint-disable @next/next/no-img-element */
import { useRef, useState } from "react";
import { api } from "@/lib/api-cliente";
import type { AnexoInfo } from "@/lib/types";
import { Botao } from "./ui";

export const MAX_FOTOS = 6;
const LADO_MAXIMO = 1600; // px – reduz o tamanho para economizar o banco gratuito
const QUALIDADE = 0.8;

/** Reduz a foto no próprio navegador (celular) antes de enviar. */
async function reduzir(arquivo: File): Promise<{ dados: string; largura: number; altura: number }> {
  const url = URL.createObjectURL(arquivo);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    const k = Math.min(1, LADO_MAXIMO / Math.max(img.naturalWidth, img.naturalHeight));
    const largura = Math.round(img.naturalWidth * k);
    const altura = Math.round(img.naturalHeight * k);
    const canvas = document.createElement("canvas");
    canvas.width = largura;
    canvas.height = altura;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, largura, altura);
    ctx.drawImage(img, 0, 0, largura, altura);
    return { dados: canvas.toDataURL("image/jpeg", QUALIDADE), largura, altura };
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function AnexosFotos({ anexos, aoAlterar }: { anexos: AnexoInfo[]; aoAlterar: (a: AnexoInfo[]) => void }) {
  const entrada = useRef<HTMLInputElement>(null);
  const [enviando, setEnviando] = useState(0);
  const [erro, setErro] = useState("");

  async function adicionar(lista: FileList | null) {
    if (!lista?.length) return;
    setErro("");
    const arquivos = Array.from(lista).slice(0, MAX_FOTOS - anexos.length);
    if (lista.length > arquivos.length) setErro(`Máximo de ${MAX_FOTOS} imagens por relatório.`);
    setEnviando(arquivos.length);
    const novos: AnexoInfo[] = [];
    for (const arquivo of arquivos) {
      try {
        if (!arquivo.type.startsWith("image/")) throw new Error(`"${arquivo.name}" não é uma imagem.`);
        const { dados, largura, altura } = await reduzir(arquivo);
        novos.push(await api.enviarAnexo({ nome: arquivo.name, tipo: "image/jpeg", largura, altura, dados }));
      } catch (e) {
        setErro((e as Error).message || `Não foi possível enviar "${arquivo.name}".`);
      }
      setEnviando((n) => n - 1);
    }
    aoAlterar([...anexos, ...novos]);
    if (entrada.current) entrada.current.value = "";
  }

  const mover = (i: number, d: -1 | 1) => {
    const l = [...anexos];
    [l[i], l[i + d]] = [l[i + d], l[i]];
    aoAlterar(l);
  };

  return (
    <div>
      <div className="mb-1 text-sm font-medium text-gray-700">Fotos / imagens (opcional)</div>
      <p className="mb-3 text-xs text-gray-500">
        A primeira foto aparece reduzida abaixo do texto do relatório; cada foto também é impressa ampliada em uma página própria. Até {MAX_FOTOS} imagens.
      </p>

      {anexos.length > 0 && (
        <ul className="mb-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {anexos.map((a, i) => (
            <li key={a.id} className="overflow-hidden rounded-lg border border-gray-200 bg-gray-50">
              <img src={`/api/anexos/${a.id}`} alt={a.nome} className="h-32 w-full object-cover" />
              <div className="flex items-center justify-between gap-1 px-2 py-1.5 text-xs">
                <span className="truncate text-gray-600" title={a.nome}>
                  {i === 0 ? "1ª (no texto)" : `${i + 1}ª`}
                </span>
                <span className="flex shrink-0 gap-0.5">
                  <button type="button" className="rounded px-1.5 py-0.5 hover:bg-gray-200 disabled:opacity-30" disabled={i === 0} onClick={() => mover(i, -1)} aria-label="Mover para antes">←</button>
                  <button type="button" className="rounded px-1.5 py-0.5 hover:bg-gray-200 disabled:opacity-30" disabled={i === anexos.length - 1} onClick={() => mover(i, 1)} aria-label="Mover para depois">→</button>
                  <button type="button" className="rounded px-1.5 py-0.5 text-red-700 hover:bg-red-50" onClick={() => aoAlterar(anexos.filter((x) => x.id !== a.id))}>Remover</button>
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}

      <input ref={entrada} type="file" accept="image/*" multiple className="hidden" onChange={(e) => adicionar(e.target.files)} />
      <Botao variante="secundario" onClick={() => entrada.current?.click()} disabled={enviando > 0 || anexos.length >= MAX_FOTOS}>
        {enviando > 0 ? `Enviando ${enviando} imagem(ns)...` : "📷 Anexar foto / imagem"}
      </Botao>
      {erro && <p className="mt-2 text-xs font-medium text-red-600">{erro}</p>}
    </div>
  );
}
