/**
 * ESTATUTO SOCIAL DA ASSOCIAÇÃO DOS ADQUIRENTES DE UNIDADES NO
 * EMPREENDIMENTO FAZENDA DA ILHA
 *
 * Fonte: "ESTATUTO_Fazenda da Ilha (2) (1).pdf" — Anexo I da Assembléia Geral
 * Extraordinária de 26/10/2008, com a redação consolidada, alterada na
 * Assembléia Geral Extraordinária de 25/01/2009.
 *
 * O PDF contém carimbos de registro (Registro Civil de Pessoas Jurídicas de
 * Itapecerica da Serra) sobrepostos ao texto em várias páginas. Os trechos
 * afetados estão marcados com "[trecho ilegível no PDF]" ou
 * "[leitura incerta: ...]" e a norma recebe `revisaoManual: true`.
 * Nenhum trecho ilegível foi completado por suposição.
 *
 * Artigos institucionais (administração, assembleias etc.) ficam cadastrados
 * para consulta com `aplicavelOcorrencias: false` e não são sugeridos
 * automaticamente como fundamentação de ocorrências.
 */
import type { Norma } from "@/lib/types";
import type { SecaoDocumento } from "./regulamento";

export const ESTATUTO_CABECALHO =
  "Anexo I da Assembléia Geral Extraordinária de 26/10/2008, com a redação consolidada, alterada na Assembléia Geral Extraordinaria de 25/01/2009.";

export const CAPITULOS_ESTATUTO: SecaoDocumento[] = [
  { numero: "I", titulo: "Da Denominação social, sede, foro, objeto e prazo de duração" },
  { numero: "II", titulo: "Do Quadro Social" },
  { numero: "III", titulo: "Dos Direitos, Deveres e Impedimentos dos Associados" },
  { numero: "IV", titulo: "Da Administração" },
  { numero: "V", titulo: "Das Taxas de Manutenção e das Receitas" },
  { numero: "VI", titulo: "Do Patrimônio Social" },
  { numero: "VII", titulo: "Do Exercício Social" },
  { numero: "VIII", titulo: "Da exclusão do Associado" },
  { numero: "IX", titulo: "Das disposições Gerais e Transitórias" },
];

const tituloCapitulo = (n: string) => CAPITULOS_ESTATUTO.find((c) => c.numero === n)!.titulo;

interface Opcoes {
  alinea?: string;
  paragrafo?: string;
  palavrasChave?: string[];
  categorias?: string[];
  pagina?: number;
  revisao?: string;
}

const PARAGRAFO_ID: Record<string, string> = {
  "Parágrafo único": "pu",
  "Parágrafo Primeiro": "p1",
  "Parágrafo Segundo": "p2",
  "Parágrafo Terceiro": "p3",
  "Parágrafo Quarto": "p4",
  "Parágrafo Quinto": "p5",
};

function es(capitulo: string, artigo: string, texto: string, o: Opcoes = {}): Norma {
  const id = ["ES", artigo, o.alinea, o.paragrafo ? PARAGRAFO_ID[o.paragrafo] : undefined].filter(Boolean).join("-");
  return {
    id,
    documento: "ESTATUTO",
    secaoNumero: capitulo,
    secaoTitulo: tituloCapitulo(capitulo),
    artigo,
    alinea: o.alinea,
    paragrafo: o.paragrafo,
    texto,
    palavrasChave: o.palavrasChave ?? [],
    categorias: o.categorias ?? [],
    aplicavelOcorrencias: (o.categorias?.length ?? 0) > 0,
    pagina: o.pagina,
    revisaoManual: o.revisao ? true : undefined,
    observacaoRevisao: o.revisao,
    ativo: true,
  };
}

const CARIMBO = "Trecho com sobreposição do carimbo de registro no PDF. Conferir no documento original.";

