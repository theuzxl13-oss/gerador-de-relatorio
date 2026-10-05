import { FormularioOcorrencia } from "@/components/FormularioOcorrencia";
import { repositorio } from "@/server/db";

export const dynamic = "force-dynamic";

export default async function NovaOcorrencia({ searchParams }: { searchParams: Promise<{ duplicar?: string }> }) {
  const { duplicar } = await searchParams;
  const repo = repositorio();
  const [cfg, modelo] = await Promise.all([repo.obterConfiguracoes(), duplicar ? repo.obterOcorrencia(duplicar) : Promise.resolve(null)]);
  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{modelo ? "Duplicar ocorrência" : "Nova ocorrência"}</h1>
        <p className="text-sm text-gray-600">
          {modelo
            ? `Cópia do protocolo ${modelo.protocolo}. Será gerado um novo protocolo com a data de hoje. Confira o horário.`
            : "Preencha os dados, pesquise a fundamentação, confira e gere o relatório."}
        </p>
      </div>
      <FormularioOcorrencia key={modelo?.id ?? "nova"} modelo={modelo ?? undefined} incluirTextoPadrao={cfg.incluirTextoNormaPadrao} termoSecao={cfg.termoSecaoRegulamento} assinaturaPadrao={{ nome: cfg.responsavelNome, cargo: cfg.responsavelCargo }} />
    </div>
  );
}
