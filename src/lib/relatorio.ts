import type { Configuracoes, FundamentacaoSnapshot, Genero, Ocorrencia, Tratamento } from "./types";

export const MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

/** Data local de hoje em AAAA-MM-DD (do dispositivo/servidor). */
export function hojeISO(agora: Date = new Date()): string {
  const y = agora.getFullYear();
  const m = String(agora.getMonth() + 1).padStart(2, "0");
  const d = String(agora.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** "2026-10-05" → "05 de Outubro de 2026" */
export function dataPorExtenso(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return `${String(d).padStart(2, "0")} de ${MESES[m - 1]} de ${y}`;
}

/** "Embu-Guaçu, 05 de Outubro de 2026." */
export function linhaLocalData(cidade: string, iso: string): string {
  return `${cidade}, ${dataPorExtenso(iso)}.`;
}

/** "2026-10-05" → "05/10/2026" */
export function dataCurta(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

const FEMININOS: Tratamento[] = ["Associada", "Moradora", "Proprietária", "Funcionária"];
const MASCULINOS: Tratamento[] = ["Associado", "Morador", "Proprietário", "Funcionário"];

export function generoDoTratamento(tratamento: Tratamento, genero?: Genero): Genero {
  if (FEMININOS.includes(tratamento)) return "F";
  if (MASCULINOS.includes(tratamento)) return "M";
  return genero ?? "N";
}

/**
 * Sujeito da frase do relatório, adaptado ao tratamento e gênero.
 *   Associado → "o associado citado acima"
 *   Associada → "a associada citada acima"
 *   Visitante (F) → "a visitante citada acima"
 *   Outro ("prestador de serviço", M) → "o prestador de serviço citado acima"
 *   Gênero não informado → "o(a) visitante citado(a) acima"
 */
export function sujeito(tratamento: Tratamento, genero?: Genero, tratamentoOutro?: string): string {
  const g = generoDoTratamento(tratamento, genero);
  const substantivo = tratamento === "Outro" ? (tratamentoOutro?.trim() || "pessoa").toLowerCase() : tratamento.toLowerCase();
  if (g === "F") return `a ${substantivo} citada acima`;
  if (g === "M") return `o ${substantivo} citado acima`;
  if (tratamento === "Outro" && !tratamentoOutro?.trim()) return "a pessoa citada acima";
  return `o(a) ${substantivo} citado(a) acima`;
}

export function textoQuadraLote(quadra: string, lote: string): string {
  const fmt = (v: string) => (/^\d$/.test(v.trim()) ? `0${v.trim()}` : v.trim());
  return `Q=${fmt(quadra)} L=${fmt(lote)}`;
}

/** Parágrafo principal do relatório. Nunca cita norma que não esteja vinculada à ocorrência. */
export function paragrafoPrincipal(o: Pick<Ocorrencia, "tratamento" | "genero" | "tratamentoOutro" | "fundamentacaoPrincipal" | "fundamentacaoComplementar">): string {
  const quem = sujeito(o.tratamento, o.genero, o.tratamentoOutro);
  if (!o.fundamentacaoPrincipal) {
    return `Informo a ocorrência descrita acima, envolvendo ${quem}, a qual é encaminhada para análise da Administração para definição da fundamentação aplicável.`;
  }
  let texto = `Informo que ${quem} descumpriu o ${o.fundamentacaoPrincipal.citacao}`;
  if (o.fundamentacaoComplementar) {
    texto += `, bem como o ${o.fundamentacaoComplementar.citacao}`;
  }
  return `${texto}, conforme ocorrência descrita acima.`;
}

export interface BlocoFundamentacao {
  titulo: string;
  citacao: string;
  texto: string;
}

export function blocosFundamentacao(o: Pick<Ocorrencia, "fundamentacaoPrincipal" | "fundamentacaoComplementar">): BlocoFundamentacao[] {
  const blocos: BlocoFundamentacao[] = [];
  const add = (titulo: string, f?: FundamentacaoSnapshot) => {
    if (f) blocos.push({ titulo, citacao: f.citacao, texto: f.texto });
  };
  add(o.fundamentacaoComplementar ? "Fundamentação principal" : "Fundamentação", o.fundamentacaoPrincipal);
  add("Fundamentação complementar", o.fundamentacaoComplementar);
  return blocos;
}

/** Estrutura completa do relatório, usada pela tela, pela impressão e pelo PDF. */
export interface ConteudoRelatorio {
  cabecalhoAssociacao: string;
  localData: string;
  destinatario: string;
  protocolo: string;
  linhas: { rotulo: string; valor: string }[];
  quadraLote: string;
  horas: string;
  paragrafo: string;
  descricao?: string;
  fundamentacoes: BlocoFundamentacao[];
  observacoes?: string;
  responsavelNome?: string;
  responsavelCargo?: string;
}

export function montarRelatorio(o: Ocorrencia, cfg: Configuracoes): ConteudoRelatorio {
  return {
    cabecalhoAssociacao: cfg.nomeAssociacao,
    localData: linhaLocalData(cfg.cidade, o.data),
    destinatario: `A/C: ${cfg.destinatario}`,
    protocolo: o.protocolo,
    linhas: [
      { rotulo: "Ocorrência", valor: o.ocorrencia },
      { rotulo: "Nome", valor: o.nome },
    ],
    quadraLote: textoQuadraLote(o.quadra, o.lote),
    horas: o.horario,
    paragrafo: paragrafoPrincipal(o),
    descricao: o.descricao?.trim() || undefined,
    fundamentacoes: o.incluirTextoNorma ? blocosFundamentacao(o) : [],
    observacoes: o.observacoes?.trim() || undefined,
    responsavelNome: cfg.responsavelNome || undefined,
    responsavelCargo: cfg.responsavelCargo || undefined,
  };
}

/** Próximo protocolo do ano: "2026-0001", "2026-0002"... Reinicia a cada ano. */
export function proximoProtocolo(ano: number, protocolosExistentes: string[]): string {
  const prefixo = `${ano}-`;
  const maior = protocolosExistentes
    .filter((p) => p.startsWith(prefixo))
    .map((p) => Number(p.slice(prefixo.length)))
    .filter((n) => Number.isFinite(n))
    .reduce((a, b) => Math.max(a, b), 0);
  return `${prefixo}${String(maior + 1).padStart(4, "0")}`;
}
