import { test } from "node:test";
import assert from "node:assert/strict";
import { configurarConexao, credenciaisAdminInicial, problemasDeConfiguracao, ErroConfiguracao } from "../src/server/config";
import { criarToken, lerToken, segredosSessao, ErroSegredoSessao, DURACAO_SESSAO_SEGUNDOS } from "../src/lib/sessao";

const PROD = { NODE_ENV: "production" };
const SEGREDO = "s".repeat(20) + "ecreto-aleatorio-0123456789abcdef";
const URL_REMOTA = "postgresql://u:p@ep-x.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require";

// ───────── TLS do PostgreSQL ─────────

test("TLS: padrão verifica o certificado (rejectUnauthorized true) e remove parâmetros ssl da URL", () => {
  const c = configurarConexao(URL_REMOTA, PROD);
  assert.equal(c.modoSSL, "verificar");
  assert.deepEqual(c.ssl, { rejectUnauthorized: true });
  assert.ok(!c.connectionString.includes("sslmode") && !c.connectionString.includes("channel_binding"));
});

test("TLS: usa a cadeia informada em DATABASE_CA_CERT (com \\n escapado) e recusa conteúdo que não é PEM", () => {
  const pem = "-----BEGIN CERTIFICATE-----\\nMIIB\\n-----END CERTIFICATE-----";
  const c = configurarConexao(URL_REMOTA, { ...PROD, DATABASE_CA_CERT: pem });
  assert.equal(c.ssl?.rejectUnauthorized, true);
  assert.ok(c.ssl?.ca?.includes("\n"));
  assert.throws(() => configurarConexao(URL_REMOTA, { ...PROD, DATABASE_CA_CERT: "abc" }), ErroConfiguracao);
  assert.throws(() => configurarConexao(URL_REMOTA, { ...PROD, DATABASE_CA_CERT_FILE: "/nao/existe.pem" }), ErroConfiguracao);
});

test("TLS: sslmode=disable na URL não desativa o TLS em produção", () => {
  const c = configurarConexao("postgresql://u:p@db.exemplo.com/x?sslmode=disable", PROD);
  assert.equal(c.modoSSL, "verificar");
  assert.equal(c.ssl?.rejectUnauthorized, true);
});

test("TLS: desativar com banco remoto em produção é recusado; valor inválido é recusado", () => {
  assert.throws(() => configurarConexao(URL_REMOTA, { ...PROD, DATABASE_SSL: "desativado" }), /não é permitida em produção/);
  assert.throws(() => configurarConexao(URL_REMOTA, { ...PROD, DATABASE_SSL: "false" }), /DATABASE_SSL inválido/);
  assert.throws(() => configurarConexao("mysql://x@y/z", PROD), ErroConfiguracao);
  assert.throws(() => configurarConexao("não é url", PROD), ErroConfiguracao);
});

test("TLS: sem verificação só por decisão explícita, com aviso", () => {
  const c = configurarConexao(URL_REMOTA, { ...PROD, DATABASE_SSL: "sem-verificacao" });
  assert.equal(c.ssl?.rejectUnauthorized, false);
  assert.ok(c.aviso);
  assert.ok(problemasDeConfiguracao({ ...PROD, SESSAO_SEGREDO: SEGREDO, DATABASE_URL: URL_REMOTA, DATABASE_SSL: "sem-verificacao" }).avisos.length > 0);
});

test("TLS: banco local (desenvolvimento/testes) sem TLS; banco local pode pedir TLS", () => {
  assert.equal(configurarConexao("postgresql://postgres@localhost:5433/x", {}).ssl, undefined);
  assert.equal(configurarConexao("postgresql://postgres@localhost:5433/x", PROD).ssl, undefined);
  assert.equal(configurarConexao("postgresql://postgres@localhost/x?sslmode=require", {}).ssl?.rejectUnauthorized, true);
  // Fora de produção, sslmode=disable vale para bancos de teste remotos.
  assert.equal(configurarConexao("postgresql://u@db.teste/x?sslmode=disable", {}).ssl, undefined);
});

// ───────── Administrador inicial ─────────

test("admin inicial: sem APP_USUARIO/APP_SENHA não existe credencial padrão (em nenhum ambiente)", () => {
  assert.throws(() => credenciaisAdminInicial({}), ErroConfiguracao);
  assert.throws(() => credenciaisAdminInicial(PROD), ErroConfiguracao);
  assert.throws(() => credenciaisAdminInicial({ ...PROD, APP_USUARIO: "hugo" }), ErroConfiguracao);
});

test("admin inicial: produção exige senha forte; mensagens não revelam a senha", () => {
  for (const fraca of ["admin", "12345678", "senha123", "hugo", "aaaaaaaaaaaaaa", "123456789012345", "curta-1"]) {
    let msg = "";
    try {
      credenciaisAdminInicial({ ...PROD, APP_USUARIO: "hugo", APP_SENHA: fraca });
    } catch (e) {
      msg = (e as Error).message;
    }
    assert.ok(msg, `deveria recusar "${fraca}"`);
    assert.ok(!msg.includes(fraca) || fraca === "hugo", "a mensagem não pode conter a senha");
  }
  const ok = credenciaisAdminInicial({ ...PROD, APP_USUARIO: "hugo", APP_SENHA: "Ilha-Gerencia-2026!" });
  assert.equal(ok.login, "hugo");
  assert.throws(() => credenciaisAdminInicial({ ...PROD, APP_USUARIO: "a b", APP_SENHA: "Ilha-Gerencia-2026!" }), /APP_USUARIO inválido/);
});

