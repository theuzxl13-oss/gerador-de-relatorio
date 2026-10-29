# Sistema de Relatórios de Ocorrências – Fazenda da Ilha

**Onde morar é viver!**

Sistema web para a Administração da **Associação dos Adquirentes de Unidades no Empreendimento Fazenda da Ilha** (Embu-Guaçu – SP). Ele registra ocorrências envolvendo associados, imóveis, visitantes e funcionários, localiza a regra descumprida no **Estatuto Social** e no **Regulamento Interno** e gera o relatório administrativo em PDF A4 ou impresso.

> **Regra fundamental:** o sistema **nunca inventa fundamentação**. Ele só cita artigos, itens e subitens que existem na Base Normativa cadastrada a partir dos documentos oficiais. Se não houver correspondência segura, ele avisa e pede seleção manual ou encaminhamento para análise.

---

## Funcionalidades

| Área | O que faz |
|---|---|
| **Painel inicial** | Atalhos (Nova ocorrência, Histórico, Base normativa, Configurações), ocorrências de hoje, do mês, total e as mais frequentes |
| **Nova ocorrência** | Pede ocorrência, nome, tratamento, quadra, lote e horário. A data é automática. O protocolo pode ser digitado (ex.: `222/26`), deixado em branco ou gerado automaticamente (`2026-0001`, `2026-0002`… reinicia a cada ano) |
| **Análise automática** | Interpreta a ocorrência em linguagem simples (sinônimos, categorias, palavras-chave, contexto de horário e dia da semana) e sugere a norma com nível de confiança Alta, Média ou Baixa |
| **Confirmação** | Mostra **FUNDAMENTAÇÃO ENCONTRADA** com o documento, a seção, o item/subitem, o trecho real e a confiança. Botões: *Confirmar e gerar relatório*, *Alterar fundamentação* e *Pesquisar outra regra* |
| **Fundamentação principal e complementar** | Inclui uma segunda norma só quando ela tem relação real com a ocorrência |
| **Relatório** | Texto adaptado ao tratamento ("o associado citado acima" / "a associada citada acima"), data por extenso ("Embu-Guaçu, 05 de Outubro de 2026.") e espaço para observações e assinaturas |
| **PDF e impressão** | PDF A4 profissional (gerado no navegador) e impressão direta |
| **Histórico** | Pesquisa e filtros (nome, quadra, lote, ocorrência, período, artigo/item, documento, status). Ações: visualizar, editar, imprimir, gerar PDF, duplicar e excluir |
| **Base normativa** | Estatuto Social e Regulamento Interno cadastrados norma a norma, com palavras-chave e categorias editáveis |
| **Logins e perfis** | Cada pessoa tem usuário e senha. Perfis: **Admin Geral**, **Gerente**, **Administração**, **Líder**, **Porteiro** e **Ronda** (veja "Usuários e permissões") |
| **Providências** | A Administração registra o que foi feito com cada relatório: **arquivado**, **notificado** (com período de esclarecimento e se a pessoa esclareceu ou não) ou **multado** (até uma taxa, dobrada na reincidência; prazo de recurso de 30 dias – RI tópico XV) |
| **Reincidência e prazos** | Aviso de reincidência (mesma quadra/lote e mesma regra em 12 meses), alertas de prazo vencido e painel **Providências** com exportação em planilha (CSV) |
| **Linha do tempo** | Cada relatório guarda quem o gerou, quem editou e quem decidiu, com data e hora |
| **Carta ao morador** | Na providência, **Carta de notificação** ou **Carta de multa** em PDF: período de esclarecimento, valor, reincidência e prazo de recurso, citando as regras (tópico XV do Regulamento e Art. 58 do Estatuto) a partir da Base Normativa, com linha de recibo. Se uma regra não estiver cadastrada, a frase é omitida e a tela avisa (nada é inventado). A emissão fica na Auditoria |
| **Sem sinal (rondas)** | Rascunho automático no aparelho; sem conexão o relatório (com fotos) fica guardado e é **enviado sozinho** quando o sinal volta, sem duplicar, com a data e hora do preenchimento (até 7 dias). Pode ser instalado na tela inicial do celular e abre "Nova ocorrência" mesmo sem internet |
| **Listas paginadas** | Histórico com filtros aplicados no banco (25 por página); início e painel calculados no banco, sem carregar todos os registros |
| **Ajuda** | Manual dentro do sistema (ícone "?"), com o conteúdo do perfil de quem está logado primeiro e versão para imprimir |
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
cp .env.example .env.local   # defina APP_USUARIO e APP_SENHA (não existe login padrão)
npm run dev
```

Acesse **http://localhost:3000** e entre com `APP_USUARIO` / `APP_SENHA`; no primeiro acesso o sistema pede uma senha pessoal.

Sem `DATABASE_URL`, os dados ficam em `dados/banco.json` (somente fora de produção), criado automaticamente com a Base Normativa e algumas ocorrências demonstrativas.

Outros comandos:

```bash
npm run build          # build de produção
npm start              # executa o build de produção
npm run typecheck      # verificação de tipos (também em npm run lint)
npm test               # testes unitários (segurança, permissões, providências, normas, fotos)
npm run test:integracao  # PostgreSQL real: TEST_DATABASE_URL=postgresql://postgres@localhost:5432/postgres
npm run test:e2e         # API ponta a ponta: E2E_BASE_URL=http://localhost:3100 (veja tests/e2e)
```

Os testes de integração e ponta a ponta criam e usam **bancos de teste próprios**: nunca aponte essas variáveis para o banco de produção. A CI do GitHub (`.github/workflows/ci.yml`) roda todos eles a cada envio.

---

## Publicar no Render (plano gratuito) com banco Neon

### Por que Neon?

O PostgreSQL gratuito do Render **expira 30 dias** após a criação, e os relatórios seriam perdidos. O **Neon** oferece PostgreSQL gratuito **sem expiração** (cerca de 0,5 GB, suficiente para dezenas de milhares de relatórios). O sistema usa PostgreSQL padrão, então qualquer provedor funciona: basta trocar a `DATABASE_URL`.

### 1. Criar o banco no Neon

1. Crie uma conta em **https://neon.tech** (dá para entrar com a conta do GitHub).
2. Crie um projeto escolhendo a região **AWS US East 1 (N. Virginia)**, a mesma do serviço no Render. Isso deixa o sistema mais rápido.
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
2. Runtime **Node**, região **Virginia**, Build Command `npm ci --include=dev && npm run build`, Start Command `npm start`, plano **Free**.
3. Em **Environment**, adicione as variáveis da tabela abaixo.

### 3. Variáveis de ambiente

| Variável | Obrigatória | Descrição |
|---|---|---|
| `DATABASE_URL` | **Sim, em produção** | String de conexão PostgreSQL (Neon). Em produção, sem ela o sistema não inicia (health check 503) |
| `SESSAO_SEGREDO` | **Sim, em produção** | Chave aleatória das sessões (mínimo 32 caracteres; o Blueprint gera). Sem ela ninguém entra e o health check responde 503. Trocar o valor desconecta todos |
| `SESSAO_SEGREDO_ANTERIOR` | Não | Durante uma troca de chave, mantém válidas as sessões assinadas com a chave anterior. Remova depois |
| `APP_USUARIO` / `APP_SENHA` | **Sim, no primeiro acesso** | Criam o **Admin Geral inicial** somente enquanto não existe nenhum usuário. Em produção a senha precisa ter 12+ caracteres e não ser óbvia; ela é **provisória** (troca obrigatória no primeiro acesso). Não existe login padrão |
| `DATABASE_SSL` | Não | `verificar` (padrão: TLS com certificado conferido), `sem-verificacao` (só por decisão explícita) ou `desativado` (apenas banco local) |
| `DATABASE_CA_CERT` / `DATABASE_CA_CERT_FILE` | Conforme o provedor | Cadeia de certificados do banco (PEM). Neon/Render usam autoridades públicas e não precisam; **Supabase precisa** (Database → SSL Configuration) |
| `ORIGEM_SEGREDO` | Não | Com Cloudflare: recusa acessos que não passaram por ela (veja Segurança) |
| `TZ` | Recomendado | `America/Sao_Paulo`, para a data automática do relatório |
| `SEED_DEMO` | Não | `true` cria ocorrências demonstrativas na primeira execução. Use `false` para começar vazio |
| `PERMITIR_RESTAURAR_DEMO` | Não | Só fora de produção: `true` habilita o botão que apaga as ocorrências e recria a demonstração (com frase de confirmação). Em produção é sempre recusado |
| `NODE_VERSION` | Não | `22` |

### Diagnóstico do banco

Abra **`https://SEU-ENDERECO.onrender.com/api/saude`** no navegador (não precisa de login):

