/**
 * Consulta paginada de ocorrências: filtros, paginação e resumos.
 *
 * As funções daqui são a referência do comportamento: o armazenamento em arquivo
 * as usa diretamente e o PostgreSQL faz o mesmo em SQL (os testes de integração
 * comparam os dois resultados).
 */
import { alertasPrazo, aguardaDecisao, type Alerta } from "./providencia";
import { STATUS_LABEL, type DocumentoTipo, type Ocorrencia, type ResultadoEsclarecimento, type StatusOcorrencia, type TipoProvidencia } from "./types";

export interface FiltroOcorrencias {
  /** Texto livre: protocolo, nome, ocorrência, descrição, quadra/lote, citação, quem registrou. */
  busca?: string;
  nome?: string;
  quadra?: string;
  lote?: string;
  ocorrencia?: string;
  /** AAAA-MM-DD (inclusive) */
  de?: string;
  ate?: string;
  /** Trecho da citação (ex.: "item 8", "art. 11"). */
  dispositivo?: string;
  documento?: DocumentoTipo | "SEM";
  status?: StatusOcorrencia;
  /** Somente as que aguardam a providência da Administração. */
  pendentes?: boolean;
  /** Restrição de visibilidade (definida pelo servidor, nunca pelo navegador). */
  registradoPor?: string;
}

export interface Pagina<T> {
  itens: T[];
  total: number;
  pagina: number;
  porPagina: number;
}

export const POR_PAGINA_PADRAO = 25;
export const POR_PAGINA_MAXIMO = 100;

const DATA = /^\d{4}-\d{2}-\d{2}$/;
const curto = (v: string | null | undefined, max = 120) => {
  const t = (v ?? "").trim().slice(0, max);
  return t || undefined;
};

/** Lê os filtros da URL, descartando valores inválidos. `registradoPor` nunca vem da URL. */
export function filtroDaUrl(p: URLSearchParams): { filtro: FiltroOcorrencias; pagina: number; porPagina: number } {
  const documento = p.get("documento");
  const status = p.get("status");
  const de = p.get("de");
  const ate = p.get("ate");
  const filtro: FiltroOcorrencias = {
    busca: curto(p.get("busca")),
    nome: curto(p.get("nome")),
    quadra: curto(p.get("quadra"), 10),
    lote: curto(p.get("lote"), 10),
    ocorrencia: curto(p.get("ocorrencia")),
    dispositivo: curto(p.get("dispositivo")),
    de: de && DATA.test(de) ? de : undefined,
    ate: ate && DATA.test(ate) ? ate : undefined,
    documento: documento === "REGULAMENTO" || documento === "ESTATUTO" || documento === "ATA" || documento === "SEM" ? documento : undefined,
    status: status && status in STATUS_LABEL ? (status as StatusOcorrencia) : undefined,
    pendentes: p.get("pendentes") === "1" || undefined,
  };
  const pagina = Math.max(1, Math.floor(Number(p.get("pagina")) || 1));
  const porPagina = Math.min(POR_PAGINA_MAXIMO, Math.max(1, Math.floor(Number(p.get("porPagina")) || POR_PAGINA_PADRAO)));
  return { filtro, pagina, porPagina };
}

