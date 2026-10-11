import { randomUUID } from "node:crypto";
import { Pool, type PoolClient } from "pg";
import { NORMAS_ORIGINAIS } from "@/data/normas";
import { ocorrenciasDemonstrativas } from "@/data/demonstracao";
import { CONFIGURACOES_PADRAO, type Configuracoes, type Norma, type Ocorrencia, type Usuario, type UsuarioComSenha } from "@/lib/types";
import type { NovoAnexo, NovaOcorrencia, Repositorio } from "./repositorio";

const UUID = /^[0-9a-f-]{36}$/i;

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
  protocolo   text not null default '',
  data        date not null,
  dados       jsonb not null,
  criado_em   timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create index if not exists ocorrencias_data_idx on ocorrencias (data desc);
-- O protocolo passou a ser opcional/informado pelo usuário: remove a unicidade antiga.
alter table ocorrencias drop constraint if exists ocorrencias_protocolo_key;
create index if not exists ocorrencias_protocolo_idx on ocorrencias (protocolo);

create table if not exists protocolo_sequencia (
  ano     integer primary key,
  ultimo  integer not null
);

create table if not exists anexos (
  id            uuid primary key,
  ocorrencia_id uuid references ocorrencias(id) on delete cascade,
  nome          text not null,
  tipo          text not null,
  largura       integer not null,
  altura        integer not null,
  dados         bytea not null,
  criado_em     timestamptz not null default now()
);
create index if not exists anexos_ocorrencia_idx on anexos (ocorrencia_id);

create table if not exists usuarios (
  id            uuid primary key,
  login         text not null,
  dados         jsonb not null,
  atualizado_em timestamptz not null default now()
);
create unique index if not exists usuarios_login_idx on usuarios (lower(login));