- `{"ok":true,"armazenamento":"postgres",...}`: banco conectado.
- `{"ok":false,"erro":"..."}`: a mensagem explica a causa (senha errada, endereço errado, projeto do Supabase pausado, conexão direta IPv6 do Supabase etc.).

A mesma explicação aparece na tela quando uma operação falha por causa do banco.

**Supabase:** use a string de conexão do **Session pooler** (`aws-0-...pooler.supabase.com`), e não a "Direct connection" (`db.xxxx.supabase.co`), que usa IPv6 e não funciona no Render. Lembre que o Supabase gratuito pausa o projeto após 7 dias sem uso.

### Observações sobre o plano gratuito do Render

- O serviço **"dorme" após 15 minutos sem acesso**. O primeiro acesso depois disso leva de 30 a 60 segundos. Os dados não se perdem, porque ficam no Neon.
- Para começar a usar de verdade: defina `SEED_DEMO=false` e `PERMITIR_RESTAURAR_DEMO=false`. Se a demonstração já foi criada, use **Configurações → Restaurar dados demonstrativos** apenas antes de desativar, ou apague as ocorrências demonstrativas pelo Histórico.

---

## Usuários e permissões

| Ação | Admin Geral | Gerente | Administração | Líder / Porteiro / Ronda |
|---|---|---|---|---|
| Gerar relatório (com fotos) | ✅ | ❌ | ✅ | ✅ |
| Ver relatórios | todos | todos | todos | só os próprios |
| Imprimir / PDF | ✅ | ✅ | ✅ | ✅ (os próprios) |
| Painel Providências e exportação | ✅ | ✅ (só visualiza) | ✅ | ❌ |
| Registrar providência (arquivado / notificado / multado) | ✅ | ❌ | ✅ | ❌ |
| Editar relatório | ✅ | ❌ | ✅ | ❌ |
| Excluir relatório | ✅ | ❌ | ❌ | ❌ |
| Criar logins | todos os perfis | ❌ | Líder, Porteiro e Ronda | ❌ |
| Base Normativa (alterar) e Configurações | ✅ | ❌ | ❌ | ❌ |

