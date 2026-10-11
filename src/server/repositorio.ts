import type { AnexoInfo, Configuracoes, Norma, Ocorrencia } from "@/lib/types";

export interface NovoAnexo {
  nome: string;
  tipo: string;
  largura: number;
  altura: number;
  dados: Buffer;
}

export interface ArquivoAnexo {
  tipo: string;
  dados: Buffer;
}

/** Dados de uma nova ocorrência. Protocolo, id e datas de controle são gerados pelo repositório. */
export type NovaOcorrencia = Omit<Ocorrencia, "id" | "criadoEm" | "atualizadoEm">;

/**
 * Contrato de persistência. Implementações:
 *  - RepositorioPostgres (produção: Render + Neon/PostgreSQL, via DATABASE_URL)
 *  - RepositorioArquivo  (desenvolvimento local: arquivo JSON em ./dados)
 */
export interface Repositorio {
  readonly tipo: "postgres" | "arquivo";

  listarNormas(): Promise<Norma[]>;
  salvarNorma(norma: Norma): Promise<Norma>;
  excluirNorma(id: string): Promise<void>;
  /** Restaura a Base Normativa original extraída dos PDFs (descarta edições). */
  restaurarNormas(): Promise<void>;

  listarOcorrencias(): Promise<Ocorrencia[]>;
  obterOcorrencia(id: string): Promise<Ocorrencia | null>;
  /**
   * Cria a ocorrência. O protocolo é o informado pelo usuário (pode ficar em branco)
   * ou, com `gerarProtocolo`, o próximo da sequência do ano (AAAA-NNNN), gerado de forma atômica.
   */
  criarOcorrencia(dados: NovaOcorrencia, gerarProtocolo?: boolean): Promise<Ocorrencia>;
  atualizarOcorrencia(id: string, dados: Partial<NovaOcorrencia>, gerarProtocolo?: boolean): Promise<Ocorrencia | null>;
  /** Indica se o protocolo já está em uso por outra ocorrência. */
  protocoloEmUso(protocolo: string, excetoId?: string): Promise<boolean>;
  excluirOcorrencia(id: string): Promise<void>;
  /** Apaga todas as ocorrências e recria os dados demonstrativos. */
  restaurarDemonstracao(): Promise<void>;

  /** Guarda uma foto ainda não vinculada; o vínculo ocorre ao salvar a ocorrência. */
  salvarAnexo(anexo: NovoAnexo): Promise<AnexoInfo>;
  obterAnexo(id: string): Promise<ArquivoAnexo | null>;

  obterConfiguracoes(): Promise<Configuracoes>;
  salvarConfiguracoes(cfg: Configuracoes): Promise<Configuracoes>;
}
