/**
 * Testes ponta a ponta da API (servidor real + PostgreSQL de TESTE).
 * Rodam somente com E2E_BASE_URL, contra um servidor iniciado com banco vazio e:
 *   APP_USUARIO=admin.e2e  APP_SENHA=Senha-Inicial-E2E-2026  SESSAO_SEGREDO=<≥32 caracteres>
 * Ex.: E2E_BASE_URL=http://localhost:3100 npm run test:e2e
 * Verificam a matriz de permissões perfil × operação, acesso a registros de terceiros (IDOR),
 * campos sensíveis no corpo, anexos, sessões revogadas, CSRF e operações destrutivas.
 */
import { before, test } from "node:test";
import assert from "node:assert/strict";

const BASE = process.env.E2E_BASE_URL;
const pular = !BASE && "defina E2E_BASE_URL para rodar os testes ponta a ponta";
const SENHA_INICIAL = process.env.E2E_APP_SENHA ?? "Senha-Inicial-E2E-2026";
const LOGIN_INICIAL = process.env.E2E_APP_USUARIO ?? "admin.e2e";
const NOVA = (login: string) => `Nova-${login}-Segura-2026`;

type Resp = { s: number; j: any };
type Cliente = { cookie: string; req: (m: string, url: string, body?: unknown, extra?: Record<string, string>) => Promise<Resp> };

async function http(m: string, url: string, body?: unknown, headers: Record<string, string> = {}): Promise<Resp & { h: Headers }> {
  const r = await fetch(BASE + url, {
    method: m,
    headers: { "Content-Type": "application/json", origin: BASE!, ...headers },
    body: body === undefined ? undefined : typeof body === "string" ? body : JSON.stringify(body),
    redirect: "manual",
  });
  const t = await r.text();
  let j: any = t;
  try {
    j = JSON.parse(t);
  } catch {
    /* texto */
  }
  return { s: r.status, j, h: r.headers };
}

async function entrar(login: string, senha: string): Promise<Cliente> {
  const r = await http("POST", "/api/auth/login", { login, senha });
  assert.equal(r.s, 200, `login ${login}: ${JSON.stringify(r.j)}`);
  const cookie = r.h.get("set-cookie")!.split(";")[0];
  return { cookie, req: async (m, url, body, extra = {}) => http(m, url, body, { cookie, ...extra }) };
}

/** Entra com a senha provisória, confirma o bloqueio e define a senha pessoal. */
async function primeiroAcesso(login: string, provisoria: string): Promise<Cliente> {
  const c = await entrar(login, provisoria);
  const bloqueado = await c.req("GET", "/api/ocorrencias");
  assert.equal(bloqueado.s, 403);
  assert.equal(bloqueado.j.codigo, "TROCAR_SENHA");
  const t = await c.req("POST", "/api/auth/senha", { senhaAtual: provisoria, novaSenha: NOVA(login) });
  assert.equal(t.s, 200, JSON.stringify(t.j));
  return entrar(login, NOVA(login));
}

const seg = (m: number, corpo: Buffer) => Buffer.concat([Buffer.from([0xff, m, (corpo.length + 2) >> 8, (corpo.length + 2) & 0xff]), corpo]);
const JPEG = Buffer.concat([
  Buffer.from([0xff, 0xd8]),
  seg(0xe1, Buffer.from("Exif\0\0GPS", "latin1")),
  seg(0xc0, Buffer.from([8, 0, 10, 0, 20, 1, 1, 0x11, 0])),
  seg(0xda, Buffer.from([1, 1, 0, 0, 0x3f, 0])),
  Buffer.from([0x11, 0xff, 0xd9]),
]).toString("base64");

const ocorrencia = (extra: Record<string, unknown> = {}) => ({
  horario: "22:30", ocorrencia: "Som alto", nome: "Pessoa Teste", tratamento: "Associado", quadra: "9", lote: "8",
  incluirTextoNorma: false, fundamentacaoPrincipal: { normaId: "RI-II-8" }, ...extra,
});

