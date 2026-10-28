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

/**
 * Situação do relatório. "Registrada"/"Aguardando análise" = ainda sem providência;
 * as demais são definidas automaticamente pela providência registrada pela Administração.
 */
export type StatusOcorrencia =
  | "REGISTRADA"
  | "AGUARDANDO_ANALISE"
  | "ARQUIVADA"
  | "NOTIFICADA"
  | "MULTADA"
  | "CONCLUIDA"
  | "CANCELADA";

export const STATUS_LABEL: Record<StatusOcorrencia, string> = {
  REGISTRADA: "Registrada",
  AGUARDANDO_ANALISE: "Aguardando análise",
  ARQUIVADA: "Arquivada",
  NOTIFICADA: "Notificada",
  MULTADA: "Multada",
  CONCLUIDA: "Concluída",
  CANCELADA: "Cancelada",
};

/** Foto/imagem anexada ao relatório (o arquivo fica na tabela de anexos). */
export interface AnexoInfo {
  id: string;
  nome: string;
  largura: number;
  altura: number;
}

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
  /**
   * Complemento inserido no parágrafo do relatório, após a citação da norma.
   * Ex.: "ao deixar conduzir o veículo, sendo constatado que o condutor era menor de idade".
   */
  complemento?: string;
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
  /** Fotos/imagens do relatório, na ordem de exibição. */
  anexos?: AnexoInfo[];
  /** Usuário que registrou a ocorrência no sistema (auditoria). */
  registradoPor?: RegistradoPor;
  /** Decisão da Administração (arquivado, notificado ou multado). */
  providencia?: Providencia;
  /** Linha do tempo: criação, edições e decisões. Gravada somente pelo servidor. */
  historico?: EventoAuditoria[];
  /** Quem assina o relatório (padrão: Configurações). */
  assinaturaNome?: string;
  assinaturaCargo?: string;
  status: StatusOcorrencia;
  criadoEm: string;
  atualizadoEm: string;
}

/** Como as seções do Regulamento são chamadas no texto do relatório. */
export type TermoSecao = "tópico" | "Artigo";

export interface Configuracoes {
  nomeAssociacao: string;
  /** Nome curto exibido no cabeçalho do relatório. */
  nomeCabecalho: string;
  cnpj: string;
  slogan: string;
  /** Linha de rodapé (endereço, contato, site). */
  rodape: string;
  cidade: string;
  destinatario: string;
  incluirTextoNormaPadrao: boolean;
  termoSecaoRegulamento: TermoSecao;
  responsavelNome: string;
  responsavelCargo: string;
  /** Valor da taxa da Associação (R$). A multa é de até uma taxa (RI XV, 2.3), dobrada na reincidência. 0 = não informado. */
  valorTaxa: number;
  /** Prazo padrão, em dias, para o esclarecimento após a notificação. */
  prazoEsclarecimentoDias: number;
}

export const CONFIGURACOES_PADRAO: Configuracoes = {
  nomeAssociacao: "Associação dos Adquirentes de Unidades no Empreendimento Fazenda da Ilha",
  nomeCabecalho: "FAZENDA DA ILHA",
  cnpj: "59.039.586/0001-40",
  slogan: "Onde morar é viver!",
  rodape:
    "Associação dos Adquirentes de Unidade No Empreendimento Fazenda da Ilha - Endereço: Rua Córsega, 200 - Bairro: Fazenda da Ilha - CEP: 06905-500 - Contato: (11) 4662-9900 – (11) 4661-7066 - SITE: WWW.FAZENDADAILHA.COM.BR",
  cidade: "Embu-Guaçu",
  destinatario: "ADM",
  incluirTextoNormaPadrao: false,
  termoSecaoRegulamento: "tópico",
  responsavelNome: "Michael Martins",
  responsavelCargo: "Líder Operacional",
  valorTaxa: 0,
  prazoEsclarecimentoDias: 10,
};

// ───────────────────────────── Usuários e permissões ─────────────────────────────

/**
 * ADMIN_GERAL    – acesso total.
 * GERENTE        – visualiza tudo (somente leitura) para acompanhar os procedimentos.
 * ADMINISTRACAO  – analisa os relatórios, registra a providência e cria os logins operacionais.
 * LIDER/PORTEIRO/RONDA – somente geram relatórios (veem apenas os próprios).
 * As regras ficam em `src/lib/permissoes.ts`.
 */
