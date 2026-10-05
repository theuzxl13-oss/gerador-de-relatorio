import { criarSnapshot } from "@/lib/citacao";
import {
  TRATAMENTOS,
  STATUS_LABEL,
  type AnexoInfo,
  type FundamentacaoSnapshot,
  type Norma,
  type Ocorrencia,
  type StatusOcorrencia,
  type Tratamento,
  type Genero,
  type Configuracoes,
  type DocumentoTipo,
} from "@/lib/types";
import type { NovaOcorrencia } from "./repositorio";

export class ErroValidacao extends Error {}

const texto = (v: unknown, campo: string, obrigatorio = true, max = 2000): string | undefined => {
  if (v === undefined || v === null || v === "") {
    if (obrigatorio) throw new ErroValidacao(`O campo "${campo}" é obrigatório.`);
    return undefined;
  }
  if (typeof v !== "string") throw new ErroValidacao(`O campo "${campo}" é inválido.`);
  const t = v.trim();
  if (obrigatorio && !t) throw new ErroValidacao(`O campo "${campo}" é obrigatório.`);
  if (t.length > max) throw new ErroValidacao(`O campo "${campo}" excede ${max} caracteres.`);
  return t || undefined;
};

/**
 * Reconstrói a fundamentação a partir da norma cadastrada no banco.
 * O texto e a citação NUNCA são aceitos do navegador: vêm sempre da Base
 * Normativa. Se a norma já estava vinculada à ocorrência, o registro original
 * é preservado (auditoria), mesmo que a norma tenha sido editada depois.
 */
function fundamentacao(
  v: unknown,
  normas: Map<string, Norma>,
  anterior?: FundamentacaoSnapshot,
): FundamentacaoSnapshot | undefined {
  if (!v) return undefined;
  const f = v as Partial<FundamentacaoSnapshot>;
  if (typeof f.normaId !== "string") throw new ErroValidacao("Fundamentação inválida.");
  if (anterior && anterior.normaId === f.normaId) return anterior;
  const norma = normas.get(f.normaId);
  if (!norma) throw new ErroValidacao("A norma selecionada não existe na Base Normativa.");
  const origem = f.origem === "AUTOMATICA" ? "AUTOMATICA" : "MANUAL";
  const confianca = f.confianca === "ALTA" || f.confianca === "MEDIA" || f.confianca === "BAIXA" ? f.confianca : undefined;
  return criarSnapshot(norma, origem, confianca);
}

const MAX_ANEXOS = 6;

function anexos(v: unknown): AnexoInfo[] | undefined {
  if (!Array.isArray(v) || v.length === 0) return undefined;
  if (v.length > MAX_ANEXOS) throw new ErroValidacao(`Máximo de ${MAX_ANEXOS} imagens por relatório.`);
  return v.map((a) => {
    const x = a as Partial<AnexoInfo>;
    if (typeof x.id !== "string" || !/^[0-9a-f-]{36}$/i.test(x.id)) throw new ErroValidacao("Imagem inválida.");
    return {
      id: x.id,
      nome: String(x.nome ?? "imagem").slice(0, 120),
      largura: Math.max(1, Math.round(Number(x.largura) || 1)),
      altura: Math.max(1, Math.round(Number(x.altura) || 1)),
    };
  });
}

export function validarOcorrencia(body: unknown, normasLista: Norma[], atual?: Ocorrencia): NovaOcorrencia {
  if (!body || typeof body !== "object") throw new ErroValidacao("Dados inválidos.");
  const b = body as Record<string, unknown>;
  const normas = new Map(normasLista.map((n) => [n.id, n]));

  const horario = texto(b.horario, "Horário", true, 5)!;
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(horario)) throw new ErroValidacao("Horário inválido. Use o formato HH:MM.");

  const data = texto(b.data, "Data", true, 10)!;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) throw new ErroValidacao("Data inválida.");

  const tratamento = b.tratamento as Tratamento;
  if (!TRATAMENTOS.includes(tratamento)) throw new ErroValidacao("Selecione o tratamento.");

  const genero = (["M", "F", "N"] as Genero[]).includes(b.genero as Genero) ? (b.genero as Genero) : undefined;
  const status = (b.status as StatusOcorrencia) in STATUS_LABEL ? (b.status as StatusOcorrencia) : "REGISTRADA";

  const principal = fundamentacao(b.fundamentacaoPrincipal, normas, atual?.fundamentacaoPrincipal);
  const complementar = principal ? fundamentacao(b.fundamentacaoComplementar, normas, atual?.fundamentacaoComplementar) : undefined;
  if (principal && complementar && principal.normaId === complementar.normaId) {
    throw new ErroValidacao("A fundamentação complementar deve ser diferente da principal.");
  }

  return {
    protocolo: texto(b.protocolo, "Protocolo", false, 30) ?? "",
    data,
    horario,
    ocorrencia: texto(b.ocorrencia, "Ocorrência", true, 200)!,
    descricao: texto(b.descricao, "Descrição", false, 4000),
    complemento: principal ? texto(b.complemento, "Complemento do texto", false, 600) : undefined,
    nome: texto(b.nome, "Nome", true, 200)!,
    tratamento,
    genero,
    tratamentoOutro: tratamento === "Outro" ? texto(b.tratamentoOutro, "Especificação do tratamento", false, 60) : undefined,
    quadra: texto(b.quadra, "Quadra", true, 10)!,
    lote: texto(b.lote, "Lote", true, 10)!,
    fundamentacaoPrincipal: principal,
    fundamentacaoComplementar: complementar,
    incluirTextoNorma: b.incluirTextoNorma !== false,
    observacoes: texto(b.observacoes, "Observações", false, 4000),
    anexos: anexos(b.anexos),
    assinaturaNome: texto(b.assinaturaNome, "Assinatura – nome", false, 120),
    assinaturaCargo: texto(b.assinaturaCargo, "Assinatura – cargo", false, 120),
    // Sem fundamentação, a ocorrência fica encaminhada para análise da Administração.
    status: !principal && status === "REGISTRADA" ? "AGUARDANDO_ANALISE" : status,
  };
}