let admin: Cliente, adm: Cliente, ger: Cliente, lider1: Cliente, lider2: Cliente, porteiro: Cliente;
const ids: Record<string, string> = {};

before(async () => {
  if (pular) return;
  admin = await primeiroAcesso(LOGIN_INICIAL, SENHA_INICIAL);
  const criar = async (c: Cliente, nome: string, login: string, perfil: string) => {
    const r = await c.req("POST", "/api/usuarios", { nome, login, perfil, senha: `Prov-${login}-123` });
    assert.equal(r.s, 201, JSON.stringify(r.j));
    ids[login] = r.j.id;
  };
  await criar(admin, "Ana Administração", "ana.e2e", "ADMINISTRACAO");
  await criar(admin, "Gil Gerente", "gil.e2e", "GERENTE");
  adm = await primeiroAcesso("ana.e2e", "Prov-ana.e2e-123");
  await criar(adm, "Lia Líder", "lia.e2e", "LIDER");
  await criar(adm, "Leo Líder", "leo.e2e", "LIDER");
  await criar(adm, "Pedro Porteiro", "pedro.e2e", "PORTEIRO");
  ger = await primeiroAcesso("gil.e2e", "Prov-gil.e2e-123");
  lider1 = await primeiroAcesso("lia.e2e", "Prov-lia.e2e-123");
  lider2 = await primeiroAcesso("leo.e2e", "Prov-leo.e2e-123");
  porteiro = await primeiroAcesso("pedro.e2e", "Prov-pedro.e2e-123");
});

test("primeiro acesso: credencial inicial só funciona uma vez e senha provisória bloqueia o uso", { skip: pular }, async () => {
  const r = await http("POST", "/api/auth/login", { login: LOGIN_INICIAL, senha: SENHA_INICIAL });
  assert.equal(r.s, 401, "a senha de APP_SENHA deixa de valer após a troca");
  const s = await http("POST", "/api/auth/login", { login: "admin", senha: "admin" });
  assert.equal(s.s, 401, "não existe admin/admin");
});

test("criação de usuários: administração só cria líder/porteiro/ronda; operacionais e gerente não criam", { skip: pular }, async () => {
  for (const perfil of ["ADMIN_GERAL", "GERENTE", "ADMINISTRACAO"]) {
    assert.equal((await adm.req("POST", "/api/usuarios", { nome: "X", login: `x.${perfil}`.toLowerCase(), perfil, senha: "Qualquer-Senha-1" })).s, 403, perfil);
  }
  for (const c of [ger, lider1, porteiro]) {
    assert.equal((await c.req("POST", "/api/usuarios", { nome: "X", login: "x.y", perfil: "LIDER", senha: "Qualquer-Senha-1" })).s, 403);
    assert.equal((await c.req("GET", "/api/usuarios")).s, 403);
  }
  // Administração não enxerga nem altera o Admin Geral (promoção indevida).
  const lista = (await admin.req("GET", "/api/usuarios")).j as { id: string; login: string }[];
  const idAdmin = lista.find((u) => u.login === LOGIN_INICIAL)!.id;
  assert.equal((await adm.req("PUT", `/api/usuarios/${idAdmin}`, { nome: "x", login: LOGIN_INICIAL, perfil: "LIDER", ativo: false })).s, 404);
  // Administração não promove um líder a Admin Geral.
  assert.equal((await adm.req("PUT", `/api/usuarios/${ids["lia.e2e"]}`, { nome: "Lia", login: "lia.e2e", perfil: "ADMIN_GERAL", ativo: true })).s, 403);
  // Senha fraca recusada.
  assert.equal((await adm.req("POST", "/api/usuarios", { nome: "R", login: "ronda.e2e", perfil: "RONDA", senha: "12345678" })).s, 400);
});

