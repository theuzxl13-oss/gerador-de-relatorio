import { randomUUID } from "node:crypto";
import { Pool, type PoolClient } from "pg";
import { NORMAS_ORIGINAIS } from "@/data/normas";
import { ocorrenciasDemonstrativas } from "@/data/demonstracao";
import { normalizarPerfil } from "@/lib/permissoes";
import { CONFIGURACOES_PADRAO, type AnexoInfo, type Configuracoes, type Norma, type Ocorrencia, type Usuario, type UsuarioComSenha } from "@/lib/types";
import { simplificar, type Estatisticas, type FiltroOcorrencias, type Pagina, type ResumoProvidencias } from "@/lib/consulta";
import { configurarConexao } from "./config";
import { ErroConflito, ErroValidacao } from "./validacao";
import type { Alteracao, EventoAuditoriaGravado, NovoAnexo, NovaOcorrencia, RegistroAuditoria, Repositorio } from "./repositorio";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Migrações versionadas. Cada uma roda uma única vez, em ordem, dentro de uma
 * transação com trava (pg_advisory_xact_lock), e fica registrada em schema_migracoes.
 * Todas são aditivas (não apagam dados). O desfazer de cada uma está em docs/MIGRACOES.md.
 */
export const MIGRACOES: { versao: number; descricao: string; sql: string }[] = [
  {
    versao: 1,
    descricao: "Esquema base (normas, ocorrências, anexos, usuários, configurações)",
    sql: `
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
);`,
  },
  {
    versao: 2,
    descricao: "Versão das ocorrências (concorrência), dono das fotos e trilha de auditoria somente-inserção",
    sql: `
alter table ocorrencias add column if not exists versao integer not null default 1;
alter table anexos add column if not exists enviado_por text;
create index if not exists anexos_pendentes_idx on anexos (enviado_por) where ocorrencia_id is null;
create table if not exists auditoria (
  id           bigserial primary key,
  em           timestamptz not null default now(),
  usuario_id   text,
  usuario_nome text,
  acao         text not null,
  entidade     text not null,
  entidade_id  text,
  resultado    text not null default 'SUCESSO' check (resultado in ('SUCESSO', 'NEGADO', 'FALHA')),
  detalhe      jsonb not null default '{}'::jsonb
);
create index if not exists auditoria_em_idx on auditoria (em desc);
create index if not exists auditoria_entidade_idx on auditoria (entidade, entidade_id);
create or replace function auditoria_somente_insercao() returns trigger language plpgsql as $$
begin
  raise exception 'A trilha de auditoria não pode ser alterada nem apagada.';
end
$$;
drop trigger if exists auditoria_imutavel on auditoria;
create trigger auditoria_imutavel before update or delete on auditoria
  for each row execute function auditoria_somente_insercao();
drop trigger if exists auditoria_sem_truncate on auditoria;
create trigger auditoria_sem_truncate before truncate on auditoria
  for each statement execute function auditoria_somente_insercao();`,
  },
  {
    versao: 3,
    descricao: "Índices para consultas paginadas e para envios da fila offline sem duplicar",
    sql: `
create index if not exists ocorrencias_autor_idx on ocorrencias ((dados->'registradoPor'->>'id'));
create index if not exists ocorrencias_status_idx on ocorrencias ((dados->>'status'));
create index if not exists ocorrencias_ordem_idx on ocorrencias (data desc, (dados->>'criadoEm') collate "C" desc, id desc);
create unique index if not exists ocorrencias_id_cliente_unico on ocorrencias ((dados->'registradoPor'->>'id'), (dados->>'idCliente'))
  where dados->>'idCliente' is not null;`,
  },
];

/** Mesma ordem de `ordenar` (src/lib/consulta.ts): data, instante do registro e id. */
const ORDEM = `data desc, (dados->>'criadoEm') collate "C" desc, id desc`;
const ORDEM_CRESCENTE = `data, (dados->>'criadoEm') collate "C", id`;

/** Equivalente SQL de `simplificar` (minúsculas, sem acentos). */
const SEM_ACENTO = (expr: string) => `translate(lower(coalesce(${expr}, '')), 'áàâãäåéèêëíìîïóòôõöúùûüçñý', 'aaaaaaeeeeiiiiooooouuuucny')`;
const TEXTO_BUSCA = `concat_ws(' ', dados->>'protocolo', dados->>'nome', dados->>'ocorrencia', dados->>'descricao',
  'q' || (dados->>'quadra') || ' l' || (dados->>'lote'), dados->'fundamentacaoPrincipal'->>'citacaoCurta',
  dados->'fundamentacaoComplementar'->>'citacaoCurta', dados->'registradoPor'->>'nome')`;