create table if not exists configuracoes (
  id    integer primary key default 1 check (id = 1),
  dados jsonb not null
);
`;

/**
 * Prepara a conexão: remove da URL os parâmetros de SSL (sslmode, channel_binding...)
 * e aplica SSL criptografado sem exigir certificado de autoridade pública.
 * Necessário para o Supabase (certificado próprio) e compatível com o Neon.
 */
export function configurarConexao(url: string): { connectionString: string; ssl?: { rejectUnauthorized: false } } {
  let u: URL;
  try {
    u = new URL(url.trim());
  } catch {
    return { connectionString: url.trim() };
  }
  const sslmode = u.searchParams.get("sslmode");
  for (const p of ["sslmode", "channel_binding", "sslrootcert", "sslcert", "sslkey", "uselibpqcompat", "sslnegotiation"]) u.searchParams.delete(p);
  const local = ["localhost", "127.0.0.1", "postgres"].includes(u.hostname);
  const usarSSL = sslmode !== "disable" && !local;
  return { connectionString: u.toString(), ssl: usarSSL ? { rejectUnauthorized: false } : undefined };
}

export class RepositorioPostgres implements Repositorio {
  readonly tipo = "postgres" as const;
  private pool: Pool;
  private pronto: Promise<void> | null = null;

  constructor(url: string) {
    this.pool = new Pool({
      ...configurarConexao(url),
      max: 5,
      // Neon/Supabase encerram conexões ociosas: libera antes e evita derrubar o servidor.
      idleTimeoutMillis: 10_000,
      connectionTimeoutMillis: 20_000,
      keepAlive: true,
    });
    this.pool.on("error", (e) => console.error("[banco] conexão ociosa encerrada pelo servidor:", e.message));
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
      // Trava por transação (funciona também no pooler em modo "transaction" do Supabase).
      await c.query("begin");
      await c.query("select pg_advisory_xact_lock(727001)");
      await c.query(SCHEMA_SQL);
      const { rows } = await c.query("select count(*)::int as n from normas");
      if (rows[0].n === 0) await this.inserirNormasOriginais(c);
      const cfg = await c.query("select 1 from configuracoes where id = 1");
      if (cfg.rowCount === 0) {
        await c.query("insert into configuracoes (id, dados) values (1, $1)", [CONFIGURACOES_PADRAO]);
        // Primeira execução: cria as ocorrências demonstrativas (pode ser desligado com SEED_DEMO=false).
        if (process.env.SEED_DEMO !== "false") await this.inserirDemonstracao(c);
      }
      await c.query("commit");
    } catch (e) {
      await c.query("rollback").catch(() => undefined);
      throw e;
    } finally {
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

  /**
   * Incremento atômico da sequência do ano (seguro com acessos simultâneos).
   * Pula números já usados manualmente.
   */
  private async gerarProtocolo(c: PoolClient | Pool, ano: number): Promise<string> {
    for (;;) {
      const { rows } = await c.query(
        `insert into protocolo_sequencia (ano, ultimo) values ($1, 1)
         on conflict (ano) do update set ultimo = protocolo_sequencia.ultimo + 1
         returning ultimo`,
        [ano],
      );
      const protocolo = `${ano}-${String(rows[0].ultimo).padStart(4, "0")}`;
      const existe = await c.query("select 1 from ocorrencias where protocolo = $1 limit 1", [protocolo]);
      if (existe.rowCount === 0) return protocolo;
    }
  }

  async protocoloEmUso(protocolo: string, excetoId?: string) {
    await this.iniciar();
    const p = protocolo.trim();
    if (!p) return false;
    const { rowCount } = await this.pool.query(
      "select 1 from ocorrencias where lower(protocolo) = lower($1) and ($2::uuid is null or id <> $2::uuid) limit 1",
      [p, excetoId && UUID.test(excetoId) ? excetoId : null],
    );
    return (rowCount ?? 0) > 0;
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

  async criarOcorrencia(dados: NovaOcorrencia, gerarProtocolo = false) {
    await this.iniciar();
    const c = await this.pool.connect();
    try {
      await c.query("begin");
      const protocolo = gerarProtocolo ? await this.gerarProtocolo(c, Number(dados.data.slice(0, 4))) : (dados.protocolo ?? "").trim();
      const agora = new Date().toISOString();
      const o: Ocorrencia = { ...dados, id: randomUUID(), protocolo, criadoEm: agora, atualizadoEm: agora };
      await c.query("insert into ocorrencias (id, protocolo, data, dados) values ($1, $2, $3, $4)", [o.id, protocolo, o.data, o]);
      await this.vincularAnexos(c, o);
      await c.query("commit");
      return o;
    } catch (e) {
      await c.query("rollback");
      throw e;
    } finally {
      c.release();
    }
  }

  async atualizarOcorrencia(id: string, dados: Partial<NovaOcorrencia>, gerarProtocolo = false) {
    const atual = await this.obterOcorrencia(id);
    if (!atual) return null;
    const o: Ocorrencia = {
      ...atual,
      ...dados,
      id: atual.id,
      protocolo: (dados.protocolo ?? atual.protocolo ?? "").trim(),
      criadoEm: atual.criadoEm,
      atualizadoEm: new Date().toISOString(),
    };
    const c = await this.pool.connect();
    try {
      await c.query("begin");
      if (gerarProtocolo) o.protocolo = await this.gerarProtocolo(c, Number(o.data.slice(0, 4)));
      await c.query("update ocorrencias set data = $2, protocolo = $3, dados = $4, atualizado_em = now() where id = $1", [id, o.data, o.protocolo, o]);
      await this.vincularAnexos(c, o);
      await c.query("commit");
    } catch (e) {
      await c.query("rollback");
      throw e;
    } finally {
      c.release();
    }
    return o;
  }

  /** Vincula as fotos à ocorrência e remove as que deixaram de fazer parte dela. */
  private async vincularAnexos(c: PoolClient, o: Ocorrencia) {
    const ids = (o.anexos ?? []).map((a) => a.id).filter((x) => UUID.test(x));
    await c.query("delete from anexos where ocorrencia_id = $1 and not (id = any($2::uuid[]))", [o.id, ids]);
    if (ids.length) await c.query("update anexos set ocorrencia_id = $1 where id = any($2::uuid[]) and (ocorrencia_id is null or ocorrencia_id = $1)", [o.id, ids]);
  }

  async salvarAnexo(a: NovoAnexo) {
    await this.iniciar();
    // Limpa fotos enviadas e nunca vinculadas (formulário abandonado) há mais de 1 dia.
    await this.pool.query("delete from anexos where ocorrencia_id is null and criado_em < now() - interval '1 day'");
    const id = randomUUID();
    await this.pool.query("insert into anexos (id, nome, tipo, largura, altura, dados) values ($1, $2, $3, $4, $5, $6)", [
      id, a.nome, a.tipo, a.largura, a.altura, a.dados,
    ]);
    return { id, nome: a.nome, largura: a.largura, altura: a.altura };
  }

  async obterAnexo(id: string) {
    await this.iniciar();
    if (!UUID.test(id)) return null;
    const { rows } = await this.pool.query("select tipo, dados from anexos where id = $1", [id]);
    return rows[0] ? { tipo: rows[0].tipo as string, dados: rows[0].dados as Buffer } : null;
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

  async listarUsuarios() {
    await this.iniciar();
    const { rows } = await this.pool.query("select dados from usuarios order by dados->>'nome'");
    return rows.map((r) => semSenha(r.dados as UsuarioComSenha));
  }

  async obterUsuario(id: string) {
    await this.iniciar();
    if (!UUID.test(id)) return null;
    const { rows } = await this.pool.query("select dados from usuarios where id = $1", [id]);
    return (rows[0]?.dados as UsuarioComSenha) ?? null;
  }

  async obterUsuarioPorLogin(login: string) {
    await this.iniciar();
    const { rows } = await this.pool.query("select dados from usuarios where lower(login) = lower($1)", [login.trim()]);
    return (rows[0]?.dados as UsuarioComSenha) ?? null;
  }

  async salvarUsuario(u: UsuarioComSenha) {
    await this.iniciar();
    await this.pool.query(
      `insert into usuarios (id, login, dados) values ($1, $2, $3)
       on conflict (id) do update set login = excluded.login, dados = excluded.dados, atualizado_em = now()`,
      [u.id, u.login, u],
    );
    return semSenha(u);
  }

  async contarUsuarios() {
    await this.iniciar();
    const { rows } = await this.pool.query("select count(*)::int as n from usuarios");
    return rows[0].n as number;
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

function semSenha(u: UsuarioComSenha): Usuario {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { senhaHash, ...resto } = u;
  return resto;
}
