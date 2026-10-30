import { test } from "node:test";
import assert from "node:assert/strict";
import { NORMAS_ORIGINAIS, NORMAS_ATAS } from "../src/data/normas";
import { analisarOcorrencia } from "../src/lib/analysis/engine";
import { citacaoCompleta, citacaoCurta, criarSnapshot, rotuloSecao } from "../src/lib/citacao";
import { compararNormas } from "../src/lib/ordenacao";
import { paragrafoPrincipal } from "../src/lib/relatorio";
import { montarCarta } from "../src/lib/carta";
import { validarNorma, validarOcorrencia, ErroValidacao } from "../src/server/validacao";
import { CONFIGURACOES_PADRAO, type Ocorrencia } from "../src/lib/types";

const ATA = NORMAS_ORIGINAIS.find((n) => n.id === "ATA-2022-06-26-1")!;
const ctx = { horario: "23:30", tratamento: "Associado" as const };

test("ata AGE 26/06/2022: transcrição literal da deliberação e dados de identificação", () => {
  assert.ok(ATA, "a ata faz parte da base original");
  assert.equal(ATA.documento, "ATA");
  assert.equal(ATA.secaoNumero, "26/06/2022");
  assert.equal(ATA.item, "1");
  assert.ok(ATA.aplicavelOcorrencias && ATA.ativo);
  for (const trecho of [
    "tivemos 10 votos para sim, tivemos 141 não",
    "atingiu o quórum qualificado de 82%",
    "passa a proibir a locação não residencial tipo “Airbnb” e assemelhados e de forma particular",
    "será aplicado multas progressivas conforme previsto no Regulamento Interno e Estatuto Social.",
  ]) {
    assert.ok(ATA.texto.includes(trecho), `trecho literal: ${trecho}`);
  }
  assert.deepEqual(NORMAS_ATAS.map((n) => n.id), ["ATA-2022-06-26-1"]);
});

test("ata: citações completa, curta e da seção", () => {
  assert.equal(
    citacaoCompleta(ATA),
    "deliberação do item 1 da Ordem do Dia (Permissão ou Proibição da Locação não residencial Tipo “Airbnb”) da Assembleia Geral Extraordinária de 26/06/2022",
  );
  assert.equal(citacaoCurta(ATA), "AGE 26/06/2022, item 1");
  assert.equal(rotuloSecao(ATA), "Ata da Assembleia Geral Extraordinária de 26/06/2022");
});

test("ata: parágrafo do relatório usa 'a deliberação' e a complementar do Estatuto mantém 'o Artigo'", () => {
  const es11b = NORMAS_ORIGINAIS.find((n) => n.id === "ES-11-b")!;
  const p = paragrafoPrincipal({
    tratamento: "Associado",
    fundamentacaoPrincipal: criarSnapshot(ATA, "AUTOMATICA", "ALTA"),
    fundamentacaoComplementar: criarSnapshot(es11b, "AUTOMATICA", "MEDIA"),
  });
  assert.ok(p.startsWith("Informo que o associado citado acima descumpriu a deliberação do item 1 da Ordem do Dia"), p);
  assert.ok(p.includes(", bem como o Artigo 11, alínea \"b\", do Estatuto Social"), p);
  assert.ok(!p.includes("o deliberação") && !p.includes("o a "), p);
});

test("análise: locação por plataforma/temporada aponta a deliberação; locação comum continua nas regras gerais", async () => {
  for (const t of ["Imóvel alugado pelo Airbnb", "Casa alugada por temporada no fim de semana", "Locação pelo Booking", "Hóspedes de aluguel por diária"]) {
    const r = await analisarOcorrencia(t, NORMAS_ORIGINAIS, ctx);
    assert.equal(r.principal?.norma.id, ATA.id, t);
    assert.equal(r.principal?.confianca, "ALTA", t);
    assert.equal(r.complementarSugerida?.norma.id, "ES-11-b", "sugere o dever de acatar deliberações de Assembleia");
  }
  const inquilino = await analisarOcorrencia("Inquilino novo sem cadastro", NORMAS_ORIGINAIS, ctx);
  assert.notEqual(inquilino.principal?.norma.id, ATA.id);
  const misto = await analisarOcorrencia("Chácara anunciada no airbnb para festa", NORMAS_ORIGINAIS, ctx);
  assert.equal(misto.ambiguo, true, "Airbnb + festa: duas regras possíveis, a pessoa escolhe");
  // Desativada, a deliberação nunca é sugerida.
  const sem = await analisarOcorrencia("Imóvel alugado pelo Airbnb", NORMAS_ORIGINAIS.map((n) => (n.id === ATA.id ? { ...n, ativo: false } : n)), ctx);
  assert.notEqual(sem.principal?.norma.id, ATA.id);
});

test("ata: relatório validado no servidor cita o texto da base e a carta usa 'na deliberação'", async () => {
  const v = validarOcorrencia(
    { horario: "23:30", data: "2026-10-30", ocorrencia: "Imóvel alugado pelo Airbnb", nome: "Fulano", tratamento: "Associado", quadra: "11", lote: "8", fundamentacaoPrincipal: { normaId: ATA.id } },
    NORMAS_ORIGINAIS,
  );
  assert.equal(v.fundamentacaoPrincipal?.texto, ATA.texto);
  const o = { ...v, id: "x", criadoEm: "", atualizadoEm: "", providencia: { tipo: "MULTADO", descricao: "", decididoEm: "", decididoPor: { id: "a", nome: "A" }, multaValor: 500 } } as Ocorrencia;
  const carta = montarCarta(o, CONFIGURACOES_PADRAO, NORMAS_ORIGINAIS, "2026-10-30");
  assert.ok(carta.paragrafos[0].includes("descumprimento do disposto na deliberação do item 1"), carta.paragrafos[0]);
  assert.ok(carta.dispositivos.some((d) => d.texto === ATA.texto));
});

test("ata: cadastro de novas atas pela tela exige data DD/MM/AAAA; ordenação cronológica após Regulamento e Estatuto", () => {
  const base = { id: "ATA-2023-03-01-1", documento: "ATA", secaoTitulo: "ASSEMBLEIA GERAL ORDINÁRIA", item: "1", itemTitulo: "Assunto", texto: "Texto da ata." };
  assert.equal(validarNorma({ ...base, secaoNumero: "01/03/2023" }).documento, "ATA");
  assert.throws(() => validarNorma({ ...base, secaoNumero: "2023-03-01" }), ErroValidacao);
  assert.throws(() => validarNorma({ ...base, documento: "OUTRO", secaoNumero: "01/03/2023" }), ErroValidacao);
  const outra = { ...ATA, id: "ATA-2021-01-10-1", secaoNumero: "10/01/2021" };
  const ordem = [ATA, outra, NORMAS_ORIGINAIS[0], NORMAS_ORIGINAIS.find((n) => n.documento === "ESTATUTO")!].sort(compararNormas);
  assert.deepEqual(ordem.map((n) => n.documento), ["REGULAMENTO", "ESTATUTO", "ATA", "ATA"]);
  assert.deepEqual(ordem.slice(2).map((n) => n.secaoNumero), ["10/01/2021", "26/06/2022"]);
});