test("ocorrências: matriz de criação, leitura (IDOR), edição e exclusão por perfil", { skip: pular }, async () => {
  assert.equal((await ger.req("POST", "/api/ocorrencias", ocorrencia())).s, 403, "gerente não registra");
  const r = await lider1.req("POST", "/api/ocorrencias", ocorrencia({ gerarProtocolo: true }));
  assert.equal(r.s, 201, JSON.stringify(r.j));
  ids.oc = r.j.id;
  const o = r.j;

  assert.equal((await lider1.req("GET", `/api/ocorrencias/${o.id}`)).s, 200);
  assert.equal((await lider2.req("GET", `/api/ocorrencias/${o.id}`)).s, 404, "outro líder não acessa por id");
  assert.equal((await porteiro.req("GET", `/api/ocorrencias/${o.id}`)).s, 404);
  assert.ok(!((await lider2.req("GET", "/api/ocorrencias")).j.itens as { id: string }[]).some((x) => x.id === o.id), "nem na listagem");
  // Nem forçando filtros na URL (registradoPor é sempre definido pelo servidor).
  const forcado = await lider2.req("GET", `/api/ocorrencias?registradoPor=${o.registradoPor.id}&busca=${encodeURIComponent(o.protocolo)}`);
  assert.equal(forcado.j.total, 0);
  const deLia = await lider1.req("GET", `/api/ocorrencias?busca=${encodeURIComponent(o.protocolo)}&porPagina=1000`);
  assert.equal(deLia.j.total, 1);
  assert.equal(deLia.j.porPagina, 100, "tamanho de página limitado");
  assert.equal((await ger.req("GET", `/api/ocorrencias/${o.id}`)).s, 200);
  assert.equal((await adm.req("GET", "/api/ocorrencias/00000000-0000-4000-8000-000000000000")).s, 404);

  for (const c of [lider1, lider2, ger]) assert.equal((await c.req("PUT", `/api/ocorrencias/${o.id}`, { ...ocorrencia(), versao: o.versao })).s, 403);
  const ed = await adm.req("PUT", `/api/ocorrencias/${o.id}`, { ...ocorrencia({ ocorrencia: "Som alto após 22h" }), protocolo: o.protocolo, versao: o.versao });
  assert.equal(ed.s, 200, JSON.stringify(ed.j));
  assert.equal(ed.j.versao, o.versao + 1);
  const velha = await admin.req("PUT", `/api/ocorrencias/${o.id}`, { ...ocorrencia({ ocorrencia: "outra" }), protocolo: o.protocolo, versao: o.versao });
  assert.equal(velha.s, 409, "versão desatualizada");
  assert.equal((await adm.req("PUT", `/api/ocorrencias/${o.id}`, { ...ocorrencia() })).s, 400, "sem versão");

  for (const c of [adm, ger, lider1]) assert.equal((await c.req("DELETE", `/api/ocorrencias/${o.id}`)).s, 403);
});

test("campos sensíveis no corpo são ignorados (autor, providência, situação, histórico, data, origem da norma)", { skip: pular }, async () => {
  const r = await lider2.req(
    "POST",
    "/api/ocorrencias",
    ocorrencia({
      registradoPor: { id: "x", nome: "Outra Pessoa" },
      providencia: { tipo: "ARQUIVADO", descricao: "forjado" },
      status: "CONCLUIDA",
      historico: [{ acao: "PROVIDENCIA" }],
      data: "2020-01-01",
      versao: 99,
      fundamentacaoPrincipal: { normaId: "RI-XIV-2", origem: "AUTOMATICA", confianca: "ALTA", texto: "INVENTADO" },
    }),
  );
  assert.equal(r.s, 201, JSON.stringify(r.j));
  assert.equal(r.j.registradoPor.nome, "Leo Líder");
  assert.equal(r.j.providencia, undefined);
  assert.equal(r.j.status, "REGISTRADA");
  assert.equal(r.j.historico.length, 1);
  assert.notEqual(r.j.data, "2020-01-01");
  assert.equal(r.j.versao, 1);
  assert.equal(r.j.fundamentacaoPrincipal.origem, "MANUAL");
  assert.notEqual(r.j.fundamentacaoPrincipal.texto, "INVENTADO");
  ids.ocLeo = r.j.id;
});

