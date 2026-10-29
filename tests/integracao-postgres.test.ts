/**
 * Testes de integração com PostgreSQL real. Rodam somente com TEST_DATABASE_URL
 * (servidor de TESTE com permissão de criar bancos). Cada execução cria um banco
 * temporário e o apaga ao final. NUNCA aponte para o banco de produção.
 *
 *   TEST_DATABASE_URL=postgresql://postgres@localhost:5432/postgres npm run test:integracao
 */
import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { Client } from "pg";
import { RepositorioPostgres } from "../src/server/repositorio-postgres";
import { ErroConflito, ErroValidacao } from "../src/server/validacao";
import type { NovaOcorrencia, RegistroAuditoria } from "../src/server/repositorio";
import type { UsuarioComSenha } from "../src/lib/types";

const URL_ADMIN = process.env.TEST_DATABASE_URL;
const pular = !URL_ADMIN && "defina TEST_DATABASE_URL para rodar os testes de integração";
const nomeBanco = `teste_relatorios_${Date.now()}_${Math.floor(Math.random() * 1e6)}`;
let urlTeste = "";
let repo: RepositorioPostgres;
let sql: Client;

const aud = (acao: string): RegistroAuditoria => ({ usuario: { id: "u-teste", nome: "Teste" }, acao, entidade: "ocorrencia" });
const nova = (extra: Partial<NovaOcorrencia> = {}): NovaOcorrencia => ({
  protocolo: "",
  data: "2026-10-20",
  horario: "10:00",
  ocorrencia: "Som alto",
  nome: "Fulano",
  tratamento: "Associado",
  quadra: "9",
  lote: "8",
  incluirTextoNorma: false,
  status: "REGISTRADA",
  ...extra,
});
const criar = (extra: Partial<NovaOcorrencia> = {}, usuarioId = "u1", gerarProtocolo = false) =>
  repo.criarOcorrencia(nova(extra), { usuarioId, gerarProtocolo }, (o) => ({ ...aud("OCORRENCIA_CRIADA"), entidadeId: o.id }));
const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xd9]);

before(async () => {
  if (pular) return;
  const admin = new Client({ connectionString: URL_ADMIN });
  await admin.connect();
  await admin.query(`create database ${nomeBanco}`);
  await admin.end();
  const u = new URL(URL_ADMIN!);
  u.pathname = `/${nomeBanco}`;
  urlTeste = u.toString();
  repo = new RepositorioPostgres(urlTeste);
  sql = new Client({ connectionString: urlTeste });
  await sql.connect();
});

after(async () => {
  if (pular) return;
  await sql?.end();
  await repo?.encerrar();
  const admin = new Client({ connectionString: URL_ADMIN });
  await admin.connect();
  await admin.query(`drop database if exists ${nomeBanco} with (force)`);
  await admin.end();
});

test("migrações: versionadas, idempotentes e registradas", { skip: pular }, async () => {
  await repo.contarUsuarios();
  const outro = new RepositorioPostgres(urlTeste);
  await outro.contarUsuarios(); // segunda execução não reaplica nada
  await outro.encerrar();
  const { rows } = await sql.query("select versao from schema_migracoes order by versao");
  assert.deepEqual(rows.map((r) => r.versao), [1, 2]);
  const idx = await sql.query("select 1 from pg_indexes where indexname = 'ocorrencias_protocolo_unico'");
  assert.equal(idx.rowCount, 1);
});

test("protocolo: único sem diferenciar maiúsculas/espaços; em branco pode repetir", { skip: pular }, async () => {
  await criar({ protocolo: "AB-1" });
  await assert.rejects(() => criar({ protocolo: " ab-1 " }), ErroConflito);
  await criar({ protocolo: "" });
  await criar({ protocolo: "" });
  assert.equal(await repo.protocoloEmUso("ab-1"), true);
});

test("protocolo: criações simultâneas com o mesmo número → só uma grava, a outra recebe conflito", { skip: pular }, async () => {
  const r = await Promise.allSettled([criar({ protocolo: "SIM-1" }), criar({ protocolo: "SIM-1" }), criar({ protocolo: "SIM-1" })]);
  assert.equal(r.filter((x) => x.status === "fulfilled").length, 1);
  assert.ok(r.filter((x) => x.status === "rejected").every((x) => (x as PromiseRejectedResult).reason instanceof ErroConflito));
});

test("protocolo automático: geração simultânea não repete números", { skip: pular }, async () => {
  const r = await Promise.all(Array.from({ length: 8 }, () => criar({}, "u1", true)));
  assert.equal(new Set(r.map((o) => o.protocolo)).size, 8);
});

