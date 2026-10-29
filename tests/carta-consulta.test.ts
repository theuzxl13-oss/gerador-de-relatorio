import { test } from "node:test";
import assert from "node:assert/strict";
import { NORMAS_ORIGINAIS } from "../src/data/normas";
import { ocorrenciasDemonstrativas } from "../src/data/demonstracao";
import { montarCarta, ErroCarta, NORMAS_DA_CARTA } from "../src/lib/carta";
import { criarSnapshot } from "../src/lib/citacao";
import { correspondeFiltro, filtroDaUrl, paginar, estatisticas } from "../src/lib/consulta";
import { hojeISO, agoraHHMM } from "../src/lib/relatorio";
import { CONFIGURACOES_PADRAO, type Ocorrencia, type Providencia } from "../src/lib/types";

const norma = (id: string) => NORMAS_ORIGINAIS.find((n) => n.id === id)!;
const adm = { id: "a", nome: "Adm" };
const base = (p: Providencia, extra: Partial<Ocorrencia> = {}): Ocorrencia => ({
  id: "o1", protocolo: "2026-0007", data: "2026-10-20", horario: "22:30", ocorrencia: "Som alto", nome: "Cristiane Fregonezi",
  tratamento: "Associada", quadra: "9", lote: "8", incluirTextoNorma: false, status: "NOTIFICADA", criadoEm: "", atualizadoEm: "",
  fundamentacaoPrincipal: criarSnapshot(norma("RI-II-8"), "AUTOMATICA", "ALTA"), providencia: p, ...extra,
});
const notif: Providencia = { tipo: "NOTIFICADO", descricao: "interno", decididoEm: "", decididoPor: adm, esclarecimentoInicio: "2026-10-21", esclarecimentoFim: "2026-10-31" };
const multa: Providencia = { tipo: "MULTADO", descricao: "interno", decididoEm: "", decididoPor: adm, multaValor: 700, reincidente: true };

test("carta de notificação: cita a falta pelo relatório e o procedimento pela base, com período e recurso", () => {
  const c = montarCarta(base(notif), CONFIGURACOES_PADRAO, NORMAS_ORIGINAIS, "2026-10-21");
  const texto = c.paragrafos.join(" ");
  assert.equal(c.titulo, "NOTIFICAÇÃO");
  assert.ok(c.destinatario[0].startsWith("À Sra. Cristiane"));
  assert.ok(texto.includes("NOTIFICADA"));
  assert.ok(texto.includes("21/10/2026 a 31/10/2026"));
  assert.ok(texto.includes("Item 8 do tópico II"));
  assert.ok(texto.includes("2.2"), "cita o subitem 2.2 do tópico XV");
  assert.ok(texto.includes("30 (trinta) dias"));
  assert.ok(!texto.includes("interno"), "descrição interna da providência não vai para a carta");
  assert.ok(c.dispositivos.some((d) => d.texto === norma("RI-II-8").texto));
  assert.ok(c.dispositivos.some((d) => d.texto === norma(NORMAS_DA_CARTA.notificacao).texto));
  assert.deepEqual(c.avisos, []);
  assert.ok(c.localData.includes("21 de Outubro de 2026"));
});

test("carta de multa: valor, reincidência (2.4 e item 3) e cobrança com a taxa (Estatuto art. 58)", () => {
  const c = montarCarta(base(multa, { status: "MULTADA", tratamento: "Visitante" }), CONFIGURACOES_PADRAO, NORMAS_ORIGINAIS, "2026-10-21");
  const texto = c.paragrafos.join(" ");
  assert.equal(c.titulo, "NOTIFICAÇÃO DE MULTA");
  assert.ok(c.destinatario[0].startsWith("Ao(À) Sr(a)."), "gênero não informado");
  assert.ok(texto.includes("R$") && texto.includes("700,00"));
  assert.ok(texto.includes("reincidência"));
  for (const id of [NORMAS_DA_CARTA.multa, NORMAS_DA_CARTA.multaDobrada, NORMAS_DA_CARTA.reincidencia, NORMAS_DA_CARTA.cobranca, NORMAS_DA_CARTA.recurso]) {
    assert.ok(c.dispositivos.some((d) => d.texto === norma(id).texto), `transcreve ${id}`);
  }
});