test("admin inicial: desenvolvimento exige as variáveis, com mínimo de 8 caracteres", () => {
  assert.equal(credenciaisAdminInicial({ APP_USUARIO: "dev", APP_SENHA: "dev-local-1" }).login, "dev");
  assert.throws(() => credenciaisAdminInicial({ APP_USUARIO: "dev", APP_SENHA: "abc" }), ErroConfiguracao);
});

test("configuração de produção: segredo de sessão e banco obrigatórios", () => {
  const r = problemasDeConfiguracao(PROD);
  assert.ok(r.erros.some((e) => e.includes("SESSAO_SEGREDO")));
  assert.ok(r.erros.some((e) => e.includes("DATABASE_URL")));
  assert.deepEqual(problemasDeConfiguracao({ ...PROD, SESSAO_SEGREDO: SEGREDO, DATABASE_URL: URL_REMOTA }).erros, []);
  assert.deepEqual(problemasDeConfiguracao({}).erros, [], "fora de produção não bloqueia");
});

// ───────── Sessões ─────────

const ENV = { ...PROD, SESSAO_SEGREDO: SEGREDO };

test("sessão: token válido é lido; finalidade, versão e marca da senha conferidas", async () => {
  const t = await criarToken("u1", "LIDER", "marca1", ENV);
  const d = await lerToken(t, ENV);
  assert.equal(d?.u, "u1");
  assert.equal(d?.f, "sessao");
  assert.equal(d?.m, "marca1");
});

test("sessão: token adulterado (corpo ou assinatura) é recusado", async () => {
  const t = await criarToken("u1", "LIDER", "m", ENV);
  const [corpo, ass] = t.split(".");
  const dados = JSON.parse(Buffer.from(corpo, "base64url").toString());
  const corpoForjado = Buffer.from(JSON.stringify({ ...dados, u: "admin", p: "ADMIN_GERAL" })).toString("base64url");
  assert.equal(await lerToken(`${corpoForjado}.${ass}`, ENV), null);
  assert.equal(await lerToken(`${corpo}.${ass.slice(0, -2)}AA`, ENV), null);
  assert.equal(await lerToken(`${corpo}.${ass}.extra`, ENV), null);
  assert.equal(await lerToken("lixo", ENV), null);
  assert.equal(await lerToken("x".repeat(5000), ENV), null);
});

test("sessão: token assinado com outro segredo ou para outra finalidade é recusado", async () => {
  const outro = await criarToken("u1", "LIDER", "m", { ...PROD, SESSAO_SEGREDO: "z".repeat(40) });
  assert.equal(await lerToken(outro, ENV), null);
  // Mesmo segredo, mas JSON sem a finalidade "sessao".
  const corpo = Buffer.from(JSON.stringify({ u: "u1", p: "LIDER", e: Math.floor(Date.now() / 1000) + 100 })).toString("base64url");
  const chave = await crypto.subtle.importKey("raw", new TextEncoder().encode(SEGREDO), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const ass = Buffer.from(await crypto.subtle.sign("HMAC", chave, new TextEncoder().encode(corpo))).toString("base64url");
  assert.equal(await lerToken(`${corpo}.${ass}`, ENV), null);
});

test("sessão: expirada e emitida no futuro são recusadas", async () => {
  const antigo = await criarToken("u1", "LIDER", "m", ENV, Date.now() - (DURACAO_SESSAO_SEGUNDOS + 10) * 1000);
  assert.equal(await lerToken(antigo, ENV), null);
  const futuro = await criarToken("u1", "LIDER", "m", ENV, Date.now() + 3600 * 1000);
  assert.equal(await lerToken(futuro, ENV), null);
});

test("sessão: sem segredo em produção não cria nem aceita tokens (sem fallback previsível)", async () => {
  assert.throws(() => segredosSessao(PROD), ErroSegredoSessao);
  assert.throws(() => segredosSessao({ ...PROD, SESSAO_SEGREDO: "curto" }), ErroSegredoSessao);
  await assert.rejects(() => criarToken("u1", "LIDER", "m", PROD), ErroSegredoSessao);
  const t = await criarToken("u1", "LIDER", "m", ENV);
  assert.equal(await lerToken(t, PROD), null);
  // O segredo antigo (APP_SENHA + DATABASE_URL) não é mais aceito.
  assert.throws(() => segredosSessao({ ...PROD, APP_SENHA: "x", DATABASE_URL: URL_REMOTA }), ErroSegredoSessao);
});

test("sessão: rotação — o segredo anterior continua válido até ser removido", async () => {
  const antigo = { ...PROD, SESSAO_SEGREDO: "a".repeat(40) };
  const t = await criarToken("u1", "LIDER", "m", antigo);
  const rotacionado = { ...PROD, SESSAO_SEGREDO: "b".repeat(40), SESSAO_SEGREDO_ANTERIOR: "a".repeat(40) };
  assert.ok(await lerToken(t, rotacionado));
  assert.equal(await lerToken(t, { ...PROD, SESSAO_SEGREDO: "b".repeat(40) }), null);
});

test("sessão: fora de produção, sem a variável, usa segredo aleatório do processo", async () => {
  const [s1] = segredosSessao({});
  assert.ok(s1.length >= 32);
  assert.notEqual(s1, `fazenda-ilha||local`);
  const t = await criarToken("u1", "LIDER", "m", {});
  assert.ok(await lerToken(t, {}));
});
