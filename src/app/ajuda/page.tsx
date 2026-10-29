import { exigirPagina } from "@/server/pagina";
import { PERFIL_LABEL, type Perfil } from "@/lib/types";
import { BotaoImprimir } from "@/components/BotaoImprimir";

export const dynamic = "force-dynamic";

/**
 * Manual do sistema dentro da própria aplicação. Mostra primeiro o que interessa
 * ao perfil de quem está logado; os demais assuntos ficam recolhidos.
 */

type Secao = { id: string; titulo: string; perfis: Perfil[] | "todos"; conteudo: React.ReactNode };

const OPERACIONAIS: Perfil[] = ["LIDER", "PORTEIRO", "RONDA"];
const REGISTRAM: Perfil[] = ["ADMIN_GERAL", "ADMINISTRACAO", ...OPERACIONAIS];

const Passos = ({ children }: { children: React.ReactNode }) => <ol className="list-decimal space-y-1.5 pl-5">{children}</ol>;
const Itens = ({ children }: { children: React.ReactNode }) => <ul className="list-disc space-y-1.5 pl-5">{children}</ul>;
const B = ({ children }: { children: React.ReactNode }) => <strong className="font-semibold text-gray-900">{children}</strong>;
const Dica = ({ children }: { children: React.ReactNode }) => (
  <p className="rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-900">{children}</p>
);