const escaparLike = (t: string) => t.replace(/[\\%_]/g, (c) => `\\${c}`);

/** Monta o WHERE parametrizado equivalente a `correspondeFiltro` (src/lib/consulta.ts). */
export function sqlDoFiltro(f: FiltroOcorrencias): { where: string; params: unknown[] } {
  const cond: string[] = [];
  const params: unknown[] = [];
  const p = (v: unknown) => {
    params.push(v);
    return `$${params.length}`;
  };
  const contem = (expr: string, termo?: string) => {
    if (termo?.trim()) cond.push(`${SEM_ACENTO(expr)} like ${p(`%${escaparLike(simplificar(termo.trim()))}%`)}`);
  };
  if (f.registradoPor) cond.push(`dados->'registradoPor'->>'id' = ${p(f.registradoPor)}`);
  if (f.pendentes) cond.push(`dados->'providencia' is null and dados->>'status' in ('REGISTRADA', 'AGUARDANDO_ANALISE')`);
  contem(TEXTO_BUSCA, f.busca);
  contem(`dados->>'nome'`, f.nome);
  contem(`dados->>'ocorrencia'`, f.ocorrencia);
  if (f.quadra) cond.push(`lower(ltrim(btrim(dados->>'quadra'), '0')) = ${p(f.quadra.trim().replace(/^0+/, "").toLowerCase())}`);
  if (f.lote) cond.push(`lower(ltrim(btrim(dados->>'lote'), '0')) = ${p(f.lote.trim().replace(/^0+/, "").toLowerCase())}`);
  if (f.de) cond.push(`data >= ${p(f.de)}::date`);
  if (f.ate) cond.push(`data <= ${p(f.ate)}::date`);
  if (f.status) cond.push(`dados->>'status' = ${p(f.status)}`);
  if (f.documento === "SEM") cond.push(`dados->'fundamentacaoPrincipal' is null`);
  else if (f.documento) {
    const d = p(f.documento);
    cond.push(`(dados->'fundamentacaoPrincipal'->>'documento' = ${d} or dados->'fundamentacaoComplementar'->>'documento' = ${d})`);
  }
  if (f.dispositivo?.trim()) {
    const t = p(`%${escaparLike(simplificar(f.dispositivo.trim()))}%`);
    const cit = (k: string) => SEM_ACENTO(`(dados->'${k}'->>'citacao') || ' ' || (dados->'${k}'->>'citacaoCurta')`);
    cond.push(`(${cit("fundamentacaoPrincipal")} like ${t} or (dados->'fundamentacaoComplementar' is not null and ${cit("fundamentacaoComplementar")} like ${t}))`);
  }
  return { where: cond.length ? `where ${cond.join(" and ")}` : "", params };
}

/** Índice que garante protocolo único (ignorando maiúsculas/espaços; protocolo em branco é permitido). */
const INDICE_PROTOCOLO_UNICO = "ocorrencias_protocolo_unico";
const SQL_DUPLICADOS = `select lower(btrim(protocolo)) as protocolo, count(*)::int as n
  from ocorrencias where btrim(protocolo) <> '' group by 1 having count(*) > 1 order by 1 limit 50`;

export class RepositorioPostgres implements Repositorio {
  readonly tipo = "postgres" as const;
  private pool: Pool;
  private pronto: Promise<void> | null = null;
  private avisos: string[] = [];

  constructor(url: string) {
    // Lança ErroConfiguracao (sem revelar a URL) se a configuração de TLS for insegura ou inválida.
    const { modoSSL, aviso, ...conexao } = configurarConexao(url);
    if (aviso) console.warn("[banco]", aviso);
    console.info(`[banco] TLS: ${modoSSL}`);
    this.pool = new Pool({
      ...conexao,
      max: 5,
      // Neon/Supabase encerram conexões ociosas: libera antes e evita derrubar o servidor.
      idleTimeoutMillis: 10_000,
      connectionTimeoutMillis: 20_000,
      keepAlive: true,
    });
    this.pool.on("error", (e) => console.error("[banco] conexão ociosa encerrada pelo servidor:", e.message));
  }

