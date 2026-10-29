import type { Estatisticas, FiltroOcorrencias, Pagina, ResumoProvidencias } from "@/lib/consulta";
import type { AnexoInfo, Configuracoes, Norma, Ocorrencia, RegistradoPor, Usuario, UsuarioComSenha } from "@/lib/types";

export interface NovoAnexo {
  nome: string;
  tipo: string;
  largura: number;
  altura: number;
  dados: Buffer;
  /** Usuário que enviou (só ele pode vincular a foto enquanto ela estiver pendente). */
  enviadoPor: string;
}

export interface ArquivoAnexo {
  tipo: string;
  dados: Buffer;
  /** Ocorrência à qual a foto pertence (ausente enquanto pendente). */
  ocorrenciaId?: string;
  enviadoPor?: string;
}

/** Dados de uma nova ocorrência. Protocolo, id, versão e datas de controle são gerados pelo repositório. */
export type NovaOcorrencia = Omit<Ocorrencia, "id" | "criadoEm" | "atualizadoEm" | "versao">;

export type EntidadeAuditada = "ocorrencia" | "usuario" | "norma" | "configuracoes" | "sistema" | "sessao" | "anexo";

/**
 * Evento da trilha de auditoria (tabela própria, independente do estado atual dos registros).
 * Nunca deve conter senhas, hashes, tokens ou segredos.
 */
export interface RegistroAuditoria {
  usuario?: RegistradoPor | null;
  acao: string;
  entidade: EntidadeAuditada;
  entidadeId?: string;
  resultado?: "SUCESSO" | "NEGADO" | "FALHA";
  detalhe?: Record<string, unknown>;
}

export interface EventoAuditoriaGravado extends RegistroAuditoria {
  id: string;
  em: string;
  resultado: "SUCESSO" | "NEGADO" | "FALHA";
}

/** Resultado da função que decide uma alteração de ocorrência (executada dentro da transação). */
export interface Alteracao {
  dados: Partial<NovaOcorrencia>;
  gerarProtocolo?: boolean;
  auditoria?: RegistroAuditoria | null;
}

/**
 * Contrato de persistência. Implementações:
 *  - RepositorioPostgres (produção: Render + Neon/PostgreSQL, via DATABASE_URL)
 *  - RepositorioArquivo  (desenvolvimento local: arquivo JSON em ./dados)
 *
 * Toda operação que altera dados recebe o evento de auditoria e o grava na MESMA
 * transação: se a auditoria não puder ser gravada, a alteração é desfeita.
 */
export interface Repositorio {
  readonly tipo: "postgres" | "arquivo";

  listarNormas(): Promise<Norma[]>;
  salvarNorma(norma: Norma, auditoria: RegistroAuditoria): Promise<Norma>;
  excluirNorma(id: string, auditoria: RegistroAuditoria): Promise<void>;
  /** Restaura a Base Normativa original extraída dos PDFs (descarta edições). */
  restaurarNormas(auditoria: RegistroAuditoria): Promise<void>;