export const NORMAS_ESTATUTO: Norma[] = [
  // ───────────── Capítulo I ─────────────
  es("I", "1", "A Associação dos Adquirentes de Unidades no Empreendimento \"FAZENDA DA ILHA\", denominado \"INTERLAGOS SUL\" tão somente para fins de comercialização, é uma entidade, com sede e foro na cidade de Embu-Guaçu, estado de São Paulo, sem fins lucrativos, políticos ou religiosos, que se regerá conforme estes estatutos e pelas disposições legais aplicáveis a espécie.", { pagina: 1 }),
  es("I", "1", "A Associação dos Adquirentes de Unidades no Empreendimento \"FAZENDA DA ILHA\", se regerá pelo presente Estatuto Social e disposições legais e regulamentares que forem aplicáveis, para que produza o efeito legal a ela outorgado por lei, notadamente pelos artigos 53 a 61, da Lei nº 10.406, de 10 de janeiro de 2.002 (novo Código Civil) e Lei nº 11.127, de 28 de junho de 2.005.", { paragrafo: "Parágrafo único", pagina: 1 }),
  es("I", "2", "A sede da associação será instalada na cidade de Embu-Guaçu, Estado de São Paulo, no setor denominado \"Sede Administrativa\", na rua Córsega, s/n, com área de 21.688,24 m² do loteamento FAZENDA DA ILHA, objeto de matrícula número 68.218 do Cartório de Registro de Imóveis de Itapecerica da Serra e seu Foro no Município de Embu-Guaçu.", { pagina: 1 }),
  es("I", "3", [
    "A Associação terá por objetivos:",
    "a - a manutenção, conservação e melhoria de toda a infra-estrutura do empreendimento \"FAZENDA DA ILHA\", existente ou que venha a ser implantada;",
    "b - a manutenção, conservação e melhoria das áreas de vias públicas do empreendimento \"FAZENDA DA ILHA\";",
    "c - a manutenção, conservação e [trecho ilegível no PDF — fragmentos legíveis: “praças, jardins, áreas de uso institucional e áreas”; “passeios, ruas,”; “do sistema de lazer, componentes”] do empreendimento \"FAZENDA DA ILHA\";",
    "d - zelar pelo cumprimento e fazer respeitar as normas restritivas quanto ao uso e aproveitamento das diversas unidades do empreendimento \"FAZENDA DA ILHA\", sejam elas de ordem legal ou contratual, integrantes do registro do loteamento no Registro de Imóveis da Comarca de Itapecerica da Serra, promovendo a observância das referidas normas, administrativas e judicialmente;",
    "e - implantar áreas de lazer tais como: clube, viveiro de plantas, jardim botânico, trilhas de recreação, viveiro de peixes, pista de \"Cooper\", etc., com aporte de recursos, mediante consenso de associados, em Assembléia, ou mediante aprovação da Diretoria para utilização de eventuais excedentes de caixa;",
    "f - coordenar a implantação de melhoramentos públicos, tais como: água, luz, telefone, pavimentação, etc., inclusive os equipamentos institucionais, creche, escola e outros, no caso dos órgãos públicos não implantarem os melhoramentos no ritmo satisfatório as necessidades dos associados, de acordo com os procedimentos previstos na letra \"e\" supra;",
    "g - zelar pela efetiva segurança do empreendimento, promovendo o controle de vigilância das portarias com guarda própria ou terceirizada, dotada de viaturas com sistema de rádio comunicação, operando 24 (vinte e quatro) horas por dia, inclusive coordenar o fechamento por muros ou cercas da área do empreendimento, se definido conforme item \"e\" supra;",
    "h - promover a manutenção e controle de utilização das viaturas de vigilância em caso de guarda própria;",
    "i - aprovação dos projetos de construção, modificações ou acréscimos nas unidades, conforme as restrições previstas no memorial do empreendimento, arquivado no Registro de Imóveis da Comarca de Itapecerica da Serra e nos respectivos contratos de venda e compra, desde que estes projetos, também sejam aprovados conforme a legislação vigente pertinente ao assunto;",
    "j - controlar e manter, se existente, sistema de transporte. A adoção desse sistema de transporte poderá ser efetivada desde que estejam habitadas no mínimo 100 (cem) unidades residenciais.",
    "k - Promover e patrocinar, quando e sempre possível [trecho ilegível no PDF] social, cultural e esportivo;",
    "l - Representar a Comunidade de Associados junto aos poderes competentes em todos os assuntos de seu interesse;",
    "m - Firmar convênios e parcerias com loteamentos vizinhos e poder público, visando a obtenção de melhorias e a solução de problemas comuns;",
    "n - Colaborar com projetos sociais do município onde está localizada, divulgando e quando for o caso, arregimentando voluntários para tal fim, ficando vetado à Associação fazer doações de qualquer natureza e espécie, salvo quando aprovado em assembléia geral;",
    "o - Manter atualizado o cadastro de identificação dos associados e de seus empregados domésticos, bem como dos demais prestadores de serviços.",
  ].join("\n"), { pagina: 1, revisao: "Alíneas “c” e “k” com sobreposição de carimbo no PDF (págs. 2–3). " + CARIMBO }),
  es("I", "4", "Para a realização dos objetivos sociais, a Associação poderá manter quadro de funcionários próprios e/ou contratar terceiros, pessoas físicas ou jurídicas, para que executem os trabalhos necessários, mediante remuneração que com eles ajustar.", { pagina: 3 }),
  es("I", "5", "O prazo de duração da Associação é indeterminado.", { pagina: 3 }),

  // ───────────── Capítulo II ─────────────
  es("II", "6", "O quadro social da Associação será formado por pessoas físicas ou jurídicas, distribuídas nas seguintes categorias:\na - Associadas Fundadoras;\nb - Associados Efetivos;", { pagina: 3 }),
  es("II", "7", "São denominadas Associadas Fundadoras, as empresas ILHA EMPREENDIMENTOS E PARTICIPAÇÕES LTDA., GAFISA PARTICIPAÇÕES S.A., nova denominação da GOMES DE ALMEIDA, FERNANDES e SCOPEL ENGENHARIA E URBANISMO LTDA., os quais promoveram a fundação desta Associação.", { pagina: 3 }),
  es("II", "8", "São denominados Associados [trecho ilegível no PDF] jurídicas que sejam titulares de unidades residenciais ou comerciais, do empreendimento \"FAZENDA DA ILHA\", os quais desde data da aquisição da [leitura incerta: “véspativa”] unidade, farão suas vinculações a esta Associação, e sub-rogados nos direitos e obrigações dela decorrentes.", { pagina: 4, revisao: CARIMBO }),

  // ───────────── Capítulo III ─────────────
  es("III", "9", "Os associados efetivos possuem os seguintes direitos, entre outros constantes destes estatutos:\na - utilizar e usufruir de todos os serviços oferecidos pela Associação;\nb - sugerir a Diretoria, sempre por escrito, providências úteis aos interesses sociais;\nc - participar das Assembléias Gerais, podendo votar e ser votado;\nd - convocar as Assembléias Gerais nas hipóteses previstas nos artigos 54 e 55 destes estatutos;\ne - apresentar assuntos a serem discutidos nas Assembléias Gerais.", { pagina: 4 }),
  es("III", "10", "As associadas Fundadoras terão os mesmos direitos e deveres dos associados efetivos, devendo decidir, com exclusividade, sobre os assuntos de sua competência.", { pagina: 4 }),
  es("III", "11", "Os Associados efetivos tem os seguintes deveres, entre outros constantes destes estatutos: a - cumprir e fazer cumprir as disposições destes estatutos ou regulamentos internos da Associação;", {
    alinea: "a", pagina: 4, categorias: ["Descumprimento de normas da Associação"],
    palavrasChave: ["cumprir", "regulamento interno", "estatuto", "descumpriu"],
  }),
  es("III", "11", "Os Associados efetivos tem os seguintes deveres, entre outros constantes destes estatutos: b - acatar e cumprir as deliberações das Assembléias Gerais e das diretorias;", {
    alinea: "b", pagina: 4, categorias: ["Desrespeito à Diretoria / funcionários"],
    palavrasChave: ["acatar", "deliberações", "diretoria", "assembléia", "desobedeceu"],
  }),
  es("III", "11", "Os Associados efetivos tem os seguintes deveres, entre outros constantes destes estatutos: c - pagar as taxas de manutenção ordinárias ou extraordinárias, que lhe couber, inclusive efetuar nas épocas devidas, o pagamento das despesas com implantação e manutenção de serviços de [trecho ilegível no PDF] elétrica, água potável, água pluvial, manutenção de paisagismo, etc.;", {
    alinea: "c", pagina: 4, categorias: ["Inadimplência"],
    palavrasChave: ["taxas de manutenção", "pagamento", "inadimplência", "atraso"],
    revisao: CARIMBO,
  }),
  es("III", "11", "Os Associados efetivos tem os seguintes deveres, entre outros constantes destes estatutos: d - dar integral desempenho as obrigações que lhe forem atribuidas pela diretoria, quando indicado para participar de comissões de trabalhos para Associação;", { alinea: "d", pagina: 5 }),
  es("III", "11", "Os Associados efetivos tem os seguintes deveres, entre outros constantes destes estatutos: e - participar, gratuitamente, de qualquer cargo da Associação para o qual for eleito, salvo motivo justificado;", { alinea: "e", pagina: 5 }),
  es("III", "11", "Os Associados efetivos tem os seguintes deveres, entre outros constantes destes estatutos: f - zelar para o bom nome da Associação.", {
    alinea: "f", pagina: 5, categorias: ["Uso indevido do nome da Associação"],
    palavrasChave: ["bom nome", "nome da associação", "imagem"],
  }),
  es("III", "12", "As Associadas Fundadoras, enquanto não alienarem ou prometerem a venda das respectivas unidades, têm os mesmos direitos e deveres dos Associados Efetivos, conforme discriminado no Artigo 10.", { pagina: 5 }),
  es("III", "13", "Os Associados Efetivos são impedidos dos seguintes atos, além dos demais constantes destes estatutos: a - praticar atividades contrárias aos objetivos da Associação;", {
    alinea: "a", pagina: 5, categorias: ["Descumprimento de normas da Associação"],
    palavrasChave: ["atividades contrárias", "objetivos da associação"],
  }),
  es("III", "13", "Os Associados Efetivos são impedidos dos seguintes atos, além dos demais constantes destes estatutos: b - utilizar o nome da Associação sem poder para tal, e sem autorização expressa da mesma, para a pratica de atos em benefício próprio, ou em atividades políticas, religiosas ou para fins lucrativos.", {
    alinea: "b", pagina: 5, categorias: ["Uso indevido do nome da Associação"],
    palavrasChave: ["nome da associação", "sem autorização", "benefício próprio", "fins lucrativos"],
  }),
  es("III", "14", "As associadas fundadoras estão sujeitas ao mesmo impedimento enunciados no artigo 13, retro, além dos demais constantes destes Estatutos.", { pagina: 5 }),

  // ───────────── Capítulo IV ─────────────
  es("IV", "15", "A Associação terá os seguintes órgãos:\na - DIRETORIA;\nb - CONSELHO FISCAL;\nc - ASSEMBLÉIA GERAL;", { pagina: 5 }),
  es("IV", "16", "A Associação será dirigida por uma diretoria composta de 07 (sete) membros, eleitos em assembléia geral, assim designada:\na - Diretor Presidente;\nb - Diretor Vice-Presidente e Administrativo;\nc - Diretor Financeiro;\nd - Diretor de Infra-Estrutura;\ne - Diretor Social;\nf - Diretor de Novos Projetos;\ng - Diretor de Segurança.", { pagina: 6 }),
  es("IV", "17", "O mandato da Diretoria é de 2 anos, a contar da data da Assembléia geral que a elegeu, podendo seus membros, que exercerão as funções sem qualquer remuneração, ser reeleitos.", { pagina: 6 }),
  es("IV", "18", "A diretoria reunir-se-á ordinariamente, no minimo, uma vez por mês, e, extraordinariamente, sempre que os interesses da associação o exigirem, lavrando-se ata dos trabalhos em livro próprio.", { pagina: 6 }),
  es("IV", "19", "A Associação poderá nomear procuradores, com poderes específicos e prazo de validade, devendo o mandato ser outorgado por dois dentre os diretores, sendo necessariamente um deles o \"Diretor Presidente\", agindo tal procurador em conjunto com qualquer dos diretores.", { pagina: 6 }),
  es("IV", "20", "É vedada à delegação de poderes pelos diretores, para a prática dos atos que lhe competirem pelo presente estatuto, ressalvado o disposto no Artigo 19.", { pagina: 6 }),
  es("IV", "21", "À Diretoria incumbe todos os atos da gerencia Administrativa e Executiva, que deverão sempre ser exercidos no sentido de dar desenvolvimento a Associação, e permitir-lhe a consecução de seus objetivos sociais.", { pagina: 6 }),
  es("IV", "22", "Compete a Diretoria:\na - cumprir e fazer cumprir as disposições dos estatutos da Associação do regulamento interno, e das deliberações das Assembléias Gerais aplicando as sanções previstas, podendo cobrá-las extrajudicialmente ou judicialmente;\nb - efetuar as despesas necessárias à administração da associação, mediante plano de previsão orçamentária, salvo emergenciais;\nc - promover a arrecadação de todas as receitas cabentes a associação;\nd - tomar todas as providências referentes à administração da Associação;\ne - aplicar aos associados, as penalidades previstas nos estatutos da Associação e no regulamento interno;\nf - fazer anualmente, o relatório das atividades da Associação, no período, com a prestação de contas, balanço do exercício e com proposta orçamentária para o ano seguinte, submetendo tais documentos à apreciação de conselho fiscal e da assembléia geral;\ng - dotação da verba destinada a cada área de atuação;\nh - elaboração das atas de todas reuniões com as comissões de trabalho.", { pagina: 7 }),
  es("IV", "23", "As resoluções da diretoria, quando tomadas em reuniões desta, serão estabelecidas por maioria de seus membros presentes, cabendo um voto a cada diretor. No caso de empate, ao Diretor-Presidente caberá o voto de desempate.", { pagina: 7 }),
  es("IV", "24", "Ao Diretor Presidente Compete:\na - representar a Associação, ativa e passivamente, em juízo, ou fora dele, investido de todos os poderes para tanto necessários, inclusive de transigir, acordar, receber, dar quitação e receber quitação, nos termos deste estatuto;\nb - coordenar e supervisionar a administração da Associação, dando cumprimento as suas finalidades;\nc - convocar e presidir as reuniões da Diretoria e as Assembléias Gerais;\nd - assinar, juntamente, com o diretor [trecho ilegível no PDF] títulos cambiários em geral, e quaisquer outros contratos e documentos que importem em responsabilidade financeira da Associação;\ne - elaborar, juntamente com os demais membros da diretoria, o Relatório Anual a ser apresentado a Assembléia Geral;\nf - assinar, juntamente com o diretor financeiro, o balanço social, devidamente elaborado e assinado por técnico em contabilidade.\ng - Formalizar a contratação e rescisão de contrato do pessoal e de serviços, juntamente com o Diretor da área.", { pagina: 7, revisao: "Alínea “d”: " + CARIMBO }),
  es("IV", "25", "Ao Diretor Vice-Presidente e Administrativo compete:\na - executar as tarefas de apoio e subsidiarias as atividades do Diretor-Presidente, que forem por este expressamente designados, gerenciando todas as atividades administrativas da associação;\nb - secretariar, elaborando as respectivas atas, as reuniões da diretoria e as Assembléias Gerais, quando convidado;", { pagina: 8 }),
  es("IV", "26", "Ao Diretor Financeiro compete:\na - dirigir os serviços financeiros, cuidando dos valores e fundos da Associação.\nb - executar o controle da cobrança, judicial e extrajudicial;\nc - assinar juntamente com o Diretor-Presidente, cheques, ordens de pagamento, títulos cambiários em geral e quaisquer outros documentos que importem em responsabilidade financeira da associação;\nd - Supervisionar o trabalho da tesouraria e da contabilidade;\ne - proceder a escritura contábil e financeira da Associação, por si ou por terceiros contratados pela associação, sob sua supervisão, inclusive a auditoria financeira, contábil e de sistemas;\nf - apresentar a diretoria, mensalmente, balancetes do movimento financeiro da Associação, assim como relação das responsabilidades ativas e passivas da Associação, inclusive as vencidas e não pagas e as que estiverem por se vencer;\ng - elaborar o balanço e prestação [trecho ilegível no PDF] assembléia geral.", { pagina: 8, revisao: "Alínea “g”: " + CARIMBO }),
  es("IV", "27", "Ao Diretor de Infra-Estrutura compete:\na - administrar os serviços de manutenção da infra-estrutura, bem como todo o patrimônio, móvel e imóvel da Associação;\nb - aprovar a contratação de serviços, acompanhando e avaliando o fornecimento de mão de obra, através de medição e relatórios de execução;\nc - providenciar e acompanhar os pedidos de ligações junto às concessionárias de serviços públicos;\nd - executar novos projetos aprovados pela diretoria ou assembléia geral;\ne - examinar, aprovar os projetos e acompanhar a execução de novas residências, quanto a adequação ao empreendimento;\nf - gerir a zeladoria do empreendimento.", { pagina: 9 }),
  es("IV", "28", "Ao Diretor Social compete:\na - organizar eventos esportivos e de lazer, acompanhando e gerenciando os mesmos;\nb - regulamentar e administrar o uso das áreas de lazer;\nc - buscar recursos financeiros a serem aplicados na área social da associação junto a iniciativa privada ou pública;\nd - Promover e executar atividades filantrópicas, dentro ou no entorno da Associação, prestando relatórios sociais que serão a seu tempo contabilizados;", { pagina: 9 }),
  es("IV", "29", "Ao Diretor de Segurança compete:\na - organizar, gerenciar, administrar, controlar e aprovar a contratação dos serviços de segurança no empreendimento;\nb - regulamentar, implementar e administrar o sistema de segurança e controle de acesso;\nc - aprovar a contratação de serviço acompanhando e avaliando o desempenho do sistema implantado concernente a segurança do loteamento.", { pagina: 9 }),
  es("IV", "30", "Ao Diretor de Novos Projetos compete:\na - representar a Associação perante órgãos e entidades públicas e concessionárias de serviços públicos, ou se fazer representar, na aprovação de projetos de implantação de melhoramentos;\nb - elaborar, analisar e dar parecer sobre projetos de execução de obras e implantação de melhoramentos;", { pagina: 10 }),
  es("IV", "31", "Em caso de dúvidas sobre eventual atribuição de algum membro da Diretoria, caberá ao Diretor Presidente dirimi-la.", { pagina: 10 }),
  es("IV", "32", "Em suas faltas e impedimentos temporários, ou em vacância de algum cargo diretivo, os membros da Diretoria substituir-se-ão da seguinte maneira:\na - o Diretor Presidente pelo Diretor Vice-Presidente Administrativo;\nb - quaisquer dos Diretores pelo Diretor Presidente ou pelo Diretor Vice-Presidente Administrativo, desde que por indicação do Diretor Presidente;\nc - o Diretor Vice-Presidente Administrativo por quaisquer dos Diretores, observada a seguinte ordem: Diretor Presidente, Diretor Financeiro, Diretor Social, Diretor de Infra-Estrutura e Diretor de Novos Projetos;\nd - No caso específico do Diretor Financeiro este será substituído pelo Diretor Vice- Presidente Administrativo.", { pagina: 10 }),
  es("IV", "33", "No caso de vaga ou impedimento por um período superior a 6 (seis) meses, de um dos cargos da Diretoria, será convocada a Assembléia Geral para deliberar sobre a substituição.", { pagina: 10, revisao: "No PDF as palavras deste artigo aparecem espaçadas em colunas; a ordem foi recomposta a partir da leitura. Conferir no original." }),
  es("IV", "33", "Os Diretores permanecerão em seus cargos até a escolha e posse de seus sucessores.", { paragrafo: "Parágrafo único", pagina: 10 }),
  es("IV", "34", "[trecho ilegível no PDF] por 3 (três) membros, eleitos bienalmente pela Assembléia Geral Ordinária, dentre os Associados efetivos.", { pagina: 11, revisao: CARIMBO }),
  es("IV", "35", "Ao Conselho Fiscal compete:\na - examinar, trimestralmente, os livros, documentos e balancetes da Associação, emitindo parecer;\nb - emitir parecer sobre o Balanço Geral, e proposta orçamentária elaborada pela Diretoria, bem como sobre as contas que devam ser prestadas por aquela em Assembléia geral;\nc - reunir-se-ão sempre que convocados pela diretoria;", { pagina: 11 }),
  es("IV", "36", "Os membros do Conselho Fiscal, desempenharão suas funções e atribuições, sem qualquer remuneração.", { pagina: 11 }),
  es("IV", "37", "A Assembléia é o órgão máximo deliberativo da Associação constituída pelos Associados Efetivos, que reunirem condições estatutárias, para a participação das mesmas e pelas Associadas Fundadoras.", { pagina: 11 }),
  es("IV", "38", "As Assembléias Gerais serão Ordinárias e Extraordinárias.", { pagina: 11 }),
  es("IV", "39", "A Assembléia Geral Ordinária será instalada, anualmente nos 03 (três) meses que se seguirem ao término do exercício social, tendo por objetivo, entre outros constantes destes estatutos:\na - apreciar e deliberar sobre o relatório anual e as contas da Diretoria, quanto ao exercício anterior;\nb - eleger e destituir os membros da Diretoria, do Conselho Fiscal e Comissão Consultiva, quando for o caso.", { pagina: 11 }),
  es("IV", "40", "A Assembléia Geral Extraordinária será instalada quando os interesses da Associação a exigirem.", { pagina: 11 }),
  es("IV", "41", "As deliberações das [trecho ilegível no PDF] os associados, bem como aos demais órgãos sociais, [trecho ilegível no PDF] inclusive as associados ausentes as mesmas.", { pagina: 12, revisao: CARIMBO }),
  es("IV", "42", "As deliberações das Assembléias Gerais somente poderão ser anuladas, ou modificadas, por outra Assembléia Geral.", { pagina: 12 }),
  es("IV", "43", "As Assembléias Gerais serão convocadas pela Diretoria, por meio de seu presidente, mediante edital, que mencionará dia, hora e local de sua realização, com antecedência mínima de 10 (dez) dias em jornais de grande circulação, na região metropolitana da grande São Paulo, e deverá constar, expressamente, os assuntos a serem debatidos na ordem do dia.", { pagina: 12 }),
  es("IV", "44", "O referido edital será enviado com antecedência mínima de 10 (dez) dias da data da realização da respectiva Assembléia a todos os associados, através de cartas enviadas para os endereços que tenham sido fornecidos, por escrito, pelos associados a Associação, responsabilizando-se os associados efetivos pelos não recebimentos, caso não tenham alterado o respectivo endereço em caso de mudança.", { pagina: 12 }),
  es("IV", "45", "Dos editais de convocação deverão constar além das matérias a serem discutidas e votadas na Assembléia, também a indicação da data e hora da segunda convocação.", { pagina: 12 }),
  es("IV", "46", "A Assembléia Geral será instalada em primeira convocação com a presença de, no mínimo 50% (cinqüenta por cento), dos associados com direito a voto, e, em segunda convocação, com o comparecimento de qualquer número de associados, com direito a delas participarem, sendo que, em primeira ou segunda convocação, as deliberações serão tomadas por maioria simples de votos, com exceção do disposto no presente estatuto.", { pagina: 12 }),
  es("IV", "47", "As Assembléias serão realizadas na sede da Associação ou em outro local pré-determinado e constante do edital de convocação, e dos trabalhos serão lavradas Atas no respectivo livro.", { pagina: 12 }),
  es("IV", "48", "As Assembléias serão instaladas e presididas pelo Diretor Presidente, ou, na sua falta, por qualquer dos demais diretores.", { pagina: 12 }),
  es("IV", "48", "O Presidente da Assembléia convidará um dos presentes para secretariar os trabalhos.", { paragrafo: "Parágrafo único", pagina: 12 }),
  es("IV", "49", "A cada associado corresponde um voto nas deliberações da Assembléia Geral.", { pagina: 13 }),
  es("IV", "50", "Nas Assembléias Gerais será permitida a representação de associado procurador, sendo que, cada procurador somente poderá representar nas Assembléias Gerais, no máximo de 03 (três) mandantes.", { pagina: 13 }),
  es("IV", "51", "Os associados, para participarem das Assembléias Gerais e terem direito a voto nas mesmas, deverão estar quites com todas as suas obrigações perante a Associação, especialmente as taxas de manutenção, devidas até o mês da realização das respectivas Assembléias, inclusive.", { pagina: 13 }),
  es("IV", "52", "Os associados Efetivos, quando pessoas jurídicas, deverão ser representadas nas Assembléias Gerais, por seus representantes legais, ou por procuradores especialmente constituídos.", { pagina: 13 }),
  es("IV", "53", "No caso de uma unidade ser adquirida por duas ou mais pessoas, deverão os respectivos adquirentes designar entre si, um procurador que os represente nas Assembléias Gerais, correspondendo, sua participação, a um único voto.", { pagina: 13 }),
  es("IV", "53", "Na hipótese prevista no \"caput\" deste artigo, designado o representante dos adquirentes, para participar das Assembléias Gerais, tal fato deverá ser comunicado expressamente a Diretoria da Associação, até quando da realização de qualquer Assembléia.", { paragrafo: "Parágrafo único", pagina: 13 }),
  es("IV", "54", "Caso a Assembléia Geral Ordinária não seja convocada pela Diretoria no prazo estabelecido no artigo 39, os Associados Efetivos que representem no mínimo 1/5 do quadro social, com direito a voto, poderão convocá-la.", { pagina: 13 }),
  es("IV", "55", "Os Associados Efetivos representantes de, no mínimo 1/5 do quadro associativo, com direito a voto, poderão convocar, a qualquer tempo, Assembléias Gerais Extraordinárias, para deliberar sobre matérias do interesse da Associação. Os Associados Efetivos que representem o quorum citado, considerando necessária a instalação da Assembléia deverão requerer a Diretoria para que esta proceda a convocação da reunião. Caso os Diretores não providenciem os editais em 30 (trinta) dias, nem justifiquem esta atitude, a Assembléia, então, será convocada pelos próprios Associados Efetivos, obedecidos aos demais preceitos de instalação e deliberações previstos nestes estatutos.", { pagina: 13 }),
  es("IV", "56", "A Comissão Consultiva será constituída por 5 (cinco) membros eleitos bienalmente pela Assembléia Geral Ordinária, [trecho ilegível no PDF] seus associados efetivos com direito a voto.", { pagina: 14, revisao: CARIMBO }),
  es("IV", "56", "À Comissão Consultiva compete atuar em conjunto com a Diretoria para:\na - fazer cumprir o Estatuto da Associação;\nb - atuar junto aos demais associados buscando seus anseios e transformando - os sempre que possível em recomendações para a Diretoria;\nc - divulgar seu trabalho e o da Diretoria aos associados, mantendo um canal constante de comunicação entre a Diretoria, a Comissão e os Associados;\nd - aos membros da Comissão Consultiva não haverá qualquer remuneração.", { paragrafo: "Parágrafo único", pagina: 14 }),

  // ───────────── Capítulo V ─────────────
  es("V", "57", "A fim de propiciar meios para o cumprimento de seus objetivos sociais, os Associados Efetivos contribuirão para a Associação com as \"Taxas de Manutenção\", que podem ser Ordinárias e Extraordinárias.", { pagina: 14 }),
  es("V", "57", "A receita será constituída pelas taxas: ordinária, fundo de reserva e rateios, conforme o estabelecido no orçamento anual, bem como pelos valores recolhidos com multas, doações e receitas financeiras ou rendas eventuais.", { paragrafo: "Parágrafo Primeiro", pagina: 14 }),
  es("V", "57", "As \"Taxas de Manutenção Ordinárias\" serão aquelas, aprovadas pela Assembléia Geral, e destinam-se a atender as necessidades sociais previstas no respectivo orçamento das despesas da administração regular da Associação, devendo ser revistas, no máximo a cada 06 (seis) meses ou a qualquer tempo, se necessário.", { paragrafo: "Parágrafo Segundo", pagina: 14 }),
  es("V", "57", "As \"Taxas de Manutenção Extraordinárias\" são aquelas destinadas a atender programas especiais da Associação ou para atender a complementação das \"Taxas de Manutenção Ordinárias\".", { paragrafo: "Parágrafo Terceiro", pagina: 14 }),
  es("V", "57", "As \"Taxas de Manutenção Extraordinárias\" serão aprovadas pela competente Assembléia Geral, podendo ser estabelecidas e cobradas pela Diretoria, a qualquer tempo que esta julgue necessário ao atendimento dos objetivos sociais, com posterior ratificação pela Assembléia Geral.", { paragrafo: "Parágrafo Quarto", pagina: 14, revisao: "Final do parágrafo com sobreposição de carimbo (lido como “Assembléia GeraARES-Oficial”). Conferir no original." }),
  es("V", "57", "A verba designada como fundo de reserva, em hipótese alguma poderá ser remanejada para qualquer outro fim, senão àquele deliberado pela Assembléia Geral.", { paragrafo: "Parágrafo Quinto", pagina: 15 }),
  es("V", "58", "O montante da \"Taxa de Manutenção Ordinária\" deverá ser pago, pelos Associados Efetivos, mensalmente até o dia 15 (quinze) de cada mês.", {
    pagina: 15, categorias: ["Inadimplência"], palavrasChave: ["taxa de manutenção", "dia 15", "pagamento mensal"],
  }),
  es("V", "58", "A Associação para fazer frente ao designo social e sem objetivo de obter lucro, poderá obter receitas de festas, doações e outras formas, devendo tudo ser contabilizado conforme a lei civil e aplicado na consecução de sua finalidade.", { paragrafo: "Parágrafo Primeiro", pagina: 15 }),
  es("V", "58", "A Associação em caso de infração disciplinar de associado ou dependentes, regulada por este Estatuto ou pelo Regulamento Interno, poderá estabelecer \"multas\" que serão cobradas no mesmo vencimento das taxas de manutenção, inclusive, acrescentando-as toda sistemática aplicada as referidas taxas de manutenção.", { paragrafo: "Parágrafo Segundo", pagina: 15 }),
  es("V", "59", "A taxa de manutenção devida pelos associados, mensalmente, correspondente a cada uma das unidades residenciais ou comerciais do empreendimento \"FAZENDA DA ILHA\", fica desde já fixada da seguinte forma:\na - Nos Lotes Residenciais Unifamiliares o valor de 01 (uma) quota mensal;\nb - Nas áreas dos setores habitacionais:\nb.1 - se nelas for constituído condomínio, nos moldes da Lei 4.591 / 64, a taxa de manutenção por unidade autônoma será definida pelas Associadas Fundadoras na época própria, observando o valor máximo igual ao que esteja sendo cobrado para cada lote residencial unifamiliar;\nb.2 - se nelas forem realizadas outros loteamentos de uso residencial, as taxas de manutenção obedecerão aos valores estabelecidos para os lotes, conforme item b.1 supra.", { pagina: 15 }),
  es("V", "59", "A taxa de manutenção será devida pelo associado [leitura incerta: “(exetivo”], a partir da assinatura do contrato de aquisição ou promessa de aquisição da (s) respectiva(s) unidade(s).", { paragrafo: "Parágrafo único", pagina: 15, revisao: "O OCR leu “(exetivo” (provavelmente “efetivo”). Conferir no original." }),
  es("V", "60", "Na hipótese de [trecho ilegível no PDF] de direitos relativamente a mais de um lote de terreno do empreendimento \"FAZENDA DA ILHA\", pagará ele tantas [leitura incerta: “Taxas de Manutençãos quantos sejamos”] lotes de terreno de que for titular.", { pagina: 16, revisao: CARIMBO }),
  es("V", "61", "O não pagamento de qualquer parcela da \"Taxa de Manutenção\" e ou despesas/rateios e multas, Ordinária ou Extraordinária, pelo respectivo associado na data de seu vencimento, acarretará, de pleno direito, e independentemente de qualquer interpelação judicial ou extra judicial, o vencimento e a exigibilidade de uma multa moratória na base de 2% (dois por cento) sobre o valor do débito, juros e correção monetária, além das despesas pela recuperação do crédito.", {
    pagina: 16, categorias: ["Inadimplência"], palavrasChave: ["não pagamento", "multa moratória", "2%", "débito", "inadimplência"],
  }),
  es("V", "61", "O não pagamento da \"Taxa de Manutenção\" e ou despesas/rateios e multas, Ordinária e/ou Extraordinária, implicará automaticamente e independentemente de qualquer interpelação judicial ou extrajudicial, no reajustamento de todo o débito vencido e não pago, bem como o vencendo e não pago, reajuste esse a ser efetuado segundo o IGPM (índice geral de preços do Mercado), verificada entre o mês do vencimento de cada parcela não paga e do mês da efetiva liquidação da dívida.", { paragrafo: "Parágrafo Primeiro", pagina: 16 }),
  es("V", "61", "A multa moratória referida neste Artigo 61 \"caput\", incidirá, na hipótese prevista no parágrafo anterior, sobre o montante de débito corrigido, sendo que a percentagem de tal multa será acrescida mensalmente de 1% (um por cento) para cada mês de atraso, quando o atraso se referir a mais de duas parcelas consecutivas da mencionada dívida.", { paragrafo: "Parágrafo Segundo", pagina: 16 }),
  es("V", "61", "Além dos encargos acima previstos neste Artigo, o Associado efetivo em atraso no pagamento das \"Taxas de Manutenção\" responderá pelo pagamento dos honorários advocatícios na base de 20% (vinte por cento) sobre o total do débito.", { paragrafo: "Parágrafo Terceiro", pagina: 16 }),
  es("V", "61", "A Diretoria da Associação para cobrança das taxas em atraso, poderá se utilizar todos os meios legais e permitidos pelo direito.", { paragrafo: "Parágrafo Quarto", pagina: 16 }),

  // ───────────── Capítulo VI ─────────────
  es("VI", "62", "O Patrimônio da [trecho ilegível no PDF] imóveis, adquiridos por compra, doação ou qualquer forma judicial, ou extrajudicial legalmente permitida e, assim também demais valores que vierem a compor tal patrimônio, a titulo de contribuições de associados, de terceiros, doações ou subvenções conferidas pelos Poderes Públicos.", { pagina: 17, revisao: CARIMBO }),
  es("VI", "62", "As doações ou ato de liberalidade, conferidos mediante encargos a serem satisfeitos pela Associação, dependem de previa aprovação pela Assembléia Geral, para que sejam aceitas, excetuadas doações de área no próprio empreendimento, que, se aceitas pela diretoria, e somente nesta hipótese, independem de aprovação nessa Assembléia.", { paragrafo: "Parágrafo único", pagina: 17 }),
  es("VI", "63", "A Alienação, permuta ou a constituição de ônus reais, referente aos bens imóveis da Associação, que constituam áreas de passeios, ruas, praças, jardins, área de uso institucional e área do sistema de lazer, somente poderá ser decidida por aprovação da maioria dos associados com direito a voto, presentes a Assembléia Geral Extraordinária, convocada especialmente para tal fim.", { pagina: 17 }),
  es("VI", "63", "Os imóveis adquiridos através de dações em pagamento judiciais ou extrajudiciais, referentes a dívidas oriundas do não pagamento das taxas associativas, são exceções ao caput deste artigo, e poderão ser alienados por votação da maioria da Diretoria.", { paragrafo: "Parágrafo único", pagina: 17 }),

  // ───────────── Capítulo VII ─────────────
  es("VII", "64", "O exercício social terá a duração de um ano, terminado em 31 de dezembro de cada ano.", { pagina: 17 }),
  es("VII", "65", "No fim de cada exercício social, a diretoria fará elaborar com base na escrituração contábil da Associação, um balanço patrimonial e a demonstração do resultado do exercício e o resultado das origens aplicações de recursos.", { pagina: 17 }),

  // ───────────── Capítulo VIII ─────────────
  es("VIII", "66", "Dar-se-á a exclusão do associado por \"Justa Causa\", quando não cumprirem as disposições deste Estatuto, por deliberação da Diretoria, obedecido o princípio do contraditório e com direito de recurso à Diretoria e à Assembléia Geral como última instância.", { pagina: 17 }),

  // ───────────── Capítulo IX ─────────────
  es("IX", "67", "A Associação somente se dissolverá mediante a deliberação em Assembléia Geral tomada pelo voto de 80% do associados efetivos, com direito a participação em tal Assembléia Geral.", { pagina: 18 }),
  es("IX", "67", "Deliberada a dissolução da Associação a Assembléia Geral decidirá também sobre a eleição do liquidante, bem como sobre a destinação do liquido social integral.", { paragrafo: "Parágrafo Primeiro", pagina: 18 }),
  es("IX", "67", "Em nenhuma hipótese, o patrimônio social será partilhado entre os associados.", { paragrafo: "Parágrafo Segundo", pagina: 18 }),
  es("IX", "68", "Os associados não respondem, em caráter pessoal, solidária ou subsidiariamente, pelas obrigações que os representantes da Associação assumirem em nome desta.", { pagina: 18 }),
  es("IX", "69", "O presente Estatuto somente poderá ser modificados, emendado ou reformado, pela competente Assembléia Geral, especialmente convocada para esse fim, e por decisão tomada por 80% (oitenta por cento) dos Associados Efetivos, com direito a voto, presentes em tal Assembléia Geral.", { pagina: 18 }),
  es("IX", "70", "A Associação poderá adotar regulamentos internos aprovados, modificados e alterados por Assembléia Geral, especialmente convocada para tal fim, os quais poderão criar incentivos, bem como estabelecer penalidades, em relação a utilização das áreas do empreendimento e as vias internas de circulação.", { pagina: 18 }),
  es("IX", "71", "Se ocorrer a cessão e transferência dos direitos relativos a qualquer das unidades residenciais ou comerciais do empreendimento \"Fazenda da Ilha\", o cessionário ficará obrigatoriamente vinculado a esta Associação e sub-rogado em todos os direitos e obrigações dela decorrentes, na qualidade de atual associado efetivo, em substituição ao Associado Cedente, o qual deverá comunicar expressamente esta condição ao cessionário, e será, em virtude desse fato, automaticamente desligado do quadro social.", { pagina: 18 }),
  es("IX", "71", "O associado fundador ou efetivo se demitirá da associação pela cessão por qualquer forma de sua (s) unidade (s) no empreendimento, devendo a vinculação de que trata o caput deste artigo estar prevista no respectivo instrumento de cessão.", { paragrafo: "Parágrafo Primeiro", pagina: 18 }),
  es("IX", "71", "A renúncia de qualquer associado a seus [leitura incerta: “reitos”], em nenhum caso valerá para eximi-lo de seus encargos perante a Associação.", { paragrafo: "Parágrafo Segundo", pagina: 19, revisao: "O OCR leu “reitos” (provavelmente “direitos”). Conferir no original." }),
  es("IX", "72", "Tendo em vista que o empreendimento poderá, a exclusivo critério das Associadas Fundadoras, ser lançado a venda e executados em etapas, os adquirentes de unidades de cada etapa, passarão também a integrar, automaticamente, a Associação na qualidade de associados efetivos, por ocasião da assinatura dos respectivos contratos, respondendo a partir de sua vinculação, pelo pagamento das taxas de manutenção, e podendo utilizar-se do direito de votar e serem votados, nas Assembléias Gerais.", { pagina: 19 }),
  es("IX", "73", "Nas demais áreas dos setores habitacionais e dos setores comerciais, quaisquer empreendimentos que venham a ser realizados pelas Associadas Fundadoras, sejam loteamento, condomínios nos termos da Lei Federal 4.591/64, ou outro fim admitido pela legislação vigente, os respectivos adquirentes de unidades passarão, também a integrar, automaticamente a Associação, na qualidade de Associados Efetivos, devendo pagar as taxas de manutenção, bem como utilizar- se do direito de votar e serem votados nas Assembléias Gerais, quando da assinatura dos respectivos contratos de aquisição ou promessa de aquisição das respectivas unidades.", { pagina: 19 }),
  es("IX", "74", "Na hipótese de ocorrer a extinção ou desvinculação do IGPM (indice geral de preços do mercado) como fator legalmente previsto para o reajuste das obrigações e contratos, como adotado neste instrumento, ou, ainda, qualquer impedimento decorrente de atos governamentais, referente a utilização do IGPM (indice geral de preços do mercado), para a determinação do valor da taxa de manutenção constante neste Estatuto, bem como, para os reajustes das parcelas em atraso da referida taxa e ou em débito, serão, respectivamente, determinado e calculados com base nos índices estabelecidos pelas autoridades governamentais, vigentes a época.", { pagina: 19 }),
  es("IX", "75", "Todos os cargos eletivos previsto neste Estatuto Social somente poderão ser preenchidos por maiores de 18 anos, proprietários, titulares de direitos de compromissários compradores, cessionários ou promissários cessionários de direito sobre imóvel localizado no empreendimento Fazenda da Ilha e devidamente registrado como associado da Associação.", { pagina: 19 }),
  es("IX", "76", "Caberá aos [trecho ilegível no PDF], em caso de locação ou cessão do mesmo, informar à Administração o [leitura incerta: “pome”] do inquilino [trecho ilegível no PDF] ou cessionário, bem como, apresentar cópia autenticada do [trecho ilegível no PDF] e/ou cessão, para fins de arquivo junto à Associação e para eventual responsabilização.", {
    pagina: 20, categorias: ["Locação / cessão sem comunicação"],
    palavrasChave: ["locação", "inquilino", "cessão", "informar à administração", "contrato de locação"],
    revisao: CARIMBO,
  }),
  es("IX", "76", "Compete aos associados proprietários entregarem cópia deste Estatuto Social, do Regulamento Interno e demais documentos de interesse, aos locatários ou cessionários de seus imóveis, para que guiem suas ações dentro do Loteamento.", {
    paragrafo: "Parágrafo único", pagina: 20, categorias: ["Locação / cessão sem comunicação"],
    palavrasChave: ["locatários", "inquilino", "cópia do estatuto", "regulamento interno"],
  }),
  es("IX", "77", "As dúvidas decorrentes de interpretação dos dispositivos destes Estatutos serão solucionadas pela Diretoria, sempre visando favorecer os objetivos sociais.", { pagina: 20 }),
  es("IX", "78", "Por determinação judicial conforme processo no 177.01.2008.001469- 1 da Vara Única do Foro Distrital de Embu-Guaçu, Comarca de Itapecerica da Serra de 20/06/2008, em virtude de contraditórios existentes no Estatuto Social e sua necessidade de adequação ao que prevê o Código Civil Brasileiro - Lei 10.406, de 10.01.2.002 e Lei Complementar 11.127/2005, foi o mesmo revisto e devidamente adequado, tendo sido aprovado pela Assembléia Geral Extraordinária de 26 de outubro de 2008 e ratificado na presente assembléia.", { pagina: 20 }),
  es("IX", "79", "Aprovado em Assembléia Geral, a Diretoria providenciará para que cada associado receba, através de protocolo, um exemplar deste Estatuto Social, para que surta os efeitos desejados.", { pagina: 20 }),
  es("IX", "80", "Os casos omissos no presente Estatuto, serão resolvidos pela Diretoria, \"ad referendum\" da Assembléia Geral.", { pagina: 20 }),
];