- O **primeiro Admin Geral** é criado com `APP_USUARIO` / `APP_SENHA`. Logins antigos "Administrador" passam a ser Admin Geral e "Presença" passam a ser Líder.
- Em **Configurações → Providências** informe o **valor da taxa** (o sistema confere o limite da multa) e o prazo padrão de esclarecimento.
- A situação do relatório é definida pela providência: Registrada / Aguardando análise → Arquivada, Notificada (→ Concluída quando o resultado do esclarecimento é registrado) ou Multada.
- Usuários **não são excluídos**, apenas desativados, para preservar o histórico. O sistema não permite ficar sem nenhum Admin Geral ativo.
- Cada pessoa pode trocar a própria senha clicando no seu nome, no topo da tela.
- As permissões são verificadas **no servidor**, não apenas escondidas na tela.
- Senhas são guardadas com hash (scrypt). A sessão dura 7 dias e fica em cookie protegido (httpOnly).

## Segurança

### O que o sistema já faz
| Proteção | Como |
|---|---|
| Senhas | Hash **scrypt** (nunca em texto). Mínimo de 8 caracteres e recusa de senhas óbvias. Senha definida por outra pessoa (cadastro, redefinição, admin inicial) é **provisória**: troca obrigatória antes de qualquer uso |
| Primeiro acesso | Sem credencial padrão: exige `APP_USUARIO`/`APP_SENHA` (forte em produção), só funciona com o banco vazio e cria exatamente um Admin Geral |
| Tentativas de senha | 5 erros em 15 min (por IP ou por login) bloqueiam por 15 min. Mesmo tempo de resposta para login inexistente e senha errada |
| Sessão | Cookie `HttpOnly` + `SameSite=Lax` + `Secure`, assinado (HMAC-SHA256) com `SESSAO_SEGREDO` obrigatório em produção; token com finalidade, versão, emissão e validade conferidas. Expira em 7 dias. Trocar ou redefinir a senha **encerra as sessões nos outros aparelhos**; desativação e mudança de perfil valem na requisição seguinte |
| Permissões | Conferidas **no servidor** em todas as rotas (não só escondidas na tela). Líderes/porteiros/rondas não acessam relatórios de outros |
| CSRF | Alterações (POST/PUT/DELETE) só são aceitas quando vêm do próprio site |
| Cabeçalhos | CSP restritiva, `X-Frame-Options: DENY` (impede o site dentro de outro), HSTS, `nosniff`, `Referrer-Policy`, sem `X-Powered-By` |
| Cache | Respostas da API com `Cache-Control: private, no-store` (dados pessoais não ficam em cache de proxy/CDN) |
| Fotos | Só JPEG **verdadeiro** (estrutura conferida), até 4 MB; dimensões lidas do arquivo; **metadados (EXIF/GPS) removidos**; limite de envios por hora e de fotos pendentes; cada foto só é entregue a quem pode ver a ocorrência dela (pendente: só a quem enviou) |
| Corpo das requisições | Limite de tamanho em todas as rotas (256 KB; fotos 6 MB) → 413 |
| Concorrência | Cada relatório tem versão: salvar uma versão desatualizada responde **409** e não sobrescreve; alterações rodam em transação com o registro travado |
| Protocolo | Único (sem diferenciar maiúsculas/espaços) com restrição no banco; em branco é permitido |
| Auditoria | Tabela própria `auditoria`, gravada na **mesma transação** da operação (se não gravar, a operação é desfeita). O banco recusa UPDATE/DELETE/TRUNCATE nela. Tela **Auditoria** (Admin Geral e Gerente) |
| Fundamentação | Texto das normas sempre reconstruído no servidor (o navegador não consegue inventar fundamentação) |
| Dados | Nada é apagado por perfis operacionais; exclusão só pelo Admin Geral; restaurar demonstração só com `PERMITIR_RESTAURAR_DEMO=true` |
| Banco | TLS **com verificação do certificado e do nome do servidor** (padrão); a `DATABASE_URL` nunca aparece nas mensagens; erros internos respondem com um código de referência, sem detalhes |
| Dependências | `npm audit` sem vulnerabilidades conhecidas (Next.js 16.4.3) |

