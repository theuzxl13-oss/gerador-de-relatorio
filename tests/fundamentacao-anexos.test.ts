import { test } from "node:test";
import assert from "node:assert/strict";
import { analisarOcorrencia, MENSAGEM_NAO_ENCONTRADO } from "../src/lib/analysis/engine";
import { NORMAS_ORIGINAIS } from "../src/data/normas";
import { criarSnapshot } from "../src/lib/citacao";
import { montarRelatorio } from "../src/lib/relatorio";
import { CONFIGURACOES_PADRAO, type Norma, type Ocorrencia } from "../src/lib/types";
import { sugestoesDoServidor, validarOcorrencia, ErroValidacao } from "../src/server/validacao";
import { processarJpeg, ErroImagem } from "../src/server/imagem";

const ctx = { horario: "23:00", tratamento: "Associado" as const };
const base = { horario: "10:00", data: "2026-10-20", ocorrencia: "Som alto", nome: "Fulano", tratamento: "Associado", quadra: "9", lote: "8" };
const por = { id: "u1", nome: "Líder" };

// ───────── Motor de análise: válido, ambíguo, com erro de digitação, sem correspondência ─────────

test("análise: caso claro tem sugestão de confiança alta e não é ambíguo", async () => {
  const r = await analisarOcorrencia("Cachorro solto sem guia", NORMAS_ORIGINAIS, ctx);
  assert.equal(r.encontrado, true);
  assert.equal(r.principal?.norma.id, "RI-III-4");
  assert.equal(r.principal?.confianca, "ALTA");
  assert.equal(r.ambiguo, false);
});

test("análise: erro de digitação com várias regras empatadas é sinalizado como ambíguo", async () => {
  const r = await analisarOcorrencia("cachoro solto na rua", NORMAS_ORIGINAIS, ctx);
  assert.equal(r.ambiguo, true);
  assert.ok(r.alertas.some((a) => a.includes("Mais de uma regra")));
});

test("análise: texto sem correspondência e texto vazio não sugerem norma", async () => {
  for (const t of ["xyz qwerty", ""]) {
    const r = await analisarOcorrencia(t, NORMAS_ORIGINAIS, ctx);
    assert.equal(r.encontrado, false);
    assert.equal(r.principal, undefined);
    assert.equal(r.ambiguo, false);
  }
  assert.ok(MENSAGEM_NAO_ENCONTRADO.includes("análise da Administração"));
});

test("análise: normas inativas nunca são sugeridas", async () => {
  const normas = NORMAS_ORIGINAIS.map((n) => (n.id === "RI-III-4" ? { ...n, ativo: false } : n));
  const r = await analisarOcorrencia("Cachorro solto sem guia", normas, ctx);
  assert.notEqual(r.principal?.norma.id, "RI-III-4");
  assert.ok(!r.candidatos.some((c) => c.norma.id === "RI-III-4"));
});

// ───────── Fundamentação validada no servidor ─────────

test("fundamentação: origem e confiança vêm do servidor, não do navegador", async () => {
  const body = { ...base, ocorrencia: "Som alto", fundamentacaoPrincipal: { normaId: "RI-II-8", origem: "MANUAL" } };
  const sug = await sugestoesDoServidor(body, NORMAS_ORIGINAIS);
  const v = validarOcorrencia(body, NORMAS_ORIGINAIS, undefined, por, sug);
  assert.equal(v.fundamentacaoPrincipal?.origem, "AUTOMATICA");
  assert.equal(v.fundamentacaoPrincipal?.confianca, "ALTA");
  assert.equal(v.fundamentacaoPrincipal?.confirmadoPor?.id, "u1");

  // O navegador declara "AUTOMATICA/ALTA" para uma norma que o motor não sugeriu: vira MANUAL.
  const forjado = { ...base, ocorrencia: "Som alto", fundamentacaoPrincipal: { normaId: "RI-XIV-2", origem: "AUTOMATICA", confianca: "ALTA" } };
  const v2 = validarOcorrencia(forjado, NORMAS_ORIGINAIS, undefined, por, await sugestoesDoServidor(forjado, NORMAS_ORIGINAIS));
  assert.equal(v2.fundamentacaoPrincipal?.origem, "MANUAL");
  assert.equal(v2.fundamentacaoPrincipal?.confianca, undefined);
});

test("fundamentação: texto e citação nunca vêm do navegador; norma inexistente ou inativa é recusada", () => {
  const v = validarOcorrencia({ ...base, fundamentacaoPrincipal: { normaId: "RI-II-8", texto: "INVENTADO", citacao: "Art. 999" } }, NORMAS_ORIGINAIS);
  const original = NORMAS_ORIGINAIS.find((n) => n.id === "RI-II-8")!;
  assert.equal(v.fundamentacaoPrincipal?.texto, original.texto);
  assert.ok(!v.fundamentacaoPrincipal?.citacao.includes("999"));
  assert.throws(() => validarOcorrencia({ ...base, fundamentacaoPrincipal: { normaId: "NAO-EXISTE" } }, NORMAS_ORIGINAIS), ErroValidacao);
  const inativas = NORMAS_ORIGINAIS.map((n) => (n.id === "RI-II-8" ? { ...n, ativo: false } : n));
  assert.throws(() => validarOcorrencia({ ...base, fundamentacaoPrincipal: { normaId: "RI-II-8" } }, inativas), /desativada/);
});

