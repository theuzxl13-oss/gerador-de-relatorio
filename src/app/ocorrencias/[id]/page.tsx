import { notFound } from "next/navigation";
import { repositorio } from "@/server/db";
import { VisualizarRelatorio } from "@/components/VisualizarRelatorio";

export const dynamic = "force-dynamic";

export default async function PaginaRelatorio({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ novo?: string; imprimir?: string; pdf?: string }> }) {
  const { id } = await params;
  const sp = await searchParams;
  const repo = repositorio();
  const [cfg, o] = await Promise.all([repo.obterConfiguracoes(), repo.obterOcorrencia(id)]);
  if (!o) notFound();
  return <VisualizarRelatorio ocorrencia={o} configuracoes={cfg} novo={sp.novo === "1"} acaoInicial={sp.imprimir ? "imprimir" : sp.pdf ? "pdf" : undefined} />;
}