  /** Fecha as conexões (encerramento do servidor e testes). */
  async encerrar() {
    await this.pool.end();
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

  /** Executa `fn` em transação; desfaz em qualquer erro e sempre libera a conexão. */
  private async transacao<T>(fn: (c: PoolClient) => Promise<T>): Promise<T> {
    const c = await this.pool.connect();
    try {
      await c.query("begin");
      const r = await fn(c);
      await c.query("commit");
      return r;
    } catch (e) {
      await c.query("rollback").catch(() => undefined);
      throw traduzirErro(e);
    } finally {
      c.release();
    }
  }

  private async migrar() {
    await this.transacao(async (c) => {
      // Trava por transação (funciona também no pooler em modo "transaction" do Supabase).
      await c.query("select pg_advisory_xact_lock(727001)");
      await c.query(`create table if not exists schema_migracoes (
        versao integer primary key, descricao text not null, aplicada_em timestamptz not null default now())`);
      const { rows } = await c.query("select versao from schema_migracoes");
      const aplicadas = new Set(rows.map((r) => r.versao as number));
      for (const m of MIGRACOES) {
        if (aplicadas.has(m.versao)) continue;
        await c.query(m.sql);
        await c.query("insert into schema_migracoes (versao, descricao) values ($1, $2)", [m.versao, m.descricao]);
        console.info(`[banco] migração ${m.versao} aplicada: ${m.descricao}`);
      }

      // Protocolo único: só cria a restrição se não houver repetidos. Nunca altera dados existentes.
      const idx = await c.query("select 1 from pg_indexes where indexname = $1", [INDICE_PROTOCOLO_UNICO]);
      if (idx.rowCount === 0) {
        const dup = await c.query(SQL_DUPLICADOS);
        if (dup.rowCount === 0) {
          await c.query(`create unique index ${INDICE_PROTOCOLO_UNICO} on ocorrencias (lower(btrim(protocolo))) where btrim(protocolo) <> ''`);
          console.info("[banco] restrição de protocolo único criada.");
        } else {
          const lista = dup.rows.map((r) => `${r.protocolo} (${r.n}x)`).join(", ");
          this.avisos.push(
            `Há protocolos repetidos (${lista}). A restrição de unicidade no banco não foi criada: corrija os protocolos (Editar) e reinicie o serviço. O sistema continua recusando novos repetidos.`,
          );
          console.warn("[banco] protocolos repetidos impedem a restrição de unicidade:", lista);
        }
      }

      const { rows: n } = await c.query("select count(*)::int as n from normas");
      if (n[0].n === 0) await this.inserirNormasOriginais(c);
      const cfg = await c.query("select 1 from configuracoes where id = 1");
      if (cfg.rowCount === 0) {
        await c.query("insert into configuracoes (id, dados) values (1, $1)", [CONFIGURACOES_PADRAO]);
        // Primeira execução: ocorrências demonstrativas somente com SEED_DEMO=true (banco de produção começa vazio).
        if (process.env.SEED_DEMO === "true") await this.inserirDemonstracao(c);
      }
    });
  }

  async diagnosticoIntegridade() {
    await this.iniciar();
    return [...this.avisos];
  }

  private async auditar(c: PoolClient | Pool, a: RegistroAuditoria) {
    await c.query(
      `insert into auditoria (usuario_id, usuario_nome, acao, entidade, entidade_id, resultado, detalhe)
       values ($1, $2, $3, $4, $5, $6, $7)`,
      [a.usuario?.id ?? null, a.usuario?.nome ?? null, a.acao, a.entidade, a.entidadeId ?? null, a.resultado ?? "SUCESSO", a.detalhe ?? {}],
    );
  }

  async registrarAuditoria(a: RegistroAuditoria) {
    await this.iniciar();
    await this.auditar(this.pool, a);
  }

  async listarAuditoria(f: { limite: number; antesDe?: string; entidade?: string; entidadeId?: string }) {
    await this.iniciar();
    const { rows } = await this.pool.query(
      `select id::text, em, usuario_id, usuario_nome, acao, entidade, entidade_id, resultado, detalhe from auditoria
       where ($1::bigint is null or id < $1::bigint) and ($2::text is null or entidade = $2) and ($3::text is null or entidade_id = $3)
       order by auditoria.id desc limit $4`,
      [f.antesDe && /^\d+$/.test(f.antesDe) ? f.antesDe : null, f.entidade ?? null, f.entidadeId ?? null, Math.min(Math.max(f.limite, 1), 200)],
    );
    return rows.map(
      (r): EventoAuditoriaGravado => ({
        id: r.id,
        em: new Date(r.em).toISOString(),
        usuario: r.usuario_id ? { id: r.usuario_id, nome: r.usuario_nome ?? "" } : null,
        acao: r.acao,
        entidade: r.entidade,
        entidadeId: r.entidade_id ?? undefined,
        resultado: r.resultado,
        detalhe: r.detalhe,
      }),
    );
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
      const ocorrencia: Ocorrencia = { ...o, id: randomUUID(), protocolo, versao: 1 };
      await c.query("insert into ocorrencias (id, protocolo, data, dados, criado_em, atualizado_em) values ($1, $2, $3, $4, $5, $5)", [
        ocorrencia.id, protocolo, ocorrencia.data, ocorrencia, ocorrencia.criadoEm,
      ]);
    }
  }

