import { randomUUID } from "node:crypto";
import { Pool, type PoolClient } from "pg";
import { NORMAS_ORIGINAIS } from "@/data/normas";
import { ocorrenciasDemonstrativas } from "@/data/demonstracao";
import { CONFIGURACOES_PADRAO, type Configuracoes, type Norma, type Ocorrencia } from "@/lib/types";
import type { NovaOcorrencia, Repositorio } from "./repositorio";

/**
 * Esquema mínimo. Os registros completos ficam em JSONB (`dados`), e as
 * colunas extras servem para unicidade, ordenação e consultas futuras.
 * Executado automaticamente na primeira conexão (idempotente).
 */
export const SCHEMA_SQL = `
create table if not exists normas (
  id          text primary key,
  documento   text not null check (documento in ('ESTATUTO', 'REGULAMENTO')),
  dados       jsonb not null,
  atualizado_em timestamptz not null default now()
);

create table if not exists ocorrencias (
  id          uuid primary key,
  protocolo   text not null unique,
  data        date not null,
  dados       jsonb not null,
  criado_em   timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create index if not exists ocorrencias_data_idx on ocorrencias (data desc);

create table if not exists protocolo_sequencia (
  ano     integer primary key,
  ultimo  integer not null
);

create table if not exists configuracoes (
  id    integer primary key default 1 check (id = 1),
  dados jsonb not null
);
`;

function precisaSSL(url: string): boolean {
  if (/sslmode=disable/.test(url)) return false;
  return !/@(localhost|127\.0\.0\.1|postgres)(:|\/)/.test(url);
}

export class RepositorioPostgres implements Repositorio {
  readonly tipo = "postgres" as const;
  private pool: Pool;
  private pronto: Promise<void> | null = null;

  constructor(url: string) {
    this.pool = new Pool({
      connectionString: url,
      ssl: precisaSSL(url) ? { rejectUnauthorized: false } : undefined,
      max: 5,
    });
  }

  private iniciar(): Promise<void> {
    if (!this.pronto) {
      this.pronto = this.migrar().catch((e) => {
        this.pronto = null;
        throw e;
      });
    }
    return this.pronto;
  }

  private async migrar() {
    const c = await this.pool.connect();
    try {
      await c.query("select pg_advisory_lock(727001)");
      await c.query(SCHEMA_SQL);
      const { rows } = await c.query("select count(*)::int as n from normas");
      if (rows[0].n === 0) await this.inserirNormasOriginais(c);
      const cfg = await c.query("select 1 from configuracoes where id = 1");
      if (cfg.rowCount === 0) {
        await c.query("insert into configuracoes (id, dados) values (1, $1)", [CONFIGURACOES_PADRAO]);
        // Primeira execução: cria as ocorrências demonstrativas (pode ser desligado com SEED_DEMO=false).
        if (process.env.SEED_DEMO !== "false") await this.inserirDemonstracao(c);
      }
    } finally {
      await c.query("select pg_advisory_unlock(727001)").catch(() => undefined);
      c.release();
    }
  }

  private async inserirNormasOriginais(c: PoolClient) {
    for (const n of NORMAS_ORIGINAIS) {
      await c.query("insert into normas (id, documento, dados) values ($1, $2, $3) on conflict (id) do nothing", [n.id, n.documento, n]);
    }
  }

  private async inserirDemonstracao(c: PoolClient) {
    const { rows } = await c.query("select dados from normas");
    const normas = rows.map((r) => r.dados as Norma);
    for (const o of ocorrenciasDemonstrativas(normas)) {
      const protocolo = await this.gerarProtocolo(c, Number(o.data.slice(0, 4)));
      const ocorrencia: Ocorrencia = { ...o, id: randomUUID(), protocolo };
      await c.query("insert into ocorrencias (id, protocolo, data, dados, criado_em, atualizado_em) values ($1, $2, $3, $4, $5, $5)", [
        ocorrencia.id, protocolo, ocorrencia.data, ocorrencia, ocorrencia.criadoEm,
      ]);
    }
  }

  /** Incremento atômico da sequência do ano (seguro com acessos simultâneos). */
  private async gerarProtocolo(c: PoolClient | Pool, ano: number): Promise<string> {
    const { rows } = await c.query(
      `insert into protocolo_sequencia (ano, ultimo) values ($1, 1)
       on conflict (ano) do update set ultimo = protocolo_sequencia.ultimo + 1
       returning ultimo`,
      [ano],
    );
    return `${ano}-${String(rows[0].ultimo).padStart(4, "0")}`;
  }