test("concorrência otimista: versão antiga recebe 409 e nada é sobrescrito", { skip: pular }, async () => {
  const o = await criar();
  assert.equal(o.versao, 1);
  const a = await repo.alterarOcorrencia(o.id, () => ({ dados: { observacoes: "A" } }), { versaoEsperada: 1, usuarioId: "u1" });
  assert.equal(a?.versao, 2);
  await assert.rejects(() => repo.alterarOcorrencia(o.id, () => ({ dados: { observacoes: "B" } }), { versaoEsperada: 1, usuarioId: "u1" }), ErroConflito);
  assert.equal((await repo.obterOcorrencia(o.id))?.observacoes, "A");
});

test("concorrência: duas edições simultâneas com a mesma versão → exatamente uma vence", { skip: pular }, async () => {
  const o = await criar();
  const r = await Promise.allSettled(
    ["X", "Y"].map((v) => repo.alterarOcorrencia(o.id, () => ({ dados: { observacoes: v } }), { versaoEsperada: 1, usuarioId: "u1" })),
  );
  assert.equal(r.filter((x) => x.status === "fulfilled").length, 1);
  assert.ok((r.find((x) => x.status === "rejected") as PromiseRejectedResult).reason instanceof ErroConflito);
});

test("concorrência: alterações sem versão são serializadas (nenhum evento da linha do tempo se perde)", { skip: pular }, async () => {
  const o = await criar();
  await Promise.all(
    Array.from({ length: 6 }, (_, i) =>
      repo.alterarOcorrencia(o.id, (atual) => ({ dados: { historico: [...(atual.historico ?? []), { em: "", por: { id: "x", nome: "x" }, acao: "EDITOU" as const, detalhe: `e${i}` }] } }), { usuarioId: "u1" }),
    ),
  );
  const final = await repo.obterOcorrencia(o.id);
  assert.equal(final?.historico?.length, 6);
  assert.equal(final?.versao, 7);
});

test("transação: erro na decisão desfaz tudo (registro e auditoria)", { skip: pular }, async () => {
  const o = await criar();
  const antes = (await sql.query("select count(*)::int n from auditoria")).rows[0].n;
  await assert.rejects(() =>
    repo.alterarOcorrencia(
      o.id,
      () => {
        throw new ErroValidacao("falha simulada");
      },
      { usuarioId: "u1" },
    ),
  );
  assert.equal((await repo.obterOcorrencia(o.id))?.versao, 1);
  assert.equal((await sql.query("select count(*)::int n from auditoria")).rows[0].n, antes);
  // Conexões liberadas mesmo após erros: novas operações seguem funcionando.
  for (let i = 0; i < 8; i++) await repo.obterOcorrencia(o.id);
});

test("auditoria: gravada na mesma transação e imutável (update/delete/truncate recusados)", { skip: pular }, async () => {
  const o = await criar();
  const { rows } = await sql.query("select acao, usuario_nome from auditoria where entidade_id = $1", [o.id]);
  assert.deepEqual(rows.map((r) => r.acao), ["OCORRENCIA_CRIADA"]);
  await assert.rejects(() => sql.query("update auditoria set acao = 'x'"), /não pode ser alterada/);
  await assert.rejects(() => sql.query("delete from auditoria"), /não pode ser alterada/);
  await assert.rejects(() => sql.query("truncate auditoria"), /não pode ser alterada/);
  const lista = await repo.listarAuditoria({ limite: 5, entidade: "ocorrencia", entidadeId: o.id });
  assert.equal(lista[0].acao, "OCORRENCIA_CRIADA");
});

test("auditoria: listagem em ordem cronológica decrescente e paginada (mais de 100 eventos)", { skip: pular }, async () => {
  for (let i = 0; i < 105; i++) await repo.registrarAuditoria({ usuario: null, acao: `ORDEM_${i}`, entidade: "sistema" });
  const pagina1 = await repo.listarAuditoria({ limite: 50, entidade: "sistema" });
  const ids = pagina1.map((e) => Number(e.id));
  assert.deepEqual(ids, [...ids].sort((a, b) => b - a), "ordem numérica, não alfabética");
  assert.equal(pagina1[0].acao, "ORDEM_104");
  const pagina2 = await repo.listarAuditoria({ limite: 50, entidade: "sistema", antesDe: pagina1.at(-1)!.id });
  assert.equal(Number(pagina2[0].id), Number(pagina1.at(-1)!.id) - 1);
});

