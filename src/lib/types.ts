/**
 * Tipos centrais do sistema.
 *
 * Os nomes dos campos foram escolhidos para mapear diretamente para as
 * tabelas descritas em `supabase/schema.sql`, permitindo trocar o
 * armazenamento local (demonstração) por Supabase/PostgreSQL sem alterar
 * as telas.
 */

export type DocumentoTipo = "ESTATUTO" | "REGULAMENTO";

export const DOCUMENTO_NOME: Record<DocumentoTipo, string> = {
  ESTATUTO: "Estatuto Social",
  REGULAMENTO: "Regulamento Interno",
};

/**
 * Uma norma individual extraída do Estatuto Social ou do Regulamento Interno.
 *
 * Estatuto: identificada por `artigo` (+ `alinea` e/ou `paragrafo`).
 * Regulamento: identificada por `secaoNumero` + `item` (+ `subitem`).
 */
export interface Norma {
  id: string;
  documento: DocumentoTipo;
  /** Número romano do tópico (Regulamento) ou do capítulo (Estatuto). Ex.: "II" */
  secaoNumero: string;
  /** Título do tópico/capítulo exatamente como no documento. Ex.: "DOS DEVERES DOS ASSOCIADOS" */
  secaoTitulo: string;
  /** Somente Estatuto. Ex.: "11" */
  artigo?: string;
  /** Somente Estatuto. Ex.: "a" */
  alinea?: string;
  /** Somente Estatuto. Ex.: "Parágrafo Segundo" ou "Parágrafo único" */
  paragrafo?: string;
  /** Somente Regulamento. Ex.: "8" */
  item?: string;
  /** Título do item quando existir (ex.: "Gerais", "Lago"). */
  itemTitulo?: string;
  /** Somente Regulamento. Ex.: "1.2.7" */
  subitem?: string;
  /** Texto integral da regra, conforme o documento. */
  texto: string;
  palavrasChave: string[];
  categorias: string[];
  /**
   * Indica se a norma pode fundamentar uma ocorrência disciplinar.
   * Normas institucionais (ex.: composição da Diretoria) ficam cadastradas
   * para consulta, mas não são sugeridas automaticamente.
   */
  aplicavelOcorrencias: boolean;
  /** Página do PDF original onde a norma aparece. */
  pagina?: number;
  /** Sinaliza trecho com problema de leitura no PDF. */
  revisaoManual?: boolean;
  observacaoRevisao?: string;
  ativo: boolean;
  atualizadoEm?: string;
}

export type Confianca = "ALTA" | "MEDIA" | "BAIXA";

export const CONFIANCA_LABEL: Record<Confianca, string> = {
  ALTA: "Alta",
  MEDIA: "Média",
  BAIXA: "Baixa",
};

/**
 * Cópia imutável da norma vinculada ao relatório no momento da confirmação.
 * Garante a auditoria: mesmo que a Base Normativa seja editada depois,
 * o relatório preserva o texto que foi efetivamente utilizado.
 */
export interface FundamentacaoSnapshot {
  normaId: string;
  documento: DocumentoTipo;
  secaoNumero: string;
  secaoTitulo: string;
  artigo?: string;
  alinea?: string;
  paragrafo?: string;
  item?: string;
  itemTitulo?: string;
  subitem?: string;
  texto: string;
  /** Citação formatada. Ex.: "Item 8 do tópico II – DOS DEVERES DOS ASSOCIADOS do Regulamento Interno" */
  citacao: string;
  /** Forma curta para tabelas. Ex.: "RI II, item 8" */
  citacaoCurta: string;
  origem: "AUTOMATICA" | "MANUAL";
  confianca?: Confianca;
  confirmadoEm: string;
}

export type Tratamento =
  | "Associado"
  | "Associada"
  | "Morador"
  | "Moradora"
  | "Proprietário"
  | "Proprietária"
  | "Visitante"
  | "Funcionário"
  | "Funcionária"
  | "Outro";

export const TRATAMENTOS: Tratamento[] = [
  "Associado",
  "Associada",
  "Morador",
  "Moradora",
  "Proprietário",
  "Proprietária",
  "Visitante",
  "Funcionário",
  "Funcionária",
  "Outro",
];

export type Genero = "M" | "F" | "N";

export type StatusOcorrencia =
  | "REGISTRADA"
  | "AGUARDANDO_ANALISE"
  | "NOTIFICADA"
  | "CONCLUIDA"
  | "CANCELADA";

export const STATUS_LABEL: Record<StatusOcorrencia, string> = {
  REGISTRADA: "Registrada",
  AGUARDANDO_ANALISE: "Aguardando análise",
  NOTIFICADA: "Notificada",
  CONCLUIDA: "Concluída",
  CANCELADA: "Cancelada",
};

export interface Ocorrencia {
  id: string;
  /** Ex.: "2026-0001" */
  protocolo: string;
  /** Data do registro (AAAA-MM-DD), preenchida automaticamente. */
  data: string;
  /** Horário da ocorrência (HH:MM). */
  horario: string;
  /** Ocorrência informada pelo funcionário (título curto). */
  ocorrencia: string;
  /** Descrição complementar opcional. */
  descricao?: string;
  nome: string;
  tratamento: Tratamento;
  /** Usado para Visitante/Outro, onde o tratamento não define o gênero. */
  genero?: Genero;
  /** Para "Outro": como a pessoa deve ser referida (ex.: "prestador de serviço"). */
  tratamentoOutro?: string;
  quadra: string;
  lote: string;
  fundamentacaoPrincipal?: FundamentacaoSnapshot;
  fundamentacaoComplementar?: FundamentacaoSnapshot;
  /** Quando verdadeiro, o texto das normas é transcrito no relatório. */
  incluirTextoNorma: boolean;
  observacoes?: string;
  status: StatusOcorrencia;
  criadoEm: string;
  atualizadoEm: string;
}

export interface Configuracoes {
  nomeAssociacao: string;
  cidade: string;
  destinatario: string;
  incluirTextoNormaPadrao: boolean;
  responsavelNome: string;
  responsavelCargo: string;
}

export const CONFIGURACOES_PADRAO: Configuracoes = {
  nomeAssociacao: "Associação dos Adquirentes de Unidades no Empreendimento Fazenda da Ilha",
  cidade: "Embu-Guaçu",
  destinatario: "ADM",
  incluirTextoNormaPadrao: true,
  responsavelNome: "",
  responsavelCargo: "",
};
