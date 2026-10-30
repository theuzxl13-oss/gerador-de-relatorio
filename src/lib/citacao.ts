import type { FundamentacaoSnapshot, Norma, TermoSecao } from "./types";
import { DOCUMENTO_NOME } from "./types";

type Referencia = Pick<
  Norma,
  "documento" | "secaoNumero" | "secaoTitulo" | "artigo" | "alinea" | "paragrafo" | "item" | "itemTitulo" | "subitem"
>;

/**
 * Citação completa, usada no corpo do relatório.
 *
 * Estatuto:    Artigo 11, alínea "a", do Estatuto Social
 *              Artigo 58, Parágrafo Segundo, do Estatuto Social
 * Regulamento: Item 8 do tópico II – DOS DEVERES DOS ASSOCIADOS do Regulamento Interno
 *              Subitem 1.2.7 do tópico VII – DAS ÁREAS DE LAZER do Regulamento Interno
 *              tópico V – DA COLETA DO LIXO do Regulamento Interno (tópico sem itens)
 *
 * Ata:        deliberação do item 1 da Ordem do Dia (Permissão ou Proibição da Locação
 *              não residencial Tipo “Airbnb”) da Assembleia Geral Extraordinária de 26/06/2022
 *
 * A numeração do Estatuto e a do Regulamento nunca são misturadas.
 */
export function citacaoCompleta(n: Referencia, termoSecao: TermoSecao = "tópico"): string {
  if (n.documento === "ATA") {
    const assembleia = `${tituloAssembleia(n.secaoTitulo)} de ${n.secaoNumero}`;
    if (!n.item) return `deliberação da ${assembleia}`;
    return `deliberação do item ${n.item} da Ordem do Dia${n.itemTitulo ? ` (${n.itemTitulo})` : ""} da ${assembleia}`;
  }
  if (n.documento === "ESTATUTO") {
    const partes = [`Artigo ${n.artigo}`];
    if (n.alinea) partes.push(`alínea "${n.alinea}"`);
    if (n.paragrafo) partes.push(n.paragrafo);
    return `${partes.join(", ")}, do ${DOCUMENTO_NOME.ESTATUTO}`;
  }
  const topico = `${termoSecao} ${n.secaoNumero} – ${n.secaoTitulo}`;
  if (n.subitem && /^\d/.test(n.subitem)) return `Subitem ${n.subitem} do ${topico} do ${DOCUMENTO_NOME.REGULAMENTO}`;
  if (n.item) return `Item ${n.item} do ${topico} do ${DOCUMENTO_NOME.REGULAMENTO}`;
  return `${topico} do ${DOCUMENTO_NOME.REGULAMENTO}`;
}

/** Forma curta para tabelas e filtros. Ex.: "RI II, item 8" / "ES art. 11, al. a". */
export function citacaoCurta(n: Referencia): string {
  if (n.documento === "ATA") return `${siglaAssembleia(n.secaoTitulo)} ${n.secaoNumero}${n.item ? `, item ${n.item}` : ""}`;
  if (n.documento === "ESTATUTO") {
    let s = `ES art. ${n.artigo}`;
    if (n.alinea) s += `, al. ${n.alinea}`;
    if (n.paragrafo) s += `, ${n.paragrafo.replace("Parágrafo", "§")}`;
    return s;
  }
  if (n.subitem && /^\d/.test(n.subitem)) return `RI ${n.secaoNumero}, subitem ${n.subitem}`;
  if (n.item) return `RI ${n.secaoNumero}, item ${n.item}`;
  return `RI ${n.secaoNumero}`;
}

/** Rótulo do dispositivo isolado (sem documento). Ex.: "Item 8", "Subitem 1.2.7", "Artigo 11, alínea a". */
export function rotuloDispositivo(n: Referencia): string {
  if (n.documento === "ATA") return n.item ? `Item ${n.item} da Ordem do Dia` : "Deliberação";
  if (n.documento === "ESTATUTO") {
    let s = `Artigo ${n.artigo}`;
    if (n.alinea) s += `, alínea "${n.alinea}"`;
    if (n.paragrafo) s += `, ${n.paragrafo}`;
    return s;
  }
  if (n.subitem && /^\d/.test(n.subitem)) return `Subitem ${n.subitem}`;
  if (n.subitem) return `Item ${n.item} – ${n.subitem}`;
  if (n.item) return `Item ${n.item}`;
  return "Texto do tópico";
}

export function rotuloSecao(n: Pick<Norma, "documento" | "secaoNumero" | "secaoTitulo">): string {
  if (n.documento === "ATA") return `Ata da ${tituloAssembleia(n.secaoTitulo)} de ${n.secaoNumero}`;
  return n.documento === "ESTATUTO"
    ? `Capítulo ${n.secaoNumero} – ${n.secaoTitulo}`
    : `${n.secaoNumero} – ${n.secaoTitulo}`;
}

/** "ASSEMBLEIA GERAL EXTRAORDINÁRIA" → "Assembleia Geral Extraordinária" */
function tituloAssembleia(t: string): string {
  return t
    .toLowerCase()
    .split(/\s+/)
    .map((p) => (["de", "da", "do"].includes(p) ? p : p.charAt(0).toUpperCase() + p.slice(1)))
    .join(" ");
}

/** "ASSEMBLEIA GERAL EXTRAORDINÁRIA" → "AGE"; "ASSEMBLEIA GERAL ORDINÁRIA" → "AGO". */
function siglaAssembleia(t: string): string {
  const s = t.toUpperCase();
  if (s.includes("EXTRAORDIN")) return "AGE";
  if (s.includes("ORDIN")) return "AGO";
  return "Ata";
}

/**
 * Citação precedida do artigo ou da preposição corretos para o tipo de dispositivo:
 * "o Item 8 …" / "a deliberação …"; "no Item 8 …" / "na deliberação …".
 */
export function citacaoComArtigo(n: Referencia, forma: "o" | "no", termoSecao: TermoSecao = "tópico"): string {
  const feminino = n.documento === "ATA";
  const artigo = forma === "o" ? (feminino ? "a" : "o") : feminino ? "na" : "no";
  return `${artigo} ${citacaoCompleta(n, termoSecao)}`;
}

export function criarSnapshot(
  n: Norma,
  origem: FundamentacaoSnapshot["origem"],
  confianca?: FundamentacaoSnapshot["confianca"],
): FundamentacaoSnapshot {
  return {
    normaId: n.id,
    documento: n.documento,
    secaoNumero: n.secaoNumero,
    secaoTitulo: n.secaoTitulo,
    artigo: n.artigo,
    alinea: n.alinea,
    paragrafo: n.paragrafo,
    item: n.item,
    itemTitulo: n.itemTitulo,
    subitem: n.subitem,
    texto: n.texto,
    citacao: citacaoCompleta(n),
    citacaoCurta: citacaoCurta(n),
    origem,
    confianca,
    confirmadoEm: new Date().toISOString(),
    normaVersao: n.atualizadoEm ?? "original",
    ...(n.revisaoManual ? { revisaoPendente: true } : {}),
  };
}
