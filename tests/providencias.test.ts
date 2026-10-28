import { test } from "node:test";
import assert from "node:assert/strict";
import { pode, perfisGerenciaveis, podeVerOcorrencia, normalizarPerfil } from "../src/lib/permissoes";
import { alertasPrazo, buscarReincidencias, multaMaxima, prazoRecurso, somarDias, statusDaOcorrencia } from "../src/lib/providencia";
import { validarProvidencia, ErroValidacao } from "../src/server/validacao";
import { ocorrenciasDemonstrativas } from "../src/data/demonstracao";
import type { Ocorrencia } from "../src/lib/types";

const adm = { id: "u1", nome: "Administração" };

test("permissões: líderes, porteiros e rondas somente geram relatórios", () => {
  for (const p of ["LIDER", "PORTEIRO", "RONDA"] as const) {
    assert.ok(pode(p, "registrar"));
    for (const a of ["verTodas", "decidir", "editarOcorrencia", "excluir", "painel", "usuarios", "baseNormativa", "configuracoes"] as const) {
      assert.equal(pode(p, a), false, `${p} não deveria poder ${a}`);
    }
  }
});

test("permissões: gerente só visualiza; administração decide e cria logins operacionais; admin geral tudo", () => {
  assert.ok(pode("GERENTE", "verTodas") && pode("GERENTE", "painel"));
  assert.ok(!pode("GERENTE", "decidir") && !pode("GERENTE", "registrar") && !pode("GERENTE", "editarOcorrencia") && !pode("GERENTE", "usuarios"));
  assert.ok(pode("ADMINISTRACAO", "decidir") && pode("ADMINISTRACAO", "usuarios"));
  assert.ok(!pode("ADMINISTRACAO", "excluir") && !pode("ADMINISTRACAO", "configuracoes"));
  assert.deepEqual(perfisGerenciaveis("ADMINISTRACAO"), ["LIDER", "PORTEIRO", "RONDA"]);
  assert.equal(perfisGerenciaveis("GERENTE").length, 0);
  assert.equal(perfisGerenciaveis("ADMIN_GERAL").length, 6);
  assert.ok(pode("ADMIN_GERAL", "excluir") && pode("ADMIN_GERAL", "configuracoes"));
  assert.equal(normalizarPerfil("ADMIN"), "ADMIN_GERAL");
  assert.equal(normalizarPerfil("PRESENCA"), "LIDER");
});

test("visibilidade: operacional vê apenas os próprios relatórios", () => {
  const lider = { id: "l1", perfil: "LIDER" as const };
  assert.ok(podeVerOcorrencia(lider, { registradoPor: { id: "l1", nome: "A" } }));
  assert.ok(!podeVerOcorrencia(lider, { registradoPor: { id: "l2", nome: "B" } }));
  assert.ok(!podeVerOcorrencia(lider, {}));
  assert.ok(podeVerOcorrencia({ id: "g", perfil: "GERENTE" }, { registradoPor: { id: "l2", nome: "B" } }));
});

test("providência: notificação exige período de esclarecimento e detalhes do resultado", () => {
  assert.throws(() => validarProvidencia({ tipo: "NOTIFICADO", descricao: "x" }, { usuario: adm, valorTaxa: 0 }), ErroValidacao);
  assert.throws(
    () => validarProvidencia({ tipo: "NOTIFICADO", descricao: "x", esclarecimentoInicio: "2026-10-10", esclarecimentoFim: "2026-10-05" }, { usuario: adm, valorTaxa: 0 }),
    /posterior/,
  );
  assert.throws(
    () => validarProvidencia({ tipo: "NOTIFICADO", descricao: "x", esclarecimentoInicio: "2026-10-01", esclarecimentoFim: "2026-10-10", esclarecimentoResultado: "ESCLARECEU" }, { usuario: adm, valorTaxa: 0 }),
    /Descreva/,
  );
  const p = validarProvidencia(
    { tipo: "NOTIFICADO", descricao: "Entregue", esclarecimentoInicio: "2026-10-01", esclarecimentoFim: "2026-10-10", dataRecebimento: "2026-10-01" },
    { usuario: adm, valorTaxa: 0 },
  );
  assert.equal(p.esclarecimentoResultado, "PENDENTE");
  assert.equal(p.decididoPor.id, "u1");
  assert.equal(prazoRecurso(p), "2026-10-31");
  assert.equal(statusDaOcorrencia({ providencia: p }), "NOTIFICADA");
  assert.equal(statusDaOcorrencia({ providencia: { ...p, esclarecimentoResultado: "NAO_ESCLARECEU" } }), "CONCLUIDA");
});