test("providência: só Administração/Admin Geral; conflito de versão; registrada na auditoria", { skip: pular }, async () => {
  const o = (await adm.req("GET", `/api/ocorrencias/${ids.oc}`)).j;
  const p = { tipo: "NOTIFICADO", descricao: "Notificação entregue", esclarecimentoInicio: "2026-10-21", esclarecimentoFim: "2026-10-31", versao: o.versao };
  for (const c of [lider1, ger, porteiro]) assert.equal((await c.req("PUT", `/api/ocorrencias/${o.id}/providencia`, p)).s, 403);
  const r = await adm.req("PUT", `/api/ocorrencias/${o.id}/providencia`, p);
  assert.equal(r.s, 200, JSON.stringify(r.j));
  assert.equal(r.j.status, "NOTIFICADA");
  assert.equal((await adm.req("PUT", `/api/ocorrencias/${o.id}/providencia`, { ...p, tipo: "ARQUIVADO" })).s, 409);
  const aud = await ger.req("GET", `/api/auditoria?entidade=ocorrencia&id=${o.id}`);
  assert.equal(aud.s, 200);
  const acoes = (aud.j as { acao: string }[]).map((e) => e.acao);
  assert.ok(acoes.includes("OCORRENCIA_CRIADA") && acoes.includes("OCORRENCIA_EDITADA") && acoes.includes("PROVIDENCIA_REGISTRADA"), acoes.join(","));
  for (const c of [adm, lider1]) assert.equal((await c.req("GET", "/api/auditoria")).s, 403);
});

test("base normativa, configurações, exportação e demonstração: somente perfis autorizados", { skip: pular }, async () => {
  const norma = { id: "TESTE-1", documento: "REGULAMENTO", secaoNumero: "I", secaoTitulo: "T", texto: "x", ativo: true };
  for (const c of [adm, ger, lider1]) {
    assert.equal((await c.req("POST", "/api/normas", norma)).s, 403);
    assert.equal((await c.req("DELETE", "/api/normas/RI-II-8")).s, 403);
    assert.equal((await c.req("POST", "/api/normas/restaurar")).s, 403);
    assert.equal((await c.req("PUT", "/api/configuracoes", {})).s, 403);
    assert.equal((await c.req("POST", "/api/demonstracao", { confirmacao: "APAGAR TODAS AS OCORRENCIAS" })).s, 403);
  }
  assert.equal((await lider1.req("GET", "/api/ocorrencias/exportar")).s, 403);
  assert.equal((await ger.req("GET", "/api/ocorrencias/exportar")).s, 200);
  // Nem o Admin Geral restaura a demonstração em produção.
  assert.equal((await admin.req("POST", "/api/demonstracao", { confirmacao: "APAGAR TODAS AS OCORRENCIAS" })).s, 403);
  assert.ok((await admin.req("GET", "/api/ocorrencias")).j.total >= 2, "nenhum dado apagado");
  const neg = (await admin.req("GET", "/api/auditoria?entidade=sistema")).j as { acao: string; resultado: string }[];
  assert.ok(neg.some((e) => e.acao === "DEMONSTRACAO_RESTAURADA" && e.resultado === "NEGADO"), "tentativa auditada");
});

