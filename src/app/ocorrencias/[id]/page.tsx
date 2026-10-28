import { notFound } from "next/navigation";
import { repositorio } from "@/server/db";
import { exigirPagina } from "@/server/pagina";
import { VisualizarRelatorio } from "@/components/VisualizarRelatorio";
import { pode, podeVerOcorrencia } from "@/lib/permissoes";
import { buscarReincidencias } from "@/lib/providencia";

export const dynamic = "force-dynamic";

export default async function PaginaRelatorio({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ novo?: string; imprimir?: string; pdf?: string }> }) {
  const usuario = await exigirPagina();
  const { id } = await params;
  const sp = await searchParams;
  const repo = repositorio();
  const [cfg, o] = await Promise.all([repo.obterConfiguracoes(), repo.obterOcorrencia(id)]);
  if (!o || !podeVerOcorrencia(usuario, o)) notFound();
  const acompanha = pode(usuario.perfil, "painel");
  const reincidencias = acompanha
    ? buscarReincidencias(o, await repo.listarOcorrencias()).map((r) => ({
        id: r.id,
        protocolo: r.protocolo,
        data: r.data,
        ocorrencia: r.ocorrencia,
        nome: r.nome,
        providencia: r.providencia?.tipo,
      }))
    : [];
  return (
    <VisualizarRelatorio
      ocorrencia={o}
      configuracoes={cfg}
      novo={sp.novo === "1"}
      acaoInicial={sp.imprimir ? "imprimir" : sp.pdf ? "pdf" : undefined}
      reincidencias={acompanha ? reincidencias : undefined}
    />
  );
}
