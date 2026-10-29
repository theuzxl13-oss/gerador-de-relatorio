# Relatório de auditoria técnica – Gerador de Relatórios (Fazenda da Ilha)

- **Data:** 29/10/2026
- **Base auditada:** commit `59894a0` (branch `claude/wizardly-johnson-l6x0q2`, a que o Render implanta)
- **Trabalho realizado na branch local:** `auditoria-producao`
- **Ambiente de verificação:** Node 22, PostgreSQL 16 local (bancos de teste descartáveis) e Chromium (Playwright). Nenhum teste tocou o banco de produção e nenhum deploy foi feito.

## A. Resumo executivo

Pilha: Next.js 16 (App Router, `proxy.ts`), React 19, TypeScript 5.9, PostgreSQL via `pg` 8 (Neon), jsPDF no navegador. A arquitetura (repositório com duas implementações, validação centralizada, permissões no servidor) era boa e foi mantida. A auditoria encontrou **falhas confirmadas** que impediriam o uso seguro em produção:

1. **Conexão com o banco sem verificação de certificado** (sujeita a interceptação).
2. **Credencial padrão `admin`/`admin`** quando as variáveis não estavam definidas.
3. **Segredo das sessões previsível** (derivado de `APP_SENHA` e `DATABASE_URL`).
4. **Perda de dados em edições simultâneas** (leitura fora da transação, regravação do registro inteiro).
5. **Fotos acessíveis e vinculáveis por qualquer usuário logado** que tivesse o identificador.
6. **Dados de controle aceitos do navegador:** data do registro (permitia antedatar) e origem/confiança da fundamentação.
7. **Auditoria apenas dentro do próprio registro**, alterável e perdida na exclusão. Sem trilha de logins, usuários, normas e configurações.

Todos foram corrigidos, com testes de regressão. O projeto passa a ser classificado como **pronto para homologação, com pendências** (seção I). Antes da produção falta: configurar `SESSAO_SEGREDO`, validar o certificado do Neon em homologação, verificar protocolos repetidos e definir regras de negócio pendentes (seção G).

## B. Achados

Legenda de status: **Confirmada** = falha verificada no código; **Risco** = depende de contexto; **Melhoria** = recomendação. As linhas se referem ao commit `59894a0`.

