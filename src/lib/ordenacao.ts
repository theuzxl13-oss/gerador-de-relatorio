import type { Norma } from "./types";

const ROMANOS: Record<string, number> = { I: 1, V: 5, X: 10, L: 50, C: 100 };

export function romanoParaNumero(r: string): number {
  let total = 0;
  const s = r.toUpperCase();
  for (let i = 0; i < s.length; i++) {
    const v = ROMANOS[s[i]] ?? 0;
    const prox = ROMANOS[s[i + 1]] ?? 0;
    total += v < prox ? -v : v;
  }
  return total;
}

const PARAGRAFOS = ["", "Parágrafo único", "Parágrafo Primeiro", "Parágrafo Segundo", "Parágrafo Terceiro", "Parágrafo Quarto", "Parágrafo Quinto"];

function compararNumeros(a = "", b = ""): number {
  const pa = a.split(".").map((x) => (/^\d+$/.test(x) ? Number(x) : Number.MAX_SAFE_INTEGER));
  const pb = b.split(".").map((x) => (/^\d+$/.test(x) ? Number(x) : Number.MAX_SAFE_INTEGER));
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pa[i] ?? -1) - (pb[i] ?? -1);
    if (d) return d;
  }
  return 0;
}

/** Ordena as normas na ordem em que aparecem no documento. */
export function compararNormas(a: Norma, b: Norma): number {
  if (a.documento !== b.documento) return a.documento === "REGULAMENTO" ? -1 : 1;
  const s = romanoParaNumero(a.secaoNumero) - romanoParaNumero(b.secaoNumero);
  if (s) return s;
  if (a.documento === "ESTATUTO") {
    return (
      compararNumeros(a.artigo, b.artigo) ||
      PARAGRAFOS.indexOf(a.paragrafo ?? "") - PARAGRAFOS.indexOf(b.paragrafo ?? "") ||
      (a.alinea ?? "").localeCompare(b.alinea ?? "")
    );
  }
  return compararNumeros(a.item, b.item) || compararNumeros(a.subitem, b.subitem);
}
