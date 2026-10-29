import { repositorio } from "@/server/db";
import { exigirUsuario, referencia } from "@/server/auth";
import { lerCorpo, responder } from "@/server/api";
import { comEvento, identificacaoAuditoria } from "@/server/auditoria";
import { ErroConflito, instanteOffline, sugestoesDoServidor, validarOcorrencia } from "@/server/validacao";
import { pode } from "@/lib/permissoes";
import { filtroDaUrl } from "@/lib/consulta";
import { FUSO_HORARIO, hojeISO } from "@/lib/relatorio";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const dataHoraBR = (iso: string) => new Date(iso).toLocaleString("pt-BR", { timeZone: FUSO_HORARIO, dateStyle: "short", timeStyle: "short" });

export const dynamic = "force-dynamic";

/**
 * Consulta paginada com filtros (parâmetros da URL; veja src/lib/consulta.ts).
 * Líderes, porteiros e rondas recebem apenas os relatórios que eles mesmos geraram.
 */
export async function GET(req: Request) {
  return responder(async () => {
    const u = await exigirUsuario();
    const { filtro, pagina, porPagina } = filtroDaUrl(new URL(req.url).searchParams);
    if (!pode(u.perfil, "verTodas")) filtro.registradoPor = u.id;
    return repositorio().buscarOcorrencias(filtro, pagina, porPagina);
  });
}

export async function POST(req: Request) {
  return responder(async () => {
    const usuario = await exigirUsuario("registrar");
    const body = await lerCorpo(req);
    const repo = repositorio();
    const por = referencia(usuario);
    // Envio da fila offline: se este aparelho já enviou este relatório, devolve o existente (sem duplicar).
    const idCliente = typeof body?.idCliente === "string" && UUID.test(body.idCliente) ? body.idCliente.toLowerCase() : undefined;
    if (idCliente) {
      const ja = await repo.obterPorIdCliente(usuario.id, idCliente);
      if (ja) return ja;
    }
    const offline = instanteOffline(body?.registradoOfflineEm);
    const normas = await repo.listarNormas();
    // A data do registro é a do servidor; só relatórios da fila offline usam o instante (limitado) do preenchimento.
    const dados = {
      ...validarOcorrencia({ ...body, data: hojeISO(offline ? new Date(offline) : undefined) }, normas, undefined, por, await sugestoesDoServidor(body, normas)),
      registradoPor: por,
      ...(idCliente ? { idCliente } : {}),
      ...(offline ? { registradoOfflineEm: offline } : {}),
      historico: comEvento(
        undefined,
        por,
        "CRIOU",
        offline ? `Relatório preenchido sem conexão em ${dataHoraBR(offline)} e enviado quando a conexão voltou` : "Relatório gerado",
      ),
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
      detalhe: { ...identificacaoAuditoria(o), ...(offline ? { registradoOfflineEm: offline } : {}) },
    }));
  }, 201);
}