  async listarNormas() {
    await this.iniciar();
    const { rows } = await this.pool.query("select dados from normas");
    return rows.map((r) => r.dados as Norma);
  }

  async salvarNorma(norma: Norma) {
    await this.iniciar();
    const n = { ...norma, atualizadoEm: new Date().toISOString() };
    await this.pool.query(
      `insert into normas (id, documento, dados, atualizado_em) values ($1, $2, $3, now())
       on conflict (id) do update set documento = excluded.documento, dados = excluded.dados, atualizado_em = now()`,
      [n.id, n.documento, n],
    );
    return n;
  }

  async excluirNorma(id: string) {
    await this.iniciar();
    await this.pool.query("delete from normas where id = $1", [id]);
  }

  async restaurarNormas() {
    await this.iniciar();
    const c = await this.pool.connect();
    try {
      await c.query("begin");
      await c.query("delete from normas");
      await this.inserirNormasOriginais(c);
      await c.query("commit");
    } catch (e) {
      await c.query("rollback");
      throw e;
    } finally {
      c.release();
    }
  }

  async listarOcorrencias() {
    await this.iniciar();
    const { rows } = await this.pool.query("select dados from ocorrencias order by data desc, criado_em desc");
    return rows.map((r) => r.dados as Ocorrencia);
  }

  async obterOcorrencia(id: string) {
    await this.iniciar();
    if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
    const { rows } = await this.pool.query("select dados from ocorrencias where id = $1", [id]);
    return (rows[0]?.dados as Ocorrencia) ?? null;
  }

  async criarOcorrencia(dados: NovaOcorrencia) {
    await this.iniciar();
    const c = await this.pool.connect();
    try {
      await c.query("begin");
      const protocolo = await this.gerarProtocolo(c, Number(dados.data.slice(0, 4)));
      const agora = new Date().toISOString();
      const o: Ocorrencia = { ...dados, id: randomUUID(), protocolo, criadoEm: agora, atualizadoEm: agora };
      await c.query("insert into ocorrencias (id, protocolo, data, dados) values ($1, $2, $3, $4)", [o.id, protocolo, o.data, o]);
      await c.query("commit");
      return o;
    } catch (e) {
      await c.query("rollback");
      throw e;
    } finally {
      c.release();
    }
  }

  async atualizarOcorrencia(id: string, dados: Partial<NovaOcorrencia>) {
    const atual = await this.obterOcorrencia(id);
    if (!atual) return null;
    const o: Ocorrencia = { ...atual, ...dados, id: atual.id, protocolo: atual.protocolo, criadoEm: atual.criadoEm, atualizadoEm: new Date().toISOString() };
    await this.pool.query("update ocorrencias set data = $2, dados = $3, atualizado_em = now() where id = $1", [id, o.data, o]);
    return o;
  }

  async excluirOcorrencia(id: string) {
    await this.iniciar();
    if (!/^[0-9a-f-]{36}$/i.test(id)) return;
    await this.pool.query("delete from ocorrencias where id = $1", [id]);
  }

  async restaurarDemonstracao() {
    await this.iniciar();
    const c = await this.pool.connect();
    try {
      await c.query("begin");
      await c.query("delete from ocorrencias");
      await c.query("delete from protocolo_sequencia");
      await this.inserirDemonstracao(c);
      await c.query("commit");
    } catch (e) {
      await c.query("rollback");
      throw e;
    } finally {
      c.release();
    }
  }

  async obterConfiguracoes() {
    await this.iniciar();
    const { rows } = await this.pool.query("select dados from configuracoes where id = 1");
    return { ...CONFIGURACOES_PADRAO, ...(rows[0]?.dados ?? {}) } as Configuracoes;
  }

  async salvarConfiguracoes(cfg: Configuracoes) {
    await this.iniciar();
    const dados = { ...CONFIGURACOES_PADRAO, ...cfg };
    await this.pool.query(
      "insert into configuracoes (id, dados) values (1, $1) on conflict (id) do update set dados = excluded.dados",
      [dados],
    );
    return dados;
  }
}