const SECOES: Secao[] = [
  {
    id: "acesso",
    titulo: "Entrar, trocar a senha e sair",
    perfis: "todos",
    conteudo: (
      <>
        <Passos>
          <li>Entre com o <B>usuário</B> e a <B>senha</B> que a Administração passou para você.</li>
          <li>No primeiro acesso o sistema pede uma <B>senha pessoal</B> (mínimo de 8 caracteres, nada óbvio como 12345678). Só depois disso as telas são liberadas.</li>
          <li>Para trocar a senha depois, clique no <B>seu nome</B> no topo da tela.</li>
          <li>Ao terminar, clique em <B>Sair</B>, principalmente em computador ou celular compartilhado.</li>
        </Passos>
        <Dica>Não empreste o seu login: tudo o que é feito fica registrado com o nome de quem estava logado.</Dica>
        <Itens>
          <li><B>Esqueceu a senha?</B> Peça à Administração para redefini-la. Você receberá uma senha provisória e terá de criar outra ao entrar.</li>
          <li>Depois de 5 tentativas erradas o acesso fica bloqueado por 15 minutos.</li>
        </Itens>
      </>
    ),
  },
  {
    id: "relatorio",
    titulo: "Gerar um relatório de ocorrência",
    perfis: REGISTRAM,
    conteudo: (
      <>
        <Passos>
          <li>Clique em <B>Nova ocorrência</B>. A data é preenchida automaticamente.</li>
          <li>
            Preencha <B>Ocorrência</B> (em palavras simples, ex.: &ldquo;Som alto depois das 22h&rdquo;), <B>Nome</B>, <B>Tratamento</B> (associado,
            moradora, visitante…), <B>Quadra</B>, <B>Lote</B> e <B>Horário da ocorrência</B> (o botão <B>Agora</B> coloca a hora atual).
          </li>
          <li>Se quiser, escreva a <B>Descrição complementar</B>: detalhes ajudam o sistema a achar a regra certa.</li>
          <li>
            Clique em <B>Pesquisar fundamentação</B>. O sistema sugere o artigo ou item do Estatuto/Regulamento e mostra a <B>confiança</B> (alta, média ou baixa).
          </li>
          <li>
            <B>Leia a regra sugerida.</B> Se não for a certa, use <B>Alterar fundamentação</B> ou <B>Pesquisar outra regra</B>. Se não souber, use{" "}
            <B>Encaminhar para análise sem fundamentação</B>: a Administração escolhe depois.
          </li>
          <li>Opcional: <B>Complemento do texto</B>, <B>Protocolo (opcional)</B> ou <B>Gerar número automaticamente</B>, e até <B>6 fotos</B> em <B>Anexar foto / imagem</B>.</li>
          <li>Confira a <B>Prévia do texto</B> e clique em <B>Confirmar e gerar relatório</B>. Depois é só usar <B>Gerar PDF</B> ou <B>Imprimir</B>.</li>
        </Passos>
        <Itens>
          <li>
            Se aparecer <B>&ldquo;Mais de uma regra corresponde…&rdquo;</B> ou <B>&ldquo;revisão manual&rdquo;</B>, confira com atenção: a sugestão automática nunca é uma decisão,
            quem confirma é você.
          </li>
          <li>O sistema nunca inventa regra: o texto citado vem sempre do Estatuto e do Regulamento cadastrados.</li>
          <li>Depois de gerado, o relatório não pode ser alterado nem apagado por líderes, porteiros e rondas. Se errou, avise a Administração.</li>
          <li>O formulário é guardado automaticamente no aparelho enquanto você digita (<B>rascunho</B>). Se a página fechar, os dados voltam ao abrir de novo.</li>
        </Itens>
      </>
    ),
  },
  {
    id: "offline",
    titulo: "Sem sinal de internet (rondas)",
    perfis: REGISTRAM,
    conteudo: (
      <>
        <Dica>
          Prepare o celular uma vez, com internet: entre no sistema, abra <B>Nova ocorrência</B> e, no menu do navegador, toque em{" "}
          <B>Adicionar à tela inicial</B> (ou &ldquo;Instalar app&rdquo;). Assim o sistema abre mesmo sem sinal.
        </Dica>
        <Passos>
          <li>Sem conexão, aparece o aviso <B>Sem conexão</B>. Preencha normalmente e anexe as fotos (elas ficam marcadas &ldquo;no aparelho&rdquo;).</li>
          <li>Toque em <B>Guardar no aparelho (enviar quando houver conexão)</B>.</li>
          <li>Uma faixa amarela no topo mostra quantos relatórios estão guardados. Quando o sinal voltar, eles são <B>enviados sozinhos</B>.</li>
        </Passos>
        <Itens>
          <li>O relatório chega com a <B>data e a hora em que foi preenchido</B> e fica marcado como &ldquo;preenchido sem conexão&rdquo;.</li>
          <li>Sem internet não dá para pesquisar a fundamentação: o relatório chega como <B>Aguardando análise</B> e a Administração escolhe a regra.</li>
          <li>Envie em até <B>7 dias</B>. Depois disso o sistema recusa o envio e é preciso registrar de novo.</li>
          <li>Se a faixa mostrar <B>Não enviado</B>, leia o motivo e use <B>Tentar de novo</B>. Só use <B>Descartar</B> se tiver certeza.</li>
          <li>Não use janela anônima/privada: nela o celular não consegue guardar os relatórios.</li>
          <li>Os relatórios guardados ficam ligados ao seu login: só são enviados quando você estiver conectado com o seu usuário.</li>
        </Itens>
      </>
    ),
  },
  {
    id: "historico",
    titulo: "Consultar relatórios (Histórico)",
    perfis: "todos",
    conteudo: (
      <Itens>
        <li>Em <B>Histórico</B>, pesquise por protocolo, nome, ocorrência, quadra/lote ou artigo. O botão <B>Filtros</B> permite filtrar por período, situação e documento.</li>
        <li>A lista mostra 25 relatórios por página; use <B>Próxima →</B> e <B>← Anterior</B>.</li>
        <li>Líderes, porteiros e rondas veem somente os relatórios que eles mesmos geraram.</li>
        <li>Clique no relatório para ver o texto, a situação e (para quem acompanha) a providência e a linha do tempo.</li>
      </Itens>
    ),
  },
  {
    id: "providencia",
    titulo: "Registrar a providência (arquivado, notificado ou multado)",
    perfis: ["ADMIN_GERAL", "ADMINISTRACAO"],
    conteudo: (
      <>
        <Passos>
          <li>Abra <B>Providências</B> no menu: a lista <B>Aguardando providência</B> mostra o que falta decidir (os mais antigos primeiro).</li>
          <li>Abra o relatório. Se houver <B>Possível reincidência</B> (mesma quadra/lote e mesma regra nos últimos 12 meses), o sistema mostra os relatórios anteriores.</li>
          <li>Em <B>Providência da Administração</B>, escolha <B>Arquivado</B>, <B>Notificado</B> ou <B>Multado</B> e descreva em <B>Providência tomada</B> o que foi feito.</li>
          <li>
            <B>Notificado:</B> informe o <B>Período para esclarecimento</B>. Quando a pessoa responder (ou o prazo vencer), volte e registre em <B>A pessoa esclareceu?</B>{" "}
            o resultado e os detalhes.
          </li>
          <li>
            <B>Multado:</B> informe o valor (até uma taxa; marque <B>Reincidência</B> para permitir o dobro). O limite é conferido com o valor da taxa cadastrado em
            Configurações.
          </li>
          <li>Em <B>Recebimento e recurso</B>, registre a data em que a pessoa recebeu: o sistema calcula o prazo de recurso de 30 dias.</li>
        </Passos>
        <Itens>
          <li>
            <B>Carta de notificação / Carta de multa (PDF):</B> gera a carta para o morador, com as regras citadas a partir da Base Normativa e uma linha de recibo para quem
            entregar. Se aparecer &ldquo;Confira antes de entregar a carta&rdquo;, resolva o aviso antes de imprimir.
          </li>
          <li>O painel <B>Providências</B> avisa prazos de esclarecimento vencidos ou vencendo e recursos em aberto. <B>Exportar planilha (CSV)</B> baixa tudo.</li>
          <li>
            Se aparecer <B>&ldquo;alterado por outra pessoa&rdquo;</B>, alguém salvou o mesmo relatório antes de você. Copie o que digitou, recarregue a página e
            refaça a alteração.
          </li>
          <li><B>Desfazer</B> volta o relatório para análise; fica registrado na linha do tempo e na auditoria.</li>
        </Itens>
      </>
    ),
  },
  {
    id: "usuarios",
    titulo: "Criar e administrar logins",
    perfis: ["ADMIN_GERAL", "ADMINISTRACAO"],
    conteudo: (
      <>
        <Passos>
          <li>Em <B>Usuários</B>, clique em <B>+ Novo usuário</B>, informe nome, login (sem espaços), perfil e uma senha provisória.</li>
          <li>Passe o login e a senha para a pessoa. No primeiro acesso ela criará a própria senha.</li>
        </Passos>
        <Itens>
          <li>A Administração cria logins de <B>Líder</B>, <B>Porteiro</B> e <B>Ronda</B>. Gerente, Administração e Admin Geral são criados pelo Admin Geral.</li>
          <li>Quando alguém sair da equipe, <B>desative o login no mesmo dia</B> (Editar → desmarcar &ldquo;Usuário ativo&rdquo;). Logins não são apagados, para manter o histórico.</li>
          <li>Para redefinir uma senha, edite o usuário e informe uma nova. As sessões abertas da pessoa são encerradas e ela terá de criar outra senha ao entrar.</li>
        </Itens>
      </>
    ),
  },
  {
    id: "gerente",
    titulo: "Acompanhar os procedimentos (Gerente)",
    perfis: ["GERENTE", "ADMIN_GERAL"],
    conteudo: (
      <Itens>
        <li>O perfil Gerente vê tudo e não altera nada.</li>
        <li><B>Providências:</B> o que aguarda decisão, prazos vencidos, multas do mês e relatórios por pessoa. <B>Exportar planilha (CSV)</B> para análises.</li>
        <li><B>Auditoria:</B> quem fez o quê e quando (logins, relatórios, providências, cartas, usuários, normas e configurações). Os registros não podem ser alterados.</li>
        <li>Abra qualquer relatório para ver a providência, a linha do tempo e gerar o PDF.</li>
      </Itens>
    ),
  },
  {
    id: "admin",
    titulo: "Configurações e Base Normativa (Admin Geral)",
    perfis: ["ADMIN_GERAL"],
    conteudo: (
      <Itens>
        <li>
          <B>Configurações → Providências:</B> cadastre o <B>valor da taxa</B> (limite da multa) e o prazo padrão de esclarecimento. Em Configurações também ficam os dados
          do cabeçalho, do rodapé e do responsável pelo relatório.
        </li>
        <li>
          <B>Base Normativa:</B> as normas marcadas como &ldquo;revisão manual&rdquo; tiveram leitura incerta do PDF original e precisam ser conferidas com o documento. Editar
          uma norma não muda os relatórios antigos: eles guardam o texto usado na época.
        </li>
        <li>Somente o Admin Geral exclui relatórios. A exclusão é definitiva e fica registrada na Auditoria.</li>
        <li>Mantenha pelo menos dois Admin Geral ativos (o sistema impede ficar sem nenhum).</li>
      </Itens>
    ),
  },
  {
    id: "problemas",
    titulo: "Problemas comuns",
    perfis: "todos",
    conteudo: (
      <Itens>
        <li><B>&ldquo;Sessão expirada&rdquo;:</B> entre de novo. A sessão dura 7 dias e também termina quando a senha é trocada.</li>
        <li><B>&ldquo;O seu perfil não tem acesso a esta área&rdquo;:</B> a tela é de outro perfil. Fale com a Administração se precisar.</li>
        <li><B>Primeiro acesso do dia demorado:</B> o servidor pode levar até 1 minuto para &ldquo;acordar&rdquo;. Aguarde, sem clicar várias vezes.</li>
        <li><B>Foto não anexa:</B> use fotos JPG/PNG comuns da câmera; o sistema reduz e converte sozinho. Máximo de 6 por relatório.</li>
        <li><B>Erro com código (ex.: &ldquo;Informe ao administrador o código a1b2c3d4&rdquo;):</B> anote o código e passe para o Admin Geral.</li>
      </Itens>
    ),
  },
];