const lista = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === "string").map((x) => x.trim()).filter(Boolean).slice(0, 80) : [];

export function validarNorma(body: unknown): Norma {
  if (!body || typeof body !== "object") throw new ErroValidacao("Dados inválidos.");
  const b = body as Record<string, unknown>;
  const documento = b.documento as DocumentoTipo;
  if (documento !== "ESTATUTO" && documento !== "REGULAMENTO") throw new ErroValidacao("Documento inválido.");

  const n: Norma = {
    id: texto(b.id, "Identificador", true, 60)!,
    documento,
    secaoNumero: texto(b.secaoNumero, documento === "ESTATUTO" ? "Capítulo" : "Tópico", true, 10)!,
    secaoTitulo: texto(b.secaoTitulo, "Título da seção", true, 200)!,
    artigo: documento === "ESTATUTO" ? texto(b.artigo, "Artigo", true, 10) : undefined,
    alinea: documento === "ESTATUTO" ? texto(b.alinea, "Alínea", false, 5) : undefined,
    paragrafo: documento === "ESTATUTO" ? texto(b.paragrafo, "Parágrafo", false, 40) : undefined,
    item: documento === "REGULAMENTO" ? texto(b.item, "Item", false, 10) : undefined,
    itemTitulo: documento === "REGULAMENTO" ? texto(b.itemTitulo, "Título do item", false, 120) : undefined,
    subitem: documento === "REGULAMENTO" ? texto(b.subitem, "Subitem", false, 15) : undefined,
    texto: texto(b.texto, "Texto da regra", true, 10000)!,
    palavrasChave: lista(b.palavrasChave),
    categorias: lista(b.categorias),
    aplicavelOcorrencias: b.aplicavelOcorrencias === true,
    pagina: typeof b.pagina === "number" && b.pagina > 0 ? Math.floor(b.pagina) : undefined,
    revisaoManual: b.revisaoManual === true ? true : undefined,
    observacaoRevisao: texto(b.observacaoRevisao, "Observação de revisão", false, 1000),
    ativo: b.ativo !== false,
  };
  if (n.subitem && !n.item) throw new ErroValidacao("Informe o item ao qual o subitem pertence.");
  return n;
}

export function validarConfiguracoes(body: unknown): Configuracoes {
  if (!body || typeof body !== "object") throw new ErroValidacao("Dados inválidos.");
  const b = body as Record<string, unknown>;
  return {
    nomeAssociacao: texto(b.nomeAssociacao, "Nome da associação", true, 200)!,
    nomeCabecalho: texto(b.nomeCabecalho, "Nome no cabeçalho", true, 80)!,
    cnpj: texto(b.cnpj, "CNPJ", false, 30) ?? "",
    slogan: texto(b.slogan, "Frase do cabeçalho", false, 80) ?? "",
    rodape: texto(b.rodape, "Rodapé", false, 400) ?? "",
    cidade: texto(b.cidade, "Cidade", true, 80)!,
    destinatario: texto(b.destinatario, "Destinatário (A/C)", true, 80)!,
    incluirTextoNormaPadrao: b.incluirTextoNormaPadrao === true,
    termoSecaoRegulamento: b.termoSecaoRegulamento === "Artigo" ? "Artigo" : "tópico",
    responsavelNome: texto(b.responsavelNome, "Responsável", false, 120) ?? "",
    responsavelCargo: texto(b.responsavelCargo, "Cargo", false, 120) ?? "",
  };
}