| ID | Criticidade | Arquivo:linha (original) | Evidência | Impacto | Correção | Teste | Resultado |
|---|---|---|---|---|---|---|---|
| A01 | **Crítica** (Confirmada) | `src/server/repositorio-postgres.ts:73-87` | `ssl: { rejectUnauthorized: false }` sempre que havia SSL | Interceptação/MITM da conexão com dados pessoais e credenciais do banco | `src/server/config.ts:configurarConexao`: verificação de certificado e nome do servidor por padrão; CA via `DATABASE_CA_CERT`; modo inseguro só por `DATABASE_SSL=sem-verificacao` explícito (com aviso); sem TLS só para banco local; `sslmode=disable` na URL não desliga o TLS em produção; valor inválido falha | `tests/seguranca.test.ts` (6 casos) + teste real contra PostgreSQL com TLS | Aprovado: certificado desconhecido recusado (`UNABLE_TO_VERIFY_LEAF_SIGNATURE`), host errado recusado (`ERR_TLS_CERT_ALTNAME_INVALID`), CA correta conecta |
| A02 | **Alta** (Confirmada) | `src/server/auth.ts:61-62` | `APP_USUARIO \|\| "admin"`, `APP_SENHA \|\| "admin"` | Qualquer instalação sem as variáveis abria com `admin/admin` | `credenciaisAdminInicial`: sem credencial padrão em nenhum ambiente; produção exige senha 12+ não óbvia; criação condicional ao banco vazio (`criarPrimeiroUsuario`, trava e inserção condicional); senha inicial **provisória** (troca obrigatória); mensagens sem valores | `seguranca.test.ts` (3), integração "primeiro usuário" (concorrência), e2e "primeiro acesso" + verificação manual em modo produção | Aprovado; log do servidor sem senhas (verificado) |
| A03 | **Alta** (Confirmada) | `src/lib/sessao.ts:37-42` | Segredo `fazenda-ilha\|${APP_SENHA}\|${DATABASE_URL}` | Quem soubesse/adivinhasse esses valores forjaria sessões de qualquer perfil | `SESSAO_SEGREDO` (≥32) obrigatório em produção, sem fallback previsível (fora de produção: aleatório por processo); rotação com `SESSAO_SEGREDO_ANTERIOR`; token com finalidade, versão, emissão, validade e tamanho conferidos; health check 503 sem segredo | `seguranca.test.ts` (7): adulteração, outro segredo, outra finalidade, expirado, emitido no futuro, segredo ausente, rotação | Aprovado |
| A04 | Média (Confirmada) | `src/app/api/usuarios/*` | Senha definida pelo administrador continuava válida indefinidamente | Administradores conheciam a senha dos usuários; repúdio fraco na auditoria | Senha provisória (`trocarSenha`): troca obrigatória antes de qualquer API ou página (servidor + proxy); redefinição encerra sessões; senhas óbvias recusadas | e2e (todos os usuários passam pelo fluxo), navegador | Aprovado |
| A05 | **Alta** (Confirmada) | `src/app/api/anexos/[id]/route.ts:8-10`; `repositorio-postgres.ts:287` | GET de foto só exigia login; vínculo aceitava foto pendente de outro usuário | Acesso a fotos de terceiros e apropriação de fotos pendentes por ID (mitigado por UUID, não eliminado) | Foto entregue só a quem pode ver a ocorrência (pendente: a quem enviou); vínculo exige `enviado_por` = usuário; nome/dimensões vêm do banco; respostas 404 uniformes | Integração "anexos" + e2e "anexos" | Aprovado |
| A06 | Média (Confirmada) | `src/app/api/anexos/route.ts:28-42` | Dimensões e tipo informados pelo cliente; sem limite de corpo; EXIF preservado em envios diretos à API | Metadados (GPS) de fotos e consumo de memória | Só JPEG verdadeiro (`src/server/imagem.ts`), dimensões lidas do arquivo, remoção de APP1–APP15/COM, corpo ≤ 6 MB lido em fluxo, 60 envios/h, 12 pendentes por usuário | `fundamentacao-anexos.test.ts` (2) + e2e | Aprovado |
| A07 | **Alta** (Confirmada) | `src/app/api/ocorrencias/route.ts:25` | `data` do corpo aceita na criação | Relatório antedatado/pós-datado por qualquer perfil operacional | Data definida pelo servidor (`hojeISO`, TZ do servidor) | e2e "campos sensíveis" | Aprovado |
| A08 | Média (Confirmada) | `src/server/validacao.ts:53-57` | `origem`/`confianca` aceitos do navegador; norma desativada aceita | Relatório podia apresentar escolha manual como "sugestão automática de alta confiança"; uso de norma revogada | Origem/confiança recalculadas pelo motor no servidor; norma inativa recusada; snapshot guarda `normaVersao`, `revisaoPendente`, `confirmadoPor` | `fundamentacao-anexos.test.ts` (4) + e2e | Aprovado |
| A09 | **Alta** (Confirmada) | `src/server/repositorio-postgres.ts:256-276` | Lê a ocorrência fora da transação e grava o JSON inteiro | Providência e edição simultâneas sobrescreviam uma à outra (perda silenciosa, inclusive de eventos do histórico) | `alterarOcorrencia`: transação + `SELECT … FOR UPDATE`; coluna `versao`; versão desatualizada → **409**; tela avisa e preserva o que foi digitado | Integração (3 testes de concorrência) + e2e + navegador | Aprovado |
| A10 | Média (Confirmada) | `repositorio-postgres.ts:34-35` | Restrição de unicidade removida; checagem "consulta e depois insere" | Protocolos repetidos sob concorrência | Índice único parcial `lower(btrim(protocolo))` (branco permitido), criado só se não houver repetidos; conflito → 409 | Integração (3) | Aprovado |
| A11 | Média (Confirmada) | `src/server/auditoria.ts:31` (histórico em JSON) | Trilha só dentro da ocorrência; nada para usuários, normas, configurações, logins; perdida ao excluir | Rastreabilidade insuficiente para decisões administrativas | Tabela `auditoria` gravada na **mesma transação** (falha → operação desfeita), gatilhos contra UPDATE/DELETE/TRUNCATE, eventos de ocorrências, providências, exclusões (resumo mínimo), usuários (sem senhas), normas (texto anterior), configurações (antes/depois), logins/negações, exportações e demonstração; tela `/auditoria` (Admin Geral, Gerente) | Integração (3) + e2e | Aprovado |
| A12 | Média (Confirmada) | `src/server/api.ts:15`; `diagnostico.ts:25` | Qualquer exceção virava "Erro do banco: \<mensagem interna\>" ao navegador | Exposição de detalhes internos (SQL, caminhos) | Erros internos → 500 genérico com código de referência (detalhes só no log); erros de banco categorizados sem mensagem crua; 400/401/403/404/409/413/503 coerentes | e2e "respostas de erro" | Aprovado |
| A13 | Média (Confirmada) | todas as rotas (`req.json()`) | Sem limite de tamanho do corpo | Esgotamento de memória com requisições grandes | `lerCorpo` com limite (256 KB padrão; login 8 KB; fotos 6 MB) → 413 | e2e (corpo de 7 MB → 413) | Aprovado |
| A14 | Média (Confirmada) | `src/app/api/demonstracao/route.ts:13` | Restauração (apaga todas as ocorrências) dependia só de variável + perfil; sem confirmação; sem registro | Apagamento acidental de dados reais se a variável ficasse `true` | Sempre recusada em produção; exige frase de confirmação; tentativas e execuções auditadas; auditoria preservada | e2e (Admin Geral recusado em produção; tentativa auditada; dados intactos) | Aprovado |
| A15 | Média (Confirmada) | `src/server/db.ts` | Sem `DATABASE_URL`, produção gravava em arquivo efêmero silenciosamente | Perda total de dados no reinício | Produção sem `DATABASE_URL` → erro de configuração e health check 503 | `seguranca.test.ts` + verificação manual | Aprovado |
| A16 | Baixa (Confirmada) | `src/lib/analysis/engine.ts` | Erro de digitação ("cachoro solto") gerava 3 sugestões empatadas sem aviso | Escolha precipitada da norma | `ambiguo` + alerta pedindo conferência; seleção existente mantida (sugestão nunca vira decisão) | `fundamentacao-anexos.test.ts` | Aprovado |
| A17 | Baixa (Confirmada) | `src/components/VisualizarRelatorio.tsx`, `PainelProvidencia.tsx` | Datas sem fuso fixo → erro de hidratação React #418 com fusos diferentes | Tela instável fora de UTC-3 | Fuso `America/Sao_Paulo` explícito | Navegador | Aprovado |
| A18 | — (Verificado, sem falha) | `src/server/auth.ts:usuarioAtual`; `src/proxy.ts` | Desativação e mudança de perfil já eram lidas do banco a cada requisição; CSRF por `Origin` já existia | — | Mantido; coberto por testes novos | e2e "sessões" | Aprovado |
| A19 | Baixa (Risco) | `src/server/limite.ts` | Limites de tentativas em memória, por instância | Reinício zera; várias instâncias não compartilham | Mantido; documentado (complementar com regra de rate limit da Cloudflare) | e2e anterior | Pendente (G) |
| A20 | Melhoria | `listarOcorrencias()` em histórico, painel e início | Carrega todos os registros | Lentidão com milhares de registros | Não alterado (volume atual pequeno) | — | Pendente (G) |

