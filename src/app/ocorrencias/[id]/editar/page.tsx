import { notFound } from "next/navigation";
import { FormularioOcorrencia } from "@/components/FormularioOcorrencia";
import { repositorio } from "@/server/db";

export const dynamic = "force-dynamic";

export default async function EditarOcorrencia({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const repo = repositorio();
  const [cfg, o] = await Promise.all([repo.obterConfiguracoes(), repo.obterOcorrencia(id)]);
  if (!o) notFound();
  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <h1 className="text-2xl font-bold text-gray-900">Editar ocorrência</h1>
      <FormularioOcorrencia existente={o} incluirTextoPadrao={cfg.incluirTextoNormaPadrao} termoSecao={cfg.termoSecaoRegulamento} assinaturaPadrao={{ nome: cfg.responsavelNome, cargo: cfg.responsavelCargo }} />
    </div>
  );
}