export type Perfil = "ADMIN_GERAL" | "GERENTE" | "ADMINISTRACAO" | "LIDER" | "PORTEIRO" | "RONDA";

export const PERFIS: Perfil[] = ["ADMIN_GERAL", "GERENTE", "ADMINISTRACAO", "LIDER", "PORTEIRO", "RONDA"];

export const PERFIL_LABEL: Record<Perfil, string> = {
  ADMIN_GERAL: "Admin Geral",
  GERENTE: "Gerente",
  ADMINISTRACAO: "Administração",
  LIDER: "Líder",
  PORTEIRO: "Porteiro",
  RONDA: "Ronda",
};

export interface Usuario {
  id: string;
  nome: string;
  login: string;
  perfil: Perfil;
  ativo: boolean;
  criadoEm: string;
  atualizadoEm: string;
}

/** Usuário com o hash da senha (somente no servidor). */
export interface UsuarioComSenha extends Usuario {
  senhaHash: string;
}

/** Referência a um usuário gravada nos registros (auditoria). */
export interface RegistradoPor {
  id: string;
  nome: string;
}

// ───────────────────────────── Providência (decisão da Administração) ─────────────────────────────

/** Regulamento Interno, tópico XV – Atos disciplinares. */
export type TipoProvidencia = "ARQUIVADO" | "NOTIFICADO" | "MULTADO";

export const PROVIDENCIA_LABEL: Record<TipoProvidencia, string> = {
  ARQUIVADO: "Arquivado",
  NOTIFICADO: "Notificado",
  MULTADO: "Multado",
};

export type ResultadoEsclarecimento = "PENDENTE" | "ESCLARECEU" | "NAO_ESCLARECEU";

export const ESCLARECIMENTO_LABEL: Record<ResultadoEsclarecimento, string> = {
  PENDENTE: "Aguardando esclarecimento",
  ESCLARECEU: "Esclareceu",
  NAO_ESCLARECEU: "Não esclareceu",
};

export type SituacaoRecurso = "SEM_RECURSO" | "APRESENTADO" | "DEFERIDO" | "INDEFERIDO";

export const RECURSO_LABEL: Record<SituacaoRecurso, string> = {
  SEM_RECURSO: "Sem recurso",
  APRESENTADO: "Recurso apresentado (em análise)",
  DEFERIDO: "Recurso deferido",
  INDEFERIDO: "Recurso indeferido",
};

/** Prazo de recurso: 30 dias a partir do recebimento da notificação ou multa (RI XV, item 5). */
export const PRAZO_RECURSO_DIAS = 30;
/** Reincidência: repetir a falta dentro de 12 meses (RI XV, item 3). */
export const PRAZO_REINCIDENCIA_MESES = 12;

export interface Providencia {
  tipo: TipoProvidencia;
  /** O que foi feito / motivo da decisão. */
  descricao: string;
  decididoEm: string;
  decididoPor: RegistradoPor;

  /** Data em que a pessoa recebeu a notificação ou a multa (AAAA-MM-DD). Inicia o prazo de recurso. */
  dataRecebimento?: string;

  // Notificação (RI XV, 2.2): período para esclarecimento
  esclarecimentoInicio?: string;
  esclarecimentoFim?: string;
  esclarecimentoResultado?: ResultadoEsclarecimento;
  esclarecimentoObservacao?: string;

  // Multa (RI XV, 2.3 e 2.4)
  /** Valor em reais. */
  multaValor?: number;
  /** Reincidência dentro de 12 meses: multa dobrada. */
  reincidente?: boolean;

  // Recurso (RI XV, item 5)
  recursoSituacao?: SituacaoRecurso;
  recursoObservacao?: string;
}

/** Registro da linha do tempo (auditoria): quem fez o quê e quando. */
export interface EventoAuditoria {
  em: string;
  por: RegistradoPor;
  acao: "CRIOU" | "EDITOU" | "PROVIDENCIA" | "ATUALIZOU_PROVIDENCIA" | "REMOVEU_PROVIDENCIA";
  detalhe?: string;
}