test("fundamentação: versão da norma e revisão pendente ficam registradas no snapshot", () => {
  const editada: Norma = { ...NORMAS_ORIGINAIS.find((n) => n.id === "RI-II-9")!, atualizadoEm: "2026-10-01T10:00:00.000Z" };
  assert.equal(editada.revisaoManual, true, "RI-II-9 está marcada para revisão manual na base");
  const s = criarSnapshot(editada, "MANUAL");
  assert.equal(s.normaVersao, "2026-10-01T10:00:00.000Z");
  assert.equal(s.revisaoPendente, true);
  assert.equal(criarSnapshot(NORMAS_ORIGINAIS.find((n) => n.id === "RI-II-8")!, "MANUAL").normaVersao, "original");
});

test("fundamentação histórica: edição posterior da norma não altera relatório já gerado nem o PDF", () => {
  const v = validarOcorrencia({ ...base, fundamentacaoPrincipal: { normaId: "RI-II-8" } }, NORMAS_ORIGINAIS);
  const o = { ...v, id: "x", criadoEm: "", atualizadoEm: "", incluirTextoNorma: true } as Ocorrencia;
  const normasEditadas = NORMAS_ORIGINAIS.map((n) => (n.id === "RI-II-8" ? { ...n, texto: "TEXTO NOVO" } : n));
  const reeditado = validarOcorrencia({ ...base, fundamentacaoPrincipal: { normaId: "RI-II-8" } }, normasEditadas, o);
  assert.equal(reeditado.fundamentacaoPrincipal, o.fundamentacaoPrincipal, "snapshot preservado");
  const rel = JSON.stringify(montarRelatorio({ ...o, ...reeditado }, CONFIGURACOES_PADRAO));
  assert.ok(!rel.includes("TEXTO NOVO"));
  assert.ok(rel.includes(o.fundamentacaoPrincipal!.citacao.slice(0, 20)) || rel.includes("Item 8"));
});

test("validação: campos obrigatórios e formatos (horário, data, tratamento, limite de fotos)", () => {
  assert.throws(() => validarOcorrencia({ ...base, horario: "25:99" }, NORMAS_ORIGINAIS), /Horário/);
  assert.throws(() => validarOcorrencia({ ...base, nome: "" }, NORMAS_ORIGINAIS), /Nome/);
  assert.throws(() => validarOcorrencia({ ...base, tratamento: "Rei" }, NORMAS_ORIGINAIS), /tratamento/);
  const fotos = Array.from({ length: 7 }, () => ({ id: "11111111-1111-4111-8111-111111111111" }));
  assert.throws(() => validarOcorrencia({ ...base, anexos: fotos }, NORMAS_ORIGINAIS), /Máximo/);
  // Sem fundamentação: encaminhada para análise.
  assert.equal(validarOcorrencia(base, NORMAS_ORIGINAIS).status, "AGUARDANDO_ANALISE");
});

// ───────── Fotos ─────────

const seg = (marcador: number, corpo: Buffer) => Buffer.concat([Buffer.from([0xff, marcador]), Buffer.from([(corpo.length + 2) >> 8, (corpo.length + 2) & 0xff]), corpo]);
function jpeg({ largura = 640, altura = 480, exif = true } = {}) {
  const sof = Buffer.from([8, altura >> 8, altura & 0xff, largura >> 8, largura & 0xff, 1, 1, 0x11, 0]);
  return Buffer.concat([
    Buffer.from([0xff, 0xd8]),
    seg(0xe0, Buffer.from("JFIF\0\x01\x01\0\0\x01\0\x01\0\0", "latin1")),
    ...(exif ? [seg(0xe1, Buffer.from("Exif\0\0GPS-LATITUDE-23.7", "latin1")), seg(0xfe, Buffer.from("comentario", "latin1"))] : []),
    seg(0xc0, sof),
    seg(0xda, Buffer.from([1, 1, 0, 0, 0x3f, 0])),
    Buffer.from([0x12, 0x34, 0x56, 0xff, 0xd9]),
  ]);
}

test("fotos: JPEG válido tem dimensões lidas do arquivo e metadados (EXIF/GPS, comentários) removidos", () => {
  const r = processarJpeg(jpeg({ largura: 800, altura: 600 }));
  assert.equal(r.largura, 800);
  assert.equal(r.altura, 600);
  const txt = r.dados.toString("latin1");
  assert.ok(!txt.includes("GPS") && !txt.includes("Exif") && !txt.includes("comentario"));
  assert.ok(txt.includes("JFIF"));
  assert.ok(r.dados.subarray(-5).equals(Buffer.from([0x12, 0x34, 0x56, 0xff, 0xd9])), "dados da imagem preservados");
});

test("fotos: arquivos falsificados, truncados ou com dimensões absurdas são recusados", () => {
  assert.throws(() => processarJpeg(Buffer.from("<script>alert(1)</script>")), ErroImagem);
  assert.throws(() => processarJpeg(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0])), ErroImagem);
  assert.throws(() => processarJpeg(jpeg().subarray(0, 30)), ErroImagem);
  assert.throws(() => processarJpeg(jpeg({ largura: 60000, altura: 10 })), /Dimensões/);
  assert.throws(() => processarJpeg(Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0xff])), ErroImagem);
});
