import { repositorio } from "@/server/db";
import { exigirUsuario, referencia } from "@/server/auth";
import { lerCorpo, responder } from "@/server/api";
import { comEvento, identificacaoAuditoria } from "@/server/auditoria";
import { ErroConflito, sugestoesDoServidor, validarOcorrencia } from "@/server/validacao";
import { podeVerOcorrencia } from "@/lib/permissoes";
import { hojeISO } from "@/lib/relatorio";

export const dynamic = "force-dynamic";

/** Líderes, porteiros e rondas recebem apenas os relatórios que eles mesmos geraram. */
export async function GET() {
  return responder(async () => {
    const u = await exigirUsuario();
    return (await repositorio().listarOcorrencias()).filter((o) => podeVerOcorrencia(u, o));
  });
}

export async function POST(req: Request) {
  return responder(async () => {
    const usuario = await exigirUsuario("registrar");
    const body = await lerCorpo(req);
    const repo = repositorio();
    const por = referencia(usuario);
    const normas = await repo.listarNormas();
    // A data do registro é sempre a do servidor (não pode ser antedatada pelo navegador).
    const dados = {
      ...validarOcorrencia({ ...body, data: hojeISO() }, normas, undefined, por, await sugestoesDoServidor(body, normas)),
      registradoPor: por,
      historico: comEvento(undefined, por, "CRIOU", "Relatório gerado"),
    };
    const gerar = body?.gerarProtocolo === true;
    if (!gerar && dados.protocolo && (await repo.protocoloEmUso(dados.protocolo))) {
      throw new ErroConflito(`Já existe uma ocorrência com o protocolo "${dados.protocolo}".`);
    }
    return repo.criarOcorrencia(gerar ? { ...dados, protocolo: "" } : dados, { gerarProtocolo: gerar, usuarioId: usuario.id }, (o) => ({
      usuario: por,
      acao: "OCORRENCIA_CRIADA",
      entidade: "ocorrencia",
      entidadeId: o.id,
      detalhe: identificacaoAuditoria(o),
    }));
  }, 201);
}