test("anexos: só quem enviou vincula foto pendente; foto de outra ocorrência não pode ser tomada", { skip: pular }, async () => {
  const foto = await repo.salvarAnexo({ nome: "f.jpg", tipo: "image/jpeg", largura: 10, altura: 10, dados: jpeg, enviadoPor: "u1" });
  await assert.rejects(() => criar({ anexos: [{ ...foto }] }, "u2"), ErroValidacao);
  // Dimensões/nome forjados pelo navegador são substituídos pelos do banco.
  const o = await criar({ anexos: [{ ...foto, largura: 99999, nome: "<b>x</b>" }] }, "u1");
  assert.equal(o.anexos?.[0].largura, 10);
  assert.equal((await repo.obterAnexo(foto.id))?.ocorrenciaId, o.id);
  await assert.rejects(() => criar({ anexos: [{ ...foto }] }, "u1"), ErroValidacao, "foto já vinculada a outra ocorrência");
  assert.equal(await repo.contarAnexosPendentes("u1"), 0);
  // Retirar a foto na edição remove o arquivo.
  await repo.alterarOcorrencia(o.id, () => ({ dados: { anexos: [] } }), { usuarioId: "u1" });
  assert.equal(await repo.obterAnexo(foto.id), null);
});

test("exclusão: remove a ocorrência e as fotos (cascata) e registra auditoria; id inexistente → false", { skip: pular }, async () => {
  const foto = await repo.salvarAnexo({ nome: "f.jpg", tipo: "image/jpeg", largura: 1, altura: 1, dados: jpeg, enviadoPor: "u1" });
  const o = await criar({ anexos: [foto] });
  assert.equal(await repo.excluirOcorrencia(o.id, aud("OCORRENCIA_EXCLUIDA")), true);
  assert.equal(await repo.obterAnexo(foto.id), null);
  assert.equal(await repo.excluirOcorrencia(randomUUID(), aud("OCORRENCIA_EXCLUIDA")), false);
});

test("primeiro usuário: criações simultâneas geram exatamente um administrador", { skip: pular }, async () => {
  const u = (login: string): UsuarioComSenha => ({
    id: randomUUID(), nome: login, login, perfil: "ADMIN_GERAL", ativo: true, senhaHash: "x", criadoEm: "", atualizadoEm: "",
  });
  const r = await Promise.all([repo.criarPrimeiroUsuario(u("a1")), repo.criarPrimeiroUsuario(u("a2")), repo.criarPrimeiroUsuario(u("a3"))]);
  assert.equal(r.filter(Boolean).length, 1);
  assert.equal(await repo.contarUsuarios(), 1);
  assert.equal(await repo.criarPrimeiroUsuario(u("a4")), false);
  // Login único sem diferenciar maiúsculas.
  const existente = (await repo.listarUsuarios())[0].login;
  await assert.rejects(() => repo.salvarUsuario(u(existente.toUpperCase())), ErroConflito);
});

test("protocolos repetidos já existentes: a restrição não é criada, nada é apagado e o aviso aparece", { skip: pular }, async () => {
  const admin = new Client({ connectionString: URL_ADMIN });
  await admin.connect();
  const banco2 = `${nomeBanco}_dup`;
  await admin.query(`create database ${banco2}`);
  const u = new URL(URL_ADMIN!);
  u.pathname = `/${banco2}`;
  const c = new Client({ connectionString: u.toString() });
  await c.connect();
  // Simula um banco da versão anterior (sem a restrição) com protocolos repetidos.
  await c.query(`create table ocorrencias (id uuid primary key, protocolo text not null default '', data date not null, dados jsonb not null,
    criado_em timestamptz not null default now(), atualizado_em timestamptz not null default now())`);
  for (const p of ["2026-0001", "2026-0001 ", "2026-0002"]) {
    await c.query("insert into ocorrencias (id, protocolo, data, dados) values ($1, $2, '2026-01-01', '{}')", [randomUUID(), p]);
  }
  const r2 = new RepositorioPostgres(u.toString());
  const avisos = await r2.diagnosticoIntegridade();
  assert.ok(avisos.some((a) => a.includes("2026-0001")));
  assert.equal((await c.query("select count(*)::int n from ocorrencias")).rows[0].n, 3, "nenhum dado apagado");
  assert.equal((await c.query("select 1 from pg_indexes where indexname = 'ocorrencias_protocolo_unico'")).rowCount, 0);
  await r2.encerrar();
  await c.end();
  await admin.query(`drop database ${banco2} with (force)`);
  await admin.end();
});