### Usar com Cloudflare (recomendado)
O sistema continua **rodando no Render** (ele precisa de um servidor Node.js e do PostgreSQL); a Cloudflare fica **na frente**, com o seu domínio, protegendo contra ataques e robôs.

1. **Domínio:** adicione o domínio na Cloudflare e, no Render (*Settings → Custom Domains*), cadastre `ocorrencias.seudominio.com.br`. Na Cloudflare crie o registro **CNAME** `ocorrencias` → `fazenda-da-ilha-ocorrencias.onrender.com` com a **nuvem laranja (Proxied)**.
2. **SSL/TLS → Overview:** modo **Full (strict)**. *Edge Certificates:* ative **Always Use HTTPS**, **Minimum TLS 1.2** e **HSTS**.
3. **Bloquear o acesso direto ao onrender.com** (para ninguém contornar a Cloudflare):
   - Gere um texto aleatório longo (ex.: um gerador de senhas, 40 caracteres).
   - Cloudflare → *Rules → Transform Rules → Modify Request Header* → **Set static** `x-origem-segredo` = esse texto (para todas as requisições do domínio).
   - Render → *Environment* → `ORIGEM_SEGREDO` = o mesmo texto. A partir daí o endereço `*.onrender.com` responde 403 (exceto `/api/saude`, usado pelo Render).
4. **Security → WAF:**
   - **Rate limiting:** regra para `URI Path equals /api/auth/login` → 10 requisições por minuto por IP → *Block* por 10 min.
   - **Managed rules** (se o plano permitir) e **Bot Fight Mode** ligados.
   - Opcional: regra *Custom* bloqueando países fora do Brasil (`ip.src.country ne "BR"` → *Block* ou *Managed Challenge*), se ninguém acessar do exterior.
5. **Caching:** **não** crie regra "Cache Everything". Se quiser garantir, crie *Cache Rule* para o domínio com **Bypass cache** (as páginas e a API têm dados pessoais).
6. **Não use** Rocket Loader nem "Email Address Obfuscation" (alteram os scripts e podem quebrar a página por causa da CSP).
7. Render → *Environment*: confirme `SESSAO_SEGREDO` (criado automaticamente pelo Blueprint), `SEED_DEMO=false`, `PERMITIR_RESTAURAR_DEMO=false`.

### Cuidados de uso
- Use senhas fortes para Admin Geral e Administração e **não compartilhe logins**: cada pessoa com o seu (a linha do tempo registra quem fez o quê).
- Quando alguém sair da empresa, **desative** o login no mesmo dia.
- A senha de `APP_SENHA` é provisória: o sistema exige a troca no primeiro acesso. Depois disso a variável pode ser removida.
- Faça backup periódico: botão **Exportar planilha** em Providências e, no Neon, *Branches/Backups*.
- LGPD: o sistema guarda nomes, endereços (quadra/lote) e fotos de pessoas. Restrinja o acesso a quem precisa e defina por quanto tempo os relatórios ficam guardados.

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
    painel, auditoria          Providências e trilha de auditoria
    api/                       normas, ocorrencias, providencia, anexos, usuarios, auditoria, analisar, configuracoes, saude
  components/                  Formulário, seletor de normas, folha A4, UI
  data/                        Estatuto, Regulamento e dados demonstrativos
  lib/
    analysis/                  Motor de busca (categorias, normalização, pontuação)
    citacao.ts                 Formatação das citações (Artigo / Item / Subitem)
    relatorio.ts               Texto do relatório, datas por extenso, protocolo
    pdf.ts                     Geração do PDF A4 (jsPDF)
  server/                      Banco (PostgreSQL ou arquivo JSON), migrações, configuração, validação, auditoria
  proxy.ts                     Exige sessão, CSRF, troca de senha provisória e trava de origem (Cloudflare)
tests/                         Testes unitários, de integração (PostgreSQL) e ponta a ponta (tests/e2e)
docs/                          Migrações e relatório de auditoria técnica
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