  /** Todas as ocorrências (exportação). Para telas, use as consultas paginadas abaixo. */
  listarOcorrencias(): Promise<Ocorrencia[]>;
  /** Consulta filtrada e paginada (sem a linha do tempo), em ordem de data decrescente. */
  buscarOcorrencias(filtro: FiltroOcorrencias, pagina: number, porPagina: number, opcoes?: { crescente?: boolean }): Promise<Pagina<Ocorrencia>>;
  /** Contagens do painel inicial (opcionalmente só de quem registrou). */
  estatisticas(filtro: Pick<FiltroOcorrencias, "registradoPor">, hoje: string): Promise<Estatisticas>;
  /** Contagens do painel de providências. */
  resumoProvidencias(hoje: string): Promise<ResumoProvidencias>;
  /** Ocorrências com prazo possivelmente em aberto (notificação pendente, recurso, recebimento recente). */
  listarEmAcompanhamento(hoje: string): Promise<Ocorrencia[]>;
  obterOcorrencia(id: string): Promise<Ocorrencia | null>;
  /** Ocorrência criada por este usuário a partir de um envio da fila offline (idempotência). */
  obterPorIdCliente(usuarioId: string, idCliente: string): Promise<Ocorrencia | null>;
  /**
   * Cria a ocorrência. O protocolo é o informado (pode ficar em branco) ou, com
   * `gerarProtocolo`, o próximo da sequência do ano (AAAA-NNNN), gerado de forma atômica.
   * Fotos só podem ser vinculadas se estiverem pendentes e tiverem sido enviadas por `usuarioId`.
   * Protocolo repetido → ErroConflito.
   */
  criarOcorrencia(
    dados: NovaOcorrencia,
    opcoes: { gerarProtocolo?: boolean; usuarioId: string },
    auditoria: (o: Ocorrencia) => RegistroAuditoria,
  ): Promise<Ocorrencia>;
  /**
   * Altera a ocorrência dentro de uma transação, com o registro travado (sem perda de
   * atualizações simultâneas). `decidir` recebe o estado atual e devolve as mudanças.
   * Com `versaoEsperada`, lança ErroConflito se o registro mudou desde a leitura.
   * Retorna null se a ocorrência não existir.
   */
  alterarOcorrencia(
    id: string,
    decidir: (atual: Ocorrencia) => Alteracao | Promise<Alteracao>,
    opcoes: { versaoEsperada?: number; usuarioId: string },
  ): Promise<Ocorrencia | null>;
  /** Indica se o protocolo já está em uso por outra ocorrência (sem diferenciar maiúsculas/espaços). */
  protocoloEmUso(protocolo: string, excetoId?: string): Promise<boolean>;
  excluirOcorrencia(id: string, auditoria: RegistroAuditoria): Promise<boolean>;
  /** Apaga todas as ocorrências e recria os dados demonstrativos (a auditoria é preservada). */
  restaurarDemonstracao(auditoria: RegistroAuditoria): Promise<void>;

  /** Guarda uma foto ainda não vinculada; o vínculo ocorre ao salvar a ocorrência. */
  salvarAnexo(anexo: NovoAnexo): Promise<AnexoInfo>;
  obterAnexo(id: string): Promise<ArquivoAnexo | null>;
  /** Fotos enviadas pelo usuário e ainda não vinculadas a nenhuma ocorrência. */
  contarAnexosPendentes(usuarioId: string): Promise<number>;

  listarUsuarios(): Promise<Usuario[]>;
  obterUsuario(id: string): Promise<UsuarioComSenha | null>;
  obterUsuarioPorLogin(login: string): Promise<UsuarioComSenha | null>;
  /** Cria ou atualiza (upsert pelo id). O login é único, sem diferenciar maiúsculas (ErroConflito). */
  salvarUsuario(u: UsuarioComSenha, auditoria?: RegistroAuditoria): Promise<Usuario>;
  /** Cria o usuário somente se ainda não existir nenhum (primeiro acesso). */
  criarPrimeiroUsuario(u: UsuarioComSenha): Promise<boolean>;
  contarUsuarios(): Promise<number>;

  obterConfiguracoes(): Promise<Configuracoes>;
  salvarConfiguracoes(cfg: Configuracoes, auditoria: RegistroAuditoria): Promise<Configuracoes>;

  /** Grava um evento isolado (login, tentativa negada…). */
  registrarAuditoria(evento: RegistroAuditoria): Promise<void>;
  listarAuditoria(filtro: { limite: number; antesDe?: string; entidade?: EntidadeAuditada; entidadeId?: string }): Promise<EventoAuditoriaGravado[]>;

  /** Avisos de integridade detectados (ex.: protocolos repetidos que impedem a restrição de unicidade). */
  diagnosticoIntegridade(): Promise<string[]>;
}