Durante a verificação, os testes também pegaram dois defeitos **introduzidos no próprio trabalho**, corrigidos antes da entrega:
- a ordenação da tela de auditoria (o `ORDER BY` usava o alias texto do id) ganhou um teste de regressão, confirmado falhando sem a correção;
- páginas renderizadas no navegador ainda abriam com senha provisória; o Proxy agora redireciona para a troca de senha.

## C. Arquivos modificados

| Arquivo | Mudança e justificativa |
|---|---|
| `src/server/config.ts` (novo) | Validação central de configuração: TLS do banco (A01), credenciais iniciais (A02), problemas de produção para o health check (A03, A15) |
| `src/lib/sessao.ts` | Segredo obrigatório, rotação, token com finalidade/versão/validade, flag de senha provisória (A03, A04) |
| `src/server/auth.ts` | Admin inicial sem padrão e condicional; senha provisória; senhas óbvias recusadas; `ErroAcesso.codigo` (A02, A04) |
| `src/server/repositorio.ts` | Contrato: auditoria na mesma transação, `alterarOcorrencia` transacional com versão, posse de fotos, `criarPrimeiroUsuario`, diagnóstico de integridade |
| `src/server/repositorio-postgres.ts` | Migrações versionadas, índice único condicional, `FOR UPDATE` + versão, tabela/gatilhos de auditoria, vínculo seguro de fotos, tradução de violações de unicidade em 409, `encerrar()` (A05, A09–A11) |
| `src/server/repositorio-arquivo.ts` | Mesmas regras no armazenamento local (paridade de comportamento) |
| `src/server/db.ts` | Produção exige `DATABASE_URL` (A15) |
| `src/server/api.ts` | Mapeamento de erros sem vazamento, `lerCorpo` com limite (A12, A13) |
| `src/server/diagnostico.ts` | Mensagens de certificado/TLS; sem repassar mensagens internas; `ehErroDeBanco` (A12) |
| `src/server/validacao.ts` | Erros 404/409/413; versão obrigatória; origem/confiança do servidor; norma inativa recusada (A07–A09) |
| `src/server/imagem.ts` (novo) | Validação de JPEG, dimensões reais, remoção de metadados (A06) |
| `src/server/auditoria.ts`, `limite.ts`, `cookie.ts`, `pagina.ts`, `usuarios.ts` | Identificação mínima para auditoria; limite genérico; token com flag; redirecionamento de senha provisória |
| `src/app/api/**` (ocorrências, providência, anexos, usuários, normas, configurações, demonstração, login, senha, analisar, exportar, saúde) | Autorização por recurso, 404/409, corpo limitado, auditoria em cada alteração, campos sensíveis ignorados (A05–A14) |
| `src/app/api/auditoria/route.ts`, `src/app/auditoria/page.tsx` (novos) | Consulta paginada da trilha (A11) |
| `src/proxy.ts` | Redireciona sessões com senha provisória para a troca de senha |
| `src/lib/permissoes.ts` | Ação `auditoria` (Admin Geral, Gerente) |
| `src/lib/types.ts`, `src/lib/citacao.ts` | `versao`, `trocarSenha`, `normaVersao`, `revisaoPendente`, `confirmadoPor` |
| `src/lib/analysis/engine.ts` | Detecção de ambiguidade (A16) |
| `src/lib/api-cliente.ts`, componentes (`FormularioOcorrencia`, `PainelProvidencia`, `VisualizarRelatorio`, `TelaMinhaSenha`, `TelaConfiguracoes`, `Cabecalho`) | Envio da versão, aviso de conflito, troca obrigatória, frase de confirmação, aviso de revisão pendente, fuso fixo (A17) |
| `tests/seguranca.test.ts`, `tests/fundamentacao-anexos.test.ts`, `tests/integracao-postgres.test.ts`, `tests/e2e/api.e2e.test.ts` (novos) | Regressão de todos os achados |
| `.github/workflows/ci.yml` (novo) | CI com PostgreSQL de serviço |
| `package.json` / `package-lock.json` | Scripts `typecheck`, `test:integracao`, `test:e2e` (sem novas dependências) |
| `README.md`, `.env.example`, `render.yaml`, `docs/MIGRACOES.md`, `docs/RELATORIO-AUDITORIA.md` | Variáveis, segurança, migrações e implantação |