  /**
   * Incremento atômico da sequência do ano (seguro com acessos simultâneos).
   * Pula números já usados manualmente.
   */
  private async gerarProtocolo(c: PoolClient, ano: number): Promise<string> {
    for (;;) {
      const { rows } = await c.query(
        `insert into protocolo_sequencia (ano, ultimo) values ($1, 1)
         on conflict (ano) do update set ultimo = protocolo_sequencia.ultimo + 1
         returning ultimo`,
        [ano],
      );
      const protocolo = `${ano}-${String(rows[0].ultimo).padStart(4, "0")}`;
      const existe = await c.query("select 1 from ocorrencias where lower(btrim(protocolo)) = lower($1) limit 1", [protocolo]);
      if (existe.rowCount === 0) return protocolo;
    }
  }

  async protocoloEmUso(protocolo: string, excetoId?: string) {
    await this.iniciar();
    const p = protocolo.trim();
    if (!p) return false;
    const { rowCount } = await this.pool.query(
      "select 1 from ocorrencias where lower(btrim(protocolo)) = lower($1) and ($2::uuid is null or id <> $2::uuid) limit 1",
      [p, excetoId && UUID.test(excetoId) ? excetoId : null],
    );
    return (rowCount ?? 0) > 0;
  }

  async listarNormas() {
    await this.iniciar();
    const { rows } = await this.pool.query("select dados from normas");
    return rows.map((r) => r.dados as Norma);
  }

  async salvarNorma(norma: Norma, auditoria: RegistroAuditoria) {
    await this.iniciar();
    const n = { ...norma, atualizadoEm: new Date().toISOString() };
    await this.transacao(async (c) => {
      await c.query(
        `insert into normas (id, documento, dados, atualizado_em) values ($1, $2, $3, now())
         on conflict (id) do update set documento = excluded.documento, dados = excluded.dados, atualizado_em = now()`,
        [n.id, n.documento, n],
      );
      await this.auditar(c, auditoria);
    });
    return n;
  }

  async excluirNorma(id: string, auditoria: RegistroAuditoria) {
    await this.iniciar();
    await this.transacao(async (c) => {
      await c.query("delete from normas where id = $1", [id]);
      await this.auditar(c, auditoria);
    });
  }

  async restaurarNormas(auditoria: RegistroAuditoria) {
    await this.iniciar();
    await this.transacao(async (c) => {
      await c.query("delete from normas");
      await this.inserirNormasOriginais(c);
      await this.auditar(c, auditoria);
    });
  }

  private static ler(r: { dados: Ocorrencia; versao?: number }): Ocorrencia {
    return { ...r.dados, versao: r.versao ?? r.dados.versao ?? 1 };
  }

  async listarOcorrencias() {
    await this.iniciar();
    const { rows } = await this.pool.query(`select dados, versao from ocorrencias order by ${ORDEM}`);
    return rows.map(RepositorioPostgres.ler);
  }