test("providência: multa de até uma taxa, dobrada na reincidência (RI XV 2.3 e 2.4)", () => {
  const ctx = { usuario: adm, valorTaxa: 400 };
  assert.equal(multaMaxima(400, false), 400);
  assert.equal(multaMaxima(400, true), 800);
  assert.equal(multaMaxima(0, true), undefined);
  assert.throws(() => validarProvidencia({ tipo: "MULTADO", descricao: "x", multaValor: "450,00" }, ctx), /até uma taxa/);
  const p = validarProvidencia({ tipo: "MULTADO", descricao: "x", multaValor: "800,00", reincidente: true }, ctx);
  assert.equal(p.multaValor, 800);
  assert.equal(statusDaOcorrencia({ providencia: p }), "MULTADA");
  assert.throws(() => validarProvidencia({ tipo: "MULTADO", descricao: "x", multaValor: "" }, ctx), /valor da multa/);
  assert.throws(() => validarProvidencia({ tipo: "OUTRO", descricao: "x" }, ctx), /Selecione/);
});

test("providência: mantém quem decidiu quando o tipo não muda", () => {
  const anterior = validarProvidencia({ tipo: "ARQUIVADO", descricao: "a" }, { usuario: adm, valorTaxa: 0 });
  const outro = { id: "u2", nome: "Outra" };
  assert.equal(validarProvidencia({ tipo: "ARQUIVADO", descricao: "b" }, { usuario: outro, valorTaxa: 0, anterior }).decididoPor.id, "u1");
  assert.equal(validarProvidencia({ tipo: "MULTADO", descricao: "b", multaValor: 10 }, { usuario: outro, valorTaxa: 0, anterior }).decididoPor.id, "u2");
});

test("status: sem providência depende da fundamentação e preserva situações antigas", () => {
  assert.equal(statusDaOcorrencia({ fundamentacaoPrincipal: {} }), "REGISTRADA");
  assert.equal(statusDaOcorrencia({}), "AGUARDANDO_ANALISE");
  assert.equal(statusDaOcorrencia({ status: "CONCLUIDA" }), "CONCLUIDA");
});

test("reincidência: mesmo imóvel e mesma norma em 12 meses", () => {
  const demo = ocorrenciasDemonstrativas().map((o, i) => ({ ...o, id: `d${i}`, protocolo: "" })) as Ocorrencia[];
  const atual = demo.find((o) => o.nome === "Cristiane Fregonezi" && !o.providencia)!;
  const r = buscarReincidencias(atual, demo);
  assert.equal(r.length, 1);
  assert.equal(r[0].quadra, "09");
  // fora do prazo de 12 meses não conta
  const antiga = { ...r[0], id: "x", data: somarDias(atual.data, -400) };
  assert.equal(buscarReincidencias(atual, [antiga]).length, 0);
  // norma diferente não conta
  assert.equal(buscarReincidencias({ ...atual, fundamentacaoPrincipal: demo.find((o) => o.ocorrencia === "Queimada")!.fundamentacaoPrincipal }, demo).length, 0);
});

test("alertas de prazo", () => {
  const p = validarProvidencia(
    { tipo: "NOTIFICADO", descricao: "x", esclarecimentoInicio: "2026-10-01", esclarecimentoFim: "2026-10-10", dataRecebimento: "2026-10-01" },
    { usuario: adm, valorTaxa: 0 },
  );
  assert.deepEqual(alertasPrazo({ providencia: p }, "2026-10-12").map((a) => a.tipo), ["esclarecimento-vencido", "recurso-aberto"]);
  assert.deepEqual(alertasPrazo({ providencia: p }, "2026-10-09").map((a) => a.tipo), ["esclarecimento-vencendo", "recurso-aberto"]);
  assert.deepEqual(alertasPrazo({ providencia: p }, "2026-11-05"), [{ tipo: "esclarecimento-vencido", dias: 26 }]);
});
