import type { Configuracoes, Norma, Ocorrencia } from "@/lib/types";

/** Dados de uma nova ocorrência. Protocolo, id e datas de controle são gerados pelo repositório. */
export type NovaOcorrencia = Omit<Ocorrencia, "id" | "protocolo" | "criadoEm" | "atualizadoEm">;

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
  /** Cria a ocorrência gerando o protocolo de forma atômica (AAAA-NNNN). */
  criarOcorrencia(dados: NovaOcorrencia): Promise<Ocorrencia>;
  atualizarOcorrencia(id: string, dados: Partial<NovaOcorrencia>): Promise<Ocorrencia | null>;
  excluirOcorrencia(id: string): Promise<void>;
  /** Apaga todas as ocorrências e recria os dados demonstrativos. */
  restaurarDemonstracao(): Promise<void>;

  obterConfiguracoes(): Promise<Configuracoes>;
  salvarConfiguracoes(cfg: Configuracoes): Promise<Configuracoes>;
}