  async buscarOcorrencias(filtro: FiltroOcorrencias, pagina: number, porPagina: number, opcoes: { crescente?: boolean } = {}): Promise<Pagina<Ocorrencia>> {
    await this.iniciar();
    const { where, params } = sqlDoFiltro(filtro);
    const n = params.length;
    const { rows } = await this.pool.query(
      `select dados - 'historico' as dados, versao, count(*) over ()::int as total from ocorrencias ${where}
       order by ${opcoes.crescente ? ORDEM_CRESCENTE : ORDEM} limit $${n + 1} offset $${n + 2}`,
      [...params, porPagina, (pagina - 1) * porPagina],
    );
    let total = rows[0]?.total ?? 0;
    if (!rows.length && pagina > 1) {
      const c = await this.pool.query(`select count(*)::int as n from ocorrencias ${where}`, params);
      total = c.rows[0].n;
    }
    return { itens: rows.map(RepositorioPostgres.ler), total, pagina, porPagina };
  }

  async estatisticas(filtro: Pick<FiltroOcorrencias, "registradoPor">, hoje: string): Promise<Estatisticas> {
    await this.iniciar();
    const { where, params } = sqlDoFiltro({ registradoPor: filtro.registradoPor });
    const n = params.length;
    const { rows } = await this.pool.query(
      `select count(*) filter (where data = $${n + 1}::date)::int as hoje,
              count(*) filter (where to_char(data, 'YYYY-MM') = $${n + 2})::int as mes,
              count(*)::int as total
         from ocorrencias ${where}`,
      [...params, hoje, hoje.slice(0, 7)],
    );
    const freq = await this.pool.query(
      `select rotulo, n from (
         select (array_agg(dados->>'ocorrencia' order by ${ORDEM}))[1] as rotulo, count(*)::int as n from ocorrencias ${where}
         group by btrim(${SEM_ACENTO("dados->>'ocorrencia'")})
       ) g order by n desc, rotulo collate "C" limit 6`,
      params,
    );
    return { ...rows[0], frequentes: freq.rows };
  }

  async resumoProvidencias(hoje: string): Promise<ResumoProvidencias> {
    await this.iniciar();
    const mes = hoje.slice(0, 7);
    const { rows: g } = await this.pool.query(
      `select
         count(*) filter (where dados->'providencia' is null and dados->>'status' in ('REGISTRADA', 'AGUARDANDO_ANALISE'))::int as pendentes,
         count(*) filter (where p->>'tipo' = 'ARQUIVADO')::int as arq_total,
         count(*) filter (where p->>'tipo' = 'ARQUIVADO' and left(p->>'decididoEm', 7) = $1)::int as arq_mes,
         count(*) filter (where p->>'tipo' = 'NOTIFICADO')::int as not_total,
         count(*) filter (where p->>'tipo' = 'NOTIFICADO' and left(p->>'decididoEm', 7) = $1)::int as not_mes,
         count(*) filter (where p->>'tipo' = 'MULTADO')::int as mul_total,
         count(*) filter (where p->>'tipo' = 'MULTADO' and left(p->>'decididoEm', 7) = $1)::int as mul_mes,
         coalesce(sum((p->>'multaValor')::numeric) filter (where p->>'tipo' = 'MULTADO'), 0)::float8 as mul_valor,
         coalesce(sum((p->>'multaValor')::numeric) filter (where p->>'tipo' = 'MULTADO' and left(p->>'decididoEm', 7) = $1), 0)::float8 as mul_valor_mes,
         count(*) filter (where p->>'tipo' = 'NOTIFICADO' and coalesce(p->>'esclarecimentoResultado', 'PENDENTE') = 'PENDENTE')::int as esc_pend,
         count(*) filter (where p->>'tipo' = 'NOTIFICADO' and p->>'esclarecimentoResultado' = 'ESCLARECEU')::int as esc_sim,
         count(*) filter (where p->>'tipo' = 'NOTIFICADO' and p->>'esclarecimentoResultado' = 'NAO_ESCLARECEU')::int as esc_nao,
         count(*) filter (where p->>'recursoSituacao' = 'APRESENTADO')::int as recursos
       from (select dados, dados->'providencia' as p from ocorrencias) t`,
      [mes],
    );
    const r = g[0];
    const { rows: autores } = await this.pool.query(
      `select coalesce(min(dados->'registradoPor'->>'nome'), '') as nome, count(*)::int as total,
              count(*) filter (where to_char(data, 'YYYY-MM') = $1)::int as mes,
              count(*) filter (where dados->'providencia' is null and dados->>'status' in ('REGISTRADA', 'AGUARDANDO_ANALISE'))::int as pendentes
         from ocorrencias group by dados->'registradoPor'->>'id' order by mes desc, total desc, nome`,
      [mes],
    );
    const dinheiro = (v: number) => Math.round(v * 100) / 100;
    return {
      pendentes: r.pendentes,
      porTipo: [
        { tipo: "ARQUIVADO", total: r.arq_total, mes: r.arq_mes },
        { tipo: "NOTIFICADO", total: r.not_total, mes: r.not_mes },
        { tipo: "MULTADO", total: r.mul_total, mes: r.mul_mes },
      ],
      notificacoes: { PENDENTE: r.esc_pend, ESCLARECEU: r.esc_sim, NAO_ESCLARECEU: r.esc_nao },
      multas: { total: r.mul_total, valorTotal: dinheiro(r.mul_valor), mes: r.mul_mes, valorMes: dinheiro(r.mul_valor_mes) },
      recursosEmAnalise: r.recursos,
      autores,
    };
  }

