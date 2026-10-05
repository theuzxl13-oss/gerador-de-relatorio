/**
 * Motor de análise de ocorrências.
 *
 * Fluxo:
 *   1. INTERPRETAÇÃO: o texto livre informado pelo funcionário é convertido em
 *      categorias (ex.: "som alto depois das 22h" → "Perturbação de sossego").
 *      A interpretação é feita por um `InterpretadorOcorrencia`. Hoje existe o
 *      interpretador por regras/sinônimos; no futuro pode ser plugado um
 *      interpretador com IA sem alterar o restante do fluxo.
 *   2. BUSCA: as normas ATIVAS e APLICÁVEIS da Base Normativa são pontuadas por
 *      categoria, palavras-chave, semelhança textual e contexto (horário/dia).
 *   3. CONFIANÇA: cada candidata recebe Alta / Média / Baixa.
 *      Somente Alta ou Média são apresentadas como "fundamentação encontrada".
 *
 * REGRA CRÍTICA: este módulo apenas SELECIONA normas existentes na base.
 * Ele nunca cria números de artigo, item ou texto de regra.
 */
import type { Confianca, Norma, Tratamento } from "../types";
import { CATEGORIAS, TERMOS_DOMINGO, TERMOS_NOTURNOS, TERMOS_SABADO } from "./categorias";
import { contemTermo, minutos, normalizar, radical, tokens } from "./texto";

export interface ContextoOcorrencia {
  /** HH:MM */
  horario?: string;
  /** AAAA-MM-DD — data do registro (padrão: hoje). */
  data?: string;
  descricao?: string;
  tratamento?: Tratamento;
}

export interface CategoriaDetectada {
  nome: string;
  termos: string[];
  forca: number;
}

export interface Interpretacao {
  textoOriginal: string;
  textoNormalizado: string;
  categorias: CategoriaDetectada[];
  noturno: boolean;
  diaSemana: number | null; // 0 = domingo
  domingoOuFeriado: boolean;
  sabado: boolean;
  /** Identifica quem interpretou (regras, IA...). */
  interpretador: string;
}

/**
 * Contrato para interpretar a ocorrência. Uma futura implementação com IA
 * deve apenas devolver as categorias da lista oficial (CATEGORIAS) — nunca
 * normas —, mantendo a seleção da fundamentação restrita à Base Normativa.
 */
export interface InterpretadorOcorrencia {
  nome: string;
  interpretar(texto: string, contexto: ContextoOcorrencia): Interpretacao | Promise<Interpretacao>;
}

export interface Candidato {
  norma: Norma;
  pontuacao: number;
  confianca: Confianca;
  motivos: string[];
  categoriasEmComum: string[];
}

export interface ResultadoAnalise {
  interpretacao: Interpretacao;
  /** Verdadeiro somente se há fundamentação com confiança Alta ou Média. */
  encontrado: boolean;
  principal?: Candidato;
  /** Fundamentação complementar com relação real com a ocorrência (outro documento). */
  complementar?: Candidato;
  /** Sugestão opcional (ex.: dever estatutário de cumprir o Regulamento) — não pré-selecionada. */
  complementarSugerida?: Candidato;
  candidatos: Candidato[];
  alertas: string[];
}

export const MENSAGEM_NAO_ENCONTRADO =
  "Nenhum artigo ou item foi identificado automaticamente com segurança. Selecione manualmente a fundamentação ou encaminhe a ocorrência para análise da Administração.";

// ───────────────────────────── Interpretação por regras ─────────────────────────────

function diaDaSemana(data?: string): number | null {
  if (!data) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(data);
  if (!m) return null;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])).getDay();
}

export const interpretadorRegras: InterpretadorOcorrencia = {
  nome: "regras",
  interpretar(texto, contexto) {
    const completo = [texto, contexto.descricao].filter(Boolean).join(". ");
    const norm = normalizar(completo);

    const categorias: CategoriaDetectada[] = [];
    for (const cat of CATEGORIAS) {
      const termos = cat.termos.filter((t) => contemTermo(norm, t));
      if (termos.length === 0) continue;
      const forca = termos.reduce((s, t) => s + (t.replace("*", "").includes(" ") ? 2 : 1), 0);
      categorias.push({ nome: cat.nome, termos, forca });
    }
    categorias.sort((a, b) => b.forca - a.forca);

    const min = minutos(contexto.horario);
    const noturnoHorario = min !== null && (min >= 22 * 60 || min < 7 * 60);
    const noturnoTexto = TERMOS_NOTURNOS.some((t) => contemTermo(norm, t));
    const dia = diaDaSemana(contexto.data);

    return {
      textoOriginal: completo,
      textoNormalizado: norm,
      categorias,
      noturno: noturnoHorario || noturnoTexto,
      diaSemana: dia,
      domingoOuFeriado: dia === 0 || TERMOS_DOMINGO.some((t) => contemTermo(norm, t)),
      sabado: dia === 6 || TERMOS_SABADO.some((t) => contemTermo(norm, t)),
      interpretador: "regras",
    };
  },
};

// ───────────────────────────── Pontuação das normas ─────────────────────────────

