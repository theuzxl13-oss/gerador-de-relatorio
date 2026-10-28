import { FormularioOcorrencia } from "@/components/FormularioOcorrencia";
import { repositorio } from "@/server/db";
import { exigirPagina } from "@/server/pagina";
import { ehOperacional, podeVerOcorrencia } from "@/lib/permissoes";
import { PERFIL_LABEL } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function NovaOcorrencia({ searchParams }: { searchParams: Promise<{ duplicar?: string }> }) {
  const usuario = await exigirPagina("registrar");
  const { duplicar } = await searchParams;
  const repo = repositorio();
  const [cfg, original] = await Promise.all([repo.obterConfiguracoes(), duplicar ? repo.obterOcorrencia(duplicar) : Promise.resolve(null)]);
  const modelo = original && podeVerOcorrencia(usuario, original) ? original : null;
  // Líderes, porteiros e rondas assinam com o próprio nome.
  const assinatura = ehOperacional(usuario.perfil)
    ? { nome: usuario.nome, cargo: PERFIL_LABEL[usuario.perfil] }
    : { nome: cfg.responsavelNome, cargo: cfg.responsavelCargo };
  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{modelo ? "Duplicar ocorrência" : "Nova ocorrência"}</h1>
        <p className="text-sm text-gray-600">
          {modelo
            ? `Cópia de “${modelo.ocorrencia}” (${modelo.nome}). A nova ocorrência terá a data de hoje; informe o protocolo e confira o horário.`
            : "Preencha os dados, pesquise a fundamentação, confira e gere o relatório."}
        </p>
      </div>
      <FormularioOcorrencia key={modelo?.id ?? "nova"} modelo={modelo ?? undefined} incluirTextoPadrao={cfg.incluirTextoNormaPadrao} termoSecao={cfg.termoSecaoRegulamento} assinaturaPadrao={assinatura} />
    </div>
  );
}