  async listarEmAcompanhamento(hoje: string) {
    await this.iniciar();
    const { rows } = await this.pool.query(
      `select dados, versao from ocorrencias
        where dados->'providencia' is not null and dados->'providencia'->>'tipo' <> 'ARQUIVADO'
          and ((dados->'providencia'->>'tipo' = 'NOTIFICADO' and coalesce(dados->'providencia'->>'esclarecimentoResultado', 'PENDENTE') = 'PENDENTE')
               or dados->'providencia'->>'recursoSituacao' = 'APRESENTADO'
               or dados->'providencia'->>'dataRecebimento' >= to_char($1::date - 31, 'YYYY-MM-DD'))
        order by data desc`,
      [hoje],
    );
    return rows.map(RepositorioPostgres.ler);
  }

  async obterPorIdCliente(usuarioId: string, idCliente: string) {
    await this.iniciar();
    const { rows } = await this.pool.query(
      "select dados, versao from ocorrencias where dados->'registradoPor'->>'id' = $1 and dados->>'idCliente' = $2",
      [usuarioId, idCliente],
    );
    return rows[0] ? RepositorioPostgres.ler(rows[0]) : null;
  }

  async obterOcorrencia(id: string) {
    await this.iniciar();
    if (!UUID.test(id)) return null;
    const { rows } = await this.pool.query("select dados, versao from ocorrencias where id = $1", [id]);
    return rows[0] ? RepositorioPostgres.ler(rows[0]) : null;
  }

  async criarOcorrencia(dados: NovaOcorrencia, opcoes: { gerarProtocolo?: boolean; usuarioId: string }, auditoria: (o: Ocorrencia) => RegistroAuditoria) {
    await this.iniciar();
    return this.transacao(async (c) => {
      const protocolo = opcoes.gerarProtocolo ? await this.gerarProtocolo(c, Number(dados.data.slice(0, 4))) : (dados.protocolo ?? "").trim();
      const agora = new Date().toISOString();
      const o: Ocorrencia = { ...dados, id: randomUUID(), protocolo, criadoEm: agora, atualizadoEm: agora, versao: 1 };
      o.anexos = await this.vincularAnexos(c, o, opcoes.usuarioId);
      await c.query("insert into ocorrencias (id, protocolo, data, dados, versao) values ($1, $2, $3, $4, 1)", [o.id, protocolo, o.data, o]);
      await this.confirmarVinculo(c, o);
      await this.auditar(c, auditoria(o));
      return o;
    });
  }