## D. Testes

Comandos executados nesta auditoria (resultados reais):

| Comando | Resultado |
|---|---|
| `npm run typecheck` | Aprovado (sem erros) |
| `npm test` | **67 aprovados**, 0 reprovados, 14 ignorados (são os de integração, que exigem `TEST_DATABASE_URL`) |
| `TEST_DATABASE_URL=… npm run test:integracao` (PostgreSQL 16 local) | **14 aprovados**, 0 reprovados |
| `npm run build` | Aprovado |
| `E2E_BASE_URL=… npm run test:e2e` (servidor de produção local + banco novo) | **9 grupos aprovados** (81 asserções no código, várias repetidas em laço por perfil), 0 reprovados |
| `npm audit --omit=dev --audit-level=high` | 0 vulnerabilidades |
| TLS real (PostgreSQL com certificado próprio) | Certificado desconhecido e nome de host errado recusados; CA correta aceita |
| Atualização do esquema anterior (dados no formato antigo) | Migração aplicada, dados lidos e editados, perfil `ADMIN` → `ADMIN_GERAL` |
| Navegador (Playwright): troca obrigatória de senha, conflito 409 na edição, telas principais, geração de PDF | Aprovado; sem erros de JavaScript |

**Não executados:**
- o workflow de CI no GitHub, que ainda não foi enviado;
- a verificação do certificado do Neon real, porque o ambiente não permite conexões TCP de saída (porta 5432);
- testes de carga;
- testes de interface automatizados permanentes, já que os testes de navegador foram manuais e não estão no repositório.