const CAT = {
  SOSSEGO: "Perturbação de sossego",
  OBRA_HORARIO: "Obra fora do horário permitido",
  LAZER: "Uso irregular das áreas de lazer",
  LAGO: "Uso irregular dos lagos",
  CAMINHOES: "Entrada de caminhões / entregas em horário vedado",
};

/** Subitens do tópico VII cujo texto se aplica também às áreas comuns em geral. */
const SUBITENS_AREAS_COMUNS = new Set(["1.2.8", "1.2.9", "1.2.10", "7.4"]);

const DIAS = ["domingo", "segunda-feira", "terça-feira", "quarta-feira", "quinta-feira", "sexta-feira", "sábado"];

/** Horário de obras — Regulamento Interno, tópico IX, item 6. */
export function obraPermitida(diaSemana: number, min: number): boolean {
  if (diaSemana >= 1 && diaSemana <= 5) return min >= 7 * 60 && min <= 18 * 60;
  if (diaSemana === 6) return min >= 7 * 60 && min <= 14 * 60;
  return false;
}

function palavraChaveEncontrada(textoNorm: string, radicaisTexto: Set<string>, kw: string): boolean {
  if (contemTermo(textoNorm, kw)) return true;
  const partes = tokens(kw);
  if (partes.length === 0 || partes.length > 3) return false;
  return partes.every((p) => radicaisTexto.has(radical(p)));
}

function classificar(pontuacao: number, categorias: number, palavras: number): Confianca | null {
  if (categorias >= 1 && palavras >= 1 && pontuacao >= 12) return "ALTA";
  if (pontuacao >= 8 && (categorias >= 1 || palavras >= 2)) return "MEDIA";
  if (pontuacao >= 4) return "BAIXA";
  return null;
}

const ORDEM_CONFIANCA: Record<Confianca, number> = { ALTA: 3, MEDIA: 2, BAIXA: 1 };

function pontuarNorma(norma: Norma, interp: Interpretacao, ctx: ContextoOcorrencia, radicaisTexto: Set<string>) {
  const detectadas = new Map(interp.categorias.map((c) => [c.nome, c]));
  const motivos: string[] = [];
  let s = 0;

  const emComum = norma.categorias.filter((c) => detectadas.has(c));
  for (const nome of emComum) {
    const cat = detectadas.get(nome)!;
    s += 4 + Math.min(cat.forca, 4);
    if (norma.categorias[0] === nome) s += 2;
  }
  if (emComum.length) {
    const termos = emComum.flatMap((c) => detectadas.get(c)!.termos.map((t) => t.replace("*", "")));
    motivos.push(`Categoria identificada: ${emComum.join(", ")} (termos: ${[...new Set(termos)].slice(0, 5).join(", ")})`);
  }

  const kws = norma.palavrasChave.filter((kw) => palavraChaveEncontrada(interp.textoNormalizado, radicaisTexto, kw));
  for (const kw of kws) s += tokens(kw).length > 1 ? 3 : 2;
  if (kws.length) motivos.push(`Palavras-chave da norma presentes: ${kws.slice(0, 6).join(", ")}`);

  if (emComum.length === 0 && kws.length === 0) return null;

  const radicaisNorma = new Set(tokens(norma.texto).map(radical));
  const sobreposicao = [...radicaisTexto].filter((r) => r.length >= 4 && radicaisNorma.has(r)).length;
  s += Math.min(sobreposicao, 3);

  // ── Contexto: horário e dia da semana ──
  const min = minutos(ctx.horario);
  const ehRegulamento = norma.documento === "REGULAMENTO";

  if (ehRegulamento && norma.secaoNumero === "II" && norma.item === "8" && detectadas.has(CAT.SOSSEGO) && interp.noturno) {
    s += 4;
    motivos.push(
      ctx.horario && min !== null && (min >= 22 * 60 || min < 7 * 60)
        ? `Horário informado (${ctx.horario}) está no período a partir das 22:00 citado expressamente na regra`
        : "Descrição indica período noturno (a regra cita expressamente o período a partir das 22:00)",
    );
  }

  if (ehRegulamento && norma.secaoNumero === "IX" && norma.item === "6" && !norma.subitem && detectadas.has(CAT.OBRA_HORARIO)) {
    const textoDizForaHorario = contemTermo(interp.textoNormalizado, "fora do horario") || interp.domingoOuFeriado;
    if (interp.diaSemana !== null && min !== null) {
      const permitido = obraPermitida(interp.diaSemana, min);
      const quando = `${DIAS[interp.diaSemana]}, ${ctx.horario}`;
      if (!permitido) {
        s += 5;
        motivos.push(`Data/horário (${quando}) fora do horário permitido para obras`);
      } else if (!textoDizForaHorario) {
        s -= 6;
        motivos.push(`Atenção: data/horário (${quando}) está DENTRO do horário permitido para obras`);
      }
    } else if (textoDizForaHorario) {
      s += 3;
    }
  }

  if (ehRegulamento && norma.subitem === "6.1" && norma.secaoNumero === "IX") {
    if (interp.sabado) {
      s += 4;
      motivos.push("Ocorrência em sábado (a regra trata de entregas aos sábados)");
    } else {
      s -= 4;
    }
  }

  // Normas de locais específicos (tópico VII) exigem menção ao local,
  // exceto as que o próprio texto estende às áreas comuns em geral.
  if (
    ehRegulamento &&
    norma.secaoNumero === "VII" &&
    !SUBITENS_AREAS_COMUNS.has(norma.subitem ?? "") &&
    !detectadas.has(CAT.LAZER) &&
    !detectadas.has(CAT.LAGO)
  ) {
    s -= 5;
  }

  const confianca = classificar(s, emComum.length, kws.length);
  if (!confianca) return null;
  return { norma, pontuacao: s, confianca, motivos, categoriasEmComum: emComum } satisfies Candidato;
}