  async alterarOcorrencia(id: string, decidir: (atual: Ocorrencia) => Alteracao | Promise<Alteracao>, opcoes: { versaoEsperada?: number; usuarioId: string }) {
    await this.iniciar();
    if (!UUID.test(id)) return null;
    return this.transacao(async (c) => {
      // Trava o registro até o fim da transação: alterações simultâneas esperam a vez.
      const { rows } = await c.query("select dados, versao from ocorrencias where id = $1 for update", [id]);
      if (!rows[0]) return null;
      const atual = RepositorioPostgres.ler(rows[0]);
      if (opcoes.versaoEsperada !== undefined && opcoes.versaoEsperada !== atual.versao) {
        throw new ErroConflito("Este relatório foi alterado por outra pessoa depois que você o abriu. Recarregue a página para ver a versão atual.");
      }
      const alt = await decidir(atual);
      const o: Ocorrencia = {
        ...atual,
        ...alt.dados,
        id: atual.id,
        protocolo: (alt.dados.protocolo ?? atual.protocolo ?? "").trim(),
        criadoEm: atual.criadoEm,
        atualizadoEm: new Date().toISOString(),
        versao: (atual.versao ?? 1) + 1,
      };
      if (alt.gerarProtocolo) o.protocolo = await this.gerarProtocolo(c, Number(o.data.slice(0, 4)));
      if ("anexos" in alt.dados) o.anexos = await this.vincularAnexos(c, o, opcoes.usuarioId);
      await c.query("update ocorrencias set data = $2, protocolo = $3, dados = $4, versao = $5, atualizado_em = now() where id = $1", [
        id, o.data, o.protocolo, o, o.versao,
      ]);
      if ("anexos" in alt.dados) await this.confirmarVinculo(c, o);
      if (alt.auditoria) await this.auditar(c, alt.auditoria);
      return o;
    });
  }

  /**
   * Prepara o vínculo das fotos: cada foto informada precisa já pertencer a esta
   * ocorrência ou estar pendente e ter sido enviada pelo próprio usuário. Os dados
   * (nome, dimensões) vêm do banco, não do navegador. Remove as fotos retiradas.
   */
  private async vincularAnexos(c: PoolClient, o: Ocorrencia, usuarioId: string): Promise<AnexoInfo[] | undefined> {
    const ids = [...new Set((o.anexos ?? []).map((a) => a.id))];
    if (ids.some((x) => !UUID.test(x))) throw new ErroValidacao("Imagem inválida.");
    await c.query("delete from anexos where ocorrencia_id = $1 and not (id = any($2::uuid[]))", [o.id, ids]);
    if (!ids.length) return undefined;
    const { rows } = await c.query(
      `select id::text, nome, largura, altura from anexos
       where id = any($1::uuid[]) and (ocorrencia_id = $2 or (ocorrencia_id is null and enviado_por = $3))`,
      [ids, o.id, usuarioId],
    );
    if (rows.length !== ids.length) throw new ErroValidacao("Uma das imagens não existe mais ou foi enviada por outro usuário. Envie a foto novamente.");
    const porId = new Map(rows.map((r) => [r.id as string, r]));
    return ids.map((id) => {
      const r = porId.get(id)!;
      return { id, nome: r.nome, largura: r.largura, altura: r.altura };
    });
  }

  /** Executado depois que a ocorrência existe (chave estrangeira). */
  private async confirmarVinculo(c: PoolClient, o: Ocorrencia) {
    const ids = (o.anexos ?? []).map((a) => a.id);
    if (ids.length) await c.query("update anexos set ocorrencia_id = $1 where id = any($2::uuid[]) and ocorrencia_id is null", [o.id, ids]);
  }

  async salvarAnexo(a: NovoAnexo) {
    await this.iniciar();
    // Limpa fotos enviadas e nunca vinculadas (formulário abandonado) há mais de 1 dia.
    await this.pool.query("delete from anexos where ocorrencia_id is null and criado_em < now() - interval '1 day'");
    const id = randomUUID();
    await this.pool.query("insert into anexos (id, nome, tipo, largura, altura, dados, enviado_por) values ($1, $2, $3, $4, $5, $6, $7)", [
      id, a.nome, a.tipo, a.largura, a.altura, a.dados, a.enviadoPor,
    ]);
    return { id, nome: a.nome, largura: a.largura, altura: a.altura };
  }

  async obterAnexo(id: string) {
    await this.iniciar();
    if (!UUID.test(id)) return null;
    const { rows } = await this.pool.query("select tipo, dados, ocorrencia_id::text, enviado_por from anexos where id = $1", [id]);
    const r = rows[0];
    return r ? { tipo: r.tipo as string, dados: r.dados as Buffer, ocorrenciaId: r.ocorrencia_id ?? undefined, enviadoPor: r.enviado_por ?? undefined } : null;
  }

  async contarAnexosPendentes(usuarioId: string) {
    await this.iniciar();
    const { rows } = await this.pool.query(
      "select count(*)::int as n from anexos where ocorrencia_id is null and enviado_por = $1 and criado_em > now() - interval '1 day'",
      [usuarioId],
    );
    return rows[0].n as number;
  }