test("carta: norma do procedimento ausente ou desativada é omitida com aviso, nunca inventada", () => {
  const semRecurso = NORMAS_ORIGINAIS.filter((n) => n.id !== NORMAS_DA_CARTA.recurso).map((n) => (n.id === NORMAS_DA_CARTA.notificacao ? { ...n, ativo: false } : n));
  const c = montarCarta(base(notif), CONFIGURACOES_PADRAO, semRecurso, "2026-10-21");
  const texto = c.paragrafos.join(" ");
  assert.ok(!texto.includes("recurso"), "sem a norma do recurso, a frase do recurso não aparece");
  assert.ok(!texto.includes("com fundamento no"), "sem a norma 2.2 ativa, não há citação dela");
  assert.equal(c.avisos.length, 2);
  assert.ok(!c.dispositivos.some((d) => d.texto === norma(NORMAS_DA_CARTA.recurso).texto));
});

test("carta: recusada sem providência válida, sem fundamentação, sem período ou sem valor", () => {
  assert.throws(() => montarCarta(base({ ...notif, tipo: "ARQUIVADO" }), CONFIGURACOES_PADRAO, NORMAS_ORIGINAIS, "2026-10-21"), ErroCarta);
  assert.throws(() => montarCarta({ ...base(notif), providencia: undefined }, CONFIGURACOES_PADRAO, NORMAS_ORIGINAIS, "2026-10-21"), ErroCarta);
  assert.throws(() => montarCarta(base(notif, { fundamentacaoPrincipal: undefined }), CONFIGURACOES_PADRAO, NORMAS_ORIGINAIS, "2026-10-21"), /fundamentação/);
  assert.throws(() => montarCarta(base({ ...notif, esclarecimentoFim: undefined }), CONFIGURACOES_PADRAO, NORMAS_ORIGINAIS, "2026-10-21"), /período/);
  assert.throws(() => montarCarta(base({ ...multa, multaValor: undefined }), CONFIGURACOES_PADRAO, NORMAS_ORIGINAIS, "2026-10-21"), /valor/);
});

test("carta: fundamentação histórica do relatório é usada mesmo que a base tenha mudado", () => {
  const editadas = NORMAS_ORIGINAIS.map((n) => (n.id === "RI-II-8" ? { ...n, texto: "TEXTO NOVO" } : n));
  const c = montarCarta(base(notif), CONFIGURACOES_PADRAO, editadas, "2026-10-21");
  assert.ok(c.dispositivos.some((d) => d.texto === norma("RI-II-8").texto));
  assert.ok(!c.dispositivos.some((d) => d.texto === "TEXTO NOVO"));
});

test("consulta: filtros da URL validados e registradoPor nunca aceito da URL", () => {
  const { filtro, pagina, porPagina } = filtroDaUrl(new URLSearchParams("busca=som&de=2026-13&ate=2026-10-31&status=X&documento=SEM&registradoPor=x&pagina=-3&porPagina=5000&pendentes=1"));
  assert.equal(filtro.busca, "som");
  assert.equal(filtro.de, undefined);
  assert.equal(filtro.ate, "2026-10-31");
  assert.equal(filtro.status, undefined);
  assert.equal(filtro.documento, "SEM");
  assert.equal(filtro.registradoPor, undefined);
  assert.equal(filtro.pendentes, true);
  assert.equal(pagina, 1);
  assert.equal(porPagina, 100);
});

test("consulta: busca sem acentos, quadra/lote sem zeros, paginação e estatísticas", () => {
  const demo = ocorrenciasDemonstrativas().map((o, i) => ({ ...o, id: `d${i}`, protocolo: `P${i}` })) as Ocorrencia[];
  assert.ok(demo.filter((o) => correspondeFiltro(o, { busca: "PERTURBACAO" })).length >= 2);
  assert.ok(demo.filter((o) => correspondeFiltro(o, { quadra: "009", lote: "8" })).every((o) => o.quadra === "09" && o.lote === "08"));
  const p = paginar(demo, {}, 2, 3);
  assert.equal(p.itens.length, 3);
  assert.equal(p.total, demo.length);
  const e = estatisticas(demo, demo[demo.length - 1].data);
  assert.equal(e.total, demo.length);
  assert.ok(e.frequentes[0].n >= 2);
});

test("datas no fuso de São Paulo, independentemente do fuso do servidor", () => {
  // 02:30 UTC de 30/10 ainda é 29/10 às 23:30 em São Paulo.
  const d = new Date("2026-10-30T02:30:00Z");
  assert.equal(hojeISO(d), "2026-10-29");
  assert.equal(agoraHHMM(d), "23:30");
});