const TRATAMENTOS_ASSOCIADO: Tratamento[] = ["Associado", "Associada", "Proprietário", "Proprietária"];

/**
 * Analisa a ocorrência e devolve as normas candidatas.
 * `normas` deve ser a Base Normativa vigente (do banco de dados).
 */
export async function analisarOcorrencia(
  texto: string,
  normas: Norma[],
  contexto: ContextoOcorrencia = {},
  interpretador: InterpretadorOcorrencia = interpretadorRegras,
): Promise<ResultadoAnalise> {
  const interpretacao = await interpretador.interpretar(texto, contexto);
  const radicaisTexto = new Set(tokens(interpretacao.textoOriginal).map(radical));
  const alertas: string[] = [];

  const candidatos = normas
    .filter((n) => n.ativo && n.aplicavelOcorrencias)
    .map((n) => pontuarNorma(n, interpretacao, contexto, radicaisTexto))
    .filter((c): c is Candidato => c !== null)
    .sort(
      (a, b) =>
        ORDEM_CONFIANCA[b.confianca] - ORDEM_CONFIANCA[a.confianca] ||
        b.pontuacao - a.pontuacao ||
        (a.norma.documento === "REGULAMENTO" ? -1 : 1) - (b.norma.documento === "REGULAMENTO" ? -1 : 1),
    )
    .slice(0, 10);

  const melhor = candidatos[0];
  const encontrado = !!melhor && melhor.confianca !== "BAIXA";
  const principal = encontrado ? melhor : undefined;

  let complementar: Candidato | undefined;
  let complementarSugerida: Candidato | undefined;
  if (principal) {
    complementar = candidatos.find(
      (c) =>
        c !== principal &&
        c.norma.documento !== principal.norma.documento &&
        c.confianca !== "BAIXA" &&
        c.categoriasEmComum.some((cat) => principal.categoriasEmComum.includes(cat)),
    );
    if (!complementar && principal.norma.documento === "REGULAMENTO" && contexto.tratamento && TRATAMENTOS_ASSOCIADO.includes(contexto.tratamento)) {
      const dever = normas.find((n) => n.id === "ES-11-a" && n.ativo);
      if (dever) {
        complementarSugerida = {
          norma: dever,
          pontuacao: 0,
          confianca: "MEDIA",
          motivos: ["Dever estatutário dos associados de cumprir o Regulamento Interno (sugestão opcional)"],
          categoriasEmComum: [],
        };
      }
    }
    if (principal.norma.revisaoManual) {
      alertas.push("A norma selecionada possui trecho sinalizado para revisão manual (leitura do PDF). Confira o texto antes de confirmar.");
    }
  }

  if (interpretacao.categorias.length === 0) {
    alertas.push("Nenhuma categoria de ocorrência foi reconhecida no texto informado.");
  }
  for (const c of candidatos.slice(0, 3)) {
    for (const m of c.motivos) if (m.startsWith("Atenção")) alertas.push(m);
  }

  return { interpretacao, encontrado, principal, complementar, complementarSugerida, candidatos, alertas: [...new Set(alertas)] };
}

/**
 * Pesquisa livre na Base Normativa (seleção manual). Busca em todas as normas
 * ativas, inclusive as não sugeridas automaticamente.
 */
export function pesquisarNormas(consulta: string, normas: Norma[], documento?: Norma["documento"]): Norma[] {
  const lista = normas.filter((n) => n.ativo && (!documento || n.documento === documento));
  const q = normalizar(consulta);
  if (!q) return lista;

  const numero = /^(?:art(?:igo)?\.?\s*|item\s*|subitem\s*)?(\d+(?:\.\d+)*)$/.exec(q);
  const radicaisQ = tokens(q).map(radical);

  return lista
    .map((n) => {
      let s = 0;
      if (numero) {
        const v = numero[1];
        if (n.artigo === v || n.item === v || n.subitem === v) s += 10;
      }
      const alvo = normalizar([n.texto, n.secaoTitulo, n.palavrasChave.join(" "), n.categorias.join(" "), n.itemTitulo ?? ""].join(" "));
      if (alvo.includes(q)) s += 6;
      const radicaisAlvo = new Set(tokens(alvo).map(radical));
      s += radicaisQ.filter((r) => radicaisAlvo.has(r)).length * 2;
      return { n, s };
    })
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s)
    .map((x) => x.n);
}
