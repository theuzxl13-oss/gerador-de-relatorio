# Migrações do banco (PostgreSQL)

As migrações ficam em `src/server/repositorio-postgres.ts` (`MIGRACOES`) e rodam **automaticamente na primeira conexão** de cada instância:

- dentro de **uma transação** com trava `pg_advisory_xact_lock(727001)`: duas instâncias subindo ao mesmo tempo não aplicam nada em dobro, e um erro desfaz tudo;
- cada versão aplicada fica registrada em `schema_migracoes (versao, descricao, aplicada_em)` e não roda de novo;
- **todas são aditivas**: criam tabelas, colunas, índices e gatilhos. Nenhuma apaga ou altera dados existentes.

| Versão | O que faz | Compatível com a versão anterior do sistema? |
|---|---|---|
| 1 | Esquema base (`normas`, `ocorrencias`, `protocolo_sequencia`, `anexos`, `usuarios`, `configuracoes`). Usa `if not exists`: em bancos já existentes não muda nada | Sim |
| 2 | `ocorrencias.versao` (default 1), `anexos.enviado_por` (nulo nas fotos antigas), tabela `auditoria` com gatilhos que recusam UPDATE/DELETE/TRUNCATE | Sim: o código anterior ignora as colunas novas |
| (condicional) | Índice único `ocorrencias_protocolo_unico` em `lower(btrim(protocolo))` onde o protocolo não está em branco. **Só é criado se não houver protocolos repetidos**; havendo, o sistema registra um aviso em `/api/saude`, continua funcionando e não altera nenhum dado | Sim |

## Antes de implantar: verificar protocolos repetidos (somente leitura)

```sql
select lower(btrim(protocolo)) as protocolo, count(*), array_agg(id) as ocorrencias
from ocorrencias
where btrim(protocolo) <> ''
group by 1 having count(*) > 1;
```

Se houver linhas, corrija os protocolos pela tela **Editar** (ex.: acrescentando um sufixo), decidindo caso a caso. Depois, reinicie o serviço: o índice é criado na inicialização seguinte. O sistema não escolhe nem apaga registros por conta própria.

## Desfazer (manual, se realmente necessário)

O código anterior funciona com o esquema novo, então **voltar a versão do sistema não exige desfazer o banco**. Se for preciso remover as estruturas, faça um backup antes e rode como proprietário do banco:

```sql
-- condicional
drop index if exists ocorrencias_protocolo_unico;
-- versão 2 (atenção: apagar a tabela auditoria descarta a trilha de auditoria)
drop trigger if exists auditoria_imutavel on auditoria;
drop trigger if exists auditoria_sem_truncate on auditoria;
drop function if exists auditoria_somente_insercao();
drop table if exists auditoria;
drop index if exists anexos_pendentes_idx;
alter table anexos drop column if exists enviado_por;
alter table ocorrencias drop column if exists versao;
delete from schema_migracoes where versao = 2;
```

A versão 1 não tem desfazer: ela é o esquema que já existia.

## Limites da imutabilidade da auditoria

Os gatilhos impedem que **o sistema** (e qualquer comando comum) altere ou apague eventos. Mas o mesmo usuário do banco que a aplicação usa, normalmente o proprietário das tabelas no Neon, pode remover os gatilhos com `drop trigger`. Para uma proteção mais forte:
1. criar um papel só para a aplicação, sem ser proprietário das tabelas (`grant select, insert` em `auditoria`, sem `update/delete/truncate`);
2. e/ou exportar periodicamente a tabela `auditoria` para um armazenamento externo somente-leitura.

## Testes

`npm run test:integracao` (com `TEST_DATABASE_URL` de um servidor **de teste**) cobre: idempotência das migrações, unicidade com concorrência, versão otimista, transações, posse das fotos, imutabilidade da auditoria e o caso de protocolos repetidos pré-existentes. A atualização a partir do esquema anterior também foi verificada manualmente: um banco criado com o esquema antigo e dados no formato antigo foi migrado, e os dados foram lidos e editados sem perda.