  async excluirOcorrencia(id: string, auditoria: RegistroAuditoria) {
    await this.iniciar();
    if (!UUID.test(id)) return false;
    return this.transacao(async (c) => {
      const r = await c.query("delete from ocorrencias where id = $1", [id]);
      if (!r.rowCount) return false;
      await this.auditar(c, auditoria);
      return true;
    });
  }

  async restaurarDemonstracao(auditoria: RegistroAuditoria) {
    await this.iniciar();
    await this.transacao(async (c) => {
      await c.query("delete from ocorrencias");
      await c.query("delete from protocolo_sequencia");
      await this.inserirDemonstracao(c);
      await this.auditar(c, auditoria);
    });
  }

  async listarUsuarios() {
    await this.iniciar();
    const { rows } = await this.pool.query("select dados from usuarios order by dados->>'nome'");
    return rows.map((r) => semSenha(comPerfil(r.dados as UsuarioComSenha)));
  }

  async obterUsuario(id: string) {
    await this.iniciar();
    if (!UUID.test(id)) return null;
    const { rows } = await this.pool.query("select dados from usuarios where id = $1", [id]);
    return rows[0] ? comPerfil(rows[0].dados as UsuarioComSenha) : null;
  }

  async obterUsuarioPorLogin(login: string) {
    await this.iniciar();
    const { rows } = await this.pool.query("select dados from usuarios where lower(login) = lower($1)", [login.trim()]);
    return rows[0] ? comPerfil(rows[0].dados as UsuarioComSenha) : null;
  }

  async salvarUsuario(u: UsuarioComSenha, auditoria?: RegistroAuditoria) {
    await this.iniciar();
    await this.transacao(async (c) => {
      await c.query(
        `insert into usuarios (id, login, dados) values ($1, $2, $3)
         on conflict (id) do update set login = excluded.login, dados = excluded.dados, atualizado_em = now()`,
        [u.id, u.login, u],
      );
      if (auditoria) await this.auditar(c, auditoria);
    });
    return semSenha(u);
  }

  async criarPrimeiroUsuario(u: UsuarioComSenha) {
    await this.iniciar();
    try {
      return await this.transacao(async (c) => {
        await c.query("select pg_advisory_xact_lock(727002)");
        const r = await c.query("insert into usuarios (id, login, dados) select $1, $2, $3 where not exists (select 1 from usuarios)", [u.id, u.login, u]);
        if (!r.rowCount) return false;
        await this.auditar(c, { usuario: null, acao: "ADMIN_INICIAL_CRIADO", entidade: "usuario", entidadeId: u.id, detalhe: { login: u.login, perfil: u.perfil } });
        return true;
      });
    } catch (e) {
      if (e instanceof ErroConflito) return false;
      throw e;
    }
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

  async salvarConfiguracoes(cfg: Configuracoes, auditoria: RegistroAuditoria) {
    await this.iniciar();
    const dados = { ...CONFIGURACOES_PADRAO, ...cfg };
    await this.transacao(async (c) => {
      await c.query("insert into configuracoes (id, dados) values (1, $1) on conflict (id) do update set dados = excluded.dados", [dados]);
      await this.auditar(c, auditoria);
    });
    return dados;
  }
}

/** Converte violações de unicidade em ErroConflito com mensagem compreensível. */
function traduzirErro(e: unknown): unknown {
  const err = e as { code?: string; constraint?: string };
  if (err?.code === "23505") {
    if (err.constraint === INDICE_PROTOCOLO_UNICO) return new ErroConflito("Já existe uma ocorrência com este protocolo.");
    if (err.constraint === "usuarios_login_idx") return new ErroConflito("Este login já está em uso.");
    if (err.constraint === "ocorrencias_id_cliente_unico") return new ErroConflito("Este relatório já foi enviado.");
    return new ErroConflito("Registro duplicado.");
  }
  return e;
}

/** Perfis gravados por versões anteriores (ADMIN/PRESENCA) são convertidos. */
function comPerfil(u: UsuarioComSenha): UsuarioComSenha {
  return { ...u, perfil: normalizarPerfil(u.perfil) };
}

function semSenha(u: UsuarioComSenha): Usuario {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { senhaHash, ...resto } = u;
  return resto;
}