export default async function PaginaAjuda() {
  const u = await exigirPagina();
  const minha = (s: Secao) => s.perfis === "todos" || s.perfis.includes(u.perfil);
  const principais = SECOES.filter(minha);
  const outras = SECOES.filter((s) => !minha(s));

  const Bloco = ({ s }: { s: Secao }) => (
    <section id={s.id} className="scroll-mt-24 space-y-3 rounded-xl border border-gray-200 bg-white p-4 text-sm leading-relaxed text-gray-700 shadow-sm sm:p-5">
      <h2 className="text-base font-semibold text-gray-900">{s.titulo}</h2>
      {s.conteudo}
    </section>
  );

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Ajuda</h1>
          <p className="text-sm text-gray-600">
            Manual do perfil <strong>{PERFIL_LABEL[u.perfil]}</strong>. Os assuntos de outros perfis estão no fim da página.
          </p>
        </div>
        <BotaoImprimir />
      </div>

      <nav className="nao-imprimir flex flex-wrap gap-2 text-sm" aria-label="Assuntos">
        {principais.map((s) => (
          <a key={s.id} href={`#${s.id}`} className="rounded-full bg-white px-3 py-1 ring-1 ring-gray-300 hover:bg-marca-50">
            {s.titulo}
          </a>
        ))}
      </nav>

      {principais.map((s) => (
        <Bloco key={s.id} s={s} />
      ))}

      {outras.length > 0 && (
        <details className="nao-imprimir rounded-xl border border-dashed border-gray-300 bg-white p-4 text-sm">
          <summary className="cursor-pointer font-semibold text-gray-700">Assuntos de outros perfis ({outras.length})</summary>
          <div className="mt-4 space-y-4">
            {outras.map((s) => (
              <Bloco key={s.id} s={s} />
            ))}
          </div>
        </details>
      )}
    </div>
  );
}
