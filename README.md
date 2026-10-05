# Sistema de Relatórios de Ocorrências – Fazenda da Ilha

**Onde morar é viver!**

Sistema web para a Administração da **Associação dos Adquirentes de Unidades no Empreendimento Fazenda da Ilha** (Embu-Guaçu – SP). Ele registra ocorrências envolvendo associados, imóveis, visitantes e funcionários, localiza a regra descumprida no **Estatuto Social** e no **Regulamento Interno** e gera o relatório administrativo em PDF A4 ou impresso.

> **Regra fundamental:** o sistema **nunca inventa fundamentação**. Ele só cita artigos, itens e subitens que existem na Base Normativa cadastrada a partir dos documentos oficiais. Se não houver correspondência segura, ele avisa e pede seleção manual ou encaminhamento para análise.

---

## Funcionalidades

| Área | O que faz |
|---|---|
| **Painel inicial** | Atalhos (Nova ocorrência, Histórico, Base normativa, Configurações), ocorrências de hoje, do mês, total e as mais frequentes |
| **Nova ocorrência** | Pede ocorrência, nome, tratamento, quadra, lote e horário. A data é automática e o protocolo é gerado ao salvar (`2026-0001`, `2026-0002`… reinicia a cada ano) |
| **Análise automática** | Interpreta a ocorrência em linguagem simples (sinônimos, categorias, palavras-chave, contexto de horário e dia da semana) e sugere a norma com nível de confiança Alta, Média ou Baixa |
| **Confirmação** | Mostra **FUNDAMENTAÇÃO ENCONTRADA** com o documento, a seção, o item/subitem, o trecho real e a confiança. Botões: *Confirmar e gerar relatório*, *Alterar fundamentação* e *Pesquisar outra regra* |
| **Fundamentação principal e complementar** | Inclui uma segunda norma só quando ela tem relação real com a ocorrência |
| **Relatório** | Texto adaptado ao tratamento ("o associado citado acima" / "a associada citada acima"), data por extenso ("Embu-Guaçu, 05 de Outubro de 2026.") e espaço para observações e assinaturas |
| **PDF e impressão** | PDF A4 profissional (gerado no navegador) e impressão direta |
| **Histórico** | Pesquisa e filtros (nome, quadra, lote, ocorrência, período, artigo/item, documento, status). Ações: visualizar, editar, imprimir, gerar PDF, duplicar e excluir |
| **Base normativa** | Estatuto Social e Regulamento Interno cadastrados norma a norma, com palavras-chave e categorias editáveis |
| **Auditoria** | O texto oficial da regra fica **gravado no relatório** no momento da confirmação. Edições posteriores na Base Normativa não alteram relatórios já emitidos |

---

## Base normativa

A base foi transcrita dos PDFs oficiais, sem alterar a numeração:

- **Regulamento Interno**: tópicos I a XV, com itens e subitens (ex.: VII, subitem 1.2.7).
- **Estatuto Social**: capítulos I a IX, artigos 1 a 80, alíneas e parágrafos (redação consolidada da AGE de 26/10/2008, re-ratificada em 25/01/2009).

São **267 normas** no total. Os PDFs têm carimbos de cartório sobrepostos ao texto em algumas páginas, por isso **20 normas estão sinalizadas como "Revisar texto"**. Nos trechos ilegíveis aparece `[trecho ilegível no PDF]` ou `[leitura incerta: "..."]`. Eles não foram completados por suposição: confira cada um no documento físico e corrija em **Base normativa → Editar** (o filtro "Somente com revisão pendente" lista todos).

Artigos institucionais (composição da Diretoria, assembleias etc.) ficam disponíveis para consulta e seleção manual, mas não são sugeridos automaticamente como fundamentação de ocorrências.

Arquivos: `src/data/regulamento.ts` e `src/data/estatuto.ts`.

---

## Executar no seu computador

Pré-requisito: **Node.js 20.9 ou superior** (recomendado 22).

```bash
npm install
npm run dev
```

Acesse **http://localhost:3000**.

Sem `DATABASE_URL`, os dados ficam em `dados/banco.json`, criado automaticamente com a Base Normativa e algumas ocorrências demonstrativas. Para usar PostgreSQL localmente, copie `.env.example` para `.env.local` e preencha `DATABASE_URL`.

Outros comandos:

```bash
npm run build   # build de produção
npm start       # executa o build de produção
npm test        # testes do motor de busca e do gerador de texto
npm run lint    # verificação de tipos (TypeScript)
```