## E. Migrações

Veja `docs/MIGRACOES.md`. Em resumo, são duas migrações versionadas e aditivas: o esquema base, depois `versao`, `enviado_por` e a tabela `auditoria` imutável. Há ainda um índice único de protocolo, que só é criado se não houver repetidos. Elas rodam em transação com trava e são compatíveis com a versão anterior do código, então dá para voltar o sistema sem desfazer o banco. O documento inclui uma consulta somente-leitura para achar protocolos repetidos e o SQL para desfazer.

## F. Configuração de produção (sem valores)

| Variável | Situação |
|---|---|
| `DATABASE_URL` | Obrigatória |
| `SESSAO_SEGREDO` | **Obrigatória (nova exigência)**: ≥ 32 caracteres aleatórios (`openssl rand -base64 32`) |
| `SESSAO_SEGREDO_ANTERIOR` | Só durante rotação |
| `APP_USUARIO`, `APP_SENHA` | Necessárias apenas enquanto não houver usuários; senha 12+ e provisória |
| `DATABASE_SSL` | Opcional (`verificar` padrão) |
| `DATABASE_CA_CERT` / `DATABASE_CA_CERT_FILE` | Necessária para Supabase; não para Neon (a confirmar em homologação) |
| `ORIGEM_SEGREDO` | Opcional (Cloudflare) |
| `TZ=America/Sao_Paulo`, `NODE_VERSION=22` | Recomendadas |
| `SEED_DEMO=false`, `PERMITIR_RESTAURAR_DEMO=false` | Recomendadas (a restauração é recusada em produção de qualquer forma) |
| `PERMITIR_ARMAZENAMENTO_ARQUIVO` | Não usar em produção |

## G. Pendências

**Verificações que dependem de acesso externo**
1. **Certificado do Neon:** confirmar em homologação que `/api/saude` responde `ok` com o padrão `verificar`. O Neon informa usar certificados de autoridades públicas, mas isso não foi testado daqui. Se falhar, informe a cadeia em `DATABASE_CA_CERT`; só como último recurso e por decisão explícita, use `DATABASE_SSL=sem-verificacao`.
2. **CI no GitHub:** o workflow ainda não foi executado no GitHub.
3. **Protocolos repetidos no banco real:** rode a consulta de `docs/MIGRACOES.md` antes de implantar.