test("anexos: conteúdo verificado, limites, e acesso apenas a quem pode ver a ocorrência", { skip: pular }, async () => {
  const falso = await lider1.req("POST", "/api/anexos", { nome: "x.jpg", tipo: "image/jpeg", dados: Buffer.from("<html>").toString("base64") });
  assert.equal(falso.s, 400);
  const png = await lider1.req("POST", "/api/anexos", { nome: "x.png", tipo: "image/png", dados: JPEG });
  assert.equal(png.s, 400);
  const grande = await lider1.req("POST", "/api/anexos", JSON.stringify({ tipo: "image/jpeg", dados: "A".repeat(7 * 1024 * 1024) }));
  assert.equal(grande.s, 413);
  assert.equal((await ger.req("POST", "/api/anexos", { tipo: "image/jpeg", dados: JPEG })).s, 403, "gerente não envia fotos");

  const foto = await lider1.req("POST", "/api/anexos", { nome: "f.jpg", tipo: "image/jpeg", largura: 9999, altura: 9999, dados: JPEG });
  assert.equal(foto.s, 201, JSON.stringify(foto.j));
  assert.equal(foto.j.largura, 20, "dimensões lidas do arquivo");
  assert.equal((await lider2.req("GET", `/api/anexos/${foto.j.id}`)).s, 404, "foto pendente de outro usuário");
  // Outro líder tenta usar a foto pendente de Lia na própria ocorrência.
  assert.equal((await lider2.req("POST", "/api/ocorrencias", ocorrencia({ anexos: [foto.j] }))).s, 400);

  const o = await lider1.req("POST", "/api/ocorrencias", ocorrencia({ anexos: [foto.j] }));
  assert.equal(o.s, 201, JSON.stringify(o.j));
  const img = await fetch(`${BASE}/api/anexos/${foto.j.id}`, { headers: { cookie: lider1.cookie } });
  assert.equal(img.status, 200);
  assert.ok(!Buffer.from(await img.arrayBuffer()).toString("latin1").includes("GPS"), "metadados removidos");
  assert.equal((await lider2.req("GET", `/api/anexos/${foto.j.id}`)).s, 404);
  assert.equal((await porteiro.req("GET", `/api/anexos/${foto.j.id}`)).s, 404);
  assert.equal((await ger.req("GET", `/api/anexos/${foto.j.id}`)).s, 200);
  assert.equal((await lider1.req("GET", "/api/anexos/nao-e-uuid")).s, 404);
});

test("carta de notificação/multa: só Administração/Admin Geral; texto do servidor; emissão auditada", { skip: pular }, async () => {
  const o = (await adm.req("GET", `/api/ocorrencias/${ids.oc}`)).j;
  assert.equal(o.providencia?.tipo, "NOTIFICADO");
  for (const c of [lider1, ger, porteiro]) assert.equal((await c.req("POST", `/api/ocorrencias/${o.id}/carta`)).s, 403);
  const r = await adm.req("POST", `/api/ocorrencias/${o.id}/carta`);
  assert.equal(r.s, 200, JSON.stringify(r.j));
  assert.equal(r.j.titulo, "NOTIFICAÇÃO");
  assert.ok(r.j.paragrafos.join(" ").includes("21/10/2026 a 31/10/2026"));
  const semProvidencia = await adm.req("POST", `/api/ocorrencias/${ids.ocLeo}/carta`);
  assert.equal(semProvidencia.s, 400, "sem providência não há carta");
  const aud = (await ger.req("GET", `/api/auditoria?entidade=ocorrencia&id=${o.id}`)).j as { acao: string }[];
  assert.ok(aud.some((e) => e.acao === "CARTA_EMITIDA"));
});

