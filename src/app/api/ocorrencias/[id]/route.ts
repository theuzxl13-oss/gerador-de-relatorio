import { repositorio } from "@/server/db";
import { exigirUsuario, referencia } from "@/server/auth";
import { lerCorpo, responder } from "@/server/api";
import { camposAlterados, comEvento, identificacaoAuditoria } from "@/server/auditoria";
import { ErroConflito, ErroNaoEncontrado, sugestoesDoServidor, validarOcorrencia, versaoInformada } from "@/server/validacao";
import { podeVerOcorrencia } from "@/lib/permissoes";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };
const NAO_ENCONTRADA = "Ocorrência não encontrada.";

export async function GET(_req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  return responder(async () => {
    const u = await exigirUsuario();
    const o = await repositorio().obterOcorrencia(id);
    // Mesmo retorno para "não existe" e "não é sua": não revela a existência do registro.
    if (!o || !podeVerOcorrencia(u, o)) throw new ErroNaoEncontrado(NAO_ENCONTRADA);
    return o;
  });
}

/**
 * Edição do relatório: Admin Geral e Administração (os perfis operacionais não editam).
 * Exige a versão lida (`versao`); se outra pessoa alterou antes, responde 409.
 * Autor, providência, linha do tempo, situação e data nunca vêm do navegador.
 */
export async function PUT(req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  return responder(async () => {
    const u = await exigirUsuario("editarOcorrencia");
    const body = await lerCorpo(req);
    const versao = versaoInformada(body);
    const repo = repositorio();
    const normas = await repo.listarNormas();
    const sugestoes = await sugestoesDoServidor(body, normas);
    const gerar = body?.gerarProtocolo === true;
    const protocoloInformado = typeof body?.protocolo === "string" ? body.protocolo.trim() : "";
    if (!gerar && protocoloInformado && (await repo.protocoloEmUso(protocoloInformado, id))) {
      throw new ErroConflito(`Já existe outra ocorrência com o protocolo "${protocoloInformado}".`);
    }
    const por = referencia(u);
    const r = await repo.alterarOcorrencia(
      id,
      (atual) => {
        const dados = validarOcorrencia({ ...body, data: atual.data }, normas, atual, por, sugestoes);
        const alterados = camposAlterados(atual, dados);
        if (gerar) alterados.push("protocolo gerado");
        const mudou = alterados.length > 0;
        return {
          dados: {
            ...dados,
            registradoPor: atual.registradoPor,
            providencia: atual.providencia,
            historico: mudou ? comEvento(atual.historico, por, "EDITOU", `Alterou: ${alterados.join(", ")}`) : atual.historico,
          },
          gerarProtocolo: gerar,
          auditoria: mudou
            ? {
                usuario: por,
                acao: "OCORRENCIA_EDITADA",
                entidade: "ocorrencia",
                entidadeId: id,
                detalhe: {
                  campos: alterados,
                  versaoAnterior: atual.versao,
                  protocolo: dados.protocolo !== atual.protocolo ? { antes: atual.protocolo, depois: gerar ? "(gerado)" : dados.protocolo } : undefined,
                  normaPrincipal:
                    dados.fundamentacaoPrincipal?.normaId !== atual.fundamentacaoPrincipal?.normaId
                      ? { antes: atual.fundamentacaoPrincipal?.normaId ?? null, depois: dados.fundamentacaoPrincipal?.normaId ?? null }
                      : undefined,
                },
              }
            : null,
        };
      },
      { versaoEsperada: versao, usuarioId: u.id },
    );
    if (!r) throw new ErroNaoEncontrado(NAO_ENCONTRADA);
    return r;
  });
}

/** Exclusão definitiva: somente Admin Geral. Fica registrada na trilha de auditoria. */
export async function DELETE(_req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  return responder(async () => {
    const u = await exigirUsuario("excluir");
    const repo = repositorio();
    const atual = await repo.obterOcorrencia(id);
    if (!atual) throw new ErroNaoEncontrado(NAO_ENCONTRADA);
    const ok = await repo.excluirOcorrencia(id, {
      usuario: referencia(u),
      acao: "OCORRENCIA_EXCLUIDA",
      entidade: "ocorrencia",
      entidadeId: id,
      detalhe: { ...identificacaoAuditoria(atual), providencia: atual.providencia?.tipo ?? null },
    });
    if (!ok) throw new ErroNaoEncontrado(NAO_ENCONTRADA);
    return { ok: true };
  });
}
