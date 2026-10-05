import { test } from "node:test";
import assert from "node:assert/strict";
import { analisarOcorrencia, obraPermitida } from "../src/lib/analysis/engine";
import { NORMAS_ORIGINAIS } from "../src/data/normas";
import { citacaoCompleta, criarSnapshot } from "../src/lib/citacao";
import { dataPorExtenso, linhaLocalData, paragrafoPrincipal, proximoProtocolo, sujeito, textoQuadraLote } from "../src/lib/relatorio";

const norma = (id: string) => NORMAS_ORIGINAIS.find((n) => n.id === id)!;
const analisar = (texto: string, horario = "10:00", data = "2026-10-05") =>
  analisarOcorrencia(texto, NORMAS_ORIGINAIS, { horario, data, tratamento: "Associado" });

test("base normativa: ids únicos e numeração não misturada", () => {
  const ids = NORMAS_ORIGINAIS.map((n) => n.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const n of NORMAS_ORIGINAIS) {
    if (n.documento === "ESTATUTO") assert.ok(n.artigo && !n.item && !n.subitem, n.id);
    else assert.ok(!n.artigo && !n.alinea, n.id);
  }
});

const ESPERADOS: [string, string, string?][] = [
  ["Perturbação de sossego", "RI-II-8"],
  ["som muito alto depois das 22 horas", "RI-II-8", "23:10"],
  ["Material de construção na calçada", "RI-IX-7"],
  ["material na calçada", "RI-IX-7"],
  ["Entulho em área comum", "RI-III-11"],
  ["jogou entulho na rua", "RI-III-3"],
  ["deixou areia na rua", "RI-III-3"],
  ["Obra fora do horário permitido", "RI-IX-6", "19:30"],
  ["Veículo em alta velocidade", "RI-III-5"],
  ["Queimada", "RI-XIV-2"],
  ["Descarte irregular de lixo", "RI-V"],
  ["Animal causando transtorno", "RI-III-4"],
  ["Construção irregular", "RI-III-13"],
  ["soltou balão", "RI-XIV-3"],
];

for (const [texto, id, horario] of ESPERADOS) {
  test(`análise: "${texto}" → ${id}`, async () => {
    const r = await analisar(texto, horario);
    assert.equal(r.encontrado, true);
    assert.equal(r.principal?.norma.id, id);
    assert.notEqual(r.principal?.confianca, "BAIXA");
  });
}

for (const texto of ["Piscina suja", "mato alto no terreno", "xyz"]) {
  test(`análise: "${texto}" não inventa fundamentação`, async () => {
    const r = await analisar(texto);
    assert.equal(r.encontrado, false);
    assert.equal(r.principal, undefined);
  });
}

test("análise: toda norma sugerida existe na base", async () => {
  for (const [texto] of ESPERADOS) {
    const r = await analisar(texto);
    for (const c of r.candidatos) assert.ok(NORMAS_ORIGINAIS.includes(c.norma));
  }
});

test("análise: obra dentro do horário gera alerta", async () => {
  const r = await analisar("barulho de obra com betoneira", "10:00", "2026-10-05"); // segunda-feira
  assert.ok(r.alertas.some((a) => a.includes("DENTRO do horário permitido")) || r.principal?.norma.id !== "RI-IX-6");
});

test("horário de obras (IX, item 6)", () => {
  assert.equal(obraPermitida(1, 7 * 60), true);
  assert.equal(obraPermitida(5, 18 * 60 + 1), false);
  assert.equal(obraPermitida(6, 14 * 60), true);
  assert.equal(obraPermitida(6, 15 * 60), false);
  assert.equal(obraPermitida(0, 10 * 60), false);
});

test("citações", () => {
  assert.equal(citacaoCompleta(norma("RI-II-8")), "Item 8 do tópico II – DOS DEVERES DOS ASSOCIADOS do Regulamento Interno");
  assert.equal(citacaoCompleta(norma("RI-VII-1.2.7")), "Subitem 1.2.7 do tópico VII – DAS ÁREAS DE LAZER do Regulamento Interno");
  assert.equal(citacaoCompleta(norma("RI-V")), "tópico V – DA COLETA DO LIXO do Regulamento Interno");
  assert.equal(citacaoCompleta(norma("ES-11-a")), 'Artigo 11, alínea "a", do Estatuto Social');
  assert.equal(citacaoCompleta(norma("ES-58-p2")), "Artigo 58, Parágrafo Segundo, do Estatuto Social");
});

test("data por extenso", () => {
  assert.equal(dataPorExtenso("2026-10-05"), "05 de Outubro de 2026");
  assert.equal(linhaLocalData("Embu-Guaçu", "2026-01-01"), "Embu-Guaçu, 01 de Janeiro de 2026.");
  assert.equal(dataPorExtenso("2026-03-15"), "15 de Março de 2026");
});

test("texto adaptado ao tratamento", () => {
  assert.equal(sujeito("Associado"), "o associado citado acima");
  assert.equal(sujeito("Associada"), "a associada citada acima");
  assert.equal(sujeito("Funcionária"), "a funcionária citada acima");
  assert.equal(sujeito("Visitante", "F"), "a visitante citada acima");
  assert.equal(sujeito("Visitante"), "o(a) visitante citado(a) acima");
  assert.equal(sujeito("Outro", "M", "Prestador de serviço"), "o prestador de serviço citado acima");
});

test("parágrafo do relatório", () => {
  const p = paragrafoPrincipal({ tratamento: "Associada", fundamentacaoPrincipal: criarSnapshot(norma("RI-II-8"), "AUTOMATICA", "ALTA") });
  assert.equal(p, "Informo que a associada citada acima descumpriu o Item 8 do tópico II – DOS DEVERES DOS ASSOCIADOS do Regulamento Interno, conforme ocorrência descrita acima.");
  const sem = paragrafoPrincipal({ tratamento: "Associado" });
  assert.ok(sem.includes("análise da Administração") && !sem.includes("Item"));
});

test("quadra e lote", () => {
  assert.equal(textoQuadraLote("9", "8"), "Q=09 L=08");
  assert.equal(textoQuadraLote("12", "04"), "Q=12 L=04");
});

test("protocolo anual", () => {
  assert.equal(proximoProtocolo(2026, []), "2026-0001");
  assert.equal(proximoProtocolo(2026, ["2026-0001", "2026-0002", "2025-0090"]), "2026-0003");
  assert.equal(proximoProtocolo(2027, ["2026-0150"]), "2027-0001");
});