test("fila offline: reenvio não duplica; data do preenchimento aceita até 7 dias; relógio adiantado recusado", { skip: pular }, async () => {
  const idCliente = "8f0c3f4e-1d2b-4c5a-9e7f-0a1b2c3d4e5f";
  const ontem = new Date(Date.now() - 26 * 3600_000).toISOString();
  const corpo = ocorrencia({ ocorrencia: "Registro offline", fundamentacaoPrincipal: undefined, idCliente, registradoOfflineEm: ontem });
  const a = await lider1.req("POST", "/api/ocorrencias", corpo);
  assert.equal(a.s, 201, JSON.stringify(a.j));
  assert.equal(a.j.registradoOfflineEm, ontem);
  const esperado = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date(ontem));
  assert.equal(a.j.data, esperado, "data do relatório = dia do preenchimento (fuso de São Paulo)");
  const b = await lider1.req("POST", "/api/ocorrencias", corpo);
  assert.equal(b.j.id, a.j.id, "mesmo idCliente devolve o mesmo relatório");
  assert.equal((await lider1.req("GET", "/api/ocorrencias?busca=Registro%20offline")).j.total, 1);
  // Outro usuário com o mesmo idCliente não "pega" o relatório de Lia.
  const c = await lider2.req("POST", "/api/ocorrencias", corpo);
  assert.notEqual(c.j.id, a.j.id);
  const velho = await lider1.req("POST", "/api/ocorrencias", ocorrencia({ registradoOfflineEm: new Date(Date.now() - 8 * 86_400_000).toISOString() }));
  assert.equal(velho.s, 400);
  const futuro = await lider1.req("POST", "/api/ocorrencias", ocorrencia({ registradoOfflineEm: new Date(Date.now() + 3600_000).toISOString() }));
  assert.equal(futuro.s, 400);
});


test("sessões: token forjado, usuário desativado, senha redefinida e CSRF", { skip: pular }, async () => {
  assert.equal((await http("GET", "/api/ocorrencias", undefined, { cookie: "sessao=eyJ1IjoieCJ9.AAAA" })).s, 401);

  const sessaoPedro = porteiro.cookie;
  const d = await adm.req("PUT", `/api/usuarios/${ids["pedro.e2e"]}`, { nome: "Pedro Porteiro", login: "pedro.e2e", perfil: "PORTEIRO", ativo: false });
  assert.equal(d.s, 200, JSON.stringify(d.j));
  assert.equal((await http("GET", "/api/ocorrencias", undefined, { cookie: sessaoPedro })).s, 401, "desativado perde o acesso na hora");
  assert.equal((await http("POST", "/api/auth/login", { login: "pedro.e2e", senha: NOVA("pedro.e2e") })).s, 401);

  const sessaoLeo = lider2.cookie;
  const reset = await adm.req("PUT", `/api/usuarios/${ids["leo.e2e"]}`, { nome: "Leo Líder", login: "leo.e2e", perfil: "LIDER", ativo: true, senha: "Redefinida-Leo-2026" });
  assert.equal(reset.s, 200);
  assert.equal((await http("GET", "/api/ocorrencias", undefined, { cookie: sessaoLeo })).s, 401, "redefinir a senha encerra a sessão");
  const leo = await entrar("leo.e2e", "Redefinida-Leo-2026");
  assert.equal((await leo.req("GET", "/api/ocorrencias")).j.codigo, "TROCAR_SENHA", "senha redefinida é provisória");

  const csrf = await http("POST", "/api/ocorrencias", ocorrencia(), { cookie: lider1.cookie, origin: "https://site-malicioso.example" });
  assert.equal(csrf.s, 403);
  const semOrigem = await fetch(`${BASE}/api/ocorrencias`, { method: "POST", headers: { cookie: lider1.cookie, "Content-Type": "application/json" }, body: "{}" });
  assert.equal(semOrigem.status, 403, "sem cabeçalho Origin também é recusado");
});

test("respostas de erro não expõem detalhes internos", { skip: pular }, async () => {
  const r = await adm.req("PUT", `/api/ocorrencias/${ids.oc}`, "{nao-json");
  assert.equal(r.s, 400);
  assert.ok(!JSON.stringify(r.j).match(/stack|at \/|node_modules|SELECT|postgres/i));
  const saude = await http("GET", "/api/saude");
  assert.equal(saude.s, 200);
  assert.ok(!JSON.stringify(saude.j).includes("postgresql://"));
});