**Decisões de negócio necessárias**
4. **Protocolo único:** assumi que os protocolos são únicos, coerente com a validação que já existia, e mantive o protocolo em branco permitido. Confirme a regra.
5. **Retenção e LGPD:**
   - por quanto tempo guardar ocorrências, fotos e a auditoria;
   - se a exclusão de ocorrências deve continuar definitiva ou virar arquivamento. Hoje ela é definitiva, mas fica registrada na auditoria com dados mínimos.
6. **Quem vê a auditoria:** hoje somente Admin Geral e Gerente. Confirme se a Administração deve ter acesso.
7. **Parâmetros a confirmar:**
   - limite de empate da ambiguidade (85%);
   - senha mínima de 12 para o admin inicial e 8 para os demais;
   - limites de envio de fotos;
   - aceitar somente JPEG (a tela sempre converte para JPEG).

**Riscos técnicos remanescentes**
8. **Imutabilidade da auditoria:** os gatilhos não impedem quem tem a credencial de proprietário do banco. Recomendo um papel separado para a aplicação e/ou exportação periódica da trilha.
9. **Limites de tentativa e de envio:** ficam em memória, por instância. Complemente com rate limiting na Cloudflare.
10. **CSP:** usa `'unsafe-inline'` para scripts, por limitação do Next sem nonce.
11. **Listagens sem paginação no servidor (A20):** recomendada quando o volume crescer. A tela de auditoria já é paginada.
12. **Lint:** o projeto não tem ESLint configurado; o `lint` é a verificação de tipos.
13. **Operação e PDF:**
    - não há monitoramento ou alertas além dos logs do Render;
    - não há encerramento explícito do pool de conexões no desligamento (o PostgreSQL encerra as conexões órfãs);
    - o conteúdo binário do PDF não é testado automaticamente. A consistência é garantida por ele usar o mesmo `montarRelatorio` da tela, que é testado.
14. **Backups:** confirme no painel do Neon o período de restauração (PITR) do seu plano e mantenha exportações periódicas (CSV do painel e/ou `pg_dump`).

## H. Plano de implantação

1. **Backup:** no Neon, crie uma *branch* de segurança do banco de produção e, se possível, um `pg_dump`.
2. **Homologação:**
   - crie outra *branch* do Neon a partir da produção;
   - suba um serviço de teste no Render, ou rode localmente com `NODE_ENV=production`, apontando para essa branch, com `SESSAO_SEGREDO` próprio;
   - verifique `/api/saude` (TLS, avisos de protocolo);
   - teste login, troca de senha, criação de relatório, providência, conflito e exportação com cada perfil.
3. **Pré-requisitos na produção:**
   - defina `SESSAO_SEGREDO` no Render;
   - rode a consulta de protocolos repetidos;
   - avise os usuários de que todos precisarão entrar de novo uma vez, porque o formato da sessão mudou.
4. **Liberação:**
   - envie o código para a branch implantada;
   - o Render só troca a versão se `/api/saude` responder 200; com configuração inválida ele mantém a versão anterior no ar;
   - as migrações rodam sozinhas na primeira conexão.
5. **Validação pós-implantação:**
   - `/api/saude` responde `ok`;
   - a tela **Auditoria** mostra os eventos de login;
   - um relatório de teste completo funciona, e a exclusão dele fica registrada na auditoria.
6. **Reversão:** reimplante o commit anterior no Render. O esquema novo é compatível com ele. As sessões emitidas pela versão nova não valem na antiga, então os usuários entram de novo.

## I. Avaliação final

**Pronto para homologação, com pendências.**

As falhas críticas e altas encontradas foram corrigidas e cobertas por testes unitários, de integração com PostgreSQL real e ponta a ponta. Ainda não é possível declarar o sistema pronto para produção: faltam a validação do certificado do Neon, a execução da CI no GitHub, a homologação com uma cópia dos dados reais e as decisões de negócio listadas em G.