---

## Publicar no Render (plano gratuito) com banco Neon

### Por que Neon?

O PostgreSQL gratuito do Render **expira 30 dias** após a criação, e os relatórios seriam perdidos. O **Neon** oferece PostgreSQL gratuito **sem expiração** (cerca de 0,5 GB, suficiente para dezenas de milhares de relatórios). O sistema usa PostgreSQL padrão, então qualquer provedor funciona: basta trocar a `DATABASE_URL`.

### 1. Criar o banco no Neon

1. Crie uma conta em **https://neon.tech** (dá para entrar com a conta do GitHub).
2. Crie um projeto (região sugerida: *AWS São Paulo – sa-east-1*).
3. No painel, clique em **Connect** e copie a *connection string*. Ela tem este formato:
   `postgresql://usuario:senha@ep-xxxx.sa-east-1.aws.neon.tech/neondb?sslmode=require`

As tabelas são criadas **automaticamente** no primeiro acesso ao sistema. Não é preciso rodar SQL.

### 2. Criar o serviço no Render

**Opção A – Blueprint (automático)**
1. Em **https://dashboard.render.com**, clique em **New → Blueprint**.
2. Selecione este repositório. O Render lê o arquivo `render.yaml`.
3. Preencha as variáveis pedidas:
   - `DATABASE_URL`: a string do Neon
   - `APP_USUARIO` e `APP_SENHA`: login de acesso ao sistema
4. Clique em **Apply**.

**Opção B – Manual**
1. **New → Web Service** e selecione o repositório.
2. Runtime **Node**, Build Command `npm ci && npm run build`, Start Command `npm start`, plano **Free**.
3. Em **Environment**, adicione as variáveis da tabela abaixo.

### 3. Variáveis de ambiente

| Variável | Obrigatória | Descrição |
|---|---|---|
| `DATABASE_URL` | **Sim, em produção** | String de conexão PostgreSQL (Neon). Sem ela, os dados ficam no disco do Render e são **apagados a cada reinício** |
| `APP_USUARIO` / `APP_SENHA` | Recomendado | Ativam login por usuário e senha. O endereço do Render é público |
| `TZ` | Recomendado | `America/Sao_Paulo`, para a data automática do relatório |
| `SEED_DEMO` | Não | `true` cria ocorrências demonstrativas na primeira execução. Use `false` para começar vazio |
| `PERMITIR_RESTAURAR_DEMO` | Não | `false` desativa o botão que apaga as ocorrências e recria a demonstração. **Use `false` quando o sistema estiver em uso real** |
| `NODE_VERSION` | Não | `22` |

### Observações sobre o plano gratuito do Render

- O serviço **"dorme" após 15 minutos sem acesso**. O primeiro acesso depois disso leva de 30 a 60 segundos. Os dados não se perdem, porque ficam no Neon.
- Para começar a usar de verdade: defina `SEED_DEMO=false` e `PERMITIR_RESTAURAR_DEMO=false`. Se a demonstração já foi criada, use **Configurações → Restaurar dados demonstrativos** apenas antes de desativar, ou apague as ocorrências demonstrativas pelo Histórico.

---

## Como a busca encontra a regra

1. **Interpretação**: o texto ("som muito alto depois das 22 horas") é normalizado e comparado com um dicionário de categorias e sinônimos (`src/lib/analysis/categorias.ts`). Exemplo: *Perturbação de sossego* ← som alto, barulho, música, festa, gritaria…
2. **Pontuação**: cada norma aplicável recebe pontos por categoria em comum, palavras-chave presentes e semelhança com o texto da regra.
3. **Contexto**:
   - horário a partir das 22:00 reforça o *Item 8 do tópico II*;
   - obra fora de seg–sex 7h–18h / sáb 7h–14h reforça o *Item 6 do tópico IX*, e, se o horário estiver **dentro** do permitido, o sistema avisa;
   - entregas no sábado apontam para o *Subitem 6.1*.
4. **Confiança**: *Alta* ou *Média* gera "Fundamentação encontrada". *Baixa* ou nenhuma correspondência mostra:
   > Nenhum artigo ou item foi identificado automaticamente com segurança. Selecione manualmente a fundamentação ou encaminhe a ocorrência para análise da Administração.

Exemplos verificados nos testes:

| Ocorrência | Fundamentação sugerida |
|---|---|
| Perturbação de sossego / Som alto | Item 8 do tópico II – DOS DEVERES DOS ASSOCIADOS |
| Material de construção na calçada | Item 7 do tópico IX – DA REGULAMENTAÇÃO PARA EDIFICAÇÕES E REFORMAS |
| Entulho em área comum | Item 11 do tópico III – DAS PROIBIÇÕES |
| Jogou entulho na rua / Deixou areia na rua | Item 3 do tópico III – DAS PROIBIÇÕES |
| Veículo em alta velocidade | Item 5 do tópico III – DAS PROIBIÇÕES |
| Queimada | Item 2 do tópico XIV – FOGO |
| Descarte irregular de lixo | Tópico V – DA COLETA DO LIXO |
| Construção irregular | Item 13 do tópico III – DAS PROIBIÇÕES |
| Obra fora do horário permitido | Item 6 do tópico IX |
| Piscina suja / Mato alto | **Não localizado** (os documentos não tratam do assunto) |

### Preparado para IA

A interpretação é isolada na interface `InterpretadorOcorrencia` (`src/lib/analysis/engine.ts`). Uma implementação futura com IA (por exemplo, a API do Claude) deve **apenas devolver categorias da lista oficial**. A escolha da norma continua sendo feita exclusivamente sobre a Base Normativa cadastrada, o que mantém a garantia de nunca inventar fundamentação. O ponto de troca é a rota `src/app/api/analisar/route.ts`.

---

## Estrutura do projeto

```
src/
  app/                         Páginas (Next.js App Router) e rotas de API
    page.tsx                   Painel inicial
    ocorrencias/nova           Nova ocorrência
    ocorrencias/[id]           Visualizar relatório (PDF / imprimir)
    ocorrencias/[id]/editar    Editar ocorrência
    historico                  Histórico com filtros
    base-normativa             Estatuto e Regulamento
    configuracoes              Configurações
    api/                       normas, ocorrencias, analisar, configuracoes, demonstracao, saude
  components/                  Formulário, seletor de normas, folha A4, UI
  data/                        Estatuto, Regulamento e dados demonstrativos
  lib/
    analysis/                  Motor de busca (categorias, normalização, pontuação)
    citacao.ts                 Formatação das citações (Artigo / Item / Subitem)
    relatorio.ts               Texto do relatório, datas por extenso, protocolo
    pdf.ts                     Geração do PDF A4 (jsPDF)
  server/                      Banco de dados (PostgreSQL ou arquivo JSON) e validação
  proxy.ts                     Login por usuário/senha (APP_USUARIO / APP_SENHA)
tests/                         Testes automatizados
render.yaml                    Blueprint do Render
```

## Tecnologias

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS 4 · PostgreSQL (`pg`) · jsPDF

## Modelo do relatório

O relatório (tela, impressão e PDF) segue os modelos oficiais da portaria (`MODELO_MENOR_CONDUTOR.doc` e `ANIMAL_SOLTO.pdf`):

- **Cabeçalho** (em todas as páginas): FAZENDA DA ILHA sublinhado, CNPJ 59.039.586/0001-40, logo e “Onde morar é viver”
- **Corpo** em itálico com linhas espaçadas: data por extenso, A/C: ADM, Protocolo, Ocorrências (em maiúsculas), Nome, Q93 L08, Horas e o parágrafo
- **Complemento do texto** (opcional): o relato do fato, inserido logo após a citação. Exemplo:
  > Informo que o associado citado acima descumpriu o Item 4 do tópico III – DAS PROIBIÇÕES do Regulamento Interno ao deixar o seu animal solto nas áreas comuns da associação.
- **Fotos / imagens** (opcional, até 6): a primeira aparece reduzida abaixo do texto, e cada foto também sai ampliada em uma página própria. As fotos são reduzidas no próprio celular (até 1600 px, JPEG) antes do envio e ficam guardadas no banco de dados
- **Assinatura**: nome e cargo de quem registrou (ex.: José Luiz – Zelador). É informada em cada ocorrência, e o sistema lembra a última assinatura usada em cada aparelho
- **Rodapé** (em todas as páginas): endereço, telefones e site da Associação

Os dados do cabeçalho e do rodapé podem ser alterados em **Configurações**. Lá também é possível escolher como as seções do Regulamento são citadas: "Item 4 do **tópico** III" (padrão) ou "Item 4 do **Artigo** III", como nos modelos.

## Logo

O logo oficial (`public/logo.png`) foi extraído do modelo de relatório da portaria. A versão vetorial `public/logo.svg` é usada somente se o PNG não existir.