/** Minúsculas e sem acentos (equivalente ao `translate(lower(...))` usado no SQL). */
export function simplificar(s: string | undefined | null): string {
  return (s ?? "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

const contem = (valor: string | undefined, termo: string | undefined) => !termo || simplificar(valor).includes(simplificar(termo.trim()));
const semZeros = (s: string | undefined) => (s ?? "").trim().replace(/^0+/, "").toLowerCase();

/** Texto pesquisado pela busca livre. */
export function textoDeBusca(o: Ocorrencia): string {
  return [
    o.protocolo, o.nome, o.ocorrencia, o.descricao, `q${o.quadra} l${o.lote}`,
    o.fundamentacaoPrincipal?.citacaoCurta, o.fundamentacaoComplementar?.citacaoCurta, o.registradoPor?.nome,
  ]
    .filter((x) => x !== undefined && x !== null)
    .join(" ");
}

export function correspondeFiltro(o: Ocorrencia, f: FiltroOcorrencias): boolean {
  if (f.registradoPor && o.registradoPor?.id !== f.registradoPor) return false;
  if (f.pendentes && !aguardaDecisao(o)) return false;
  if (f.busca && !contem(textoDeBusca(o), f.busca)) return false;
  if (!contem(o.nome, f.nome) || !contem(o.ocorrencia, f.ocorrencia)) return false;
  if (f.quadra && semZeros(o.quadra) !== semZeros(f.quadra)) return false;
  if (f.lote && semZeros(o.lote) !== semZeros(f.lote)) return false;
  if (f.de && o.data < f.de) return false;
  if (f.ate && o.data > f.ate) return false;
  if (f.status && o.status !== f.status) return false;
  const fund = [o.fundamentacaoPrincipal, o.fundamentacaoComplementar].filter((x) => !!x);
  if (f.documento === "SEM" && o.fundamentacaoPrincipal) return false;
  if (f.documento && f.documento !== "SEM" && !fund.some((x) => x!.documento === f.documento)) return false;
  if (f.dispositivo && !fund.some((x) => contem(`${x!.citacao} ${x!.citacaoCurta}`, f.dispositivo))) return false;
  return true;
}

const cmp = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);

/** Ordem padrão: data mais recente primeiro; no mesmo dia, o registro mais recente; desempate pelo id. */
export function ordenar(a: Ocorrencia, b: Ocorrencia): number {
  return cmp(b.data, a.data) || cmp(b.criadoEm, a.criadoEm) || cmp(b.id, a.id);
}

/** Retira o que a listagem não usa (a linha do tempo fica só no relatório). */
export function paraListagem(o: Ocorrencia): Ocorrencia {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { historico, ...resto } = o;
  return resto;
}

export function paginar(lista: Ocorrencia[], f: FiltroOcorrencias, pagina: number, porPagina: number, crescente = false): Pagina<Ocorrencia> {
  const filtradas = lista.filter((o) => correspondeFiltro(o, f)).sort(crescente ? (a, b) => ordenar(b, a) : ordenar);
  return { itens: filtradas.slice((pagina - 1) * porPagina, pagina * porPagina).map(paraListagem), total: filtradas.length, pagina, porPagina };
}

// ───────────────────────────── Resumos ─────────────────────────────

export interface Estatisticas {
  hoje: number;
  mes: number;
  total: number;
  /** Ocorrências mais frequentes (título agrupado sem diferenciar maiúsculas/acentos; rótulo = grafia mais recente). */
  frequentes: { rotulo: string; n: number }[];
}

export function estatisticas(lista: Ocorrencia[], hoje: string): Estatisticas {
  const mes = hoje.slice(0, 7);
  // O rótulo de cada grupo é a grafia do registro mais recente.
  const grupos = new Map<string, { rotulo: string; n: number }>();
  for (const o of [...lista].sort(ordenar)) {
    const chave = simplificar(o.ocorrencia).trim();
    const g = grupos.get(chave) ?? { rotulo: o.ocorrencia, n: 0 };
    g.n++;
    grupos.set(chave, g);
  }
  return {
    hoje: lista.filter((o) => o.data === hoje).length,
    mes: lista.filter((o) => o.data.startsWith(mes)).length,
    total: lista.length,
    frequentes: [...grupos.values()].sort((a, b) => b.n - a.n || cmp(a.rotulo, b.rotulo)).slice(0, 6),
  };
}

export interface ResumoProvidencias {
  pendentes: number;
  porTipo: { tipo: TipoProvidencia; total: number; mes: number }[];
  notificacoes: Record<ResultadoEsclarecimento, number>;
  multas: { total: number; valorTotal: number; mes: number; valorMes: number };
  recursosEmAnalise: number;
  autores: { nome: string; total: number; mes: number; pendentes: number }[];
}

export function resumoProvidencias(lista: Ocorrencia[], hoje: string): ResumoProvidencias {
  const mes = hoje.slice(0, 7);
  const tipos: TipoProvidencia[] = ["ARQUIVADO", "NOTIFICADO", "MULTADO"];
  const comP = lista.filter((o) => o.providencia);
  const doMes = (o: Ocorrencia) => o.providencia!.decididoEm.slice(0, 7) === mes;
  const multas = comP.filter((o) => o.providencia!.tipo === "MULTADO");
  const notificados = comP.filter((o) => o.providencia!.tipo === "NOTIFICADO");
  const autores = new Map<string, { nome: string; total: number; mes: number; pendentes: number }>();
  for (const o of lista) {
    const chave = o.registradoPor?.id ?? "";
    const a = autores.get(chave) ?? { nome: o.registradoPor?.nome ?? "", total: 0, mes: 0, pendentes: 0 };
    a.total++;
    if (o.data.startsWith(mes)) a.mes++;
    if (aguardaDecisao(o)) a.pendentes++;
    autores.set(chave, a);
  }
  const soma = (l: Ocorrencia[]) => Math.round(l.reduce((s, o) => s + (o.providencia!.multaValor ?? 0), 0) * 100) / 100;
  return {
    pendentes: lista.filter(aguardaDecisao).length,
    porTipo: tipos.map((t) => ({
      tipo: t,
      total: comP.filter((o) => o.providencia!.tipo === t).length,
      mes: comP.filter((o) => o.providencia!.tipo === t && doMes(o)).length,
    })),
    notificacoes: {
      PENDENTE: notificados.filter((o) => (o.providencia!.esclarecimentoResultado ?? "PENDENTE") === "PENDENTE").length,
      ESCLARECEU: notificados.filter((o) => o.providencia!.esclarecimentoResultado === "ESCLARECEU").length,
      NAO_ESCLARECEU: notificados.filter((o) => o.providencia!.esclarecimentoResultado === "NAO_ESCLARECEU").length,
    },
    multas: { total: multas.length, valorTotal: soma(multas), mes: multas.filter(doMes).length, valorMes: soma(multas.filter(doMes)) },
    recursosEmAnalise: comP.filter((o) => o.providencia!.recursoSituacao === "APRESENTADO").length,
    autores: [...autores.values()].sort((a, b) => b.mes - a.mes || b.total - a.total || a.nome.localeCompare(b.nome)),
  };
}

/**
 * Ocorrências que podem ter prazo em aberto: notificação sem resultado, recurso
 * em análise ou recebimento nos últimos 31 dias. O cálculo exato do alerta é feito
 * depois por `alertasPrazo`.
 */
export function emAcompanhamento(o: Ocorrencia, hoje: string): boolean {
  const p = o.providencia;
  if (!p || p.tipo === "ARQUIVADO") return false;
  if (p.tipo === "NOTIFICADO" && (p.esclarecimentoResultado ?? "PENDENTE") === "PENDENTE") return true;
  if (p.recursoSituacao === "APRESENTADO") return true;
  if (!p.dataRecebimento) return false;
  const limite = new Date(`${hoje}T12:00:00Z`);
  limite.setUTCDate(limite.getUTCDate() - 31);
  return p.dataRecebimento >= limite.toISOString().slice(0, 10);
}

export function comAlertas(lista: Ocorrencia[], hoje: string): { o: Ocorrencia; alertas: Alerta[] }[] {
  return lista
    .map((o) => ({ o: paraListagem(o), alertas: alertasPrazo(o, hoje) }))
    .filter((x) => x.alertas.length > 0)
    .sort((a, b) => (a.o.providencia?.esclarecimentoFim ?? "").localeCompare(b.o.providencia?.esclarecimentoFim ?? ""));
}
